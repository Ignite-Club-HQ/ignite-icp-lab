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

The competition binding now consumes that identity/access service instead of
maintaining a second inline role registry. Its actor connection resolves the
principal to an account and obtains a server-owned authorization projection;
caller-supplied role fields are not consulted. This proves the local
cross-domain seam while retaining synthetic-only, fail-closed behavior. The
projection is not a generated identity canister binding and does not enable
any route.

The identity domain now also has a dedicated Candid-shaped actor boundary in
`frontend/src/lab/IdentityBindings.ts` and
`frontend/src/lab/identityAuthenticatedBinding.mjs`. Its caller principal is
implicit in the bound actor; account resolution, authorization projection,
profile reads, club access, and parent/guardian child checks are all adapted
through the provider-neutral identity service. It is a local authenticated
harness only and remains outside the runtime allowlist. The next gate is
replacing this harness with generated declarations and a disposable local
identity canister before any identity-backed route is enabled.

Both authenticated harnesses now use the shared local actor transport seam in
`frontend/src/lab/LocalActorTransport.ts` and
`frontend/src/lab/localActorTransport.mjs`. The transport has fixed synthetic
identity and competition canister configurations, the loopback API path, strict
method validation, cloned request boundaries, and an implicit-caller dispatch
callback. This removes duplicated actor-call plumbing without enabling
network access, environment-selected endpoints, generated bindings, or a live
canister. Transport tests prove that both domains use the same `/icp/api/v2`
boundary and distinct synthetic canister IDs. The transport and both bindings
remain outside `frontend/lab-runtime-files.json`.

The shared transport also has a bounded checkpoint seam for request-ledger
evidence. Export/import validates schema, fixed domain configuration, method
names, request IDs, duplicate entries, serialized size, and atomic replacement.
Reconstructed transports replay an identical request without dispatching again
and reject the same request ID with different input. This preserves retry
metadata across local transport reconstruction only; domain state remains owned
by the synthetic provider and this is not stable-memory or deployed-canister
upgrade evidence.

The competition durability seam is now authorized and actor-exposed rather
than a bare, unauthenticated service method. `exportSnapshot`,
`importSnapshot`, and `reconcileSnapshot` on
`frontend/src/lab/competitionService.mjs` now require an actor argument and
reject any caller whose server-resolved authorization is not app-admin; a
per-club admin cannot invoke them. `frontend/src/lab/CompetitionBindings.ts`
and `frontend/src/lab/competitionAuthenticatedBinding.mjs` add Candid-shaped
`export_snapshot`/`import_snapshot`/`reconcile_snapshot` actor methods and
wire/domain snapshot mapping, dispatched through the shared local actor
transport and gated by the same server-owned authorization projection used
for reads and writes. This closes the gap between service-level durability
evidence and the authenticated actor boundary; a real canister's
stable-memory export/import hooks would need equivalent authorization.

Implementing this also surfaced and fixed a defect in
`frontend/src/lab/identityAccessService.mjs`: `authorizationFor` previously
derived `appAdmin` only from per-club access decisions, so a caller whose
only role was a club-independent `app_admin` role (no club-scoped role,
team, or family relationship) resolved to `appAdmin: false`. `appAdmin` is
now derived directly from the caller's roles, independent of any club
association, consistent with app-admin authority being cross-club. This is
still synthetic fixture evidence, not production role parity.

## Club/team RLS research and read-only directory slice

Before extending beyond the competition/identity/club-links domains, this
pass performed dedicated research into the inert reference migrations under
`reference/backend/supabase/migrations/` for `public.clubs` and
`public.teams`. Findings, with file citations (all `reference/backend/...`,
never executed):

- Clubs are readable under two independent SELECT policies (verified
  verbatim in
  `20260317033255_57703fdd-ab6d-48a2-8e8a-42e1f0013706.sql.md`):
  `is_club_member(auth.uid(), id) OR has_role(auth.uid(), 'app_admin', NULL, NULL)`,
  and a separate discovery policy,
  `auth.uid() IS NOT NULL AND listed_on_marketplace = true`. Unlike the
  club-links and competition domains, **there is no separate club-admin
  branch independent of `is_club_member`** on this table; a club admin's own
  read access comes from the direct-role branch inside `is_club_member`
  (their `user_roles` row), which the source's auto-clear trigger keeps from
  ever coinciding with an exclusion row in ordinary use. This adapter does
  not model that trigger; it reproduces only the two SELECT policies as
  written, so it is intentionally narrower than the "admin authority is
  independent of exclusion" pattern used elsewhere.
