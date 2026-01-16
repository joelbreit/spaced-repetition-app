# AGENTS.md - AWS Lambda Functions

## Overview

This directory contains the source code for AWS Lambda functions. These are deployed separately from the frontend using the scripts in `/scripts/`.

## Functions

### `flashcards-api/index.mjs`

Main data API for CRUD operations on flashcard data.

**Endpoints**:
| Method  | Path    | Description                       |
| ------- | ------- | --------------------------------- |
| GET     | `/data` | Load user's flashcard data        |
| POST    | `/data` | Save full dataset (overwrites)    |
| PATCH   | `/data` | Incremental update (card or deck) |
| OPTIONS | `/data` | CORS preflight                    |

**Authentication**: All requests (except OPTIONS) require a valid Cognito JWT in the `Authorization: Bearer <token>` header.

**Data Storage**: S3 bucket at path `users/{userId}/data.json`

**PATCH Request Format**:
```json
// Card-level patch
{
  "type": "card",
  "deckId": "deck-uuid",
  "card": { /* full card object */ }
}

// Deck-level patch  
{
  "type": "deck",
  "deck": { /* full deck object */ }
}
```

**Environment Variables**:
- `S3_BUCKET`: S3 bucket name
- `USER_POOL_ID`: Cognito User Pool ID
- `CLIENT_ID`: Cognito App Client ID
- `AWS_REGION`: AWS region

**Dependencies** (bundled in deployment):
- `@aws-sdk/client-s3`
- `aws-jwt-verify`

### `flashcards-read-aloud/index.mjs`

Text-to-speech API using AWS Polly.

**Endpoint**:
| Method | Path          | Description            |
| ------ | ------------- | ---------------------- |
| POST   | `/read-aloud` | Convert text to speech |

**Request Format**:
```json
{
  "text": "Text to speak",
  "VoiceId": "Ruth",
  "Engine": "generative"
}
```

**Response**: Audio stream (`audio/mpeg`)

**No authentication required** - endpoint is public.

**Environment Variables**:
- `AWS_REGION`: AWS region

**Dependencies** (bundled in deployment):
- `@aws-sdk/client-polly`

## Deployment

Use the deployment scripts from the project root:

```bash
# Deploy all Lambda functions
./scripts/deploy-lambdas.sh

# Deploy specific Lambda
./scripts/deploy-lambda.sh flashcards-api
./scripts/deploy-lambda.sh flashcards-read-aloud
```

The deployment scripts:
1. Install dependencies in the function directory
2. Create a ZIP archive
3. Upload to AWS Lambda
4. Clean up local files

## Local Development

Lambda functions are Node.js ES modules. To test locally:

```bash
cd src/functions/flashcards-api
npm install
# Then use AWS SAM or invoke manually with test events
```

## CORS Configuration

Both functions return these headers:
```javascript
{
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,...',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json'
}
```

## Error Responses

Standard error format:
```json
{
  "error": "Error type",
  "message": "Detailed message"
}
```

HTTP status codes:
- `200`: Success
- `400`: Bad request (invalid patch format)
- `401`: Unauthorized (invalid/missing token)
- `404`: Not found (deck not found for PATCH)
- `405`: Method not allowed
- `500`: Internal server error

## Token Verification

The `flashcards-api` function verifies Cognito JWTs using `aws-jwt-verify`:
```javascript
const verifier = CognitoJwtVerifier.create({
  userPoolId: USER_POOL_ID,
  tokenUse: 'access',
  clientId: CLIENT_ID,
});

const payload = await verifier.verify(token);
const userId = payload.sub;  // User's unique ID
```

## S3 Data Structure

Each user's data is stored at:
```
s3://spaced-rep-flashcards-data/users/{cognito-user-id}/data.json
```

If no data exists for a user, GET returns:
```json
{ "folders": [], "decks": [] }
```

## Cost Considerations

- **Lambda**: First 1M requests/month free, then $0.20/1M
- **Polly (Generative)**: $30 per 1M characters
- **S3**: Minimal for JSON storage (~$0.02-0.05/month)
- **API Gateway**: First 1M requests/month free

The read-aloud function logs estimated Polly cost per request:
```javascript
const dollars = text.length / 1000000 * 30;
console.log('Estimated cost: $', dollars.toFixed(4));
```

## Modifying Functions

1. Edit the source in `src/functions/{function-name}/index.mjs`
2. Test locally if possible
3. Deploy using the scripts
4. Monitor CloudWatch logs for errors

### Adding a New Endpoint

For the main API, add a new method handler:
```javascript
if (method === 'DELETE') {
  // Handle delete logic
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  };
}
```

Update CORS headers if new methods are added.

### Adding a New Lambda

1. Create directory: `src/functions/new-function/`
2. Create `index.mjs` with handler export
3. Create `package.json` with dependencies
4. Add to deployment scripts
5. Configure API Gateway route (via AWS console or scripts)




