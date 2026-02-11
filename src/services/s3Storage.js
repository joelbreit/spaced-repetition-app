import {
	S3Client,
	GetObjectCommand,
	PutObjectCommand,
} from '@aws-sdk/client-s3';

// Validate required environment variables
const AWS_REGION = import.meta.env.VITE_AWS_REGION || 'us-east-1';
const AWS_ACCESS_KEY_ID = import.meta.env.VITE_AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;
const BUCKET = import.meta.env.VITE_S3_BUCKET;

// Check if S3 is properly configured
const isS3Configured = () => {
	if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !BUCKET) {
		return false;
	}
	return true;
};

// Create S3 client only if properly configured
let s3Client = null;
if (isS3Configured()) {
	s3Client = new S3Client({
		region: AWS_REGION,
		credentials: {
			accessKeyId: AWS_ACCESS_KEY_ID,
			secretAccessKey: AWS_SECRET_ACCESS_KEY,
		},
	});
}

const KEY = 'flashcards-data.json';

export async function loadFromS3() {
	if (!isS3Configured()) {
		throw new Error(
			'S3 is not configured. Please set up your AWS environment variables in .env.local file. Missing: ' +
				[
					!AWS_ACCESS_KEY_ID && 'VITE_AWS_ACCESS_KEY_ID',
					!AWS_SECRET_ACCESS_KEY && 'VITE_AWS_SECRET_ACCESS_KEY',
					!BUCKET && 'VITE_S3_BUCKET',
				]
					.filter(Boolean)
					.join(', ')
		);
	}

	try {
		const command = new GetObjectCommand({
			Bucket: BUCKET,
			Key: KEY,
		});

		const response = await s3Client.send(command);
		const jsonString = await response.Body.transformToString();
		return JSON.parse(jsonString);
	} catch (error) {
		if (error.name === 'NoSuchKey') {
			// File doesn't exist yet, return initial data
			return null;
		}
		throw error;
	}
}

export async function saveToS3(data) {
	if (!isS3Configured()) {
		throw new Error(
			'S3 is not configured. Please set up your AWS environment variables in .env.local file. Missing: ' +
				[
					!AWS_ACCESS_KEY_ID && 'VITE_AWS_ACCESS_KEY_ID',
					!AWS_SECRET_ACCESS_KEY && 'VITE_AWS_SECRET_ACCESS_KEY',
					!BUCKET && 'VITE_S3_BUCKET',
				]
					.filter(Boolean)
					.join(', ')
		);
	}

	const command = new PutObjectCommand({
		Bucket: BUCKET,
		Key: KEY,
		Body: JSON.stringify(data, null, 2),
		ContentType: 'application/json',
	});

	await s3Client.send(command);
}
