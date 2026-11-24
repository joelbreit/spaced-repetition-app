import {
	S3Client,
	GetObjectCommand,
	PutObjectCommand,
	DeleteObjectCommand,
	ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { gzipSync } from 'node:zlib';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.S3_BUCKET;
const USER_POOL_ID = process.env.USER_POOL_ID;
const CLIENT_ID = process.env.CLIENT_ID;

const verifier = CognitoJwtVerifier.create({
	userPoolId: USER_POOL_ID,
	tokenUse: 'access',
	clientId: CLIENT_ID,
});

const headers = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers':
		'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
	'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
	'Access-Control-Max-Age': '86400',
	'Content-Type': 'application/json',
};

// Reviews live outside data.json, one object per UTC month of the review's
// timestamp: users/{id}/reviews/YYYY-MM.json = { reviews: [...] }, sorted by
// timestamp. Each review carries its cardId. A month file is small, so adding
// a review rewrites one month rather than the user's whole dataset.
const reviewsPrefix = (userId) => `users/${userId}/reviews/`;
const monthOf = (timestamp) =>
	new Date(timestamp || 0).toISOString().slice(0, 7);
const reviewKey = (review) => `${review.cardId}:${review.reviewId}`;

async function readJson(key, fallback) {
	try {
		const response = await s3Client.send(
			new GetObjectCommand({ Bucket: BUCKET, Key: key })
		);
		return JSON.parse(await response.Body.transformToString());
	} catch (error) {
		if (error.name === 'NoSuchKey') return fallback;
		throw error;
	}
}

async function listReviewMonthKeys(userId) {
	const keys = [];
	let ContinuationToken;
	do {
		const page = await s3Client.send(
			new ListObjectsV2Command({
				Bucket: BUCKET,
				Prefix: reviewsPrefix(userId),
				ContinuationToken,
			})
		);
		(page.Contents || []).forEach((object) => keys.push(object.Key));
		ContinuationToken = page.IsTruncated
			? page.NextContinuationToken
			: undefined;
	} while (ContinuationToken);
	return keys.sort();
}

async function loadAllReviews(userId) {
	const keys = await listReviewMonthKeys(userId);
	const months = await Promise.all(
		keys.map((key) => readJson(key, { reviews: [] }))
	);
	return months.flatMap((month) => month.reviews || []);
}

// Add and remove reviews, touching only the months involved. Adding is
// idempotent: a review already stored (same cardId and reviewId) is replaced,
// so a retried save never duplicates history.
async function updateReviews(userId, add = [], remove = []) {
	const byMonth = new Map();
	const monthEntry = (timestamp) => {
		const month = monthOf(timestamp);
		if (!byMonth.has(month)) byMonth.set(month, { add: [], remove: [] });
		return byMonth.get(month);
	};
	add.forEach((review) => monthEntry(review.timestamp).add.push(review));
	remove.forEach((review) =>
		monthEntry(review.timestamp).remove.push(reviewKey(review))
	);

	await Promise.all(
		[...byMonth].map(async ([month, changes]) => {
			const key = `${reviewsPrefix(userId)}${month}.json`;
			const stored = await readJson(key, { reviews: [] });
			const reviews = new Map(
				(stored.reviews || []).map((review) => [
					reviewKey(review),
					review,
				])
			);
			changes.remove.forEach((k) => reviews.delete(k));
			changes.add.forEach((review) =>
				reviews.set(reviewKey(review), review)
			);

			if (reviews.size === 0) {
				await s3Client.send(
					new DeleteObjectCommand({ Bucket: BUCKET, Key: key })
				);
				return;
			}
			const sorted = [...reviews.values()].sort(
				(a, b) => a.timestamp - b.timestamp
			);
			await s3Client.send(
				new PutObjectCommand({
					Bucket: BUCKET,
					Key: key,
					Body: JSON.stringify({ reviews: sorted }),
					ContentType: 'application/json',
				})
			);
		})
	);
}

