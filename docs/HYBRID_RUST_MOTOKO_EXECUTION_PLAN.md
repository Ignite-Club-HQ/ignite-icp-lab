# Hybrid Rust/Motoko Execution Plan

## Purpose and authority

This is the consolidated step-by-step implementation plan for the isolated
`ignite-icp-lab` workspace. It supersedes conflicting sequencing notes while
preserving the detailed domain and constraint documents linked below.

The target is coexistence-only:

- Existing Supabase workloads remain authoritative and unchanged.
- New ICP workloads are synthetic or explicitly isolated.
- Rust and Motoko canisters coexist through Candid contracts.
- PII encryption, vetKeys access, and vault secret custody are separate
  boundaries.
- No production credentials, real PII, live Supabase data, or mainnet targets
  enter this repository.

Primary references:

- [HYBRID_BUILD_ROADMAP.md](HYBRID_BUILD_ROADMAP.md)
- [NEXT_IMPLEMENTATION_PLAN.md](NEXT_IMPLEMENTATION_PLAN.md)
- [HYBRID_IMPLEMENTATION_PLAN.md](HYBRID_IMPLEMENTATION_PLAN.md)
- [ICP_CANISTER_TOPOLOGY.md](ICP_CANISTER_TOPOLOGY.md)
- [PII_VETKEYS_VAULT_ARCHITECTURE.md](PII_VETKEYS_VAULT_ARCHITECTURE.md)
- [PII_FIELD_CLASSIFICATION_MATRIX.md](PII_FIELD_CLASSIFICATION_MATRIX.md)
- [FEDERATED_MULTI_SITE_HYBRID_ARCHITECTURE.md](FEDERATED_MULTI_SITE_HYBRID_ARCHITECTURE.md)
- [DFINITY_CONSTRAINTS.md](DFINITY_CONSTRAINTS.md)
- [DOMAIN_OWNERSHIP_MODEL.md](DOMAIN_OWNERSHIP_MODEL.md)
- [RLS_DOMAIN_INVENTORY.md](RLS_DOMAIN_INVENTORY.md)
- [EDGE_FUNCTION_AND_TIMER_INVENTORY.md](EDGE_FUNCTION_AND_TIMER_INVENTORY.md)
- [PARITY_IMPLEMENTATION_MATRIX.md](PARITY_IMPLEMENTATION_MATRIX.md)
- [RUST_MOTOKO_LANGUAGE_DECISION.md](RUST_MOTOKO_LANGUAGE_DECISION.md)

## Architecture

### Rust default boundaries

Use Rust where explicit memory layouts, high-volume or infrastructure behavior,
complex migration tooling, specialized cryptography, binary protocols, or
measured performance requirements justify it:

- placement registry
- shard router
- migration coordinator or migration tooling
- high-volume notification/timer infrastructure
- specialized processing and cryptographic boundaries

### Motoko default candidates

Use Motoko for ordinary product domains when the comparison evidence supports
it and the domain benefits from persistent actor state and simpler upgrade
review:

- club/team configuration
- memberships and roles
- events and schedules
- ordinary notification records
- simple messaging metadata
- PII policy orchestration

The language is selected per canister, not per application. No domain changes
language until its Candid contract, authorization, upgrade, recovery, and
performance tests pass in both relevant implementations.

### Shared Candid rule

Every cross-canister or provider boundary uses a versioned Candid contract.
Generated bindings are derived from the committed `.did` contract. Rust and
Motoko implementations of the same service must be probeable by the same
provider-neutral test and adapter.

### Privacy and child safety rule

- PII and child photo access policy belongs with `identity_access` and the owning
  domain (`media_metadata` / `club_domain`).
- Child photos, player media depicting minors, and sensitive PII require
  client-side encryption via vetKeys or deployment on approved SEV-SNP protected
  hardware (Cloud Engine) to ensure confidentiality against untrusted node/subnet
  operators.
- A vetKeys proxy is a separately approved infrastructure boundary if subnet
  placement requires it.
- Vault secrets remain external; domain, timer, notification, and frontend code
  never receive raw credentials.
- Missing key or vault services fail closed without plaintext fallback.

## Current implementation status

This section is the reconciled repository status. Where older phase text below
describes work as upcoming, this section and the detailed remaining-work table
take precedence.

Completed or proven in the lab:

