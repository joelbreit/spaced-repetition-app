// Saving is a sync with the server (POST /sync, merged object by object in
// backend/src/functions/flashcards-api/merge.mjs). These work on the app
// data's stored form (toStored in AppDataContext: no reviews, no card text):
// computeChangeset() finds what changed since the last sync, and
// applyRemoteChanges() takes in what other devices changed.

const keyOf = (type, id) => `${type}:${id}`;

// Sync bookkeeping, not content: ignored when comparing
const IGNORED = new Set(['updatedAt', 'usn']);

// Stable JSON of an object's content: keys sorted, bookkeeping left out
function canon(value, top = true) {
	if (Array.isArray(value)) return value.map((v) => canon(v, false));
	if (!value || typeof value !== 'object') return value;
	const out = {};
	Object.keys(value)
		.sort()
		.forEach((k) => {
			if (top && IGNORED.has(k)) return;
			if (value[k] !== undefined) out[k] = canon(value[k], false);
		});
	return out;
}
const sameContent = (a, b) =>
	JSON.stringify(canon(a)) === JSON.stringify(canon(b));

const deckMeta = (deck) => {
	const meta = { ...deck };
	delete meta.cards;
	return meta;
};

/**
 * Every synced object in the stored data, by type and id
 * @returns {Map<string, { type, id, value, deckId? }>}
 */
export function indexObjects(data) {
	const index = new Map();
	const add = (type, id, value, deckId) =>
		index.set(keyOf(type, id), { type, id, value, deckId });
	(data?.folders || []).forEach((f) => add('folder', f.folderId, f));
	(data?.notes || []).forEach((n) => add('note', n.noteId, n));
	(data?.decks || []).forEach((deck) => {
		add('deck', deck.deckId, deckMeta(deck));
		(deck.cards || []).forEach((card) =>
			add('card', card.cardId, card, deck.deckId)
		);
	});
	return index;
}

const sameEntry = (a, b) =>
	!!a === !!b &&
	(!a || (a.deckId === b.deckId && sameContent(a.value, b.value)));

/**
 * What changed between the last sync and now, as a POST /sync changeset:
 * changed or new objects stamped `updatedAt: now`, deletions as graves, and
 * the deck and folder order if it moved. Null if nothing changed.
 * @param {Object} current - stored form of the app data now
 * @param {Object} saved - stored form as of the last sync
 */
export function computeChangeset(current, saved, now = Date.now()) {
	const before = indexObjects(saved);
	const after = indexObjects(current);
	const changes = {
		folders: [],
		decks: [],
		cards: [],
		notes: [],
		graves: [],
	};
	const lists = { folder: 'folders', deck: 'decks', note: 'notes' };

	after.forEach((entry, key) => {
		if (sameEntry(entry, before.get(key))) return;
		const value = { ...entry.value, updatedAt: now };
		if (entry.type === 'card') {
			changes.cards.push({ deckId: entry.deckId, card: value });
		} else {
			changes[lists[entry.type]].push(value);
		}
	});
	before.forEach((entry, key) => {
		if (!after.has(key)) {
			changes.graves.push({ type: entry.type, id: entry.id, at: now });
		}
	});

	// Order: only when something moved, not when items were added or
	// removed (those sync on their own)
	const ids = (list, field) => (list || []).map((o) => o[field]);
	const moved = (now_, prev) => {
		const common = (from, other) =>
			from.filter((id) => other.includes(id)).join();
		return common(now_, prev) !== common(prev, now_);
	};
	const deckOrder = ids(current.decks, 'deckId');
	const folderOrder = ids(current.folders, 'folderId');
	if (
		moved(deckOrder, ids(saved.decks, 'deckId')) ||
		moved(folderOrder, ids(saved.folders, 'folderId'))
	) {
		changes.order = { decks: deckOrder, folders: folderOrder, at: now };
	}

	const empty =
		['folders', 'decks', 'cards', 'notes', 'graves'].every(
			(k) => changes[k].length === 0
		) && !changes.order;
	return empty ? null : changes;
}

