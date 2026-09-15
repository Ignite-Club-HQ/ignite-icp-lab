# Remaining Implementation Gaps and Production Mapping

## Status summary

This document captures the remaining implementation work and the complete mapping strategy for secrets, RLS policies, and Edge Functions that still need to be mapped into a production ICP deployment model.

The repository already contains the authoritative inventory and source mapping for the three layers below:

- Secrets: `docs/SECRET_INTEGRATION_AND_EXTERNAL_WORKER_PLAN.md`
- RLS + Edge Function audit: `docs/RLS_EDGE_FUNCTION_IMPLEMENTATION_AUDIT.md`
- Parity evidence: `docs/PARITY_EVIDENCE_REGISTER.md`

This file is the operational summary of the remaining concrete work and the production-safe ICP replacement model.

---

## 1. What is still left to implement

### 1.1 Production-hardening gaps

The current lab implementation is strong enough for synthetic proof and local parity checks, but it is not yet a production deployment package.

| Gap | Why it still matters in production | Current status | Required completion |
| :--- | :--- | :--- | :--- |
| Secret custody and workload identity | Real secrets cannot live in canisters or the browser bundle | Deferred external boundary | Worker secret vault + principal registration + RBAC checks; Google Cloud Secret Manager for runtime worker secrets |
| External provider integrations | Email/push/payments/OAuth/AI still rely on external service execution | Deferred boundary | External worker model with signed payloads and audit logs |
| RLS parity completion | Inventory is mapped, but several domain flows still need live parity proof | Partial | Domain-by-domain proof with negative, replay, exclusion, and stale-write tests |
| Admin and placement workflow | Settings UI and country policy enforcement are not yet product-grade | Partial | Admin-only settings and policy enforcement pipeline |
| Durable state and upgrade semantics | Stable-state and upgrade fields are now covered for timer jobs, but not all domain shards are proved | Partial | Full topology-level upgrade/restore proof |
| Delivery worker / queue ownership | Notifications and timers must be mapped to external work execution and provider dedupe | Partial | Worker lease + provider idempotency + dead-letter proof |
| Production deployment environment | Netlify is a frontend host only | Not yet ready | Private staging environment with real worker boundaries and secrets, using Google Cloud Secret Manager for runtime secret custody |

### 1.2 Current production readiness assessment

| Readiness level | Meaning | Current assessment |
| :--- | :--- | :--- |
| Lab parity proof | Synthetic behaviors are implemented and tested locally | ✅ Strong coverage |
| Staging deployment | Behaves end-to-end with synthetic providers and local ICP | ✅ Feasible |
| Production deployment | Real credentials, real admins, real providers, signed worker identities | ❌ Not yet |

---

## 2. Secret-by-secret production mapping

This matrix covers the secrets and environment variables previously owned by Supabase Edge Functions and now planned for external worker custody or ICP native replacement.

