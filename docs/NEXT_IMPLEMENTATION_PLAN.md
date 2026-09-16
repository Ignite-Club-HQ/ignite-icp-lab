# Detailed Implementation Plan: 13-Role ICP Hybrid Topology

## Purpose

This is the authoritative follow-on plan after the cross-domain RLS audit and
topology decision. It is scoped to `/workspaces/ignite-icp-lab` only.

The consolidated Rust/Motoko execution sequence is maintained in
[HYBRID_RUST_MOTOKO_EXECUTION_PLAN.md](HYBRID_RUST_MOTOKO_EXECUTION_PLAN.md).
Use that document for the ordered implementation gates; this file retains the
detailed role-specific requirements.

The target is a coexistence-only hybrid system:

- Existing Supabase workloads remain authoritative and unchanged.
- New ICP workloads use independent placement, identity, storage, and
  authorization boundaries.
- No Supabase data migration, replication, cutover, deletion, or production
  credential wiring is performed in this plan.
- Payments, secrets, email/push delivery, Drive/PlayHQ/Google integrations,
  and LLM calls remain external capability boundaries.
- PII is a separate privacy boundary: encrypted PII may be held by an owning
  domain only after the vetKeys/protected-engine decision is approved; vault
  credentials remain external and are never ordinary canister state.

## Current baseline

### Logical topology

The selected baseline is 13 logical canister roles, as defined in
[ICP_CANISTER_TOPOLOGY.md](ICP_CANISTER_TOPOLOGY.md):

1. `placement_registry`
2. `shard_router`
3. `identity_access`
4. `club_domain`
5. `events_domain`
6. `competition_domain`
7. `messaging_domain`
8. `media_metadata`
9. `notification_queue`
10. `timer_jobs`
11. `migration_coordinator`
12. `pii_access_control`
13. `secret_workload_identity`

### Implemented in the repository

- All 13 logical roles are declared in `icp-domain-topology.json` and in the
  disposable `local` environment in `icp.yaml`.
- Rust control-plane/infrastructure implementations exist for placement,
  routing, identity, and timers.
- Motoko product/worker implementations exist for club, events, competitions,
  messaging, media metadata, notifications, migration coordination, PII
  access, and secret workload identity.
- Rust reference implementations remain where required for equivalent
  Rust/Motoko behavior, upgrade, and performance comparison.
- Live local probes cover placement/federation, identity, club, events,
  competitions, messaging, media, notifications, timers, worker capabilities,
  and selected upgrade/recovery behavior.
- The full local topology has backup/checksum/restore evidence.
- Provider-neutral frontend foundations, synthetic Supabase/ICP adapters,
  placement-admin controls, and fixture-backed page migration are in progress.
- RLS, Edge Function, PII-field, parity, and evidence inventories are present.

### Immediate structural gaps

- Domain implementations remain POCs until their complete source authorization
  and automation parity rows are promoted.
- Events, competitions, messaging, and media still need complete pagination,
  idempotency, scale, moderation/retention, and domain-specific upgrade/recovery
  evidence.
- Notification and timer workers need complete recipient/preference/domain
  parity and production scheduler/provider evidence.
- The privacy boundary still needs approved vetKeys/protected-engine, encrypted
  byte storage, scanning/moderation, key lifecycle, and vault integration.
- The synthetic external-worker boundary exists, but real provider/vault
  infrastructure remains outside the lab.
- Frontend route migration is classified for all 99 application pages that
  directly import Supabase: 73 are `hybrid`, 21 are explicit
  `external_boundary`, and 5 remain `supabase_only`. The remaining frontend
  work is replacing fixture/read-only hybrid branches with typed,
  authenticated, placement-aware services where a supported contract exists.
- Placement-admin controls work in the lab but are not mounted as the complete
  application admin workflow.
- Local topology durability is proven broadly; domain-specific interrupted
  route/migration recovery and production operations evidence remain.

## Priority order

### Upcoming parity phase: RLS, authorization, Edge Functions, and timers

The source mappings are complete in
[RLS_DOMAIN_INVENTORY.md](RLS_DOMAIN_INVENTORY.md) and
[EDGE_FUNCTION_AND_TIMER_INVENTORY.md](EDGE_FUNCTION_AND_TIMER_INVENTORY.md).
The working status and evidence matrix is
[PARITY_IMPLEMENTATION_MATRIX.md](PARITY_IMPLEMENTATION_MATRIX.md).
Implementation and proof of parity is an upcoming gate, not completed work.
Each domain must map source policies/helpers/RPCs and each Edge Function or
scheduled workflow to an ICP method, durable worker/timer, external trusted
worker, or explicit Supabase-only boundary. Evidence must include positive and
negative authorization tests, caller capabilities, site/domain scope,
idempotency, retry/timeout/compensation, residency, and failure-closed
behavior. A compiled canister or routing POC is not parity evidence.

