# Rust/Motoko Language Decision Record

## Scope

This decision compares equivalent Rust and Motoko notification queues in the
synthetic loopback lab. It does not certify production capacity, cycle cost,
subnet behavior, residency, or security.

Reference implementations:

- Rust: `backend/notification_queue`
- Motoko: `backend/notification_queue`
- Shared Candid surface: `backend/notification_queue/notification_queue.did`
- Shared live probe: `frontend/scripts/test-notification-queue.mjs`
- Benchmark: `frontend/scripts/benchmark-notification-implementations.mjs`

## Evidence

Both implementations passed the same live behavior probe covering:

- authenticated enqueue
- explicit governor/worker capability bootstrapping
- bounded claim
- idempotent acknowledgement
- delayed retry
- early retry rejection
- interrupted processing recovery
- outsider worker rejection
- durable query state

Both implementations also passed an in-place upgrade probe preserving a
processing notification, recovering it, reclaiming it at attempt 2, and
acknowledging it after upgrade.

The same retained-state upgrade/recovery pattern also passes for the hardened
`timer_jobs` worker on a clean disposable network.

Fresh local benchmark on 2026-09-12, 25 sequential notifications:

| Measurement | Rust | Motoko |
| --- | ---: | ---: |
| Enqueue elapsed time | 6,900.6 ms | 6,293.6 ms |
| Claim elapsed time | 245.9 ms | 240.5 ms |
| Acknowledge elapsed time | 6,312.5 ms | 6,454.2 ms |
| Wasm size | 647,846 bytes | 247,329 bytes |

These timings include local loopback request/replica behavior and sequential
calls. They are directional comparison evidence only.

## Findings

- Motoko produced a substantially smaller Wasm artifact for this equivalent
  queue implementation.
- Motoko was slightly faster for enqueue and claim in this run.
- Rust was slightly faster for acknowledgement in this run.
- Both languages supported the same Candid boundary and recovery behavior.
- Rust remains a good fit for explicit stable structures, infrastructure, and
  high-volume or specialized processing.
- Motoko is a credible default candidate for ordinary product domains where
  persistent actor state and compact implementation are more valuable than
  low-level collection control.
- A Motoko events-domain comparison canister now builds through the root ICP
  recipe and passes a representative live workflow covering event creation,
  RSVP, attendance, duty, roster, recurrence, and durable export.

## Decision

Use a mixed default:

- **Motoko candidate default:** ordinary product domains such as club/team
  configuration, ordinary events, simple messaging metadata, and notification
  records, subject to each domain's parity and upgrade gates. The events slice
  now has an initial live Motoko comparison proof.
- **Rust default:** placement, shard routing, migration infrastructure,
  high-volume worker paths, specialized processing, cryptography, and binary
  protocols.
- **Candid mandatory:** every cross-language and cross-canister boundary.

## Replacement strategy

The replacement strategy is additive and evidence-driven:

1. Keep each existing Rust canister as the reference implementation while its
  Motoko counterpart is built and validated.
2. Replace ordinary product-domain implementations with Motoko only after the
  counterpart passes the same Candid contract, authorization, recovery,
  upgrade, parity, and representative live workflow probes.
3. Keep Rust as the implementation for placement, routing, migration tooling,
  high-volume infrastructure, specialized cryptography, and binary protocols.
4. Do not replace a Rust canister merely because the Motoko build is smaller;
  retain the Rust implementation when cycle, concurrency, stable-memory,
  migration, or specialized-processing evidence favors it.

Current replacement candidates:

| Domain | Current reference | Motoko status | Recommendation |
| --- | --- | --- | --- |
| Notification records | Rust `notification_queue` | Equivalent Motoko queue passes live behavior and upgrade probes | Motoko candidate default; retain Rust reference until cycle/load gates |
| Events and schedules | Rust `events_domain` | Motoko counterpart passes representative live workflow | Motoko candidate default after RLS/scale/timer parity |
| Club/team configuration | Rust Club Links POC | No full Motoko counterpart yet | Next ordinary-domain candidate |
| Simple messaging metadata | Rust `messaging_domain` | No Motoko counterpart yet | Motoko candidate after scale/RLS evidence |
| Media metadata | Rust `media_metadata` | No Motoko counterpart yet | Motoko candidate only after child-media/privacy gates |
| Placement registry | Rust | No replacement planned | Keep Rust |
| Shard router | Rust | No replacement planned | Keep Rust |
| Migration coordinator/tooling | Mixed boundary | Motoko coordinator exists; Rust remains suitable for complex tooling | Choose per migration complexity |

This is a design default, not permission to enable production workloads. A
specific domain must still pass its RLS/automation parity matrix, upgrade,
recovery, residency, privacy, and scale gates.

## Unresolved measurements

The following remain before a production language decision:

- cycle consumption under equivalent workloads
- stable-memory growth over long retry/upgrade runs
- concurrent contention and hot-shard behavior
- non-trivial schema migration comparison
- full implementation/debugging effort recorded across a larger domain
- mobile/background behavior for client-facing workflows

No conclusion about production capacity or cost should be drawn from the local
benchmark alone.