- 13 logical roles are declared in `icp-domain-topology.json` and all 13 are
  present in the disposable `local` environment in `icp.yaml`
- placement and residency control-plane POC
- shard routing and migration-fence POC
- Motoko club/team/Club Links product-domain POC, with the Rust implementation
  retained as reference evidence
- identity/access Rust POC
- Motoko events, competition, messaging, media, notification, PII-access, and
  secret-workload-identity POCs, with Rust reference implementations where the
  language comparison requires them
- Rust/Motoko migration coordinator boundary
- Rust notification queue
- Motoko notification queue with explicit migration chain
- shared notification Candid probe
- worker capability enforcement for notification queues
- clean local mixed deployment
- notification upgrade/recovery proof for Rust and Motoko
- initial Rust/Motoko Wasm and latency comparison
- Motoko events-domain comparison canister with shared Candid shape and live
  representative workflow probe
- replacement strategy recorded in
  [RUST_MOTOKO_LANGUAGE_DECISION.md](RUST_MOTOKO_LANGUAGE_DECISION.md): Motoko
  candidates replace Rust only after equivalent Candid, parity, upgrade,
  recovery, and workload evidence; Rust remains infrastructure default
- events domain live slice: RSVP, attendance, duties, roster, recurrence,
  guardian-aware access, and revisioned event updates
- competition domain live slice: registered teams, seasons, archive fencing,
  fixtures, match results, scoped join tokens, and replay protection
- messaging domain hardening live slice: participant-gated reads, bounded
  cursor pages, stale-cursor rejection, unread counters, read receipts, and
  author-only message deletion
- media metadata live slice: child-sensitive encryption classification,
  purpose-scoped capabilities, future expiry validation, and owner deletion
  with capability revocation/retention state
- worker promotion live slice: explicit timer/notification worker capabilities,
  bounded retry attempts, terminal failure behavior, interrupted recovery, and
  complete local worker deployment
- app-admin placement settings slice: country policies, approved Supabase/ICP
  target aliases and versions, country-constrained club assignment, and
  advisory device-locale detection
- topology-wide durability slice: 13-canister backup/checksum/restore proof and
  clean in-place worker upgrade/recovery proof for timer, Rust notification,
  and Motoko notification implementations
- topology-wide multi-canister backup and restore proof: all deployed Rust and
  Motoko canisters snapshot, checksum verification, and restore successfully
- synthetic external-worker boundary, provider-scoped email/push/payment/audit
  registry, queue retry/dead-letter behavior, and workload-scope tests
- initial field-level PII classification matrix and separate media-metadata,
  PII-policy, and secret-workload boundaries
- partial frontend migration: all 99 application pages that directly import
  the Supabase client now have an explicit ICP-lab guard and are recorded in
  [lab-route-classification.json](../frontend/lab-route-classification.json); guard
  coverage includes fixture/read-only and unavailable states rather than
  proving that every page has a live ICP actor
- event frontend connectivity includes local `events_domain` list/detail/create/edit
  paths plus canister-backed event-detail self-RSVP and assigned-duty claim
  writes; attendance, recurrence, timers, and complete duty lifecycle remain
  pending
- competition frontend connectivity has started with typed local
  `competition_domain` list and basic create adapters on the competitions
  pages; detail, join, settings, seasons, fixtures, results, organiser
  visibility, and invitation flows remain pending

Not production-ready:

- complete RLS parity across all domains
- column-by-column PII classification, retention, residency, and encryption matrix
- full events/competition scale, pagination, and timer workflow validation
- messaging hot-conversation load, retention, moderation, and full RLS parity
- media chunk/storage integration, scanning/moderation, vetKeys/SEV-SNP
  production boundary, and full media RLS parity
- production PII handling or encryption
- vetKeys proxy or protected-engine deployment
- external vault adapter
- encrypted media-byte storage, chunk transfer, scanning, and moderation integration
- external delivery integration and complete worker recipient/domain parity
- complete routing integration across every domain
- production wiring for app-admin placement settings to the live registry
- domain-specific interrupted route/migration recovery proof and production
  operations evidence
- production residency, capacity, mobile, and security approvals

## Detailed remaining-work backlog

The remaining work is ordered by dependency and evidence value. Completion of
a local POC does not promote a domain to production-ready.

### R1. Finish provider-neutral frontend migration

