# Supabase-to-ICP Migration and ICP Architecture Proposal

**Document status:** Proposed architecture for external review<br>
**Audience:** DFINITY technical reviewers and platform architects<br>
**Review date:** 2026-09-21<br>
**Scope:** Supabase baseline, phased migration, and ICP-only target architecture

## Purpose and status

This document asks whether the application can operate on the Internet Computer
after migrating from its current Supabase implementation. It describes the
current Supabase responsibilities only as the migration baseline, then defines
the proposed ICP runtime, canister boundaries, data model, authorization,
external integrations, operations, and acceptance evidence.

The current state is Supabase-led. The proposed future state is an ICP-led
deployment in which Supabase is no longer required at runtime for migrated
domains. Supabase is treated as the source system for migration, not as a
permanent part of the target architecture.

This document describes an architecture proposal, not a production readiness
attestation. Items marked as proposed require implementation, security review,
operational runbooks, and evidence before production authority is transferred.

### Scope and non-goals

In scope are data ownership, authorization, canister boundaries, migration,
actor authentication, storage, inter-canister calls, external integrations,
secrets, upgrades, and operational feasibility on ICP.

Out of scope are a final subnet placement decision, a production cryptographic
key-management design, a replacement for product requirements, and a claim
that all listed canisters are already production-ready.

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

### Proposed target: ICP as the application backend

The proposed architecture moves application authority from Supabase into ICP:

- ICP canisters own migrated domain state, invariants, queries, and update
  authorization.
- Internet Identity or another approved delegated identity flow authenticates
  users; canisters authorize operations from the caller principal and stored
  application grants.
- Rust is preferred for control-plane, migration, worker, interoperability,
  and security-sensitive services. Motoko is suitable for compact domain
  canisters where its actor model and stable data patterns are advantageous.
- Assets too large or unsuitable for canister storage remain behind an explicit
  content and metadata boundary; this is an integration decision, not a reason
  to retain Supabase as the application database.
- Supabase is used only for extraction, verification, and controlled rollback
  during migration. After cutover, migrated domains have ICP as their sole
  authoritative writer.

### Architectural decision requested from DFINITY

Feedback is requested on the viability and recommended implementation of:

1. whether the proposed domain and control-plane boundaries are viable on ICP;
2. whether the Rust/Motoko division is appropriate for maintainability and
  upgrade safety;
3. how Supabase RLS behavior should be represented and proven in canisters;
4. how authentication, storage, timers, and external integrations should be
  implemented without Supabase runtime dependencies;
5. subnet, cycle, stable-memory, upgrade, backup, and recovery implications;
6. what constraints prevent this application from operating ICP-only after
  migration; and
7. what DFINITY would require as evidence for production readiness.

### Initial feasibility conclusion

The application is a plausible candidate for an ICP-only runtime after a
domain-by-domain migration. Its core requirements map naturally to canister
state, authenticated actor calls, stable upgrades, Candid interfaces, and
durable asynchronous workflows. The migration is not technically equivalent to
moving PostgreSQL tables into canisters: RLS policies, transactions, storage,
Edge Functions, timers, and secrets must each be reimplemented and proven at a
different boundary.

The architecture should be considered feasible only if the first pilot proves:

1. every migrated RLS decision has an equivalent fail-closed canister check;
2. aggregate boundaries avoid requiring distributed SQL transactions;
3. media can be uploaded, authorized, retrieved, and deleted without Supabase;
4. external side effects remain reliable without storing secrets on-chain;
5. stable-memory upgrades, backups, restore, and rollback are operationally
  rehearsed; and
6. measured cycle, latency, storage, and HTTPS-outcall budgets meet product
  requirements.

Until those tests pass, the correct conclusion is “architecturally plausible,
not yet production-proven,” rather than assuming that source-level canister
parity establishes deployability.

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

## Proposed future state: ICP-only application architecture

The target runtime is an ICP application composed of authenticated actors,
domain canisters, control-plane canisters, and narrowly scoped external
workers:

```text
Application clients
  |
  v
ICP actor clients
  |
  v
Identity and access context
  |
  +--> Control plane: placement, routing, migration state
  +--> Domain canisters: application state and invariants
  +--> Queue/timer canisters: durable asynchronous work
  +--> External workers/outcalls: integrations that cannot run on-chain
```