| Secret / variable | Former use | ICP replacement model | Production custody | Canister / worker role | Production usage model |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `RESEND_API_KEY` | Email delivery | `notification_queue` + external email worker | Cloudflare Worker / AWS Secrets Manager | `send-email-notification` | Queue job claims + worker fetches secret + sends email + ACKs queue |
| `OUTBOUND_COMMUNICATIONS_ENABLED` | Toggle for email/push dispatch | Canister governor config + worker env flag | Canister config + worker env | email/push worker | Fail-closed if false; no dispatch occurs |
| `FCM_PRIVATE_KEY` / `SERVICE_ACCOUNT` | FCM push delivery | `notification_queue` + external push worker | Worker secret store | `send-push-notification` | Worker verifies workload identity and dispatches push |
| `VAPID_PRIVATE_KEY` / `SUBJECT` | Web push signing | External worker state | Secret store | `send-push-notification` | Worker signs webhook payload with VAPID |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature validation | External payment gateway | Payment gateway secret store | `payment-processor` | HMAC validation before updating order state |
| `stripe_secret_key` | Checkout / payment creation | External payment gateway + canister order state | Vault / secret store | `payment-processor` | Gateway creates checkout session, canister records order state |
| `IGNITE_PAYMENTS_SERVICE_ROLE_KEY` | Secondary payment verification | Gateway identity + signed canister callback | Gateway store | `payment-processor` | Gateway verifies and posts signed order completion |
| `GOOGLE_CLIENT_SECRET` / `CLIENT_ID` | Drive OAuth | External OAuth worker | OAuth worker secret store | `storage-signing` | Token exchange and file import pipeline |
| `GOOGLE_PLACES_API_KEY` | Venue / place lookup | HTTPS outcall or worker | Environment variable in worker / outcall boundary | `webhook-delivery` | Public read-only queries with bounded payload |
| `GIPHY_API_KEY` | Media lookup | HTTPS outcall or worker | Worker or outcall boundary | `webhook-delivery` | Sanitized request with response filtering |
| `GEMINI_API_KEY` / `LOVABLE_API_KEY` | AI summarization | External AI gateway / sanitized outcall | Worker or gateway vault | `webhook-delivery` | Sanitized prompt, no raw child PII inside provider call |
| `SUPABASE_SERVICE_ROLE_KEY` | Master DB bypass | Removed from ICP design | Decommissioned | None | Replaced by principal RBAC and canister ownership checks |
| `CRON_SECRET` / `AUTO_RSVP_DM_CRON_SECRET` | Cron auth | Native `timer_jobs` with scoped callbacks | Native canister timers | `timer_jobs` | Replaced by authenticated canister callback flow |
| `NEW_CLUB_ALERT_SECRET` | Internal alert trigger | External admin worker | Worker secret store | `write-audit-log` | Trigger only from approved event + signed worker |
| `SYSTEM_BOT_USER_ID` | Announcement identity | Native governor principal | Canister constant | N/A | Source of trusted system messages |

### 2.1 Secret ownership rule

All secrets must follow the same rule:

- Never stored in ordinary canister memory.
- Never exposed to frontend bundles.
- Only retrieved by an authenticated external worker or governed gateway.
- Access must be audited through `secret_workload_identity` and scoped per worker role.

---

## 3. RLS mapping matrix by category

The repository inventory shows 1,147 RLS declarations, 46 helper/RPC functions, and 181 Edge Functions. The key production mapping is by authorization pattern rather than by every individual SQL string. This is the operational mapping used to replace the old RLS model on ICP.

### 3.1 Identity and account access

| Source RLS class | Example policy pattern | ICP equivalent | Canister method | Production use |
| :--- | :--- | :--- | :--- | :--- |
| Own profile access | `auth.uid() = user_id` | principal identity check | `identity_access.whoami()`, `identity_access.get_public_profile()` | Read-only profile access and consent gate |
| Guardian or parent access | parent-child link, guardian permission | guardian verification | `identity_access.verify_guardian_link()` | Child safety and consent-aware access |
| PII field access | field classification + consent + owner check | consent-aware field access control | `pii_access_control.*` | Field-level PII protection |
| Exclusion override | exclusion tables override role grants | exclusion check | `identity_access.check_exclusion()` | Fail-closed override for blocked users |
| Account linking | active link management | account link state machine | `identity_access.begin_link()`, `accept_link()` | Secure account migrations and credential pairing |
| Recovery / passkeys | token-based recovery and passkey possession | deferred external service | `identity_access.*` + recovery worker | Recovery and MFA not stored in-DB |

### 3.2 Club and team access

| Source RLS class | ICP equivalent | Canister method | Production use |
| :--- | :--- | :--- | :--- |
| `is_club_member` | role and club membership validation | `club_links_motoko.isMember()` | Club profile and settings access |
| `is_club_admin` | admin role check | `club_links_motoko.save_club_profile()` | Write access to club settings |
| Team admin / coach access | scoped team role validation | `events_domain_motoko.hasRole()` | Team-specific controls |
| Exclusion policies | exclusion override before role grant | `identity_access.check_exclusion()` | Blocked memberships and suspended users |
| Club visibility / sponsored content | club visibility + role check | `club_links_motoko.get_club_profile()` | Public or member-only surfaces |

### 3.3 Events and participation

