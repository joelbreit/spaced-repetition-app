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
        │        verifies the Cognito JWT in code, then reads/writes
        │        s3://spaced-rep-flashcards-data/users/{sub}/data.json
        │
        └── POST /read-aloud ─────────────▶ ReadAloudFunction
                 no auth (see Known gaps) ──▶ Amazon Polly
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

Both Lambdas are Node.js 20.x, 256 MB, 30 s timeout, x86_64. IAM is least
privilege: the data function gets `GetObject`/`PutObject`/`DeleteObject` on
`spaced-rep-flashcards-data/*` plus `ListBucket`, and the read-aloud function
gets only `polly:SynthesizeSpeech`. Both log groups retain 30 days.

## Data storage

Per-user JSON at `users/{cognito sub}/data.json`. **The Cognito sub is the
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

## Known gaps

- **`POST /read-aloud` is unauthenticated.** No gateway authorizer, no token
  check, `Allow-Origin: *`, caller-chosen Polly engine (generative is $30/M
  characters) and no length cap. Fixing it needs a coordinated frontend change
  so `readAloudAPI()` sends the `Authorization` header.
- **`/data` verifies JWTs in the handler rather than at the gateway.** The
  `bookmarks` stack uses an `HttpApi` `DefaultAuthorizer`, which is the better
  pattern.
- **No API Gateway access logging** on the `prod` stage.
- **Node 20 deprecation**: the AWS SDK warns that versions published after early
  January 2027 will require Node >= 22. The functions will need a runtime bump.

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
