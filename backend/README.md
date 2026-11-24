# Backend — `flashcards` SAM stack

All backend infrastructure for the spaced repetition app, as an AWS SAM stack.

|            |                                  |
| ---------- | -------------------------------- |
| Stack name | `flashcards`                     |
| Region     | `us-east-1`                      |
| Account    | `609406001911`                   |
| Template   | [`template.yaml`](template.yaml) |

## Commands

```bash
sam validate --lint   # Validate the template
sam build             # Install deps + stage both functions
sam deploy            # Deploy (prompts for changeset confirmation)
```

`samconfig.toml` pins the stack name, region, and `Project=flashcards` tags, so
plain `sam deploy` is enough — no `--guided` needed.

## What the stack contains

| Logical ID             | Resource                                    | Notes                                                  |
| ---------------------- | ------------------------------------------- | ------------------------------------------------------ |
| `FlashcardsDataBucket` | S3 bucket `spaced-rep-flashcards-data`      | **Imported.** Per-user data at `users/{sub}/data.json` |
| `UserPool`             | Cognito user pool `us-east-1_RtLlfMBtw`     | **Imported.**                                          |
| `UserPoolClient`       | Cognito client `3enq795nvhpdcnqubr7dt8l44k` | **Imported.**                                          |
| `HttpApi`              | HTTP API, stage `prod`                      | Created by SAM                                         |
| `DataFunction`         | Lambda — `/data` GET/POST/PATCH/OPTIONS     | Created by SAM                                         |
| `ReadAloudFunction`    | Lambda — `POST /read-aloud` (Polly)         | Created by SAM                                         |

## Read this before editing the imported resources

The bucket and the two Cognito resources predate CloudFormation — they were
created by the shell scripts in `../scripts/`. They were brought under
management with a CloudFormation **import** (see [`import/`](import/)), which
means the properties in `template.yaml` are not merely a description of what we
want; they are what CloudFormation believes the live resources look like.
Edit them carelessly and the next deploy will reshape production to match.

Three specific hazards:

1. **`UserPoolId` on `UserPoolClient` is a literal, not `!Ref UserPool`.** This
   looks like a mistake and is not. `UserPoolId` is a create-only property, and
   the import recorded it as a literal. Changing the expression to `!Ref` reads
   to CloudFormation as a change to a create-only property, which **replaces the
   client and issues a new ClientId** — breaking `VITE_COGNITO_CLIENT_ID` in
   Amplify and orphaning the old client. This was caught in a changeset during
   the migration; don't reintroduce it. `DependsOn: UserPool` preserves ordering.

2. **The user pool can never be replaced.** S3 keys are `users/{cognito sub}/…`.
   A new pool means new subs, which means every existing user's data is orphaned.
   `DeletionPolicy`/`UpdateReplacePolicy: Retain` guard against deletion, but they
   do not stop the app from pointing at an empty new pool. Always read the
   changeset.

3. **`AWS::Cognito::UserPool` does not support drift detection.** `detect-stack-drift`
   silently skips it and still reports `IN_SYNC`. The bucket and client are
   genuinely checked; the pool is not. Verify pool changes by reading the
   changeset, not by trusting drift status.

Rule of thumb: run `sam deploy` and **read the changeset before confirming**. Any
`Replacement: True` on an imported resource, or any `Attribute: Properties` entry
against Cognito, means stop.

## Authentication

`HttpApi` defines one JWT authorizer, `CognitoAuthorizer` (issuer: the user
pool, audience: the web client). It is attached per route, not as a
`DefaultAuthorizer`:

| Route                        | Auth                                                  |
| ---------------------------- | ----------------------------------------------------- |
| `POST /read-aloud`           | `CognitoAuthorizer` at the gateway; 401 before Lambda |
| `/data`, `/sync`, `/reviews` | None at the gateway; the handler verifies the JWT     |
| `OPTIONS` preflight          | None (API-level CORS)                                 |

The frontend sends the Cognito **access** token. It has no `aud` claim, so the
authorizer matches its `client_id` against the audience instead. Adding a route
that calls Polly or anything else billed per call? Give it
`Auth: Authorizer: CognitoAuthorizer`.

`/read-aloud` was open until 2026-11-23 (carried over from the pre-SAM stack).
Locking it down needed the frontend to send `Authorization`, so the frontend
deploy has to go out before or with a backend deploy that changes auth.

## Deliberately preserved quirks

The migration was a behaviour-preserving lift-and-shift, so a few things are
carried over as-is rather than fixed:

- **`/data` verifies JWTs in the handler, not at the gateway.** The `bookmarks`
  stack uses an `HttpApi` `DefaultAuthorizer`, which is the better pattern.
- **`OPTIONS /data` routes to the Lambda** even though API-level CORS already
  handles preflight. Redundant, but it is what the old stack did.
- **The bucket's CORS rules** reference `localhost:5173`, `*.netlify.app`, and
  `*.vercel.app` — leftovers from an abandoned design where the browser wrote to
  S3 directly. Nothing uses them.
- **No log retention or S3 lifecycle rule**, matching the pre-migration state.

## Not in this stack

- **Amplify hosting**, the custom domain `flashcards.joelbreit.com`, and the
  Route 53 records are managed outside SAM.
- `VITE_API_ENDPOINT`, `VITE_COGNITO_*` are set as **Amplify app environment
  variables** and must be updated there, not here. `sam deploy` prints the
  current values as stack outputs.
