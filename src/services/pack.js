// Content packs: folders, decks and cards (with images) in one JSON
// document, written by people or agents and imported in the app. The format
// is documented for agents in public/agents.md, with a JSON Schema in
// public/flashcards-pack.schema.json; keep the three in step.
//
// A pack may be plain JSON or a .zip holding the JSON plus image files.
// Cards show images with ![alt](asset:NAME), where NAME is a key of the
// pack's `assets` (SVG text, or a data: URI) or a file path in the zip.
//
// With a pack `id`, items carrying a `key` remember it (`importKey` on the
// folder, deck or note), so importing the pack again updates them in place,
// review history and all, instead of adding copies. Nothing is ever deleted
// by an import, except cloze cards whose number left the text.

import { CONTAINER_COLORS } from '../config/containerColors';
import { CONTAINER_ICONS } from '../config/containerIcons';
import { clozeOrds } from './cloze';
import {
	newCardId,
	newClozeNoteAndCards,
	newNoteAndCard,
	reversedCard,
	setClozeText,
} from './notes';

export const PACK_FORMAT = 'flashcards-pack';
export const PACK_VERSION = 1;

const IMAGE_TYPES = {
	svg: 'image/svg+xml',
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	webp: 'image/webp',
};

// ![alt](asset:NAME) or ![alt](asset:NAME "title")
const ASSET_RE = /(!\[[^\]]*\]\()asset:([^)\s]+)/g;

// ---------------------------------------------------------------------------
// Reading

/**
 * Read a pack from a file (.json or .zip) or pasted text
 * @param {File|string} source
 * @returns {Promise<{ pack: Object, files: Map<string, Blob> }>} the pack and,
 *   for a zip, its other files by path
 * @throws {Error} if it isn't JSON or a zip with a JSON file in it
 */
export async function readPack(source) {
	if (typeof source === 'string') {
		return { pack: parseJson(source), files: new Map() };
	}
	const isZip =
		/\.zip$/i.test(source.name || '') || source.type === 'application/zip';
	if (!isZip) {
		return { pack: parseJson(await source.text()), files: new Map() };
	}
	const { unzipSync } = await import('fflate');
	const entries = unzipSync(new Uint8Array(await source.arrayBuffer()));
	const files = new Map();
	Object.entries(entries).forEach(([path, bytes]) => {
		if (path.endsWith('/') || path.startsWith('__MACOSX/')) return;
		const ext = path.split('.').pop().toLowerCase();
		files.set(
			path,
			new Blob([bytes], {
				type: IMAGE_TYPES[ext] || 'application/octet-stream',
			})
		);
	});
	const jsonPaths = [...files.keys()].filter((p) => /\.json$/i.test(p));
	const packPath =
		jsonPaths.find((p) => p.split('/').pop() === 'pack.json') ||
		(jsonPaths.length === 1 ? jsonPaths[0] : null);
	if (!packPath) {
		throw new Error(
			'The zip needs a pack.json (or exactly one .json file) with the pack'
		);
	}
	const pack = parseJson(await files.get(packPath).text());
	files.delete(packPath);
	// Paths are relative to the folder pack.json is in
	const base = packPath.includes('/')
		? packPath.slice(0, packPath.lastIndexOf('/') + 1)
		: '';
	const relative = new Map();
	files.forEach((blob, path) => {
		if (path.startsWith(base)) relative.set(path.slice(base.length), blob);
	});
	return { pack, files: relative };
}

function parseJson(text) {
	try {
		return JSON.parse(text.replace(/^\uFEFF/, ''));
	} catch (error) {
		throw new Error(`Not valid JSON: ${error.message}`);
	}
}

// ---------------------------------------------------------------------------
// Checking: problems are reported with where they are, e.g.
// folders[0].decks[2].cards[5].cloze, so an agent can fix them

const isText = (v) => typeof v === 'string' && v.trim() !== '';

const FIELDS = {
	pack: ['format', 'version', 'id', 'name', 'folders', 'decks', 'assets'],
	folder: [
		'key',
		'name',
		'description',
		'color',
		'symbol',
		'folders',
		'decks',
	],
	deck: ['key', 'name', 'color', 'symbol', 'cards'],
	card: ['key', 'front', 'back', 'reverse', 'cloze', 'extra'],
};

/**
 * Check a pack and put it in a standard shape
 * @param {Object} pack - as read
 * @param {Map<string, Blob>} [files] - a zip's files
 * @returns {{ errors: {path, message}[], warnings: {path, message}[],
 *   pack: Object|null, assets: Map<string, Blob> }} the normalized pack
 *   (null if there are errors) and the image of each asset the cards use
 */