The control plane does not become a universal data layer. Each domain canister
owns a defined aggregate and its invariants. Cross-domain workflows use
explicit Candid interfaces, durable commands, and compensating actions rather
than distributed SQL transactions.

### ICP runtime responsibilities

| Responsibility | ICP implementation |
|---|---|
| User authentication | Internet Identity or approved identity provider integration; the canister sees a principal |
| Application authorization | `identity_access` grants, exclusions, and canister-side policy checks |
| Domain state | Rust or Motoko domain canisters with stable upgradeable state |
| Routing and sharding | `placement_registry` and `shard_router` resolve canister principals and domain ownership |
| Asynchronous work | `notification_queue`, `timer_jobs`, and durable worker commands |
| Large media | ICP-compatible asset boundary or approved external storage with canister-owned authorization metadata |
| External APIs | HTTPS outcalls or protected workers with bounded, idempotent requests |
| Migration | `migration_coordinator` imports, verifies, checkpoints, and records cutover state |
| Observability | Structured events, request correlation, audit records, and operator metrics |

### Canister-to-canister communication

Canisters communicate through versioned Candid interfaces. Calls are
asynchronous and can fail after the caller has committed local state, so every
cross-domain mutation requires an idempotency key, durable status, bounded
retry policy, and a reconciliation path. Domain boundaries must be selected to
keep strongly consistent invariants within one canister wherever practical.

The proposed routing metadata identifies a canister principal and domain owner;
it does not select between Supabase and ICP at runtime:

```text
Target:
  alias: "club-domain-primary"
  domain: "club"
  profile: "SUBNET_PROFILE"
  backend: Icp { canister: principal "..." }
  deployment_class: "icp_canister"
  enabled: true
  healthy: true
  version: 1
```

### ICP authority rules

1. **Single authoritative writer:** each migrated aggregate has one owning
  canister for its authoritative state.
2. **Fail-closed authorization:** an invalid, anonymous, or stale authorization
  context cannot produce a state mutation.
3. **No implicit replication:** data is not copied between canisters without a
  versioned protocol, ownership rule, and recovery procedure.
4. **No silent fallback:** a failed canister call is returned as an explicit
  error; the client cannot redirect a mutation to an unapproved authority.
5. **Versioned interfaces:** Candid methods and stable state evolve through
  compatibility rules and rehearsed upgrades.

## ICP access and integration model

### User-to-canister request flow

```text
User
  |
  v
Internet Identity / approved identity provider
  |
  v
Frontend actor client with caller principal
  |
  +--> identity_access: resolve account and grants
  |
  +--> domain canister: query or update with authorization context
  |
  +--> notification/timer canister for durable asynchronous work
```

The frontend is an untrusted actor client. It may select a canister principal
and submit a request, but it cannot grant itself a role, bypass an authorization
check, or write another domain's state. Every update method checks the caller
principal, account status, tenant/club membership, role, exclusions, and the
requested state transition inside the canister.

### Identity and account migration

Supabase `auth.users.id` values are source identifiers, not ICP principals. The
migration creates an application account record that preserves the source ID,
maps one or more approved ICP principals to that account, and records the
identity-linking event. A principal is not automatically trusted merely because
it appears in imported data; account linking requires an authenticated flow and
an auditable policy.

```text
Supabase auth.users.id (source reference)
              |
              v
       ICP application account
              |
              v
Internet Identity principal(s)
```

The account record contains no password or Supabase service credential. Role
grants and exclusions are represented as ICP data with explicit tenant, club,
team, role, validity, and revocation fields. Cross-tenant access is denied by
default.

### Storage and media

Supabase Storage objects must be classified before migration. Small or
appropriate assets may move to an ICP-compatible asset canister. Large media
may remain in an external object store, but the owning ICP canister must hold
the authorization metadata, content identifier, ownership, and lifecycle
state. Clients receive content access only through an authorized capability or
short-lived delivery boundary. A URL alone is not an authorization decision.

### External integrations and HTTPS outcalls

ICP canisters may use HTTPS outcalls for bounded external operations such as
webhooks, verification, or provider APIs. These calls are not a replacement for
transactional canister state:

- external calls are modeled as commands with durable pending/succeeded/failed
  status;
