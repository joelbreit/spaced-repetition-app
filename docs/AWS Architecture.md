## AWS Resources Created

### Core Infrastructure (from `scripts/setup-lambda-api.sh`)

1. **S3 Bucket**
    - Name: `spaced-rep-flashcards-data`
    - Region: `us-east-1`
    - Versioning: Enabled
    - Stores user flashcard data (user-specific paths: `users/{userId}/data.json`)

2. **Lambda Function**
    - Name: `flashcards-api`
    - Runtime: Node.js 20.x
    - Handles GET/POST requests for flashcard data
    - Authenticated with Cognito JWT verification
    - Environment variables: `S3_BUCKET`, `USER_POOL_ID`, `CLIENT_ID`

3. **API Gateway (HTTP API)**
    - Name: `flashcards-api`
    - Stage: `prod`
    - Endpoint: `/data`
    - Methods: GET, POST, OPTIONS (CORS)
    - Integrated with Lambda

4. **IAM Role**
    - Name: `flashcards-lambda-role`
    - Trusted service: Lambda
    - Attached policies:
        - `AWSLambdaBasicExecutionRole` (CloudWatch Logs)
        - Custom `flashcards-s3-access` policy (S3 access)

5. **IAM Policy**
    - Name: `flashcards-s3-access`
    - Permissions: GetObject, PutObject, DeleteObject, ListBucket on the S3 bucket

### Authentication (from `scripts/setup-cognito.sh`)

6. **Cognito User Pool**
    - Name: `flashcards-users`
    - Authentication: Email-based
    - Password policy: 8+ chars, lowercase + numbers required
    - Email verification: Enabled
    - MFA: Disabled

7. **Cognito User Pool Client**
    - Name: `flashcards-web-client`
    - Auth flows: USER_PASSWORD_AUTH, REFRESH_TOKEN_AUTH, USER_SRP_AUTH
    - Used by the frontend application

### Additional Resources

- **CloudWatch Logs**: Automatically created for Lambda execution logs
- **API Gateway Logs**: May be configured for API access logs

### Configuration Files Generated

- `.env.local`: Contains API endpoint, Cognito credentials, and region info

### Estimated Monthly Cost

According to the cleanup script comments:

- Lambda: $0.00 - $0.20 (first million requests free)
- API Gateway: $0.00 - $1.00 (first million requests free)
- S3: $0.02 - $0.05 (storage + requests)
- CloudWatch Logs: $0.00 - $0.50
- **Total: ~$0.02 - $1.75/month** for typical personal project usage

All resources are in the `us-east-1` region.
