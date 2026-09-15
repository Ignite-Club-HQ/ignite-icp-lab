# Federated and Multi-Site Hybrid Architecture

## Purpose

This architecture document specifies how the Ignite hybrid system communicates
with and coordinates between multiple Supabase instances (secondary/external
Supabase sites) and partner/remote hybrid sites (sites running both Supabase and
ICP backends).

This is a synthetic lab specification. It introduces no production credentials,
endpoints, real user data, or live network calls into this repository.

## Supported site topologies

The system supports three distinct target topologies within the placement and
routing control plane:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Global Control Plane                             │
│        (Placement Registry + Shard Router + Identity/Access Canister)       │
└──────────────┬──────────────────────────────┬───────────────────────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────────────────────┐
│      Site A (Core Site)      │ │   Site B (Secondary Supabase Only)         │
│  - Supabase Primary Instance │ │   - Independent Regional/Tenant Supabase   │
│  - ICP Canister Cluster      │ │   - External API / Auth / Storage          │
└──────────────────────────────┘ └────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Site C (Secondary Hybrid Site)                           │
│  - Site C Supabase Instance                                                 │
│  - Site C ICP Canister Cluster (Regional Shards / Domain Canisters)         │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Core Hybrid Site (Site A)**:
   - Primary Supabase environment.
   - Core ICP canister cluster (Rust control plane/workers + Motoko/Rust domain
     canisters).
2. **Secondary Supabase-Only Site (Site B)**:
   - Independent external Supabase project (regional tenant, affiliate, or
     isolated enterprise environment).
   - Communicates via client-side provider routing or backend HTTPS outcalls.
3. **Secondary Hybrid Site (Site C)**:
   - Contains its own Supabase instance AND its own ICP canister deployment.
   - Communicates via client-side multi-placement routing, inter-canister
     Candid calls (if on the same or federated ICP network), or HTTPS outcalls.

## Target model and placement registry extension

The placement registry targets are identified by `target_alias`, `site_id`,
`backend_type`, and `residency_profile`:

```text
Target:
  alias: "supabase-site-b-eu"
  site_id: "site-b"
  profile: "EU_FRANKFURT"
  backend: Supabase { environment: "site-b-production" }
  deployment_class: "managed_supabase"
  enabled: true
  healthy: true
  version: 1

Target:
  alias: "hybrid-site-c-icp"
  site_id: "site-c"
  profile: "US_WEST"
  backend: Icp { canister: principal "..." }
  deployment_class: "cloud_engine"
  enabled: true
  healthy: true
  version: 1
```

### Routing rules across multiple sites

1. **Single Authoritative Writer**: For any given club/workload and domain
   slice, exactly one backend target on one site is authoritative at a time.
2. **Independent Availability Switches**: Every site and backend target has an
   independent availability switch (`site_a_enabled`, `site_b_enabled`,
   `site_c_supabase_enabled`, `site_c_icp_enabled`). If Site B experiences an
   outage, operations targeting Site B fail closed without affecting Site A.
3. **No Cross-Site Dual-Writes**: Data is never automatically dual-written or
   mirrored across sites without a verified, versioned replication protocol.
4. **No Silent Fallback**: If an operation targeting Site B's Supabase or Site
   C's ICP canisters fails, the provider adapter returns an explicit error; it
   never silently reroutes to Site A.

## Interoperability and communication mechanisms

### 1. Client-side multi-provider routing (frontend / edge)

The provider-neutral client adapters resolve the target site and backend from the
Placement Registry before dispatching requests:

```text
Client Request (club_id, domain)
  │
  ▼
Placement Registry ──> Resolves (site_id, target_alias, backend_type, state)
  │
  ├──> If target is Site A Supabase ──> Dispatch to Site A Supabase client slot
  ├──> If target is Site A ICP      ──> Dispatch to Site A ICP actor
  ├──> If target is Site B Supabase ──> Dispatch to Site B Supabase client slot
  ├──> If target is Site C Supabase ──> Dispatch to Site C Supabase client slot
  └──> If target is Site C ICP      ──> Dispatch to Site C ICP actor
```

- Each site maintains an isolated client connection pool and session cache.
- Switching active clubs/tenants disposes cached actors and authentication tokens
  to prevent cross-site identity leakage.

### 2. Canister-to-Canister communication (ICP Site A ↔ ICP Site C)

When two hybrid sites run ICP canisters on the Internet Computer:

- **Same / Federated Subnets**: Cross-canister asynchronous Candid calls with
  explicit error handling, timeouts, and cycle management.
- **Cross-Network / Multi-Replica**: Signed HTTPS outcalls with consensus
  verification, bounded response size, and no cycles in payloads.
- **Idempotency**: All cross-canister mutations require caller-supplied
  idempotency keys and mutation sequence tracking.

### 3. Canister-to-External-Supabase communication (ICP Canister → Site B Supabase)

When an ICP canister must push data or notify an external Supabase instance:

- Uses ICP HTTPS Outcalls to the external site's authenticated REST/Edge
  endpoint.
- **Security & Secret Handling**: Outcall credentials (API tokens/service keys)
  are injected via an approved external vault/worker proxy or HTTP header
  transformation; raw vault secrets are never stored in canister stable memory.
- **Consensus & Bounded-Wait**: Requests must be deterministic, bounded in size,
  and handle network retries idempotently.

## Identity and access federation

```text
                          Application Account ID (Global)
                                        │
           ┌────────────────────────────┼───────────────────────────┐
           ▼                            ▼                           ▼
Site A Supabase Identity    Site B Supabase Identity    Internet Identity (ICP)
(auth.users.id: UUID A)     (auth.users.id: UUID B)     (Principal: ...)
```

1. **Global Account Anchor**: Users have a single application account ID in
   `identity_access` mapped to credentials across Site A, Site B, and ICP.
2. **Site-Scoped Roles & Exclusions**: Role grants and exclusions explicitly
   include `site_id` in addition to `club_id` and `team_id`:
   `RoleGrant { site_id, club_id, team_id, role, account_id }`.
3. **Tenant Isolation**: An administrator on Site B has no implicit access to
   Site A or Site C unless granted a multi-site role by the control-plane
   governor.
4. **vetKeys for Cross-Site PII**: Any PII shared between sites must use
   vetKeys-derived ciphertext or an approved protected-processing boundary,
   governed by purpose-bound access capabilities.

## Multi-site vault and secret boundary

- Credentials for Site A Supabase, Site B Supabase, and Site C external
  integrations are partitioned in the external vault by `(site_id, service)`.
- Ordinary domain canisters and worker queues never hold database passwords,
  service keys, or webhook secrets for any site.
- Outbound delivery workers (push, email, webhook) request operation-scoped
  credentials from the vault with strict least-privilege scoping.

## Required implementation gates

- [ ] Add `site_id` and multi-target descriptors to `placement_registry` and
      `shard_router`.
- [ ] Implement multi-provider client connection slots in the frontend adapter
      layer (supporting Site A Supabase, Site B Supabase, Site A ICP, Site C ICP).
- [ ] Add multi-site negative tests: verify that disabling Site B leaves Site A
      fully operational and that cross-site tenant escalation is rejected.
- [ ] Verify that cross-site canister HTTPS outcalls adhere to the bounded-wait,
      no-cycles, and secret-free canister rules.
- [ ] Verify that cross-site PII encryption uses vetKeys capabilities without
      storing raw keys across site boundaries.