- requests carry idempotency keys and bounded payloads;
- retries use explicit backoff and a maximum attempt policy;
- response validation is deterministic and size-limited; and
- irreversible external side effects are reconciled by a queue or protected
  worker rather than assumed to have succeeded.

Where a vendor SDK, secret, large payload, or non-deterministic workflow is not
appropriate inside a canister, an external worker is retained as an integration
boundary. That worker is authenticated to the canister and has no authority to
mutate domain state except through the defined Candid API.

### External connection and vendor inventory

The following inventory identifies every external connection currently described
by the Supabase functions and migration plans. The alternatives are options for
technical and privacy review, not decisions to change vendors automatically.

| Connection/vendor | Current use | ICP-era connection | Data or capability crossing boundary | Alternatives to evaluate |
|---|---|---|---|---|
| Supabase Auth/PostgreSQL/Storage | Current identity, database, RLS, and media source | Migration export, verification, and time-bounded rollback only | Records, source IDs, policy fixtures, media metadata/objects | ICP principals, canister state, ICP asset canister, approved object storage |
| Internet Identity | Proposed user authentication | Frontend actor authentication and caller principal | Principal and authentication assertions | DFINITY-supported delegated identity provider, enterprise OIDC bridge if required |
| Stripe | Checkout, subscriptions, payment intents, webhooks | External payment gateway worker calls Stripe; worker calls ICP order methods | Order IDs, amounts, payment status, signed webhook events | Alternative payment processor, platform-native billing, app-store billing where applicable |
| Apple App Store / Google Play IAP | Mobile purchase receipt verification | External payments worker verifies receipts and submits a signed result | Receipt token, product, entitlement, account/order ID | Store server APIs, unified payment gateway, direct web billing where allowed |
| Resend | Transactional and marketing email | Email delivery worker reads secret and claims `notification_queue` jobs | Recipient, template data, delivery result | Amazon SES, SendGrid, Mailgun, Postmark, regional SMTP provider |
| Apple APNs | iOS push delivery | Push worker holds signing key and updates delivery status | Device token, notification payload, delivery result | Firebase as unified gateway, direct provider worker, platform-specific notification service |
| Firebase Cloud Messaging | Android push delivery | Push worker holds service-account credential | Device token, notification payload, delivery result | Direct Android provider path, unified push gateway, self-hosted gateway where supported |
| Web Push / VAPID | Browser push delivery | Push worker holds VAPID private key; public key remains frontend config | Subscription endpoint, encrypted payload, delivery result | Managed web-push provider, browser-native worker, unified notification provider |
| Google OAuth and Drive | User authorization and file import | External OAuth/Drive worker exchanges tokens and sends metadata to `media_metadata` | OAuth code/token, file metadata, authorized content stream | Microsoft Graph/OneDrive, Dropbox, S3-compatible upload, direct user upload |
| Google Places | Venue and place search | Bounded HTTPS outcall or places worker | Search terms, coarse location, place results | OpenStreetMap/Nominatim, Mapbox, HERE, TomTom, regional geocoder |
| PlayHQ | Sports fixtures and competition synchronization | External regional sync worker submits validated diffs to `competition_domain` | Fixture, team, competition, and change-set data | Sport-specific federation API, CSV/SFTP import, operator-managed batch import |
| Giphy | GIF search and selection | Bounded HTTPS outcall or media worker | Search terms, GIF IDs, URLs, attribution metadata | Tenor, media catalog, user-uploaded media, no GIF integration |
| Gemini / Google AI | Chat summarization and AI assistance | Sanitizing canister plus external AI worker or HTTPS outcall | Minimized transcript, prompt, model response | OpenAI, Anthropic, self-hosted model, local inference, disable AI feature |
| Lovable AI | Legacy AI capability | Deprecated; no new ICP dependency | Legacy prompts/results only during transition | Remove, consolidate on approved AI gateway, self-hosted model |
| External object storage/CDN | Large media, backups, or encrypted blobs | Canister owns authorization and content metadata; worker handles bytes | Encrypted object, hash, size, lifecycle, access result | ICP asset canister, S3-compatible storage, Cloudflare R2, Google Cloud Storage, Azure Blob |
| Email/push/payment/integration workers | Vendor SDKs, private keys, large or non-deterministic calls | Authenticated workload principals and Candid queue APIs | Scoped job, provider response, audit and retry state | Cloudflare Workers, AWS Lambda, regional containers, Google Cloud Run, private worker cluster |
| Secret management | Provider credentials and private keys | Workers retrieve operation-scoped secrets; canisters store no raw keys | Workload scope, lease, audit event, secret use | Google Cloud Secret Manager, AWS Secrets Manager, Cloudflare Secrets, HashiCorp Vault, approved protected Cloud Engine facility |
| Frontend hosting/CDN | Current browser application delivery | Serves actor client and public configuration only | Static assets, public origin, identity redirect config | Netlify, Cloudflare Pages, Vercel, ICP asset canister, self-hosted CDN |