export function checkPack(pack, files = new Map()) {
	const errors = [];
	const warnings = [];
	const error = (path, message) => errors.push({ path, message });
	const warn = (path, message) => warnings.push({ path, message });

	if (!pack || typeof pack !== 'object' || Array.isArray(pack)) {
		error('', 'A pack is a JSON object');
		return { errors, warnings, pack: null, assets: new Map() };
	}
	if (pack.format !== PACK_FORMAT) {
		error('format', `must be "${PACK_FORMAT}"`);
	}
	if (pack.version !== PACK_VERSION) {
		error('version', `must be ${PACK_VERSION}`);
	}
	const packId = pack.id === undefined ? null : pack.id;
	if (packId !== null && !isText(packId)) {
		error('id', 'must be a non-empty string');
	}

	const unknownFields = (obj, kind, path) =>
		Object.keys(obj).forEach((field) => {
			if (!FIELDS[kind].includes(field)) {
				warn(
					path ? `${path}.${field}` : field,
					'unknown field, ignored'
				);
			}
		});
	unknownFields(pack, 'pack', '');

	const keysSeen = { folder: new Map(), deck: new Map(), card: new Map() };
	const checkKey = (item, kind, path) => {
		if (item.key === undefined) return null;
		if (!isText(item.key)) {
			error(`${path}.key`, 'must be a non-empty string');
			return null;
		}
		if (keysSeen[kind].has(item.key)) {
			error(
				`${path}.key`,
				`"${item.key}" is also used by ${keysSeen[kind].get(item.key)}`
			);
			return null;
		}
		keysSeen[kind].set(item.key, path);
		return item.key;
	};

	const checkLook = (item, path, isFolder) => {
		const look = {};
		if (item.color !== undefined) {
			if (CONTAINER_COLORS[item.color]) look.color = item.color;
			else
				warn(
					`${path}.color`,
					`unknown color "${item.color}", default used`
				);
		}
		if (item.symbol !== undefined) {
			if (CONTAINER_ICONS[item.symbol]) look.symbol = item.symbol;
			else
				warn(
					`${path}.symbol`,
					`unknown symbol "${item.symbol}", default ${isFolder ? 'folder' : 'deck'} icon used`
				);
		}
		return look;
	};

	const usedAssets = new Map(); // name -> first path that uses it
	const noteAssets = (text, path) => {
		for (const match of text.matchAll(ASSET_RE)) {
			if (!usedAssets.has(match[2])) usedAssets.set(match[2], path);
		}
	};

	const checkCard = (card, path) => {
		if (!card || typeof card !== 'object' || Array.isArray(card)) {
			error(path, 'a card is an object');
			return null;
		}
		unknownFields(card, 'card', path);
		const key = checkKey(card, 'card', path);
		if (card.cloze !== undefined) {
			if (card.front !== undefined || card.back !== undefined) {
				error(
					path,
					'a card has either cloze or front and back, not both'
				);
				return null;
			}
			if (!isText(card.cloze)) {
				error(`${path}.cloze`, 'must be a non-empty string');
				return null;
			}
			if (clozeOrds(card.cloze).length === 0) {
				error(`${path}.cloze`, 'has no deletions like {{c1::answer}}');
				return null;
			}
			if (card.extra !== undefined && typeof card.extra !== 'string') {
				error(`${path}.extra`, 'must be a string');
				return null;
			}
			if (card.reverse !== undefined) {
				warn(
					`${path}.reverse`,
					"cloze cards can't be reversed, ignored"
				);
			}
			noteAssets(card.cloze, `${path}.cloze`);
			noteAssets(card.extra || '', `${path}.extra`);
			return {
				key,
				kind: 'cloze',
				text: card.cloze.trim(),
				extra: (card.extra || '').trim(),
			};
		}
		if (!isText(card.front) || !isText(card.back)) {
			error(path, 'needs front and back (non-empty strings), or cloze');
			return null;
		}
		if (card.extra !== undefined) {
			warn(`${path}.extra`, 'only cloze cards have extra, ignored');
		}
		if (card.reverse !== undefined && typeof card.reverse !== 'boolean') {
			error(`${path}.reverse`, 'must be true or false');
			return null;
		}
		noteAssets(card.front, `${path}.front`);
		noteAssets(card.back, `${path}.back`);
		return {
			key,
			kind: 'basic',
			front: card.front.trim(),
			back: card.back.trim(),
			reverse: card.reverse === true,
		};
	};

	const checkDeck = (deck, path) => {
		if (!deck || typeof deck !== 'object' || Array.isArray(deck)) {
			error(path, 'a deck is an object');
			return null;
		}
		unknownFields(deck, 'deck', path);
		if (!isText(deck.name)) error(`${path}.name`, 'is required');
		const cards = deck.cards ?? [];
		if (!Array.isArray(cards)) {
			error(`${path}.cards`, 'must be a list');
			return null;
		}
		return {
			key: checkKey(deck, 'deck', path),
			name: isText(deck.name) ? deck.name.trim() : '',
			...checkLook(deck, path, false),
			cards: cards
				.map((card, i) => checkCard(card, `${path}.cards[${i}]`))
				.filter(Boolean),
		};
	};

	const checkList = (list, path, check) => {
		if (list === undefined) return [];
		if (!Array.isArray(list)) {
			error(path, 'must be a list');
			return [];
		}
		return list
			.map((item, i) => check(item, `${path}[${i}]`))
			.filter(Boolean);
	};

	const checkFolder = (folder, path) => {
		if (!folder || typeof folder !== 'object' || Array.isArray(folder)) {
			error(path, 'a folder is an object');
			return null;
		}
		unknownFields(folder, 'folder', path);
		if (!isText(folder.name)) error(`${path}.name`, 'is required');
		if (
			folder.description !== undefined &&
			typeof folder.description !== 'string'
		) {
			error(`${path}.description`, 'must be a string');
		}
		return {
			key: checkKey(folder, 'folder', path),
			name: isText(folder.name) ? folder.name.trim() : '',
			description: folder.description?.trim() || undefined,
			...checkLook(folder, path, true),
			folders: checkList(folder.folders, `${path}.folders`, checkFolder),
			decks: checkList(folder.decks, `${path}.decks`, checkDeck),
		};
	};

	const folders = checkList(pack.folders, 'folders', checkFolder);
	const decks = checkList(pack.decks, 'decks', checkDeck);
	if (pack.folders === undefined && pack.decks === undefined) {
		error('', 'needs folders or decks');
	}

	const anyKeys = Object.values(keysSeen).some((m) => m.size > 0);
	if (anyKeys && !packId) {
		warn(
			'id',
			'keys only take effect with a pack id; without one every import adds new copies'
		);
	}

	// Assets: every one a card uses must exist and be an image
	const assets = new Map();
	const declared = pack.assets ?? {};
	if (typeof declared !== 'object' || Array.isArray(declared)) {
		error('assets', 'must be an object of name: SVG text or data: URI');
	}
	usedAssets.forEach((path, name) => {
		const where = `assets["${name}"]`;
		let blob = null;
		if (Object.hasOwn(declared, name)) {
			blob = assetBlob(declared[name], name, where, error);
		} else if (files.has(name)) {
			blob = files.get(name);
			if (!Object.values(IMAGE_TYPES).includes(blob.type)) {
				error(where, 'must be an SVG, PNG, JPEG, GIF or WebP file');
				blob = null;
			}
		} else {
			error(path, `uses asset:${name}, which isn't in assets or the zip`);
		}
		if (blob) assets.set(name, blob);
	});
	Object.keys(declared).forEach((name) => {
		if (!usedAssets.has(name)) {
			warn(`assets["${name}"]`, 'not used by any card, ignored');
		}
	});

	const normalized = errors.length ? null : { id: packId, folders, decks };
	return { errors, warnings, pack: normalized, assets };
}