Privacy/storage follow-up in the same upcoming workstream:

- use [PII_FIELD_CLASSIFICATION_MATRIX.md](PII_FIELD_CLASSIFICATION_MATRIX.md)
  as the initial field-level classification artifact;
- convert the domain inventory into a field/column-level PII matrix with
  owner, retention, residency, encryption requirement, and allowed boundary;
- keep `media_metadata` as the separate metadata/capability canister and keep
  photo/file bytes in an external or separately approved encrypted storage
  boundary;
- implement vetKeys/protected-hardware integration only after trust, residency,
  and funding decisions are approved;
- add encrypted chunk transfer, scanning/moderation, key rotation, erasure,
  and vault-adapter tests before enabling child-photo or production PII paths.

Placement settings follow-up:

- promote the synthetic placement settings panel into an app-admin/placement-
  admin-only live application route;
- connect it to placement-registry Candid methods through a typed admin adapter;
- require authoritative club country assignment and enforce country-approved
  backend/target/version constraints server-side;
- keep device locale and signup-region detection advisory only;
- add policy confirmations, audit history, optimistic version handling, site
  availability controls, and multi-site connection/cache isolation.

### Phase 0: Lock the architecture and generated contracts

**Goal:** make the 13-role topology mechanically discoverable and prevent
partial deployment from being mistaken for a complete system.

Tasks:

- Keep [icp-domain-topology.json](../icp-domain-topology.json) as the machine-
  readable role registry.
- Add a topology validation script that checks every role has:
  - a backend path;
  - a Candid file or an explicit `external_boundary` status;
  - a Cargo workspace member when status is `poc` or `implemented`;
  - a RLS parity record or an explicit `not_enabled` gate.
- Add a generated local manifest for all implemented canisters.
- Separate `icp.yaml` environments into:
  - `local-control-plane`;
  - `local-domain-pocs`;
  - `local-full-lab`.
- Keep the default local environment disposable and loopback-only.
- Keep local lifecycle backup/restore coverage aligned with every deployed
  canister and add domain-specific interrupted recovery cases.
- Add Candid drift checks for every implemented crate.

Acceptance:

- A single check fails if a topology role is missing a declared implementation
  status or if a deployed Candid file differs from generated service output.
- Existing Club Links local startup remains unchanged.
- No production URL, credential, or deployment target is accepted.

### Phase 1: Identity and access canister

**Role:** `identity_access`

**Owns:** synthetic ICP accounts, linked principals, account versions,
application roles, club/team membership projections, guardians, exclusions,
invite capabilities, and profile visibility decisions for new ICP workloads.

Tasks:

- Create `backend/identity_access` crate and Candid contract.
- Move the reusable account/linking model out of the Club Links implementation
  without changing the Club Links stable schema until a compatibility adapter
  exists.
- Implement bounded account, principal, role, guardian, exclusion, and invite
  records in stable memory.
- Enforce anonymous rejection, account version conflicts, revocation, duplicate
  principal prevention, club/team scope, app-admin scope, and exclusion
  precedence.
- Add queries for authorization facts that do not expose unrelated account data.
- Add domain-local authorization helpers; callers must not trust frontend role
  claims.
- Add snapshot/restore and post-upgrade tests.

RLS gate:

- Cover `has_role`, `is_club_member`, `is_team_member`, parent/guardian access,
  app-admin bypass, club/team exclusions, and invite ownership.

PII and secret boundary gate:

- Classify profile, child, guardian, contact, account-link, and recovery fields.
- Keep PII access policy in `identity_access`, but keep encryption capability
  and vault secret custody separate from authorization state.
- Add purpose-bound, scope-bound, expiry-bound PII access decisions with
  consent, revocation, retention, export, and erasure semantics.
- Do not enable production PII until the vetKeys/proxy or protected-engine
  path, residency, key rotation, and external vault boundary are approved.

Acceptance:

- Positive and negative tests match the reusable rules in
  [AUTHORIZATION_RLS_PARITY.md](AUTHORIZATION_RLS_PARITY.md).
- Club Links can use the service through an injected adapter without changing
  existing user-visible behavior.
