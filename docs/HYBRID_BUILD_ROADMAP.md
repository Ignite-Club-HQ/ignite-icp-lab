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
- ICP mode must use a typed authenticated actor/service or an explicit
  unavailable/read-only state; synthetic fixtures may support contract tests,
  but are not an application data provider;
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
- Route validation now also rejects a `hybrid` classification unless the page
  source contains an explicit local-mode, hybrid-service, or ICP-lab boundary
  marker, preventing inventory drift from being mistaken for connectivity.

### Completed frontend connectivity tranche

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
  actor paths for basic event reads/writes; event detail also writes self-RSVP
  decisions and assigned-duty claims to the local canister. The list/detail
  paths keep an explicit local fixture fallback only when that canister is not
  configured.
- local event creation and editing also apply the contract-supported daily,
  weekly, or monthly recurrence rule when an end date is supplied; generated
  child-event materialization and reminder/timer delivery remain outside this
  slice.
- event detail now reads local canister RSVP state into the existing response
  buckets and annotates matching rows with local attendance state and notes;
  child/guardian roster hydration and admin attendance summaries remain
  unavailable until their provider-neutral contract data exists.
- ICP event detail also lets the signed local attendee toggle their own
  present/absent state through `set_attendance`; admin roster and child
  attendance controls remain bounded until roster data is connected.
- the competitions list, detail, create, and join pages now use typed signed local
  `competition_domain` actor paths to read exported local state including team
  entries, seasons, matches, and join-token metadata; create the supported
  basic competition record; or claim a supported join token when that canister
  is configured.
- competition detail also exposes the contract-supported local season creation,
  match recording, and match-result controls; unsupported divisions,
  invitations, and broader membership administration remain explicit
  unavailable boundaries. It also exposes the supported local team-registration
  and join-token issuance mutations for existing team IDs.
- Team chat now reads and sends team messages through the authenticated local
  `messaging_domain` actor when ICP mode is selected, and uses the canister
  unread/read-receipt methods for the team badge and read state. Message
  delivery uses canister idempotency keys; unsupported profile, reaction,
  reply, and moderation features remain on their existing explicit boundaries.
- Media now uses the authenticated local `media_metadata` actor for asset,
  reaction, and comment reads/writes; if that actor is unavailable, the page
  fails closed rather than displaying synthetic content. Protected object
  storage, upload, moderation, retention, and child-media privacy remain
  outside this frontend slice and must be connected before those capabilities
  are enabled.

These routes preserve their existing Supabase implementations when Supabase is
explicitly selected. ICP behavior currently falls into two categories:

1. typed local ICP service reads or basic writes where a signed canister
   boundary exists;
2. synthetic/read-only data where a safe fixture contract already exists; or
3. an explicit unavailable state that prevents the Supabase implementation
   from mounting.

The connected slices are local-lab actor paths, not production deployments.
They remain subject to the parity, authorization, pagination, recovery, and
production-readiness gates below.

## What is still outstanding

| Workstream | Current state | Remaining outcome |
| --- | --- | --- |
| Frontend route classification | All 99 direct-Supabase pages have an explicit route inventory | Keep the inventory synchronized as pages move from fixtures to typed local services |
| Frontend ICP connectivity | Identity/access, events, competitions, and Team Chat have typed local actor slices; other pages retain fixtures or explicit boundaries | Extend typed adapters for remaining supported identity, club/team, competition, messaging, media, notification, timer, and placement workflows |
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
3. event reads/writes, remaining duty lifecycle, attendance, recurrence
   materialization, and
   timers;
4. remaining competition settings pages, organiser visibility and invitation
   flows, team-entry administration beyond basic registration, division UI,
   season/match mutations, fixtures,
   results, and complete join capabilities;
5. messaging, notifications, and media metadata (Team Chat basic reads/writes
   plus unread/read receipts are connected; deletion, reactions, replies, and
   moderation still require contract and page support);
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
