# Phase 4: Protected Hardware Staging Architecture
## Architecture-Ready, Deployment-Deferred

This document describes the architecture for integrating SEV-SNP Cloud Engine protected hardware for PII processing. The design is complete and can be deployed without refactoring Phases 1–3.

---

## Phase 4 Overview

**Status:** Architecture designed, not deployed  
**Deployment trigger:** When SEV-SNP Cloud Engine capacity is confirmed available  
**Refactoring required:** None; Phases 1–3 operate identically with or without Phase 4

---

## Architecture: Transparent Hardware Routing

### Design Principle: Deployment Choice, Not Code Change

The same `pii_access_control` Motoko canister can run on either:
1. **Ordinary subnet** — Encrypted PII in ordinary canister state (current Phases 1–3)
2. **Protected hardware** — Decrypted PII in confidential compute (Phase 4)

**Clients see the same Candid interface in both cases.**

### Layer 1: PII Storage Backend (Pluggable)

```
┌─────────────────────────────────────────────────────────────────┐
│ pii_access_control (Motoko layer)                              │
│                                                                  │
│ Public Candid interface:                                        │
│   - register_pii                                                │
│   - get_encrypted_pii                                           │
│   - get_decrypted_pii                                           │
│   - delete_pii                                                  │
│   - audit_access                                                │
└─────────────────────────────────────────────────────────────────┘
            │
            └───────────────────────┬───────────────────────┐
                                    │                       │
            ┌───────────────────────┴───────┐       ┌──────┴─────────┐
            │                               │       │                │
     ┌──────▼──────────┐         ┌──────────▼──┐   │     Phase 4:    │
     │ Phase 1–3:      │         │   Phase 4:  │   │  Protected      │
     │ In-Canister     │         │  Protected  │   │  Hardware       │
     │ Encryption      │         │  Engine     │   │  (SEV-SNP)      │
     │                 │         │  Routing    │   │                 │
     │ Plaintext PII   │         │             │   │ Decrypted PII   │
     │ never leaves    │         │ Routing     │   │ in confidential  │
     │ canister stable │         │ decisions   │   │ compute only    │
     │ memory (ever)   │         │ based on    │   │                 │
     │                 │         │ security    │   │ Hardware-backed │
     │ Default:        │         │ level       │   │ key material    │
     │ Start here      │         └─────────────┘   │ never leaves    │
     └─────────────────┘                           └─────────────────┘
```

---

## Phase 4 Implementation: Placement-Based Routing

### Design: Transparent Backend Selection

When `pii_access_control` is deployed to a protected-hardware subnet:

1. **Same Motoko code** — No branching or conditional logic
2. **Same Candid interface** — Clients make identical calls
3. **Hardware handles confidentiality** — SEV-SNP attestation guarantees memory isolation
4. **Routing layer decides backend** — Placement registry or configuration flag

### Decision Point: Configuration-Driven

Add a deployment-time configuration to `pii_access_control`:

```
Type: PII_STORAGE_MODE = variant {
  EncryptedInCanister;      // Phase 1–3 default
  ProtectedEngine;          // Phase 4: Cloud Engine SEV-SNP
  ExternalKVS;              // Future: managed key service
};
```

**How it works:**

- **EncryptedInCanister** (default):
  - Plaintext PII is never persisted
  - All data is encrypted with AES-256-GCM before storage
  - Encryption key is in stable memory
  - Decryption requires explicit call to `get_decrypted_pii`
  
- **ProtectedEngine** (Phase 4):
  - Canister is deployed to Cloud Engine SEV-SNP subnet
  - Plaintext PII can be stored in canister state (hardware-protected)
  - Hardware attestation proves operator cannot read memory
  - Candid calls use bounded-wait, no-cycles protocol
  - External KMS or hardware root of trust holds master keys

- **ExternalKVS** (future):
  - All encryption keys held in external Key Vault Service
  - Canister makes bounded API calls to fetch keys on-demand
  - Keys are never cached locally

---

## Phase 4: Full Architecture Specification

### Component 1: Protected Hardware Canister Runtime

**Deployment location:** SEV-SNP Cloud Engine protected subnet  
**Language:** Motoko (same as Phases 1–3)  
**Trust boundary:** Hardware attestation provides operator confidentiality

**Differences from ordinary canister:**