- No existing Supabase account is linked or imported.

### Phase 2: Club domain canister

**Role:** `club_domain`

**Owns:** Club Links, clubs, teams, club configuration, sponsors, and low-risk
club settings for newly provisioned ICP workloads.

Tasks:

- Preserve the current Club Links stable memory schema and Candid contract.
- Add a separate club-domain crate or versioned module for clubs/teams/config.
- Route all Club domain reads/writes through placement and shard routing.
- Resolve identity/access authorization inside the domain boundary.
- Add same-club relationship validation for teams, sponsors, and settings.
- Add bounded pagination and payload limits for all new collections.
- Add upgrade tests that prove Club Links memory regions are unchanged.

Acceptance:

- Existing Club Links tests remain green.
- A new ICP club can be created and configured without Supabase access.
- Cross-club mutation and excluded-member access fail closed.

### Phase 3: Events and training canister

**Role:** `events_domain`

**Owns:** events, schedules, attendance, RSVPs, lineups, duties, recurring
events, training defaults, drills, formations, and pitch state.

Tasks:

- Create `backend/events_domain` crate and Candid contract.
- Model event ownership by club/team and preserve child/guardian visibility.
- Implement event revision and idempotent mutation IDs.
- Implement roster, RSVP, duty, lineup, and coach/team-admin checks.
- Validate every team/event/club relationship before writes.
- Add bounded queries for event windows, attendance, and roster views.
- Attach `timer_jobs` only through explicit workflow capability calls.

RLS gate:

- Port `can_manage_event_groups`, `can_manage_game_result`, targeted-event
  access, RSVP role restrictions, child visibility, and team/club scope.

Acceptance:

- Cross-club event/team references are rejected.
- Parent/guardian access is limited to assigned children.
- Replayed writes return the original result and do not duplicate attendance,
  RSVP, or lineup rows.

### Phase 4: Competition canister

**Role:** `competition_domain`

**Owns:** competitions, leagues, seasons, divisions, entries, officials,
matches, fixtures, ladders, mini-leagues, and competition chats' ownership
metadata.

Tasks:

- Create `backend/competition_domain` crate and Candid contract.
- Use competition/league ownership as the shard key rather than assuming a
  single club owns all rows.
- Implement owner, league-admin, coordinator, official, team-entry, and
  participant capabilities.
- Implement join-token records with bounded lifetime, one-time claim, and
  replay protection.
- Add cross-club association checks and external match-edit fencing.
- Keep competition messaging payloads behind `messaging_domain`.

Acceptance:

- A club cannot mutate another club's competition-owned rows without an
  explicit competition role.
- Join tokens cannot be replayed or used outside their competition scope.
- Season/archive state transitions are versioned and audited.

### Phase 5: Messaging canister

**Role:** `messaging_domain`

**Owns:** conversations, messages, team/group membership, unread state,
receipts, reactions, replies, polls, reports, deletion records, and summaries'
metadata.

Tasks:

- Create `backend/messaging_domain` crate and Candid contract.
- Implement conversation ownership and participant membership.
- Use monotonically increasing per-conversation sequence numbers.
- Add caller-supplied idempotency keys and replay-safe sends.
- Add `list_after(sequence)` with bounded page size and stale-cursor errors.
- Add unread counters, read receipts, delivery acknowledgement, and retention
  state.
- Enforce author, participant, team, club-admin, app-admin, blocked-user, and
  moderator checks inside the canister.
- Keep message attachments as media capabilities, not embedded bytes.
- Add load tests for hot conversations and shard skew.

RLS gate:

- Port `can_access_chat`, `can_access_chat_group`, `can_post_in_chat_group`,
  `can_dm_user`, group membership, team-message admin exceptions, author-only
  mutation, blocked-user checks, and message deletion audit rules.

Acceptance:

- Ordering is deterministic under concurrent synthetic sends.
- A replayed idempotency key returns the original message.
- A user cannot read, acknowledge, delete, or react outside conversation scope.
- Unread and receipt updates remain bounded and recoverable after upgrade.

### Phase 6: Media metadata canister and storage boundary

**Role:** `media_metadata`

**Owns:** photo/file metadata, albums, comments, views, reports, access
capabilities, retention, deletion state, and attachment references.

Tasks:

