// Notes hold a card's text; cards hold scheduling. A note's cards are made
// from templates: `forward` shows the note's front first, `reverse` its back.
// Reversed partner cards are two cards of one note, so their text can't drift
// apart. See docs/Data.md.
//
// In memory every card also carries `front`, `back` and `partnerCardId`,
// filled in from its note by resolveNotes(), so code that only reads cards
// works as before. To change a card's text, change its note (setCardText).

export const TEMPLATES = ['forward', 'reverse'];

// Card fields worked out from the note, never stored
const DERIVED_FIELDS = ['front', 'back', 'partnerCardId'];

export const newNoteId = () => crypto.randomUUID();

/** A card's text as its template shows it */
export function cardText(note, template) {
	return template === 'reverse'
		? { front: note.back, back: note.front }
		: { front: note.front, back: note.back };
}

/** Note text that shows `front` and `back` on a card with this template */
export function noteTextFor(template, front, back) {
	return template === 'reverse'
		? { front: back, back: front }
		: { front, back };
}

const sameText = (a, b) =>
	(a.front ?? '').trim() === (b.back ?? '').trim() &&
	(a.back ?? '').trim() === (b.front ?? '').trim();

const olderFirst = (a, b) =>
	(a.createdAt ?? Infinity) - (b.createdAt ?? Infinity) ||
	String(a.cardId).localeCompare(String(b.cardId));

/**
 * Give notes to cards that don't have one: cards saved before notes existed,
 * demo data and imports. A card and its reversed partner (`partnerCardId`
 * both ways, text mirrored) share one note; the older card is `forward`. A
 * pair whose text no longer mirrors gets two notes, so no text is lost.
 * Note IDs come from the forward card's ID, so migrating the same data twice
 * gives the same notes.
 */
function addMissingNotes(decks, notes) {
	const noteIds = new Set(notes.map((n) => n.noteId));
	const orphans = new Map();
	decks.forEach((deck) =>
		(deck.cards || []).forEach((card) => {
			if (!card.noteId || !noteIds.has(card.noteId)) {
				orphans.set(card.cardId, card);
			}
		})
	);
	if (orphans.size === 0) return null;

	const assigned = new Map(); // cardId → { noteId, template }
	const added = [];
	[...orphans.values()].sort(olderFirst).forEach((card) => {
		if (assigned.has(card.cardId)) return;
		const partner = orphans.get(card.partnerCardId);
		const paired =
			partner &&
			!assigned.has(partner.cardId) &&
			partner.partnerCardId === card.cardId &&
			sameText(card, partner);

		const noteId = `note-${card.cardId}`;
		added.push({
			noteId,
			front: card.front ?? '',
			back: card.back ?? '',
			...(card.createdAt && { createdAt: card.createdAt }),
		});
		assigned.set(card.cardId, { noteId, template: 'forward' });
		if (paired) {
			assigned.set(partner.cardId, { noteId, template: 'reverse' });
		}
	});
	return { assigned, added };
}

/**
 * Bring the app data in line with its notes: every card gets a note, its
 * text and its partner from that note, and notes no card uses are dropped.
 * Objects that don't change keep their identity.
 * @param {Object} data - App data with decks and (maybe) notes
 * @returns {Object} App data where every card's text matches its note
 */
