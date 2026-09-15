# ICP Canister Topology Decision

This is the lab's provider-neutral topology for newly provisioned ICP
workloads. It does not migrate, copy, or cut over existing Supabase data.
Production subnet, residency, cycle, and operator approvals remain required.

## Decision

Use **10 logical product/control roles** plus **3 declared privacy/migration
roles** for a total current lab topology of **13 roles**. A separately approved
vetKeys proxy remains conditional and is not part of the default topology:

| # | Canister role | Shard key | Owns |
| ---: | --- | --- | --- |
| 1 | `placement_registry` | global | Backend placement, country policy, residency targets, availability, operator audit |
| 2 | `shard_router` | global | Club/workload to domain-shard routing and reassignment fences |
| 3 | `identity_access` | account/application | New ICP accounts, linked principals, memberships, roles, guardians, exclusions, invites, profile privacy |
| 4 | `club_domain` | club shard | Clubs, teams, club configuration, links, sponsors, low-risk club settings |
| 5 | `events_domain` | club/event shard | Events, schedules, attendance, RSVPs, lineups, duties, training, drills, pitch state |
| 6 | `competition_domain` | competition/league shard | Competitions, seasons, divisions, entries, officials, matches, fixtures, ladders, mini-leagues |
| 7 | `messaging_domain` | conversation/team shard | Conversations, messages, unread state, receipts, reactions, replies, polls, moderation records |
| 8 | `media_metadata` | asset/club shard | Albums, photo/file metadata, comments, visibility, capabilities, retention, deletion state |
| 9 | `notification_queue` | recipient/region shard | Durable notification records, claims, retries, idempotency, delivery state |
| 10 | `timer_jobs` | workflow/region shard | Durable schedules, claims, retries, recovery, upgrade re-arming |
| 11 | `migration_coordinator` | migration/domain | Durable migration evidence and phase coordination; does not own domain records |
| 12 | `pii_access_control` | account/region | Synthetic PII policy, encrypted-field access decisions, audit, rotation, and erasure proof |
| 13 | `secret_workload_identity` | workflow/region | External-worker registration, scoped secret-operation authorization, and audit evidence |

All 13 roles have local POC implementations and entries in the disposable
`local` environment in `icp.yaml`. Product and worker roles remain gated by
their parity, scale, privacy, upgrade/recovery, and operational evidence. A
production vetKeys proxy is intentionally not part of the default topology
until its subnet, residency, funding, trust boundary, and cross-subnet call
behavior are approved. Vault services remain external and are never ordinary
canisters.

## Why 10 product/control roles remain the baseline

- One canister per club creates excessive upgrade, monitoring, routing, and
  cycle overhead and makes hot-club operations harder to govern.
- One global application canister creates a large blast radius, shared stable
  memory contention, and poor isolation for messaging/media workloads.
- Identity/access is separated because it is cross-domain authorization state.
- Events and competitions are separated because competitions are not always
  club-owned and have different scale/ownership boundaries.
- Messaging and media are separated because message ordering and file access
  have different latency, storage, and retention characteristics.
- Notification and timer state are separated from business domains because
  both require durable claim/retry/recovery behavior and external workers.

These ten roles are the minimum practical topology for the inventoried product
and control domains. The migration, PII-policy, and workload-identity roles are
separate cross-cutting lab services. Physical deployment may run multiple
replicas/shards of the same role. The number of physical canisters grows with
workload, residency, hot-club isolation, and cycle capacity; it is not fixed.

## Domain allocation

