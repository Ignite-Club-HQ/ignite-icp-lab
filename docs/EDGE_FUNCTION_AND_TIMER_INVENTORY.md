# Edge Function and Scheduled-Work Inventory

This is an analysis of the inert sanitized references under `reference/backend/supabase/functions`. No SQL, Edge Function, external API, or production service was executed.

## Migration classification

This inventory is the source map for the upcoming authorization and automation
parity phase. Each function must receive an explicit parity record identifying
its destination, caller capability, site/domain scope, idempotency key, retry
and timeout behavior, payload bound, residency impact, and compensation path.
Functions that remain external or Supabase-only must be marked explicitly;
they are not considered ported because a related canister or router exists.

| Class | ICP treatment |
| --- | --- |
| Domain method | Move business logic into an authenticated canister update/query method |
| Timer worker | Persist schedule and idempotency state in stable memory; re-arm after upgrade |
| Notification worker | Keep record/fan-out state in ICP or Supabase; use an external delivery worker for email/push |
| External integration | Keep in a regional external worker or provider service; invoke through a bounded-wait, no-cycles path where ICP calls it |
| Secret operation | Keep outside ordinary canister state; use approved secret infrastructure or protected Cloud Engine design |
| Admin/diagnostic | Keep as an operator service with explicit roles and audit events |
| Supabase-only compatibility | Keep in the Supabase provider until the domain moves |

## Scheduled and timer-driven functions

These functions are driven by `pg_cron`, scheduled invocation, or periodic workers and require durable schedule state when moved to ICP:

| Function | Cadence/trigger described in source | Main behavior | ICP design concern |
| --- | --- | --- | --- |
| `auto-default-rsvp-confirm-cron` | Every 30 minutes; 16–20 hour event window | Sends one confirmation DM for default RSVPs | Durable dedupe key and bounded fan-out |
| `auto-default-rsvp-maintenance-cron` | Every 6 hours | Pauses stale defaults and sends rollover prompts | Timer re-arm, 28/180-day state, idempotency |
| `auto-rsvp-dm-cron` | Every 15 minutes | T-72h/T-24h/T-3h RSVP DMs | Per-event/user/cadence dedupe and notification delivery |
| `auto-rsvp-push-cron` | Every 15 minutes | T-6d/T-48h/T-6h push reminders | External push worker and retry state |
| `auto-purge-trash` | Scheduled maintenance | Removes expired storage trash | Storage ownership, retention, bounded batches |
| `chat-photo-gallery-reminders` | Scheduled reminder logic | Reminds about photo galleries | Club-scoped schedule and external notifications |
| `check-pending-subs` | Periodic subscription check | Reconciles subscription state | Payment provider call and idempotency |
| `cleanup-deleted-accounts` | Scheduled cleanup | Removes retained deleted-account data | Legal retention and account mapping |
| `cleanup-old-notifications` | Scheduled cleanup | Batch deletes old notifications | Bounded stable-memory deletion |
| `cleanup-push-subscriptions` | Scheduled cleanup | Removes invalid/expired push registrations | Device identity and external delivery state |
| `digest-messages` | Scheduled digest | Builds message summaries/digests | Messaging read workload and privacy |
| `expire-subscriptions` | Scheduled expiry | Changes expired subscription state | Payment truth and retry handling |
| `playhq-sync-cron` | Every 30 minutes | Re-invokes PlayHQ synchronization | External API, bounded-wait, regional data path |
| `post-game-photo-prompts` | Event-relative schedule | Prompts users after games | Event timer and dedupe |
| `process-event-notifications` | Trigger plus worker kick | Fans out event notifications | Queue ownership, bounded batches, external delivery |
| `process-message-notifications` | Trigger/worker | Processes message notifications | Chat ordering and notification dedupe |
| `process-push-delivery-queue` | Cron-backed queue drainer | Claims, delivers, retries push jobs | External calls, at-least-once delivery, durable queue |
| `process-scheduled-messages` | Every minute | Posts due scheduled messages | Claim-before-process and recurrence state |
| `process-weekly-engagement-bonus` | Weekly schedule | Awards engagement points | Idempotent period key and membership authorization |
| `process-weekly-engagement-digest` | Weekly schedule | Sends engagement digest | PII minimization and external email |
| `reconcile-legacy-subscriptions` | Periodic reconciliation | Repairs old subscription records | External billing truth and audit |
| `retry-missed-push-notifications` | Scheduled retry | Retries missed notifications | Backoff, terminal states, provider limits |
| `scheduled-backup` | Scheduled backup | Exports/backups Supabase data | Residency, secret handling, immutable retention |
| `scheduled-messages-write` | Scheduled write path | Creates scheduled message work | Authorization and idempotency |
| `send-engagement-reminders` | Scheduled | Sends engagement reminders | Cooldown and delivery provider |
| `send-event-reminders` | Event-relative schedule | Sends event reminders | Time zones, dedupe, delivery state |
| `send-event-view-reminder` | Event-relative schedule | Reminds users about event views | User privacy and dedupe |
| `send-invite-reminders` | Scheduled | Reminds pending invitees | Membership state and cooldown |
| `send-photo-prompt-followup` | Scheduled | Follows up photo prompts | Media state and notification queue |
| `send-renewal-reminders` | Scheduled | Sends renewal reminders | Billing truth and email delivery |
| `send-storage-warnings` | Scheduled | Warns about storage usage | Regional quota and email delivery |
| `send-update-reminder` | Scheduled | Sends update reminders | App-version policy and notification delivery |

