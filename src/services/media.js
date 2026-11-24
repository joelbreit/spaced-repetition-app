// Images in cards. An image is stored once, in S3 at users/{id}/media/{name},
// where name = {sha256 of its bytes}.{ext}; card text refers to it as
// ![alt](media:{name}). Uploads and downloads go straight to S3 with signed
// URLs from the API (backend/.../media.mjs).
//
// Since an image never changes, its bytes are kept in the browser's Cache
// Storage and fetched from S3 once per device. Uploads that fail (offline,
// closed tab) are retried the next time the app has a signed-in session.

import { requestMediaUpload, requestMediaUrls } from './apiStorage';

export const MEDIA_PREFIX = 'media:';
export const MAX_MEDIA_BYTES = 5 * 1024 * 1024;
// Photos are scaled down to this many pixels on their longer side
const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.9;

const EXTENSIONS = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/gif': 'gif',
	'image/webp': 'webp',
	'image/svg+xml': 'svg',
};
export const ACCEPTED_TYPES = Object.keys(EXTENSIONS);

const NAME_RE = /^[0-9a-f]{64}\.(jpg|png|gif|webp|svg)$/;
export const isMediaName = (name) => NAME_RE.test(name || '');

/** The image name in a media: link, or null */
export function mediaNameOf(src = '') {
	if (!src.startsWith(MEDIA_PREFIX)) return null;
	const name = src.slice(MEDIA_PREFIX.length);
	return isMediaName(name) ? name : null;
}

// ---------------------------------------------------------------------------
// Signed-in session, set by AppDataContext. Without one (guest mode), images
// live only in this browser.

let auth = null;
export function setMediaAuth(next) {
	auth = next?.authToken ? next : null;
	if (auth) retryPendingUploads();
}

// ---------------------------------------------------------------------------
// Local copies: object URLs this page made, and the browser's Cache Storage

const objectUrls = new Map(); // name -> blob: URL
const CACHE_NAME = 'card-media-v1';
const cacheRequest = (name) =>
	new Request(`${location.origin}/__card-media/${name}`);

async function openCache() {
	try {
		return typeof caches === 'undefined'
			? null
			: await caches.open(CACHE_NAME);
	} catch {
		return null; // e.g. not a secure context
	}
}

async function cachePut(name, blob) {
	const cache = await openCache();
	await cache
		?.put(
			cacheRequest(name),
			new Response(blob, { headers: { 'Content-Type': blob.type } })
		)
		.catch(() => {});
}

async function cacheGet(name) {
	const cache = await openCache();
	const response = await cache?.match(cacheRequest(name));
	return response ? response.blob() : null;
}

function rememberBlob(name, blob) {
	if (!objectUrls.has(name)) {
		objectUrls.set(name, URL.createObjectURL(blob));
	}
	return objectUrls.get(name);
}

// ---------------------------------------------------------------------------
// Downloading: names asked for in the same tick share one /media/urls call

let queue = new Map(); // name -> { resolve, reject }
let flushScheduled = false;

function signedUrlFor(name) {
	return new Promise((resolve, reject) => {
		queue.set(name, { resolve, reject });
		if (!flushScheduled) {
			flushScheduled = true;
			setTimeout(flushQueue, 0);
		}
	});
}

async function flushQueue() {
	const batch = queue;
	queue = new Map();
	flushScheduled = false;
	const names = [...batch.keys()];
	if (!auth) {
		const error = new Error('Sign in to see this image');
		batch.forEach(({ reject }) => reject(error));
		return;
	}
	for (let i = 0; i < names.length; i += 200) {
		const chunk = names.slice(i, i + 200);
		try {
			const urls = await requestMediaUrls(
				chunk,
				auth.authToken,
				auth.refreshToken
			);
			chunk.forEach((name) =>
				urls[name]
					? batch.get(name).resolve(urls[name])
					: batch.get(name).reject(new Error('No link for image'))
			);
		} catch (error) {
			chunk.forEach((name) => batch.get(name).reject(error));
		}
	}
}

const loading = new Map(); // name -> Promise<string>

/**
 * A URL an <img> can show for an image: from this page, the browser's
 * cache, or S3
 * @returns {Promise<string>}
 */
export function getMediaUrl(name) {
	if (objectUrls.has(name)) return Promise.resolve(objectUrls.get(name));
	if (!loading.has(name)) {
		const promise = (async () => {
			const cached = await cacheGet(name);
			if (cached) return rememberBlob(name, cached);
			if (!auth) throw new Error('Sign in to see this image');
			const url = await signedUrlFor(name);
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(
					response.status === 404 || response.status === 403
						? 'Image not found'
						: `Image download failed (${response.status})`
				);
			}
			const blob = await response.blob();
			await cachePut(name, blob);
			return rememberBlob(name, blob);
		})();
		loading.set(name, promise);
		// A failure isn't remembered: the next look tries again
		promise.catch(() => loading.delete(name));
	}
	return loading.get(name);
}

/** The URL if it's ready now (no flash of a placeholder), else null */
export const getMediaUrlNow = (name) => objectUrls.get(name) || null;

// ---------------------------------------------------------------------------
// Preparing an image: photos scaled down and stripped of metadata, SVGs
// cleaned of scripts