- Create `backend/media_metadata` crate and Candid contract.
- Separate metadata authorization from file-byte storage.
- Implement album/club/team/event visibility and uploader/commenter rules.
- Issue bounded capability records for approved object-storage operations.
- Add chunk metadata, content length, checksum, MIME policy, and upload expiry.
- Add deletion/retention state and moderator/report visibility.
- Keep signed URLs, scanning, moderation, and storage credentials external.
- Add recovery tests proving metadata cannot reference an unapproved owner or
  attachment scope.

RLS gate:

- Port `can_view_album`, `can_access_chat_attachment`, uploader/commenter
  visibility, role-scoped upload, storage-prefix enforcement, and deletion
  authority.

Acceptance:

- No canister stores production storage credentials.
- A capability is scoped to one asset, one action, one owner, and an expiry.
- Cross-club asset access fails closed.

### Phase 7: Notification and timer promotion

**Roles:** `notification_queue`, `timer_jobs`

Tasks:

- Replace generic authenticated-only fencing with explicit internal capability
  records for domain enqueue, worker claim, acknowledgement, and recovery.
- Bind notification records to recipient, club, domain, and idempotency scope.
- Add recipient-only reads and preference checks.
- Add claim leases or ownership tokens to prevent two workers processing the
  same job concurrently.
- Add maximum attempts, terminal failure, retry backoff, and dead-letter state.
- Add timer workflow type, scope, and callback capability.
- Re-arm real timers from `post_upgrade` only after persisted schedule tests.
- Add external delivery adapters that never expose provider secrets to ICP.
- Notification and timer workers may request narrowly scoped vault operations,
  but must never receive or persist raw vault credentials. PII in payloads must
  be minimized or encrypted through the approved privacy boundary.

Acceptance:

- A normal user cannot claim or acknowledge worker records.
- A worker cannot process another region/domain without its capability.
- Interrupted claims recover without duplicate delivery beyond documented
  at-least-once semantics.

### Phase 8: Placement, routing, and local full-lab deployment

Tasks:

- Add domain identity to placement records, not only club/backend placement.
- Add domain-specific shard routes to `shard_router`.
- Reject a route whose target backend, residency profile, or health is invalid.
- Add route cache invalidation and identity-bound actor disposal to every client.
- Add local deployment of every implemented canister role through `icp.yaml`.
- Add multi-canister local actor bindings and synthetic init arguments.
- Add topology-wide snapshot/restore and upgrade probes.
- Add route reassignment tests that prove no duplicate or lost synthetic records.

Acceptance:

- A full local lab can start, deploy, exercise, back up, restore, and upgrade
  all implemented roles without production network access.
- A missing route, disabled target, or stale revision fails closed.
- Existing Supabase fixture paths remain isolated from ICP paths.

### Phase 9: Operations, residency, and production-readiness gates

Tasks:

- Verify exact subnet/residency targets per profile.
- Define cycle budgets, top-up policy, canister creation/retirement policy, and
  hot-shard thresholds.
- Add per-canister health, latency, queue backlog, storage, cycle, and upgrade
  metrics.
- Add operator approval workflow for placement, policy, health, and topology
  changes.
- Add incident runbooks for disabled backends, failed upgrades, stuck claims,
  corrupted snapshots, and route fencing.
- Run security review, dependency review, and mobile/background validation.
- Keep production credentials and deployment identities outside the repository.

Acceptance:

- Every production-readiness gate in Step 16 of the hybrid plan has evidence.
- No production workload is enabled based only on a passing unit test.
- Supabase remains unchanged and authoritative for all existing workloads.

### Phase 10: PII, vetKeys, and vault boundary

**Goal:** protect PII without turning ordinary replicated canister state into a
secret store.

Tasks:

- Classify every PII field, purpose, retention period, residency, and deletion
  requirement.
- Select vetKeys, an approved protected engine, or an external authority for
  each PII class.
- If vetKeys are accessed across a subnet boundary, deploy and fund a separate
  proxy canister with an explicit Candid API, trust boundary, residency, and
  failure behavior.
- Define vault workload identities and least-privilege operations for storage,
  push, email, payment, OAuth, webhook, and third-party integrations.
- Add PII access capabilities bound to account, domain, purpose, action, and
  expiry; never return raw key or vault secret material.
- Add consent, revocation, erasure, key rotation, audit, upgrade, snapshot,
  restore, and unavailable-service tests.
- Prove that missing key/vault services fail closed and never fall back to
  plaintext or an unapproved provider.

Acceptance:

- No production PII, vault credential, raw vetKeys material, or secret value is
  present in ordinary canister state, Candid arguments, frontend bundles, or
  repository fixtures.
