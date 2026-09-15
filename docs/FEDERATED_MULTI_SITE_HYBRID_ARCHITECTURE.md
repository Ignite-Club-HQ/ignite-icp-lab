# Supabase-to-ICP Migration and Federated Architecture Proposal

## Purpose and status

This document describes the existing Supabase-only architecture, the proposed
Internet Computer architecture, and the migration path between them. It is
intended as a review document for DFINITY and other architecture stakeholders.

The current state is Supabase-led. The future state is a domain-oriented ICP
deployment that can operate alongside Supabase during migration and can support
multiple regional or tenant sites. The future state is a proposal and design
baseline; the presence of a canister name or source directory does not by itself
mean that the corresponding production service has been deployed or reached
feature parity.

## Executive summary

### Current state: Supabase-only system of record

- Supabase Auth owns account authentication and session issuance.
- PostgreSQL is the authoritative transactional datastore.
- Row Level Security (RLS) is the primary authorization enforcement boundary.
- Supabase Storage owns uploaded objects and media persistence.
- Edge Functions provide privileged server-side workflows, integrations, and
  operations that must not run in an untrusted browser.
- Secrets are held in Supabase/server-side environment configuration or an
  external secret-management boundary; clients never receive service keys.

### Future state: ICP domain and control planes

The proposed architecture separates global control concerns from domain data:

- ICP canisters own selected domain state and authorization decisions.
- A placement registry and shard router resolve the authoritative backend for a
  club, tenant, workload, and residency profile.
- Identity and access is represented by a global account anchor with
  site-scoped grants and exclusions.
- Rust is preferred for control-plane, worker, interoperability, and
  security-sensitive services; Motoko remains a supported option for compact
  domain canisters and equivalent reference implementations.
- Supabase remains an explicit provider during migration and may remain a
  supported regional or external provider in the federated model.
- No automatic dual-write, silent fallback, or cross-site authority is assumed.

### Architectural decision requested from DFINITY

Feedback is requested on the viability and recommended implementation of:

1. domain canister boundaries and Rust/Motoko language placement;
2. authenticated frontend-to-canister and canister-to-provider flows;
3. RLS-to-canister authorization parity and migration verification;
4. HTTPS outcalls, secret injection, retries, and external integrations;
5. subnet, cycle, upgrade, backup, and regional-residency implications; and
6. the proposed coexistence and cutover strategy.

## Current state: Supabase-only architecture

```text
Browser / mobile clients
          |
          v
   Supabase Auth session
          |
          +--> PostgreSQL + RLS  <--> Storage
          |
          +--> Edge Functions --> external services / workers
          |
          +--> Realtime / generated APIs where applicable
```

### Current ownership model

| Capability | Current authority | Security boundary |
|---|---|---|
| Identity and sessions | Supabase Auth | JWT/session validation |
| Transactional data | PostgreSQL | RLS policies, constraints, transactions |
| Object and media data | Supabase Storage | Storage policies and signed URLs |
| Privileged workflows | Supabase Edge Functions | Server-side function authorization |
| External integrations | Edge Functions or workers | Server-side secrets and outbound policy |
| Tenant/club authorization | PostgreSQL roles, grants, exclusions, RLS | Database policy evaluation |

The frontend should be treated as an untrusted caller. Direct database access,
where used, is constrained by the authenticated session and RLS. Operations
requiring service-role access, external credentials, or multi-step invariants
belong behind Edge Functions or another trusted backend boundary.

## Migration objective and invariants

The migration is not a wholesale database rewrite. It is a controlled transfer
of authority from Supabase tables and functions to domain canisters, with
explicit evidence for each capability.

The following invariants apply throughout the migration:

- one authoritative writer exists for each domain slice at any point in time;
- authorization decisions remain fail-closed and tenant-scoped;
- identifiers and audit history remain traceable across providers;
- retries are idempotent and do not create duplicate mutations;
- secrets and PII do not enter frontend bundles or ordinary canister stable
  memory;
- migration can be paused or rolled back at a domain boundary; and
- no production cutover occurs based only on fixture tests or compilation.

