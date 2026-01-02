#!/bin/bash
set -e

FUNCTION_NAME="flashcards-read-aloud"
HANDLER="index.handler"
RUNTIME="nodejs20.x"
FUNCTION_DIR="src/functions/${FUNCTION_NAME}"
TEMP_DIR="/tmp/${FUNCTION_NAME}"

echo "Setting up ${FUNCTION_NAME} Lambda function..."

# Get AWS account ID and region
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region)
REGION=${REGION:-us-east-1}

echo "Account ID: ${ACCOUNT_ID}"
echo "Region: ${REGION}"

# Create IAM role for Lambda if it doesn't exist
ROLE_NAME="${FUNCTION_NAME}-role"
echo "Checking if role ${ROLE_NAME} exists..."

if aws iam get-role --role-name ${ROLE_NAME} 2>/dev/null; then
  echo "Role ${ROLE_NAME} already exists"
else
  echo "Creating role ${ROLE_NAME}..."
  
  # Create trust policy
  cat > /tmp/trust-policy.json <<EOF
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

  aws iam create-role \
    --role-name ${ROLE_NAME} \
    --assume-role-policy-document file:///tmp/trust-policy.json

  echo "Attaching basic Lambda execution policy..."
  aws iam attach-role-policy \
    --role-name ${ROLE_NAME} \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
fi

# Create/update Polly permissions policy
POLICY_NAME="${FUNCTION_NAME}-polly-policy"
POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}"

echo "Creating/updating Polly permissions policy..."

cat > /tmp/polly-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "polly:SynthesizeSpeech"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Check if policy exists
if aws iam get-policy --policy-arn ${POLICY_ARN} 2>/dev/null; then
  echo "Policy exists, creating new version..."
  aws iam create-policy-version \
    --policy-arn ${POLICY_ARN} \
    --policy-document file:///tmp/polly-policy.json \
    --set-as-default
else
  echo "Creating new policy..."
  aws iam create-policy \
    --policy-name ${POLICY_NAME} \
    --policy-document file:///tmp/polly-policy.json
fi

# Attach policy to role
echo "Attaching Polly policy to role..."
aws iam attach-role-policy \
  --role-name ${ROLE_NAME} \
  --policy-arn ${POLICY_ARN} || echo "Policy already attached"

# Wait for role to be ready
echo "Waiting for IAM role to propagate..."
sleep 10

# Create deployment package
echo "Creating deployment package..."
rm -rf ${TEMP_DIR}
mkdir -p ${TEMP_DIR}

# Copy function code
cp ${FUNCTION_DIR}/index.mjs ${TEMP_DIR}/

# Create package.json
cat > ${TEMP_DIR}/package.json <<EOF
{
  "name": "${FUNCTION_NAME}",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@aws-sdk/client-polly": "^3.709.0"
  }
}
EOF

# Install dependencies
echo "Installing dependencies..."
cd ${TEMP_DIR}
npm install --production

# Create ZIP file
echo "Creating deployment package..."
zip -r function.zip . > /dev/null

# Create or update Lambda function
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

if aws lambda get-function --function-name ${FUNCTION_NAME} 2>/dev/null; then
  echo "Updating existing Lambda function..."
  aws lambda update-function-code \
    --function-name ${FUNCTION_NAME} \
    --zip-file fileb://function.zip

  aws lambda update-function-configuration \
    --function-name ${FUNCTION_NAME} \
    --runtime ${RUNTIME} \
    --handler ${HANDLER} \
    --role ${ROLE_ARN} \
    --timeout 30 \
    --memory-size 256
else
  echo "Creating new Lambda function..."
  aws lambda create-function \
    --function-name ${FUNCTION_NAME} \
    --runtime ${RUNTIME} \
    --role ${ROLE_ARN} \
    --handler ${HANDLER} \
    --zip-file fileb://function.zip \
    --timeout 30 \
    --memory-size 256
fi

# Clean up
rm -rf ${TEMP_DIR}
rm -f /tmp/trust-policy.json /tmp/polly-policy.json

echo ""
echo "✅ ${FUNCTION_NAME} Lambda function setup complete!"
echo ""
echo "Next steps:"
echo "1. Add API Gateway endpoint for this function"
echo "2. Configure CORS if needed"
echo "3. Test the function"
echo ""
echo "Function ARN: arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FUNCTION_NAME}"