function assetBlob(value, name, where, error) {
	if (typeof value !== 'string' || !value.trim()) {
		error(where, 'must be SVG text or a data: URI');
		return null;
	}
	const text = value.trim();
	if (text.startsWith('data:')) {
		const match = text.match(/^data:([^;,]+)(;base64)?,(.*)$/s);
		if (!match || !Object.values(IMAGE_TYPES).includes(match[1])) {
			error(
				where,
				'data: URI must be image/svg+xml, image/png, image/jpeg, image/gif or image/webp'
			);
			return null;
		}
		try {
			const bytes = match[2]
				? Uint8Array.from(atob(match[3].replace(/\s/g, '')), (c) =>
						c.charCodeAt(0)
					)
				: new TextEncoder().encode(decodeURIComponent(match[3]));
			return new Blob([bytes], { type: match[1] });
		} catch {
			error(where, 'data: URI could not be decoded');
			return null;
		}
	}
	if (/<svg[\s>]/i.test(text)) {
		return new Blob([text], { type: 'image/svg+xml' });
	}
	error(where, `must be SVG text (<svg ...>) or a data: URI (${name})`);
	return null;
}

/** The pack with asset: links swapped for media: links */
export function linkAssets(pack, mediaNames) {
	const swap = (text) =>
		text.replace(ASSET_RE, (match, prefix, name) =>
			mediaNames.has(name)
				? `${prefix}media:${mediaNames.get(name)}`
				: match
		);
	const card = (c) =>
		c.kind === 'cloze'
			? { ...c, text: swap(c.text), extra: swap(c.extra) }
			: { ...c, front: swap(c.front), back: swap(c.back) };
	const deck = (d) => ({ ...d, cards: d.cards.map(card) });
	const folder = (f) => ({
		...f,
		folders: f.folders.map(folder),
		decks: f.decks.map(deck),
	});
	return {
		...pack,
		folders: pack.folders.map(folder),
		decks: pack.decks.map(deck),
	};
}

