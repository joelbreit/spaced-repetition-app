# AWS Architecture

All backend infrastructure is defined in [`backend/template.yaml`](../backend/template.yaml)
and deployed as the CloudFormation stack **`flashcards`** via AWS SAM.

|         |                                         |
| ------- | --------------------------------------- |
| Account | `609406001911`                          |
| Region  | `us-east-1`                             |
| Stack   | `flashcards`                            |
| Deploy  | `cd backend && sam build && sam deploy` |

Read [`backend/README.md`](../backend/README.md) before changing the template —
the S3 bucket and Cognito resources are managed by resource import and have
constraints that are not obvious from the YAML.

## Request flow

```
Browser (flashcards.joelbreit.com)
  │
  ├── Amplify Hosting  app d1b6g3ci66s5cb  ── CloudFront d2t0qaov37jrna
  │     └─ builds `main` from github.com/joelbreit/spaced-repetition-app
  │
  ├── Cognito user pool us-east-1_RtLlfMBtw  (login → JWT)
  │
  └── HTTP API 3u15oyvpok  stage /prod
        │
        ├── GET|POST|PATCH|OPTIONS /data ──▶ DataFunction
        ├── POST /sync ────────────────────▶ DataFunction (merge, see docs/Data.md)
        ├── GET|POST /reviews ─────────────▶ DataFunction
        │        verifies the Cognito JWT in code, then reads/writes
        │        s3://spaced-rep-flashcards-data/users/{sub}/data.json
        │        s3://spaced-rep-flashcards-data/users/{sub}/reviews/YYYY-MM.json
        │
        └── POST /read-aloud ─────────────▶ ReadAloudFunction
                 Cognito JWT authorizer ────▶ Amazon Polly
```

## Stack resources

| Logical ID                                 | Physical                                               | Managed by |
| ------------------------------------------ | ------------------------------------------------------ | ---------- |
| `FlashcardsDataBucket`                     | `spaced-rep-flashcards-data`                           | imported   |
| `UserPool`                                 | `us-east-1_RtLlfMBtw` (`flashcards-users`)             | imported   |
| `UserPoolClient`                           | `3enq795nvhpdcnqubr7dt8l44k` (`flashcards-web-client`) | imported   |
| `HttpApi` + `HttpApiprodStage`             | API `3u15oyvpok`, stage `prod`                         | SAM        |
| `DataFunction` (+ role, 4 permissions)     | auto-named                                             | SAM        |
| `ReadAloudFunction` (+ role, 1 permission) | auto-named                                             | SAM        |
| `DataFunctionLogGroup`                     | `/aws/lambda/flashcards/data`                          | SAM        |
| `ReadAloudFunctionLogGroup`                | `/aws/lambda/flashcards/read-aloud`                    | SAM        |
| `DeployNotificationsTopic` (+ policy)      | SNS `flashcards-deploy-notifications`                  | SAM        |
| `DeploySucceededRule`, `DeployFailedRule`  | EventBridge rules on the default bus                   | SAM        |

Both Lambdas are Node.js 24.x, 256 MB, 30 s timeout, x86_64. IAM is least
privilege: the data function gets `GetObject`/`PutObject`/`DeleteObject` on
`spaced-rep-flashcards-data/*` plus `ListBucket`, and the read-aloud function
gets only `polly:SynthesizeSpeech`. Both log groups retain 30 days.

## Deploy notifications