| Source domain | ICP owner | Status / gate |
| --- | --- | --- |
| Profiles, accounts, passkeys, identity linking | `identity_access` | New ICP identity only; production auth and PII encryption are separate gates |
| Clubs, teams, roles, memberships, guardians, exclusions | `identity_access` + `club_domain` | Authorization contract first; no dual writer |
| Club links and club configuration | `club_domain` | Current implemented POC |
| Events, schedules, attendance, RSVP, lineups | `events_domain` | Requires event/child/roster RLS parity |
| Training, drills, pitch controls | `events_domain` | Requires team and coach parity |
| Competitions, leagues, seasons, fixtures | `competition_domain` | Requires league/competition ownership model |
| Messaging, DMs, chat, polls, unread | `messaging_domain` | Requires ordering, access, receipts, and scale proof |
| Message attachments | `media_metadata` plus external/object storage | Capability and chunking gate |
| Photos, albums, files, vault metadata | `media_metadata` | Bytes remain separate storage authority; child photos require vetKeys client-side encryption or SEV-SNP protected hardware; vault secrets remain external |
| Notifications and push records | `notification_queue` | Authenticated queue boundary implemented; recipient parity remains |
| Scheduled jobs and cron replacements | `timer_jobs` | Durable queue proof implemented; workflow attachment remains |
| Rewards, points, engagement | `club_domain` or `events_domain` by row ownership | Requires points mutation/idempotency parity |
| EOI, invites, referrals | `identity_access` | Requires claim-token and parent ownership parity |
| PII ciphertext and access policy | Owning domain + `identity_access` | vetKeys/proxy or protected-engine gate; purpose, retention and erasure required |
| Child photos & media ciphertext | `media_metadata` + `identity_access` | Client-side vetKeys encryption or SEV-SNP Cloud Engine; guardian consent required |
| PII & media encryption capability | Approved vetKeys path or protected engine | No raw key material in ordinary canister state |
| Payments, billing, vault secrets | External trusted services | Must not be ordinary canister state |
| Email, push delivery, Drive, PlayHQ, Google, LLM | External workers/integrations | Explicit capability and bounded-call boundary |
| Placement, residency, operator governance | `placement_registry` | Current synthetic control plane |
| Routing and shard assignment | `shard_router` | Current synthetic control plane |
| Migration phase evidence | `migration_coordinator` | Local Motoko POC; future migration execution remains separately authorized |
| PII access policy and audit | `pii_access_control` | Synthetic policy/rotation/erasure POC; no production PII |
| External worker identity | `secret_workload_identity` | Synthetic scoped worker authorization and audit POC; vault credentials remain external |

## Physical sharding rules

Logical roles are sharded by ownership, not by arbitrary table:

- `identity_access`: regional/account shards only when residency or scale
  requires it; never split one account across writers.
- `club_domain` and `events_domain`: shard by club/workload, with a hot-club
  escape hatch to a dedicated canister.
- `competition_domain`: shard by competition or league owner, not necessarily
  by club.
- `messaging_domain`: shard by conversation or team; hot conversations can be
  isolated without moving the club's other domains.
- `media_metadata`: shard by club or asset collection; bytes use a separately
  approved object-storage design.
- `notification_queue` and `timer_jobs`: shard by residency and workload class
  so retries and backlogs cannot starve unrelated regions.

Every routed operation resolves placement first and fails closed when the route,
backend, country policy, target health, or authorization is unavailable.

## Interfaces between roles

- `placement_registry` is the authority for backend, state, residency, and
  operator policy.
- `shard_router` resolves a domain shard after placement approval.
- `identity_access` supplies application-account and authorization facts; a
  domain canister still enforces the final row/resource check locally.
- Domain canisters enqueue notification records; they do not hold email/push
  credentials or perform unrestricted external delivery.
- `timer_jobs` claims durable work and invokes bounded domain workflows; timer
  state is not a substitute for domain authorization.
- `media_metadata` stores capability and metadata state; file bytes and virus/
  moderation integrations remain separate.

## Non-canister boundaries

The following are intentionally not included as ordinary ICP domain state:

- payment provider credentials, checkout authority, and webhook secrets;
- OAuth, push, storage-signing, and third-party API secrets;
- vault secret values and raw vetKeys material;
- email, FCM, APNs, Drive, PlayHQ, Google, and LLM delivery/integration calls;
- existing Supabase data and existing Supabase authoritative workloads;
- production backups unless an approved encrypted backup architecture exists.

## Implementation sequence

1. Keep all 13 local POCs and their committed Candid contracts green.
2. Complete source authorization and automation parity in domain order.
3. Finish provider-neutral frontend migration and domain adapter wiring.
4. Complete bounded pagination, idempotency, scale, and populated-state
   upgrade/recovery for product domains.
5. Promote notification/timer and external-worker boundaries to complete
   recipient/domain/site capability behavior.
6. Implement the separately approved encrypted-media, vetKeys/protected-engine,
   and vault boundaries without storing raw keys or credentials in canisters.
7. Add physical shards only after measured load, residency, and hot-tenant
   evidence justifies them.

A domain is not considered implemented merely because its canister compiles. It
must pass its RLS parity record, stable schema, upgrade/recovery, placement,
scale, and operational gates.