**Current evidence:** fixture-backed or guarded paths exist for the main home,
club/team detail, event detail, messaging entry points, profile/settings,
notifications, news, leaderboard, rewards, club/team lifecycle, event-write,
competition, season, mini-league, enrolment/EOI, role, association, reporting,
administrative, messaging, media, and external-boundary surfaces. The roles
page has a signed local `identity_access` actor read path, and event list,
detail, create, and edit now use signed local `events_domain` actor paths for basic
event reads/writes. The event list keeps a fixture fallback only when that
local canister is not configured. All 99 application pages with direct
Supabase imports now have an explicit ICP-lab guard. Many write or
external-integration routes intentionally fail closed until typed ICP services
or approved external boundaries exist.

**Work remaining:**

- classify every routed page as `hybrid`, `supabase_only`,
  `external_boundary`, or `not_enabled`;
- replace page-level SDK calls with domain services for clubs/teams,
  memberships/roles, events, competitions, messaging, media, notifications,
  rewards, and placement administration;
- migrate the create/edit/join flows for clubs, teams, events, competitions,
  seasons, mini-leagues, roles, enrolment, and EOI;
- add typed adapters for every active Candid domain instead of expanding
  fixtures indefinitely;
- keep payment, advertising, OAuth/recovery, push, Drive/import, AI, and other
  provider-backed pages explicit external or Supabase-only boundaries until
  their approved workers exist;
- dispose actors, sessions, and query caches on identity, site, tenant, or
  placement change;
- add route-level browser tests proving ICP mode makes no Supabase request and
  explicit Supabase mode preserves existing behavior.

**Exit evidence:** every routed page has a declared backend status, no hybrid
page imports a provider SDK directly, unsupported writes show an explicit
read-only/not-enabled state, and browser tests prove no silent fallback.

### R2. Promote authorization and automation parity

**Current evidence:** the source inventories, parity matrix, evidence register,
and a broad synthetic RLS test suite exist. All product and worker rows except
synthetic placement/routing remain `poc_needs_parity`.

**Work remaining:**

- reconcile every source policy/helper/RPC with a domain authorization method;
- close the remaining identity/profile/recovery/consent, club membership,
  event guardian/RSVP, competition role, messaging DM/group/moderation, media
  guardian/storage-prefix, notification recipient/preference, and timer
  callback gaps;
- map every Edge Function and scheduled workflow to a domain method, timer,
  queue, external worker, Supabase-only path, or `not_enabled`;
- attach source references and executable positive/negative evidence before
  changing any matrix status to `implemented_and_proven`.

**Exit evidence:** every enabled row meets the promotion rule in
`PARITY_IMPLEMENTATION_MATRIX.md`.

### R3. Complete domain production-shape behavior

- add bounded pagination and payload limits to every collection;
- make every retriable mutation durably idempotent;
- complete events/training/formation/pitch workflows and competition
  divisions/ladders/official roles;
- complete messaging reactions, replies, polls, reports, moderation,
  retention, attachments, and hot-conversation handling;
- complete media albums, comments, reports, checksums, chunks, attachment
  references, deletion, and retention;
- enforce `identity_access` decisions inside each domain rather than trusting
  frontend claims;
- add populated-state upgrade, snapshot, restore, and interruption probes per
  domain.

### R4. Implement the approved privacy and storage boundary

- reconcile the field matrix with every sanitized source column;
- approve owner, retention, residency, encryption, consent, and erasure policy
  for each PII and child-media class;
- implement the vetted vetKeys/protected-engine design, purpose-bound key
  capabilities, rotation, revocation, and crypto-erasure;
- implement encrypted media chunk transfer plus external scanning/moderation;
- prove unavailable key or vault services fail closed without plaintext
  fallback.

This work remains synthetic until subnet, funding, hardware, residency, legal,
and security decisions are separately approved.

### R5. Finish external-worker and vault integration

**Current evidence:** provider-scoped worker, queue, retry, dead-letter, and
audit behavior is implemented as a synthetic lab boundary.

**Work remaining:** real vault attestation, short-lived workload credentials,
provider webhook verification, secret rotation/revocation, immutable audit
storage, and separately authorized email, push, payment, media, third-party,
and AI workers. No production secret belongs in this repository.

### R6. Complete placement-admin integration

