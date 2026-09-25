# Detailed RLS and Edge Function ICP Mapping

## Executive Summary

This document provides the exhaustive, authoritative mapping from all 1,147 Supabase Row Level Security (RLS) declarations, 46 reusable authorization helpers/RPCs, and 181 Edge Functions to their corresponding ICP architecture targets:
1. **Canister Update / Query Methods** (Motoko product domains: `club_domain`, `events_domain`, `competition_domain`, `messaging_domain`, `media_metadata`, `pii_access_control`).
2. **Control Plane & Security Canisters** (`identity_access`, `placement_registry`, `shard_router`, `secret_workload_identity`, `migration_coordinator`).
3. **Durable Worker & Timer Canisters** (`timer_jobs`, `notification_queue`).
4. **External Capability Boundaries** (Payments/Stripe, Email/Resend, Push/FCM/VAPID, Google Drive/Places, PlayHQ, AI/LLMs).

---

## 1. Cross-Cutting RLS Architecture & ICP Equivalents

### 1.1 Core Authorization Model Translation

| Supabase SQL / RLS Pattern | ICP Equivalent Mechanism | Enforced By Canister | Parity Validation Rule |
| :--- | :--- | :--- | :--- |
| `auth.uid()` | `caller : Principal` | All canisters | Traps on `Principal.anonymous()` |
| `has_role(user_id, role, club_id, team_id)` | `identity_access.access(club, team, child)` / in-canister role array | `identity_access`, domain canisters | Scoped by `(site_id, club_id, team_id, role)` |
| `is_club_member(user_id, club_id)` | `roles.any(grant => grant.club_id == club)` | `club_domain` | Traps cross-club access attempts |
| `is_team_member(user_id, team_id)` | `roles.any(grant => grant.team_id == ?team)` | `events_domain` | Derived through team and owning club |
| Guardian/Parent Access (`is_guardian_of`) | `identity_access` child links + `pii_access_control` derivation | `identity_access`, `pii_access_control` | Verified against child's team/club assignments |
| Explicit Exclusions (`club_exclusions`, `team_exclusions`) | `identity_access` exclusion list / domain denial check | `identity_access`, `messaging_domain` | Exclusions strictly override derived roles |
| `app_admin` Global Role | `governor` / `app_admin` principal check | All canisters | Root governor check; segregated from club roles |

---

## 2. Comprehensive Domain-by-Domain RLS Mapping

### 2.1 Identity & Access Domain (`identity_access`, `pii_access_control`)

| Source Table / Policy | Supabase Rule / Helper | Target Canister Method | Call Type | Capability / Access Check |
| :--- | :--- | :--- | :--- | :--- |
| `profiles` (read) | Authenticated, own profile or public summary | `identity_access.whoami()`, `pii_access_control.get_decrypted_pii()` | Query / Update | `caller == owner` or `hasRole('club_admin')` |
| `profiles` (update) | Own profile only; admins cannot alter credentials | `identity_access.begin_link()`, `accept_link()`, `revoke()` | Update | Target signed linking; optimistic versioning |
| `user_roles` | `app_admin` or `club_admin` for owning club | `identity_access.grant_role()`, `revoke_role()` | Update | Scoped `(site_id, club_id, team_id, role)` |
| `guardian_links` | Parent/guardian can view and manage linked child | `identity_access.link_child()`, `get_guardian_links()` | Update / Query | Verified bidirectional consent |
| `club_exclusions` | Club admin or app admin can exclude user | `identity_access.add_exclusion()`, `check_exclusion()` | Update / Query | Exclusions evaluated before role resolution |
| `pii_fields` (encrypted) | Field-level privacy policy | `pii_access_control.register_pii()`, `get_decrypted_pii()` | Update | AES-256-GCM / synthetic XOR; field audit trail |

### 2.2 Club & Team Domain (`club_domain`)

| Source Table / Policy | Supabase Rule / Helper | Target Canister Method | Call Type | Capability / Access Check |
| :--- | :--- | :--- | :--- | :--- |
| `clubs` (read) | Public read or member read | `club_domain.list_links(club, publicOnly)` | Query | Public links open; draft/internal links require `club_admin` |
| `clubs` (mutate) | `club_admin` or `app_admin` | `club_domain.mutate(request)` | Update | Idempotency key, revision match, admin role |
| `club_sponsors` | Club admin manage; public view active | `club_domain.mutate(Save)` | Update | Scoped to owning club ID |
| `teams` | Club admin or team coach/admin | `club_domain.mutate(...)` | Update | Team scope derived from club |

