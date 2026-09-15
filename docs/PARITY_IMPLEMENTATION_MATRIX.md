# RLS and Automation Parity Implementation Matrix

## Scope

This matrix is the working gate for Step 11A in
[HYBRID_RUST_MOTOKO_EXECUTION_PLAN.md](HYBRID_RUST_MOTOKO_EXECUTION_PLAN.md).
It maps sanitized source authorization/automation evidence to the ICP
implementation boundary and records what remains to be proven.

A `poc` or routing implementation is not parity proof. A role may be enabled
only when its row reaches `implemented_and_proven` or has an explicit approved
`external_boundary` / `supabase_only` status.

The structural matrix gate is `npm run check:parity --prefix frontend`. It
ensures every non-control topology role has an explicit status row; it does not
replace the domain-specific executable behavior and source-parity tests.

Source inventories:

- [RLS_DOMAIN_INVENTORY.md](RLS_DOMAIN_INVENTORY.md)
- [EDGE_FUNCTION_AND_TIMER_INVENTORY.md](EDGE_FUNCTION_AND_TIMER_INVENTORY.md)
- [PII_FIELD_CLASSIFICATION_MATRIX.md](PII_FIELD_CLASSIFICATION_MATRIX.md)
- [PARITY_EVIDENCE_REGISTER.md](PARITY_EVIDENCE_REGISTER.md)

## Status values

- `implemented_and_proven`: source rules are mapped and positive/negative
  behavior is covered by executable tests.
- `poc_needs_parity`: local behavior exists, but source parity or important
  negative cases remain.
- `external_boundary`: intentionally remains outside ordinary canister state;
  bounded-call and failure-closed tests are still required.
- `supabase_only`: remains with Supabase for coexistence and is not enabled on
  ICP.
- `not_enabled`: no ICP behavior may be treated as active.

## Domain authorization matrix

| Domain | Source policy/helper evidence | ICP boundary | Current status | Required proof before enablement |
| --- | --- | --- | --- | --- |
| Identity/access | `has_role`, profile privacy, account linking, guardian/exclusion helpers | `backend/identity_access` | `poc_needs_parity` | profile field privacy, recovery, consent, erasure, site-scoped roles, column matrix reconciliation |
| Club/team | `is_club_member`, `is_team_member`, club/team exclusions, ownership | `backend/club_links` and future club domain | `poc_needs_parity` | full clubs/memberships parity, cross-club tests, bounded pagination, upgrade/restore |
| Events | `can_manage_event_groups`, targeted event access, RSVP/guardian rules | `backend/events_domain` | `poc_needs_parity` | child visibility, roster/duty/lineup parity, replay safety, timer capability, pagination |
| Competition | `can_view_competition`, organizer/admin/official checks, join tokens | `backend/competition_domain` | `poc_needs_parity` | league ownership, coordinators/officials/participants, match edit fencing, archive audit |
| Messaging | `can_access_chat`, group membership, DM, blocked-user, deletion rules | `backend/messaging_domain` | `poc_needs_parity` | reactions/replies/polls/moderation/retention, blocked users, full group/DM parity, load tests |
| Media | `can_view_album`, uploader/commenter visibility, storage prefix, deletion | `backend/media_metadata` + external storage | `poc_needs_parity` | album/event/team/guardian parity, encrypted child media, chunks, scanning, retention |
| Notifications | recipient/prefs/worker capabilities, targeted recipients, cleanup | Rust/Motoko notification queues + external delivery | `poc_needs_parity` | recipient/club/domain scope, preference checks, leases, delivery idempotency |
| Timers | workflow scope, operator/internal callers, claim/recovery rules | `backend/timer_jobs` | `poc_needs_parity` | domain callback capabilities, leases, dead letters, workflow idempotency |
| `pii_access_control` | field-level encryption, access policies, audit logging, key rotation, cryptographic erasure | `backend/pii_access_control` | `poc_needs_parity` | vetKeys production integration, SEV-SNP attestation, automated 90-day timer rotation |
| `secret_workload_identity` | workload registration, scope whitelist enforcement, access audit | `backend/secret_workload_identity` | `poc_needs_parity` | external vault attestation, short-lived token issuance, multi-region worker sync |
| Placement/routing | operator roles, residency, health, lifecycle, route fencing | placement registry + shard router | `implemented_and_proven` for synthetic gates | production target/residency evidence, route cache disposal, full topology recovery |

## Automation and Edge Function matrix

| Function class | Sanitized source examples | ICP treatment | Current status | Remaining proof |
| --- | --- | --- | --- | --- |
| Low-risk domain writes | club/event/team/configuration functions | domain canister update/query | `poc_needs_parity` | source behavior matrix, authorization, idempotency, upgrade/restore |
| Durable timers | RSVP reminders, scheduled messages, cleanup, engagement jobs | `timer_jobs` with domain callback capability | `poc_needs_parity` | workflow-by-workflow mapping, leases, backoff, dead letters, re-arm |
| Notification fan-out | event/message/push notification processors | notification queue + external delivery worker | `poc_needs_parity` | recipient derivation, preferences, provider idempotency, failure recovery |
| Media cleanup | trash purge, photo prompts, storage warnings | media metadata + external storage worker | `poc_needs_parity` | retention, deletion authority, scanning/moderation, child-media safety |
| Billing/subscriptions | checkout, webhooks, IAP, subscription reconciliation | external trusted integration | `external_boundary` | signature/replay tests, vault identity, bounded calls, compensation |
| Email/push delivery | send-email, FCM/APNs/VAPID functions | external delivery worker | `external_boundary` | vault adapter, least privilege, retries, provider idempotency |
| Drive/Google/PlayHQ | sync/import/search functions | external regional worker | `external_boundary` | bounded-wait/no-cycles, payload limits, residency, retry/compensation |
| LLM/AI | chat summaries and AI calls | external protected worker | `external_boundary` | PII minimization, consent, secret boundary, output retention |
| Backups/vault | scheduled backup, vault backup/restore | approved external backup/vault boundary | `external_boundary` | encryption, immutable retention, restore drill, credential isolation |
| Supabase compatibility | existing production workflows | remain Supabase-authoritative | `supabase_only` | no silent reroute, provider isolation, explicit future migration approval |

## Required evidence packet per row

Before changing a row to `implemented_and_proven`, attach or link:

1. Source policy/helper/RPC/function references.
2. ICP method or external boundary reference.
3. Positive and negative executable tests.
4. Cross-site, cross-club, ownership, exclusion, and replay tests where relevant.
5. Stable schema, upgrade, snapshot/restore, and interruption evidence.
6. Idempotency, retry, timeout, payload, residency, and compensation evidence
   for worker/external paths.
7. Confirmation that no secrets, raw keys, production PII, or unencrypted child
   media enter ordinary canister state.

## Current decision

The inventories are complete enough to drive implementation. The parity work is
not complete. The next implementation slices should promote rows from
`poc_needs_parity` to `implemented_and_proven` in domain order, starting with
identity/club authorization and then events, competitions, messaging, media,
and workers.
