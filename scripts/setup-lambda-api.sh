#!/bin/bash

set -e  # Exit on error

# Configuration
BUCKET_NAME="spaced-rep-flashcards-data"
REGION="us-east-1"
FUNCTION_NAME="flashcards-api"
API_NAME="flashcards-api"
STAGE_NAME="prod"

echo "🚀 Setting up AWS Lambda + API Gateway for Flashcards app..."

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "📋 AWS Account ID: $ACCOUNT_ID"

# ============================================
# 1. Create S3 Bucket (if not exists)
# ============================================
echo ""
echo "📦 Setting up S3 bucket: $BUCKET_NAME"

if aws s3 ls "s3://$BUCKET_NAME" 2>&1 | grep -q 'NoSuchBucket'; then
    aws s3api create-bucket \
        --bucket $BUCKET_NAME \
        --region $REGION
    
    aws s3api put-bucket-versioning \
        --bucket $BUCKET_NAME \
        --versioning-configuration Status=Enabled
    
    echo "✅ Bucket created"
else
    echo "✅ Bucket already exists"
fi

# ============================================
# 2. Create IAM Role for Lambda
# ============================================
echo ""
echo "👤 Creating IAM role for Lambda..."

# Trust policy for Lambda
cat > trust-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "lambda.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

# Create role
ROLE_NAME="flashcards-lambda-role"
aws iam create-role \
    --role-name $ROLE_NAME \
    --assume-role-policy-document file://trust-policy.json \
    2>/dev/null || echo "Role already exists"

ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME"

# Attach basic Lambda execution policy
aws iam attach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
    2>/dev/null || echo "Policy already attached"

# Create custom S3 access policy
cat > s3-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::$BUCKET_NAME"
        }
    ]
}
EOF

# Create and attach S3 policy
S3_POLICY_NAME="flashcards-s3-access"
S3_POLICY_ARN=$(aws iam create-policy \
    --policy-name $S3_POLICY_NAME \
    --policy-document file://s3-policy.json \
    --query 'Policy.Arn' \
    --output text 2>/dev/null) || S3_POLICY_ARN="arn:aws:iam::$ACCOUNT_ID:policy/$S3_POLICY_NAME"

aws iam attach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn $S3_POLICY_ARN \
    2>/dev/null || echo "S3 policy already attached"

echo "✅ IAM role configured"
echo "⏳ Waiting 10 seconds for IAM role to propagate..."
sleep 10

# ============================================
# 3. Create Lambda Function
# ============================================
echo ""
echo "⚡ Creating Lambda function..."

# Create the Lambda function code
cat > index.mjs << 'LAMBDAEOF'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.S3_BUCKET;
const KEY = 'flashcards-data.json';

export const handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Content-Type': 'application/json'
    };
    
    try {
        // Handle OPTIONS request for CORS
        if (event.requestContext.http.method === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: ''
            };
        }
        
        // GET - Retrieve flashcard data
        if (event.requestContext.http.method === 'GET') {
            try {
                const command = new GetObjectCommand({
                    Bucket: BUCKET,
                    Key: KEY
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
                    // Return empty initial data if file doesn't exist
                    const initialData = {
                        decks: []
                    };
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify(initialData)
                    };
                }
                throw error;
            }
        }
        
        // POST - Save flashcard data
        if (event.requestContext.http.method === 'POST') {
            const data = JSON.parse(event.body);
            
            const command = new PutObjectCommand({
                Bucket: BUCKET,
                Key: KEY,
                Body: JSON.stringify(data, null, 2),
                ContentType: 'application/json'
            });
            
            await s3Client.send(command);
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    success: true,
                    message: 'Data saved successfully'
                })
            };
        }
        
        // Method not allowed
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

# Create deployment package
echo "📦 Creating deployment package..."
zip -q function.zip index.mjs

# Create or update Lambda function
if aws lambda get-function --function-name $FUNCTION_NAME 2>/dev/null; then
    echo "📝 Updating existing Lambda function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://function.zip
    
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --environment "Variables={S3_BUCKET=$BUCKET_NAME}"
else
    echo "📝 Creating new Lambda function..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime nodejs20.x \
        --role $ROLE_ARN \
        --handler index.handler \
        --zip-file fileb://function.zip \
        --timeout 30 \
        --memory-size 256 \
        --environment "Variables={S3_BUCKET=$BUCKET_NAME}"
