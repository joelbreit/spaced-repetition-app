# One-time import of pre-existing resources

**This was run once, in August 2026, and completed successfully. Nothing here
needs to be run again.** It is kept as a record of how the `flashcards` stack
came to own resources it did not create, and as a reference if the same trick is
ever needed for another project.

## The problem

The S3 bucket, Cognito user pool, and user pool client were created imperatively
by `../../scripts/setup-lambda-api.sh` and `../../scripts/setup-cognito.sh`.
They could not simply be recreated by SAM, because:

- S3 object keys are `users/{cognito sub}/data.json`. A new user pool issues new
  subs, which would orphan every existing user's data.
- The bucket held live data and ~32 GB of object versions.
- Cognito password hashes cannot be exported, so users cannot be migrated.

So the resources had to be adopted, not replaced.

## Why two templates

CloudFormation resource import has two constraints that force a separate
bootstrap template:

1. An import changeset **cannot create resources at the same time** as it
   imports them. Only the imported resources may appear in the template.
2. Import **does not support transforms/macros**, so the template cannot carry
   `Transform: AWS::Serverless-2016-10-31`.

Hence `template-import.yaml` — plain CloudFormation, three resources, no SAM.
Once the stack existed, the full `../template.yaml` took over via `sam deploy`.

## What was run

```bash
# Step 1 — create the stack by importing the three existing resources
aws cloudformation create-change-set \
  --stack-name flashcards \
  --change-set-name import-stateful-resources \
  --change-set-type IMPORT \
  --template-body file://import/template-import.yaml \
  --resources-to-import file://import/resources-to-import.json \
  --region us-east-1

# Verify every row said Action=Import, Replacement=None, then:
aws cloudformation execute-change-set \
  --stack-name flashcards \
  --change-set-name import-stateful-resources \
  --region us-east-1

# Step 2 — confirm the template matches reality before letting SAM update it
aws cloudformation detect-stack-drift --stack-name flashcards --region us-east-1

# Step 3 — deploy the real template (adds Lambdas, API, roles)
sam build && sam deploy
```

## What went wrong, and the fix

The first `sam deploy` changeset showed:

```
* Modify  UserPoolClient  AWS::Cognito::UserPoolClient  Replacement: True
```

Cause: `template-import.yaml` set `UserPoolId` to the literal
`us-east-1_RtLlfMBtw`, while `../template.yaml` used `!Ref UserPool`. Although
both resolve to the same string, CloudFormation compares the _expressions_, saw
a change to a create-only property, and planned to replace the client — which
would have issued a new `ClientId` and broken the deployed frontend.

Fix: `../template.yaml` now also uses the literal, with `DependsOn: UserPool` to
preserve ordering. See the comment on that resource.

Lesson: when importing, the expression form matters, not just the resolved
value. Always generate the first post-import changeset with
`--no-execute-changeset` and read it.

## Drift detection blind spot

`detect-stack-drift` reported `IN_SYNC` with 0 drifted resources, but only
`FlashcardsDataBucket` and `UserPoolClient` appeared in the per-resource
results — `AWS::Cognito::UserPool` does not support drift detection and was
skipped silently. A clean drift report is not evidence that the user pool
matches the template.
