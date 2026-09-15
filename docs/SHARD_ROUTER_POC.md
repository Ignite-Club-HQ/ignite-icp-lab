# Shard-router POC

This is a local synthetic control-plane canister for the scaling assessment. It maps a bounded club identifier to a shard canister principal. It is not connected to the active frontend, Supabase, production identities or any deployment workflow.

## Contract

- `get_route(club_id)` returns an optional route and validates the identifier.
- `list_routes(start_after, limit)` returns deterministic keyset pagination with a maximum page size of 100.
- `assign(request)` is governor-only, checks the global optimistic revision, validates the target principal, and commits the route and revision atomically.
- `begin_migration`, `commit_migration` and `abort_migration` provide a versioned control-plane fence for a club move. Ordinary assignment is rejected while a move is pending.
- `version()` returns the current mapping revision.

The route mapping is stable-memory backed. The shard canister receives no user authority from this registry; domain canisters must still authorize the signed end-user caller. The router fence does not freeze domain writes by itself. A migration coordinator must freeze the source domain, export and validate data, import it into the destination, reconcile records, then commit the route. If any step fails, abort the router migration and leave the source authoritative.

Build and unit-test it with:

```sh
cargo test --locked -p shard_router
cargo build --locked --release --target wasm32-unknown-unknown -p shard_router
```

The next test should deploy this registry alongside multiple synthetic domain canisters, route club reads and writes through it, and prove that reassignment does not lose or duplicate records. The current local load harness remains a direct canister comparison and does not yet call this registry.

The route-aware frontend adapter now lives in `frontend/src/lab/routedClubLinksService.ts`. It caches domain actors by shard, remembers link scopes for ID-based operations, retries one route or shard error, and fails closed when a club is unassigned. It is intentionally outside `frontend/lab-runtime-files.json` until migration fencing and routed recovery are proven.