- mount the placement settings surface in the actual app-admin navigation;
- enforce app-admin/placement-admin authorization;
- wire country policy, target/version, residency, health, availability, and
  audit controls through the typed registry adapter;
- require authoritative club country and keep device country advisory;
- add Site A/B/C connection slots and cache/session isolation.

### R7. Complete durability, measurement, and operations

- run domain-specific interrupted route/migration and populated-state upgrade
  recovery;
- verify cross-canister references, schema evolution, cycle exhaustion, and
  partial failures;
- complete Rust/Motoko cycle, stable-growth, concurrency, migration, and
  maintenance measurements;
- add production-shaped monitoring, cycle budgets, health/backlog metrics,
  incident runbooks, recovery ownership, and approval workflows.

### R8. Complete production-readiness gates

Require privacy/child-safety, security, dependency, RLS, residency, subnet,
mobile/background, backup/restore, cycle, external-worker, vault, and
operational approvals before enabling any newly provisioned ICP workload.
Existing Supabase workloads remain authoritative; migration execution,
dual-writing, and silent reassignment remain out of scope.

## Step-by-step execution

### Step 0: Preserve isolation and evidence

- Work only in this repository.
- Keep Supabase source inert and disconnected.
- Reject production URLs, credentials, identities, and data.
- Use disposable loopback ICP networks.
- Record every live result with command, canister version, and synthetic scope.

Exit gate: isolation checks, topology checks, and diff checks pass.

### Step 1: Lock topology and contracts

- Keep the machine-readable topology registry current.
- Treat the ten product/control roles plus the synthetic migration coordinator
  as the current lab topology.
- Add a role entry for any approved vetKeys proxy only after its boundary is
  reviewed; do not add vault services as ordinary canisters.
- Require a Candid file, implementation status, workspace/build entry, and RLS
  gate for every implemented role.
- Generate and check bindings for every active contract.

Exit gate: topology validation and Candid drift checks pass.

### Step 2: Establish Rust/Motoko build foundations

- Keep the Rust workspace locked and reproducible.
- Keep root `mops.toml` pinned for Motoko toolchains and migrations.
- Keep Rust and Motoko sources in separate canister directories.
- Keep language-specific stable schemas explicit.
- Use Candid, not shared stable memory, between languages.

Exit gate: Rust tests, `mops check --fix`, Motoko builds, and mixed ICP builds
pass.

### Step 3: Complete control-plane authority

- Finish placement registry policy, residency, availability, lifecycle, health,
  operator roles, and audit evidence.
- Add multi-site target support (`site_id`, `target_alias`, `backend_type`) to
  support secondary Supabase sites (e.g. Site B) and remote hybrid sites (Site C).
- Finish shard-router domain routes, revisions, health checks, and migration
  fences.
- Connect route resolution to provider-neutral frontend adapters.
- Ensure independent availability switches per site (disabling Site B fails
  closed for Site B without affecting Site A).
- Reject stale routes, disabled targets, invalid residency, and unauthorized
  reassignment.

Exit gate: route, placement, multi-site target, disablement, read-only, and
reassignment probes pass without silent fallback.

### Step 4: Complete identity and access

- Keep stable application account IDs separate from principals.
- Implement linking, revocation, version conflicts, family/guardian links,
  exclusions, invitations, and scoped roles.
- Support federated identity mapping across multiple sites (Site A Supabase
  UUID, Site B Supabase UUID, Internet Identity principals) linked to one
  global account anchor.
- Scope roles and exclusions by `(site_id, club_id, team_id, role)` to prevent
  cross-site tenant escalation.
- Make every domain enforce authorization inside its own update methods.
- Add account-level privacy policy, consent, purpose, retention, erasure, and
  audit records without storing raw keys or vault values.

Exit gate: positive and negative authorization parity passes for account, club,
team, guardian, exclusion, and app-admin cases.

### Step 5: Complete the club domain

- Split clubs, teams, configuration, sponsors, and Club Links ownership from the
  current Club Links POC where needed.
- Preserve existing stable memory regions and Candid compatibility.
- Add bounded pagination, cross-club validation, and identity/access checks.
- Add Rust/Motoko equivalent implementation only if the domain comparison is
  justified by evidence.

Exit gate: club creation/configuration, cross-club denial, upgrade, snapshot,
and restore probes pass.

### Step 6: Complete events and schedules