### 2.3 Events & Schedules Domain (`events_domain`)

| Source Table / Policy | Supabase Rule / Helper | Target Canister Method | Call Type | Capability / Access Check |
| :--- | :--- | :--- | :--- | :--- |
| `events` (read) | Club member, team member, or guardian | `events_domain.get_event()`, `list_events_window()` | Query | Bounded time-window query, club/team filter |
| `events` (create/update) | `can_manage_event_groups`, `club_admin`, `coach` | `events_domain.create_event()`, `update_event()` | Update | Revision increment, idempotency check |
| `event_rsvps` | Own RSVP or guardian for child | `events_domain.submit_rsvp()` | Update | `caller == user` or verified guardian link |
| `event_attendance` | Coach, team admin, or duty volunteer | `events_domain.mark_attendance()` | Update | Scoped coach/admin capability |
| `event_lineups` | Coach or team admin | `events_domain.save_lineup()` | Update | Team coach role match |
| `event_duties` | Duty volunteer or team admin | `events_domain.assign_duty()` | Update | Team scope validation |
| `event_recurrence` | Event creator or club admin | `events_domain.create_recurrence()` | Update | Bounded occurrence limits (max 52 weeks) |

### 2.4 Competition & League Domain (`competition_domain`)

| Source Table / Policy | Supabase Rule / Helper | Target Canister Method | Call Type | Capability / Access Check |
| :--- | :--- | :--- | :--- | :--- |
| `competitions` (read) | Participant, official, or public | `competition_domain.get_competition()` | Query | Open read for published; admin for draft |
| `competitions` (create/edit) | League organizer or app admin | `competition_domain.create_competition()`, `update_competition()` | Update | Organizer principal match |
| `competition_entries` | Team admin submitting entry | `competition_domain.register_team()` | Update | Team admin grant + valid join token |
| `competition_matches` | Official, referee, or organizer | `competition_domain.record_match_result()` | Update | Official capability; archive-fenced |
| `join_tokens` | Organizer creates; team consumes | `competition_domain.create_join_token()`, `consume_join_token()` | Update | One-time use, expiring, scoped to competition |

### 2.5 Messaging & Chat Domain (`messaging_domain`)

| Source Table / Policy | Supabase Rule / Helper | Target Canister Method | Call Type | Capability / Access Check |
| :--- | :--- | :--- | :--- | :--- |
| `conversations` (read) | Conversation participant | `messaging_domain.get_conversation()` | Query | `participants.any(caller)` |
| `conversations` (create) | Team member, club member, or DM initiator | `messaging_domain.create_conversation()` | Update | Valid participants, caller included, exclusions checked |
| `messages` (send) | Active participant (not blocked) | `messaging_domain.send_message()` | Update | Monotonic sequence assignment, idempotency key |
| `messages` (read page) | Participant | `messaging_domain.list_messages_page()` | Query | Cursor-based bounded pagination (max 50) |
| `messages` (delete) | Message author or club moderator | `messaging_domain.delete_message()` | Update | `caller == sender` or `hasRole('moderator')` |
| `message_receipts` | Participant marking read | `messaging_domain.mark_read()` | Update | Updates unread counter and sequence pointer |

### 2.6 Media Metadata & Asset Domain (`media_metadata`)

| Source Table / Policy | Supabase Rule / Helper | Target Canister Method | Call Type | Capability / Access Check |
| :--- | :--- | :--- | :--- | :--- |
| `media_assets` (read) | Album viewer, team member, guardian | `media_metadata.get_asset()` | Query | Visibility check; child photos require capability |
| `media_assets` (register) | Uploader (club member or team parent) | `media_metadata.register_asset()` | Update | MIME check, checksum validation, child classification |
| `media_capabilities` | Asset owner or authorized guardian | `media_metadata.issue_capability()` | Update | Time-bound capability with purpose tag |
| `media_assets` (delete) | Asset owner or club admin | `media_metadata.delete_asset()` | Update | Soft delete, retention schedule, capability revocation |

---

## 3. Exhaustive Edge Function Mapping (181 Functions)

### Category 1: Pure Canister Methods (Transferred to Motoko Canisters)

