// Card text is Markdown (GitHub flavored, single line breaks kept), rendered
// by components/CardText.jsx. Helpers here are plain functions so they can
// be used outside React (read aloud, layout).

// A cloze card's deletions become one private-use character each in the
// Markdown source, so Markdown parsing can't split or misread them; a rehype
// plugin swaps them back for spans once the tree is built.
const MARKER_BASE = 0xe000;
const MARKER_RE = /[-]/;

/**
 * Markdown source for cloze parts (from clozeParts): text parts as written,
 * deletions (blank/answer) as markers
 */
export function clozeMarkdown(parts) {
	return parts
		.map((part, i) =>
			part.type === 'text'
				? part.text
				: String.fromCharCode(MARKER_BASE + i)
		)
		.join('');
}

/**
 * rehype plugin: replace cloze markers with
 * <span data-cloze={index} data-raw={inCode}> elements
 */
export function rehypeCloze({ parts = [] } = {}) {
	const isMarker = (ch) => {
		const part = parts[ch.charCodeAt(0) - MARKER_BASE];
		return part && part.type !== 'text';
	};
	const split = (value, inCode) => {
		const out = [];
		let text = '';
		for (const ch of value) {
			if (!isMarker(ch)) {
				text += ch;
				continue;
			}
			if (text) out.push({ type: 'text', value: text });
			text = '';
			const index = ch.charCodeAt(0) - MARKER_BASE;
			out.push({
				type: 'element',
				tagName: 'span',
				properties: { dataCloze: index, dataRaw: inCode },
				children: [{ type: 'text', value: parts[index].text }],
			});
		}
		if (text) out.push({ type: 'text', value: text });
		return out;
	};
	const walk = (node, inCode) => {
		if (!node.children) return;
		const code =
			inCode || node.tagName === 'code' || node.tagName === 'pre';
		node.children = node.children.flatMap((child) => {
			if (child.type === 'text' && MARKER_RE.test(child.value)) {
				return split(child.value, code);
			}
			walk(child, code);
			return [child];
		});
	};
	return (tree) => walk(tree, false);
}

/** Text content of a hast node */
export function hastText(node) {
	if (!node) return '';
	if (node.type === 'text') return node.value;
	return (node.children || []).map(hastText).join('');
}

// Lines that start a list, heading, quote, table, code fence or rule
const BLOCK_RE =
	/^\s{0,3}([-*+]\s|\d+[.)]\s|#{1,6}\s|>|\||```|~~~|(?:[-*_]\s*){3,}$)/m;

/** Does the text use block Markdown, which reads best left-aligned? */
export function hasBlockMarkdown(text = '') {
	return BLOCK_RE.test(text);
}

/**
 * Card text as it should be read aloud: Markdown syntax dropped, code blocks
 * and diagrams left out, a cloze blank said as "blank"
 */
export function speakableText(text = '') {
	return (
		text
			// Fenced code blocks and diagrams aren't read
			.replace(
				/^\s{0,3}(```|~~~)[^\n]*\n[\s\S]*?(?:^\s{0,3}\1[^\n]*$|(?![\s\S]))/gm,
				''
			)
			// Images: their alt text; links: their text
			.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
			.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
			// Headings, quotes, list markers
			.replace(/^\s{0,3}#{1,6}\s+/gm, '')
			.replace(/^\s{0,3}>\s?/gm, '')
			.replace(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/gm, '')
			// Table rules and pipes
			.replace(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/gm, '')
			.replace(/[ \t]*\|[ \t]*/g, ', ')
			.replace(/^, |, $/gm, '')
			// Horizontal rules
			.replace(/^\s{0,3}(?:[-*_]\s*){3,}$/gm, '')
			// Emphasis, strikethrough, inline code
			.replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, '$2')
			.replace(/(\*|_)(?=\S)([\s\S]*?\S)\1(?!\w)/g, '$2')
			.replace(/~~(?=\S)([\s\S]*?\S)~~/g, '$1')
			.replace(/`([^`]+)`/g, '$1')
			// A cloze blank
			.replace(/\[\.\.\.\]/g, 'blank')
			.replace(/\n{3,}/g, '\n\n')
			.trim()
	);
}
