# Hybrid Supabase and ICP Implementation Plan

The consolidated implementation sequence for the mixed Rust/Motoko
architecture, including PII, vetKeys, and vault gates, is in
[HYBRID_RUST_MOTOKO_EXECUTION_PLAN.md](HYBRID_RUST_MOTOKO_EXECUTION_PLAN.md).
This document retains the original hybrid Supabase/ICP rationale and detailed
historical step notes.

## Current position

This is a coexistence-only plan. Existing Supabase data, users, domains, jobs,
and integrations remain in Supabase and are not migrated, copied, cut over, or
deleted. ICP is an additional backend for newly provisioned or explicitly
isolated workloads; existing Supabase workloads are never reassigned. The
contracts and control plane must preserve a future, explicitly authorized
migration path in either direction, but that path is not executed now.

The lab currently proves the following with synthetic data:

- Versioned per-club placement between Supabase and ICP.
- Country policies, backend availability switches, and placement lifecycle states.
- Fail-closed provider selection with no silent fallback.
- Provider-neutral Club Links service boundaries.
- Synthetic Supabase and local ICP provider slots in the active lab UI.
- Local ICP Club Links canister behavior, authorization, isolation fencing, and recovery probes.
- A real disposable placement-registry canister exercised through its generated Candid actor.

Status checkpoint for steps 1-6 in this repo-only lab:

- Step 1 — Ownership model: recorded in [DOMAIN_OWNERSHIP_MODEL.md](DOMAIN_OWNERSHIP_MODEL.md) and enforced in the placement registry by explicit backend ownership decisions and fail-closed routing.
- Step 2 — Placement control plane: implemented in [../backend/placement_registry/src/lib.rs](../backend/placement_registry/src/lib.rs) with versioned placements, policy, availability switches, lifecycle state, and audit history.
- Step 3 — Provider-neutral application layer: implemented through the local service boundaries in [../frontend/src/lab/hybridClubLinksService.ts](../frontend/src/lab/hybridClubLinksService.ts), [../frontend/src/lab/routedClubLinksService.ts](../frontend/src/lab/routedClubLinksService.ts), and [../frontend/src/lab/localActor.ts](../frontend/src/lab/localActor.ts).
- Step 4 — ICP domain canister: the synthetic Club Links ICP canister is in [../backend/club_links/src/lib.rs](../backend/club_links/src/lib.rs) with authorization, freeze/import rules, and local identity recovery checks.
- Step 5 — ICP topology: local loopback deployment, canister lifecycle, and same-origin proxy restrictions are defined in [../frontend/scripts/local-icp.mjs](../frontend/scripts/local-icp.mjs), [../frontend/src/lab/networkGuard.mjs](../frontend/src/lab/networkGuard.mjs), and [../frontend/vite.config.ts](../frontend/vite.config.ts).
- Step 6 — Separate ICP identity: synthetic principal/account segregation is handled in [../frontend/src/lab/syntheticIdentities.mjs](../frontend/src/lab/syntheticIdentities.mjs) and linked to the canister account model in [../backend/club_links/src/identities.rs](../backend/club_links/src/identities.rs).
- Step 7 — Authorization parity audit: the complete cross-domain RLS inventory is recorded in [RLS_DOMAIN_INVENTORY.md](RLS_DOMAIN_INVENTORY.md). Domain parity is implemented for Club Links, and authenticated access fencing is implemented for the notification queue and placement governance reads. Every other domain remains gated until its listed source rules have an ICP boundary and tests; no domain is treated as ported merely because a router exists.
- Step 7/13 — Canister topology: the complete domain-to-canister allocation, shard keys, physical scaling rules, and non-canister external boundaries are recorded in [ICP_CANISTER_TOPOLOGY.md](ICP_CANISTER_TOPOLOGY.md). The baseline is 10 logical canister roles: placement, routing, identity/access, club, events, competitions, messaging, media metadata, notifications, and timers. Existing Supabase data and payment/secret/external-integration authority remain outside ICP.
- Step 8 — Messaging design (initial contract slice): the provider-neutral message router now accepts caller-supplied idempotency IDs and supports incremental reads after a validated sequence. Conversation ownership, unread state, acknowledgements, retention, performance, and mobile behavior remain outstanding.

The lab is not production-ready. It has no production Supabase connection, production ICP deployment, complete ICP domain implementation, or real user data. Existing production Supabase remains unchanged and authoritative. The active hybrid screen uses the configured loopback ICP canister for its ICP placement and an in-memory synthetic Supabase slot; missing local ICP configuration fails closed.

## 1. Define the permanent ownership model

The current ownership matrix and transition rules are recorded in [DOMAIN_OWNERSHIP_MODEL.md](DOMAIN_OWNERSHIP_MODEL.md).