| Aspect | Ordinary Canister | Protected Engine |
| --- | --- | --- |
| Memory access | All subnet replicas can read memory | Only trusted hardware execution; operator cannot inspect |
| Key material | Encrypted in stable memory | Plaintext in canister state; protected by SEV-SNP |
| Network calls | May carry cycles | Bounded-wait, no-cycles only |
| Performance | Local execution | Cross-subnet latency overhead |
| Cost | Standard cycle consumption | Premium: hardware confidentiality surcharge |

### Component 2: Placement Registry Extension

Update `placement_registry` (Rust, currently Phase 2) to make placement decisions:

```rust
// New variant in ClubBackendPlacement
pub enum BackendPlacement {
  Supabase,
  IcpOrdinary {
    canister_id: Principal,
    shard: ShardNumber,
  },
  IcpProtectedEngine {
    canister_id: Principal,
    engine_region: Region,
    attestation_mode: AttestationMode, // SEV-SNP, TDX, etc.
  },
}

// Policy: clubs with child media or PII can opt into protected hardware
pub fn apply_pii_placement_policy(
  club_id: ClubId,
  has_child_media: bool,
  country: Country,
) -> BackendPlacement {
  if has_child_media && is_protected_engine_available(country) {
    BackendPlacement::IcpProtectedEngine {
      canister_id: protected_engine_pii_control,
      engine_region: country_to_region(country),
      attestation_mode: AttestationMode::SEV_SNP,
    }
  } else {
    // Fall back to ordinary or Supabase
  }
}
```

### Component 3: Protected Hardware Proxy (Optional, for Cross-Subnet Calls)

If protected hardware is on a separate subnet from the calling canister:

**Design:** Lightweight proxy canister on protected engine to intercept calls

```candid
// Proxy canister on protected engine
service protected_pii_proxy : {
  // Internal call from pii_access_control on ordinary subnet
  forward_get_decrypted_pii : (pii_id : text, field_id : text) -> (DecryptedPii);
  
  // Call is bounded-wait, no-cycles, and returns encrypted result
  forward_delete_pii : (pii_id : text, field_id : text) -> (DeleteResult);
  
  // No raw keys are ever returned
};
```

**Note:** DFINITY constraint record says vetKeys are not directly reachable across subnet boundaries with cycles. If protected hardware is used for child photo key derivation, a proxy must be deployed separately with bounded-wait contracts.

### Component 4: Audit Trail Extension

Protected hardware audit records include attestation evidence:

```motoko
type ProtectedAuditRecord = {
  timestamp : Nat64;
  requesting_principal : Principal;
  pii_id : Text;
  field_id : Text;
  operation : Text;
  hardware_attestation : {
    mode : text;  // "sev-snp", "tdx", etc.
    evidence : [Nat8];  // attestation report bytes
  };
  execution_proof : {
    execution_time_ms : Nat64;
    memory_isolation_verified : bool;
  };
};
```

---

## Phase 4: Staged Deployment Path

### Stage 1: Proof of Concept (Week 1–2)

1. **Infrastructure verification:**
   - Confirm SEV-SNP Cloud Engine capacity in target regions
   - Verify cost model and cycle pricing
   - Test bounded-wait, no-cycles protocol

2. **Canister deployment:**
   - Deploy identical Motoko `pii_access_control` to protected subnet
   - Run same test suite (Phase 1 tests pass on protected hardware)
   - Verify attestation report generation

3. **Prove equivalence:**
   - Deploy both ordinary and protected versions in parallel
   - Run identical workload against both
   - Verify results are identical
   - Measure latency and cost difference

### Stage 2: Placement Routing (Week 3–4)

1. **Update placement_registry:**
   - Add protected-engine variant to BackendPlacement enum
   - Implement policy decision based on club data class
   - Test routing in controlled environment

2. **Test failover:**
   - Protected engine unavailable → fall back to encrypted canister
   - Ordinary canister upgrades → no impact on protected engine
   - Cross-subnet calls use bounded-wait protocol

### Stage 3: Production Rollout (Week 5–6)

1. **Gradual migration:**
   - Opt-in for new clubs with child media
   - Existing clubs remain on ordinary or Supabase
   - Monitor cost, latency, and correctness

2. **Full adoption (optional):**
   - All PII eventually routes to protected hardware
   - Ordinary canister becomes audit-only or retired

---

## Phase 4: Candid Interface (Unchanged from Phase 1)