- A PII read requires both authorization policy and the approved encryption
  capability path.
- Vault consumers receive only a bounded operation result, never credentials.
- Residency, operator trust, key rotation, erasure, and recovery evidence are
  recorded before production enablement.

## Explicitly out of scope

The following are not gaps to solve by adding ordinary canisters:

- migrating or copying existing Supabase data;
- dual-writing existing Supabase domains;
- storing payment, OAuth, push, storage-signing, or third-party secrets in
  stable memory;
- replacing payment provider authority;
- putting email, push, Drive, PlayHQ, Google, or LLM calls directly into an
  unrestricted public canister method;
- treating a frontend role, country, or placement cache as authorization;
- claiming production residency or security without operator evidence.

## Definition of done

The topology is ready for a new ICP workload only when:

1. Its logical role exists in `icp-domain-topology.json`.
2. Its backend crate and Candid contract are present.
3. Its placement and shard route are explicit.
4. Its source RLS inventory and domain parity record are complete.
5. Every update performs in-canister authorization.
6. Stable-memory upgrade, snapshot, restore, and recovery tests pass.
7. Provider-neutral frontend and external-worker contracts pass fail-closed tests.
8. Residency, cycle, monitoring, and incident ownership are documented.
9. The workload is new or explicitly isolated; no existing Supabase workload is
   silently reassigned.

## Current next action

The current dependency-ordered work is:

1. finish classifying and migrating frontend routes through provider-neutral
   domain services, beginning with club/team/event/competition create-edit-join
   and membership/role administration;
2. promote parity rows in domain order using source references and executable
   positive/negative evidence;
3. complete domain pagination, idempotency, moderation/retention, scale, and
   populated-state upgrade/recovery behavior;
4. finish the approved privacy, encrypted-media, vetKeys/protected-engine, and
   vault boundaries;
5. finish placement-admin application integration, multi-site cache/session
   isolation, and domain-route dispatch;
6. complete external-worker, operations, measurement, mobile, residency,
   security, and production-readiness gates.

The authoritative current status and acceptance details are maintained in
the “Detailed remaining-work backlog” in
[HYBRID_RUST_MOTOKO_EXECUTION_PLAN.md](HYBRID_RUST_MOTOKO_EXECUTION_PLAN.md).

## Integrated hybrid-plan crosswalk

This crosswalk incorporates the earlier porting, RLS, Edge Function, residency,
client, operations, and production-readiness plans into this topology plan.

### Foundation: Steps 1-6

**1. Ownership model:** Keep [DOMAIN_OWNERSHIP_MODEL.md](DOMAIN_OWNERSHIP_MODEL.md)
authoritative. Define one writer per workload, shared versus club-local scope,
competition ownership, profile ownership, notification-record ownership, and
media metadata versus byte-storage ownership. Existing Supabase workloads stay
immutable and authoritative.

**2. Placement control plane:** Extend `placement_registry` with domain-aware
placement, residency profile, target health, approval workflow, audit, kill
switches, idempotent commands, and stale-version rejection. Test active,
read-only, blocked, disabled, unhealthy, country-denied, and recovery states.

**3. Provider-neutral application layer:** Define one service contract per
topology role. Every operation resolves placement and shard, clears identity-
bound caches, respects read-only state, and fails closed on missing routes,
stale decisions, disabled backends, and provider errors. UI components must not
call Supabase or ICP SDKs directly.

**4. ICP domain canisters:** The planned domain canisters now exist as local
POCs. Promote them by completing bounded schemas, indexes, pagination,
in-canister authorization, idempotency, snapshots, upgrade tests, recovery
probes, and source-parity evidence. Do not copy PostgreSQL tables blindly.

**5. Topology and delivery:** Add implemented roles to local manifests and
lifecycle orchestration. Define shard creation/retirement, hot-workload
isolation, cycle budgets, upgrade sequencing, residency, backups, rollback, and
recovery ownership. Measure real local canister behavior before capacity claims.

**6. Separate identity:** Implement `identity_access` first. Select the
canonical Internet Identity origin; support account IDs, linked principals,
session persistence, revocation, recovery, audit, and mobile authentication
design. Do not link or migrate production Supabase users.

### Domain and automation: Steps 7-10

**7. RLS parity:** Use [RLS_DOMAIN_INVENTORY.md](RLS_DOMAIN_INVENTORY.md) as
the source inventory and create a parity record for every domain before
enablement. Test anonymous, outsider, app-admin, scoped-admin, parent,
guardian, excluded, cross-club, ownership, stale-version, and replay cases.
Worker, webhook, cron, and service-role callers must be explicit capabilities.