## Event and domain methods

These are candidates for canister methods when their data domain is on ICP:

| Function group | Functions | Likely destination |
| --- | --- | --- |
| Club/team/event operations | `association-create-club-event`, `public-club-events`, `public-club-teams`, `notify-event-note`, `notify-game-kickoff`, `notify-new-member-events`, `send-club-announcement`, `send-competition-broadcast` | Club or competition canister, with notification queue |
| Chat and messaging | `assemble-catchup`, `auto-post-event-to-chat`, `auto-post-news-to-chat`, `backfill-chat-vault-groups`, `process-message-notifications`, `process-scheduled-messages`, `scheduled-messages-write`, `summarize-chat`, `summarize-chat-icp` | Messaging canister plus external worker/LLM boundary |
| Membership and account administration | `admin-delete-account`, `admin-set-temp-password`, `admin-update-email`, `delete-account`, `recover-account`, `export-user-data`, `permanent-delete-entity`, `secret-delete-user` | Account and membership service; secrets remain external |
| RSVP and participation | `auto-default-rsvp-confirm-cron`, `auto-default-rsvp-maintenance-cron`, `auto-rsvp-dm-cron`, `auto-rsvp-push-cron`, `process-duty-points`, `process-weekly-engagement-bonus` | Events/membership canister and notification worker |
| Public read APIs | `public-club-events`, `public-club-teams`, `public-minimum-app-version`, `share-page` | Certified query methods or regional provider API |

## External integrations and secret-sensitive functions

These should not be moved into ordinary canister state without a separate secret and call-boundary design:

- Billing and payments: `cancel-subscription`, `check-iap-authorization`, `confirm-event-payment`, `create-event-checkout`, `create-member-payment-checkout`, `create-storage-checkout`, `create-subscription-checkout`, `manage-stripe-config`, `stripe-webhook`, `verify-iap-receipt`, `reconcile-legacy-subscriptions`.
- Email and push: `send-email`, `send-fcm-notification`, `send-push-notification`, all `send-*-email` functions, `send-association-broadcast`, `send-club-announcement`, `send-competition-broadcast`.
- External data providers: `drive-folder-sync`, `google-drive-import`, `google-places-search`, `playhq-sync`, `playhq-sync-club`, `playhq-sync-cron`, `resolve-drive-titles`, `fetch-link-preview`, `giphy-search`.
- Storage and vault: `get-signed-photo-url`, `permanent-delete-photos`, `scheduled-backup`, `vault-backup`, `vault-backup-list`, `vault-backup-restore`, `wipe-club-vault`, `sync-dispatch-credentials`.
- LLM/AI: `summarize-chat`, `summarize-chat-icp`, `icp-llm-test`.

For each function, document the destination subnet, bounded-wait behavior, no-cycles requirement for cross-subnet calls, payload limit, timeout, retry, idempotency key, and residency impact. A function that compiles and installs may still be rejected at runtime if its cross-subnet call shape is invalid.

## Authentication and internal callers

The source uses several caller classes:

- Signed-in users.
- App administrators.
- Service-role callers.
- Cron secrets.
- Internal signed requests.
- Webhook signature verification.
- Auth hooks.

Each must become an explicit ICP capability or operator role. A public Candid method must not be treated as an internal worker merely because the frontend hides it.

## Timer implementation standard

Every ICP timer replacement must persist:

- Job type and scope.
- Next-run time.
- Idempotency key or period key.
- Attempt count and last error.
- Claim/lease state where work can overlap.
- Completion or terminal failure state.

Timers must be re-armed after every upgrade and tested after interruption. External delivery should be represented as a durable queue with at-least-once semantics and provider-level idempotency.

## Recommended migration order for functions

1. Keep payment, secret, auth-hook, and external integration functions on their existing provider.
2. Port low-risk club-domain methods with no external calls.
3. Port durable notification records and queues while keeping email/push delivery external.
4. Port timers one workflow at a time with upgrade/recovery tests.
5. Port storage metadata before file bytes.
6. Port messaging automation after messaging ordering and scale are proven.
7. Revisit billing, secret operations, and identity hooks only after DFINITY confirms the target topology and trust boundaries.

## Immediate follow-up

The next implementation artifact should be a timer-job contract and synthetic queue harness for one low-risk workflow, such as scheduled club-link maintenance or notification cleanup. It should prove durable schedule state, claim/idempotency, bounded work, interruption recovery, and post-upgrade re-arming before any production-shaped timer is implemented.

The synthetic timer queue is implemented in `frontend/src/lab/syntheticTimerQueue.ts`. It models durable job state, bounded claims, idempotency-aware completion, retry scheduling, interrupted-job recovery, and timer re-arming after upgrade. It remains a local test model; it is not an ICP timer implementation or evidence of production scheduler capacity.

The Rust `backend/timer_jobs` canister now provides a disposable ICP implementation of the same queue contract. It uses stable structures for jobs and queue state, exposes bounded claim/complete/fail/recovery methods, and marks an armed schedule for post-upgrade re-arming. It deliberately has no external calls or production workflow attached. The next proof must exercise these Candid methods on a disposable canister and add a real timer callback only after the queue semantics are validated.
