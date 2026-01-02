#!/bin/bash
set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
FUNCTIONS_DIR="src/functions"
TEMP_BASE_DIR="/tmp/lambda-deployments"

echo "🚀 Deploying all Lambda functions..."
echo ""

# Get AWS account ID and region
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region)
REGION=${REGION:-us-east-1}

echo "Account ID: ${ACCOUNT_ID}"
echo "Region: ${REGION}"
echo ""

# Find all Lambda functions (directories with index.mjs or index.js)
FUNCTIONS=($(find ${FUNCTIONS_DIR} -maxdepth 1 -type d -exec test -e '{}/index.mjs' -o -e '{}/index.js' \; -print | xargs -n1 basename))

if [ ${#FUNCTIONS[@]} -eq 0 ]; then
  echo -e "${RED}❌ No Lambda functions found in ${FUNCTIONS_DIR}${NC}"
  exit 1
fi

echo "Found ${#FUNCTIONS[@]} Lambda function(s):"
for func in "${FUNCTIONS[@]}"; do
  echo "  - ${func}"
done
echo ""

# Function to deploy a single Lambda
deploy_function() {
  local FUNCTION_NAME=$1
  local FUNCTION_DIR="${FUNCTIONS_DIR}/${FUNCTION_NAME}"
  local TEMP_DIR="${TEMP_BASE_DIR}/${FUNCTION_NAME}"
  
  echo -e "${YELLOW}📦 Deploying ${FUNCTION_NAME}...${NC}"
  
  # Determine if it's ESM or CommonJS
  if [ -f "${FUNCTION_DIR}/index.mjs" ]; then
    HANDLER="index.handler"
    MAIN_FILE="index.mjs"
  else
    HANDLER="index.handler"
    MAIN_FILE="index.js"
  fi
  
  # Clean and create temp directory
  rm -rf ${TEMP_DIR}
  mkdir -p ${TEMP_DIR}
  
  # Copy function code
  cp ${FUNCTION_DIR}/${MAIN_FILE} ${TEMP_DIR}/
  
  # Copy package.json if it exists, otherwise check if we need to create one
  if [ -f "${FUNCTION_DIR}/package.json" ]; then
    cp ${FUNCTION_DIR}/package.json ${TEMP_DIR}/
    
    # Install dependencies
    echo "  Installing dependencies..."
    cd ${TEMP_DIR}
    npm install --production --silent
  elif grep -q '@aws-sdk' ${FUNCTION_DIR}/${MAIN_FILE}; then
    # If function uses AWS SDK but has no package.json, create one
    echo "  Creating package.json for AWS SDK dependencies..."
    
    # Detect which AWS SDK packages are needed
    DEPENDENCIES=""
    if grep -q '@aws-sdk/client-s3' ${FUNCTION_DIR}/${MAIN_FILE}; then
      DEPENDENCIES="${DEPENDENCIES}\"@aws-sdk/client-s3\": \"^3.709.0\","
    fi
    if grep -q '@aws-sdk/client-polly' ${FUNCTION_DIR}/${MAIN_FILE}; then
      DEPENDENCIES="${DEPENDENCIES}\"@aws-sdk/client-polly\": \"^3.709.0\","
    fi
    
    # Remove trailing comma
    DEPENDENCIES=${DEPENDENCIES%,}
    
    cat > ${TEMP_DIR}/package.json <<EOF
{
  "name": "${FUNCTION_NAME}",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    ${DEPENDENCIES}
  }
}
EOF
    
    cd ${TEMP_DIR}
    npm install --production --silent
  fi
  
  # Create ZIP file
  cd ${TEMP_DIR}
  zip -r function.zip . > /dev/null 2>&1
  
  # Check if function exists
  if aws lambda get-function --function-name ${FUNCTION_NAME} 2>/dev/null >/dev/null; then
    echo "  Updating function code..."
    aws lambda update-function-code \
      --function-name ${FUNCTION_NAME} \
      --zip-file fileb://function.zip \
      --no-cli-pager > /dev/null
    
    echo -e "  ${GREEN}✅ Updated ${FUNCTION_NAME}${NC}"
  else
    echo -e "  ${RED}⚠️  Function ${FUNCTION_NAME} does not exist. Run setup script first.${NC}"
    return 1
  fi
  
  # Clean up
  rm -rf ${TEMP_DIR}
}

# Deploy all functions
SUCCESS_COUNT=0
FAIL_COUNT=0
SKIPPED_COUNT=0

for func in "${FUNCTIONS[@]}"; do
  if deploy_function ${func}; then
    ((SUCCESS_COUNT++))
  else
    ((FAIL_COUNT++))
  fi
  echo ""
done

# Clean up temp directory
rm -rf ${TEMP_BASE_DIR}

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Deployment Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Successful: ${SUCCESS_COUNT}${NC}"
if [ ${FAIL_COUNT} -gt 0 ]; then
  echo -e "${RED}❌ Failed: ${FAIL_COUNT}${NC}"
fi
echo ""

if [ ${FAIL_COUNT} -eq 0 ]; then
  echo -e "${GREEN}🎉 All Lambda functions deployed successfully!${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  Some deployments failed. Check output above for details.${NC}"
  exit 1
fi