// ---------------------------------------------------------------------------
// Applying

const newContainerId = (now) =>
	`${now}-${Math.random().toString(36).slice(2, 11)}`;

const emptyCounts = () => ({ created: 0, updated: 0, unchanged: 0 });

/**
 * Add a checked pack to the app data, or update what an earlier import of it
 * made. Pure, so it also previews an import.
 * @param {Object} data - app data (in memory)
 * @param {Object} pack - from checkPack (and linkAssets)
 * @param {Object} [options]
 * @param {string|null} [options.parentFolderId] - where new top-level
 *   folders and decks go
 * @returns {{ data, summary, notices: {path, message}[] }} summary counts
 *   folders, decks and cards created/updated/unchanged, and cloze cards
 *   deleted; notices are things the import couldn't do as asked
 */
export function applyPack(
	data,
	pack,
	{ parentFolderId = null, now = Date.now() } = {}
) {
	let next = {
		...data,
		folders: [...(data.folders || [])],
		notes: [...(data.notes || [])],
		decks: (data.decks || []).map((d) => ({
			...d,
			cards: [...(d.cards || [])],
		})),
	};
	const summary = {
		folders: emptyCounts(),
		decks: emptyCounts(),
		cards: emptyCounts(),
		clozeCardsDeleted: 0,
	};
	const notices = [];
	const keyOf = (key) => (pack.id && key ? `${pack.id}/${key}` : null);
	const findDeck = (deckId) => next.decks.find((d) => d.deckId === deckId);
	const cardsOfNote = (noteId) =>
		next.decks.flatMap((d) =>
			d.cards
				.filter((c) => c.noteId === noteId)
				.map((c) => ({ card: c, deck: d }))
		);

	const applyCard = (card, deckId, path) => {
		const importKey = keyOf(card.key);
		const noteIndex = importKey
			? next.notes.findIndex((n) => n.importKey === importKey)
			: -1;
		const note = noteIndex === -1 ? null : next.notes[noteIndex];
		const placed = note ? cardsOfNote(note.noteId) : [];

		if (!note || placed.length === 0) {
			// New: a note and its card(s)
			if (note) next.notes.splice(noteIndex, 1); // orphaned, replaced
			const deck = findDeck(deckId);
			if (card.kind === 'cloze') {
				const { note: n, cards } = newClozeNoteAndCards(
					card.text,
					card.extra,
					now
				);
				if (importKey) n.importKey = importKey;
				next.notes.push(n);
				deck.cards.push(...cards);
				summary.cards.created += cards.length;
			} else {
				const { note: n, card: c } = newNoteAndCard(
					card.front,
					card.back,
					now
				);
				if (importKey) n.importKey = importKey;
				next.notes.push(n);
				deck.cards.push(c);
				summary.cards.created += 1;
				if (card.reverse) {
					deck.cards.push(reversedCard(c, newCardId(now), now));
					summary.cards.created += 1;
				}
			}
			return;
		}

		const isCloze = note.type === 'cloze';
		if (isCloze !== (card.kind === 'cloze')) {
			notices.push({
				path,
				message: `was imported as a ${isCloze ? 'cloze' : 'basic'} card; changing its kind isn't supported, left as it was`,
			});
			summary.cards.unchanged += placed.length;
			return;
		}

		if (isCloze) {
			const same =
				note.text === card.text && (note.extra || '') === card.extra;
			if (same) {
				summary.cards.unchanged += placed.length;
				return;
			}
			const before = placed.length;
			const keep = new Set(clozeOrds(card.text));
			const removed = placed.filter(
				({ card: c }) => !keep.has(c.ord)
			).length;
			// New numbers go in the deck its cards are in now
			next = setClozeText(
				next,
				placed[0].deck.deckId,
				note.noteId,
				card.text,
				card.extra
			);
			next = {
				...next,
				decks: next.decks.map((d) => ({ ...d, cards: [...d.cards] })),
			};
			const after = cardsOfNote(note.noteId).length;
			summary.cards.updated += before - removed;
			summary.cards.created += after - (before - removed);
			summary.clozeCardsDeleted += removed;
			return;
		}

		// Basic: change the note's text; add the reversed card if asked
		const changed = note.front !== card.front || note.back !== card.back;
		if (changed) {
			next.notes[noteIndex] = {
				...note,
				front: card.front,
				back: card.back,
			};
			summary.cards.updated += placed.length;
		} else {
			summary.cards.unchanged += placed.length;
		}
		const hasReverse = placed.some(
			({ card: c }) => c.template === 'reverse'
		);
		if (card.reverse && !hasReverse) {
			const forward = placed.find(
				({ card: c }) => c.template !== 'reverse'
			);
			forward.deck.cards.push(
				reversedCard(forward.card, newCardId(now), now)
			);
			summary.cards.created += 1;
		} else if (!card.reverse && hasReverse) {
			notices.push({
				path,
				message:
					'has a reversed card from an earlier import; imports never delete cards, so it stays',
			});
		}
	};

	const applyDeck = (deck, parentId, path) => {
		const importKey = keyOf(deck.key);
		let existing = importKey
			? next.decks.find((d) => d.importKey === importKey)
			: null;
		if (existing) {
			const look = {
				deckName: deck.name,
				...(deck.color && { deckColor: deck.color }),
				...(deck.symbol && { deckSymbol: deck.symbol }),
			};
			const changed = Object.entries(look).some(
				([k, v]) => existing[k] !== v
			);
			if (changed) {
				existing = { ...existing, ...look };
				next.decks = next.decks.map((d) =>
					d.deckId === existing.deckId ? existing : d
				);
				summary.decks.updated += 1;
			} else {
				summary.decks.unchanged += 1;
			}
		} else {
			existing = {
				deckId: newContainerId(now),
				deckName: deck.name,
				deckSymbol: deck.symbol || 'book-open',
				deckColor: deck.color || 'teal',
				parentFolderId: parentId,
				createdAt: now,
				cards: [],
				...(importKey && { importKey }),
			};
			next.decks.push(existing);
			summary.decks.created += 1;
		}
		deck.cards.forEach((card, i) =>
			applyCard(card, existing.deckId, `${path}.cards[${i}]`)
		);
	};

	const applyFolder = (folder, parentId, path) => {
		const importKey = keyOf(folder.key);
		let existing = importKey
			? next.folders.find((f) => f.importKey === importKey)
			: null;
		if (existing) {
			const look = {
				folderName: folder.name,
				...(folder.description !== undefined && {
					folderDescription: folder.description,
				}),
				...(folder.color && { folderColor: folder.color }),
				...(folder.symbol && { folderSymbol: folder.symbol }),
			};
			const changed = Object.entries(look).some(
				([k, v]) => existing[k] !== v
			);
			if (changed) {
				existing = { ...existing, ...look };
				next.folders = next.folders.map((f) =>
					f.folderId === existing.folderId ? existing : f
				);
				summary.folders.updated += 1;
			} else {
				summary.folders.unchanged += 1;
			}
		} else {
			existing = {
				folderId: newContainerId(now),
				folderName: folder.name,
				...(folder.description && {
					folderDescription: folder.description,
				}),
				folderSymbol: folder.symbol || 'folder',
				folderColor: folder.color || 'teal',
				parentFolderId: parentId,
				createdAt: now,
				...(importKey && { importKey }),
			};
			next.folders.push(existing);
			summary.folders.created += 1;
		}
		folder.folders.forEach((f, i) =>
			applyFolder(f, existing.folderId, `${path}.folders[${i}]`)
		);
		folder.decks.forEach((d, i) =>
			applyDeck(d, existing.folderId, `${path}.decks[${i}]`)
		);
	};

	pack.folders.forEach((f, i) =>
		applyFolder(f, parentFolderId, `folders[${i}]`)
	);
	pack.decks.forEach((d, i) => applyDeck(d, parentFolderId, `decks[${i}]`));

	return { data: next, summary, notices };
}