- Implement event ownership, schedules, attendance, RSVP, lineups, duties,
  recurring events, training defaults, drills, formations, and pitch state.
- Add child/guardian visibility and coach/team-admin rules.
- Add idempotent mutation IDs and bounded event-window queries.
- Connect timer jobs only through explicit workflow capabilities.
- Decide whether the ordinary event implementation should be Motoko or Rust
  using the notification comparison criteria.

Exit gate: RLS parity, cross-club rejection, replay safety, upgrade, and timer
workflow probes pass.

### Step 7: Complete competitions

- Implement competition/league ownership, seasons, divisions, entries,
  officials, matches, fixtures, ladders, and archive transitions.
- Add coordinator, official, participant, and team-entry capabilities.
- Add one-time, scoped, expiring join tokens and external match-edit fencing.
- Keep competition chat payloads in messaging, not competition state.

Exit gate: ownership, cross-club, token replay, archive, and upgrade probes pass.

### Step 8: Complete messaging

- Implement conversations, participants, sequence ordering, cursors, unread
  state, receipts, delivery acknowledgements, reactions, replies, polls,
  reports, deletion, moderation, and retention.
- Enforce participant, team, club-admin, moderator, author, blocked-user, and DM
  rules inside the canister.
- Keep attachments as media capabilities, not embedded bytes.
- Run hot-conversation and shard-skew tests before enabling a new workload.

Implemented local gate: participant-gated reads, bounded `list_messages_page`,
stale-cursor rejection, unread counters, read receipts, idempotent sends, and
author-only deletion.

Exit gate: deterministic ordering, replay safety, stale-cursor behavior,
access parity, bounded growth, and upgrade/recovery probes pass.

### Step 9: Complete media metadata and storage boundary

- Implement albums, asset metadata, comments, reports, visibility, deletion,
  retention, attachment references, and moderation state.
- Classify media depicting minors / child photos as sensitive protected assets
  requiring vetKeys-derived encryption or SEV-SNP protected Cloud Engine hardware.
- Validate content length, MIME, checksum, chunks, expiry, and storage prefix.
- Issue capabilities scoped to one asset, owner/guardian, action, and expiry.
- Keep bytes, scanning, signed URLs, and storage credentials external or in a
  separately approved encrypted storage boundary.

Implemented local gate: child-sensitive assets are classified as encrypted,
public visibility is rejected, capabilities carry a purpose and expiry, and
owner deletion marks retention state and revokes capabilities.

Exit gate: cross-club denial, uploader/commenter/guardian rules, capability expiry,
child photo encryption checks, delete/retention, and recovery probes pass.

### Step 10: Promote notification and timer workers

- Require explicit domain/worker capabilities.
- Add recipient, club, domain, preference, and purpose scopes.
- Add claim leases, maximum attempts, dead-letter state, retry backoff, and
  recovery semantics.
- Bind timer callbacks to approved domain workflows.
- Keep external delivery and all vault credentials outside ICP state.

Implemented local gate: notification and timer worker operations require an
initialized governor/worker capability; timer retries are bounded and the
complete local worker topology is deployed and probed.

Exit gate: unauthorized worker operations fail closed; interrupted claims,
upgrades, retries, and bounded delivery probes pass.

### Step 11: Implement PII and child photo privacy boundaries

- Classify every PII field and child media collection (photos, videos, team
  galleries depicting minors) and minimize collection.
- Produce a machine-readable field/column classification matrix covering direct
  identifiers, contact data, child/guardian data, authentication metadata,
  media references, operational metadata, secrets, retention, residency, and
  encryption requirements.
- Decide per asset class whether it remains external, is encrypted client-side
  with vetKeys, or uses an approved SEV-SNP protected hardware engine.
- Define the vetKeys proxy if cross-subnet access is required for child photo
  decryption key derivation.
- Define vault workload identity and least-privilege operation contracts.
- Add purpose-bound PII and child media capabilities, consent, guardian
  revocation, retention, erasure, export, key rotation, and audit events.
- Never return raw keys or vault secrets through Candid.
- Test unavailable key/vault services and prove no plaintext fallback.

Exit gate: privacy, child safety, residency, operator trust, key rotation,
erasure, restore, and unavailable-service evidence is approved. No production
PII or unencrypted child photos are enabled before this gate.

