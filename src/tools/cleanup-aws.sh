#!/bin/bash

BUCKET_NAME="spaced-rep-flashcards-data"
IAM_USER="flashcards-app-user"
POLICY_NAME="FlashcardsS3Policy"

echo "🧹 Cleaning up AWS resources..."

# 1. Delete all objects in bucket (including versions)
echo "🗑️  Emptying S3 bucket..."
aws s3 rm s3://$BUCKET_NAME --recursive

# Delete all versions
aws s3api list-object-versions \
    --bucket $BUCKET_NAME \
    --query 'Versions[].{Key:Key,VersionId:VersionId}' \
    --output text | \
while read -r key version; do
    aws s3api delete-object \
        --bucket $BUCKET_NAME \
        --key "$key" \
        --version-id "$version"
done

# 2. Delete bucket
echo "📦 Deleting bucket..."
aws s3api delete-bucket --bucket $BUCKET_NAME

# 3. Detach policy from user
echo "🔗 Detaching policy..."
POLICY_ARN=$(aws iam list-policies \
    --query "Policies[?PolicyName=='$POLICY_NAME'].Arn" \
    --output text)

aws iam detach-user-policy \
    --user-name $IAM_USER \
    --policy-arn $POLICY_ARN

# 4. Delete access keys
echo "🔑 Deleting access keys..."
ACCESS_KEYS=$(aws iam list-access-keys --user-name $IAM_USER --query 'AccessKeyMetadata[].AccessKeyId' --output text)
for key in $ACCESS_KEYS; do
    aws iam delete-access-key --user-name $IAM_USER --access-key-id $key
done

# 5. Delete user
echo "👤 Deleting IAM user..."
aws iam delete-user --user-name $IAM_USER

# 6. Delete policy
echo "📋 Deleting policy..."
aws iam delete-policy --policy-arn $POLICY_ARN

echo "✅ Cleanup complete!"