- Teams have a single, much broader SELECT policy (verified verbatim in
  `20260130012429_6c3b583a-3fbe-4b9a-94eb-2df2d7bedac7.sql.md`):
  `FOR SELECT TO authenticated USING (true)`. Any authenticated user may read
  any team regardless of club membership (the product lets users browse and
  request to join teams); only anonymous callers are denied.
- `is_club_member` and `is_team_member` (verbatim, from
  `20260721114111_aa56e96d-22f4-415a-bedd-486e04eb5849.sql.md`) source
  membership from a direct `user_roles` row, team-role inheritance to the
  parent club, and parent/guardian relationships via
  `child_team_assignments`/`child_guardians`, then subtract exclusion.
  Critically, **the exclusion scope differs by table**: `is_club_member`
  only checks `club_member_exclusions` for that club; `is_team_member`
  checks both `team_member_exclusions` for that team **and**
  `club_member_exclusions` for the team's club (a club-level exclusion also
  blocks team-level access, but not vice versa). `IdentityAccessService`'s
  existing `memberClubIds`/`accessFor` derivation (direct role, team role,
  parent, guardian, minus club-scoped exclusion) already matches
  `is_club_member` exactly, which is why it is reused as-is below. Team-level
  exclusion is not modeled anywhere in this pass because the teams read
  policy does not consult membership or exclusion at all.
- The teams UPDATE policy (verified in
  `20260807084337_c8dfc67e-8daf-4bca-8030-598a72c0faff.sql.md`) is gated by
  `has_role(team_admin) OR has_role(club_admin) OR has_role(app_admin)`,
  entirely independent of `is_team_member`/exclusion — the same "admin
  authority independent of exclusion" pattern already implemented for
  club-links and competitions. Write-side club/team RLS (create/update,
  including this team-admin/club-admin branch, capacity/subscription gating
  implied elsewhere in the product) is deliberately **not** implemented in
  this pass; it needs its own research pass before any mutation contract is
  written.
- Open/unverified items, documented rather than guessed: the full base
  `CREATE TABLE public.clubs`/`public.teams` column lists could not be
  recovered (only later `ALTER TABLE` additions were confirmed by direct
  grep, e.g. `listed_on_marketplace`, `team_lifecycle_status`); the
  `has_role` function's own body was not found by direct grep (its behavior
  is inferred from call sites, not read from its definition); and no live
  canister exists to test any of this against.

Given these findings, this pass adds a **read-only** slice only:
`frontend/src/lab/ClubService.ts`/`clubService.mjs` and
`frontend/src/lab/TeamService.ts`/`teamService.mjs`. `ClubService` reuses the
existing `memberClubIds`/`appAdmin` actor shape from the identity domain
(no new authorization model invented) and reproduces exactly the two SELECT
policies above, including denying anonymous callers on both the membership
and discovery paths. `TeamService` reproduces the single "any authenticated
caller" SELECT policy, also denying anonymous callers. Both provide bounded,
cursor-paginated `list`/`get` and a fail-closed `select*Service` with no
Supabase fallback, following the same pattern as
`selectCompetitionService`. Neither service is wired into
`frontend/lab-runtime-files.json`; both remain fixture-only evidence outside
the active lab runtime. Club/team create/update/delete, capacity/
subscription gating, and any generated Candid binding for these domains are
deferred to a future pass.

## Verification limits

Only the allowlisted lab screen is expected to build and run. Other pages must be migrated and tested before enablement. This setup does not claim full-app TypeScript compatibility after sanitization, complete production schema parity, a canister deployment, an audited remote Codespace or zero network risk. Record build, lab tests, source-integrity checks and remote transfer verification in VALIDATION.md.
