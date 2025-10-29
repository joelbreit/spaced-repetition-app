#!/bin/bash

set -e

BUCKET_NAME="spaced-rep-flashcards-data"
FUNCTION_NAME="flashcards-api"
API_NAME="flashcards-api"
ROLE_NAME="flashcards-lambda-role"
POLICY_NAME="flashcards-s3-access"

echo "🧹 Cleaning up AWS resources..."

# Get Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Get API ID
API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='$API_NAME'].ApiId" --output text)

# 1. Delete API Gateway
if [ -n "$API_ID" ]; then
    echo "🗑️  Deleting API Gateway..."
    aws apigatewayv2 delete-api --api-id $API_ID
fi

# 2. Delete Lambda function
echo "⚡ Deleting Lambda function..."
aws lambda delete-function --function-name $FUNCTION_NAME 2>/dev/null || true

# 3. Empty and delete S3 bucket
echo "📦 Emptying S3 bucket..."
aws s3 rm s3://$BUCKET_NAME --recursive 2>/dev/null || true

echo "🗑️  Deleting S3 bucket..."
aws s3api delete-bucket --bucket $BUCKET_NAME 2>/dev/null || true

# 4. Detach policies from role
echo "🔗 Detaching policies from IAM role..."
aws iam detach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
    2>/dev/null || true

aws iam detach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn arn:aws:iam::$ACCOUNT_ID:policy/$POLICY_NAME \
    2>/dev/null || true

# 5. Delete IAM role
echo "👤 Deleting IAM role..."
aws iam delete-role --role-name $ROLE_NAME 2>/dev/null || true

# 6. Delete IAM policy
echo "📋 Deleting IAM policy..."
aws iam delete-policy --policy-arn arn:aws:iam::$ACCOUNT_ID:policy/$POLICY_NAME 2>/dev/null || true

# 7. Delete .env.local
echo "📝 Removing .env.local..."
rm -f .env.local

echo ""
echo "✅ Cleanup complete!"
```

## Cost Estimate

Based on typical usage for a personal project:
```
Monthly costs (approximately):
- Lambda: $0.00 - $0.20 (1st million requests free)
- API Gateway: $0.00 - $1.00 (1st million free)
- S3: $0.02 - $0.05 (storage + requests)
- CloudWatch Logs: $0.00 - $0.50

Total: ~$0.02 - $1.75/month

For 1000 reviews/day:
- ~30,000 API calls/month
- Well within free tier
- Estimated cost: $0.05/month