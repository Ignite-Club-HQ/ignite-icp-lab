# Private Staging Deployment Checklist

This checklist defines the final private staging deployment path for the ICP + worker-scoped architecture after the lab proof has passed.

## 1. Preconditions

- Private ICP staging network is available
- Synthetic worker identities are created for staging only
- Private or ephemeral secrets are available in a secret manager, not in the repo or browser bundle
- Netlify project is ready for static frontend deploy
- The repo has passed the lab proof gate

## 2. Required staging environment values

Set these as non-production staging values only:

- `IGNITE_STAGE=private-staging`
- `ICP_MODE=local-staging`
- `BUILD_TARGET=lab`
- `NODE_VERSION=22.12.0`
- `CI=true`

Do not set production provider keys or service-role secrets.

## 3. Staging network setup

Use a private staging network or local loopback-managed ICP target.

Required pattern:
- synthetic identities only
- no production data
- no production credentials
- no public auth or OAuth wiring
- no real provider tokens in the frontend or canister memory

## 4. Worker registration

Register the scoped workers in the ICP staging canister:

- email worker -> `send-email-notification`
- push worker -> `send-push-notification`
- audit worker -> `write-audit-log`
- payment worker -> `payment-processor`

The worker registration path is already validated by the local staging harness.

## 5. Secret manager wiring

Before production deployment, wire the real secret manager to the staging workers.

Recommended setup:
- use Google Cloud Secret Manager for runtime worker secrets
- keep GitHub Actions secrets only for CI/CD automation
- keep browser and build outputs free of all provider secrets

Do not create secrets until the worker identity + scope model is proven in the staging environment.

## 6. Deploy frontend to staging

Use the repo staging build path:

```bash
cd frontend
npm ci --no-fund --no-audit
npm run check:isolation
npm run check:prod-secrets
npm run deploy:staging
npm run build
```

Then deploy the static bundle to Netlify staging:

```bash
netlify deploy --prod --dir=dist
```

## 7. Smoke tests before sign-off

Run the validation set:

```bash
cd frontend
npx vitest run \
  lab-tests/external-worker-boundary.test.tsx \
  lab-tests/secret-workload-client.test.tsx \
  lab-tests/external-worker-coordinator.test.tsx \
  lab-tests/external-worker-integration.test.tsx \
  lab-tests/external-worker-provider-registry.test.tsx \
  lab-tests/worker-secret-vault.test.ts \
  lab-tests/phase-3-queue-production.test.tsx
```

Also run the live local ICP harness:

```bash
cd /workspaces/ignite-icp-lab
node frontend/scripts/test-external-worker-secrets.mjs
```

## 8. Final staging gate

The staging deployment is only ready when all are true:

- no real secrets in repo or build bundle
- worker principals are registered and scoped
- wrong-scope access is denied
- queue claims are valid and fail-closed
- email/push/payment flows pass their staged worker checks
- no production data is present
- rollback and recovery are documented

## 9. Production promotion gate

Only after private staging passes should the GitHub approval workflow be used for production promotion:

- [.github/workflows/prod-icp-upgrade-approved.yml](../.github/workflows/prod-icp-upgrade-approved.yml)

This ensures the move from private staging to production is deliberate and approved.
