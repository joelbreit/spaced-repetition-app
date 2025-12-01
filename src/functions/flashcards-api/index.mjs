import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
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
	'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
	'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
	'Access-Control-Max-Age': '86400',
	'Content-Type': 'application/json'
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
				body: JSON.stringify({ message: 'CORS preflight successful' })
			};
		}

		// Verify authentication for other requests
		const authHeader = event.headers?.authorization || event.headers?.Authorization;
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
					message: error.message
				})
			};
		}

		const key = `users/${userId}/data.json`;

		if (method === 'GET') {
			try {
				const command = new GetObjectCommand({
					Bucket: BUCKET,
					Key: key
				});

				const response = await s3Client.send(command);
				const jsonString = await response.Body.transformToString();

				return {
					statusCode: 200,
					headers,
					body: jsonString
				};
			} catch (error) {
				if (error.name === 'NoSuchKey') {
					const initialData = { decks: [] };
					return {
						statusCode: 200,
						headers,
						body: JSON.stringify(initialData)
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
				ContentType: 'application/json'
			});

			await s3Client.send(command);

			return {
				statusCode: 200,
				headers,
				body: JSON.stringify({
					success: true,
					message: 'Data saved successfully',
					userId: userId
				})
			};
		}

		return {
			statusCode: 405,
			headers,
			body: JSON.stringify({ error: 'Method not allowed' })
		};

	} catch (error) {
		console.error('Error:', error);
		return {
			statusCode: 500,
			headers,
			body: JSON.stringify({
				error: 'Internal server error',
				message: error.message
			})
		};
	}
};
