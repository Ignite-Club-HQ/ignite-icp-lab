# PII and Sensitive Data Field Classification Matrix

## Scope and status

This is a synthetic, repository-only classification matrix derived from the
sanitized reference schema and the current ICP POCs. It is a design artifact,
not a production schema export and not evidence that production data was read.

The matrix identifies representative fields and service records that must be
classified before an ICP workload is enabled. A field marked `review_required`
must receive an approved production decision before use.

## Classification values

- `direct_identifier`: identifies a person, account, or external identity.
- `contact_data`: email, phone, address, or communication destination.
- `child_guardian_data`: child, parent, guardian, roster, or consent relation.
- `authentication_metadata`: principals, account links, challenges, sessions,
  passkeys, recovery records, or external identity mappings.
- `sensitive_content`: photos, files, messages, media references, or content
  that may identify or depict a person, especially a minor.
- `authorization_policy`: role, membership, exclusion, consent, capability,
  retention, and purpose state.
- `operational_metadata`: IDs, revisions, timestamps, checksums, queue state,
  route state, and audit references without secret values.
- `secret`: credential, signing key, token, password, or raw key material.

## Matrix

| Source/service field or record | Class | Owner | ICP boundary | Encryption/protection | Retention/residency | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `profiles.id`, application account ID | `direct_identifier` | `identity_access` | identity canister; stable application ID only | ordinary state allowed; minimize exposure | account residency; account lifetime | `synthetic_only` |
| `profiles.full_name`, display/profile names | `direct_identifier` | identity/domain service | owning profile/domain service | encrypt if production privacy decision requires it | account retention policy | `review_required` |
| `profiles.email`, email hash, phone/contact fields | `contact_data` | identity/access boundary | identity service; delivery stays external | vetKeys/protected boundary or external authority | strict residency and deletion policy | `review_required` |
| Supabase UUID to site binding | `authentication_metadata` | `identity_access` | `ExternalSiteBinding` with `site_id` | no raw credential; mapping only | account lifetime plus erasure | `implemented_poc` |
| ICP principals and link challenges | `authentication_metadata` | `identity_access` | identity canister | principal/challenge metadata only; no private keys | challenge TTL; linked account lifetime | `implemented_poc` |
| passkey/session/recovery records | `authentication_metadata` | external identity service / identity boundary | no raw credential in ordinary canister state | approved identity provider or protected boundary | short-lived challenges; legal recovery retention | `review_required` |
| child IDs and child-team assignments | `child_guardian_data` | `identity_access` + events/club domain | bounded relationship records | access policy plus approved PII encryption | strict child-data retention/residency | `review_required` |
| parent/guardian links and consent | `child_guardian_data` / `authorization_policy` | `identity_access` | guardian and consent records | purpose-bound access; vetKeys decision required for protected content | consent lifetime, revocation, erasure | `synthetic_poc` |
| event roster `child_id`, attendance, lineup participation | `child_guardian_data` | `events_domain` | event domain, guardian-scoped queries | encrypt where linked to identifiable child | event retention and regional placement | `review_required` |
| club/team membership and role grants | `authorization_policy` | `identity_access` + `club_domain` | scoped role records with site/club/team | no secrets; audit mutations | membership lifetime and audit retention | `implemented_poc` |
| exclusions and blocked-user relationships | `authorization_policy` | identity/domain service | in-canister enforcement | minimize public exposure | membership/account lifetime | `implemented_poc` |
| event titles/descriptions, competition names | `sensitive_content` | events/competition domain | owning domain | ordinary state only if approved non-sensitive; otherwise encrypt | domain retention | `review_required` |
| chat message body, replies, polls, reports | `sensitive_content` | `messaging_domain` | conversation shard; bytes/text remain domain data | vetKeys/protected path if PII or child content requires it | conversation retention/deletion policy | `review_required` |
| unread state, read receipts, delivery state | `authorization_policy` / `operational_metadata` | messaging/notification domain | scoped to participant and conversation | no raw secrets; participant gate | bounded operational retention | `implemented_poc` |
| photo/file metadata: asset ID, owner, club/team/event scope | `sensitive_content` / `direct_identifier` | `media_metadata` | separate metadata canister | encrypted metadata where required; no bytes | asset retention policy | `implemented_poc` |
| child photos, player images, videos, minor media bytes | `sensitive_content` | external encrypted storage + `media_metadata` | bytes never in ordinary canister state | client-side vetKeys or approved SEV-SNP hardware | strict child-media retention/residency | `review_required` |
| storage path/prefix, signed URL, object key reference | `sensitive_content` / `operational_metadata` | media/storage boundary | metadata only; signed access external | no credentials; prefix enforcement | asset lifetime; revoke on delete | `synthetic_poc` |
| media checksum, MIME, content length, chunk records | `operational_metadata` | `media_metadata` | metadata canister | integrity metadata; ciphertext for sensitive payloads | asset lifetime and audit | `implemented_poc` |
| media capability owner/action/purpose/expiry | `authorization_policy` | `media_metadata` + identity policy | capability record | opaque capability; no raw key | expiry, revocation, erasure | `implemented_poc` |
| club sponsor contact or website fields | `contact_data` / `sensitive_content` | club domain | club domain | review if personal contact data | club retention policy | `review_required` |
| notification recipient, preference, delivery token reference | `direct_identifier` / `authorization_policy` | notification domain | queue record; provider token external | no raw push/email credential | recipient and delivery retention | `review_required` |
| timer job scope, callback reference, retry state | `operational_metadata` / `authorization_policy` | timer worker | timer canister; callback capability only | no raw secret; worker capability | bounded job/audit retention | `implemented_poc` |
| placement, site target, residency profile, shard route | `operational_metadata` | placement/router control plane | control-plane canisters | public operational data only; no endpoint secrets | audit and migration retention | `implemented_poc` |
| audit caller, action, revision, checksum | `operational_metadata` / `authentication_metadata` | control/domain audit | append-only audit records | do not record plaintext PII or secrets | approved audit retention/residency | `synthetic_poc` |
| Supabase URLs, service keys, OAuth tokens, push keys, vault values | `secret` | external vault/protected worker | never ordinary canister state, Candid, frontend, or repo | external vault; approved protected processing | provider rotation/erasure policy | `external_boundary` |
| vetKeys master/key material | `secret` | approved vetKeys system/proxy | never returned or persisted by ordinary canister | vetKeys/protected boundary | key rotation and crypto-shredding | `external_boundary` |

## Required follow-up evidence

1. Reconcile this representative matrix against the complete approved production
   schema before any live data or production endpoint is introduced.
2. Add a machine-readable version of this matrix when the production schema and
   legal classifications are approved.
3. Add RLS parity references for every PII and child-media row access.
4. Add retention, residency, erasure, guardian consent, and key-rotation tests.
5. Prove that raw secrets, raw vetKeys material, and unencrypted child media
   cannot enter ordinary canister state or frontend bundles.

## Explicit lab boundary

All current values and examples are synthetic. This artifact must not be used to
infer that production PII, photos, credentials, vault records, or user data were
accessed.
