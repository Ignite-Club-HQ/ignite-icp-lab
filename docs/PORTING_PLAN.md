# Incremental backend port

## Objective and current boundary

This is a coexistence phase, not an active migration phase. Existing Supabase data,
users, domains, and integrations remain in place and authoritative. ICP is
added only for newly provisioned or explicitly isolated workloads. No data is
exported from Supabase, imported into ICP, cut over, or deleted now. Keep the
provider contracts and placement controls capable of a future authorized
migration from Supabase to ICP or ICP to Supabase.

Preserve Ignite's React UI wherever practical while replacing backend capabilities incrementally. This transfer supplies actual frontend source plus backend reference material, not a database connector or a completed migration. The runnable lab starts with the actual ClubLinksManager, adapted to a domain service, and a synthetic member preview. The full original App, routes, auth, native services and unported domains remain available as source but outside the runtime allowlist.

The React query-cache shape, editor controls, styling, validation, visibility toggles and ordering remain recognizable. Reordering now uses one service operation instead of two independent database writes. The fixture adapter's authorization is a demo only. Do not equate its tests with production permission parity.

## Proposed boundaries

Use per-domain service interfaces rather than a single giant generic database interface. ClubLinksService is the first. After defining the local canister Candid contract, implement a local authenticated actor adapter returning the frontend's domain types. Select it explicitly; an unavailable ICP service must report failure. Never fall back to production Supabase in this lab. Later, an independently authorized production rollout may use feature flags and separate implementations; that is outside this setup.

Keep synthetic application IDs independent from authenticated principals. Do not
link or migrate existing Supabase users in this plan. Do not use a
client-supplied user ID or role as authority. Authentication, app/club/team
roles, parent/guardian-derived membership and exclusion rules must become
explicit backend checks for new ICP workloads.

## First canister acceptance criteria

The local implementation and its validation workflow now live in [CLUB_LINKS_POC.md](CLUB_LINKS_POC.md). The criteria below remain the source-derived contract; passing synthetic local tests does not authorize production wiring or establish full production RLS parity.

Read current ICP skills before picking toolchain, Rust stable structures and actor libraries. Design club links by ID, ordered club indexes and explicit list/get/update methods. Include bounded inputs/results, deterministic ordering, atomic reorder, retry idempotency and upgrade-safe persistence. Use synthetic identities and membership relationships; never production accounts.

Reproduce all five replacement club-links RLS policies. Member reads are active-only, admin reads include inactive links, and mutation scopes must be checked. is_club_admin_for permits a matching club_admin or app_admin. is_club_member includes club roles, team roles, parent and guardian links, with club exclusions. Admin authorization is an independent branch, so blanket exclusion denial can change existing behavior. Direct-ID queries need authorization just as list queries do. Editing club_id requires checks against old and new scope, or an explicitly documented prohibition on moving links.

Test anonymous callers, outsiders, members, both admin roles, parents, guardians, excluded members, excluded admins, cross-club IDs, inactive reads, cache identity changes, concurrent writes, retries, upgrades and synthetic ICP snapshot reconciliation. Query/timer/cache behavior must not leak stale data across users.

## Subsequent domains

1. Prove club links against synthetic data, including frontend interaction and security tests.
2. Establish reusable identity, club/team membership, guardian and authorization services.
3. Port a small read-heavy domain, then club/team CRUD and schedules/events.
4. Port notifications and external integrations behind explicit service contracts, with timers/outboxes and idempotency where needed.
5. Prove user-generated media/Vault access, chunked upload/download, metadata and costs separately from static frontend assets.
6. Port messaging only after measuring local/replicated-call latency and proving polling, ordering, unread state, attachment access, retries and mobile power/network behavior.
7. Do not execute Supabase export/import, cutover, or rollback in this phase. Preserve the interfaces and control-plane states needed for a future authorized migration in either direction.

The shard-router POC now provides the control-plane boundary for the next phase. It is intentionally separate from the active runtime: deploy it only on a disposable local network while proving route lookup, optimistic assignment, domain authorization, isolation fencing and recovery.

The hybrid placement-registry POC extends that control plane to permanent backend choice for newly provisioned workloads. Existing Supabase clubs retain their current authority and are not assigned to ICP. There is one authoritative backend per new workload, with no dual writes or automatic fallback.

Backend availability is an independent kill switch for each provider. Disabling ICP or Supabase blocks new assignments and provider operations while preserving placement metadata for controlled recovery. There is no automatic fallback because fallback could write stale or unauthorized data to the wrong backend.

## Synthetic scaling gate

The local scaling benchmark is a deterministic workload-shape check, not an ICP throughput claim:

```sh
cd frontend
npm run benchmark:scaling
npm run benchmark:scaling -- --json
# with the local managed ICP network and canister running:
npm run benchmark:local-icp
```

It evaluates 1,000, 10,000 and 100,000 synthetic clubs with 1, 16 and 64 routing shards. It reports club distribution, relative work units, message writes, asynchronous fanout volume and hot-club skew. It deliberately does not assign latency or instruction counts; those require a real local-canister load test. A result with max-to-mean work above 2 is a signal to isolate or repartition the hot tenant before adding more domains. The benchmark uses no production data, identities or services.

`benchmark:local-icp` is the observed local follow-up. It signs read-only `list_links` queries with the synthetic club administrator, runs controlled concurrency levels, and reports p50/p95/max latency plus failures. It requires the loopback managed network and deployed lab canister; it refuses missing or non-local configuration. Local timings are useful for regression detection only and must not be extrapolated to mainnet or cross-subnet performance.

The home club-links section also includes Vault policy documents. They are not enabled merely because the link editor works. Complete source for them is present; keep them disabled until their storage and permission service is proven.

## Source handling

All tracked frontend source is copied with provenance. URLs, email addresses, recognized credential/service literals and club-specific sample logos are sanitized. Supabase backend files and other tracked SQL are Markdown reference, not runnable deployable files. Production env, git metadata, workflows, public worker/config files, native projects, root operational scripts and binary backend files are omitted. The generated source manifest records selected-source hashes and omissions; these describe original bytes, not modified lab files. Destination checksums are recorded separately after lab changes.

The original dependency scripts are reference only. The active package has no deployment, native, install-hook or Supabase commands. Native and Supabase SDKs are removed as direct dependencies; legacy lockfile entries and type imports may remain as source evidence. Do not run the unported source test suite indiscriminately.

## Verification limits

Only the allowlisted lab screen is expected to build and run. Other pages must be ported and tested before enablement. This setup does not claim full-app TypeScript compatibility after sanitization, complete production schema parity, a canister deployment, an audited remote Codespace or zero network risk. Record build, lab tests, source-integrity checks and remote transfer verification in VALIDATION.md.

### Follow-up POC status

The synthetic account/principal boundary and planned full-canister snapshot recovery are implemented and tested separately from the original stopped demo. Full snapshots preserve links, ACLs, account bindings and retry receipts across new-canister restore and two managed-network recreations. The original link-only checkpoint cannot recover its missing ACL/receipt state. See `CLUB_LINKS_POC.md` and `VALIDATION.md` for the current runbook and evidence. Production account import, verified provider linking, lost-key recovery and broader domain RLS parity remain future work; no new feature domain is enabled.
