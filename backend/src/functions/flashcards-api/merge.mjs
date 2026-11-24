// Merging one client's changes into a user's data.json, object by object.
//
// Folders, decks (without their cards), cards and notes each carry
// `updatedAt` (when a client saved the change) and `usn` (the data's `rev`
// when the server stored it). The newer `updatedAt` wins. A deletion leaves a
// grave { type, id, at, usn }: it beats edits saved before it, and an edit
// saved after it brings the object back. A client sends `since`, the `rev` it
// last saw, and gets back everything other clients stored after that.
//
// Pure: no S3 here, so the handler can retry it on a write conflict.

const time = (o) => o?.updatedAt || 0;
const keyOf = (type, id) => `${type}:${id}`;

// Deck metadata as synced: the deck without its cards
const deckMeta = (deck) => {
	const meta = { ...deck };
	delete meta.cards;
	return meta;
};

function reorder(list, ids, idOf) {
	const rank = new Map(ids.map((id, i) => [id, i]));
	return list
		.map((item, i) => [item, rank.get(idOf(item)) ?? ids.length + i])
		.sort((a, b) => a[1] - b[1])
		.map(([item]) => item);
}

/**
 * @param {Object|null} stored - data.json, or null if there is none yet
 * @param {{ since?: number, changes?: Object }} request
 *   changes: { folders, decks, cards: [{ deckId, card }], notes,
 *              graves: [{ type, id, at }], order: { decks, folders, at } }
 * @returns {{ data, changed, rev, changes }} the merged data, whether it
 *   needs saving, its rev, and what the client should apply: objects other
 *   clients stored since `since`, plus the stored side of anything of the
 *   client's that lost
 */