For every vendor connection, the implementation record must specify the API
owner, authentication method, data classification, region and egress path,
payload and response limits, timeout, retry and idempotency behavior, rate
limits, failure mode, retention, deletion process, and vendor exit path. A
vendor alternative is not interchangeable until its identity, privacy,
delivery semantics, API limits, and operational ownership have been tested.

### Secrets

Secrets are never placed in frontend bundles or ordinary canister stable state.
The proposed boundary is:

| Secret or capability | ICP-only target handling |
|---|---|
| User identity | Caller principal from Internet Identity or approved provider |
| Role and account data | `identity_access` canister state |
| Email, push, webhook, and OAuth credentials | Protected external worker or approved vault lease |
| External API/service credentials | Operation-scoped worker identity; never domain-canister state |
| PII access capability | Purpose-bound protected-processing design, subject to security review |
| Migration credentials | Temporary migration operator boundary; revoked after cutover |

The `secret_workload_identity` design authenticates a worker and scopes the
operation it may perform. Raw secrets are not returned to ordinary domain
canisters and are not persisted in stable memory.

## Migration plan

### Phase 0: inventory and contract freeze

Capture the existing schema, foreign keys, constraints, RLS policies, storage
policies, Edge Functions, timers, webhooks, secrets, external integrations,
and data-residency assumptions. Freeze public identifiers and define the
canonical domain contracts before moving authority.

### Phase 1: introduce the ICP application boundary

Define Candid interfaces and an ICP actor client between application workflows
and the future canisters. Supabase remains the only writer while the boundary
is introduced. Add correlation IDs, idempotency keys, audit events, and parity
fixtures at this stage.

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

### Phase 5: domain cutover to ICP

Transfer one domain and its data ownership to ICP at a time. The placement
registry records the owning canister and interface version. Clients use the ICP
actor contract, so the cutover does not require embedding persistence details in
every workflow.

### Phase 6: Supabase decommissioning and ICP recovery

Keep Supabase available only for domains not yet migrated or for the defined
rollback window. Decommission Supabase capabilities only after retention,
export, recovery, audit, and operational ownership have been accepted. ICP
recovery must restore a known versioned canister state, not create an untracked
second writer.

## Proposed canister inventory

The following is the proposed logical inventory. Rust and Motoko entries are
alternative or complementary implementations of the same domain boundary,
not a claim that every entry is already deployed.

| Canister/domain | Proposed responsibility | Language direction |
|---|---|---|
| `identity_access` | Application accounts, ICP principals, grants, exclusions, and authorization context | Rust control-plane candidate |
| `placement_registry` | Canister principals, domain ownership, subnet profile, health, and interface version | Rust control-plane candidate |
| `shard_router` | Resolve domain/tenant/workload placement to an ICP canister | Rust control-plane candidate |
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
| Webhook or external API call | HTTPS outcall or authenticated protected worker boundary |
| File/media processing | External worker; metadata and authorization in ICP |
| Administrative migration | `migration_coordinator` with checkpointed batches |

An Edge Function should not be ported line-for-line when its real purpose is a
database transaction, policy check, or queue transition. Those responsibilities
belong in the owning canister. Functions that contain non-deterministic network
calls, large payload processing, or vendor SDK behavior may remain external and
be invoked through an authenticated, idempotent boundary.

### Function-level migration map

The source inventory identifies 181 Supabase Edge Functions and scheduled
operations. The following map groups those functions by behavior so each one
has an explicit ICP owner or an explicit external destination. A function is
not considered migrated merely because a similarly named canister exists.