const isValidReview = (review) =>
	review &&
	typeof review.cardId === 'string' &&
	typeof review.reviewId === 'string' &&
	Number.isFinite(review.timestamp);

// Lambda caps response payloads at 6 MB (after the body is escaped into the
// proxy envelope). Large datasets blew past that and API Gateway returned
// 500. Gzip the body - JSON compresses ~5-10x and browsers decode it
// transparently.
const gzipResponse = (jsonString) => ({
	statusCode: 200,
	headers: { ...headers, 'Content-Encoding': 'gzip' },
	isBase64Encoded: true,
	body: gzipSync(jsonString).toString('base64'),
});

async function verifyToken(authHeader) {
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		throw new Error('Missing or invalid Authorization header');
	}

	const token = authHeader.substring(7);

	try {
		const payload = await verifier.verify(token);
		return payload.sub;
	} catch (error) {
		console.error('Token verification failed:', error);
		throw new Error('Invalid token');
	}
}

export const handler = async (event) => {
	try {
		const method = event.requestContext?.http?.method || event.httpMethod;

		// Log the request line only. This used to be
		// `JSON.stringify(event, null, 2)`, which wrote every user's entire
		// flashcard dataset into CloudWatch in plaintext on every save - 894 MB
		// of it by the time it was caught. Never log the body here.
		console.log(
			`${method} ${event.requestContext?.http?.path ?? event.path ?? '?'}`
		);

		// Handle OPTIONS preflight
		if (method === 'OPTIONS') {
			console.log('Handling OPTIONS preflight request');
			return {
				statusCode: 200,
				headers,
				body: JSON.stringify({ message: 'CORS preflight successful' }),
			};
		}

		// Verify authentication for other requests
		const authHeader =
			event.headers?.authorization || event.headers?.Authorization;
		let userId;

		try {
			userId = await verifyToken(authHeader);
			console.log('Authenticated user:', userId);
		} catch (error) {
			console.error('Authentication error:', error);
			return {
				statusCode: 401,
				headers,
				body: JSON.stringify({
					error: 'Unauthorized',
					message: error.message,
				}),
			};
		}

		const key = `users/${userId}/data.json`;
		const path =
			event.requestContext?.http?.path ??
			event.rawPath ??
			event.path ??
			'';

		if (path.endsWith('/reviews')) {
			if (method === 'GET') {
				const reviews = await loadAllReviews(userId);
				return gzipResponse(JSON.stringify({ reviews }));
			}

			if (method === 'POST') {
				const { add = [], remove = [] } = JSON.parse(
					event.body || '{}'
				);
				if (
					!Array.isArray(add) ||
					!Array.isArray(remove) ||
					!add.every(isValidReview) ||
					!remove.every(isValidReview)
				) {
					return {
						statusCode: 400,
						headers,
						body: JSON.stringify({
							error: 'Each review needs cardId, reviewId and timestamp',
						}),
					};
				}
				await updateReviews(userId, add, remove);
				return {
					statusCode: 200,
					headers,
					body: JSON.stringify({
						success: true,
						added: add.length,
						removed: remove.length,
					}),
				};
			}

			return {
				statusCode: 405,
				headers,
				body: JSON.stringify({ error: 'Method not allowed' }),
			};
		}

		if (method === 'GET') {
			try {
				const command = new GetObjectCommand({
					Bucket: BUCKET,
					Key: key,
				});

				const response = await s3Client.send(command);
				const jsonString = await response.Body.transformToString();
				return gzipResponse(jsonString);
			} catch (error) {
				if (error.name === 'NoSuchKey') {
					const initialData = { folders: [], decks: [] };
					return {
						statusCode: 200,
						headers,
						body: JSON.stringify(initialData),
					};
				}
				throw error;
			}
		}

		if (method === 'POST') {
			const data = JSON.parse(event.body);

			const command = new PutObjectCommand({
				Bucket: BUCKET,
				Key: key,
				Body: JSON.stringify(data),
				ContentType: 'application/json',
			});

			await s3Client.send(command);

			return {
				statusCode: 200,
				headers,
				body: JSON.stringify({
					success: true,
					message: 'Data saved successfully',
					userId: userId,
				}),
			};
		}

		if (method === 'PATCH') {
			const patchData = JSON.parse(event.body);
			const { type, deckId, card, deck, notes } = patchData;

			// Load existing data from S3
			let existingData;
			try {
				const getCommand = new GetObjectCommand({
					Bucket: BUCKET,
					Key: key,
				});
				const response = await s3Client.send(getCommand);
				const jsonString = await response.Body.transformToString();
				existingData = JSON.parse(jsonString);
			} catch (error) {
				if (error.name === 'NoSuchKey') {
					existingData = { folders: [], decks: [] };
				} else {
					throw error;
				}
			}

			// Ensure folders and decks arrays exist
			if (!existingData.folders) {
				existingData.folders = [];
			}
			if (!existingData.decks) {
				existingData.decks = [];
			}

			const validNotes =
				notes &&
				Array.isArray(notes.upsert ?? []) &&
				Array.isArray(notes.remove ?? []) &&
				(notes.upsert ?? []).every(
					(n) => n && typeof n.noteId === 'string'
				);
			if (notes && !validNotes) {
				return {
					statusCode: 400,
					headers,
					body: JSON.stringify({ error: 'Invalid notes patch' }),
				};
			}

			// Apply patch based on type. A patch may also carry note
			// changes, alone or with a card or deck change.
			if (!type && validNotes) {
				// Notes only, applied below
			} else if (type === 'card' && deckId && card) {
				// Find the deck and update the card
				const deckIndex = existingData.decks.findIndex(
					(d) => d.deckId === deckId
				);
				if (deckIndex === -1) {
					return {
						statusCode: 404,
						headers,
						body: JSON.stringify({ error: 'Deck not found' }),
					};
				}

				const deck = existingData.decks[deckIndex];
				if (!deck.cards) {
					deck.cards = [];
				}

				// Find and replace the card
				const cardIndex = deck.cards.findIndex(
					(c) => c.cardId === card.cardId
				);
				if (cardIndex === -1) {
					// Card doesn't exist, add it
					deck.cards.push(card);
				} else {
					// Replace existing card
					deck.cards[cardIndex] = card;
				}
			} else if (type === 'deck' && deck) {
				// Find and replace the deck
				const deckIndex = existingData.decks.findIndex(
					(d) => d.deckId === deck.deckId
				);
				if (deckIndex === -1) {
					// Deck doesn't exist, add it
					existingData.decks.push(deck);
				} else {
					// Replace existing deck
					existingData.decks[deckIndex] = deck;
				}
			} else {
				return {
					statusCode: 400,
					headers,
					body: JSON.stringify({
						error: 'Invalid patch data format',
					}),
				};
			}

			if (validNotes) {
				const byId = new Map(
					(existingData.notes || []).map((n) => [n.noteId, n])
				);
				(notes.remove ?? []).forEach((id) => byId.delete(id));
				(notes.upsert ?? []).forEach((n) => byId.set(n.noteId, n));
				existingData.notes = [...byId.values()];
			}

			// Save updated data back to S3
			const putCommand = new PutObjectCommand({
				Bucket: BUCKET,
				Key: key,
				Body: JSON.stringify(existingData),
				ContentType: 'application/json',
			});

			await s3Client.send(putCommand);

			return {
				statusCode: 200,
				headers,
				body: JSON.stringify({
					success: true,
					message: 'Data patched successfully',
					userId: userId,
				}),
			};
		}

		return {
			statusCode: 405,
			headers,
			body: JSON.stringify({ error: 'Method not allowed' }),
		};
	} catch (error) {
		console.error('Error:', error);
		return {
			statusCode: 500,
			headers,
			body: JSON.stringify({
				error: 'Internal server error',
				message: error.message,
			}),
		};
	}
};
