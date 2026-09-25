# Production ICP Upgrade Runbook

This is the production promotion and ICP canister upgrade runbook for the isolated lab. It is intended for a separately authorized production environment only.

## Responsibilities

- Staging is automatic and fail-closed.
- Production upgrade requires manual approval.
- Production deploys must use synthetic test data until separately authorized.
- No production Supabase credentials, tokens, or real user data are used by this repo.

## Required GitHub environment secrets

Set this in the GitHub environment named `production`:

- `ICP_IDENTITY_PEM_BASE64`

No `ICP_NETWORK_URL`/`ICP_NETWORK` secret is needed: `icp-cli`'s `ic`
environment is built-in/protected and always resolves to
`https://icp-api.io`; the workflows call `icp deploy -e ic ...` directly.
See `docs/PRODUCTION_LAUNCH_PLAN.md` Phase 3/5 and
`docs/PRODUCTION_GITHUB_SETUP_AND_APPROVAL.md` for full detail, including
the one-time `identity_access` governor-principal decision required before
its first mainnet install.

## Required GitHub environments

- `production-approval`
- `production`

## GitHub Actions workflows

- `.github/workflows/private-staging.yml` — staging gate for private preview/staging deployment
- `.github/workflows/prod-icp-upgrade.yml` — direct production upgrade action
- `.github/workflows/prod-icp-upgrade-approved.yml` — approval-gated production promotion

## Recommended production flow

1. Validate staging build and worker gate.
2. Approve production deployment in the `production-approval` environment.
3. Trigger the approved production workflow.
4. Confirm identity and network secrets are present.
5. Run Rust workspace and frontend checks.
6. Build backend artifacts.
7. Upgrade ICP canisters.
8. Validate post-upgrade health.
9. Only then proceed to broader rollout.

## Production approval gate

Use the workflow:

- `Production ICP Upgrade (Approved)`

This is the production-safe manual gate. It stops accidental canister upgrades from ever running on a push alone.

## Safe deployment rules

- never deploy real credentials into the app bundle
- never expose service-role keys in frontend or GitHub workflow logs
- never use production user data in staging or test runs
- never allow fallback to production Supabase modules
- keep Supabase disabled in the lab runtime
- keep the app on the explicit local loopback and allowlist model until separately authorized

## Signals for success

The workflow is successful when:

- Rust workspace tests pass
- frontend isolation checks pass
- production secret checks pass
- staging build passes
- canister upgrade completes
- post-upgrade health check completes

## Rollback policy

If upgrade health fails:

1. stop release rollout
2. keep the previous canister version in place
3. preserve the upgrade logs and artifact output
4. investigate the post-upgrade verification failure before retrying

This repo is not a production deployment package by default; it is a synthetic lab with a controlled production migration path that must be separately approved.