| Source RLS class | ICP equivalent | Canister method | Production use |
| :--- | :--- | :--- | :--- |
| Event CRUD ownership | organizer/admin role check | `events_domain_motoko.create_event()`, `update_event()` | Event authoring and safe mutation |
| RSVP ownership | self/guardian permission validation | `events_domain_motoko.set_rsvp()` | RSVP and child-attendee safety |
| Attendance role checks | official/coach/team admin checks | `events_domain_motoko.set_attendance()` | Attendance and lineup tracking |
| Recurrence / scheduling limits | validated range logic | `events_domain_motoko.set_recurrence()` | Safe recurrence generation |
| Timer callback scope | job scope + callback capability check | `timer_jobs` | Durable reminders and automatic scheduling |

### 3.4 Competition access

| Source RLS class | ICP equivalent | Canister method | Production use |
| :--- | :--- | :--- | :--- |
| Organizer write authority | organizer role + competition membership | `competition_domain_motoko.update_competition()` | Competition admin controls |
| Join token creation and expiry | token expiry and replay protection | `competition_domain_motoko.consume_join_token()` | Safe team entry workflows |
| Official / match result authority | official role + match validation | `competition_domain_motoko.record_match_result()` | Match outcomes and officiating |
| Participant visibility | entry and competition visibility checks | `competition_domain_motoko.get_competition()` | Public or competition-scoped reads |

### 3.5 Messaging and media access

| Source RLS class | ICP equivalent | Canister method | Production use |
| :--- | :--- | :--- | :--- |
| Chat membership | participant validity check | `messaging_domain_motoko.is_participant()` | Secure conversations |
| Group moderation | moderator / admin role checks | `messaging_domain_motoko.hasRole("moderator")` | Group moderation |
| Block list enforcement | blocked-user check | `messaging_domain_motoko.is_blocked()` | User safety and anti-abuse |
| Media visibility | capability and owner/governor checks | `media_metadata_motoko.check_visibility()` | Child-safe media access |
| Asset upload + comment permissions | ownership and scope validations | `media_metadata_motoko.register_asset()`, `add_comment()` | Upload and interaction gating |

### 3.6 Notification and timer workflow access

| Source RLS class | ICP equivalent | Canister method | Production use |
| :--- | :--- | :--- | :--- |
| Worker claim authorization | principal scope check | `notification_queue.grant_worker_scope()`, `timer_jobs.grant_worker_scope()` | Only approved workers claim tasks |
| Callback scope isolation | callback capability grant | `timer_jobs.grant_callback_scope()` | Prevent cross-domain callbacks |
| Job owner / lease lock | lease expiry and recovery | `claim_with_lease()`, `recover_expired()` | Prevent stranded processing and stale jobs |
| Retry and dead-letter | retry budget and terminal failure | `fail()`, `recover_expired()` | Fail-safe and provider-safe retries |

### 3.7 RLS implementation rule for production

The generic rule in the ICP model is:

- every read/write path must validate caller principal, role, scope, and object ownership
- exclusion tables override role grants
- child/safety/guardian paths enforce a stricter path than ordinary club roles
- retries and dead-letters must be durable and recoverable
- all operations must fail closed if no explicit rule matches

---

## 4. Edge Function mapping matrix

The repository inventory identifies 181 Edge Functions. The production ICP equivalent is not a 1:1 function copy; the correct model is to replace the function class with a specific canister or external worker boundary.

| Edge Function class | Example source | ICP equivalent | Production usage | Status |
| :--- | :--- | :--- | :--- | :--- |
| Email send | `send-email`, `send-*-email` | `notification_queue` + external email worker | Deferred queue-based dispatch with secret-scoped worker | Deferred |
| Push notification | `send-fcm-notification`, `process-push-delivery-queue` | `notification_queue` + external push worker | Worker verification and provider delivery | Deferred |
| Payment/hook processing | `stripe-webhook`, `confirm-event-payment` | `payment-processor` or external gateway | Signed callback with order state transitions | Deferred |
| Event reminders / cron | `auto-*-cron`, `send-reminder-*` | `timer_jobs` callbacks | Native canister timer scheduling | Partial |
| Club alerting | `send-new-club-alert` | external admin worker or audit log handler | Event-triggered alerting with signed worker identity | Deferred |
| Google Drive import | `google-drive-import`, `drive-folder-sync` | external OAuth worker + `media_metadata` | Worker imports files and pushes canonical metadata | Deferred |
| Places / search | `google-places-search`, `giphy-search` | direct HTTPS or worker | Bounded request/response with sanitized output | Partial |
| AI summary | `summarize-chat`, `summarize-chat-icp` | external AI worker + `pii_access_control` | Sanitized prompts and consent-scoped summary generation | Deferred |
| Database-backed helper functions | helper RPCs and service router logic | canister methods | RLS replaced by explicit principal and scope checks | Partial |
| System cron and maintenance | scheduling, cleanup, subscriptions | `timer_jobs` | Native canister scheduling and backoff | Partial |