Residency and deployment constraints are captured in [RESIDENCY_DEPLOYMENT_DECISION_PACK.md](RESIDENCY_DEPLOYMENT_DECISION_PACK.md); these decisions must be resolved before the placement registry is extended for production targets.

Decide which backend owns each domain and who may write it:

- Supabase per club.
- ICP per club.
- Shared global services.
- Optional user-specific services later.

One backend must be the authoritative writer for a domain at a time. Existing Supabase workloads remain Supabase-authoritative. Do not permit independent dual writes, data replication, or reassignment in this plan.

## 2. Productionise the placement control plane

Extend the placement registry with:

- Versioned club-to-backend assignments.
- Trusted country policy.
- Backend availability switches.
- `Active`, `ReadOnly`, and `Blocked` states for newly provisioned ICP workloads.
- Optimistic concurrency and idempotent operator commands.
- Placement audit history.
- Operator authentication and approval workflow.
- Backup, restore, and upgrade procedures.
- Availability and health reporting.

Treat this as critical infrastructure. A bad placement decision can expose data, strand data, or route users to an unavailable backend.

## 3. Complete the provider-neutral application layer

Define and implement contracts for every domain:

- Clubs and teams.
- Profiles, memberships, roles, and permissions.
- Events and schedules.
- Messaging.
- Notifications.
- Media and files.
- Sponsors and competitions.

Every provider must resolve placement before an operation, fail closed when disabled or disallowed, respect read-only state, clear identity-bound caches, and use consistent errors. Existing Supabase workloads keep their current provider path; UI components must not call Supabase or ICP SDKs directly.

## 4. Implement ICP domain canisters

The Club Links canister is only a proof of concept. Implement bounded ICP domains with:

- Stable-memory schemas.
- Access-pattern-driven indexes.
- Candid interfaces.
- Query and update methods.
- Explicit caller authorization.
- Bounded pagination and payloads.
- Idempotent request IDs.
- Synthetic snapshot, recovery, and upgrade methods; no Supabase data import.

Avoid copying PostgreSQL tables one-for-one. Design around ownership, query patterns, and service boundaries.

## 5. Decide and deploy the ICP topology

Choose the topology for:

- Placement/control-plane canisters.
- Router or directory canisters.
- Club-domain canisters.
- Messaging canisters.
- Media metadata and asset canisters.
- Notification/timer services.
- Governance and operator services.

Decide canister-per-club versus shards, hot-club isolation, canister creation and retirement, cycle budgets, upgrade sequencing, inter-canister limits, subnet placement, and recovery boundaries. Treat sharding as a capacity and isolation tool, not an automatic latency improvement.

## 6. Define separate ICP identity

Design and implement for newly provisioned ICP workloads only:

- Internet Identity.
- Google, Apple, or other OpenID providers where required.
- Synthetic principal/account separation, session persistence, and revocation.

Do not link or migrate existing Supabase users in this plan. Production
authentication, account recovery, mobile authentication, and any future
identity bridge remain outside scope.

Use a stable application account ID with linked principals. Do not use a principal as a direct replacement for every historical Supabase UUID.

## 7. Port authorization and RLS

Inventory every RLS policy, helper, trigger, and ownership rule. Implement reusable canister checks equivalent to:

- `requireAuthenticatedUser`.
- `requireClubMember`.
- `requireClubAdmin`.
- `requireTeamMember`.
- `requireRole`.
- Ownership, parent, guardian, exclusion, and app-admin checks.

Authorization must execute inside every update method. Build parity tests against the source behavior and include negative cases for excluded users, cross-club access, stale revisions, and ownership violations.

## 8. Design messaging before migrating it

Messaging is a major feasibility gate. Define:

- Conversation ownership.
- Sequential message IDs.
- Unread state.
- Delivery acknowledgement.
- Reactions and replies.
- Attachments.
- Polling and notification refresh.
- Retention and deletion.

Evaluate optimistic UI, querying after `last_seen_message_id`, adaptive polling, background refresh, and unread counters. Prove latency, update throughput, ordering, mobile battery impact, and attachment behavior before enabling a new ICP messaging workload.

## 9. Implement media and file storage

Separate file metadata from file bytes. Define architectures for avatars, photos, PDFs, club documents, galleries, and message attachments.

Prove chunked transfer, private access, capability or signed access, file-size limits, deletion, retention, content certification where applicable, cost, cycle usage, and scanning/moderation boundaries. Do not assume one generic asset canister suits every content type.

## 10. Replace Edge Functions and database automation

The current sanitized function and timer inventory is recorded in [EDGE_FUNCTION_AND_TIMER_INVENTORY.md](EDGE_FUNCTION_AND_TIMER_INVENTORY.md).

Classify every Edge Function, database function, trigger, and scheduled task as:

- An ICP update method.
- An ICP timer.
- An inter-canister call.
- An external trusted worker.
- A Supabase-only function that remains there.

