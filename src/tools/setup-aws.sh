#!/bin/bash

# Configuration
BUCKET_NAME="spaced-rep-flashcards-data"
REGION="us-east-1"
IAM_USER="flashcards-app-user"
POLICY_NAME="FlashcardsS3Policy"

echo "🚀 Setting up AWS infrastructure for Flashcards app..."

# 1. Create S3 Bucket
echo "📦 Creating S3 bucket: $BUCKET_NAME"
aws s3api create-bucket \
    --bucket $BUCKET_NAME \
    --region $REGION

# 2. Enable versioning (to prevent accidental data loss)
echo "🔄 Enabling versioning..."
aws s3api put-bucket-versioning \
    --bucket $BUCKET_NAME \
    --versioning-configuration Status=Enabled

# 3. Block public access (security best practice)
echo "🔒 Blocking public access..."
aws s3api put-public-access-block \
    --bucket $BUCKET_NAME \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# 4. Configure CORS
echo "🌐 Configuring CORS..."
cat > cors-config.json << 'EOF'
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST"],
            "AllowedOrigins": ["http://localhost:5173", "https://*.netlify.app", "https://*.vercel.app"],
            "ExposeHeaders": ["ETag"],
            "MaxAgeSeconds": 3000
        }
    ]
}
EOF

aws s3api put-bucket-cors \
    --bucket $BUCKET_NAME \
    --cors-configuration file://cors-config.json

# 5. Create IAM policy
echo "📋 Creating IAM policy..."
cat > policy.json << EOF
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

POLICY_ARN=$(aws iam create-policy \
    --policy-name $POLICY_NAME \
    --policy-document file://policy.json \
    --query 'Policy.Arn' \
    --output text)

echo "✅ Policy created: $POLICY_ARN"

# 6. Create IAM user
echo "👤 Creating IAM user: $IAM_USER"
aws iam create-user --user-name $IAM_USER

# 7. Attach policy to user
echo "🔗 Attaching policy to user..."
aws iam attach-user-policy \
    --user-name $IAM_USER \
    --policy-arn $POLICY_ARN

# 8. Create access keys
echo "🔑 Creating access keys..."
ACCESS_KEYS=$(aws iam create-access-key --user-name $IAM_USER --output json)

ACCESS_KEY_ID=$(echo $ACCESS_KEYS | jq -r '.AccessKey.AccessKeyId')
SECRET_ACCESS_KEY=$(echo $ACCESS_KEYS | jq -r '.AccessKey.SecretAccessKey')

# 9. Create .env.local file
echo "📝 Creating .env.local file..."
cat > .env.local << EOF
VITE_AWS_REGION=$REGION
VITE_AWS_ACCESS_KEY_ID=$ACCESS_KEY_ID
VITE_AWS_SECRET_ACCESS_KEY=$SECRET_ACCESS_KEY
VITE_S3_BUCKET=$BUCKET_NAME
EOF

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Summary:"
echo "  Bucket: $BUCKET_NAME"
echo "  Region: $REGION"
echo "  IAM User: $IAM_USER"
echo "  Access Key ID: $ACCESS_KEY_ID"
echo ""
echo "⚠️  IMPORTANT: Your credentials have been saved to .env.local"
echo "   Make sure this file is in .gitignore!"
echo ""
echo "🧹 Cleanup files created:"
rm cors-config.json policy.json

echo "🎉 You're ready to go! Run 'npm run dev' to start your app."