# Private Staging Execution Runbook

This runbook brings together the proven staging architecture and the remaining deployment steps for a private staging environment.

## 1. Goal

Validate the private staging path without real production data or production credentials:

- local ICP network
- worker registration
- scoped worker secret access
- queue-based email/push/payment flow
- frontend deployment to staging
- final approval gate before production promotion

## 2. Environment requirements

### Required tooling

- Node 22.12.0+
- Rust toolchain
- Netlify CLI for deployment
- local ICP tooling / managed network
- GitHub Actions with environment setup

### Required staging values

Only non-production staging metadata should be used:

```bash
IGNITE_STAGE=private-staging
ICP_MODE=local-staging
BUILD_TARGET=lab
NODE_VERSION=22.12.0
CI=true
```

Do not set production keys or service-role values.

## 3. Stage 1: Start local ICP

Run:

```bash
cd /workspaces/ignite-icp-lab
node frontend/scripts/local-icp.mjs start
node frontend/scripts/local-icp.mjs deploy
node frontend/scripts/local-icp.mjs status
```

This creates the synthetic local network and deploys the lab canisters.

## 4. Stage 2: Register workers on the staging ICP network

Register the scoped staging workers:

```bash
# Example pattern only; replace with actual synthetic staging principals
icp canister call secret_workload_identity register_workload \
  '(principal "<EMAIL_WORKER_PRINCIPAL>", "ignite-email-worker", vec{"send-email-notification"})'

icp canister call secret_workload_identity register_workload \
  '(principal "<PUSH_WORKER_PRINCIPAL>", "ignite-push-worker", vec{"send-push-notification"})'

icp canister call secret_workload_identity register_workload \
  '(principal "<AUDIT_WORKER_PRINCIPAL>", "ignite-audit-worker", vec{"write-audit-log"})'

icp canister call secret_workload_identity register_workload \
  '(principal "<PAYMENT_WORKER_PRINCIPAL>", "ignite-payment-worker", vec{"payment-processor"})'
```

Validate scopes:

```bash
icp canister call secret_workload_identity verify_secret_access \
  '(principal "<EMAIL_WORKER_PRINCIPAL>", "send-email-notification", "staging-email-check")'

icp canister call secret_workload_identity verify_secret_access \
  '(principal "<PUSH_WORKER_PRINCIPAL>", "send-push-notification", "staging-push-check")'

icp canister call secret_workload_identity verify_secret_access \
  '(principal "<EMAIL_WORKER_PRINCIPAL>", "payment-processor", "staging-bad-scope-check")'
```

The last check must return `approved = false`.

## 5. Stage 3: Staging secret manager and vault wiring

Do not create the real production Google Cloud secrets yet.

Instead:

- use a private staging secret store or placeholder env values
- bind each secret only to the matching worker scope
- keep secrets out of the repo and out of the frontend build
- follow the secret-to-worker map:
  - `RESEND_API_KEY` -> email worker
  - `FCM_SERVICE_ACCOUNT` + `VAPID_PRIVATE_KEY` -> push worker
  - `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` -> payment worker
  - audit-only logs -> audit worker

This should follow the worker vault model already created in the lab proof.

## 6. Stage 4: Run staging smoke tests

From the repo root:

```bash
cd /workspaces/ignite-icp-lab
cargo test --workspace --locked
cd frontend
npm run check:isolation
npm run check:prod-secrets
npx vitest run \
  lab-tests/worker-secret-vault.test.ts \
  lab-tests/external-worker-boundary.test.tsx \
  lab-tests/secret-workload-client.test.tsx \
  lab-tests/external-worker-coordinator.test.tsx \
  lab-tests/external-worker-integration.test.tsx \
  lab-tests/external-worker-provider-registry.test.tsx \
  lab-tests/phase-3-queue-production.test.tsx
```

Then run the live local harness:

```bash
cd /workspaces/ignite-icp-lab
node frontend/scripts/test-external-worker-secrets.mjs
```

Expected result:
- all tests pass
- worker registration passes
- wrong-scope denials pass
- live secret access works only for authorized workers

## 7. Stage 5: Deploy frontend to staging

Build the frontend in the staging-safe mode:

```bash
cd /workspaces/ignite-icp-lab/frontend
npm ci --no-fund --no-audit
npm run check:isolation
npm run check:prod-secrets
npm run deploy:staging
npm run build
```

Then deploy to Netlify staging:

```bash
netlify deploy --prod --dir=dist
```

## 8. Stage 6: Final staging sign-off

The staging environment is ready only when all are true:

- no production secrets are in repo or build output
- worker identities are registered and scoped
- wrong-scope access is rejected
- queue claims and worker access are proven on the local ICP staging network
- email / push / payment flows pass their stage validation
- no real user data is present
- rollback path is documented

## 9. Production promotion gate

Once staging passes, use the approval-gated production workflow:

- [.github/workflows/prod-icp-upgrade-approved.yml](../.github/workflows/prod-icp-upgrade-approved.yml)

This is the protected promotion boundary before any real production canister upgrade.

## 10. Final note

The real Google Cloud Secret Manager entries are not created in this staging proof step. They are intentionally deferred until the private staging model has been proven. That ordering is deliberate and reduces risk.