```candid
// Same interface as Phase 1 — no code changes required
service pii_access_control : {
  register_pii : (pii_id : text, field_id : text, plaintext : vec nat8, domain_owner : principal) -> (result EncryptedPii text);
  get_encrypted_pii : (pii_id : text, field_id : text) -> (opt EncryptedPii) query;
  get_decrypted_pii : (pii_id : text, field_id : text, operation : text, purpose : text) -> (result DecryptedPii text);
  delete_pii : (pii_id : text, field_id : text) -> (result PiiDeleteResult text);
  audit_access : (filter : AuditFilter) -> (vec AuditRecord) query;
  rotate_key : (new_key_id : text) -> (result KeyRotationResult text);
  get_key_metadata : () -> (KeyMetadata) query;
};
```

**Clients never need to know if they're calling protected hardware or ordinary canister.**

---

## Phase 4: Configuration File (Deployment-Time)

```toml
# icp.yaml — Phase 4 variant

[[canisters]]
name = "pii_access_control"
recipe.type = "@dfinity/motoko@v5.1.0"
recipe.configuration.main = "backend/pii_access_control/src/main.mo"
recipe.configuration.candid = "backend/pii_access_control/pii_access_control.did"

# Phase 1–3: Ordinary subnet
[environments.local]
network = "local"
canisters = ["pii_access_control", ...]
pii_storage_mode = "EncryptedInCanister"

# Phase 4: Protected hardware subnet
[environments.protected-hardware]
network = "protected-engine"
canisters = ["pii_access_control", ...]
pii_storage_mode = "ProtectedEngine"
# Same Motoko code; different execution environment
```

---

## Phase 4: No Breaking Changes

### Phase 1–3 Code Remains Unchanged

- `pii_access_control` Motoko implementation: **no refactoring**
- `secret_workload_identity`: **no refactoring**
- Domain canisters (club_domain, etc.): **no refactoring**
- Candid interfaces: **no breaking changes**
- Test suite: **same tests pass on both ordinary and protected hardware**

### Deployment Options

1. **Start with Phases 1–3 only:**
   - Deploy to ordinary subnet
   - All Motoko product domains work identically
   - Encrypted PII in stable memory
   - Move to Phase 4 later without code changes

2. **Skip directly to Phase 4 (if protected hardware is available):**
   - Deploy to protected-engine subnet
   - Same code, same interfaces, same tests
   - Plaintext PII protected by hardware attestation

3. **Run both in parallel:**
   - Ordinary subnet for existing clubs
   - Protected engine for new clubs with child media
   - Placement registry routes based on security level
   - Clients see identical Candid interface

---

## Phase 4: Success Criteria

1. **Transparency:**
   - Client code requires zero changes to use protected hardware
   - Candid interface is identical
   - Test suite passes on both ordinary and protected canisters

2. **Attestation:**
   - Protected canister generates and includes SEV-SNP attestation in audit records
   - Operator cannot read plaintext PII from memory

3. **Equivalence:**
   - Identical workload on protected and ordinary canisters produces identical results
   - Latency difference is documented and acceptable

4. **Failover:**
   - Protected engine unavailable → graceful fallback to ordinary canister
   - No data loss or corruption

5. **Compliance:**
   - Protected hardware deployment satisfies child safety and PII regulations
   - Audit trail includes hardware attestation evidence

---

## Next Steps (When Protected Hardware Becomes Available)

1. **Confirm SEV-SNP availability:**
   - Check DFINITY or Cloud Engine provider for regional capacity
   - Review pricing and SLA

2. **Stage 1 POC:**
   - Deploy pii_access_control to protected subnet
   - Run Phase 1 tests (exact same test suite)
   - Generate attestation reports

3. **Update placement_registry:**
   - Add protected-engine routing logic
   - Define club policy (e.g., "child media → protected engine")

4. **Gradual migration:**
   - Enable opt-in for new clubs
   - Monitor cost and performance
   - Move additional clubs as confidence increases

---

## Explicit Non-Goals (Phase 4)

- Do NOT refactor Phases 1–3 code
- Do NOT change Candid interfaces
- Do NOT deploy to protected hardware until DFINITY confirms capacity and policy
- Do NOT use protected hardware for testing; wait for production deployment confirmation
- Do NOT assume Cloud Engine cost model; review pricing before full rollout

---

## References

- [PII_ARCHITECTURE_REVISION_ANALYSIS.md](PII_ARCHITECTURE_REVISION_ANALYSIS.md) — Full security analysis and gap identification
- [DFINITY_CONSTRAINTS.md](DFINITY_CONSTRAINTS.md) — Hardware and cross-subnet call constraints
- [ICP_CANISTER_TOPOLOGY.md](ICP_CANISTER_TOPOLOGY.md) — Canister placement and control-plane routing
