// Cloze deletions, in Anki's syntax: {{c1::answer}} or {{c1::answer::hint}}.
// A cloze note makes one card per number; on card N, every c<N> deletion is
// hidden on the front and highlighted on the back, and other numbers show
// their answers as plain text.

const CLOZE_RE = /\{\{c(\d+)::([\s\S]*?)(?:::([\s\S]*?))?\}\}/g;

/** The cloze numbers in the text, sorted: "{{c2::a}} {{c1::b}}" → [1, 2] */
export function clozeOrds(text = '') {
	const ords = new Set();
	for (const match of text.matchAll(CLOZE_RE)) {
		const ord = Number(match[1]);
		if (ord > 0) ords.add(ord);
	}
	return [...ords].sort((a, b) => a - b);
}

/**
 * The text as card `ord` shows it, in parts:
 *   { type: 'text', text }    plain text, including other numbers' answers
 *   { type: 'blank', text }   the hidden deletion on the front: [...] or [hint]
 *   { type: 'answer', text }  the revealed deletion on the back
 */
export function clozeParts(text = '', ord, side) {
	const parts = [];
	let last = 0;
	for (const match of text.matchAll(CLOZE_RE)) {
		if (match.index > last) {
			parts.push({ type: 'text', text: text.slice(last, match.index) });
		}
		const [, n, answer, hint] = match;
		if (Number(n) !== ord) {
			parts.push({ type: 'text', text: answer });
		} else if (side === 'front') {
			parts.push({ type: 'blank', text: `[${hint || '...'}]` });
		} else {
			parts.push({ type: 'answer', text: answer });
		}
		last = match.index + match[0].length;
	}
	if (last < text.length) {
		parts.push({ type: 'text', text: text.slice(last) });
	}
	return parts;
}

/** A side of card `ord` as plain text. The back ends with the note's extra. */
export function clozeSideText(text, ord, side, extra = '') {
	const shown = clozeParts(text, ord, side)
		.map((part) => part.text)
		.join('');
	return side === 'back' && extra.trim() ? `${shown}\n\n${extra}` : shown;
}

/** The next unused cloze number */
export function nextClozeOrd(text = '') {
	const ords = clozeOrds(text);
	return ords.length ? ords[ords.length - 1] + 1 : 1;
}

/**
 * Wrap text[start..end] in a new cloze deletion.
 * @param {number} ord - Cloze number; defaults to the next unused one
 * @returns {{ text, cursor }} the new text and where to put the cursor:
 *   after the deletion, or inside it if nothing was selected
 */
export function wrapCloze(text, start, end, ord = nextClozeOrd(text)) {
	const open = `{{c${ord}::`;
	const selected = text.slice(start, end);
	const wrapped = `${open}${selected}}}`;
	return {
		text: text.slice(0, start) + wrapped + text.slice(end),
		cursor: selected ? start + wrapped.length : start + open.length,
	};
}

/** Text read aloud for a cloze front: the blank is said, not spelled out */
export function speakableText(text = '') {
	return text.replace(/\[\.\.\.\]/g, 'blank');
}

/** The props ClozeText needs for one side of a card, or null if not cloze */
export function clozeProps(card, side) {
	if (card?.template !== 'cloze') return null;
	return {
		text: card.clozeText,
		ord: card.ord,
		side,
		extra: card.clozeExtra,
	};
}