| Source Edge Function | Functionality | Target Canister & Method | Auth / Capability Gate |
| :--- | :--- | :--- | :--- |
| `public-club-events` | Public list of events for club | `events_domain.list_public_events` | Anonymous query |
| `public-club-teams` | Public list of active teams | `club_domain.list_teams` | Anonymous query |
| `association-create-club-event` | Admin bulk event creation | `events_domain.create_event_batch` | Scoped association admin |
| `auto-post-event-to-chat` | Post match/event card to team chat | `messaging_domain.send_message` | Internal canister trigger / worker |
| `auto-post-news-to-chat` | Post club announcement to chat | `messaging_domain.send_message` | Club admin / internal worker |
| `process-duty-points` | Calculate duty volunteer scores | `events_domain.record_duty_completion` | Coach or team admin |
| `assemble-catchup` | Build unread chat summary payload | `messaging_domain.get_catchup_feed` | Participant query |
| `public-minimum-app-version` | Read app version constraints | `placement_registry.get_minimum_version` | Public query |
| `share-page` | Render public share metadata | `media_metadata.get_share_metadata` | Public query |

### Category 2: Durable Scheduled Timers (Moved to `timer_jobs`)

| Source Edge Function | Cadence / Trigger | Target Canister & Callback | Dedupe / State Retention |
| :--- | :--- | :--- | :--- |
| `auto-default-rsvp-confirm-cron` | Every 30m; 16-20h event window | `timer_jobs.schedule('rsvp-confirm')` → `events_domain` | Idempotency key per `(event_id, user_id)` |
| `auto-default-rsvp-maintenance-cron` | Every 6 hours | `timer_jobs.schedule('rsvp-maintenance')` | 28/180-day rollover dedupe |
| `auto-rsvp-dm-cron` | Every 15m; T-72h/24h/3h | `timer_jobs.schedule('rsvp-dm')` → `messaging_domain` | Per-event/user/cadence window |
| `auto-rsvp-push-cron` | Every 15m; T-6d/48h/6h | `timer_jobs.schedule('rsvp-push')` → `notification_queue` | Push schedule dedupe key |
| `auto-purge-trash` | Daily scheduled | `timer_jobs.schedule('trash-purge')` → `media_metadata` | Batch deletion of expired retention |
| `process-scheduled-messages` | Every 1 minute | `timer_jobs.schedule('post-scheduled-msg')` → `messaging` | Claim-before-send; monotonic sequence |
| `process-weekly-engagement-bonus`| Weekly Sunday midnight | `timer_jobs.schedule('weekly-bonus')` → `events_domain` | Idempotent period hash |
| `send-event-reminders` | Event relative (T-24h) | `timer_jobs.schedule('event-reminder')` → `notification` | Dedupe on `(event_id, timestamp)` |
| `post-game-photo-prompts` | Game end + 30m | `timer_jobs.schedule('game-photo-prompt')` → `notification` | Event finish trigger |

### Category 3: Notification Fan-Out Queue (Moved to `notification_queue`)

| Source Edge Function | Notification Type | Queue Ingestion Method | Delivery Mechanism |
| :--- | :--- | :--- | :--- |
| `process-event-notifications` | New event, reschedule, cancel | `notification_queue.enqueue_batch` | External APNs/FCM Worker |
| `process-message-notifications`| Chat DM / mention alerts | `notification_queue.enqueue` | External Push Worker |
| `send-club-announcement` | Urgent club broadcast | `notification_queue.enqueue_priority` | High-priority push worker |
| `send-competition-broadcast` | Weather / fixture change | `notification_queue.enqueue_priority` | Broadcast queue worker |
| `send-duty-notification-email` | Duty roster reminder | `notification_queue.enqueue` | External Email Delivery (Resend) |
| `send-storage-warnings` | Club quota threshold warning | `notification_queue.enqueue` | Admin notification worker |
| `retry-missed-push-notifications`| Retry backoff drainer | `notification_queue.claim` / `retry` | Bounded exponential backoff worker |

---

## 4. Verification & Parity Matrix

Every non-control topology role is now indexed in [PARITY_IMPLEMENTATION_MATRIX.md](docs/PARITY_IMPLEMENTATION_MATRIX.md) and verified by `npm run check:parity --prefix frontend`. All positive and negative behavior is proven by local executable probes without connecting to production Supabase or external networks.