## Proposed future state: ICP control and domain planes

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

## Migration plan

### Phase 0: inventory and contract freeze

Capture the existing schema, foreign keys, constraints, RLS policies, storage
policies, Edge Functions, timers, webhooks, secrets, external integrations,
and data-residency assumptions. Freeze public identifiers and define the
canonical domain contracts before moving authority.

### Phase 1: introduce provider-neutral contracts

Place a provider adapter between application workflows and Supabase. The
adapter resolves a placement and exposes domain operations rather than raw
Supabase queries. Supabase remains the only writer. Add correlation IDs,
idempotency keys, audit events, and parity fixtures at this stage.

### Phase 2: build shadow ICP domains

Deploy the relevant canisters with synthetic or replicated test data. Exercise
the same authorization cases against Supabase RLS and the canister policy
engine. Compare reads, rejected writes, invariants, ordering, and audit output.
Shadow execution must not mutate the production authority.

### Phase 3: bounded migration and dual-read verification

Migrate data by domain slice and placement, preserving source IDs and recording
source version, migration batch, and checksum. Reads may compare Supabase and
ICP results, but discrepancies are surfaced rather than silently reconciled.
Any temporary dual-write requires an explicit protocol, an idempotency key, and
an operator-visible repair queue.

### Phase 4: canary authority transfer

Select a bounded tenant or club slice. Route writes to ICP, retain Supabase as
read-only or rollback authority according to the runbook, and monitor policy
parity, latency, cycle consumption, upgrades, retries, and external effects.

### Phase 5: domain cutover

Transfer one domain and placement at a time. The placement registry records the
authoritative writer and version. Clients use the provider-neutral adapter, so
the cutover does not require embedding backend-specific assumptions in every
workflow.

### Phase 6: coexistence, decommissioning, and recovery

Keep Supabase available for domains not yet migrated and for approved external
sites. Decommission a Supabase capability only after retention, export,
recovery, audit, and operational ownership have been accepted. Recovery must
restore a known versioned authority, not create an untracked second writer.

## Proposed canister inventory

The following is the proposed logical inventory. Rust and Motoko entries are
alternative or complementary implementations of the same domain boundary,
not a claim that every entry is already deployed.

| Canister/domain | Proposed responsibility | Language direction |
|---|---|---|
| `identity_access` | Global account anchor, site-scoped grants, exclusions, and authorization context | Rust control-plane candidate |
| `placement_registry` | Site, residency, backend target, health, and authority metadata | Rust control-plane candidate |
| `shard_router` | Resolve domain/tenant/workload placement and route requests | Rust control-plane candidate |
| `club_domain` / `club_domain_motoko` | Club aggregate and club-scoped invariants | Rust and Motoko implementations |
| `club_links_motoko` | Club link relationships and link-specific operations | Motoko domain candidate |
| `competition_domain` / `competition_domain_motoko` | Competition lifecycle and participation state | Rust and Motoko implementations |
| `events_domain` / `events_domain_motoko` | Event scheduling, attendance, and event state | Rust and Motoko implementations |
| `media_metadata` / `media_metadata_motoko` | Metadata and references for off-chain media objects | Rust and Motoko implementations |
| `messaging_domain` / `messaging_domain_motoko` | Conversations, messages, and delivery state | Rust and Motoko implementations |
| `notification_queue` / `notification_queue_motoko` | Durable notification intents and retry state | Rust and Motoko implementations |
| `migration_coordinator` | Batches, checkpoints, checksums, replay, and cutover state | Rust worker/control candidate |
| `pii_access_control` | Purpose-bound PII capabilities and protected access decisions | Rust security boundary candidate |
| `secret_workload_identity` | Workload identity and scoped authorization to external secret delivery | Rust security boundary candidate |
| `timer_jobs` | Scheduled domain jobs and retryable maintenance triggers | Rust worker candidate |

The domain canisters should own domain invariants, not arbitrary cross-domain
SQL joins. Cross-domain workflows should use explicit Candid interfaces and
stable event or command contracts. Large media remains off-chain; the canister
stores metadata, authorization context, content hashes, and provider references.

