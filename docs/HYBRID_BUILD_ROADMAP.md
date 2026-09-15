# Hybrid Build Roadmap

## Purpose

This roadmap is the concise status and sequencing view for the isolated
Supabase/ICP coexistence build. The detailed gates remain authoritative in
[HYBRID_RUST_MOTOKO_EXECUTION_PLAN.md](HYBRID_RUST_MOTOKO_EXECUTION_PLAN.md),
[NEXT_IMPLEMENTATION_PLAN.md](NEXT_IMPLEMENTATION_PLAN.md), and
[PARITY_IMPLEMENTATION_MATRIX.md](PARITY_IMPLEMENTATION_MATRIX.md).

The system remains coexistence-first:

- existing Supabase workloads stay authoritative and unchanged;
- only new or explicitly isolated workloads may be enabled on ICP;
- `?backend=supabase` preserves the existing frontend path;
- ICP mode must use a typed local actor/service, a synthetic fixture, or an
  explicit unavailable/read-only state;
- ICP mode never silently falls back to Supabase;
- no production credentials, data, deployment target, or integration is used
  by this lab.

## Current repository checkpoint

### Completed and evidenced

- The disposable local topology declares all 13 logical canister roles.
- Placement, shard routing, migration fencing, multi-site policy, and residency
  constraints have executable synthetic evidence.
- Rust infrastructure POCs and Motoko product/worker POCs exist behind
  committed Candid contracts.
- Local probes cover identity/access, club/team, events, competitions,
  messaging, media metadata, notifications, timers, migration coordination,
  PII policy, and secret workload identity.
- The deployed local topology has backup/checksum/restore evidence.
- Timer and notification implementations have upgrade/recovery evidence.
- The synthetic external-worker boundary covers scoped capabilities, retries,
  dead letters, and audit behavior without placing secrets in canister state.
- The frontend has a shared backend-mode resolver, fail-closed Supabase stub,
  network guard, restrictive CSP, fixture data layer, and provider-neutral
  Club Links service boundary.
- The current worktree has advanced direct-Supabase page coverage from 22 to
  all 99 guarded pages. Every such page now has an explicit ICP-mode provider
  boundary. The route-by-route source of truth is
  [lab-route-classification.json](../frontend/lab-route-classification.json).

### Current uncommitted frontend tranche

The current worktree adds or completes ICP-mode guards across the remaining
77 direct-Supabase application pages, including:

- club lifecycle: create, edit, join, setup, upgrade, and embedded links;
- team lifecycle: start, create, edit, claim, and join;
- event writes: create and edit;
- competitions: list, create, public view, detail, settings, and join;
- seasons: list, detail, and comparison;
- enrolment/EOI, roles, associations, reporting, and mini leagues;
- identity/recovery and administrative handoff routes;
- administration, messaging, media, notification, import, backup, billing,
  advertising, AI, and other external-integration boundaries.
- event list, detail, create, and edit now use typed signed local `events_domain`
  actor paths for basic event reads/writes; the list keeps an explicit local
  fixture fallback only when that canister is not configured.

These routes preserve their existing Supabase implementations when Supabase is
explicitly selected. ICP behavior currently falls into two categories:

1. typed local ICP service reads or basic writes where a signed canister
   boundary exists;
2. synthetic/read-only data where a safe fixture contract already exists; or
3. an explicit unavailable state that prevents the Supabase implementation
   from mounting.

This tranche does **not** mean those write workflows are connected to live ICP
domain actors. It establishes safe routing and no-fallback behavior first.

## What is still outstanding

| Workstream | Current state | Remaining outcome |
| --- | --- | --- |
| Frontend route classification | All 99 direct-Supabase pages have an explicit ICP-mode guard | Commit a route-by-route inventory classifying each as `hybrid`, `supabase_only`, `external_boundary`, or `not_enabled` |
| Frontend ICP connectivity | Club Links has the initial typed service/actor boundary; many pages use fixtures or unavailable states | Add typed identity, club/team, events, competition, messaging, media, notification, timer, and placement adapters and replace temporary page states |
| Placement-aware dispatch | Registry/router POCs and client foundations exist | Resolve site, target, version, backend, and shard before every domain operation; dispose identity-bound actors/caches on changes |
| Authorization parity | Inventories, matrix, evidence register, and broad synthetic tests exist | Promote all product/worker rows from `poc_needs_parity` using source-complete positive and negative evidence |
| Product-domain completeness | Representative live slices exist | Add missing pagination, idempotency, scale behavior, moderation/retention, complete workflows, and populated-state recovery |
| Privacy and child media | Policy and metadata boundaries exist | Approve and implement vetKeys/protected-engine encryption, encrypted byte storage, scanning, retention, rotation, revocation, and erasure |
| External integrations | Synthetic worker/vault boundary exists | Separately authorize and implement real vault, payment, email, push, media, third-party, and AI workers |
| Placement administration | Local contract/client/panel exists | Mount the authorized app-admin surface and prove country, target/version, audit, and multi-site isolation constraints |
| Operations and production readiness | Broad local durability evidence exists | Complete interrupted domain recovery, performance/cycle evidence, monitoring, runbooks, residency, security, mobile, and production approvals |

## Dependency-ordered next implementation

### Tranche 1: record and test safe frontend routing

1. Record the completed guard coverage in a route-by-route classification
   inventory.
2. Preserve the explicit classification of admin and external-integration
   pages rather than pretending they are ICP-capable:
   - payments, subscriptions, ads, OAuth/recovery, email, push, Drive/import,
     backups, AI, and provider settings remain `external_boundary`,
     `supabase_only`, or `not_enabled` until their approved boundary exists.
3. Expand route-level tests proving ICP mode does not mount or call Supabase and
   explicit Supabase mode retains existing behavior.

### Tranche 2: replace guards with provider-neutral services

Implement and wire typed adapters in this order:

1. identity, roles, memberships, guardians, exclusions, and invites;
2. club/team reads and writes, including creation and placement assignment;
3. event reads/writes, recurrence, RSVP, duties, attendance, and timers;
4. competitions, seasons, entries, divisions, fixtures, results, and join
   capabilities;
5. messaging, notifications, and media metadata;
6. placement administration and multi-site connection management.

Each adapter must use generated Candid bindings, authenticated actors,
placement resolution, bounded payloads/pages, explicit errors, and cache
disposal on identity/site/tenant/placement changes.

### Tranche 3: promote parity and production-shape evidence

For each connected domain:

1. map every relevant source policy, helper, RPC, Edge Function, and timer;
2. add positive and negative authorization tests;
3. prove idempotency, replay protection, pagination, limits, and failure
   behavior;
4. prove populated upgrade, backup/restore, and interrupted recovery;
5. update the parity matrix only when the evidence packet is complete.

### Tranche 4: separately approved infrastructure

Only after explicit privacy, security, residency, and infrastructure approval:

- encrypted child-media storage and vetKeys/protected-engine access;
- real vault and workload attestation;
- payment, email, push, third-party, media-processing, and AI workers;
- production subnet, cycle, monitoring, mobile, and operational gates.

## Definition of frontend completion

Frontend migration is complete only when:

- every routed page has a declared backend status;
- no hybrid ICP path imports or calls a provider SDK directly;
- every enabled ICP path uses a typed, authenticated, placement-aware service;
- unsupported paths are explicitly unavailable and make no provider request;
- provider-specific query caches cannot leak across backend/site/identity
  changes;
- browser tests prove both no-fallback ICP behavior and preserved Supabase
  behavior.

Guard coverage is an intermediate safety milestone, not proof of canister
connectivity or production parity.
