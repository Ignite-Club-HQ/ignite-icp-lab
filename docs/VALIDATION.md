# Validation of the lab source transfer

## 2026-09-15 bounded hybrid route guard pass

- `npx vitest run --config vitest.lab.config.mjs --configLoader runner lab-tests/backendRouter.test.tsx`: passed, 1 file and 7 tests.
- `npm test`: passed, 4 Node isolation/service tests and 8 Vitest tests.
- `npm run check:isolation`: passed.
- `npm run build`: passed with the repository's existing Tailwind, Browserslist,
  and third-party `use client` warnings.
- `npm run test:server`: passed against the disposable loopback Vite server;
  CSP, blocked unported App access, and absent local ICP behavior remained
  fail-closed.
- `node --test lab-tests/competition-service.test.mjs`: passed, 5 synthetic
  contract/adapter tests covering direct reads, anonymous/member/admin/
  outsider visibility, bounded cursor pagination, scoped create, revisioned
  update, retry idempotency, and explicit no-fallback provider selection.
- `node --test lab-tests/competition-authenticated-binding.test.mjs`: passed,
  4 synthetic authenticated-binding tests covering Candid-shaped
  wire/domain mapping, server-owned role resolution, forged-role rejection,
  identity mismatch/unknown-principal rejection, explicit result variants,
  and retry-safe updates.
- The competition durability tests are included in `npm test`: populated
  snapshot export/import, request-ledger and future-ID preservation, drift
  reconciliation, atomic rejection of malformed snapshots, and snapshot
  bounds/schema checks.
- `node --test lab-tests/identity-access-service.test.mjs`: passed, 7
  synthetic identity/access tests covering principal-to-account resolution,
  admin/member/team/parent/guardian branches, exclusion behavior, child
  access, profile visibility, fixture validation, and explicit no-fallback
  selection.
- The authenticated competition binding tests now inject the provider-neutral
  identity/access adapter instead of an inline role registry. They prove
  server-owned authorization projection, identity mismatch rejection, and
  that forged frontend role fields cannot elevate a caller.
- `node --test lab-tests/identity-authenticated-binding.test.mjs`: passed, 4
  synthetic Candid-shaped identity actor tests covering account and
  authorization mapping, provider-neutral service adaptation, implicit
  caller identity, anonymous/unknown/mismatched rejection, explicit error
  variants, private profile protection, and missing-child denial.
- The new route tests cover the default ICP decision, explicit/unknown query
  values, reactive router selection, an ICP-mode competition unavailable state
  with zero Supabase calls, and the preserved explicit Supabase comparison
  path.
- Competition and mini-league pages remain outside the runtime allowlist. No
  local competition provider or production integration was added.
- The competition adapter is synthetic in-memory evidence only; no generated
  Candid binding, authenticated actor, canister deployment, production RLS
  parity, or live data path was introduced.
- The authenticated binding is a local Candid-shaped harness, not generated
  declarations or a deployed actor. It does not prove principal verification,
  canister authorization, upgrade persistence, recovery, or production
  readiness.
- Snapshot evidence is synthetic adapter recovery only. No deployed canister
  stable-memory upgrade, backup/restore, interrupted recovery, or managed
  network persistence was tested or claimed.
- Identity/access evidence is synthetic only. No real authentication,
  principal verification, account linking, production role migration, or
  production authorization parity was introduced.
- The cross-domain binding seam is local only; no identity canister, generated
  identity bindings, live actor, route wiring, or provider fallback was added.
- The identity binding is likewise a Candid-shaped local harness, not
  generated declarations or a deployed canister. It does not prove real
  principal verification, stable-memory upgrades, account linking, or
  production authentication.
- `node --test lab-tests/local-actor-transport.test.mjs
  lab-tests/identity-authenticated-binding.test.mjs
  lab-tests/competition-authenticated-binding.test.mjs`: passed, 11 tests
  covering the shared fixed local actor configuration, cloned dispatch
  boundaries, invalid method/config rejection, and identity/competition
  binding integration through the common transport seam.
- Focused TypeScript checking passed for `LocalActorTransport.ts`,
  `IdentityBindings.ts`, `CompetitionBindings.ts`,
  `IdentityAccessService.ts`, and `CompetitionService.ts`.
- The local actor transport is an in-memory dispatch boundary only. It does
  not encode Candid, issue HTTP requests, verify principals, connect to a
  canister, or provide stable-memory upgrade evidence. Its synthetic
  `/icp/api/v2` metadata is configuration evidence, not a live endpoint.
- Transport checkpoint tests also cover replay-safe request recovery across
  transport reconstruction, configuration mismatch rejection, request-input
  drift rejection, duplicate snapshot rejection, and atomic preservation of
  the previous checkpoint after invalid import.
- `node --test lab-tests/competition-service.test.mjs`: passed, 9 tests
  including a new authorization test proving `exportSnapshot`,
  `importSnapshot`, and `reconcileSnapshot` reject a club admin, a null
  actor, and a caller with a falsy/non-boolean `appAdmin` field, requiring a
  true app-admin actor for every durability operation.
- `node --test lab-tests/competition-authenticated-binding.test.mjs`: passed,
  8 tests including new coverage that the authenticated actor's
  `export_snapshot`/`import_snapshot`/`reconcile_snapshot` methods are
  reachable only for a server-resolved app-admin caller, that forged
  `appAdmin`/`adminClubIds` fields on the caller object are ignored, that
  wire/domain snapshot and reconciliation mapping round-trips correctly
  through a fresh service instance, and that a malformed (duplicate-ID)
  snapshot is rejected atomically at the actor boundary.
