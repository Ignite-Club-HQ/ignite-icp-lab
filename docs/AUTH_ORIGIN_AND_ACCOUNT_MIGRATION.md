# Authentication Origin and Account Migration Decision

## Decision

Ignite will use a stable application account ID as the identity anchor. Supabase UUIDs and Internet Identity principals are linked credentials, not interchangeable identities.

```text
ApplicationAccount
  ├── legacy Supabase UUID (optional)
  ├── Internet Identity principal(s)
  ├── approved OpenID identity mappings (optional)
  └── club memberships and roles
```

The canonical Internet Identity origin must be chosen before production users are onboarded. The default ICP canister origin and the eventual custom application domain must not be treated as equivalent origins; Internet Identity derives origin-specific principals.

## Origin requirements

Choose one stable origin for production authentication and preserve it through frontend hosting, custom-domain changes, and canister upgrades. The selected origin must be:

- Owned by Ignite.
- Protected by HTTPS.
- Used consistently by web and supported mobile authentication flows.
- Present in the Internet Identity derivation-origin configuration.
- Included in account-recovery documentation.

Do not use a temporary lab origin as the production derivation origin.

## Linking flow

Account linking must be an explicit authenticated ceremony:

1. Authenticate to the existing Ignite account.
2. Authenticate with the new Internet Identity or approved OpenID identity.
3. Prove control of both sessions.
4. Check that the target principal is not already linked to another account.
5. Add the mapping with an optimistic account version.
6. Record an audit event.
7. Preserve existing memberships, roles, and data references.

Linking must support retry without duplicate mappings, revocation without deleting the application account, and recovery when a user loses one linked credential.

## Migration phases

### Phase A: synthetic proof

- Create a stable synthetic account ID.
- Link two synthetic principals.
- Reject duplicate and wrong-account links.
- Revoke one principal while preserving the remaining credential.
- Confirm club memberships remain attached to the account.

### Phase B: non-production pilot

- Export a small set of synthetic Supabase UUID mappings.
- Require users to authenticate to the existing account and the canonical Internet Identity origin.
- Reconcile account, membership, and role counts.
- Test session renewal, origin changes, mobile behavior, and account recovery.

### Phase C: production migration

- Keep Supabase Auth authoritative during the linking window.
- Offer explicit account linking after login.
- Do not silently create a second account when a principal is unknown.
- Preserve a rollback path and support-assisted recovery.
- Retain the legacy UUID mapping until migration and support retention periods expire.

## Multi-club behavior

One application account may belong to clubs on different backends and residency profiles. The account identity is global, while membership and authorization remain club-scoped. Every request must resolve the selected club's placement and then authorize that account in the selected provider.

## Required decisions

1. Canonical production authentication origin.
2. Custom-domain ownership and change policy.
3. Supported login methods for web and mobile.
4. Supabase UUID retention period.
5. Account recovery and support escalation process.
6. Rules for linking an existing principal to multiple application accounts.
7. Residency location for minimal account and identity metadata.

## Acceptance criteria

Authentication migration is not ready until the canonical origin is fixed, account linking is idempotent and auditable, duplicate accounts are prevented, revocation and recovery are tested, and a user can access multiple clubs across Supabase and ICP without losing memberships or roles.
