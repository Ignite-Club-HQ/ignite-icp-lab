# Parity Evidence Register

This register records executable synthetic evidence for the parity phase. A
passing probe proves the listed behavior in the lab; it does not by itself
prove complete production RLS parity.

| Role | Synthetic evidence | Coverage proven | Remaining parity |
| --- | --- | --- | --- |
| `identity_access` | `frontend/scripts/test-identity-access.mjs`, `frontend/lab-tests/rls-parity-matrix.test.tsx`, `backend/identity_access/src/lib.rs` | account registration, linking, revocation, scoped site roles, exclusions, consent, anonymous rejection, account-owned record erasure cleanup, live disposable erasure probe | profile privacy, recovery, complete source helper matrix |
| `club_domain` | `frontend/scripts/test-club-domain.mjs`, `frontend/lab-tests/rls-parity-matrix.test.tsx`, `backend/club_domain/src/lib.rs` | club profile/settings, teams, sponsors, links, admin/member/outsider boundaries, cross-club injection rejection, team ownership validation, club-scoped member/team reads | complete membership/team/source RLS parity, full club pagination, live Rust domain probe |
| `events_domain` | `frontend/scripts/test-domain-canisters.mjs`, `frontend/scripts/test-events-motoko-comparison.mjs`, `frontend/lab-tests/rls-parity-matrix.test.tsx`, `backend/events_domain/src/lib.rs` | event ownership, RSVP, attendance, duties, roster, recurrence, revision fencing, stale-write rejection, Rust/Motoko representative workflow | child visibility parity, timer callback capability, full event RLS, scale/pagination |
| `competition_domain` | `frontend/scripts/test-domain-canisters.mjs`, `frontend/lab-tests/rls-parity-matrix.test.tsx`, `backend/competition_domain/src/lib.rs` | team entries, seasons, archive fencing, fixtures, results, scoped join-token authorization, expiry validation, replay protection | league ownership, officials/coordinators/participants, archive mutation parity, full competition RLS, live Rust domain probe |
| `messaging_domain` | `frontend/scripts/test-domain-canisters.mjs`, `frontend/scripts/test-product-motoko-canisters.mjs`, `frontend/lab-tests/rls-parity-matrix.test.tsx`, `backend/messaging_domain/src/lib.rs`, `backend/messaging_domain_motoko/src/main.mo` | participant reads, ordering, idempotency, bounded pages, stale cursors, unread, receipts, author-only team updates, author/moderator deletion, directional block/unblock enforcement | groups/DMs, reactions/replies/polls/moderation/retention, scale, live Rust domain probe |
| `media_metadata` | `frontend/scripts/test-domain-canisters.mjs`, `frontend/scripts/test-product-motoko-canisters.mjs`, `frontend/lab-tests/rls-parity-matrix.test.tsx`, `backend/media_metadata/src/lib.rs` | child-sensitive classification, encrypted metadata flag, owner/governor-only metadata reads, delegated capability holders, purpose/expiry validation, expired-capability rejection, outsider rejection, deletion/retention | album/uploader/commenter/guardian parity, bytes/chunks/scanning/moderation, live Rust domain probe |
| `notification_queue` | `frontend/scripts/test-notification-queue.mjs`, `frontend/scripts/test-notification-upgrade.mjs`, `backend/notification_queue/src/lib.rs` | worker capabilities, bounded claims, scoped worker claim filtering, retry, recovery, upgrade | recipient/preferences parity, claim leases, dead-letter/provider delivery parity |
| `timer_jobs` | `frontend/scripts/test-timer-jobs.mjs`, `frontend/scripts/test-timer-upgrade.mjs`, `backend/timer_jobs/src/lib.rs`, `backend/timer_jobs/tests/timer_jobs.rs`, `frontend/src/lab/bindings/timer_jobs` | worker capabilities, scoped timer claim filtering, approved callback capabilities, cross-domain callback rejection, bounded leases, expired-claim recovery, terminal dead-letter transition, scheduling idempotency, Candid adapter surface, stable-memory serialization/post-upgrade restore, live callback/lease upgrade probe, claims, retry, snapshot reconciliation | production scheduler and workflow parity |
| `placement_registry` / `shard_router` | `frontend/scripts/test-control-plane-federation.mjs`, `frontend/scripts/test-placement-registry.mjs` | site policies, target/version, availability isolation, domain routes, migration fences, audit | production target/residency evidence, full route-cache/disaster recovery |

## Promotion rule

A role may move from `poc_needs_parity` to `implemented_and_proven` only when:

- its source RLS/helper/RPC and automation rows are mapped;
- the synthetic evidence covers every required access path;
- negative, cross-scope, ownership, stale-version, and replay cases pass;
- upgrade, restore, and interruption evidence exists;
- any external function has bounded-call, secret, retry, residency, and
  failure-closed evidence.

The current register is an evidence index. It does not promote the domain rows
until the remaining parity columns are proven.
