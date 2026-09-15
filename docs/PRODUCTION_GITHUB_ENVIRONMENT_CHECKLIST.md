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

Set these as repository or environment secrets for the `production` environment:

- `ICP_IDENTITY_PEM_BASE64`
- `ICP_NETWORK_URL`

Optional:
- `ICP_NETWORK` (default: `production`)

## Secret format

### ICP_IDENTITY_PEM_BASE64

This must be the base64-encoded contents of the private identity used to sign ICP canister upgrade calls.

Example:

```bash
base64 -w 0 .icp/production-identity.pem
```

Then paste the output as the secret value.

### ICP_NETWORK_URL

This is the URL for the production ICP network target, for example:

```bash
https://ic0.app
```

or a private gateway URL if your production deployment uses one.

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
