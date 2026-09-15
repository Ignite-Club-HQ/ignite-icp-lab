# ICP Canister Topology Decision

This is the lab's provider-neutral topology for newly provisioned ICP
workloads. It does not migrate, copy, or cut over existing Supabase data.
Production subnet, residency, cycle, and operator approvals remain required.

## Decision

Use **10 logical product/control roles** as the baseline, with an optional
separately approved vetKeys proxy boundary for confidential PII workflows:

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

The existing repository contains roles 1, 2, 4, 9, and 10 in proof-of-concept
form. Role 3 (`identity_access`) now has an initial stable-memory canister POC
and local manifest entry. Roles 5, 6, 7, and 8 remain the next domain-canister
implementation slices.

The repository also contains a synthetic Motoko migration coordinator, which
is control-plane infrastructure rather than a new product domain. A production
vetKeys proxy is intentionally not part of the default topology until its
subnet, residency, funding, trust boundary, and cross-subnet call behavior are
approved. Vault services remain external and are never ordinary canisters.

## Why 10 is the baseline

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

This is the minimum practical logical topology for the currently inventoried
product domains. Physical deployment may run multiple replicas/shards of the
same role. The number of physical canisters grows with workload, residency,
hot-club isolation, and cycle capacity; it is not fixed at ten forever.

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

1. Keep the current five proof canisters green.
2. Implement `identity_access` authorization and account contracts.
3. Split `club_domain` from the current Club Links POC without changing its
   stable schema; add clubs, teams, and configuration contracts.
4. Implement `events_domain` and attach timer workflows only after RLS parity.
5. Implement `competition_domain` with independent ownership and join-token
   capability checks.
6. Implement `messaging_domain` with sequence/idempotency/unread/receipt tests.
7. Implement `media_metadata` with capability, retention, deletion, and chunk
   handoff contracts.
8. Promote notification/timer workers from synthetic queue proofs to bounded
   domain workflows.
9. Add physical shards only after measured load, residency, and hot-tenant
   evidence justifies them.

A domain is not considered implemented merely because its canister compiles. It
must pass its RLS parity record, stable schema, upgrade/recovery, placement,
scale, and operational gates.
