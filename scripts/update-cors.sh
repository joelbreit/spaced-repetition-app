#!/bin/bash

# Get your Amplify URL
read -p "Enter your Amplify URL (e.g., https://main.d1234abcd.amplifyapp.com): " AMPLIFY_URL

FUNCTION_NAME="flashcards-api"
BUCKET_NAME="spaced-rep-flashcards-data"

echo "🌐 Updating Lambda CORS for production URL..."

# Create temporary directory for Lambda update
TEMP_DIR="/tmp/lambda-cors-update-$$"
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

# Download current Lambda function
aws lambda get-function --function-name $FUNCTION_NAME --query 'Code.Location' --output text | xargs curl -o function.zip

# Extract
unzip -q function.zip

# Update CORS in index.mjs
sed -i.bak "s|'Access-Control-Allow-Origin': '\*'|'Access-Control-Allow-Origin': '$AMPLIFY_URL'|g" index.mjs

# Repackage
zip -qr function.zip index.mjs package.json node_modules/

# Upload
aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://function.zip \
    > /dev/null

# Cleanup
cd - > /dev/null
rm -rf "$TEMP_DIR"

echo "✅ CORS updated to allow: $AMPLIFY_URL"