### 4.1 The external boundary rule

Any function that previously held a secret, a provider token, a payment credential, or a cron secret should be moved to one of these two patterns:

- A stateless external worker with secret vault + workload identity
- A native ICP canister that is cryptographically authenticated and scoped for a specific role

Anything that uses a master DB key, service-role token, or raw environment secret inside a canister is not production-safe.

---

## 5. Implementation map: what remains before production deployment

### 5.1 Completed in the lab

| Category | Current status | Evidence |
| :--- | :--- | :--- |
| Core domain authorization | ✅ synthetic parity proof | `backend/*/src/lib.rs` + parity tests |
| Notification queue scoping | ✅ implemented | `backend/notification_queue/src/lib.rs` |
| Timer callback + lease + upgrade persistence | ✅ implemented | `backend/timer_jobs/src/lib.rs` |
| Frontend topology and parity checks | ✅ passing | `frontend` checks |
| Secret inventory | ✅ mapped | `docs/SECRET_INTEGRATION_AND_EXTERNAL_WORKER_PLAN.md` |
| RLS inventory | ✅ mapped | `docs/RLS_EDGE_FUNCTION_IMPLEMENTATION_AUDIT.md` |

### 5.2 Still required before production deployment

| Workstream | Remaining requirement |
| :--- | :--- |
| Secret worker deployment | Cloudflare/AWS worker deployment, vault storage, key rotation |
| Worker identity registration | `secret_workload_identity` principal registration and scope authorisation |
| Payment gateway deployment | Stripe gateway sandbox + signed callback path |
| Email/push delivery deployment | Live worker with production credentials |
| Admin settings workflow | Placement and policy admin UI with proof of restricted access |
| Upgrade-proof full topology | Not just timer_jobs; other canisters need full state upgrade evidence |
| Production environment separation | Private staging environment with no production data |
| Real provider test coverage | Stripe, Resend, FCM, Google, AI provider tests |

---

## 6. Recommended production deployment sequence

### Phase A: private staging deployment

1. Deploy frontend to Netlify in preview/staging mode.
2. Point to a disposable local ICP environment or private staging network.
3. Use synthetic identities and synthetic data only.
4. Keep all user data synthetic and non-production.

### Phase B: worker-hardened staging

1. Deploy external workers for email, push, and payments.
2. Register worker principals and secret scopes.
3. Validate queue claims, retries, dead letters, and signed callbacks.
4. Confirm no secret reaches canister memory or browser bundles.

### Phase C: admin and placement hardening

1. Add admin-only routes and rights checks.
2. Wire placement registry policy controls with country validation.
3. Confirm version and residency enforcement is fail-closed.

### Phase D: production cutover checklist

Only after all prior phases pass:

- secrets stored outside canisters
- all integrations verified with signed worker identities
- RLS matrix rechecked against live source
- no direct service-role or master-key usage
- upgrade/restore tested per canister
- monitoring and alerting enabled
- rollback procedure documented

---

## 7. Final implementation statement

The project is now at a strong lab-synthetic maturity level for core domain parity, but it is not production-ready for a real public app or production deployment to Netlify.

The production path is clear and bounded:

1. external secret workers
2. service-scoped workload identity
3. provider-neutral routing
4. admin and placement enforcement
5. full upgrade/restore proof
6. private staging deployment before any public deployment

This is the remaining work that must be executed before it can honestly be described as something ready for production use.
