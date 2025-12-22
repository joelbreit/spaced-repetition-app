#!/bin/bash

set -e

FUNCTION_NAME="flashcards-api"
API_NAME="flashcards-api"
BUCKET_NAME="spaced-rep-flashcards-data"
LAMBDA_BUILD_DIR="/tmp/flashcards-lambda-fix-$$"

echo "🔧 Fixing OPTIONS request handling..."
echo ""

# Get environment variables from existing Lambda
echo "📋 Getting Lambda environment variables..."
ENV_VARS=$(aws lambda get-function-configuration \
    --function-name $FUNCTION_NAME \
    --query 'Environment.Variables' \
    --output json)

USER_POOL_ID=$(echo $ENV_VARS | jq -r '.USER_POOL_ID')
CLIENT_ID=$(echo $ENV_VARS | jq -r '.CLIENT_ID')

echo "  USER_POOL_ID: $USER_POOL_ID"
echo "  CLIENT_ID: $CLIENT_ID"
echo "  BUCKET: $BUCKET_NAME"

# Create temporary build directory
echo ""
echo "📦 Building Lambda function..."
mkdir -p "$LAMBDA_BUILD_DIR"
cd "$LAMBDA_BUILD_DIR"

# Copy the fixed Lambda code
cat > index.mjs << 'LAMBDAEOF'
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
LAMBDAEOF

# Create package.json
cat > package.json << 'PKGJSON'
{
  "type": "module",
  "dependencies": {
    "@aws-sdk/client-s3": "^3.0.0",
    "aws-jwt-verify": "^4.0.0"
  }
}
PKGJSON

echo "  Installing dependencies..."
npm install --production --silent

echo "  Creating deployment package..."
zip -qr function.zip index.mjs package.json node_modules/

# Update Lambda function
echo ""
echo "⚡ Updating Lambda function..."
aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://function.zip > /dev/null

echo "  Waiting for update..."
aws lambda wait function-updated --function-name $FUNCTION_NAME

echo "✅ Lambda function updated"

# Go back
cd - > /dev/null

# Update API Gateway CORS
echo ""
echo "🌐 Updating API Gateway CORS..."

API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='$API_NAME'].ApiId" --output text)

if [ -z "$API_ID" ]; then
    echo "❌ API not found!"
    exit 1
fi

echo "  API ID: $API_ID"

aws apigatewayv2 update-api \
    --api-id $API_ID \
    --cors-configuration '{
        "AllowOrigins": ["*"],
        "AllowMethods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "AllowHeaders": ["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key", "X-Amz-Security-Token"],
        "MaxAge": 86400,
        "AllowCredentials": false
    }' \
    --output json > /dev/null

echo "✅ API Gateway CORS updated"

# Cleanup
echo ""
echo "🧹 Cleaning up..."
rm -rf "$LAMBDA_BUILD_DIR"

# Test
echo ""
echo "🧪 Testing OPTIONS request..."
API_ENDPOINT="https://$API_ID.execute-api.us-east-1.amazonaws.com/prod"

echo ""
echo "Testing: curl -X OPTIONS $API_ENDPOINT/data"
curl -X OPTIONS "$API_ENDPOINT/data" -v 2>&1 | grep -E "(< HTTP|< Access-Control|CORS)"

echo ""
echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ Fix Complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Changes made:"
echo "  1. ✅ Updated Lambda function to properly handle OPTIONS"
echo "  2. ✅ Enhanced CORS headers in Lambda response"
echo "  3. ✅ Updated API Gateway CORS configuration"
echo ""
echo "Your API endpoint: $API_ENDPOINT/data"
echo ""
echo "Test commands:"
echo "  OPTIONS: curl -X OPTIONS $API_ENDPOINT/data -v"
echo "  GET: curl $API_ENDPOINT/data -H 'Authorization: Bearer YOUR_TOKEN'"
echo ""
echo "════════════════════════════════════════════════════════════"