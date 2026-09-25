# Production GitHub Environment Checklist

This checklist covers the required GitHub environment setup for the protected ICP production upgrade workflow.

## Required GitHub environments

Create these environments in the repository settings:

### 1) production-approval

This environment is used for the manual approval gate.

Required configuration:
- reviewers: add the authorized production approvers
- wait timer: optional, if required by policy
- deployment branch policy: restrict to the production branch only

### 2) production

This environment is used for the actual canister upgrade and release validation.

Required configuration:
- environment protection rules: restrict to approved deployment branch
- reviewers: add production approvers if desired
- deployment branch policy: restrict to the production branch or a designated release branch

## Required repository secrets

Set this as an environment secret for the `production` environment:

- `ICP_IDENTITY_PEM_BASE64`

No network/URL secret is required: `icp-cli`'s `ic` environment is
built-in and protected, and always resolves to `https://icp-api.io`. The
workflows pass `-e ic` directly to `icp deploy`/`icp canister status`; do
not add an `ICP_NETWORK_URL` or `ICP_NETWORK` secret (an earlier draft of
this checklist listed those, but the workflows never used a valid flag for
them — see `docs/PRODUCTION_LAUNCH_PLAN.md` Phase 3/5 for the full
rationale).

## Secret format

### ICP_IDENTITY_PEM_BASE64

This must be the base64-encoded contents of the mainnet deployment
identity's private key PEM (create it locally first with
`icp identity new mainnet-deployer`, per
`docs/PRODUCTION_LAUNCH_PLAN.md` Phase 3 step 1 — do not reuse a personal
identity). Locate the identity's PEM file, then encode it:

```bash
base64 -w 0 <path-to-mainnet-deployer-identity>.pem
```

Then paste the output as the secret value. The workflow imports this PEM
as a named identity (`icp identity import --from-pem ... --storage
plaintext production-deployer`) at the start of each run and deletes the
decoded PEM file immediately after import.

### A required manual decision before first deploy: identity_access's governor principal

`identity_access`'s `icp.yaml` init args currently point at a lab-only,
gitignored local file that will not exist in CI. Before the very first
mainnet `install` of `identity_access` (not required for later upgrades),
you must decide which principal is the canister's initial `governor`
(owner) — most likely the mainnet deployment identity's own principal
(`icp identity principal` after importing it), or a separate governance
identity you control — and pass it explicitly, e.g. by adding
`--args '(record { governor = principal "<chosen-principal>" })'` to the
`icp deploy` invocation for that first install. See
`docs/PRODUCTION_LAUNCH_PLAN.md` Phase 3/5 for full detail. This is not a
GitHub secret — it's a one-time deploy-command argument you choose.

## Branch protection recommendations

For the production release branch, use these protections:

- require pull request reviews before merge
- require status checks to pass
- restrict who can push directly to the production branch
- require a manual GitHub environment approval before production workflow execution

## Recommended workflow path

1. Merge code into the protected production branch.
2. Open the `Production ICP Upgrade (Approved)` workflow in GitHub Actions.
3. Approve in the `production-approval` environment.
4. Run the workflow.
5. Confirm the canister upgrade and post-upgrade verification succeed.
6. Only then release the frontend or other dependent services.

## Safety notes

- do not add production credentials to the frontend bundle
- do not set any provider secrets as public repo variables
- do not use production user data in staging or rehearsal steps
- do not deploy to production without the approval gate and environment protections
