# Rust and Motoko notification comparison

## Scope

`backend/notification_queue` remains the Rust reference implementation.
`backend/notification_queue_motoko` is a Motoko implementation of the same
notification Candid contract. It is an evaluation target, not a replacement.

Both implementations are deployed side by side in the synthetic local ICP
environment. The comparison intentionally keeps the public methods and record
shapes equivalent:

- `enqueue`
- `claim`
- `acknowledge`
- `fail`
- `get_notification`
- `recover`

## Current evidence

On 2026-09-11, the same live probe passed against both canisters on a clean
loopback network. It covered:

- authenticated enqueue
- bounded claim
- processing state and attempt increment
- acknowledgement
- delayed retry
- early retry rejection
- retry claim
- interrupted processing recovery
- durable notification query

The shared Candid binding is generated from
`backend/notification_queue/notification_queue.did`. The Motoko canister uses
enhanced persistent actors with an explicit first migration in
`backend/notification_queue_motoko/src/backend/migrations/`.

Both implementations now also require an initialized governor and an explicitly
granted worker principal for claim, acknowledgement, failure, and recovery.
Enqueue and authenticated notification queries remain separate from worker
authority.

## Upgrade evidence

On a clean local deployment, both implementations preserved an in-flight
notification through an in-place Wasm upgrade. After upgrade, both recovered
the processing record, reclaimed it with attempt count 2, and acknowledged it.

## Resource comparison

Run the reproducible workload with:

```sh
RUST_NOTIFY_ID=<rust-id> MOTOKO_NOTIFY_ID=<motoko-id> \
	npm run benchmark:notification-implementations --prefix frontend
```

The benchmark performs the same sequential enqueue, bounded claim, and
acknowledgement workload against both canisters and reports elapsed local
request time and Wasm size. Local timings are directional only; they are not a
production capacity or cycle-cost certification.

## Decision record

The current measured recommendation is documented in
[RUST_MOTOKO_LANGUAGE_DECISION.md](RUST_MOTOKO_LANGUAGE_DECISION.md): Motoko
is a candidate default for ordinary product domains, while Rust remains the
default candidate for infrastructure and specialized processing. This is not a
production capacity or cycle-cost certification.

## Not yet measured

This POC does not yet establish a language winner. The next measurements are:

- cycle consumption under equivalent workloads
- stable-state growth over repeated upgrades and retries
- upgrade preservation with a non-trivial schema change
- interrupted upgrade and restore behavior
- implementation and debugging effort recorded during follow-on changes

Until those measurements exist, ordinary product-domain language selection
remains undecided. Rust infrastructure and the Motoko comparison canister may
coexist through Candid without changing production boundaries.