Every finished Amplify deploy of the frontend is posted to Slack (**Breitest**
workspace, **#website** channel):

```
Amplify job finishes ──▶ EventBridge "Amplify Deployment Status Change"
  (appId d1b6g3ci66s5cb, jobStatus SUCCEED | FAILED)
    ├── DeploySucceededRule ─┐  input transformer → AWS Chatbot custom
    └── DeployFailedRule ────┤  notification JSON (title + build-log link)
                             ▼
        SNS flashcards-deploy-notifications
                             ▼
        Amazon Q Developer in chat (Chatbot) config "Slack-Channel" ──▶ #website
```

- The topic and rules are in the SAM stack. The Amplify app ID is the template
  parameter `AmplifyAppId`. `STARTED` and `CANCELLED` statuses are not
  announced; add them to a rule's `jobStatus` list to change that.
- **The Slack side is not in the stack.** AWS allows one chat configuration per
  Slack channel per account, and #website already had the console-made
  `Slack-Channel` configuration (managed in the Amazon Q Developer console,
  region us-east-2), so the topic was added to its SNS topic list by hand. If the
  topic is ever deleted or renamed, re-add it, keeping the other topics in the list:

    ```bash
    aws chatbot update-slack-channel-configuration --region us-east-2 \
      --chat-configuration-arn arn:aws:chatbot::609406001911:chat-configuration/slack-channel/Slack-Channel \
      --slack-channel-id C052ADB0FLG \
      --sns-topic-arns <existing topic ARNs...> arn:aws:sns:us-east-1:609406001911:flashcards-deploy-notifications
    ```

- The message does not include the commit, because Amplify's event carries
  only the app, branch, job ID and status. The build-log link has the commit.

## Data storage

Per-user JSON at `users/{cognito sub}/data.json`, with the review log beside it
at `users/{cognito sub}/reviews/YYYY-MM.json` (one object per month; see
`docs/Data.md`). **The Cognito sub is the
storage key**, which is why the user pool can never be replaced — a new pool
issues new subs and orphans every user's data.

The bucket has versioning enabled (the recovery path for the data-erasure race
fixed in `2363cf3`) with a lifecycle rule expiring noncurrent versions after 30
days while keeping the newest 10. Before that rule existed the bucket had
accumulated 16,074 versions / 32.3 GB against 4.6 MiB of live data, because
`AppDataContext` rewrites the whole dataset on a 10-second debounce.

Encryption is SSE-S3 (AES256), all public access is blocked, and there is no
bucket policy or CORS configuration — browsers never talk to S3 directly.

## Not in the stack

- **Amplify Hosting** (app `d1b6g3ci66s5cb`), the custom domain
  `flashcards.joelbreit.com` + `www`, and the Route 53 records in zone
  `joelbreit.com` (`Z05533721JIMB3RGJY17E`).
- The frontend's `VITE_*` config, which is set as **Amplify app environment
  variables**. `sam deploy` prints the correct values as stack outputs.
- The Slack channel configuration that relays deploy notifications (see
  [Deploy notifications](#deploy-notifications)).

## Known gaps

- **`POST /read-aloud` trusts signed-in callers on cost.** It requires a
  Cognito token (gateway `CognitoAuthorizer`, so guests can't use read aloud),
  but any signed-in user still picks the Polly engine (generative is $30/M
  characters) and there is no length cap.
- **`/data` verifies JWTs in the handler rather than at the gateway.** The
  `bookmarks` stack uses an `HttpApi` `DefaultAuthorizer`, which is the better
  pattern.
- **No API Gateway access logging** on the `prod` stage.

## Cost

Roughly $0.50/month, essentially all Amplify build minutes. S3 was previously
the dominant line item (~$0.71/mo and growing) until the lifecycle rule; live
data is only ~4.3 MiB. Lambda, API Gateway, and Polly all sit inside the free
tier at current volume (~700 data calls and ~950 Polly calls per month).

## History

Created imperatively by shell scripts in `scripts/` between October 2025 and
January 2026. Migrated to SAM in August 2026: the bucket and Cognito resources
were adopted via CloudFormation import, the Lambdas and API were recreated by
SAM, and the legacy API, Lambdas, roles, policies, and the `flashcards-app-user`
IAM user (which held a long-lived access key from an abandoned
browser-writes-to-S3 design) were deleted. The setup scripts were removed at the
same time. See [`backend/import/README.md`](../backend/import/README.md).
