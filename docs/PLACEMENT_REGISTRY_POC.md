# Hybrid backend placement POC

`placement_registry` records the authoritative backend and verified jurisdiction for each synthetic club:

```text
club_id + country → Supabase { environment } | ICP { canister }
```

Assignments are governor-only, versioned, stable-memory backed, and paginated. The registry stores references only; it does not call Supabase or ICP canisters and does not grant data access. Domain adapters must enforce the caller's permissions in the selected backend.

Backend availability is independently controlled with `set_availability` and `get_availability`. ICP and Supabase default to enabled in the synthetic POC. Disabling a backend increments an availability version, blocks new placement assignments to that backend, and leaves existing placement records intact so they can be migrated or restored. Provider adapters must fail closed while a backend is disabled; they must never silently reroute writes to the other backend.

Country eligibility is controlled with `set_policy(country, supabase_enabled, icp_enabled, expected_version)`. For example, Australia can be configured as Supabase-only (`AU, true, false`) while the USA can allow both (`US, true, true`). `set_placement` requires a country and rejects a backend disallowed by that country policy. Country is trusted control-plane data: clients may not select it, and IP geolocation is not an authorization source. Existing placements are not silently invalidated when a policy changes; they enter a migration/compliance review state and must be moved or explicitly blocked by the provider adapter.

Placement lifecycle is explicit: `Active`, `ReadOnly`, `MigrationRequired`, or `Blocked`. `get_decision` combines placement state, backend availability, and country policy into a fail-closed writable decision. `set_state` is governor-only. A policy change therefore does not silently reroute data: operators can mark an affected club migration-required, allow reads while blocking writes, or block access while preserving the original placement for recovery.

The registry is not wired into the active frontend or `icp.yaml`. It is a control-plane proof for the permanent hybrid architecture, where clubs may remain on Supabase or move to ICP independently. A real cutover still requires freeze/export/import/reconciliation and an explicit placement version transition.

`frontend/src/lab/hybridClubLinksService.ts` is the corresponding provider-neutral adapter. It accepts an injected registry actor plus separate Supabase and ICP providers. Each operation evaluates the registry decision first, permits reads during `ReadOnly`, blocks writes unless the decision is writable, and never falls back to the other provider. The adapter and its tests are intentionally outside the runtime allowlist until a local Supabase-compatible provider is implemented and isolated.

`frontend/src/lab/syntheticSupabaseProvider.ts` now supplies that local test double. It creates one isolated in-memory fixture service per synthetic environment; it does not import a Supabase client or contact a network. This proves the provider seam without changing the active lab UI or treating fixtures as Supabase security evidence.

`frontend/scripts/test-placement-registry.mjs` is the next local integration gate for a deployed disposable registry canister. Set `PLACEMENT_HOST` and `PLACEMENT_ID` to a loopback canister only. The probe creates unique synthetic AU/US placements, verifies both are writable, disables and re-enables ICP, then moves the US placement to `ReadOnly` and verifies writes are denied. It refuses to run without an explicit canister ID and contains no production target or credentials.

The registry now appends an audit event for every successful placement, policy, availability, and lifecycle-state update. `list_audit` returns bounded, keyset-paginated events with the caller principal, timestamp, action, affected club where applicable, detail, and registry version. Audit records are append-only stable memory and are not a replacement for an external operational log or immutable archival policy.
