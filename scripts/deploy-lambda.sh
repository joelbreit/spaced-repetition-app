#!/bin/bash

set -e  # Exit on error

# Configuration
FUNCTION_NAME="flashcards-api"
API_NAME="flashcards-api"
LAMBDA_BUILD_DIR="/tmp/flashcards-lambda-deploy-$$"

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LAMBDA_SOURCE_FILE="$PROJECT_ROOT/src/functions/flashcards-api/index.mjs"

echo "🚀 Deploying Lambda function from $LAMBDA_SOURCE_FILE..."
echo ""

# Check if source file exists
if [ ! -f "$LAMBDA_SOURCE_FILE" ]; then
    echo "❌ Error: Lambda source file not found: $LAMBDA_SOURCE_FILE"
    exit 1
fi

# Get environment variables from existing Lambda
echo "📋 Getting Lambda environment variables..."
ENV_VARS=$(aws lambda get-function-configuration \
    --function-name $FUNCTION_NAME \
    --query 'Environment.Variables' \
    --output json 2>/dev/null || echo '{}')

USER_POOL_ID=$(echo $ENV_VARS | jq -r '.USER_POOL_ID // empty')
CLIENT_ID=$(echo $ENV_VARS | jq -r '.CLIENT_ID // empty')
BUCKET_NAME=$(echo $ENV_VARS | jq -r '.S3_BUCKET // "spaced-rep-flashcards-data"')
# AWS_REGION is automatically set by Lambda - don't try to set it manually
AWS_REGION="us-east-1"  # Default for API Gateway endpoint construction

echo "  S3_BUCKET: $BUCKET_NAME"
echo "  AWS_REGION: $AWS_REGION (auto-set by Lambda)"
if [ -n "$USER_POOL_ID" ]; then
    echo "  USER_POOL_ID: $USER_POOL_ID"
fi
if [ -n "$CLIENT_ID" ]; then
    echo "  CLIENT_ID: $CLIENT_ID"
fi

# Create temporary build directory
echo ""
echo "📦 Building Lambda function..."
mkdir -p "$LAMBDA_BUILD_DIR"
cd "$LAMBDA_BUILD_DIR"

# Copy the Lambda code from source file
echo "  Copying Lambda code..."
cp "$LAMBDA_SOURCE_FILE" index.mjs

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

echo "  Waiting for code update to complete..."
aws lambda wait function-updated --function-name $FUNCTION_NAME

# Update Lambda configuration with environment variables
echo "  Updating Lambda configuration..."
ENV_VAR_STRING="Variables={S3_BUCKET=$BUCKET_NAME"
if [ -n "$USER_POOL_ID" ]; then
    ENV_VAR_STRING="$ENV_VAR_STRING,USER_POOL_ID=$USER_POOL_ID"
fi
if [ -n "$CLIENT_ID" ]; then
    ENV_VAR_STRING="$ENV_VAR_STRING,CLIENT_ID=$CLIENT_ID"
fi
ENV_VAR_STRING="$ENV_VAR_STRING}"

aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --environment "$ENV_VAR_STRING" \
    --timeout 30 > /dev/null

echo "  Waiting for configuration update to complete..."
aws lambda wait function-updated --function-name $FUNCTION_NAME

echo "✅ Lambda function updated"

# Go back to original directory
cd - > /dev/null

# Update API Gateway CORS to include PATCH method
echo ""
echo "🌐 Updating API Gateway CORS configuration..."

API_ID=$(aws apigatewayv2 get-apis \
    --query "Items[?Name=='$API_NAME'].ApiId" \
    --output text)

API_UPDATED=false
if [ -z "$API_ID" ]; then
    echo "⚠️  API Gateway not found. Skipping CORS update."
    echo "   You may need to add PATCH method manually to API Gateway."
else
    echo "  API ID: $API_ID"
    
    aws apigatewayv2 update-api \
        --api-id $API_ID \
        --cors-configuration '{
            "AllowOrigins": ["*"],
            "AllowMethods": ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
            "AllowHeaders": ["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key", "X-Amz-Security-Token"],
            "MaxAge": 86400,
            "AllowCredentials": false
        }' \
        --output json > /dev/null
    
    echo "✅ API Gateway CORS updated (includes PATCH method)"
    
    # Check if PATCH route exists, create if not
    echo "  Checking for PATCH route..."
    PATCH_ROUTE=$(aws apigatewayv2 get-routes \
        --api-id $API_ID \
        --query "Items[?RouteKey=='PATCH /data'].RouteId" \
        --output text)
    
    if [ -z "$PATCH_ROUTE" ]; then
        echo "  Creating PATCH route..."
        INTEGRATION_ID=$(aws apigatewayv2 get-integrations \
            --api-id $API_ID \
            --query 'Items[0].IntegrationId' \
            --output text)
        
        if [ -n "$INTEGRATION_ID" ]; then
            aws apigatewayv2 create-route \
                --api-id $API_ID \
                --route-key "PATCH /data" \
                --target "integrations/$INTEGRATION_ID" \
                --output json > /dev/null
            echo "✅ PATCH route created"
        else
            echo "⚠️  Could not find integration. PATCH route not created."
        fi
    else
        echo "✅ PATCH route already exists"
    fi
    API_UPDATED=true
fi

# Cleanup
echo ""
echo "🧹 Cleaning up..."
rm -rf "$LAMBDA_BUILD_DIR"

# Summary
echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ Deployment Complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Changes made:"
echo "  1. ✅ Updated Lambda function code from $LAMBDA_SOURCE_FILE"
echo "  2. ✅ Updated Lambda configuration"
if [ "$API_UPDATED" = true ] && [ -n "$API_ID" ]; then
    echo "  3. ✅ Updated API Gateway CORS (includes PATCH method)"
    echo "  4. ✅ Verified/created PATCH route"
    API_ENDPOINT="https://$API_ID.execute-api.$AWS_REGION.amazonaws.com/prod"
    echo ""
    echo "Your API endpoint: $API_ENDPOINT/data"
    echo ""
    echo "Test commands:"
    echo "  PATCH: curl -X PATCH $API_ENDPOINT/data \\"
    echo "    -H 'Content-Type: application/json' \\"
    echo "    -H 'Authorization: Bearer YOUR_TOKEN' \\"
    echo "    -d '{\"type\":\"card\",\"deckId\":\"...\",\"card\":{...}}'"
else
    echo "  3. ⚠️  API Gateway not found - CORS update skipped"
fi
echo ""
echo "════════════════════════════════════════════════════════════"
