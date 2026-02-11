import {
	S3Client,
	GetObjectCommand,
	PutObjectCommand,
} from '@aws-sdk/client-s3';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

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
	console.log('Event:', JSON.stringify(event, null, 2));

	try {
		const method = event.requestContext?.http?.method || event.httpMethod;

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

		if (method === 'GET') {
			try {
				const command = new GetObjectCommand({
					Bucket: BUCKET,
					Key: key,
				});

				const response = await s3Client.send(command);
				const jsonString = await response.Body.transformToString();

				return {
					statusCode: 200,
					headers,
					body: jsonString,
				};
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
				Body: JSON.stringify(data, null, 2),
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
			const { type, deckId, card, deck } = patchData;

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

			// Apply patch based on type
			if (type === 'card' && deckId && card) {
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

			// Save updated data back to S3
			const putCommand = new PutObjectCommand({
				Bucket: BUCKET,
				Key: key,
				Body: JSON.stringify(existingData, null, 2),
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