| Current Edge Function or group | Current responsibility | ICP destination | Runtime boundary | Status |
|---|---|---|---|---|
| `association-create-club-event`, `public-club-events`, `public-club-teams`, `notify-event-note`, `notify-game-kickoff`, `notify-new-member-events` | Club and event operations | `club_domain`, `events_domain`, `notification_queue` | Authenticated Candid methods and public queries | Port domain logic; queue delivery separately |
| `send-club-announcement`, `send-competition-broadcast` | Authorized broadcasts | `messaging_domain`, `notification_queue` | Canister authorization; external delivery worker | Port command and queue state |
| `assemble-catchup`, `auto-post-event-to-chat`, `auto-post-news-to-chat`, `backfill-chat-vault-groups`, `process-message-notifications`, `process-scheduled-messages`, `scheduled-messages-write` | Messaging automation | `messaging_domain`, `notification_queue`, `timer_jobs` | Candid updates with ordering and idempotency | Port after message ordering is proven |
| `summarize-chat`, `summarize-chat-icp` | Chat summarization | `messaging_domain` plus LLM worker | PII minimization; external API credential boundary | Keep model invocation external |
| `admin-delete-account`, `admin-set-temp-password`, `admin-update-email`, `delete-account`, `recover-account`, `export-user-data`, `permanent-delete-entity`, `secret-delete-user` | Account lifecycle and deletion | `identity_access`, `pii_access_control`, `migration_coordinator` | Operator role, purpose-bound access, audit | Port only after identity model approval |
| `auto-default-rsvp-confirm-cron`, `auto-default-rsvp-maintenance-cron`, `auto-rsvp-dm-cron`, `auto-rsvp-push-cron` | RSVP rules and reminders | `events_domain`, `notification_queue`, `timer_jobs` | Durable timer state and period/user/event idempotency | Port timer and domain logic separately |
| `process-duty-points`, `process-weekly-engagement-bonus` | Participation and engagement awards | `events_domain` or `club_domain` | Atomic period key and membership authorization | Candidate for early domain port |
| `public-minimum-app-version`, `share-page` | Public configuration and share reads | Dedicated canister query methods | Certified/public query; no privileged mutation | Low-risk query migration |
| `cancel-subscription`, `check-iap-authorization`, `confirm-event-payment`, `create-event-checkout`, `create-member-payment-checkout`, `create-storage-checkout`, `create-subscription-checkout`, `manage-stripe-config`, `stripe-webhook`, `verify-iap-receipt`, `reconcile-legacy-subscriptions` | Billing and payment webhooks | `events_domain`/`club_domain` for order state; payment gateway worker for provider calls | External worker; signed worker-to-canister update | Do not move provider secrets on-chain |
| `send-email`, `send-fcm-notification`, `send-push-notification`, all `send-*-email` functions | Email and push delivery | `notification_queue` for intent and status | Email/push worker with vault access | Keep provider delivery external |
| `drive-folder-sync`, `google-drive-import`, `google-places-search`, `playhq-sync`, `playhq-sync-club`, `playhq-sync-cron`, `resolve-drive-titles`, `fetch-link-preview`, `giphy-search` | OAuth, venue search, sports sync, previews, media search | `media_metadata`, `competition_domain`; direct query only where suitable | OAuth/sync worker or bounded HTTPS outcall | Classify by payload, secret, and rate limit |
| `get-signed-photo-url`, `permanent-delete-photos`, `scheduled-backup`, `vault-backup`, `vault-backup-list`, `vault-backup-restore`, `wipe-club-vault`, `sync-dispatch-credentials` | Storage authorization, backup, and vault operations | `media_metadata`, `pii_access_control`, `migration_coordinator` | Protected storage/backup worker; audited operator calls | Rebuild around ICP ownership metadata |
| `icp-llm-test` and diagnostics | AI or operational diagnostics | Dedicated operator method or external test worker | Admin principal, rate limits, audit trail | Never expose as public unauthenticated method |

### Scheduled function migration map

Scheduled functions become timer definitions and durable queue commands rather
than HTTP endpoints protected by cron secrets:

| Scheduled source functions | ICP owner | Required proof |
|---|---|---|
| `chat-photo-gallery-reminders`, `post-game-photo-prompts`, `send-photo-prompt-followup` | `timer_jobs`, `events_domain`, `media_metadata`, `notification_queue` | Event-relative timing, media state, dedupe |
| `cleanup-old-notifications`, `cleanup-push-subscriptions`, `cleanup-deleted-accounts`, `auto-purge-trash` | `timer_jobs` plus owning domain | Bounded deletion, retention, upgrade recovery |
| `digest-messages`, `process-event-notifications`, `process-message-notifications` | `messaging_domain`, `notification_queue` | Privacy, ordering, bounded fan-out |
| `process-push-delivery-queue`, `retry-missed-push-notifications` | `notification_queue` | Lease, at-least-once delivery, backoff, terminal failure |
| `process-scheduled-messages`, `scheduled-messages-write` | `messaging_domain`, `timer_jobs` | Claim-before-process and recurrence idempotency |
| `send-engagement-reminders`, `send-event-reminders`, `send-event-view-reminder`, `send-invite-reminders`, `send-renewal-reminders`, `send-storage-warnings`, `send-update-reminder` | `timer_jobs`, domain canister, `notification_queue` | Time zones, cooldown, authorization, delivery status |
| `check-pending-subs`, `expire-subscriptions`, `reconcile-legacy-subscriptions` | `timer_jobs`, payment gateway worker, domain canister | Provider truth, signed callbacks, reconciliation audit |
| `playhq-sync-cron` | `timer_jobs`, external sports sync worker, `competition_domain` | Bounded diff, provider rate limits, replay |
| `scheduled-backup`, `vault-backup`, `vault-backup-list`, `vault-backup-restore` | `migration_coordinator` and protected backup worker | Immutable retention, residency, restore rehearsal |

Every timer must persist job type, scope, next run, period/idempotency key,
attempt count, lease, last error, and terminal state. It must re-arm after a
canister upgrade and remain safe when a callback is delivered more than once.

### Caller and trust-boundary conversion

| Supabase caller mechanism | ICP replacement |
|---|---|
| Signed-in user JWT | User principal from Internet Identity or approved identity provider |
| App administrator role | Principal mapped to an audited `identity_access` administrator grant |
| Supabase service-role caller | Named workload principal with least-privilege Candid methods; no universal master key |
| `pg_cron` or cron secret | Native `timer_jobs` callback and persisted job authorization |
| Webhook signature | External gateway verifies the signature, then calls a restricted canister method |
| Internal signed request | Registered workload identity, nonce/idempotency key, and audit event |
| Auth hook | Explicit identity/account lifecycle method with replay and revocation controls |

## Secret routing and decommissioning map

The source secret inventory identifies 41 environment values and credentials.
The target rule is that ICP canisters hold principals, grants, approved
application state, and audit metadata, but not provider master keys.