export function applySync(stored, { since = 0, changes = {} } = {}) {
	const data = stored ? { ...stored } : {};
	data.folders = [...(data.folders || [])];
	data.notes = [...(data.notes || [])];
	data.graves = [...(data.graves || [])];
	data.decks = (data.decks || []).map((d) => ({
		...d,
		cards: [...(d.cards || [])],
	}));

	const rev = (data.rev || 0) + 1;
	let changed = false;
	const mine = new Set(); // keys this request stored: not sent back
	const lost = new Set(); // keys of this request's changes that lost

	const graves = new Map(data.graves.map((g) => [keyOf(g.type, g.id), g]));
	const canWrite = (type, id, incoming, existing) => {
		const grave = graves.get(keyOf(type, id));
		if (grave && grave.at >= time(incoming)) return false;
		return !existing || time(existing) <= time(incoming);
	};
	const markStored = (type, id) => {
		mine.add(keyOf(type, id));
		graves.delete(keyOf(type, id));
		changed = true;
	};

	// Folders and notes: flat lists
	const upsertFlat = (type, list, idField, incomingList = []) => {
		incomingList.forEach((incoming) => {
			const id = incoming?.[idField];
			if (!id) return;
			const index = list.findIndex((o) => o[idField] === id);
			const existing = index === -1 ? null : list[index];
			if (!canWrite(type, id, incoming, existing)) {
				lost.add(keyOf(type, id));
				return;
			}
			const next = { ...incoming, usn: rev };
			if (index === -1) list.push(next);
			else list[index] = next;
			markStored(type, id);
		});
	};
	upsertFlat('folder', data.folders, 'folderId', changes.folders);
	upsertFlat('note', data.notes, 'noteId', changes.notes);

	// Decks: metadata only; a deck keeps its cards
	(changes.decks || []).forEach((incoming) => {
		const id = incoming?.deckId;
		if (!id) return;
		const index = data.decks.findIndex((d) => d.deckId === id);
		const existing = index === -1 ? null : data.decks[index];
		if (!canWrite('deck', id, incoming, existing)) {
			lost.add(keyOf('deck', id));
			return;
		}
		const next = {
			...deckMeta(incoming),
			usn: rev,
			cards: existing?.cards || [],
		};
		if (index === -1) data.decks.push(next);
		else data.decks[index] = next;
		markStored('deck', id);
	});

	// Cards: each in one deck; a card whose deckId changed moves
	const deckOfCard = new Map();
	data.decks.forEach((deck) =>
		deck.cards.forEach((c) => deckOfCard.set(c.cardId, deck))
	);
	const findCard = (cardId) => {
		const deck = deckOfCard.get(cardId);
		if (!deck || !data.decks.includes(deck)) return null;
		const index = deck.cards.findIndex((c) => c.cardId === cardId);
		return index === -1 ? null : { deck, index, card: deck.cards[index] };
	};
	(changes.cards || []).forEach(({ deckId, card } = {}) => {
		const id = card?.cardId;
		if (!id) return;
		const found = findCard(id);
		const target = data.decks.find((d) => d.deckId === deckId);
		if (!target || !canWrite('card', id, card, found?.card)) {
			lost.add(keyOf('card', id));
			return;
		}
		const next = { ...card, usn: rev };
		if (found && found.deck === target) {
			target.cards[found.index] = next;
		} else {
			if (found) found.deck.cards.splice(found.index, 1);
			target.cards.push(next);
			deckOfCard.set(id, target);
		}
		markStored('card', id);
	});

	// Deletions, after upserts so a card can move out of a deleted deck
	(changes.graves || []).forEach(({ type, id, at } = {}) => {
		if (!type || !id || !Number.isFinite(at)) return;
		const key = keyOf(type, id);
		let existing = null;
		if (type === 'folder') {
			existing = data.folders.find((f) => f.folderId === id);
		} else if (type === 'note') {
			existing = data.notes.find((n) => n.noteId === id);
		} else if (type === 'deck') {
			existing = data.decks.find((d) => d.deckId === id);
		} else if (type === 'card') {
			existing = findCard(id)?.card;
		} else {
			return;
		}
		if (existing && time(existing) > at) {
			lost.add(key); // edited after this deletion: the edit stands
			return;
		}
		if (type === 'folder') {
			data.folders = data.folders.filter((f) => f.folderId !== id);
		} else if (type === 'note') {
			data.notes = data.notes.filter((n) => n.noteId !== id);
		} else if (type === 'deck') {
			data.decks = data.decks.filter((d) => d.deckId !== id);
		} else {
			const found = findCard(id);
			if (found) found.deck.cards.splice(found.index, 1);
		}
		const previous = graves.get(key);
		graves.set(key, {
			type,
			id,
			at: Math.max(at, previous?.at || 0),
			usn: rev,
		});
		mine.add(key);
		changed = true;
	});
	data.graves = [...graves.values()];

	// Order of decks and folders
	const order = changes.order;
	let orderIsMine = false;
	if (order && Number.isFinite(order.at)) {
		if (order.at > (data.orderAt || 0)) {
			if (Array.isArray(order.decks)) {
				data.decks = reorder(data.decks, order.decks, (d) => d.deckId);
			}
			if (Array.isArray(order.folders)) {
				data.folders = reorder(
					data.folders,
					order.folders,
					(f) => f.folderId
				);
			}
			data.orderAt = order.at;
			data.orderUsn = rev;
			orderIsMine = true;
			changed = true;
		}
	}

	if (changed) data.rev = rev;

	// What the client should apply
	const sendBack = (type, id, usn) =>
		!mine.has(keyOf(type, id)) &&
		((usn || 0) > since || lost.has(keyOf(type, id)));
	const out = {
		folders: data.folders.filter((f) =>
			sendBack('folder', f.folderId, f.usn)
		),
		notes: data.notes.filter((n) => sendBack('note', n.noteId, n.usn)),
		decks: data.decks
			.filter((d) => sendBack('deck', d.deckId, d.usn))
			.map(deckMeta),
		cards: data.decks.flatMap((deck) =>
			deck.cards
				.filter((c) => sendBack('card', c.cardId, c.usn))
				.map((card) => ({ deckId: deck.deckId, card }))
		),
		graves: data.graves
			.filter((g) => sendBack(g.type, g.id, g.usn))
			.map(({ type, id }) => ({ type, id })),
	};
	// Another client's order, or ours if it lost to a newer one
	if (!orderIsMine && ((data.orderUsn || 0) > since || order)) {
		out.order = {
			decks: data.decks.map((d) => d.deckId),
			folders: data.folders.map((f) => f.folderId),
		};
	}

	return { data, changed, rev: data.rev || 0, changes: out };
}