- Fixed a real defect surfaced by this work: `identityAccessService.mjs`
  previously computed `appAdmin` only from per-club access decisions, so an
  app-admin identity with no club-scoped role resolved to `appAdmin: false`.
  `authorizationFor` now derives `appAdmin` directly from the caller's roles.
  `node --test lab-tests/identity-access-service.test.mjs` (7 tests) and the
  full suite continue to pass after the fix.
- `node --test lab-tests/club-service.test.mjs lab-tests/team-service.test.mjs`:
  passed, 20 tests. `ClubService` coverage: anonymous denial for both
  membership and marketplace-discovery reads, member-only visibility of an
  unlisted club, authenticated non-member discovery of a marketplace-listed
  club, denial of an unlisted club to a non-member, app-admin visibility of
  every club, deterministic/bounded/cursor-paginated listing that never
  leaks unlisted non-discoverable clubs, invalid-cursor rejection, limit
  bounds, not-found/unauthorized parity, and fail-closed provider selection.
  `TeamService` coverage: anonymous denial, any authenticated caller reading
  any team regardless of club, club-scoped list filtering, deterministic
  bounded cursor pagination, invalid-cursor rejection, limit bounds,
  not-found/unauthorized parity, and fail-closed provider selection. Both
  reproduce cited current-state RLS text (see docs/PORTING_PLAN.md); neither
  implements create/update/delete, capacity/subscription gating, or a
  generated Candid binding, and neither is in
  `frontend/lab-runtime-files.json`.
- Focused TypeScript checking (`npx tsc --noEmit --strict`) passed for
  `ClubService.ts` and `TeamService.ts`.
- `node --test lab-tests/club-service.test.mjs`: passed, 13 tests (up from
  9), including two new tests for the creator-visibility correction: a
  caller can read an unlisted, non-member club they just created, and a
  different caller cannot read another creator's unlisted club. Pagination
  and ordering tests updated for the fourth fixture row.
- `node --test lab-tests/club-authenticated-binding.test.mjs
  lab-tests/team-authenticated-binding.test.mjs`: passed, 11 tests. Club
  binding coverage: server-resolved membership through the authenticated
  actor, forged `appAdmin`/`memberClubIds` fields on the caller object
  having no effect (the server-owned projection is used, not the argument),
  app-admin visibility of every club, cross-account caller rejection before
  reaching the actor, use of a distinct `lab-club` canister config on the
  shared transport, and anonymous/unknown-identity connect rejection. Team
  binding coverage: any authenticated bound actor reading a team from a
  club they have no role in, forged caller fields having no effect (teams
  do not gate on membership at all), cross-account caller rejection, a
  distinct `lab-team` canister config, and anonymous/unknown-identity
  connect rejection.
- Focused TypeScript checking (`npx tsc --noEmit --strict`) passed for the
  updated `ClubService.ts` and the new `ClubBindings.ts`/`TeamBindings.ts`.
- Full suite after this pass: `npm test` reports 70 Node tests (up from 57)
  plus the existing 8 Vitest tests, all passing. `npm run check:isolation`,
  `npm run build`, and `npm run test:server` (against a disposable loopback
  Vite dev server, started/stopped by PID) all passed.
- The repository has no `typecheck:lab` script. A direct
  `npx tsc --noEmit --project tsconfig.app.json` remains blocked by existing
  full-source type errors, including pre-existing errors in the unported
  mini-league and competition source; no new error was reported in the added
  backend-mode or unavailable-notice modules.

This is frontend routing/isolation evidence only. It is not evidence of
competition canister connectivity, authorization parity, production RLS parity,
or production readiness.

Validated in a Bubblewrap sandbox with a separate network namespace, cleared environment, no production source/home credentials mounted, writable lab files and read-only installed dependencies. The host production repository was read only to prepare the sanitized copy and compare source hashes.

- Isolation checker passed: active source allowlist, blocked integration imports, disabled clients, restrictive CSP, fixed loopback ICP target and no runtime environment configuration.
- Four Node tests passed: local-request URL policy, fixture CRUD/ordering/visibility, rejected unauthorized/cross-club mutations and missing-ICP fail-closed selection.
- One React DOM interaction test passed using the actual copied editor: add, edit, hide from member preview and delete.
- Vite production bundle built successfully. Dev-server smoke passed: CSP present, main entry served, unported App import rejected and absent ICP rejected at the local proxy.
- npm ci dry-run with offline mode and lifecycle scripts disabled accepted the lab package/lockfile. A fresh dependency download/install was not performed; build and UI tests used installed Vite 7.3.6 and Vitest 4.1.5 mounted read-only from the environment.
- Known credential patterns, known source environment values and direct production Supabase endpoint patterns were scanned across staged text with no remaining findings. This is bounded scanning, not a claim that a generic secret scanner can prove the absence of every conceivable identifier.
- All originally tracked production file hashes were compared with the start-of-task snapshot. No changes were made by this task. The pre-existing package-lock.json modification was preserved.

Non-blocking build warnings concern existing Tailwind arbitrary classes, Browserslist age and third-party `use client` directives. Browser behavior was checked through the local HTTP smoke and jsdom interaction test; no real browser visual/native-device test or canister test was performed. The remote Codespace environment is not audited by these checks. The full legacy frontend and original test suite remain unported source, outside the active build.
