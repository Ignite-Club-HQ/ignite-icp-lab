# Production GitHub Setup and Approval

This document stores the final GitHub-side setup required for the protected ICP production upgrade flow.

## Required GitHub environments

Create the following environments in the repository settings:

### production-approval

Purpose:
- manual approval gate before production ICP upgrades

Recommended settings:
- add required reviewers
- restrict to the production branch
- optionally set a wait timer

### production

Purpose:
- holds production deployment secrets and runtime values

Recommended settings:
- restrict to the production branch
- add approval gating if desired

## Required environment secrets

Set this as an environment secret in the `production` environment:

- `ICP_IDENTITY_PEM_BASE64`

No `ICP_NETWORK_URL`/`ICP_NETWORK` secret is needed — `icp-cli`'s `ic`
environment is built-in/protected and always resolves to
`https://icp-api.io`; the workflows call `icp deploy -e ic ...` directly.
(An earlier draft of this doc listed those two secrets and `ic0.app`, which
was never a valid flag/host for this CLI — corrected here; see
`docs/PRODUCTION_LAUNCH_PLAN.md` Phase 3/5.)

## Secret generation

### ICP_IDENTITY_PEM_BASE64

Create the mainnet deployment identity locally first (once), per
`docs/PRODUCTION_LAUNCH_PLAN.md` Phase 3 step 1:

```bash
icp identity new mainnet-deployer
```

Then base64-encode its PEM file:

```bash
base64 -w 0 /path/to/mainnet-deployer-identity.pem
```

Then paste the output into the GitHub secret value. The workflow imports
this as a named identity at runtime (`icp identity import --from-pem ...
--storage plaintext production-deployer`) and deletes the decoded PEM file
immediately after import — it is never persisted to the runner's disk
beyond that step.

### Before the first mainnet install of `identity_access`: choose its governor principal

This is not a secret, but it blocks a first-time (non-upgrade) install:
`identity_access`'s `icp.yaml` init args point at a lab-only file that does
not exist in CI. You must decide the principal that should own the
canister (e.g. the mainnet deployment identity's own principal from
`icp identity principal`) and pass it via `--args '(record { governor =
principal "<chosen-principal>" })'` on that first `icp deploy` call. See
`docs/PRODUCTION_LAUNCH_PLAN.md` Phase 3/5 for full detail. Not required
for `club_domain` (no init args) or for upgrading an already-installed
`identity_access`.

## Required GitHub Actions workflows

The repository includes the protected workflow set:

- `.github/workflows/private-staging.yml`
- `.github/workflows/prod-icp-upgrade.yml`
- `.github/workflows/prod-icp-upgrade-approved.yml`

## Production workflow behavior

The approval-gated workflow is the safe production path:

1. `manual-approval` runs first
2. `production-approval` environment approval is required
3. the upgrade job runs only after approval
4. the canister upgrade and verification steps proceed

This is the GitHub-side equivalent of a production migration gate.

## Branch protection recommendations

For the protected production branch:

- require pull request reviews
- require status checks
- restrict direct pushes
- require environment approval for production workflows

## Final operating rule

Do not deploy to production without:

- the `production-approval` approval gate
- the `production` environment configured
- the required secrets in place
- successful staging and build validation completed first

This is the final operational setup needed to activate the protected production upgrade flow.