Keep email, push, payments, scanning, and other external APIs behind explicit authenticated integration boundaries.

## 11. Do not build a data migration system

Do not export, transform, import, freeze, cut over, reconcile, or delete
existing Supabase data in this phase. Keep provider-neutral contracts,
placement versions, fencing states, snapshots, and reconciliation interfaces
compatible with a future explicitly authorized migration from Supabase to ICP
or ICP to Supabase.

Preserve IDs and relationships where useful, but use stable application IDs rather than coupling new authorization to Supabase UUIDs.

## 12. Complete the real Supabase coexistence adapter

Implement only a synthetic/non-production Supabase provider slot for shared
contract tests and local hybrid behavior. Keep explicit environment selection,
disabled/read-only states, consistent errors, logging, and independent tests.
Keep the current production Supabase system and its data completely unchanged.

## 13. Establish full ICP delivery infrastructure

Create separate local, disposable, shared-test, staging, and production environments. Define:

- Canister manifests and IDs.
- Cycle wallets and top-up policy.
- Deployment identities.
- Wasm and Candid compatibility checks.
- Upgrade and rollback scripts.
- Stable-memory backups.
- Monitoring and alerts.
- Subnet and cycle capacity budgets.

Keep production credentials outside the repository and deployment workflows.

### DFINITY-specific infrastructure constraints

The following constraints must be resolved before production ICP design is approved:

- A canister is not a general-purpose secret vault. Canister state is replicated to every node in its subnet. Sensitive secrets must therefore remain outside ordinary canister state, or the deployment must use an approved SEV-SNP protected Cloud Engine configuration where replica memory is encrypted and operator access is constrained.
- SEV-SNP availability is tied to the eligible bare-metal node pool and must be confirmed for each required residency region. This creates a joint hardware, geography, cost, and availability decision rather than a simple application setting.
- vetKeys are not directly reachable from an engine canister when the call would cross a subnet boundary with cycles. If vetKeys are required, design and operate a separately deployed, funded proxy canister and document the trust boundary.
- Edge Function replacements that call outside their subnet must use bounded-wait calls with no cycles. A call that compiles and installs can still fail at runtime if it violates this rule. Every external call path requires a runtime failure test and an explicit retry or compensation strategy.
- Scheduled work must use in-canister timers. Timers are transient across upgrades, so every timer-based domain must persist its schedule and re-arm timers from `post_upgrade` or an equivalent upgrade-safe initialization path.
- Internet Identity principals are origin-specific. The canonical authentication origin must be chosen before live users are onboarded. Changing from a default canister origin to a custom domain later creates a new principal for the same person and requires a controlled account-linking recovery path.
- Existing Supabase user IDs are not converted to ICP principals. New ICP workloads use synthetic or separately provisioned application accounts.

These constraints apply to secrets, Edge Function replacements, timers, separate ICP identity, regional deployment, and Cloud Engine topology. They are production design gates, not implementation details to defer.

## 14. Add operations and governance

Provide audit logs, backend health, kill switches, migration dashboards, cycle alerts, latency and failure metrics, message backlog metrics, storage usage, upgrade history, incident runbooks, and recovery drills.

Define who may change country policy, backend availability, placement, lifecycle state, and canister topology. Require review for changes affecting data location or access.

## 15. Complete web, mobile, and notification clients

Move all clients to provider-neutral contracts. Validate offline queues, retries, idempotency, session persistence, push notifications, deep links, background refresh, and identity changes. Browser validation alone is insufficient for mobile authentication and background behavior.

## 16. Production readiness gates

Before any production club uses ICP, require:

- RLS and authorization parity.
- Proof that existing Supabase workloads remain untouched.
- Messaging performance results.
- Storage transfer and access tests.
- Canister upgrade and stable-memory restore tests.
- Cycle exhaustion and recovery tests.
- Country-policy and backend kill-switch tests.
- Web and mobile validation.
- Security review.
- Operational readiness review.

## 17. Recommended rollout order

1. Club Links.
2. Low-risk club configuration.
3. Read-only profile or directory views.
4. Events and schedules.
5. Membership and roles.
6. Notifications.
7. Media metadata and selected files.
8. Messaging.
9. Authentication for newly provisioned ICP workloads only.
10. Larger-scale new ICP workload provisioning.

Keep Supabase authoritative for every existing domain and workload. ICP may
serve only newly provisioned or explicitly isolated workloads with independent
identity, placement, storage, and operational controls.

## Recommendation

The architecture is **GO WITH CONDITIONS** for coexistence only. Production
coexistence depends on authorization parity, approved ICP domain canisters,
messaging/storage decisions, mobile behavior, and full ICP operations. Data
migration and production account linking are deferred, not removed from the
long-term architecture; any future migration must be separately approved and
must use freeze, export/import, reconciliation, cutover, rollback, and audit
evidence.