Current status: the domain/RLS and Edge Function inventories identify protected
surfaces, and `media_metadata` provides the separate metadata/capability
boundary. The column-level PII matrix, vetKeys proxy, secure-hardware
deployment, encrypted media-byte path, and vault adapter remain upcoming work
and production gates.

### Step 11A: Implement and prove authorization and automation parity

**Status:** In progress. Source inventories, a structural checker, an evidence
register, and broad synthetic RLS tests exist, but domain rows have not yet met
the promotion rule.

Use [RLS_DOMAIN_INVENTORY.md](RLS_DOMAIN_INVENTORY.md) and
[EDGE_FUNCTION_AND_TIMER_INVENTORY.md](EDGE_FUNCTION_AND_TIMER_INVENTORY.md) as
the authoritative source maps. For every enabled domain and worker:

Track implementation status and evidence in
[PARITY_IMPLEMENTATION_MATRIX.md](PARITY_IMPLEMENTATION_MATRIX.md).
Run `npm run check:parity --prefix frontend` as the structural gate before
promoting any parity row.
Use [PARITY_EVIDENCE_REGISTER.md](PARITY_EVIDENCE_REGISTER.md) and run
`npm run check:parity-evidence --prefix frontend` to verify that every current
synthetic evidence packet points to an existing executable probe.

- map each source RLS policy, helper, protected RPC, trigger, and ownership
  rule to an ICP authorization function or an explicit external-boundary
  decision;
- implement positive and negative tests for anonymous, outsider, member,
  scoped-admin, app-admin, owner, author, parent, guardian, excluded, blocked,
  cross-club, cross-site, stale-revision, and replay cases;
- map every Edge Function and scheduled job to one of: canister method, durable
  timer workflow, notification worker, external trusted worker, or Supabase-only
  compatibility path;
- record the caller capability, site/domain scope, idempotency key, retry,
  timeout, payload bound, residency impact, and compensation behavior for every
  external or worker path;
- prove that service-role, cron, webhook, and internal-worker behavior is not
  exposed as an ordinary public Candid method;
- add parity records per domain and mark any intentionally unported behavior as
  `external_boundary`, `supabase_only`, or `not_enabled` rather than silently
  treating a router or POC as equivalent behavior;
- rerun parity probes after every Rust/Motoko implementation change and before
  a new workload is enabled.

Required parity evidence:

- `identity_access`: account, profile privacy, linking, recovery, consent,
  guardian, exclusion, and site-scoped role checks;
- `club_domain`: club/team/membership/Club Links ownership and exclusions;
- `events_domain`: event ownership, roster, child visibility, RSVP, attendance,
  duties, lineups, recurrence, and timer callbacks;
- `competition_domain`: competition/league ownership, entries, officials,
  participants, fixtures, seasons, archive transitions, and join tokens;
- `messaging_domain`: conversation/group membership, DMs, blocked users,
  unread/receipts, author/moderator deletion, retention, and attachments;
- `media_metadata`: album/event/team visibility, uploader/commenter/guardian
  access, child-media capabilities, retention, deletion, and storage prefixes;
- `notification_queue` and `timer_jobs`: recipient/domain/site scope,
  preferences, worker capabilities, claim ownership, retry/dead-letter behavior;
- external functions: bounded-wait, no-cycles where required, secret-free
  canister state, idempotency, timeout, retry, and failure-closed behavior.

Exit gate: every enabled domain has a parity matrix with source evidence,
implementation reference, positive/negative tests, and an explicit status. No
domain is called ported because its canister compiles or its router passes.

### Step 11B: Execute Secret Integration & External Delivery Worker Strategy

**Status:** Synthetic boundary implemented; real infrastructure remains
upcoming. The reference plan is
[EXTERNAL_WORKER_SECRETS_DEPLOYMENT_PLAN.md](EXTERNAL_WORKER_SECRETS_DEPLOYMENT_PLAN.md).

Authoritatively decouple and manage all 41 Edge Function secrets:

- **Email & Push Delivery**: Move `RESEND_API_KEY`, `FCM_SERVICE_ACCOUNT`, and `VAPID_PRIVATE_KEY` into stateless external delivery worker secret stores (Cloudflare Workers / AWS Secrets Manager). Enforce that workers authenticate and verify lease scopes (`send-email-notification`, `send-push-notification`) against `secret_workload_identity` before claiming batches from `notification_queue_motoko`.
- **Payments & Subscriptions**: Route Stripe operations (`STRIPE_WEBHOOK_SECRET`, `stripe_secret_key`) through an External Payments Gateway. Maintain order lifecycle on-canister (`#Pending` $\rightarrow$ `#Completed` $\rightarrow$ `#Refunded`) with double-spend and signature verification.
- **Third-Party APIs**: Execute Google Places and Giphy lookups via direct ICP HTTPS outcalls with response consensus. Route PlayHQ sports sync and Google Drive chunk streaming through external regional workers.
- **Decommissioned Master Keys**: Completely eliminate `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` from ordinary application code, replacing them with canister principal RBAC and native `timer_jobs` callbacks.
- **Audit Logging**: Ensure every secret access check is immutably logged to `secret_workload_identity` with caller principal, scope, nonce, timestamp, and approved status.

Exit gate: Synthetic worker harness verifies that unauthorized callers, invalid scopes, and expired leases are rejected without exposing raw secrets in canister memory or frontend bundles.

### Step 12: Complete hybrid frontend routing

**Status:** In progress. The core fixture-backed page path is established and
all 99 pages that directly import Supabase now have an explicit ICP-lab guard.
Most newly guarded writes and external integrations are explicit unavailable
states rather than live canister integrations. The next routing deliverable is
a committed page classification inventory and broader route-level regression
coverage. See R1 and
[HYBRID_BUILD_ROADMAP.md](HYBRID_BUILD_ROADMAP.md) for the reconciled backlog
and adapter-wiring sequence.

- Generate typed actors for every active Rust and Motoko canister.
- Resolve placement, site target (`site_id`), and domain shard before each
  operation.
- Implement multi-site connection slots (Site A Supabase, Site B Supabase,
  Site A ICP, Site C ICP).
- Dispose identity-bound actors and caches on account or tenant switch to
  prevent cross-site leakage.
- Preserve explicit Supabase/ICP provider selection and fail-closed behavior.
- Support HTTPS outcalls from ICP canisters to external Supabase sites when
  backend-to-backend notification/webhook triggers are required.
- Add browser, background, and mobile-equivalent session/retry tests.

Exit gate: local full-lab UI exercises mixed Rust/Motoko routes across multiple
simulated site targets with no external requests or provider leakage.

### Step 12A: Promote placement settings into the live app-admin surface

**Status:** Local contract/client/panel and authorization probe implemented.
Mounting the surface in the actual application admin route, completing
multi-site connection slots, and production-shaped operational evidence remain.

Tasks:

- Add an app-admin/placement-admin-only route for Infrastructure / Placement
  Settings; ordinary club admins must not access it.
- Connect the settings UI to the placement registry Candid methods through a
  provider-neutral admin adapter.
- Allow authorized administrators to manage country policies, enabled backend
  types, approved target aliases, target versions, residency profiles, target
  health, and site availability.
- Require every club to have an authoritative country before assignment.
- Show only country-approved backend targets and versions in the club assignment
  UI; revalidate the same constraints inside the registry update path.
- Treat device locale, browser language, and signup-region signals as advisory
  input only. They must never override the authoritative club country or policy.
- Add optimistic version checks, confirmation for policy changes, audit history,
  and explicit read-only/blocked/disabled states.
- Add multi-site connection slots for Site A Supabase, Site B Supabase, Site A
  ICP, and Site C ICP with identity/session/cache isolation.
- Ensure every domain operation resolves placement, site, target, backend,
  version, and shard before dispatch; no frontend-selected backend or silent
  fallback is permitted.

Exit gate: an app-admin live-surface probe proves unauthorized users are denied,
country constraints cannot be bypassed, target versions are validated, device
signals remain advisory, policy changes are audited/versioned, site disablement
fails closed for that site only, and existing Supabase workloads are untouched.

### Step 13: Complete topology-wide durability

- Add backup and restore for every deployed canister.
- Add schema and Candid compatibility checks.
- Upgrade each Rust and Motoko canister with retained state.
- Interrupt exports, imports, upgrades, claims, and route changes at each phase.
- Verify record counts, checksums, revisions, references, and authorization
  after recovery.

Implemented local gate: the full deployed topology has passed multi-canister
backup/checksum/restore validation. Timer jobs, Rust notifications, and Motoko
notifications have also passed clean in-place upgrade recovery probes with
retained processing state.

