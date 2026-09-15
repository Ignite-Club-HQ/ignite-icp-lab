# PII, vetKeys, and vault architecture

## Decision status

This is an architecture gate for the synthetic lab and future production
review. It does not introduce production PII, vault credentials, vetKeys,
external endpoints, or real user data into this repository.

PII, child media/photos, and secret material are separated into distinct classes:

| Class | Examples | Authority | Allowed ICP state |
| --- | --- | --- | --- |
| PII data | names, contact details, profile attributes, child/guardian records, identity-link metadata | identity/domain service | encrypted ciphertext and non-sensitive references only after the vetKeys/protected-hardware design is approved |
| Child media & photos | team photos, player headshots, event galleries, media attachments depicting minors | `media_metadata` plus encrypted storage | encrypted metadata, client-side encrypted blobs/chunks via vetKeys, approved Cloud Engine SEV-SNP storage boundary; no unencrypted media |
| PII & media access policy | account/club/team scope, guardian consent, purpose, retention, revocation, erasure status | `identity_access` plus owning domain (`media_metadata`) | ordinary bounded policy records; never raw key material |
| Encryption capability | vetKeys-derived encryption/decryption capability or envelope metadata | approved vetKeys path / proxy | opaque capability/reference; no raw master key |
| Vault secret | OAuth, push, storage-signing, payment, webhook, database, or integration credential | external vault or approved protected engine | no ordinary canister state, Candid argument, frontend bundle, or repository file |
| Public or operational metadata | schema version, checksum, residency profile, migration phase | control plane | ordinary canister state when non-sensitive |

## Boundary model

1. A domain canister owns the minimum PII records required for its domain.
2. PII and sensitive media (specifically photos and media of children/minors)
   must be encrypted before durable storage or processed exclusively within
   approved confidential compute (SEV-SNP Cloud Engine) when the production
   privacy decision requires confidentiality from ordinary subnet replica
   operators.
3. vetKeys provide client-side / verifiable key derivation for authorized
   parents, guardians, and team administrators to encrypt and decrypt child
   photos and PII without leaking keys to node operators or unprivileged canisters.
4. vetKeys are used as an encryption/key-derivation capability, not as a
   general-purpose secret vault.
5. Vault credentials are used only by an approved external delivery or
   protected-processing boundary. They are never returned to frontend clients
   or ordinary domain canisters.
6. `identity_access` authorizes the account, club/team scope, guardian relationship,
   child visibility, purpose, consent, retention, and revocation decision.
   Possessing a principal is not enough to decrypt unrelated PII or child media.
7. The access policy decision and the encryption operation are separate checks.
   A successful authorization result must not expose raw key material.
8. Deletion means revoking access, destroying the encrypted data key, or
   erasing the approved key reference according to the retention policy; a canister
   record or photo must not be considered erased merely because a UI hides it.

## vetKeys deployment constraint

The current DFINITY constraint record says vetKeys are not directly reachable
from an engine canister when calls cross a subnet boundary with cycles. If the
production design uses an engine or a separate subnet, deploy a separately
funded vetKeys proxy with:

- an explicit Candid API containing no raw key return method;
- a documented trust boundary and caller authentication model;
- approved residency and subnet placement;
- bounded-wait and no-cycles behavior for every cross-subnet call;
- rate limits, replay protection, purpose binding, and audit events;
- failure behavior that denies access rather than returning plaintext or
  silently falling back to an unencrypted provider;
- upgrade, restore, revocation, and key-rotation tests.

The proxy is an architecture option, not permission to deploy vetKeys in this
lab before the production trust and residency decisions are approved.

## Vault boundary

The vault is external to ordinary ICP state. The future adapter must define:

- secret name/version and residency, without exposing the secret value;
- workload identity and least-privilege operation;
- bounded request and response sizes;
- timeout, retry, idempotency, and compensation behavior;
- rotation and revocation behavior;
- audit and incident handling;
- failure-closed behavior when the vault is unavailable.

External email, push, payment, storage-signing, OAuth, and third-party
integration workers remain the only components allowed to consume vault
secrets. Domain canisters may request a narrowly scoped operation, but may not
receive or persist the credential.

## Architecture check

The mixed Rust/Motoko architecture remains workable:

- Rust can continue to own routing, placement, high-volume queues, and
  migration infrastructure.
- Motoko can own ordinary domain workflows and PII policy orchestration where
  its persistent actor model is easier to review.
- Candid remains the boundary for identity/access, domain operations, vetKeys
  proxy calls, and external vault adapters.
- No language choice changes the replica/operator confidentiality model.

The design is **not** ready for production PII until the key proxy, vault,
residency, identity origin, consent, retention, erasure, and recovery gates
below are approved and tested.

## Required implementation gates

- [ ] Classify every PII field and sensitive media collection (including child
      photos, player media, match media) and document minimization and retention.
- [ ] Produce a machine-readable field/column matrix with data class, owner,
      residency, retention, encryption requirement, and allowed boundary.
      The initial synthetic matrix is
      [PII_FIELD_CLASSIFICATION_MATRIX.md](PII_FIELD_CLASSIFICATION_MATRIX.md);
      production reconciliation remains required.
- [ ] Decide whether PII and child media are encrypted client-side with vetKeys,
      hosted on approved SEV-SNP protected Cloud Engine hardware, or stored in
      encrypted external storage.
- [ ] Select the canonical Internet Identity origin and account-linking policy.
- [ ] Define the vetKeys proxy or same-subnet call path for child media and PII
      key derivation, including residency, subnet placement, and funding.
- [ ] Define the external vault provider and workload identity without adding
      credentials to the repo.
- [ ] Add purpose-bound, scope-bound, expiry-bound PII and child photo access
      capabilities (e.g. guardian-only or verified team-admin access).
- [ ] Add consent, revocation, export, erasure, and key-rotation workflows for
      child media and sensitive profiles.
- [ ] Add audit records without recording plaintext PII, secret values, or
      raw photo assets.
- [ ] Add upgrade, snapshot/restore, interrupted-call, and unavailable-service
      tests for the key and vault boundaries.
- [ ] Prove that no frontend, ordinary domain canister, notification worker,
      or timer worker can read raw vault secrets or unencrypted child photos.
- [ ] Prove that missing vetKeys/vault services fail closed with no plaintext or
      unencrypted fallback.

## Lab scope

The lab may add synthetic ciphertext, fake key references, and fake vault
operation identifiers to test boundary behavior. It must not add real PII,
production keys, vault tokens, storage credentials, or external service
configuration.

## Current implementation status

The repository has mapped the RLS/authorization domains and Edge Function/timer
surface, created the initial synthetic field-level matrix in
[PII_FIELD_CLASSIFICATION_MATRIX.md](PII_FIELD_CLASSIFICATION_MATRIX.md), and
has a separate `media_metadata` canister for asset metadata and capabilities.
Production schema reconciliation, a vetKeys proxy, secure-hardware deployment,
encrypted media-byte storage, and a vault adapter remain explicit upcoming
implementation and production gates.
