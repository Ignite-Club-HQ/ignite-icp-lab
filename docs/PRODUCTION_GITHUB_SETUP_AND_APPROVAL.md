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

Set these as environment secrets in the `production` environment:

- `ICP_IDENTITY_PEM_BASE64`
- `ICP_NETWORK_URL`
- optional: `ICP_NETWORK` = `production`

## Secret generation

### ICP_IDENTITY_PEM_BASE64

Generate the base64 value locally:

```bash
base64 -w 0 /path/to/production-identity.pem
```

Then paste the output into the GitHub secret value.

### ICP_NETWORK_URL

Use the actual production ICP network URL, for example:

```bash
https://ic0.app
```

or a private production gateway if your deployment uses one.

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
