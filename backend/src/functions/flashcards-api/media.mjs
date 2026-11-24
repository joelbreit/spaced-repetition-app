// Images in cards. Each is one S3 object, users/{id}/media/{sha256}.{ext},
// named after its contents so it never changes and is stored once however
// many cards use it. Card text refers to it as ![alt](media:{name}).
//
// The browser talks to S3 directly with short-lived signed URLs: a signed
// POST to upload (its policy pins the key, type and size) and signed GETs to
// download. The Lambda never handles image bytes.

import { HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const MAX_MEDIA_BYTES = 5 * 1024 * 1024;
export const MAX_URLS_PER_REQUEST = 200;

export const MEDIA_TYPES = {
	jpg: 'image/jpeg',
	png: 'image/png',
	gif: 'image/gif',
	webp: 'image/webp',
	svg: 'image/svg+xml',
};

const NAME_RE = /^[0-9a-f]{64}\.(jpg|png|gif|webp|svg)$/;

// Upload links are used at once; download links last long enough for a
// review session (the browser caches the bytes, not the link)
const UPLOAD_EXPIRES = 300;
const DOWNLOAD_EXPIRES = 3600;

export const mediaKey = (userId, name) => `users/${userId}/media/${name}`;

export const isMediaName = (name) =>
	typeof name === 'string' && NAME_RE.test(name);

/**
 * Check an upload request
 * @returns {string|null} why it's invalid, or null if it's fine
 */
export function validateUpload({ name, type, size } = {}) {
	if (!isMediaName(name)) {
		return 'name must be <sha256 hex>.<jpg|png|gif|webp|svg>';
	}
	const ext = name.split('.').pop();
	if (type !== MEDIA_TYPES[ext]) {
		return `type must be ${MEDIA_TYPES[ext]} for .${ext}`;
	}
	if (!Number.isInteger(size) || size < 1 || size > MAX_MEDIA_BYTES) {
		return `size must be 1 to ${MAX_MEDIA_BYTES} bytes`;
	}
	return null;
}

/**
 * Where to upload an image, or { exists: true } if it's already stored
 * @returns {Promise<{ exists: true } | { url, fields }>}
 */
export async function createUpload(s3, bucket, userId, { name, type }) {
	const Key = mediaKey(userId, name);
	try {
		await s3.send(new HeadObjectCommand({ Bucket: bucket, Key }));
		return { exists: true };
	} catch (error) {
		const status = error.$metadata?.httpStatusCode;
		if (error.name !== 'NotFound' && status !== 404) throw error;
	}
	const cacheControl = 'private, max-age=31536000, immutable';
	const { url, fields } = await createPresignedPost(s3, {
		Bucket: bucket,
		Key,
		Conditions: [
			['content-length-range', 1, MAX_MEDIA_BYTES],
			['eq', '$Content-Type', type],
			['eq', '$Cache-Control', cacheControl],
		],
		Fields: { 'Content-Type': type, 'Cache-Control': cacheControl },
		Expires: UPLOAD_EXPIRES,
	});
	return { url, fields };
}

/**
 * Download links for images, by name. Names that aren't valid are left out;
 * a link to an image that isn't stored fails when used (404).
 */
export async function createDownloadUrls(s3, bucket, userId, names) {
	const unique = [...new Set(names)].filter(isMediaName);
	const entries = await Promise.all(
		unique.map(async (name) => [
			name,
			await getSignedUrl(
				s3,
				new GetObjectCommand({
					Bucket: bucket,
					Key: mediaKey(userId, name),
				}),
				{ expiresIn: DOWNLOAD_EXPIRES }
			),
		])
	);
	return Object.fromEntries(entries);
}