| Secret or credential | Former Edge Function use | ICP-era custody | ICP interaction | State |
|---|---|---|---|---|
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` signature validation | Payments gateway worker secret store | Worker verifies webhook, then calls restricted order method | External |
| `stripe_secret_key` | Checkout, subscription, and charge APIs | Payments gateway worker secret store | `payment-processor` workload scope | External |
| `IGNITE_PAYMENTS_SUPABASE_SERVICE_ROLE_KEY`, `IGNITE_PAYMENTS_SUPABASE_URL` | Legacy payment database access | Temporary legacy-sync worker only | Checkpointed migration path; revoke after cutover | Temporary external |
| `RESEND_API_KEY` | `send-email` and transactional email | Email worker vault | `send-email-notification` claims `notification_queue` jobs | External |
| `FCM_PRIVATE_KEY`, `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_SERVICE_ACCOUNT` | FCM push delivery | Push worker vault | `send-push-notification` signs and delivers; canister stores status only | External |
| `VAPID_PRIVATE_KEY` | Web Push signing | Push worker vault | `send-web-push-notification` workload scope | External |
| `VAPID_PUBLIC_KEY` | Browser Web Push configuration | Public frontend configuration | Not an authorization secret | Public |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Drive OAuth and token exchange | OAuth worker vault | Worker submits authorized metadata to `media_metadata` | External |
| User Google OAuth token | User-specific Drive access | Encrypted worker/session boundary with expiry | Never copied to general canister state | Temporary external |
| `GOOGLE_PLACES_API_KEY` | `google-places-search` | HTTPS outcall credential boundary or Places worker | Bounded read-only request | External or outcall |
| `GIPHY_API_KEY` | `giphy-search` | HTTPS outcall credential boundary or media worker | Bounded read-only request | External or outcall |
| `GEMINI_API_KEY` | `summarize-chat`, `summarize-chat-icp` | AI gateway worker vault | Sanitized prompt and result callback | External |
| `LOVABLE_API_KEY` | Legacy AI operations | Deprecated worker vault | No new ICP dependency | Deprecate |
| `CRON_SECRET`, `AUTO_RSVP_DM_CRON_SECRET` | Cron endpoint authentication | None after timer migration | Replaced by native `timer_jobs` | Decommission |
| `NEW_CLUB_ALERT_SECRET` | Internal club alert webhook | Admin notification worker, if required | Restricted event callback | Review/deprecate |
| `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_PAT` | Database/API access | None after domain cutover | Replaced by ICP principals, canister addresses, and RBAC | Decommission |
| `APP_PUBLIC_ORIGIN`, `APP_ALLOWED_REDIRECT_ORIGINS`, `ALLOW_LOCAL_REDIRECTS` | Identity and redirect configuration | Public frontend/deployment configuration | Validated as configuration, not authorization | Public/config |

### Secret access protocol

1. A canister creates a durable, scoped job containing no raw credential.
2. The worker authenticates with its registered workload principal.
3. `secret_workload_identity` checks workload, scope, nonce, expiry, and
  revocation status, and records an audit event.
4. The worker reads the provider secret from its external vault and performs
  the operation.
5. The worker acknowledges success or failure using the job idempotency key;
  the canister records status and retry state, not the secret.

The migration exit gate requires repository scans, deployment configuration
review, scope denial tests, principal revocation tests, worker-vault failure
tests, and proof that decommissioned Supabase and cron credentials are no longer
referenced.

## Operational and deployment considerations

- Canister upgrades require stable-state compatibility, versioned Candid
  interfaces, rollback planning, and migration of serialized state.
- Placement decisions must account for subnet capacity, cycles, latency,
  jurisdiction, disaster recovery, and the consistency model of cross-domain
  calls.
- Cross-canister calls use explicit target identity, authorization, timeout, and
  idempotency metadata. A global account ID is a reference, not permission to
  read another tenant's data.
- Observability must correlate frontend request, provider target, principal,
  domain command, migration batch, and external side effect.

### Public ICP versus Cloud Engine deployment

The target architecture requires a deployment decision, not just a canister
design. The first production deployment could use the public Internet Computer,
an ICP Cloud Engine environment, or a staged combination of both. The choice
must be evaluated against privacy, jurisdiction, operational control, cost,
availability, and portability.

| Consideration | Public Internet Computer | ICP Cloud Engine question |
|---|---|---|
| Replication and execution | What subnet and replica guarantees apply to the selected canisters? | Can execution and replicated state be restricted to a declared jurisdiction or approved region? |
| Data residency | Where can stable state, certified assets, backups, and logs be stored or replicated? | What contractual and technical controls guarantee that PII remains within an approved jurisdiction? |
| Operator trust | Which platform operators and governance processes apply? | What additional operator, host, tenant-isolation, and audit controls are available? |
| External calls | How are HTTPS outcalls routed and geographically sourced? | Can outcall egress be restricted to approved regions, networks, or providers? |
| Availability | What subnet-level failure and upgrade behavior should be expected? | What private capacity, SLA, failover, and disaster-recovery options are available? |
| Portability | Can the same Wasm, Candid interfaces, stable-state format, and client flow move between environments? | What lock-in or provider-specific operational dependencies would Cloud Engine introduce? |
| Compliance evidence | What public subnet, node, and governance evidence can be provided? | Can DFINITY provide residency attestations, audit evidence, and deletion/retention controls suitable for the application's privacy obligations? |

For privacy analysis, jurisdiction must be defined for more than the primary
canister. The review must cover replicated canister state, stable-memory
snapshots, subnet backups, certified assets, execution logs, audit records,
HTTPS-outcall egress, external worker vaults, and disaster-recovery copies.
The architecture should not claim jurisdictional isolation until those paths
are documented and contractually or technically enforceable.

## Risks and unresolved decisions

| Topic | Risk or decision | Proposed review outcome |
|---|---|---|
| Authorization parity | RLS behavior may be broader or more implicit than a canister method contract | Approve a policy-to-operation matrix and negative-test corpus before cutover |
| Cross-canister consistency | Asynchronous Candid calls do not provide a database transaction across canisters | Prefer aggregate ownership, explicit sagas, and durable workflow state |
| External integrations | HTTPS outcalls introduce latency, retry, consensus, and credential-delivery constraints | Confirm which calls belong in canisters versus protected workers |
| PII and residency | A global account anchor can accidentally become a cross-tenant access path | Require tenant-scoped capabilities and an approved protected-data design |
| Migration rollback | A second writer can make rollback ambiguous or corrupt ordering | Permit one authority per slice and checkpoint every transfer |
| Cost and capacity | Cycles, storage growth, and subnet scheduling may change domain boundaries | Validate representative load and define operational budgets |
| Upgrade safety | Stable memory and Candid changes can make domain upgrades irreversible | Require versioned schemas, upgrade rehearsal, and recovery evidence |
| ICP trust boundary | A canister or worker may be reachable but not authorized for a domain operation | Authenticate the caller and target; fail closed on unknown principals |

## DFINITY feedback requested

The following questions are intentionally concrete so the proposal can be
reviewed and narrowed into an implementation plan:

1. Which proposed domains should be combined or split for subnet efficiency,
   upgrade isolation, and cross-domain call volume?
2. Is the Rust/Motoko division appropriate, or should one language be preferred
   for all domain canisters to reduce operational and audit complexity?
3. What ICP-supported pattern should be used for authenticated access to
  external services without placing provider secrets in canisters?
4. Which migration and recovery guarantees are realistic for the proposed
   checkpoint, replay, and single-authoritative-writer model?
5. What subnet, cycle, storage, HTTPS-outcall, and upgrade constraints should
   be incorporated before selecting the first production pilot domain?
6. Which proposed external integrations should remain protected workers rather
  than become HTTPS outcalls from canisters?
7. For this application, should production canisters run on the public Internet
  Computer, ICP Cloud Engine, or a staged deployment using both?
8. If Cloud Engine is selected for privacy, can DFINITY restrict canister
  execution, replicated state, backups, logs, certified assets, and HTTPS
  outcalls to an approved jurisdiction or region?
9. What guarantees and evidence exist for jurisdictional isolation, operator
  access, tenant isolation, deletion, disaster recovery, and legal data
  residency in each deployment model?
10. Can the application preserve Candid, Wasm, stable-state, identity, and
   client portability between public ICP and Cloud Engine if requirements
   change later?
11. Which of the listed vendors and API classes are suitable for direct ICP
  HTTPS outcalls, and which should always use protected external workers?
12. Can Cloud Engine constrain external API egress and worker placement by
  jurisdiction, including payment, identity, media, AI, email, and push
  providers?
13. Does DFINITY recommend preferred providers or integration patterns for
  payments, notifications, object storage, geocoding, AI, and OAuth that
  reduce secret exposure and improve portability?

## Recommended next review package

Before implementation approval, produce these companion artifacts:

- a source-of-truth inventory mapping Supabase tables, RLS policies, Edge
  Functions, timers, and secrets to proposed owners;
- a Candid interface draft for the first pilot domain and its authorization
  context;
- a policy parity test report containing positive and negative cases;
- a migration runbook covering checkpoint, replay, cutover, rollback, and
  decommissioning; and
- a threat model for principal authentication, PII access, secret delivery, and
  cross-canister calls.

## Required implementation gates

- [ ] Implement versioned Candid interfaces and actor clients for the first ICP
  pilot domain.
- [ ] Demonstrate Internet Identity/principal-to-account linking and revocation.
- [ ] Prove RLS-to-canister authorization parity with positive and negative
  tests, including cross-tenant escalation attempts.
- [ ] Demonstrate stable-memory upgrades, backup/export, restore, and rollback.
- [ ] Verify HTTPS outcalls and external workers use bounded, idempotent,
  secret-free canister interactions.
- [ ] Demonstrate media access control and lifecycle behavior without relying on
  Supabase Storage authorization.
- [ ] Run representative load tests for cycles, latency, storage growth, and
  cross-canister call volume.
- [ ] Define the evidence required to declare Supabase unnecessary for each
  migrated domain.
