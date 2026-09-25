# PII and Sensitive Data Architecture: Revision Analysis & Enhanced Plan

## Executive Summary

The current PII architecture is **insufficiently protective for production use** because:

1. **Encryption is deferred** — PII is allowed in unencrypted canister state pending a future "vetKeys/protected-hardware design approval"
2. **No enforcement boundary** — Sensitive data access is not mediated by a dedicated, security-hardened canister
3. **Missing key derivation layer** — vetKeys proxy remains unspecified and undeployed
4. **Weak deletion semantics** — "Deletion" means revoking access, not cryptographic erasure
5. **No fine-grained audit trail** — Sensitive data access cannot be audited at the field/record level
6. **Secret leakage risk** — Ordinary domain canisters could accidentally expose encrypted keys or secrets through Candid responses

This revision proposes a **security-by-design architecture** with explicit separation of concerns, encryption-as-default, and a staged path to protected hardware.

---

## Current Architecture Gaps

### Gap 1: Encryption is Deferred (Not Default)

**Current state:**
```
PII data classification entry says:
  "encrypted ciphertext and non-sensitive references only after the 
   vetKeys/protected-hardware design is approved"
```

**Problem:**
- PII can legally exist in plaintext in ordinary canister state during the "approval phase"
- No technical barrier prevents domain canisters from storing and returning unencrypted PII
- Replica operators and nodes have unrestricted memory access

**Risk:**
- Child photos, names, contact details, and guardian relationships are exposed to operator inspection
- No automatic enforcement; relies on code review and manual gates

---

### Gap 2: No Dedicated Sensitive-Data Canister

**Current state:**
- PII is "owned" by domain canisters (identity_access, media_metadata, club_links, etc.)
- No separate canister enforces access control or encryption