fi

echo "✅ Lambda function created/updated"

# ============================================
# 4. Create API Gateway (HTTP API)
# ============================================
echo ""
echo "🌐 Setting up API Gateway..."

# Check if API already exists
API_ID=$(aws apigatewayv2 get-apis \
    --query "Items[?Name=='$API_NAME'].ApiId" \
    --output text)

if [ -z "$API_ID" ]; then
    echo "Creating new API..."
    API_ID=$(aws apigatewayv2 create-api \
        --name $API_NAME \
        --protocol-type HTTP \
        --cors-configuration AllowOrigins="*",AllowMethods="GET,POST,OPTIONS",AllowHeaders="Content-Type" \
        --query 'ApiId' \
        --output text)
    echo "✅ API created: $API_ID"
else
    echo "✅ API already exists: $API_ID"
fi

# Create integration
INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id $API_ID \
    --integration-type AWS_PROXY \
    --integration-uri "arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$FUNCTION_NAME" \
    --payload-format-version 2.0 \
    --query 'IntegrationId' \
    --output text)

echo "✅ Integration created: $INTEGRATION_ID"

# Create routes
for METHOD in GET POST OPTIONS; do
    aws apigatewayv2 create-route \
        --api-id $API_ID \
        --route-key "$METHOD /data" \
        --target "integrations/$INTEGRATION_ID" \
        2>/dev/null || echo "Route $METHOD /data already exists"
done

echo "✅ Routes created"

# Create stage (deployment)
aws apigatewayv2 create-stage \
    --api-id $API_ID \
    --stage-name $STAGE_NAME \
    --auto-deploy \
    2>/dev/null || echo "Stage already exists"

echo "✅ Stage created"

# ============================================
# 5. Grant API Gateway permission to invoke Lambda
# ============================================
echo ""
echo "🔑 Configuring Lambda permissions..."

aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id apigateway-access \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/*/data" \
    2>/dev/null || echo "Permission already exists"

echo "✅ Permissions configured"

# ============================================
# 6. Get API endpoint
# ============================================
echo ""
API_ENDPOINT="https://$API_ID.execute-api.$REGION.amazonaws.com/$STAGE_NAME"

echo "✅ API Gateway endpoint: $API_ENDPOINT"

# ============================================
# 7. Create .env.local file
# ============================================
echo ""
echo "📝 Creating .env.local file..."

cat > .env.local << EOF
VITE_API_ENDPOINT=$API_ENDPOINT
EOF

echo "✅ .env.local created"

# ============================================
# 8. Test the API
# ============================================
echo ""
echo "🧪 Testing API..."

# Test GET
echo "Testing GET /data..."
curl -s "$API_ENDPOINT/data" | jq . || echo "Failed to parse response"

# Test POST
echo ""
echo "Testing POST /data..."
curl -s -X POST "$API_ENDPOINT/data" \
    -H "Content-Type: application/json" \
    -d '{"decks":[{"deckId":"test","deckName":"Test Deck","cards":[]}]}' \
    | jq . || echo "Failed to parse response"

# ============================================
# 9. Cleanup temporary files
# ============================================
echo ""
echo "🧹 Cleaning up temporary files..."
rm -f trust-policy.json s3-policy.json index.mjs function.zip

# ============================================
# 10. Summary
# ============================================
echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ Setup Complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📋 Resources Created:"
echo "  • S3 Bucket: $BUCKET_NAME"
echo "  • Lambda Function: $FUNCTION_NAME"
echo "  • API Gateway: $API_NAME ($API_ID)"
echo "  • IAM Role: $ROLE_NAME"
echo ""
echo "🌐 API Endpoint:"
echo "  $API_ENDPOINT/data"
echo ""
echo "📁 Environment file created: .env.local"
echo ""
echo "🚀 Next Steps:"
echo "  1. Run: npm install"
echo "  2. Update your app to use the API (see instructions below)"
echo "  3. Run: npm run dev"
echo ""
echo "🧪 Test your API:"
echo "  GET:  curl $API_ENDPOINT/data"
echo "  POST: curl -X POST $API_ENDPOINT/data -H 'Content-Type: application/json' -d '{\"decks\":[]}'"
echo ""
echo "════════════════════════════════════════════════════════════"