The local Step 13 gate is complete. Remaining durability work is domain-specific
interrupted route/migration testing and production operations evidence; these
are not claims of production backup, subnet, or disaster-recovery certification.

Implemented local gate: full multi-canister backup, per-canister checksum
verification, and restore into disposable destinations now pass for the entire
deployed mixed topology, including the Motoko events comparison canister.

Exit gate: full disposable lab deploy, backup, restore, upgrade, and recovery
passes for all implemented roles.

### Step 14: Measure and choose defaults

For equivalent Rust/Motoko services, record:

- development and debugging effort
- maintainability and generated-code quality
- upgrade and data-preservation behavior
- stable-state complexity
- query/update latency
- Wasm size and memory growth
- cycle consumption
- interoperability and adapter complexity

Use evidence to select Motoko for ordinary domains and Rust for infrastructure
where justified. Do not choose based on language preference alone.

Current decision evidence is recorded in
[RUST_MOTOKO_LANGUAGE_DECISION.md](RUST_MOTOKO_LANGUAGE_DECISION.md). The
initial result supports a mixed default, while cycle usage, long-run stable
growth, concurrency, and non-trivial migration measurements remain open.

Exit gate: decision record names the default per domain and records unresolved
risks.

### Step 15: Production-readiness review

- Resolve residency, subnet, protected hardware, cycle, and operator decisions.
- Complete security, dependency, RLS, privacy, mobile, and operational review.
- Approve canonical Internet Identity origin and account recovery.
- Keep credentials outside the repository and deployment workflows.
- Enable only newly provisioned workloads after all gates pass.

Exit gate: explicit production approval; otherwise remain in synthetic lab mode.

### Step 15A: Deploy External Worker Infrastructure & Secret Management

**Status:** Synthetic worker/provider boundary implemented; real vault and
provider infrastructure is separately authorized, production-only work.
Detailed plan:
[EXTERNAL_WORKER_SECRETS_DEPLOYMENT_PLAN.md](EXTERNAL_WORKER_SECRETS_DEPLOYMENT_PLAN.md).

Operationalize the external worker boundary for all 41 API secrets and credentials:

**Phase A: Secret Infrastructure Setup (AWS/Cloudflare)**
  - Provision AWS Secrets Manager for critical secrets (Stripe, OAuth, APNs .p8)
  - Provision Cloudflare Secrets for worker co-located secrets (email, push, LLM)
  - Configure automatic secret rotation policies (monthly for live credentials)
  - Set up immutable audit logging for all secret fetch/rotation events

**Phase B: External Worker Deployment (4 Workers)**
  - **Payments Gateway**: Stripe checkout, subscription, webhook reconciliation; validates orders on-canister
  - **Email Delivery Worker**: Claims jobs from `notification_queue_motoko`, sends via Resend, records delivery status
  - **Push Notification Worker**: Multi-provider (APNs/FCM/Web); claims jobs, dispatches, handles bounces
  - **LLM & Places Worker**: Gemini chat summaries (PII-sanitized), Google Places queries, Giphy searches; may be HTTPS outcalls instead

**Phase C: Workload Identity Registration**
  - Register each worker principal in `secret_workload_identity` with approved scopes
  - Verify every worker can call `verify_secret_access(principal, scope, nonce)` and receive audit logs
  - Test scope denial (unauthorized scopes fail closed)
  - Test principal revocation (re-registration blocks old principal)

**Phase D: End-to-End Testing**
  - Smoke test: each worker successfully retrieves one secret and processes one job
  - Audit trail: verify all access logged to `secret_workload_identity` audit tables
  - Failure scenarios: worker secret vault unavailable → notification stays pending; worker revoked → job retried
  - No canister code changes required; same Candid contracts work with external or internal workers

Exit gate: All 41 secrets are accounted for in external infrastructure; workers pass smoke tests; audit trails are immutable and queryable; all external integrations (Stripe, Resend, FCM, Google) are confirmed operational.

## Non-negotiable prohibitions

- No production Supabase access or data import.
- No dual writer for an existing workload.
- No silent provider fallback.
- No raw vault secret or vetKeys material in canister state.
- No PII enablement before the privacy boundary gate.
- No claim of production RLS, capacity, residency, or confidentiality from local
  tests alone.