export function resolveNotes(data) {
	if (!data?.decks) return data;
	let notes = data.notes || [];

	const missing = addMissingNotes(data.decks, notes);
	let decks = data.decks;
	if (missing) {
		notes = [...notes, ...missing.added];
		decks = decks.map((deck) =>
			deck.cards?.some((c) => missing.assigned.has(c.cardId))
				? {
						...deck,
						cards: deck.cards.map((card) => {
							const a = missing.assigned.get(card.cardId);
							return a ? { ...card, ...a } : card;
						}),
					}
				: deck
		);
	}

	const noteById = new Map(notes.map((n) => [n.noteId, n]));
	const cardsByNote = new Map();
	decks.forEach((deck) =>
		(deck.cards || []).forEach((card) => {
			if (!cardsByNote.has(card.noteId)) cardsByNote.set(card.noteId, []);
			cardsByNote.get(card.noteId).push(card.cardId);
		})
	);

	let decksChanged = decks !== data.decks;
	const resolvedDecks = decks.map((deck) => {
		let changed = false;
		const cards = (deck.cards || []).map((card) => {
			const note = noteById.get(card.noteId);
			const template = card.template || 'forward';
			const { front, back } = cardText(note, template);
			const partnerCardId = cardsByNote
				.get(card.noteId)
				.find((id) => id !== card.cardId);
			if (
				card.front === front &&
				card.back === back &&
				card.partnerCardId === partnerCardId &&
				card.template === template
			) {
				return card;
			}
			changed = true;
			const next = { ...card, template, front, back, partnerCardId };
			if (!partnerCardId) delete next.partnerCardId;
			return next;
		});
		if (!changed) return deck;
		decksChanged = true;
		return { ...deck, cards };
	});

	const usedNotes = notes.filter((n) => cardsByNote.has(n.noteId));
	const notesChanged =
		notes !== data.notes || usedNotes.length !== notes.length;

	if (!decksChanged && !notesChanged) return data;
	return {
		...data,
		notes: notesChanged ? usedNotes : data.notes,
		decks: decksChanged ? resolvedDecks : data.decks,
	};
}

/**
 * Cards as data.json stores them: without the fields their note provides,
 * and without `template` when it's the default, `forward`. A card whose note
 * is missing keeps its text, so nothing is ever dropped.
 */
export function stripNoteFields(data) {
	const noteIds = new Set((data.notes || []).map((n) => n.noteId));
	return {
		...data,
		decks: (data.decks || []).map((deck) => ({
			...deck,
			cards: (deck.cards || []).map((card) => {
				if (!noteIds.has(card.noteId)) return card;
				const stored = { ...card };
				DERIVED_FIELDS.forEach((field) => delete stored[field]);
				if (stored.template === 'forward') delete stored.template;
				return stored;
			}),
		})),
	};
}

/**
 * Change the text a card shows, by changing its note. Its reversed partner,
 * if any, changes with it.
 */
export function setCardText(data, deckId, cardId, front, back) {
	const card = (data.decks || [])
		.find((d) => d.deckId === deckId)
		?.cards?.find((c) => c.cardId === cardId);
	if (!card?.noteId) return data;
	const text = noteTextFor(card.template, front, back);
	return {
		...data,
		notes: (data.notes || []).map((note) =>
			note.noteId === card.noteId ? { ...note, ...text } : note
		),
	};
}

/** A new note and its forward card */
export function newNoteAndCard(front, back, now = Date.now()) {
	const note = { noteId: newNoteId(), front, back, createdAt: now };
	const card = {
		cardId: `${now}-${Math.random().toString(36).slice(2, 11)}`,
		noteId: note.noteId,
		template: 'forward',
		reviews: [],
		whenDue: now,
		createdAt: now,
	};
	return { note, card };
}

/** A new card showing the other side of `card`'s note */
export function reversedCard(card, cardId, now = Date.now()) {
	return {
		cardId,
		noteId: card.noteId,
		template: card.template === 'reverse' ? 'forward' : 'reverse',
		reviews: [],
		whenDue: now,
		createdAt: now,
	};
}

/**
 * Notes changed since the last save: { upsert, remove }, or null if none.
 * @param {Array} current - notes now
 * @param {Array} saved - notes as last saved
 */
export function diffNotes(current = [], saved = []) {
	const savedById = new Map(saved.map((n) => [n.noteId, n]));
	const currentIds = new Set(current.map((n) => n.noteId));
	const upsert = current.filter((note) => {
		const before = savedById.get(note.noteId);
		return !before || JSON.stringify(before) !== JSON.stringify(note);
	});
	const remove = saved
		.filter((n) => !currentIds.has(n.noteId))
		.map((n) => n.noteId);
	return upsert.length || remove.length ? { upsert, remove } : null;
}