**Problem:**
- Domain canisters implement authorization logic inline with business logic
- Developers must manually check access policy before returning any PII field
- Mistake (e.g., returning a child's email in a list response) is a silent security failure
- No centralized audit trail for sensitive data access

**Risk:**
- Authorization bypass or accidental over-disclosure in any domain canister
- Difficult to prove that no production code path leaks PII

---

### Gap 3: Missing vetKeys Proxy Infrastructure

**Current state:**
- vetKeys deployment is "an architecture option, not permission to deploy... before the production trust and residency decisions are approved"
- No vetKeys proxy canister exists
- No key derivation API for child photos or encrypted PII

**Problem:**
- Client-side encryption cannot be used for child media without a key derivation service
- No mechanism to derive encryption keys for authorized parents/guardians
- No purpose-binding or time-bound key access

**Risk:**
- Child photos must remain unencrypted (or move to external storage) without vetKeys
- Residency and canister-placement decisions are forced into the future without a working prototype

---

### Gap 4: Weak Deletion Semantics

**Current state:**
```
"Deletion means revoking access, destroying the encrypted data key, or erasing 
 the approved key reference according to the retention policy"
```

**Problem:**
- "Destroying the encrypted data key" is not automatic or enforced
- No cryptographic erasure guarantee; data remains in canister stable memory
- No proof that deletion actually happened or was not reversed by upgrade

**Risk:**
- Guardians cannot prove their child's data was truly deleted
- Retention obligations are not enforceable
- GDPR right-to-erasure is not guaranteed

---

### Gap 5: Missing Field-Level Audit Trail

**Current state:**
- Audit records should "not record plaintext PII or secrets"
- No audit interface to query "who accessed child X's photos" or "who read guardian Y's contact details"

**Problem:**
- Audit is logged at the operation level (e.g., "user A accessed child X")
- No field-level provenance (e.g., "field email was read at timestamp T by principal P")
- Cannot forensically reconstruct access patterns for sensitive data

**Risk:**
- Breach investigation requires replaying canister state
- No real-time detection of unauthorized access to sensitive fields
- Compliance audits cannot prove data access was legitimate

---

### Gap 6: Vault Secrets Have No Workload Identity

**Current state:**
- Vault adapter "must define... workload identity and least-privilege operation"
- No existing binding between canister principals and vault credentials
- Timer workers and external callers have no approved path to secrets

**Problem:**
- Domain canisters could request vault secrets for any purpose
- No way to bind a vault secret to a specific use (e.g., "send-push-notification only")
- External services have no way to verify that the canister requesting a secret is authorized

**Risk:**
- Over-privileged access to shared vault secrets (e.g., all timer workers share a push-service key)
- Credential leakage if a worker canister is compromised

---

### Gap 7: No Protected-Hardware Staging Canister

**Current state:**
- SEV-SNP Cloud Engine is mentioned but not integrated
- No reference implementation of a protected-hardware boundary

**Problem:**
- Cannot test protected-hardware contracts at scale
- Unclear which computations should move to protected hardware
- No migration path from plaintext/encrypted-in-ordinary-canister to protected-hardware

**Risk:**
- When protected hardware becomes available, major refactoring is required
- Performance, cost, and operational models are unknown

---

## Revised Architecture Principles

### Principle 1: Encryption by Default

**All PII and sensitive data must be encrypted before storage in any ordinary canister state.**

- No approval gate required for encryption; it is mandatory
- Decryption keys must never be stored with encrypted data
- Client-side encryption via vetKeys is the default for child photos
- External encrypted storage is an alternative for media bytes

**Implication:** The distinction between "encrypted ciphertext" and "encrypted ciphertext after approval" is removed. All PII storage is encrypted.

---

### Principle 2: Separate Sensitive-Data Canister

**Introduce a dedicated PII/Sensitive Data Access Canister (`pii_access_control`)**

- Owns all PII encryption keys and key derivation logic
- Mediates all access to PII fields
- Enforces field-level access policies
- Returns ciphertexts only; never plaintext
- Logs every PII access at the field level
- Handles key rotation and cryptographic erasure

**Implication:** Domain canisters delegate authorization checks to pii_access_control. No domain canister stores plaintext PII.

---

### Principle 3: Explicit Workload Identity for Vault Secrets

**Every canister and timer job has a bound, minimal set of vault secret operations.**

- A principal is registered in an identity table with its allowed secret scopes
- Vault adapter checks principal + operation against the registry before returning a secret
- Timer jobs have separate workload identities from domain canisters
- Secrets are never cached in canister state; they are always fetched on-demand

**Implication:** Credential leakage is compartmentalized; a compromised timer worker cannot access payment or OAuth secrets.

---

### Principle 4: Protected Hardware as First-Class Architecture

**Protected hardware (SEV-SNP Cloud Engine) is a target placement option, not deferred.**

- A canister can be marked as "preferred-protected-hardware" or "required-protected-hardware"
- The placement registry routes to protected hardware when available
- Computations on protected hardware use the same Candid interfaces as ordinary canisters
- No code changes are required to migrate from encryption-in-canister to protected-hardware execution

**Implication:** Protected hardware is a deployment choice, not a language/runtime choice.

---

### Principle 5: Cryptographic Erasure, Not Logical Deletion

**Deletion of PII and sensitive data must guarantee cryptographic erasure.**

- When a record is deleted, its encryption key is destroyed immediately
- Stable-memory entries are overwritten with zeros or random data
- No canister upgrade can restore deleted keys or data
- Deletion is logged with timestamp and requesting principal
- Retention-policy expiry triggers automatic deletion

**Implication:** Deletion is enforceable and auditable; guardians can trust that data is gone.

---

### Principle 6: Field-Level Audit Trail

**Every access to classified PII or sensitive data is logged with purpose binding.**

- Audit record includes: timestamp, requesting principal, accessed field, operation (read/export/delete), purpose, and result
- Plaintext field names and values are never logged
- Audit records are append-only in stable memory
- Audit can be queried by principal, field, time range, or result (success/failure)

**Implication:** Forensic analysis and real-time monitoring are possible.

---

## Revised Architecture: Detailed Design

### Layer 1: Identity and Access Policy (Rust: `identity_access`)

**Responsibilities:**
- Account and principal identity (Supabase UUID → ICP principal mappings)
- Guardian and child relationships
- Role and membership grants
- Field-level access policy (who can read/write which PII fields)
- Policy audit trail

**Design:**
- Stores only metadata and policy: no plaintext PII, no encryption keys
- Provides policy lookup: `lookup_pii_policy(principal, field_id, operation) -> allowed`
- Never returns PII; only returns metadata (policy version, field class, residency)
- Candid interface is read-only for access checks; mutation is through identity admin interface

**Example Candid:**
```candid
type PiiPolicy = record {
  principal: principal;
  field_id: text;
  operations: vec text;  // ["read", "export", "delete"]
  scope: variant {
    Self;  // own account
    Child: principal;
    Team: principal;
    Guardian: principal;
  };
  expiry: opt nat64;
  purpose: text;  // "view_child_photos", "send_notification", etc.
};

service identity : {
  lookup_policy : (principal, text, text) -> (opt PiiPolicy) query;
  audit_pii_access : (opt principal, opt text, opt nat64) -> (vec record { timestamp: nat64; principal: principal; field: text; operation: text; allowed: bool }) query;
};
```

---

### Layer 2: PII Access Control and Key Derivation (Motoko: `pii_access_control`)

**Responsibilities:**
- Store and rotate PII encryption keys in stable memory
- Derive vetKeys-compatible encryption/decryption keys for authorized principals
- Enforce access policy before returning ciphertexts
- Audit every PII access
- Handle cryptographic erasure on deletion
- Manage key rotation schedules

**Design:**
- All data is encrypted with AES-256-GCM
- Master key is split using Shamir Secret Sharing (3-of-5) or held in external Key Vault Service (KVS)
- Candid interface accepts encrypted requests and returns encrypted responses where possible
- Timer worker: key rotation every 90 days (configurable)
- No plaintext PII ever leaves this canister

**Stable Memory Layout:**
```
0: metadata version, checksum, master-key-id
1: PII records (encrypted, keyed by pii_id):
   [
     pii_id: text,
     field_id: text,
     ciphertext: vec u8,
     nonce: vec u8,
     master_key_id: text,
     created_at: nat64,
     last_accessed: nat64,
     access_count: nat64,
     domain_owner: principal,
     encryption_version: nat32
   ]
2: access log (append-only, encrypted):
   [
     timestamp: nat64,
     requesting_principal: principal,
     pii_id: text,
     field_id: text,
     operation: text,
     policy_check_result: variant { Allowed; Denied },
     key_derivation_attempt: variant { Success; Failed }
   ]
3: key metadata (key_id → rotation schedule, status):
   [
     key_id: text,
     created_at: nat64,
     rotation_due_at: nat64,
     status: variant { Active; RotationPending; Revoked; Shredded }
   ]
```

**Candid Interface:**
```candid
type EncryptedPii = record {
  pii_id: text;
  field_id: text;
  ciphertext: vec u8;
  nonce: vec u8;
};

type DecryptedPii = record {
  pii_id: text;
  field_id: text;
  plaintext: vec u8;  // Only for authorized requesters
};

type AuditRecord = record {
  timestamp: nat64;
  principal: principal;
  pii_id: text;
  field_id: text;
  operation: text;
  allowed: bool;
};

service pii_access_control : {
  // Encrypt PII on registration (admin only)
  register_pii : (pii_id: text, field_id: text, plaintext: vec u8, domain_owner: principal) -> (EncryptedPii);
  
  // Retrieve encrypted PII (any canister can call; decryption is caller's responsibility)
  get_encrypted_pii : (pii_id: text, field_id: text) -> (opt EncryptedPii) query;
  
  // Decrypt PII if authorized (enforces policy)
  get_decrypted_pii : (pii_id: text, field_id: text, operation: text, purpose: text) -> (result DecryptedPii (variant { Denied; KeyUnavailable; NotFound }));
  
  // Derive child-photo encryption key (vetKeys-compatible)
  derive_media_key : (child_id: principal, authorizer: principal, purpose: text, expiry: nat64) -> (result vec u8 (variant { Denied; KeyUnavailable }));
  
  // Cryptographic erasure
  delete_pii : (pii_id: text, field_id: text) -> (result (record { shredded_at: nat64; key_destroyed: bool }) (variant { NotFound; AlreadyDeleted }));
  
  // Audit queries
  audit_access : (filter: record { opt_principal: opt principal; opt_field_id: opt text; opt_from_ts: opt nat64; opt_to_ts: opt nat64 }) -> (vec AuditRecord) query;
  
  // Key rotation (admin or timer-job only)
  rotate_key : (new_key_id: text) -> (record { rotated_at: nat64; old_key_id: text });
};
```

---

### Layer 3: Domain Canisters (Motoko product domains)

**Responsibilities:**
- Store only the minimum PII id/reference + encrypted PII from `pii_access_control`
- Delegate authorization to `identity_access`
- Request PII decryption from `pii_access_control` only when needed
- Never log plaintext PII
- Cache encrypted responses minimally (ephemeral only)

**Design:**
- Stores `(principal_id, encrypted_pii_pointer)` pairs, never plaintext
- On read request: checks authorization via `identity_access`, fetches encrypted PII from `pii_access_control`, decrypts if authorized
- Candid responses contain encrypted data or references; never plaintext PII
- Post-upgrade, keys are not persisted; they are fetched fresh on each use

**Example (club_domain):**
```motoko
// Stored in stable memory
type ClubRecord = {
  club_id: Principal;
  name: Text;
  owner_id: Principal;
  encrypted_owner_pii: Encrypted<OwnerPii>;  // Reference to pii_access_control
};

// On "get_club" request
public func get_club(club_id: Principal, caller: Principal) : async Club {
  let policy = await identity_access.lookup_policy(caller, club_id, "read_club");
  if (!policy.allowed) return error("Denied");
  
  let club = clubs.get(club_id);
  // Return club data minus plaintext PII; include encrypted PII references
  return {
    club_id = club.club_id;
    name = club.name;
    owner_name_encrypted = club.encrypted_owner_pii.ciphertext;
    owner_name_nonce = club.encrypted_owner_pii.nonce;
  };
};
```

---

### Layer 4: Protected Hardware Staging Canister (Optional: `pii_protected_engine`)

**Responsibilities (if Cloud Engine is selected):**
- Receive encrypted PII from `pii_access_control`
- Decrypt and process in confidential compute (SEV-SNP)
- Return results re-encrypted with client-side key
- Fail closed if protected hardware is unavailable

**Design:**
- Deployed on Cloud Engine or protected hardware boundary only
- Same Candid interface as `pii_access_control`, but marked "confidential"
- No ordinary ICP subnet replica has access to decrypted PII
- Network calls from ordinary canisters to protected engine use bounded-wait, no-cycles

---

### Layer 5: Vault Secret Workload Identity (`secret_workload_identity`)

**Responsibilities:**
- Register and audit workload identities for timer jobs and external workers
- Map canister principal → allowed vault secret scopes
- Request vault secrets on behalf of authorized principals only

**Design:**
- Stable memory: `(principal, allowed_secret_scopes) → registered_workload_identity`
- External vault API call includes workload identity + operation + nonce
- External vault validates and returns secret with short TTL (5 min)
- Secret is never cached in canister state; always fetched on-demand

**Stable Memory:**
```
workload_identities: stable array {
  principal: principal;
  workload_name: text;
  allowed_scopes: vec text;  // ["send-push-notification", "write-audit-log"]
  registered_at: nat64;
  last_used: nat64;
  secret_request_audit: vec {
    timestamp: nat64;
    secret_scope: text;
    request_status: variant { Approved; Denied; Failed };
  }
}
```

---

## Revised Implementation Plan

### Phase 1: Foundation (Weeks 1–2)

**Deliverables:**
1. Create `pii_access_control` Motoko canister with:
   - AES-256-GCM encryption/decryption
   - Stable memory layout for encrypted PII
   - Access audit trail
   - Key metadata and rotation schedule
2. Update `identity_access` to export field-level access policy
3. Define Candid boundaries for all three layers

**Testing:**
- Unit tests for encryption/decryption round-trip
- Policy enforcement test (authorized vs. denied access)
- Audit trail verification

---

### Phase 2: Integration (Weeks 3–4)

**Deliverables:**
1. Update domain canisters to:
   - Remove plaintext PII storage
   - Register PII with `pii_access_control` on initialization
   - Request encrypted PII on reads
   - Delegate authorization to `identity_access`
2. Update product-domain tests to verify encrypted state

**Testing:**
- End-to-end test: create domain record → register PII → retrieve encrypted → policy-gated decryption
- Verify no plaintext PII in stable memory
- Verify audit trail

---

### Phase 3: Vault Workload Identity (Weeks 5–6)

**Deliverables:**
1. Create `secret_workload_identity` canister
2. Update timer jobs to register workload identities
3. Define external vault adapter interface

**Testing:**
- Timer job requests push secret → denied (no scope)
- Timer job with `send-push-notification` scope → approved
- Audit trail shows secret access + principal + result

---

### Phase 4: Protected Hardware Staging (Weeks 7–8)

**Deliverables:**
1. Define Cloud Engine SEV-SNP interface (Motoko + WASM)
2. Create `pii_protected_engine` reference implementation
3. Update placement registry to route sensitive operations to protected hardware
4. Add configuration option: `pii_storage_mode = variant { InCanister; ProtectedEngine; ExternalKVS }`

**Testing:**
- Same PII access tests run on both ordinary canister and protected engine
- Proof that results are identical
- Benchmark: latency, cycle cost difference

---

### Phase 5: Cryptographic Erasure & Compliance (Weeks 9–10)

**Deliverables:**
1. Implement Shamir Secret Sharing for master key (3-of-5)
2. Add key destruction and zeroization on delete
3. Add retention-policy expiry timers
4. Add GDPR right-to-erasure proof

**Testing:**
- Delete PII → verify key is destroyed → verify cannot be recovered
- Expiry timer fires → data is erased
- Forensic test: dump stable memory → no plaintext PII or keys

---

### Phase 6: Field-Level Audit & Monitoring (Weeks 11–12)

**Deliverables:**
1. Implement Prometheus/OpenTelemetry audit export
2. Add real-time alerting: "PII accessed 10x in 1 minute by principal X"
3. Add forensic query API

**Testing:**
- Run access pattern test → verify audit trail matches expected behavior
- Alert on anomalous access

---

## Implementation Checklist

- [ ] **pii_access_control** Motoko canister created and deployed
- [ ] All encryption/decryption code audited for side-channel leaks
- [ ] **identity_access** exports policy lookup interface
- [ ] **All domain canisters** updated to remove plaintext PII
- [ ] Verification: no plaintext PII in stable memory dumps
- [ ] **secret_workload_identity** canister created
- [ ] Timer jobs updated to use workload identity registry
- [ ] External vault adapter interface defined (no credentials in repo)
- [ ] **pii_protected_engine** reference implementation (optional SEV-SNP deployment)
- [ ] Placement registry updated to route to protected hardware
- [ ] Key rotation automation implemented
- [ ] Deletion and cryptographic erasure tests pass
- [ ] Audit trail queries work correctly
- [ ] Forensic analysis proves no leakage
- [ ] GDPR right-to-erasure documented and proven
- [ ] Monitoring dashboards and alerts configured

---

## Explicit Non-Goals (for this phase)

- Do NOT deploy real PII, photos, or credentials to any environment
- Do NOT integrate with production Supabase or Cloud Engine yet
- Do NOT move child photos to protected hardware until policy approval
- Do NOT make vetKeys changes until proxy canister is designed

---

## Expected Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Encryption performance overhead | Benchmark on local network; optimize bottleneck; consider side channels |
| Master key compromise | Use Shamir Secret Sharing (3-of-5); store shares externally; rotate quarterly |
| Canister upgrade loses keys | Keys are in stable memory; post-upgrade always reloads; test recovery |
| Audit log grows unbounded | Implement log rotation; archive to external storage; query pagination |
| Protected hardware unavailable | Graceful fallback to encrypted canister; never fall back to plaintext |
| Workload identity over-provisioning | Start with minimal scopes; audit every secret access; alert on scope changes |

---

## Success Criteria

1. **All PII is encrypted in stable memory** — dump of stable memory contains no plaintext names, emails, phone numbers, or child identifiers
2. **Access policy is enforced** — test every access path; unauthorized access returns Denied variant
3. **Deletion is irreversible** — deleted PII cannot be recovered even with canister upgrade or state rollback
4. **Audit trail is complete and forensically queryable** — every PII access is logged; query results match expected behavior
5. **Vault secrets are compartmentalized** — no single canister can access all vault secrets; each workload has minimal scope
6. **Protected hardware is production-ready** — same test suite passes on both ordinary and protected canisters; timing differences are documented
7. **Compliance is provable** — GDPR right-to-erasure, child safety, and retention policies are automated and auditable

---

## Next Action

1. Review this revised plan with security and legal teams
2. Confirm protected hardware (SEV-SNP Cloud Engine) availability and residency regions
3. Decide master-key strategy: Shamir Secret Sharing, external KVS, or local HSM
4. Begin Phase 1 implementation (pii_access_control canister)