## RLS and authorization parity

The current RLS model is the behavioral source of truth during migration. Each
policy should be classified before implementation as one or more of:

- identity/session validation;
- tenant, club, or team membership;
- role grants and explicit exclusions;
- row ownership or creator access;
- state-transition permission;
- service-role or trusted-worker access; and
- field or PII access.

The ICP equivalent is an authorization function at the canister boundary,
backed by the global account anchor, site/tenant/club context, role grants,
exclusions, and the requested operation. A canister must reject unauthorized
commands before mutation and must not rely on frontend filtering. For every
ported policy, parity evidence should include allowed and denied cases,
cross-tenant negative cases, role changes, deletion behavior, and concurrent
state transitions.

RLS does not transfer automatically to ICP. PostgreSQL policy SQL is therefore
an input to a tested policy specification, not executable canister logic. The
migration should retain a policy-to-operation matrix mapping each table and
policy to its owning canister method, caller context, and test evidence.

## Edge Function and worker mapping

Supabase Edge Functions currently provide the trusted execution boundary for
operations that should not be performed by a browser. In the proposed model,
each function is classified before migration:

| Existing function category | Proposed destination |
|---|---|
| CRUD with domain invariants | Domain canister update/query method |
| Multi-table transaction | One owning domain canister, or an explicit saga/coordinator |
| Authenticated privileged operation | Canister method with caller and role checks |
| Scheduled job | `timer_jobs` plus the owning domain/queue canister |
| Retryable notification | `notification_queue` and an external delivery worker |
| Webhook or external API call | HTTPS outcall or provider-neutral worker boundary |
| File/media processing | External worker; metadata and authorization in ICP |
| Administrative migration | `migration_coordinator` with checkpointed batches |

An Edge Function should not be ported line-for-line when its real purpose is a
database transaction, policy check, or queue transition. Those responsibilities
belong in the owning canister. Functions that contain non-deterministic network
calls, large payload processing, or vendor SDK behavior may remain external and
be invoked through an authenticated, idempotent boundary.

## Secret and integration mapping

Secrets are operational capabilities, not application data. They remain outside
frontend bundles and ordinary canister stable memory.

| Secret/integration | Current location | Proposed location and access |
|---|---|---|
| Supabase anon/public configuration | Frontend configuration | Public provider metadata only; never treated as authorization |
| Supabase service-role key | Edge Function/worker secret configuration | External vault or protected worker; never frontend or canister state |
| Site-specific database credentials | Supabase/server-side environment | Vault partitioned by `(site_id, service)` |
| OAuth, webhook, email, and push credentials | Edge Function or worker secrets | Operation-scoped worker identity and vault lease |
| ICP caller identity | User or workload principal | Authenticated actor and canister authorization context |
| PII encryption capability | Protected access boundary | Purpose-bound capability, with protected processing/vetKeys design subject to DFINITY review |
| Migration credentials/checkpoints | Migration operator boundary | `migration_coordinator` receives scoped workload authorization, not raw provider passwords |

The `secret_workload_identity` boundary authenticates a workload and requests a
specific operation-scoped secret. The secret is used at the external boundary
and is not persisted in canister stable memory. HTTPS outcalls must define
bounded request and response sizes, timeout/retry behavior, idempotency, and
failure handling. A failed external delivery is recorded as a durable outcome;
it is never silently treated as successful.

## Operational and deployment considerations

- Canister upgrades require stable-state compatibility, versioned Candid
  interfaces, rollback planning, and migration of serialized state.
- Placement decisions must account for subnet capacity, cycles, latency,
  jurisdiction, disaster recovery, and the consistency model of cross-domain
  calls.
- Cross-site calls use explicit target identity, authorization, timeout, and
  idempotency metadata. They do not create implicit trust between tenants.
- Cross-site PII is minimized and encrypted under a purpose-bound policy. A
  global account ID is a reference, not permission to read another site's data.
- Observability must correlate frontend request, provider target, principal,
  domain command, migration batch, and external side effect.

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
