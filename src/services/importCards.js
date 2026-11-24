// Parsing a tab-separated file of cards for "Import Cards".
//
// Each row is one note:
//   front <tab> back          a basic card
//   cloze text [<tab> extra]  a cloze note, when the first column has
//                             {{c1::...}} deletions: one card per number
// Columns after these (e.g. Anki's tags) are ignored. A field in double
// quotes can hold tabs, line breaks and "" for a quote, as Anki and
// spreadsheets write them. Anki's header lines (#separator:tab, #html:true,
// ...) are skipped; with #html:true, line breaks and entities are turned back
// into text.

import { clozeOrds } from './cloze';

/**
 * Rows of fields from TSV text, honoring quoted fields. A quote that never
 * closes would swallow the rest of the file, so then quotes are read as
 * plain text instead.
 */
export function parseRows(text, quotes = true) {
	const rows = [];
	let row = [];
	let field = '';
	let quoted = false;
	let i = 0;
	const endField = () => {
		row.push(field);
		field = '';
	};
	const endRow = () => {
		endField();
		rows.push(row);
		row = [];
	};
	while (i < text.length) {
		const ch = text[i];
		if (quoted) {
			if (ch === '"' && text[i + 1] === '"') {
				field += '"';
				i += 2;
				continue;
			}
			if (ch === '"') quoted = false;
			else field += ch;
			i += 1;
			continue;
		}
		if (quotes && ch === '"' && field === '') {
			quoted = true;
		} else if (ch === '\t') {
			endField();
		} else if (ch === '\n' || ch === '\r') {
			if (ch === '\r' && text[i + 1] === '\n') i += 1;
			endRow();
		} else {
			field += ch;
		}
		i += 1;
	}
	if (quoted) return parseRows(text, false);
	if (field !== '' || row.length > 0) endRow();
	return rows;
}

const ENTITIES = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
};

/** Anki's HTML fields as plain text: line breaks kept, tags dropped */
function htmlToText(html) {
	return html
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/?(div|p|li)\b[^>]*>/gi, '\n')
		.replace(/<[^>]+>/g, '')
		.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code) => {
			if (code[0] === '#') {
				const n =
					code[1].toLowerCase() === 'x'
						? parseInt(code.slice(2), 16)
						: parseInt(code.slice(1), 10);
				return Number.isFinite(n) ? String.fromCodePoint(n) : match;
			}
			return ENTITIES[code.toLowerCase()] ?? match;
		})
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n');
}

const HEADER_RE = /^#[a-z ]+:/i;

/**
 * @param {string} text - the file's contents
 * @returns {{ basic: {front, back}[], cloze: {text, extra}[],
 *   skipped: number }} notes to add, and rows that were neither
 */
export function parseCardImport(text) {
	// Anki's header lines come first, one per line
	let body = text.replace(/^\uFEFF/, '');
	let html = false;
	for (;;) {
		const end = body.indexOf('\n');
		const line = (end === -1 ? body : body.slice(0, end)).replace(
			/\r$/,
			''
		);
		if (!HEADER_RE.test(line)) break;
		if (/^#html:\s*true$/i.test(line)) html = true;
		body = end === -1 ? '' : body.slice(end + 1);
	}

	const clean = (field = '') => (html ? htmlToText(field) : field).trim();
	const result = { basic: [], cloze: [], skipped: 0 };
	parseRows(body).forEach((row) => {
		if (row.every((field) => !field.trim())) return; // blank line
		const [first, second] = row.map(clean);
		if (clozeOrds(first).length > 0) {
			result.cloze.push({ text: first, extra: second || '' });
		} else if (first && second) {
			result.basic.push({ front: first, back: second });
		} else {
			result.skipped += 1;
		}
	});
	return result;
}