async function sanitizeSvg(file) {
	const { default: DOMPurify } = await import('dompurify');
	const clean = DOMPurify.sanitize(await file.text(), {
		USE_PROFILES: { svg: true, svgFilters: true },
	});
	if (!clean.trim()) throw new Error('That SVG has no drawable content');
	return new Blob([clean], { type: 'image/svg+xml' });
}

function canvasToBlob(canvas, type, quality) {
	return new Promise((resolve, reject) =>
		canvas.toBlob(
			(blob) =>
				blob ? resolve(blob) : reject(new Error('Image encode failed')),
			type,
			quality
		)
	);
}

async function reencode(file) {
	const bitmap = await createImageBitmap(file);
	const { width, height } = bitmap;
	const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
	// JPEGs are always re-encoded, which drops EXIF data such as location;
	// PNG and WebP only when they're too big
	if (scale === 1 && file.type !== 'image/jpeg') {
		bitmap.close();
		return file;
	}
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(width * scale);
	canvas.height = Math.round(height * scale);
	canvas
		.getContext('2d')
		.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close();
	let blob = await canvasToBlob(canvas, file.type, JPEG_QUALITY);
	// A large photo saved as PNG can stay too big: send it as a JPEG
	if (blob.size > MAX_MEDIA_BYTES && file.type !== 'image/jpeg') {
		blob = await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY);
	}
	return blob;
}

/**
 * The image as it will be stored
 * @param {File|Blob} file
 * @returns {Promise<Blob>}
 */
export async function prepareImage(file) {
	if (!EXTENSIONS[file.type]) {
		throw new Error('Images must be JPEG, PNG, GIF, WebP or SVG files');
	}
	let blob;
	if (file.type === 'image/svg+xml') blob = await sanitizeSvg(file);
	// GIFs keep their animation, so they aren't redrawn
	else if (file.type === 'image/gif') blob = file;
	else blob = await reencode(file);
	if (blob.size > MAX_MEDIA_BYTES) {
		throw new Error(
			`Images can be up to ${MAX_MEDIA_BYTES / 1024 / 1024} MB; this one is ${(blob.size / 1024 / 1024).toFixed(1)} MB`
		);
	}
	return blob;
}

async function nameFor(blob) {
	const digest = await crypto.subtle.digest(
		'SHA-256',
		await blob.arrayBuffer()
	);
	const hex = [...new Uint8Array(digest)]
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
	return `${hex}.${EXTENSIONS[blob.type]}`;
}

// ---------------------------------------------------------------------------
// Uploading. Names waiting to upload are kept in localStorage, so an upload
// cut short is retried from the cached copy next time.

const PENDING_KEY = 'cardMediaPending';
const readPending = () => {
	try {
		return JSON.parse(localStorage.getItem(PENDING_KEY)) || [];
	} catch {
		return [];
	}
};
const writePending = (names) => {
	try {
		localStorage.setItem(PENDING_KEY, JSON.stringify(names));
	} catch {
		// Storage unavailable: no retry later
	}
};
const markPending = (name) =>
	writePending([...new Set([...readPending(), name])]);
const clearPending = (name) =>
	writePending(readPending().filter((n) => n !== name));

const uploading = new Map(); // name -> Promise

async function upload(name, blob) {
	const { authToken, refreshToken } = auth;
	const target = await requestMediaUpload(
		{ name, type: blob.type, size: blob.size },
		authToken,
		refreshToken
	);
	if (!target.exists) {
		const form = new FormData();
		Object.entries(target.fields).forEach(([key, value]) =>
			form.append(key, value)
		);
		form.append('file', blob); // must come last
		const response = await fetch(target.url, {
			method: 'POST',
			body: form,
		});
		if (!response.ok) {
			throw new Error(`Image upload failed (${response.status})`);
		}
	}
	clearPending(name);
}

function startUpload(name, blob) {
	if (!auth) return Promise.resolve();
	if (!uploading.has(name)) {
		const promise = upload(name, blob).finally(() =>
			uploading.delete(name)
		);
		uploading.set(name, promise);
	}
	return uploading.get(name);
}

async function retryPendingUploads() {
	for (const name of readPending()) {
		const blob = await cacheGet(name);
		if (!blob) {
			clearPending(name); // nothing left to send
			continue;
		}
		startUpload(name, blob).catch(() => {}); // stays pending
	}
}

/**
 * Prepare and store an image for a card: shown at once from this browser,
 * uploaded in the background when signed in
 * @param {File} file
 * @returns {Promise<{ name: string, uploaded: Promise<void> }>} the name for
 *   a media: link, and the upload (rejects if it fails; it's retried later)
 */
export async function addImage(file) {
	const blob = await prepareImage(file);
	const name = await nameFor(blob);
	rememberBlob(name, blob);
	await cachePut(name, blob);
	if (auth) markPending(name);
	return { name, uploaded: startUpload(name, blob) };
}

/** Markdown for an image: alt text from the file name, if it has one */
export function imageMarkdown(name, fileName = '') {
	const base = fileName.replace(/\.[^.]+$/, '');
	// Pasted screenshots are all called "image"
	const alt = /^image$/i.test(base) ? '' : base.replace(/[[\]\\]/g, '');
	return `![${alt}](${MEDIA_PREFIX}${name})`;
}
