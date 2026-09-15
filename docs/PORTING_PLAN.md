# Incremental backend port

## Objective and current boundary

Preserve Ignite's React UI wherever practical while replacing backend capabilities incrementally. This transfer supplies actual frontend source plus backend reference material, not a database connector or a completed migration. The runnable lab starts with the actual ClubLinksManager, adapted to a domain service, and a synthetic member preview. The full original App, routes, auth, native services and unported domains remain available as source but outside the runtime allowlist.

The React query-cache shape, editor controls, styling, validation, visibility toggles and ordering remain recognizable. Reordering now uses one service operation instead of two independent database writes. The fixture adapter's authorization is a demo only. Do not equate its tests with production permission parity.

## Proposed boundaries

Use per-domain service interfaces rather than a single giant generic database interface. ClubLinksService is the first. After defining the local canister Candid contract, implement a local authenticated actor adapter returning the frontend's domain types. Select it explicitly; an unavailable ICP service must report failure. Never fall back to production Supabase in this lab. Later, an independently authorized production rollout may use feature flags and separate implementations; that is outside this setup.

Keep existing UUID domain IDs independent from authenticated principals. Plan a verified legacy-UUID-to-principal account linking process before migrating existing users. Do not use a client-supplied user ID or role as authority. Authentication, app/club/team roles, parent/guardian-derived membership and exclusion rules must become explicit backend checks.

## First canister acceptance criteria

Read current ICP skills before picking toolchain, Rust stable structures and actor libraries. Design club links by ID, ordered club indexes and explicit list/get/update methods. Include bounded inputs/results, deterministic ordering, atomic reorder, retry idempotency and upgrade-safe persistence. Use synthetic identities and membership relationships; never production accounts.

Reproduce all five replacement club-links RLS policies. Member reads are active-only, admin reads include inactive links, and mutation scopes must be checked. is_club_admin_for permits a matching club_admin or app_admin. is_club_member includes club roles, team roles, parent and guardian links, with club exclusions. Admin authorization is an independent branch, so blanket exclusion denial can change existing behavior. Direct-ID queries need authorization just as list queries do. Editing club_id requires checks against old and new scope, or an explicitly documented prohibition on moving links.

Test anonymous callers, outsiders, members, both admin roles, parents, guardians, excluded members, excluded admins, cross-club IDs, inactive reads, cache identity changes, concurrent writes, retries, upgrades and synthetic export/import reconciliation. Query/timer/cache behavior must not leak stale data across users.

## Subsequent domains

1. Prove club links against synthetic data, including frontend interaction and security tests.
2. Establish reusable identity, club/team membership, guardian and authorization services.
3. Port a small read-heavy domain, then club/team CRUD and schedules/events.
4. Port notifications and external integrations behind explicit service contracts, with timers/outboxes and idempotency where needed.
5. Prove user-generated media/Vault access, chunked upload/download, metadata and costs separately from static frontend assets.
6. Port messaging only after measuring local/replicated-call latency and proving polling, ordering, unread state, attachment access, retries and mobile power/network behavior.
7. Design export/transform/chunked import/reconciliation, per-domain cutover and rollback for production only after separately authorized validation.

The home club-links section also includes Vault policy documents. They are not migrated merely because the link editor works. Complete source for them is present; keep them disabled until their storage and permission service is proven.

## Source handling

All tracked frontend source is copied with provenance. URLs, email addresses, recognized credential/service literals and club-specific sample logos are sanitized. Supabase backend files and other tracked SQL are Markdown reference, not runnable deployable files. Production env, git metadata, workflows, public worker/config files, native projects, root operational scripts and binary backend files are omitted. The generated source manifest records selected-source hashes and omissions; these describe original bytes, not modified lab files. Destination checksums are recorded separately after lab changes.

The original dependency scripts are reference only. The active package has no deployment, native, install-hook or Supabase commands. Native and Supabase SDKs are removed as direct dependencies; legacy lockfile entries and type imports may remain as source evidence. Do not run the unported source test suite indiscriminately.

## Hybrid route guard checkpoint

The competition lifecycle is the next bounded frontend seam after the local
event self-attendance work recorded in the hybrid execution history. The
following source pages now resolve the backend mode before mounting their
existing Supabase implementation:

- competitions list and creation;
- public competition view;
- mini-league list and detail.

The default is `icp`, which renders an explicit unavailable/read-only state
and makes no Supabase request. The old implementation is reachable only when
the navigation explicitly includes `?backend=supabase`; this is a comparison
path, not an automatic fallback or a claim that Supabase is enabled in the
lab. No competition or mini-league page has been added to
`frontend/lab-runtime-files.json`, and no local competition provider has been
invented to satisfy the guard. The focused route tests prove both the
fail-closed default and preservation of the explicit comparison path.

The provider-neutral competition contract and synthetic adapter now exist in
`frontend/src/lab/CompetitionService.ts` and
`frontend/src/lab/competitionService.mjs`. The adapter proves only the
bounded list/detail/basic lifecycle seam: public/member/admin visibility,
direct-ID authorization, deterministic cursor pagination, input limits,
revision fencing, and request-id retry idempotency. It is synthetic evidence,
not an ICP canister or production authorization implementation. The files
remain outside `frontend/lab-runtime-files.json`; competition and mini-league
pages therefore remain outside the active runtime until generated
authenticated bindings and source-complete authorization evidence are added.

The next binding slice is now represented by
`frontend/src/lab/CompetitionBindings.ts` and
`frontend/src/lab/competitionAuthenticatedBinding.mjs`. The binding uses
Candid-shaped records and option values, scopes each actor to a synthetic
principal/account pair, resolves roles from a server-owned identity registry,
and adapts wire records back to the provider-neutral domain types. This is a
local authenticated harness, not generated code or a deployed canister:
production actor creation, principal verification, authorization parity,
upgrade persistence, and recovery remain gated. The binding is deliberately
not in the runtime allowlist.

The synthetic adapter now also has a bounded durability seam:
`exportSnapshot`, `importSnapshot`, and `reconcileSnapshot`. Import validates
schema, row/request limits, duplicate IDs, timestamps, revisions, and request
ledger entries before atomically replacing state. Snapshot recovery tests prove
that populated records, idempotent retry results, and future ID sequencing
survive restore, while drift and malformed snapshots fail closed. This is
upgrade/recovery evidence for the local adapter only; it is not stable-memory
or backup/restore evidence from a deployed canister.

The next provider-neutral dependency is the identity/access contract in
`frontend/src/lab/IdentityAccessService.ts` with its synthetic adapter in
`frontend/src/lab/identityAccessService.mjs`. It resolves stable account IDs
from synthetic principals, evaluates club/team roles, parent and guardian
relationships, and exclusions, and keeps admin authorization independent from
membership exclusion. Private/member profile visibility and child access are
also bounded. This remains synthetic evidence outside the runtime allowlist;
no real authentication, principal verification, account linking, or
production role migration is enabled.

## Verification limits

Only the allowlisted lab screen is expected to build and run. Other pages must be migrated and tested before enablement. This setup does not claim full-app TypeScript compatibility after sanitization, complete production schema parity, a canister deployment, an audited remote Codespace or zero network risk. Record build, lab tests, source-integrity checks and remote transfer verification in VALIDATION.md.
