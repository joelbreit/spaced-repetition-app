#!/bin/bash

set -e

# Configuration
REGION="us-east-1"
USER_POOL_NAME="flashcards-users"
CLIENT_NAME="flashcards-web-client"
BUCKET_NAME="spaced-rep-flashcards-data"
FUNCTION_NAME="flashcards-api"
API_NAME="flashcards-api"
LAMBDA_BUILD_DIR="/tmp/flashcards-lambda-build-$$"

echo "🚀 Setting up AWS Cognito authentication..."

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "📋 AWS Account ID: $ACCOUNT_ID"

# ============================================
# 1. Create Cognito User Pool
# ============================================
echo ""
echo "👥 Creating Cognito User Pool..."

USER_POOL_ID=$(aws cognito-idp list-user-pools --max-results 60 \
    --query "UserPools[?Name=='$USER_POOL_NAME'].Id" \
    --output text)

if [ -z "$USER_POOL_ID" ]; then
    echo "Creating new user pool..."
    
    USER_POOL_ID=$(aws cognito-idp create-user-pool \
        --pool-name $USER_POOL_NAME \
        --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=false,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}" \
        --auto-verified-attributes email \
        --username-attributes email \
        --mfa-configuration OFF \
        --email-configuration EmailSendingAccount=COGNITO_DEFAULT \
        --schema \
            Name=email,Required=true,Mutable=false \
        --query 'UserPool.Id' \
        --output text)
    
    echo "✅ User Pool created: $USER_POOL_ID"
else
    echo "✅ User Pool already exists: $USER_POOL_ID"
fi

# ============================================
# 2. Create User Pool Client
# ============================================
echo ""
echo "📱 Creating User Pool Client..."

CLIENT_ID=$(aws cognito-idp list-user-pool-clients \
    --user-pool-id $USER_POOL_ID \
    --query "UserPoolClients[?ClientName=='$CLIENT_NAME'].ClientId" \
    --output text)

if [ -z "$CLIENT_ID" ]; then
    echo "Creating new client..."
    
    CLIENT_ID=$(aws cognito-idp create-user-pool-client \
        --user-pool-id $USER_POOL_ID \
        --client-name $CLIENT_NAME \
        --explicit-auth-flows \
            ALLOW_USER_PASSWORD_AUTH \
            ALLOW_REFRESH_TOKEN_AUTH \
            ALLOW_USER_SRP_AUTH \
        --read-attributes email \
        --write-attributes email \
        --query 'UserPoolClient.ClientId' \
        --output text)
    
    echo "✅ Client created: $CLIENT_ID"
else
    echo "✅ Client already exists: $CLIENT_ID"
fi

# ============================================
# 3. Build Lambda Function in Temp Directory
# ============================================
echo ""
echo "⚡ Building Lambda function with authentication..."

# Create temporary build directory
mkdir -p "$LAMBDA_BUILD_DIR"
cd "$LAMBDA_BUILD_DIR"

# Create Lambda function code
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
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
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
        if (event.requestContext.http.method === 'OPTIONS') {
            return {
                statusCode: 200,
                headers,
                body: ''
            };
        }
        
        const authHeader = event.headers.authorization || event.headers.Authorization;
        let userId;
        
        try {
            userId = await verifyToken(authHeader);
        } catch (error) {
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
        
        if (event.requestContext.http.method === 'GET') {
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
        
        if (event.requestContext.http.method === 'POST') {
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

# Create package.json in temp directory
cat > package.json << 'PKGJSON'
{
  "type": "module",
  "dependencies": {
    "@aws-sdk/client-s3": "^3.0.0",
    "aws-jwt-verify": "^4.0.0"
  }
}
PKGJSON

echo "📦 Installing Lambda dependencies in temporary directory..."
npm install --production --silent

# Create deployment package
echo "📦 Creating deployment package..."
zip -qr function.zip index.mjs package.json node_modules/

# Go back to original directory
cd - > /dev/null

# Update Lambda function
echo "⚡ Updating Lambda function..."
aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://$LAMBDA_BUILD_DIR/function.zip > /dev/null

# Wait for code update to complete before updating configuration
echo "⏳ Waiting for code update to complete..."
aws lambda wait function-updated --function-name $FUNCTION_NAME

aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --environment "Variables={S3_BUCKET=$BUCKET_NAME,USER_POOL_ID=$USER_POOL_ID,CLIENT_ID=$CLIENT_ID}" \
    --timeout 30 > /dev/null

echo "✅ Lambda function updated"

echo "⏳ Waiting for configuration update to complete..."
aws lambda wait function-updated --function-name $FUNCTION_NAME

# Cleanup temp directory
echo "🧹 Cleaning up temporary build directory..."
rm -rf "$LAMBDA_BUILD_DIR"

# ============================================
# 4. Update API Gateway
# ============================================
echo ""
echo "🌐 Verifying API Gateway..."

API_ID=$(aws apigatewayv2 get-apis \
    --query "Items[?Name=='$API_NAME'].ApiId" \
    --output text)

if [ -n "$API_ID" ]; then
    echo "✅ API Gateway configured: $API_ID"
else
    echo "❌ API Gateway not found. Please run setup-lambda-api.sh first."
    exit 1
fi

# ============================================
# 5. Create .env.local
# ============================================
STAGE_NAME="prod"
API_ENDPOINT="https://$API_ID.execute-api.$REGION.amazonaws.com/$STAGE_NAME"

echo ""
echo "📝 Updating .env.local file..."

cat > .env.local << EOF
VITE_API_ENDPOINT=$API_ENDPOINT
VITE_COGNITO_USER_POOL_ID=$USER_POOL_ID
VITE_COGNITO_CLIENT_ID=$CLIENT_ID
VITE_COGNITO_REGION=$REGION
EOF

echo "✅ .env.local updated"

# ============================================
# 6. Create test user
# ============================================
echo ""
echo "👤 Creating test user..."

aws cognito-idp admin-create-user \
    --user-pool-id $USER_POOL_ID \
    --username test@example.com \
    --user-attributes Name=email,Value=test@example.com Name=email_verified,Value=true \
    --temporary-password TempPass123! \
    --message-action SUPPRESS \
    2>/dev/null || echo "   (User might already exist)"

aws cognito-idp admin-set-user-password \
    --user-pool-id $USER_POOL_ID \
    --username test@example.com \
    --password Test1234 \
    --permanent \
    2>/dev/null || echo "   (Password already set)"

echo "✅ Test user ready"

# ============================================
# 7. Summary
# ============================================
echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ Cognito Authentication Setup Complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📋 Cognito Resources:"
echo "  • User Pool ID: $USER_POOL_ID"
echo "  • Client ID: $CLIENT_ID"
echo "  • Region: $REGION"
echo ""
echo "🌐 API Endpoint:"
echo "  $API_ENDPOINT/data"
echo ""
echo "👤 Test User Credentials:"
echo "  Email: test@example.com"
echo "  Password: Test1234"
echo ""
echo "📁 Environment file updated: .env.local"
echo ""
echo "🚀 Next Steps:"
echo "  1. Install AWS Amplify: npm install aws-amplify"
echo "  2. Update your app with authentication UI"
echo "  3. Run: npm run dev"
echo "  4. Login with test@example.com / Test1234"
echo ""
echo "📝 Create New Users:"
echo "  aws cognito-idp sign-up \\"
echo "    --client-id $CLIENT_ID \\"
echo "    --username user@example.com \\"
echo "    --password YourPassword123 \\"
echo "    --user-attributes Name=email,Value=user@example.com"
echo ""
echo "════════════════════════════════════════════════════════════"