/**
 * Apply another device's changes (a POST /sync response) to app data.
 * @param {Object} data - app data, in memory or stored form
 * @param {Object} remote - { folders, decks, cards, notes, graves, order }
 * @param {Object} [options]
 * @param {Function} [options.skip] - (type, id) => true to leave an object as
 *   it is: one edited locally since the sync started, which the next sync
 *   sends (and, if it's newer, wins)
 * @param {boolean} [options.withReviews] - cards keep their in-memory
 *   `reviews` (new cards get none until the review log is read)
 * @returns {Object} the app data with the changes applied
 */
export function applyRemoteChanges(data, remote, options = {}) {
	if (!remote) return data;
	const { skip = () => false, withReviews = false } = options;
	const take = (type, id) => !skip(type, id);

	let folders = [...(data.folders || [])];
	let notes = [...(data.notes || [])];
	let decks = (data.decks || []).map((d) => ({
		...d,
		cards: [...(d.cards || [])],
	}));

	const upsert = (list, field, incoming, type) => {
		incoming?.forEach((item) => {
			if (!take(type, item[field])) return;
			const index = list.findIndex((o) => o[field] === item[field]);
			if (index === -1) list.push(item);
			else list[index] = item;
		});
	};
	upsert(folders, 'folderId', remote.folders, 'folder');
	upsert(notes, 'noteId', remote.notes, 'note');

	remote.decks?.forEach((meta) => {
		if (!take('deck', meta.deckId)) return;
		const index = decks.findIndex((d) => d.deckId === meta.deckId);
		if (index === -1) decks.push({ ...meta, cards: [] });
		else decks[index] = { ...meta, cards: decks[index].cards };
	});

	remote.cards?.forEach(({ deckId, card }) => {
		if (!take('card', card.cardId)) return;
		const target = decks.find((d) => d.deckId === deckId);
		if (!target) return;
		const from = decks.find((d) =>
			d.cards.some((c) => c.cardId === card.cardId)
		);
		const index = from
			? from.cards.findIndex((c) => c.cardId === card.cardId)
			: -1;
		const local = from ? from.cards[index] : null;
		const next = withReviews
			? { ...card, reviews: local?.reviews || [] }
			: card;
		if (from === target) {
			// Stays in its deck: keep its place
			target.cards[index] = next;
		} else {
			if (from) from.cards.splice(index, 1);
			target.cards.push(next);
		}
	});

	remote.graves?.forEach(({ type, id }) => {
		if (!take(type, id)) return;
		if (type === 'folder')
			folders = folders.filter((f) => f.folderId !== id);
		else if (type === 'note') notes = notes.filter((n) => n.noteId !== id);
		else if (type === 'deck') decks = decks.filter((d) => d.deckId !== id);
		else if (type === 'card') {
			decks = decks.map((d) =>
				d.cards.some((c) => c.cardId === id)
					? { ...d, cards: d.cards.filter((c) => c.cardId !== id) }
					: d
			);
		}
	});

	if (remote.order) {
		const sortBy = (list, ids, field) => {
			const rank = new Map(ids.map((id, i) => [id, i]));
			return list
				.map((item, i) => [
					item,
					rank.get(item[field]) ?? ids.length + i,
				])
				.sort((a, b) => a[1] - b[1])
				.map(([item]) => item);
		};
		if (remote.order.decks)
			decks = sortBy(decks, remote.order.decks, 'deckId');
		if (remote.order.folders) {
			folders = sortBy(folders, remote.order.folders, 'folderId');
		}
	}

	return { ...data, folders, notes, decks };
}

/** Is there anything in a sync response to apply? */
export function hasRemoteChanges(remote) {
	return (
		!!remote &&
		(['folders', 'decks', 'cards', 'notes', 'graves'].some(
			(k) => remote[k]?.length > 0
		) ||
			!!remote.order)
	);
}

/**
 * (type, id) => true for objects that differ between two stored forms:
 * edited locally while a sync was in flight
 */
export function changedSince(snapshot, current) {
	const before = indexObjects(snapshot);
	const after = indexObjects(current);
	return (type, id) => {
		const key = keyOf(type, id);
		return !sameEntry(before.get(key), after.get(key));
	};
}