**8. Messaging:** Implement `messaging_domain` with conversation ownership,
participants, sequence IDs, idempotent sends, incremental reads, unread state,
receipts, reactions, replies, polls, deletion, retention, moderation, and
attachment capabilities. Prove ordering, hot-conversation load, polling,
offline retry, background refresh, notification refresh, and mobile behavior.

**9. Media:** Implement `media_metadata` before moving bytes. Separate metadata,
capabilities, object storage, scanning, moderation, deletion, retention,
certification, and signed access. Test chunking, resumable transfer, checksums,
expiry, file limits, and cross-club denial. Storage credentials stay external.

**10. Edge Functions and database automation:** Classify every item in
[EDGE_FUNCTION_AND_TIMER_INVENTORY.md](EDGE_FUNCTION_AND_TIMER_INVENTORY.md) as
domain method, timer, inter-canister call, external worker, or Supabase-only.
Move local logic to its owner, durable schedules to `timer_jobs`, and keep
payments, secrets, email, push, auth hooks, Drive, PlayHQ, Google, LLM, and
storage-signing behind explicit external workers. Document bounded-wait,
no-cycles, payload, timeout, retry, idempotency, compensation, and residency
for each external call.

### Coexistence and infrastructure: Steps 11-13

**11. Future migration compatibility:** Preserve stable application IDs,
versioned placement, fencing, snapshots, reconciliation interfaces, and
rollback metadata, but do not execute export/import, replication, cutover,
reconciliation, or deletion of existing Supabase data.

**12. Supabase coexistence adapter:** Complete synthetic Supabase providers for
each enabled contract. Match placement, disabled, read-only, authorization,
error, retry, and idempotency behavior across synthetic Supabase and ICP paths.
Keep real endpoints and credentials outside this repository and runtime.

**13. Delivery infrastructure:** Define local, shared-test, staging, and
production manifests separately; add Candid/Wasm compatibility, deployment
identities, cycle budgets, backup/restore, monitoring, alerts, subnet capacity,
residency profiles, secret handling, Cloud Engine/SEV-SNP decisions, vetKeys
proxy decisions, and the canonical authentication origin.

### Operations and rollout: Steps 14-17

**14. Operations/governance:** Add audit dashboards, target health, kill
switches, cycle alerts, latency/failure metrics, message backlog, storage
usage, upgrade history, incident runbooks, recovery drills, and approval for
residency, policy, placement, health, topology, and availability changes.

**15. Web/mobile/notifications:** Move clients to provider-neutral contracts.
Validate offline queues, retries, actor-cache disposal, identity/session
persistence, push/deep links, background refresh, notification preferences,
and account changes. Browser tests do not prove mobile behavior.

**16. Production readiness:** Require authorization parity, proof that existing
Supabase is untouched, messaging/storage performance, upgrade/restore,
cycle-exhaustion recovery, country-policy and kill-switch tests, web/mobile
validation, security review, and operational review before enabling production
ICP workloads.

**17. Rollout:** Club Links and low-risk configuration; read-only directory
views; events/schedules; membership/roles; notifications and selected timers;
media metadata and selected new files; messaging after scale/mobile gates; new
ICP authentication; then larger isolated ICP provisioning. Existing Supabase
domains remain on their current provider throughout.

## Integrated validation matrix

Every enabled workload must leave evidence for its applicable rows:

| Area | Evidence required |
| --- | --- |
| Isolation | Source allowlist, CSP, same-origin guard, no production endpoint or credential |
| Contracts | Generated Candid equals committed Candid; bounded payload tests |
| Authorization | Domain RLS parity and negative access tests |
| Placement | Active/read-only/blocked/disabled/country/health decisions |
| Routing | Domain shard lookup, stale route rejection, hot-shard behavior |
| Persistence | Stable-memory upgrade, snapshot, restore, interruption recovery |
| Idempotency | Replayed writes, claims, deliveries, timers, and worker events |
| External calls | Capability, bounded-wait, no-cycles, retry/compensation tests |
| Clients | Provider-neutral adapters, cache isolation, offline retry, mobile/background evidence |
| Operations | Audit, metrics, cycle, kill-switch, incident, and recovery evidence |
| Coexistence | Supabase unchanged, no fallback, no dual writer, no data migration |

The repository is not production-ready until every applicable row has evidence.
A compiled canister or passing unit test alone is insufficient.
