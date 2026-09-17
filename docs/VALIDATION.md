# Validation of the lab source transfer

## Step 2 Rust/Motoko build foundations — 2026-09-16

The Step 2 source layout is now canonical: product domains use the Motoko
implementations directly under `backend/<domain>`, with no duplicate Rust
product-domain crates or `_motoko` deployment aliases.

Step 3 control-plane evidence:

- Placement registry and shard-router Rust workspace metadata validates after
  removing the obsolete product-domain comparison crates.
- Placement decisions now fail closed when an assigned target is missing,
  disabled, or unhealthy; focused unit coverage was added for the target
  availability invariant.
- `npm run check:parity` and `npm run check:parity-evidence` pass.
- Placement, placement-admin, and control-plane federation probes pass
  syntax validation and cover operator authorization, country/residency policy,
  target health, per-site disablement, read-only placement, domain routes,
  optimistic revisions, and migration fences.
- Live control-plane execution remains environment-blocked until the managed
  PocketIC launcher can start successfully.
- The focused placement Rust test was attempted twice, including a
  single-job retry, but the constrained runner terminated `rustc` with
  `SIGTERM` while compiling `syn`; this is an environment limitation rather
  than a reported source failure.

Step 4 identity and access progress:

- The canonical `identity_access` canister keeps stable application account
  anchors separate from principals and implements authenticated linking,
  revocation, optimistic account versions, guardian/family links, scoped
  roles and exclusions, federated external-site bindings, consent checks,
  field-level access checks, and account erasure.
- Role grants and exclusions now reject unknown account IDs, and duplicate
  exclusions are rejected to keep authorization state deterministic.
- `test-identity-access.mjs` passes syntax validation and covers positive and
  negative account, club, team, guardian, exclusion, multi-site, linking,
  revocation, consent, erasure, and anonymous-access cases.
- Live identity/access execution remains blocked by the same disposable
  PocketIC launcher `IncompleteMessage` failure. The focused Rust test was
  attempted under a single build job but was externally terminated with
  `SIGTERM` while compiling `syn`; no source diagnostic was reported.

Steps 5-11 domain and privacy progress:

- The canonical Motoko product domains and worker probes are present for club,
  events, competition, messaging, media metadata, notification, timer,
  field-level privacy, and secret workload boundaries.
- Event listing now requires an authenticated caller and filters results to
  the caller's creator/club/team authorization scope rather than exposing all
  events through a public query.
- Competition registration now verifies the team belongs to the competition's
  club, rejects duplicate registrations, and requires join tokens to be
  future-expiring and unexpired at claim time.
- Messaging unauthorized list reads now fail explicitly instead of returning a
  success-shaped empty list.
- All remaining dedicated domain, worker, privacy, and external-boundary
  probe scripts pass Node syntax validation. The modified product-domain
  canisters pass `mops check --locked --no-lint`; live canister execution
  remains blocked by the PocketIC launcher limitation.

Follow-up fail-closed parity fixes — 2026-09-16:

- Governor checks in the canonical Motoko product domains now reject the
  anonymous sentinel principal even before initialization; this prevents
  pre-initialization anonymous callers from satisfying governor-only
  operations.
- Club migration and identity snapshot exports now require the governor.
- The events domain snapshot export now binds the caller and requires the
  governor. The product-domain probe includes an outsider negative assertion
  for this export.
- `mops check --locked --no-lint` passed for `club_domain`, `events_domain`,
  `competition_domain`, `media_metadata`, and `messaging_domain`.

Privacy and secret-boundary hardening:

- `pii_access_control` now restricts encrypted PII reads and audit queries to
  the governor or owning domain, and explicitly rejects the anonymous
  governor sentinel. PII registration also requires the caller to be the
  owning domain or governor and rejects an anonymous domain owner.
- `secret_workload_identity` workload enumeration and audit queries now
  require the governor and fail explicitly for unauthorized callers.
- Unlocked `mops check --no-lint` passed for both hardened canisters. Locked
  checks are currently unavailable for these legacy directories because their
  local `mops.lock` files are absent or stale; no dependency change was
  introduced by the source edits.

Frontend routing validation:

- The provider-neutral backend router now rejects blocked placement states in
  addition to disabled backends and disallowed countries.
- `npm run typecheck:lab` passes after replacing a stale generated `State`
  binding import with a type derived from the active Candid service contract.
- Isolation, topology, Candid drift, route classification, parity, and
  parity-evidence gates pass. The Node portion of `npm test` passes; the
  Vitest portion is externally terminated by the constrained runner.

Final autonomous validation:

- The PII registration boundary now rejects anonymous domain owners and
  requires the caller to be the declared domain owner or governor, preventing
  unauthorized overwrite/impersonation of protected records.
- `mops check --no-lint` passes for `pii_access_control`.
- `npm run typecheck:lab` passes.
- Isolation, topology, Candid drift, route classification, parity, and
  parity-evidence checks pass.
- All frontend probe scripts pass syntax validation and the Node lab test
  suite passes all 9 tests.
- The complete frontend lab suite passes: 65 Vitest files and 407 tests,
  plus the 9 Node lab tests.
- `npm run build` passes for the isolated lab frontend. Existing dependency,
  Browserslist, and Tailwind warnings remain non-blocking.

Club identity lifecycle:

- Replaced the canonical club-domain identity placeholders with persistent
  account lookup, authenticated `whoami`, expiring link challenges,
  optimistic-version link acceptance, duplicate-identity rejection, and
  versioned identity revocation.
- `mops check --no-lint` passes for the club domain. Existing warnings are
  limited to redundant `persistent` syntax and unused legacy fields.

Remaining domain-boundary hardening completed in this pass:

- Events RSVP and attendance writes now reject empty or oversized account
  metadata instead of persisting malformed identity references.
- Media asset and capability expiry must be later than the current clock,
  and expired/deleted assets are excluded from normal reads and interactions.
- Secret workload verification now requires the authenticated caller to match
  the registered workload principal, requires a non-empty nonce, and rejects
  nonce reuse with an explicit denial audit entry.
- Notification enqueue now rejects an existing notification ID when its
  idempotency key differs.
- Focused `mops check --no-lint` passes for events, media metadata, secret
  workload identity, and notification queue.
- The live product-domain probe was not run because the disposable PocketIC
  launcher remains environment-blocked; no remote or production target was
  contacted.

The Step 2 build-foundation gate was verified in the isolated worktree:

- `cargo test --locked`: passed all Rust unit and integration tests.
- `cargo build --locked --release --target wasm32-unknown-unknown`: passed.
- `mops check --fix`: passed all 9 configured Motoko canisters. The
  `club_domain` alias now shares the `club_domain` migration chain and
  check limit, which is required for its persistent state declarations.
- `mops build`: the canonical notification canister built successfully
  directly; repeated full-workspace build attempts were externally terminated
  by the constrained runner after starting the first canisters. The same
  Motoko sources and migration chains pass `mops check --fix`.
- `cd frontend && npm run typecheck:lab`: passed.
- Step 1 topology, Candid drift, isolation, and route-classification checks
  passed.

The local deployment manifest uses logical domain names for the single
deployed implementation of each domain (`club_domain`, `events_domain`,
`competition_domain`, `messaging_domain`, `media_metadata`, and
`notification_queue`). Rust crates with the same domain concepts remain
comparison/reference implementations and are not included as additional
canisters in `icp.yaml`. The previous `club_domain`/`club_domain`
duplicate Mops entries were consolidated into one `club_domain` entry.

The disposable mixed-topology deployment could not start in this environment:
the local PocketIC launcher exited while creating its instance with an
`IncompleteMessage` response from its loopback service. No remote target or
production endpoint was contacted. The frontend production bundle was also
terminated by the shared environment during Vite transformation after
typechecking passed; this was an environment termination, not a reported
compile error, and should be retried in an unconstrained runner.

Validated in a Bubblewrap sandbox with a separate network namespace, cleared environment, no production source/home credentials mounted, writable lab files and read-only installed dependencies. The host production repository was read only to prepare the sanitized copy and compare source hashes.

- Isolation checker passed: active source allowlist, blocked integration imports, disabled clients, restrictive CSP, fixed loopback ICP target and no runtime environment configuration.
- Four Node tests passed: local-request URL policy, fixture CRUD/ordering/visibility, rejected unauthorized/cross-club mutations and missing-ICP fail-closed selection.
- One React DOM interaction test passed using the actual copied editor: add, edit, hide from member preview and delete.
- Vite production bundle built successfully. Dev-server smoke passed: CSP present, main entry served, unported App import rejected and absent ICP rejected at the local proxy.
- npm ci dry-run with offline mode and lifecycle scripts disabled accepted the lab package/lockfile. A fresh dependency download/install was not performed; build and UI tests used installed Vite 7.3.6 and Vitest 4.1.5 mounted read-only from the environment.
- Known credential patterns, known source environment values and direct production Supabase endpoint patterns were scanned across staged text with no remaining findings. This is bounded scanning, not a claim that a generic secret scanner can prove the absence of every conceivable identifier.
- All originally tracked production file hashes were compared with the start-of-task snapshot. No changes were made by this task. The pre-existing package-lock.json modification was preserved.

Non-blocking build warnings concern existing Tailwind arbitrary classes, Browserslist age and third-party `use client` directives. Browser behavior was checked through the local HTTP smoke and jsdom interaction test; no real browser visual/native-device test or canister test was performed. The remote Codespace environment is not audited by these checks. The full legacy frontend and original test suite remain unported source, outside the active build.

## Lab Codespace verification — 2026-09-09

Verified checkout `/workspaces/ignite-icp-lab` and origin `https://github.com/PaulCranwellsCode/ignite-icp-lab`. The working tree was clean on `main`. Fetched origin and fast-forwarded from `16ee554` to `fc5e015965f250d8d67df295afef9edd0aba2511`; confirmed the requested commit is HEAD and an ancestor of HEAD. No reset, overwrite of local work, or push was performed. Read AGENTS.md, README.md, PORTING_PLAN.md and this validation record.

All 2,486 entries in `reference/DESTINATION_CHECKSUMS.json` matched before local changes. The transferred lockfile contained 180 source-environment package-cache URLs rejected by npm with EALLOWREMOTE. Replaced only those URL prefixes with `https://registry.npmjs.org/`; verified package versions, integrity hashes and all other parsed lockfile content are unchanged. The original transfer checksum manifest remains unchanged as provenance; the lockfile and this validation record are intentional local changes.

Using Node 24.20.0, freshly installed dependencies with `npm ci --ignore-scripts` (cache under `/tmp/ignite-lab-npm-cache`). Installation completed with 646 packages and lifecycle scripts disabled. Registry download and loopback server access required sandbox permission escalation.

- `npm run check:isolation`: passed.
- `npm test`: passed both Node test files (four declared cases) and the React editor interaction test under Vitest 4.1.5.
- `npm run build`: passed with Vite 7.3.6; the existing Browserslist, Tailwind and third-party directive warnings remain.
- `npm run dev` plus `npm run test:server`: passed; CSP present, main entry served, unported App rejected, and absent ICP returned a local proxy failure. Stopped the server after testing.
- The Codespace reported forwarded port 5180 as private. No tracked GitHub workflows or devcontainer configuration were found. Environment-variable names were reviewed without printing values; none matched the isolation checker's production integration patterns. GitHub credential variables are present, so this is not certification of credential isolation or an OS/network audit.
- Fetched the current ICP `llms.txt` and skills index for this session. Matching implementation skills and their references must still be read before writing canister/actor code.

The source baseline is ready to begin the first local Rust club-links canister and authenticated actor adapter. No ICP backend is implemented or tested yet. Production RLS parity, caller authorization, stable persistence, retries, concurrency, upgrades and reconciliation remain implementation acceptance criteria. Unported integrations remain disabled; no production repository, Supabase connection, credentials or real data were used for this validation. No full-app, real-browser visual or native-device validation is claimed.

## Local club-links POC — 2026-09-10

Implemented the local Rust canister, generated Candid declarations, signed synthetic actor adapter, explicit fixture/ICP selector, and separate member-preview identity. See [CLUB_LINKS_POC.md](CLUB_LINKS_POC.md) for commands, source policy mapping and limits. The preceding source-transfer section is historical; an ICP backend now exists for this one domain.

Preserved the pre-existing validation notes and registry-URL correction in the frontend lockfile. Adding the current ICP SDK and bindgen regenerated the npm dependency tree: npm pruned 273 unused legacy lock entries, added 11 entries, and changed the existing root `commander` entry from 12.1.0 to 14.0.3 for tooling. This is not a full-app dependency migration. The resulting lockfile passed `npm ci --ignore-scripts --dry-run --offline`; SDK dependencies were installed with lifecycle scripts disabled.

Verified:

- `cargo test --locked`: 2 Rust tests pass, including equality of exported and committed Candid.
- Rust release build for `wasm32-unknown-unknown`: passes; installed on the loopback managed network using ICP CLI 1.5.0 and Rust recipe v3.3.0.
- `npm run typecheck:lab`: passes for the active lab UI and adapter closure.
- `npm test`: both existing Node test files pass; four Vitest cases pass across editor and adapter tests. Added late-response disposal, stale-query rejection and invalid-config coverage.
- `npm run build`: passes. Existing Browserslist/Tailwind/third-party directive warnings remain.
- `node frontend/scripts/test-canister.mjs exercise`: passes actual signed-caller checks for direct members, team-derived members, parents, guardians, anonymous users, outsiders, excluded members, excluded administrators, app administrators and cross-club administrators. Tests unauthorized mutations, direct-ID reads, inactive visibility, scope moves, atomic reorder, competing revisions, input validation, ACL revocation, receipt replay after revocation and stale open drafts after background refresh.
- Actual adapter test simulates a committed update whose response is lost; retry uses the same request and produces one record. Identity disposal prevents later use.
- In-place Wasm upgrade followed by `after-upgrade`: every exported record, order and club revision matches, ACL version persists, and the original request receipt still replays identically.
- Separate fresh local canister restore: every exported POC field reconciles. Invalid imports write nothing; unauthorized imports and overwriting a populated destination are rejected.
- Headless Chromium against the actual Vite page: canister create/edit/hide/delete, browser reload persistence, active-only member preview, identity-switch cache isolation and excluded-admin access pass. The test blocks non-local origins and observed no external browser requests or page errors. Chromium and its required system libraries were installed in the lab Codespace for this test.
- Connected and disconnected local server smoke checks pass: restrictive CSP, allowlisted entry point, unported App rejection, public-only local config, and local failure without fallback when ICP is absent.
- `git diff --check`, local script syntax checks and application isolation checker pass.

### Local network lifecycle limitation and recovery

The actual network restart check did **not** establish automatic persistence. CLI stop reported success while its PocketIC child remained listening. After saving a current synthetic checkpoint, the specific orphaned POC child was identified and terminated with SIGTERM. Starting the managed network then produced a fresh network and removed its local canister mappings. The prior canister was absent.

The checkpoint remained intact under `.local-icp/`. Installed the POC on the fresh local network, imported that checkpoint into the empty destination, and verified every synthetic link field and revision. No production data was involved. This is successful explicit recovery, not successful automatic network restart persistence. ACL and mutation receipts are outside the link-only checkpoint; their persistence is proven for in-place canister upgrades, not this network recreation. The wrapper now checkpoints before stopping, checks port release, avoids restarting an already-running network, and refuses restart of a previously configured lab without a saved checkpoint. The runbook documents recovery and the remaining full-network backup requirement.

The synthetic local demo is restored. Production frontend/backend repositories and live services were not accessed or modified. Supabase remains disabled, unported modules remain outside the runtime allowlist, no commits or pushes were made, and no real accounts, production credentials, external integrations or mainnet deployment were introduced. This does not certify OS/network isolation, production RLS parity, Internet Identity migration, native mobile behavior, certified application data or production throughput.

## Full recovery and synthetic accounts — resumed 2026-09-10

The previous local process and `/tmp` tool installations were absent on resumption. Its original `.icp/cache` descriptor and `.local-icp` checkpoints were preserved. Only the link-only checkpoint existed for that old process; its ACL and receipt recovery is not claimed. Restored the temporary Rust 1.98.1 / ICP CLI 1.5.0 tools and used a **separate** synthetic project under `.local-icp/recovery-test-B6zMHj` for current integration checks.

Added stable account IDs and active-principal bindings in memory region 5, canonical account-based ACL projections, target-signed linking, ten-minute challenge expiry, optimistic account versions and last-key-safe revocation. The original regions 0–4 retain their schemas. This is a synthetic identity boundary; no real Supabase UUIDs, Internet Identity, OAuth, mobile authentication or production account recovery are implemented. Generated Candid and frontend declarations were refreshed.

Verified in this session:

- Four Rust tests pass, including Candid equality, expiry without mutation, competing challenges, two-party linking, revoked-key rejection, last-key protection and ACL refresh without key reactivation. Wasm release build passes.
- The expanded live linked-identity matrix passes for team members, parents, guardians, excluded members, excluded administrators and club administrators. Revoked linked keys lose reads; exclusions and the separate administrator branch remain intact.
- The live signed-caller test links a new principal to the same account, rejects the wrong acceptor, preserves membership, revokes the original key and rejects its subsequent reads.
- Complete CLI snapshot download/upload to a newly created, stopped destination passes. Links, revisions, ACL/config and complete identity state compare exactly; the saved mutation receipt replays identically.
- In-place Wasm upgrade preserves those same exports and receipt behavior.
- **Two automated network stop/start cycles pass** with full snapshot restoration and the same reconciliation after each cycle. The test network finishes stopped with a verified recovery snapshot. This establishes planned snapshot recovery, not native managed-network persistence or recovery of writes after an abrupt uncheckpointed loss.
- Node recovery tests reject altered, missing, additional and symlinked snapshot files, and refuse fresh startup from stale cached status without a complete recovery plan. All three lab Node test files and four Vitest cases pass. Lab TypeScript checking, isolation checking, offline npm lockfile dry-run and build pass; existing non-blocking build warnings remain.
- Vite now verifies ownership of this project's PocketIC process before forwarding ICP requests. The stale-binding server smoke passes with HTTP 503 and no fallback. A different synthetic network on the same loopback port cannot satisfy the original project's binding. No new real-browser or mobile validation is claimed in this resumed session.

The lifecycle tests found and fixed three concrete failures: restore requires stopping even a newly created destination; the launcher and its temporary port file can disappear while PocketIC survives; CLI status can return stale cached configuration. Ownership is established using the project-specific executable path, process start time and owned listening control socket. Shutdown verifies the PID/start time again before signalling. Concurrent lifecycle actions fail closed with a lock, and existing mapped canisters are never overwritten by restore.

The original demo binding remains stale and is deliberately not replaced by the separate test. Its fixture mode remains available. No production repository/services, production credentials, real data, commits or pushes were used. See the POC runbook for the complete recovery commands and outstanding identity limits.

## Synthetic scaling benchmark — 2026-09-10

Added `frontend/scripts/scaling-benchmark.mjs`, which exercises deterministic club-to-shard routing for 1,000, 10,000 and 100,000 synthetic clubs at 1, 16 and 64 shards. The benchmark reports workload shape only: relative work units, message writes, asynchronous fanout volume and hot-club concentration. It does not measure ICP replica latency, instruction counts, cycles or subnet throughput.

The benchmark completed successfully. The 100,000-club scenario produced 1,159,635 synthetic message writes and 108,981,750 fanout deliveries under its deliberately heavy synthetic workload. A single hot club dominated shard work as shard count increased (max-to-mean work 8.861 at 16 shards and 33.395 at 64 shards), demonstrating why hot clubs need dedicated placement or adaptive repartitioning. These values are workload-model outputs, not capacity claims.

`npm run test` now passes four Node lab suites and four Vitest tests; `npm run check:isolation`, `npm run build` and `git diff --check` also pass. Existing Browserslist, Tailwind and third-party `use client` warnings remain. A real local-canister load test is still required before selecting shard counts or making 100,000-club performance claims.

Added `frontend/scripts/local-load-test.mjs` as that real-canister follow-up. It signs read-only `list_links` queries against a loopback lab canister at controlled concurrency and reports p50/p95/max latency and failures. The original 4943 binding was stopped and its lifecycle guard correctly refused a fresh start without a complete shutdown snapshot, so the live measurement used a separate disposable network documented below.

## Disposable live load test — 2026-09-10

Ran the signed query harness against a separate synthetic managed network on loopback port 4953. The existing lab binding on port 4943 was not started or changed. The disposable canister used the public synthetic application-admin identity and synthetic club data only. For 200 `list_links` queries per row, all requests succeeded:

| concurrency | p50 | p95 | max |
| ---: | ---: | ---: | ---: |
| 1 | 10.87 ms | 34.57 ms | 909.31 ms |
| 4 | 30.72 ms | 153.16 ms | 989.70 ms |
| 16 | 72.16 ms | 572.79 ms | 3,958.31 ms |
| 32 | 123.48 ms | 2,101.05 ms | 3,966.75 ms |

These are local single-canister query observations with no cross-subnet traffic and a tiny bounded dataset. They are regression evidence for the harness only, not production capacity or 100,000-club performance evidence. The disposable network was stopped after the run.

## Four-shard comparison — 2026-09-10

The same harness was run against four identical synthetic canisters on a separate disposable loopback network, with 400 signed queries per row. All requests succeeded. Four-canister results were p50/p95/max: concurrency 1 = 9.62/34.94/678.11 ms; 4 = 22.96/97.00/1,913.19 ms; 16 = 43.91/572.24/3,417.02 ms; 32 = 89.48/1,841.29/5,690.83 ms. The one-canister control was 9.66/32.24/740.88 ms; 23.33/100.81/1,033.37 ms; 44.69/506.39/4,787.82 ms; and 78.43/1,034.68/6,591.47 ms respectively.

This local same-subnet test did not demonstrate a consistent latency improvement from four canisters. It confirms that sharding is a capacity and isolation tool, not an automatic latency optimization. A meaningful production design still needs workload partitioning, hot-tenant placement, gateway/router behavior, update benchmarks, and multi-subnet testing. The disposable network was stopped after the comparison.

## Shard-router POC — 2026-09-10

Added the separate Rust `shard_router` crate and Candid contract. It uses stable memory for route mappings and a monotonic revision, requires the configured governor for assignments, validates shard principals and bounded club IDs, and exposes keyset-paginated route reads. `cargo test -p shard_router` passed 2 tests; `cargo build --locked --release --target wasm32-unknown-unknown -p shard_router` passed. The router is not included in `icp.yaml` or the frontend runtime and has not been connected to production-shaped data.

Added the route-aware Club Links adapter and synthetic tests. It resolves a club route, caches domain actors by shard, remembers link scopes for ID-based mutations, retries one route/shard error, and fails closed for unassigned clubs. Vitest now passes 3 files and 6 tests; lab TypeScript checking also passes. The adapter remains outside the runtime allowlist until migration fencing and routed recovery are proven.

Extended the shard router with a stable-memory migration fence: `begin_migration`, `commit_migration`, `abort_migration` and `get_migration`. Ordinary assignment is rejected while a move is pending, and all transitions use optimistic revisions. `cargo test -p shard_router` passes 2 tests. This is control-plane fencing only; domain data freeze, export/import reconciliation and route commit orchestration remain to be proven before enabling routed runtime calls.

Added domain-level Club Links fencing and single-club transfer methods. `mutate` rejects a frozen club; `export_frozen_club` verifies the captured revision; `import_frozen_club` validates scope, IDs, order and destination emptiness; `unfreeze_club` requires the original revision. Regenerated Candid bindings. Club Links unit tests, Wasm release build, all lab tests, lab typecheck, isolation checks and diff checks pass.

End-to-end disposable migration probe completed successfully. It seeded revision 1 on the source, froze and exported the club, imported one link into the empty destination, rejected a stale source mutation with `Club migration in progress`, committed router revision 3, and confirmed the destination route and record. The network was stopped after the run. This proves the synthetic protocol only; it does not prove production migration, multi-domain consistency or rollback after arbitrary process loss.

Added the permanent hybrid `placement_registry` POC. It records a versioned per-club choice between a synthetic Supabase environment and an ICP canister reference, with governor-only updates and bounded pagination. `cargo test -p placement_registry` passed 2 tests and its locked Wasm release build passed. It is not in `icp.yaml`, the runtime allowlist, or any production configuration.

Added independent backend availability controls to the placement registry. `set_availability` and `get_availability` maintain versioned ICP and Supabase kill switches; disabled targets cannot receive new placements, while existing placement records remain available for controlled migration or recovery. Provider adapters must fail closed and never silently fall back. Placement-registry tests now pass 3 tests and its locked Wasm release build passes. Frontend lab tests and diff checks remain green.

Added trusted country policy to the placement registry. Placements now carry an uppercase ISO alpha-2 country code; country policies can allow Supabase, ICP, or both. For example, `AU` can be Supabase-only while `US` allows both. Disallowed assignments fail closed, and country is never accepted from an untrusted frontend claim. Placement-registry tests now pass 4 tests and its locked Wasm release build passes.

Added explicit placement lifecycle states (`Active`, `ReadOnly`, `MigrationRequired`, `Blocked`) and `get_decision`, which combines placement state, backend availability and country eligibility into a writable decision. `set_state` is governor-only. This supports controlled policy changes without silently rerouting or deleting existing data. Placement-registry tests and locked Wasm build pass; no production provider is wired.

## Hybrid provider seam — 2026-09-10

Replaced the placement registry's generic-result notation with concrete Candid result types so the current bindgen tool can parse the contract. Generated local placement-registry declarations under `frontend/src/lab/bindings/placement_registry`. Added the provider-neutral hybrid Club Links adapter and an isolated synthetic Supabase provider. The adapter tests cover backend selection, disabled-backend fail-closed behavior, and read-only migration enforcement. Lab typecheck, all 9 frontend lab tests, isolation checks and `git diff --check` pass. The generated binding and providers remain outside the active runtime allowlist; no Supabase client, endpoint, credentials or production data were used.

Added `frontend/src/lab/placementRegistryClient.ts`, which converts the generated placement-registry Candid actor into the hybrid adapter's typed registry interface while preserving errors and empty placements. Two focused tests cover decision conversion and fail-closed registry responses. The lab suite now passes 11 Vitest tests; no runtime allowlist or production integration was changed.

Added the synthetic mutable placement control plane and hybrid integration gate. The gate routes two synthetic clubs to separate Supabase and ICP provider slots, verifies provider data isolation, then exercises the Supabase availability kill switch, country-policy denial and read-only migration state. The lab suite now passes 13 Vitest tests, typecheck, isolation checks and diff checks. This remains an in-memory test harness; it is not production Supabase behavior or an ICP capacity result.

Added a clearly labeled `Hybrid synthetic control plane` mode to the isolated lab UI. It lets a tester switch between an Australia club placed on the synthetic Supabase provider and a USA club placed on the synthetic ICP provider. The mode uses the same placement-aware adapter and control-plane decisions exercised by the integration tests; it is not connected to a live Supabase service or an ICP canister. The runtime allowlist now includes only these local adapters, and the production-shaped source remains disconnected. The production build passes with existing non-blocking dependency and CSS warnings.

Formalized the placement-granularity decision: country policies constrain eligible backends, while each club has an explicit independent placement. Extended the hybrid integration gate so one identity can switch between Supabase and ICP clubs and retrieve each link only through its remembered club scope. This prevents cross-club cache or actor leakage while preserving mixed-backend memberships.

Added `frontend/scripts/hybrid-browser-poc.mjs` for browser-level CRUD, placement switching and external-request isolation. It was not executable in this environment because the Playwright Chromium binary is not installed; the existing dev server also already occupied port 5180. This is an environment limitation, not a test failure in the application code.

Added `frontend/scripts/test-placement-registry.mjs`, a parameterized loopback-only integration probe for a deployed disposable placement registry. It exercises AU Supabase-only and US dual-backend policies, active decisions, ICP disable/re-enable, and read-only lifecycle enforcement using unique synthetic clubs. The script passed syntax validation and intentionally was not run without an explicitly provisioned disposable registry canister ID.

## Disposable placement-registry canister — 2026-09-10

Restored temporary Rust 1.98.1 and ICP CLI 1.5.0 tools under `/tmp` and built `placement_registry.wasm`. On a separate managed PocketIC network bound to loopback port 4993, installed a fresh registry canister with the synthetic governor and ran `npm run test:placement-registry` with `PLACEMENT_HOST` and `PLACEMENT_ID`. The probe passed: AU Supabase-only and US ICP placements were writable, ICP disablement made the US placement non-writable, re-enabling restored backend availability, and `ReadOnly` state then blocked writes while preserving reads. The disposable network was stopped afterward. No production endpoint, canister, identity, credentials or data were used.

## Placement audit log — 2026-09-10

Added append-only stable-memory audit events to `placement_registry` for successful placement, policy, backend-availability, and lifecycle-state updates. Added bounded `list_audit` Candid access and regenerated local declarations. Rust tests and the locked release Wasm build pass; the local frontend suite remains at 13 Vitest tests with typecheck and isolation checks passing. A fresh disposable canister probe should be rerun after this contract change to verify audit pagination and event contents.

Added additive residency target and club-assignment records to `placement_registry`, including backend/profile matching, enabled-target checks, deployment class, versioning, and audit events. Regenerated Candid declarations and passed the Rust placement-registry test suite. The disposable probe has been extended to exercise target and residency assignment, but requires a fresh canister installation with the new Wasm before it can be rerun.

Added country-to-residency-profile allowlists and target health controls. `set_residency` now requires an allowed profile, an enabled target, a healthy target, and backend agreement with the club placement. Candid declarations regenerated; Rust tests and frontend typecheck/lab tests remain green. A fresh disposable probe with the latest Wasm is still required for live contract verification.

Added explicit operator roles to `placement_registry`: placement administration, migration operations, security policy, infrastructure targets, and read-only audit access. The bootstrap governor can grant or revoke roles; privileged updates now require the corresponding role while the governor remains compatible with synthetic probes. Candid declarations regenerated and Rust tests pass. A fresh live probe is required to validate non-governor positive and negative role cases.

Ran the full operator-role probe against a fresh disposable registry canister. Synthetic placement, security, infrastructure, and migration principals performed only their assigned operations; an outsider's policy update was rejected with `Forbidden`. The probe also confirmed residency decisions, backend disable/re-enable, read-only state, and 17 audit events. The disposable network was stopped afterward.

Added the authentication-origin and account-linking decision record in `docs/AUTH_ORIGIN_AND_ACCOUNT_MIGRATION.md` and a synthetic account-linking model. The model preserves a legacy Supabase UUID mapping, links multiple ICP principals to one application account, rejects duplicate principal ownership, enforces optimistic account versions, and protects the last linked credential. The lab suite now passes 15 Vitest tests with typecheck and isolation checks green. No real authentication origin or user identity is configured.

Added a synthetic durable timer queue model and tests for bounded claims, idempotent completion, retry scheduling, interruption recovery, and post-upgrade re-arming. The lab suite now passes 18 Vitest tests; typecheck and isolation checks pass. This is a contract-level timer proof only and does not execute reference Edge Functions or claim production scheduler behavior.

Added the Rust `timer_jobs` disposable canister and Candid contract. It builds as a Wasm canister and stores job/queue state in stable structures with bounded claims, idempotent completion, retries, interrupted-job recovery, and upgrade-state re-arming. `cargo test -p timer_jobs` passes; no external calls or production timer workflow is wired. Live Candid exercise remains the next timer validation gate.

## Timer-jobs Candid gate — 2026-09-11

Added `frontend/scripts/test-timer-jobs.mjs` and the `test:timer-jobs` package script. The gate exercises scheduling, arming, bounded claims, idempotent completion, retry timing, interrupted-job recovery, durable listing, and bigint-safe result reporting against a caller-selected canister. On a fresh disposable loopback network at port 4993, the gate passed against canister `4caro-hl777-77775-aaaba-cai`; the network was stopped afterward. The `timer_jobs` Wasm release build, Rust checks, syntax check, full lab tests (18 Vitest tests plus node suites), lab typecheck, isolation checks, and `git diff --check` pass. No production endpoint, canister, identity, credentials, or data was contacted.

Added `syntheticTimerWorkflow.ts` for the first queue consumer: club-link maintenance. It schedules one bounded job per club and processes claims through an injected synthetic handler, recording completion or retry without network/provider calls. Workflow tests cover batch limits, durable retry timing, and attempt increments. The lab suite now passes 20 Vitest tests with lab typecheck and diff checks green. This remains a synthetic workflow seam; it is not connected to production data or runtime configuration.

Added `timerJobsClient.ts`, a typed provider-neutral adapter for the Rust canister's Candid contract. It converts bigint timestamps, status variants, and optional errors, propagates canister errors, and has no endpoint or fallback. Adapter tests cover conversion and fail-closed errors; the lab suite now passes 22 Vitest tests with typecheck and diff checks green. The adapter remains outside the active runtime allowlist pending a dedicated local actor configuration.

Added `hybridTimerDispatcher.ts`, which routes scheduled jobs by the authoritative club placement and applies backend availability/country/write checks before dispatch. A synthetic test confirms Supabase routing and fail-closed behavior when that backend is disabled. The lab suite now passes 23 Vitest tests; typecheck, isolation, and diff checks remain green. No timer dispatcher is in the runtime allowlist.

Added `hybridTimerWorkflow.ts` for end-to-end synthetic club-link maintenance scheduling and processing through the placement-aware dispatcher. Integration tests cover the same workflow on ICP and Supabase placements plus backend disablement and read-only rejection. The lab suite now passes 25 Vitest tests; typecheck, isolation, and diff checks pass. This workflow remains outside the active runtime allowlist and uses synthetic provider slots only.

Added the synthetic Rust `notification_queue` canister and Candid contract. It stores durable notification records in stable memory, supports idempotent enqueue/acknowledgement, bounded claims, retry/failure state, and interruption recovery. The release Wasm build and Rust tests pass; generated bindings are isolated under the lab bindings directory. Email, push, credentials, and production data remain disconnected.

Added `test-notification-queue.mjs` and ran the notification queue Candid probe against a fresh disposable canister on loopback port 4996. Enqueue, bounded claim, acknowledgement, retry timing, and interrupted-job recovery passed; the network was stopped afterward. No production endpoint or data was contacted.

Added `notificationQueueClient.ts` and `hybridNotificationDispatcher.ts`. Notifications now have a typed Candid adapter and placement-aware enqueue/claim/acknowledge/fail seam with fail-closed backend policy enforcement. Synthetic tests cover routing and backend disablement; the lab suite passes 26 Vitest tests with typecheck, isolation, and diff checks green. External email/push delivery remains disconnected.

Added `hybridNotificationWorkflow.ts`, a synthetic delivery worker that claims notifications through placement routing, acknowledges successful injected delivery, and schedules retry on failure. Integration tests cover the retry-to-delivery path on an ICP placement. The lab suite now passes 27 Vitest tests; typecheck and diff checks pass. Delivery providers remain disabled.

Added `test-hybrid-notification-live.mjs`, a parameterized live probe for the real placement-registry and notification-queue canisters. It requires explicit disposable loopback IDs and routes a synthetic notification through the ICP placement; the Supabase slot is intentionally unavailable. Syntax, typecheck, isolation, and diff checks pass. Run it only after provisioning both disposable canisters and configuring the placement; no production target is accepted by the workflow documentation.

Completed `run-hybrid-notification-local.sh` self-provisioning orchestration. It creates an isolated temporary project, deploys both canisters, configures an active synthetic ICP club, runs the real hybrid probe, runs the placement disablement/read-only policy checks, preserves logs on failure, and cleans up successful runs. All targets are loopback-only and synthetic.

Provisioned both disposable canisters on loopback port 4997 and ran the live placement-registry probe with the notification canister as the synthetic ICP backend. AU Supabase-only and US ICP placements, residency, availability disable/re-enable, read-only enforcement, operator roles, and 17 audit events passed. The notification queue canister was installed and separately passed its live Candid probe. The combined live dispatcher probe remains a follow-up because the placement probe intentionally leaves the US club `ReadOnly`; all disposable state was stopped afterward.

Added `test-notification-upgrade.mjs` and `npm run test:notification-upgrade`. This two-phase disposable gate leaves a notification processing, upgrades the canister, then recovers, reclaims, and acknowledges it. Syntax, typecheck, isolation, and diff checks pass; run the two phases around an explicitly provisioned disposable upgrade before enabling any scheduler integration.

Ran the self-contained `run-notification-upgrade-local.sh` wrapper successfully. It bootstrapped the pinned ICP CLI, created a temporary loopback network on port 5010, installed and upgraded a fresh notification queue canister, and passed both before/after phases (`recovered, reclaimed, acknowledged`). Temporary state was cleaned up automatically. No production endpoint, canister, identity, credentials, or data was contacted.

Added the two-phase disposable `test-timer-upgrade.mjs` probe. It records a processing job before a canister upgrade, then verifies stable queue state, post-upgrade re-arming, interruption recovery, and the incremented retry attempt afterward. Syntax, lab tests (23 Vitest tests), typecheck, isolation, and diff checks pass. The probe requires an explicitly provisioned disposable canister for the upgrade command and does not accept production targets.

## Live timer upgrade probe — 2026-09-11

Ran the two-phase probe against a fresh disposable `timer_jobs` canister on loopback port 4995. Before upgrade, a job was left in `Processing` with an armed schedule. After upgrading the Wasm, the schedule remained armed, one interrupted job was recovered, and it was re-claimed with attempt count 2. The network was stopped afterward. No production endpoint, canister, identity, credentials, or data was contacted.

## Live timer adapter probe — 2026-09-11

Added `frontend/scripts/test-timer-client.mjs` and ran it against a fresh disposable `timer_jobs` canister on loopback port 4994. The probe called the typed adapter for schedule, claim, complete, and query operations and verified status, timestamp, attempt, and optional-field conversion. It passed and the network was stopped afterward. No production endpoint, canister, identity, credentials, or data was contacted.

Ran the expanded probe against a fresh placement-registry canister on a separate loopback network at port 4993. It registered AU and US residency policies and targets, assigned matching club residencies, verified active writable decisions, disabled and re-enabled ICP, moved the US assignment to `ReadOnly`, and confirmed 13 audit events. The disposable network was stopped after the run.

## Hybrid local ICP runtime slice — 2026-09-11

Updated the active lab hybrid screen so its Australia placement uses the synthetic in-memory Supabase-shaped provider while its USA placement resolves the configured local ICP canister from `/icp/api/v2/lab-config`. Editor and member sessions use separate signed synthetic ICP actors; the Supabase-shaped provider remains shared data for both identities. Missing local ICP configuration or an unknown configured canister fails closed without fixture fallback. Updated the browser probe to use the stable synthetic club ID rather than a stale hybrid-only ID.

Verified in this session:

- `cd frontend && npx vitest run --config vitest.lab.config.mjs --configLoader runner lab-tests/hybrid-adapter.test.tsx lab-tests/hybrid-integration.test.tsx`: 5 tests passed.
- `cd frontend && npm run typecheck:lab`: passed.
- `cd frontend && npm run check:isolation`: passed.
- `cd frontend && npm run build`: passed with the existing Browserslist, Tailwind ambiguity, and third-party `use client` warnings.
- `git diff --check`: passed after the implementation and documentation updates.

The full hybrid browser probe was not run in this slice because it requires a running disposable local ICP canister and browser runtime. No production endpoint, canister, identity, credential, or data was used.

## Hybrid continuation — 2026-09-11

Ran the self-provisioning hybrid notification wrapper on loopback port 5003. Fresh placement-registry and notification-queue canisters passed residency, backend availability, lifecycle, operator, audit, and routed notification delivery checks. The wrapper cleaned up the disposable network.

Ran the full synthetic recovery probe. Complete snapshots restored to a fresh canister, upgrade state and receipt replay reconciled, and two stop/start recovery cycles passed. The test network ended stopped with a verified full snapshot.

Started the owned local Vite server and recovered the project-local ICP canister from its saved snapshot. The real Chromium hybrid browser probe passed AU synthetic Supabase routing, USA local ICP routing, CRUD isolation, and zero external requests. Vite and the ICP network were stopped afterward; loopback port 4943 was verified free.

Expanded synthetic provider and account-linking coverage: migration reads remain explicitly read-permitted, blocked writes fail closed, disposal invalidates the provider identity, unknown environments are rejected, provider errors do not fall back, and revocation requires a linked acting principal with an expected account version. The focused suite passed 7 tests.

The complete dedicated lab suite passed 32 Vitest tests and 8 Node tests. `npm run check:isolation`, `npm run typecheck:lab`, `npm run build`, `cargo test --locked`, `cargo build --locked --release --target wasm32-unknown-unknown`, and `git diff --check` passed. Existing Browserslist, Tailwind ambiguity, and third-party `use client` build warnings remain. These checks use synthetic loopback resources only and do not establish production RLS parity, production identity migration, capacity, or network isolation.

## Current parity gate rerun — 2026-09-12

Topology, parity-matrix, and parity-evidence checks all pass: 11 logical roles, 10 external boundaries, 8 non-control parity rows, and 10 executable probes indexed. The current lab suite passes 40 Vitest tests across 19 files plus 8 Node tests; lab typecheck, isolation checks, and diff checks pass. These are structural and synthetic evidence gates; they do not promote the domain rows to production parity.

## Motoko media metadata authorization slice — 2026-09-13

Restricted `media_metadata.get_asset` to the asset owner or governor, returning no metadata to unrelated callers. Added the owner-positive and outsider-negative checks to `frontend/scripts/test-product-motoko-canisters.mjs`. `mops check` for the canister, both affected probe syntax checks, the dedicated lab suite (22 files, 63 tests), topology, parity, parity-evidence, isolation, lab typecheck, and `git diff --check` passed. The live Motoko product probe was not run because this session had no four-canister disposable ID configuration. This slice does not establish production media RLS parity.

## Identity erasure parity slice - 2026-09-13

Added the fail-closed `identity_access.erase_account` update. An account owner
or governor may erase an account, while the governor account itself cannot be
erased. The operation removes the account's roles, family links, exclusions,
external site bindings, privacy consents, and pending link challenges, without
touching other accounts. The Candid declaration and local binding were
regenerated. The identity Rust suite passes 6 tests, and the live disposable
probe passed independent account registration, complete erasure cleanup,
post-erasure authentication denial, pending challenge cleanup, and governor
account protection. Topology, parity, parity-evidence, lab typecheck,
isolation, and diff checks pass. Profile privacy, recovery, and the complete
source helper matrix remain outstanding. The disposable network was stopped;
no production identity, credential, or data was used.

## Club/team authorization parity slice - 2026-09-13

Hardened `backend/club_domain` so club creation rejects invalid and duplicate
IDs, team creation requires a club manager and validates ownership, role grants
reject unknown or cross-club teams and duplicate assignments, and member/team
reads remain scoped to the owning club. The focused Rust suite passes 4 tests,
including cross-club injection rejection and scoped member access. The parity
row remains partial pending complete source membership/exclusion coverage,
pagination, and a live Rust domain probe. No production data or credentials
were used.

## Competition join-token parity slice - 2026-09-13

Closed an authorization bypass in `CompetitionDomain::create_join_token` that
allowed any authenticated caller to create a token for a valid competition.
Creation now requires the governor, competition administrator, or club
administrator scoped to that competition; invalid expiry values and duplicate
role grants are rejected. The focused competition Rust suite passes 3 tests,
including outsider denial and replay protection. Officials, participants,
archive mutation parity, full competition RLS, and a live Rust domain probe
remain outstanding. No production data or credentials were used.

## Events revision parity slice - 2026-09-13

Added `EventDomain::update_event_if_revision`, requiring callers to submit the
revision they read before an event update is accepted. A stale update is
rejected without mutating the newer title, description, time window, or
revision; the existing compatibility update path now uses the same fencing.
The focused events Rust suite passes 3 tests. Guardian/child visibility,
timer callback capabilities, complete event RLS, and scale/pagination remain
outstanding. No production data or credentials were used.

## Messaging blocked-user parity slice - 2026-09-13

Added directional block records to `backend/messaging_domain` and enforce them
when a participant sends into a conversation. A blocked sender is rejected
until the blocker removes the block; anonymous and self-block operations are
also rejected. The focused messaging Rust suite passes 4 tests. Groups/DMs,
reactions, replies, polls, moderation, retention, scale, and a live Rust
domain probe remain outstanding. No production data or credentials were used.

## Media capability expiry parity slice - 2026-09-13

Added explicit delegated capability holders to `backend/media_metadata` and a
time-aware `can_view_asset_at` boundary. Capability issuance now rejects
anonymous holders, empty action/scope values, and zero expiry; expired view
capabilities are denied while valid delegated capabilities remain usable.
Deletion continues to revoke all capabilities for the asset. The focused media
Rust suite passes 3 tests. Album/uploader/commenter/guardian parity, external
bytes/chunks/scanning/moderation, and a live Rust domain probe remain open. No
production data or credentials were used.

## Notification worker scope parity slice - 2026-09-13

Added scoped worker capabilities to `backend/notification_queue`. Governor
grants can now be limited to a notification domain scope, and claims skip jobs
outside that scope; existing wildcard worker grants remain compatible. Empty
worker scopes are rejected. The focused notification Rust suite passes 4 tests
with no warnings. Recipient/preferences parity, leases, dead-letter behavior,
provider delivery, and production worker integration remain outstanding. No
production data, credentials, or delivery provider was used.

## Timer worker scope parity slice - 2026-09-13

Added scoped worker capabilities to `backend/timer_jobs`. Governor grants can
now be limited to a timer domain scope, and claims skip jobs outside that scope;
existing wildcard grants remain compatible. Empty scopes are rejected. The
focused timer Rust suite passes 4 tests. Domain callback capabilities, leases,
dead letters, and workflow idempotency parity remain outstanding. No
production data, credentials, or scheduler integration was used.

## Timer lease and dead-letter parity slice - 2026-09-13

Added bounded processing leases to `backend/timer_jobs`. Claims now record a
lease expiry, completion and retry clear it, and authorized recovery returns
expired jobs to `Pending` until the fifth attempt, after which the job becomes
terminal `Failed` with a durable exhaustion error. Zero claim limits and zero
lease durations fail closed. The focused timer Rust suite passes 8 integration
tests. Live callback/lease probing remains open.
No production data, credentials, or scheduler integration was used.

## Timer live-service boundary slice - 2026-09-13

Restored the `timer_jobs` Candid-facing adapter over the tested queue model and
expanded the contract with callback principals, lease expiry, scoped worker and
callback grants, lease-aware claims, expired-lease recovery, and callback-aware
idempotent scheduling. Regenerated the timer bindings. The workspace tests (46
total), release Wasm build, topology, parity, parity-evidence, lab typecheck,
isolation, and diff checks pass. The live callback/lease probe could not run:
port 4943 is occupied by a loopback network owned by another project process,
so no network was stopped or reused. The adapter currently remains a lab
boundary; the live callback/lease upgrade probe is still required before any
live enablement claim.

## Timer stable-memory persistence slice - 2026-09-13

Replaced the timer canister adapter's process-local queue/state storage with a
single serialized stable-memory record containing the queue, callback grants,
worker scopes, jobs, lease timestamps, and armed state. `post_upgrade` restores
the record into the adapter cache, while completion, retry, scheduling, and
arming persist updates back to stable memory. Workspace tests, release Wasm,
topology/parity/evidence checks, lab typecheck, isolation, timer upgrade probe
syntax, and diff checks pass. A live two-phase upgrade probe remains blocked by
the loopback network currently owned by another project process; it was not
stopped or reused. No production endpoint, identity, credential, or data was
used.

## Timer stable-memory live upgrade proof - 2026-09-13

Provisioned a fresh timer canister on the repository-owned loopback network at
port 5021, left one callback-compatible job in `Processing` with an armed
schedule, upgraded the canister in place, and reran the after-upgrade probe.
The armed state survived, exactly one interrupted job was recovered, and it was
reclaimed with attempt count 2. The first attempt used a contaminated canister
and correctly recovered two jobs; the network was reset and the clean probe
passed. The disposable network was stopped afterward. No production endpoint,
identity, credential, or data was used.

## Timer callback capability parity slice - 2026-09-13

Added explicit callback capabilities to `backend/timer_jobs`. A callback-bound
job now requires a governor-approved callback principal for the same timer
scope, and cross-domain callback scheduling is rejected. Legacy jobs without a
callback remain compatible. The focused timer Rust suite passes 6 integration
tests. Lease expiry, dead letters, and a live callback-capability probe remain
open. No production data, credentials, or scheduler integration was used.

## Motoko team-message deletion authorization slice - 2026-09-15

Mapped the inert source `team_messages` deletion policy to the local Motoko
canister: an author, team-scoped `team_admin` or `coach`, club-scoped
`club_admin`, or global `app_admin` may delete a team message. Governor-only
role grants reject anonymous principals, unsupported roles, and invalid role
scopes. The new stable role state is initialized with a forward-only Motoko
migration; Candid declarations and local bindings were regenerated.

`mops check --fix`, `mops build`, and the local product-probe syntax check

passed. The live four-canister probe was not run because its disposable synthetic ID configuration was unavailable.
## Motoko team-message update authorization slice - 2026-09-15

Mapped the inert source `team_messages` update policy to the local Motoko
canister. `update_message` accepts only the author of a message attached to a
team conversation, validates the bounded replacement body, and preserves its
identity, conversation, sender, sequence, and idempotency key. Moderation
roles deliberately do not confer edit authority. `mops check --fix`, `mops
build`, and product-probe syntax checks pass. The local-only product probe now
checks author success, immutable-field preservation, outsider and team-admin
denial, and non-team-conversation rejection. The live four-canister probe was
not run because its disposable synthetic ID configuration was unavailable.

## Motoko team-message read authorization slice - 2026-09-15

Mapped the inert source `team_messages` SELECT policy to the local Motoko
canister. `list_messages` and `list_messages_page` now permit local
conversation participants, club-scoped `club_admin`, and global `app_admin`
only when the conversation is team-scoped. The local product probe covers
club-admin and app-admin positive reads plus cross-club and non-team denial.
Unread state, receipts, sends, and edits remain participant- or
author-scoped; this slice does not infer source team membership from roles or
expand administrator authority for those separate behaviors.

`mops check --fix`, `mops build`, and the local product-probe syntax check
passed. The dedicated lab suite also passed: 9 Node tests, 31 Vitest files /
181 tests, lab typecheck, isolation check, production build, and the fresh
loopback Vite server smoke test. The live four-canister probe was not run because its disposable synthetic ID configuration was unavailable.

## Club-domain team ownership validation slice - 2026-09-15

Hardened the local `club_domain` create-team path so a caller with club
management authority cannot create an orphan team for an unknown club. This
enforces the roadmap's same-club relationship validation before a `Team` is
stored, and preserves authorization-first ordering so unauthorized callers do
not receive club-existence details. The focused regression test proves even
the local governor cannot create a team for a missing club.

`cargo test --locked` passed 5 unit tests and `cargo build --locked --release`
passed. This is a bounded local write-integrity result, not evidence of
complete source `teams` lifecycle, role, exclusion, pagination, or live Rust
canister parity.

The dedicated lab suite passed: 9 Node tests, 31 Vitest files / 181 tests,
lab typecheck, isolation check, production build, and fresh loopback Vite
server smoke test.

## Club-domain membership read-scope validation slice - 2026-09-15

Mapped the local club-domain read predicates to the inert `is_club_member` and
`is_team_member` helpers. A local role grant for the club now confers club
read access, including a grant scoped to a team belonging to that club. Team
read access requires an exact matching team scope; a club-level `member` grant
does not disclose every team. Focused regressions cover both directions and
the existing cross-club negative cases remain green.

`cargo test --locked` passed 5 unit tests and `cargo build --locked --release`
passed. Parent/guardian-derived membership and team/club exclusion precedence
remain outside this small local model, so this does not establish complete
source membership or RLS parity. The full lab suite and loopback smoke result
will be recorded only after those checks run.

The dedicated lab suite passed: 9 Node tests, 31 Vitest files / 181 tests,
lab typecheck, isolation check, production build, and fresh loopback Vite
server smoke test.

## Club-domain administrative role validation slice - 2026-09-15

Mapped local club-management authority to the inert `is_club_admin` helper,
which recognizes only a global `app_admin` analogue or a matching
`club_admin` role. The local governor remains the global administrative
authority; a role grant labelled `owner` no longer grants club-wide management
authority. The focused regression proves that such a grant cannot create a
team, while a matching `club_admin` can.

`cargo test --locked` passed 5 unit tests and `cargo build --locked --release`
passed. This is a bounded local authorization correction, not evidence of
complete source role-management, membership, exclusion, lifecycle, pagination,
or live Rust canister parity. The full lab suite and loopback smoke result will
be recorded only after those checks run.

The dedicated lab suite passed: 9 Node tests, 31 Vitest files / 181 tests,
lab typecheck, isolation check, production build, and fresh loopback Vite
server smoke test.

## Club-domain bounded input and role-target validation slice - 2026-09-15

Applied the existing local identity-access 128-byte nonblank identifier
convention to each persisted `club_domain` club, team, and role field. The
write paths now reject blank or oversized fields before storing them, and
`grant_role` rejects the anonymous principal as a role recipient. Authorization
is deliberately evaluated first so unauthorized callers do not receive field-
or club-existence details. Focused regressions cover oversized club/team
fields plus anonymous, blank-role, and oversized role/team-scope grants.

`cargo test --locked` passed 7 unit tests and `cargo build --locked --release`
passed. This bounded local validation does not add collection quotas, direct
parent/guardian membership, exclusions, source-complete role lifecycle, or
stable-memory/live-canister parity. The full lab suite and loopback smoke
result will be recorded only after those checks run.

The dedicated lab suite passed: 9 Node tests, 31 Vitest files / 181 tests,
lab typecheck, isolation check, production build, and fresh loopback Vite
server smoke test.

## Imported Club Links baseline adaptation - 2026-09-16

Inspected the inert `docs/ignite-all-refactoring-icp-export.bundle` and
adapted only the useful `tests/local-supabase/club-links-rls.test.ts` baseline
into the lab. The new provider-neutral test covers active-only member reads,
inactive administrator reads, direct inactive reads, and cross-club isolation
through both explicit local Supabase placement and the local ICP provider
placement. It also proves a failed ICP provider does not invoke or silently
fall back to Supabase. The old Supabase SDK fixture, migrations, credentials,
remote targets, and unported application modules remain disconnected.

## Imported route-scope baseline adaptation - 2026-09-16

Adapted the inert bundle's provider-neutral `src/test/routeClubScope.test.ts`
into the dedicated lab suite. The test preserves direct, lookup, DM, and
unscoped route cases and extends coverage for current embedded Club Links,
media, competition membership, query/fragment normalization, and creation
routes. Route scope is resolved before backend selection, so this slice
deliberately does not duplicate Supabase/ICP provider-mode assertions; those
remain covered by the preceding Club Links hybrid baseline.

## Imported coverage-loss auth baseline adaptation - 2026-09-16

Adapted the provider-neutral auth-classification portion of the bundle's
`src/test/clubThemeCoverageLoss.guard.test.ts`. The lab test preserves the
transient network/offline versus permanent session-error distinction without
importing the old Supabase client mock, theme components, migrations, or
application modules. The empty-list guard itself remains disconnected because
its current source implementation directly depends on the legacy Supabase
client and is not part of the lab runtime allowlist.

## Imported invite signup hand-off baseline adaptation - 2026-09-16

Adapted the bundle's provider-neutral `src/lib/inviteSignupHandoff.test.ts`
into the dedicated lab suite. The test protects URL-carried signup mode,
invite and redirect intent, legacy redirect compatibility, off-origin
rejection, and unknown-mode handling. This contract is evaluated before
backend selection, so explicit Supabase/ICP routing assertions are not
applicable; no provider or runtime allowlist surface was changed.

## Imported notification lifecycle baseline adaptation - 2026-09-16

Adapted the useful provider-neutral behavior from the bundle's
`tests/local-supabase/notification-lifecycle-journey.test.ts` into the hybrid
notification queue boundary. The lab test covers idempotent enqueue, per-club
placement isolation, claim/acknowledge lifecycle, and explicit Supabase and ICP
provider selection. It also proves an ICP provider failure is surfaced without
calling or falling back to Supabase. The legacy Supabase SDK fixture,
database schema, preference tables, and migration harness remain disconnected.

## Imported messaging security baseline adaptation - 2026-09-16

Adapted the provider-neutral club/thread isolation semantics from the bundle's
messaging security baseline into the hybrid message router. The lab regression
uses independent synthetic stores for two clubs, runs it through explicit
Supabase and ICP placements, verifies provider selection and cross-club
isolation, and proves an ICP provider failure does not invoke or fall back to
Supabase. The legacy multi-table Supabase RLS fixture and chat schema remain
disconnected.

## Imported notification club-switch pin baseline adaptation - 2026-09-16

Adapted the provider-neutral session-storage portion of the bundle's
`notificationClubSwitchPin.guard.test.ts`. The lab regression covers pin
round-tripping, stale-pin expiry, explicit clearing, and the `ignite_` cache
namespace. Backend-mode assertions are intentionally not applicable because
this helper runs before provider routing; the bundle's Supabase-backed club
resolution, native handler, and provider bootstrap guards remain disconnected.

## Imported media storage baseline adaptation - 2026-09-16

Adapted the club isolation and media lifecycle behavior from the bundle's
Supabase RPC and Storage journeys into the existing hybrid media router. The
lab regression uses independent synthetic stores for two clubs, runs through
explicit Supabase and ICP placements, verifies selected-provider calls,
removal isolation, and proves an ICP provider failure is surfaced without a
Supabase fallback. The bundle's Supabase Storage SDK, RPC, schema, and fixture
harness remain disconnected.

## Imported pitch timer concurrency baseline adaptation - 2026-09-16

Adapted the durable scheduling, per-club isolation, idempotency, retry timing,
and failure semantics from the bundle's pitch-timer concurrency journey into
the hybrid timer dispatcher. The lab regression runs through explicit
Supabase and ICP placements with separate synthetic queues and proves an ICP
provider failure does not invoke or fall back to Supabase. The original Edge
Function, Supabase RPC, active-game schema, and local Supabase harness remain
disconnected.

## Imported competition lifecycle baseline adaptation - 2026-09-16

Adapted the organizer/invitation/acceptance lifecycle from the bundle's
competition journey into a synthetic provider-routed contract test using the
existing authoritative placement resolver. The lab regression covers explicit
Supabase and ICP modes, organizer authorization, cross-club visibility,
duplicate invitation rejection, invited-team acceptance, activation authority,
and ICP failure without Supabase fallback. The bundle's Supabase fixture,
RPCs, migrations, and old application modules remain disconnected.

## Imported event lifecycle baseline adaptation - 2026-09-16

Adapted the creation, attendance, editing, cancellation, and cross-club
visibility behavior from the bundle's event lifecycle journey into a
synthetic provider-routed contract test. The lab regression covers explicit
Supabase and ICP modes, member/admin authorization, RSVP isolation, provider
selection, and ICP failure without Supabase fallback. The bundle's Supabase
event/RLS fixture, RPCs, migrations, and old application modules remain
disconnected.

## Imported club-wide RSVP baseline adaptation - 2026-09-16

Adapted the bundle's club-wide game RSVP grouping behavior into a synthetic
provider-routed contract test. The lab regression covers explicit Supabase and
ICP modes, admin/committee authorization, grouping validation, target-team
club boundaries, cross-club visibility, provider selection, and ICP failure
without Supabase fallback. The original Supabase event schema, RLS fixture,
RPCs, and migration harness remain disconnected.

## Imported entitlement transition baseline adaptation - 2026-09-16

Adapted the exact-club Free/Pro transition behavior from the bundle's
entitlement journey into a synthetic provider-routed contract test. The lab
regression covers explicit Supabase and ICP modes, activation, expiry,
administrator override, exact-club isolation, membership removal, provider
selection, and ICP failure without Supabase fallback. The original Supabase
subscription RPCs, schema, fixture, and migration harness remain disconnected.

## Imported parent invite atomic baseline adaptation - 2026-09-16

Adapted the atomic parent-invite acceptance contract from the bundle's
Supabase RPC journey into a synthetic provider-routed test. The lab regression
covers explicit Supabase and ICP modes, multi-child provisioning, recipient
authorization, idempotent repeated acceptance, team membership creation,
cross-club isolation, provider selection, and ICP failure without Supabase
fallback. The original invite RPCs, triggers, schema, and fixture harness
remain disconnected.

## Imported concurrent guardian invite baseline adaptation - 2026-09-16

Adapted the concurrent guardian-invite acceptance behavior from the bundle's
Supabase transaction journey into a synthetic provider-routed test. The lab
regression covers explicit Supabase and ICP modes, exactly-one concurrent
acceptance winner, unauthorized recipient rejection, invalid-child rollback,
guardian relationship uniqueness, cross-club isolation, provider selection,
and ICP failure without Supabase fallback. The original invite RPCs, schema,
Realtime harness, and fixture remain disconnected.

## Imported event scope validation helper - 2026-09-16

Adapted the bundle's provider-neutral `validateEventTeamClubScope` helper into
the existing local events service boundary. The guard permits club-wide events,
accepts a same-club team, and fails closed for an unavailable team list or a
team belonging to another club. The local ICP adapter can opt into the guard
before its actor call, while the provider-routed event contract exercises the
same helper in explicit Supabase and ICP modes. The helper performs no provider
or Supabase calls; selected-provider authorization remains authoritative.
No runtime allowlist expansion was required, and the bundle's event pages,
schema, RPCs, migrations, and Supabase harness remain disconnected.

## Imported hybrid invite email deduplication service - 2026-09-16

Adapted the bundle's refactored invite-email deduplication helper into
`hybridInviteDedupe.ts`. Its local email validation, normalization, strict
untrusted-response parsing, and privacy-preserving no-match behavior are
preserved, while the direct Supabase RPC edge is replaced with a cached client
selected by the authoritative club placement. The synthetic contract covers
explicit Supabase and ICP routing, provider-client reuse, scope forwarding,
malformed provider data, malformed-email short-circuiting, and ICP failure
without Supabase fallback. Provider failures are surfaced rather than silently
converted into a no-match result, so an unavailable ICP backend remains
fail-closed. No runtime allowlist expansion was required; the original RPC,
schema, migration, and Supabase mock remain disconnected.

## Imported hybrid event-series deletion service - 2026-09-16

Adapted the bundle's refactored event deletion primitive into
`hybridEventDeletion.ts`. The child-before-root ordering, single-event
isolation, zero-row confirmation, and partial-series outcome are preserved
behind provider-neutral delete operations. Provider selection now follows the
authoritative club placement and requires a writable placement; explicit ICP
provider failures surface directly without Supabase fallback. Synthetic
coverage exercises both Supabase and ICP modes, denial ordering, partial
deletion reporting, zero-row failure, and provider selection. The original
Supabase client, schema, migrations, and page callers remain disconnected;
no runtime allowlist expansion was required.

## Imported hybrid club-scope lookup service - 2026-09-16

Adapted the bundle's refactored `clubScopeLookup` helper into
`hybridClubScopeLookup.ts`. It preserves direct club ownership resolution and
the nullable `club_id` team-to-club fallback used by route guards and
notification-driven switching, while replacing the direct Supabase client with
an explicit provider selected by the supplied club placement. Synthetic
coverage exercises Supabase and ICP modes, provider reuse, direct and team
fallback lookup, table-specific fallback exclusion, malformed-row handling,
and ICP failure without Supabase fallback. Provider errors remain visible;
the service does not guess a club on malformed data. No runtime allowlist
expansion was required, and the original Supabase helper/callers remain
disconnected.

## Imported event audience helper - 2026-09-16

Adapted the bundle's provider-neutral `eventAudience` helper into the active
lab event domain. It centralizes single-team precedence, targeted-team
selection, genuinely club-wide events, mini-league detection, and stable
target-team cache keys. The helper performs no provider or Supabase calls and
runs before backend selection, so explicit Supabase/ICP routing assertions do
not apply; its tests document that provider-neutral boundary. No runtime
allowlist expansion was required, and the bundle's legacy event callers,
schema, RPCs, and migration harness remain disconnected.

## Imported competition scheduler helper - 2026-09-16

Adapted the pure scheduling primitives from the bundle's refactored
`competitionScheduler`: deterministic circle-method round-robin pairings,
home/away alternation, bye handling, date-key formatting, frequency
advancement, allowed-weekday navigation, shared-pitch calendar packing,
occupied-slot avoidance, per-round overrides, overflow/unscheduled reporting,
time parsing, and finals seed placement. This slice has no provider edge and
runs before backend selection, so Supabase/ICP routing assertions are not
applicable. Focused tests preserve deterministic calendar behavior without
mutating caller-owned occupied slots. Legacy competition page callers remain
disconnected; no runtime allowlist expansion was required.

## Imported hybrid club/team metadata cache - 2026-09-16

Adapted the bundle's refactored `clubTeamCache` behavior into
`hybridClubTeamCache.ts`: TTL-based club/team entries, batch hit/miss
partitioning, provider-backed miss hydration, explicit invalidation, and
backend-client reuse. Misses are routed by authoritative placement in
explicit Supabase or ICP mode; an ICP provider failure is surfaced without
Supabase fallback. The lab intentionally keeps this cache in memory rather
than importing the bundle's global localStorage persistence until authenticated
identity scoping is proven. Tests cover both provider modes, expiry, cache
reuse, batch behavior, invalidation, and fail-closed ICP routing. No runtime
allowlist expansion was required.

## Club-domain collection quota validation slice - 2026-09-15

Bounded the local `club_domain` collections at the established local control-
plane scales: 10,000 clubs and 100,000 teams or role grants. Valid writes now
return a deterministic quota error before growing a saturated collection.
Duplicate detection remains before quota evaluation, preserving the existing
duplicate result for a replayed record even when the collection is full. The
focused saturation regression verifies each limit rejects the next valid write
without modifying its collection.

`cargo test --locked` passed 8 unit tests and `cargo build --locked --release`
passed. The local domain has no public enumeration API, per-actor allocation
accounting, stable-memory backing, or source-complete club/team lifecycle, so
these caps are bounded POC storage behavior rather than capacity or production
resource evidence. The full lab suite and loopback smoke result will be
recorded only after those checks run.

The dedicated lab suite passed: 9 Node tests, 31 Vitest files / 181 tests,
lab typecheck, isolation check, production build, and fresh loopback Vite
server smoke test.

## Identity exact-team membership validation slice - 2026-09-15

Mapped `identity_access` team membership to the inert `is_team_member` helper:
an exact team-scoped direct role establishes membership regardless of its role
label. The scoped query no longer treats a global `app_admin` role as team
membership; it remains separately exposed as global administrative authority.
The focused regression proves a `player` role is recognized only for its exact
team and site, while a global app administrator is not misreported as a team
member. The typed client now also forwards its public `site`, `club`, and `team` parameters to `grant_role_scoped` in the generated Candid order.
Existing exclusion and limited guardian handling remain unchanged.

`cargo test --locked` passed 7 unit tests and `cargo build --locked --release`
passed. This is a bounded source-helper correction, not evidence of complete
team/club relationship validation, parent/guardian assignment parity,
exclusion-trigger parity, source role lifecycle, or production RLS parity.
The full lab suite and loopback smoke result will be recorded only after those
checks run.

The dedicated lab suite passed: 9 Node tests, 31 Vitest files / 181 tests,
lab typecheck, isolation check, production build, and fresh loopback Vite
server smoke test.

## Imported event cache-refresh helper - 2026-09-16

Adapted the bundle's refactored `eventQueryKeys` cache-key factory into
`eventQueryKeys.ts` and ported the `eventCacheRefresh` orchestrator that
consumes it. The source baseline duplicated hand-written literal React
Query key arrays across the create/edit/detail event pages; a typo in one
array silently broke that surface's cache invalidation. The bundle's refactor
replaced every literal key with one canonical factory so every caller
invalidates the same cache identities. The orchestrator's two local
snapshot-clearing dependencies (`scheduleCache.ts`'s events-list cache and
`nextUpEventsCache.ts`'s home-carousel cache) were ported unchanged alongside
it so the adaptation is complete and directly testable, not partially wired.

This slice has no provider or Supabase/ICP edge — it only coordinates React
Query invalidation and localStorage snapshot clearing, so explicit
Supabase/ICP routing assertions do not apply; focused tests instead cover the
canonical key identities, exact React Query invalidation calls (including
omitting the per-user key for an anonymous caller), and that clearing one
user's persisted schedule/next-up snapshots leaves another user's entries
untouched. The bundle's legacy event page callers, schema, RPCs, and
migration harness remain disconnected; no runtime allowlist expansion was
required, and `tsconfig.lab.json` was extended to typecheck the four new
files.

`npm test` passed 9 Node tests and 53 Vitest files / 272 tests (5 new).
`npm run typecheck:lab`, `npm run check:isolation`, `npm run
check:prod-secrets`, and `npm run build` all passed.

## Imported hybrid event RSVP repository - 2026-09-16

Adapted the bundle's refactored `eventRsvpRepository` into
`hybridEventRsvpRepository.ts`. The source baseline took a raw
Supabase-shaped `client: any` and read the authoritative RSVP rows for an
event, then enriched them with display-only adult profile and child
information; enrichment relied on Postgrest's non-throwing `{ data, error }`
convention to stay best effort. The lab replaces the direct client with an
`EventRsvpProvider` boundary selected by the club's authoritative placement,
matching every other hybrid service in this domain. Because the provider
boundary uses throwing async methods, enrichment failures are now caught
explicitly rather than depending on a non-throwing client convention — the
authoritative RSVP read still fails closed and propagates, while profile and
child lookups remain best effort so valid attendance rows are never dropped.
An ICP provider failure surfaces directly with no Supabase fallback, and an
unavailable/disabled backend placement is reported by reason with no
fallback either. Synthetic coverage exercises both explicit Supabase and ICP
modes, provider-client reuse, the RSVP fail-closed contract, best-effort
profile/child enrichment failure, ICP-provider failure without fallback, and
disabled-backend placement failure. The bundle's raw Postgrest client,
underlying tables/RPCs, and legacy event-detail page caller remain
disconnected; no runtime allowlist expansion was required, and
`tsconfig.lab.json` was extended to typecheck the new file.

`npm test` passed 9 Node tests and 54 Vitest files / 279 tests (7 new).
`npm run typecheck:lab`, `npm run check:isolation`, `npm run
check:prod-secrets`, and `npm run build` all passed.

## Follow-up: surfaced RSVP enrichment failures instead of catch-and-ignore - 2026-09-16

The initial `hybridEventRsvpRepository` pass above caught profile/child
enrichment errors with an empty `catch {}`, which discarded the failure
entirely rather than surfacing it — conflicting with this repository's
no-silent-failure expectation, even though the underlying "keep authoritative
rows visible" behavior was correct. `fetchEventRsvps` now returns
`{ rows, profilesEnrichment, childrenEnrichment }`, where each enrichment
field is an inspectable `EnrichmentOutcome` (`'skipped' | 'ok' | { status:
'unavailable'; error }`) instead of a bare row array. A caller can now detect
and surface a "some names/children could not be loaded" notice explicitly;
the two lookups are tracked independently so a child-lookup failure is never
misattributed as a profile failure or vice versa. The authoritative RSVP
read is unchanged: it still fails closed and propagates directly, and is
never treated as a fallback path. No hybrid/provider routing or no-fallback
boundary changed — placement resolution, provider-client reuse, and the
explicit-mode/no-Supabase-fallback-in-ICP-mode contracts are identical to the
prior pass.

Added three regression cases (skipped enrichment with no rows needing it,
independently-reported profile-only and child-only failures, and both
lookups failing independently) alongside the existing coverage, and updated
the existing assertions to read the new typed result shape.

`npm test` passed 9 Node tests and 54 Vitest files / 281 tests (2 net new).
`npm run typecheck:lab`, `npm run check:isolation`, `npm run
check:prod-secrets`, and `npm run build` all passed. No other lab file
references the changed return shape; the unrelated `refetchRsvps` symbols in
the unported `EventDetailPage.tsx` / `EventGroupsManager.tsx` React Query
callers are a different, unrelated identifier and remain outside the runtime
allowlist.

## Imported chat message ordering + thread cache hydration - 2026-09-16

Ported `src/features/messaging/thread/chatMessageOrdering.ts` and
`src/features/messaging/thread/chatThreadCacheHydration.ts` from the bundle's
`integration/all-refactoring-icp-export` branch to
`frontend/src/lab/chatMessageOrdering.ts` and
`frontend/src/lab/chatThreadCacheHydration.ts` unchanged: pure functions for
chronological message ordering/merging
(`orderChatMessagesChronologically`, `mergeOlderChatMessagesChronologically`,
`prependStrictlyOlderChatMessages`) and cold-start cache-hydration decisions
(`mergeCachedChatMessagesChronologically`,
`selectHistoryChatPlaceholderSource`). This is the refactor that centralizes
logic the sanitized source currently duplicates verbatim across
`ClubChatPage.tsx`, `GroupChatPage.tsx`, and `TeamChatPage.tsx` (the same
`created_at`/`id.localeCompare` sort comparator appears 5-6 times per page).

This module is genuinely provider-neutral and pre-routing: it never touches
Supabase or ICP, only orders/merges message rows a caller has already
fetched, so no `resolveClubBackend` hybridization was needed or added, and no
Supabase/ICP-mode split applies. Tests exercise the pure contract directly
(ordering, id tie-breaking, invalid-timestamp fallback, non-mutation of
inputs, cache/query merge precedence, and all five placeholder-source
branches) in
`frontend/lab-tests/imported-chat-thread-cache-hydration-baseline.test.tsx`
(19 tests). `tsconfig.lab.json` was extended to typecheck both new files; no
runtime allowlist expansion was made or needed since neither file is wired
into `LabApp.tsx` or any consumer.

`npm test` passed 9 Node tests and 55 Vitest files / 300 tests (19 new).
`npm run typecheck:lab`, `npm run check:isolation`, `npm run
check:prod-secrets`, and `npm run build` all passed. The bundle's chat
pages/components, Realtime subscriptions, and every other chat/message
hook/lib file remain disconnected and untouched.

## Imported notification query-key and optimistic cache policy - 2026-09-16

Ported `src/features/notifications/queryKeys.ts` and
`src/features/notifications/cachePolicy.ts` from the bundle's
`integration/all-refactoring-icp-export` branch, unchanged, to
`frontend/src/lab/notificationQueryKeys.ts` and
`frontend/src/lab/notificationCachePolicy.ts`: a canonical
`notificationKeys` cache-key factory plus `snapshotAndUpdateQueries` /
`restoreQuerySnapshots` / `beginNotificationListUpdate` /
`invalidateNotificationSurfaces` optimistic-update helpers.

This centralizes logic the sanitized source currently duplicates as raw
string-literal query keys: `useAuth.tsx` repeats the same four/five-key
`invalidateQueries` block three separate times (post-sign-in, token
refresh, sign-out), `NotificationsPage.tsx` repeats an overlapping set
again for its own mark-read/clear flows, and `useNativePush.ts` /
`useGroupChatUnreadCache.ts` each hardcode the `unread-message-counts` /
`chat-group-unread-cache` key literals independently. A typo or an
added/removed invalidation target in any one of these call sites would
silently diverge from the others; a shared factory plus the
snapshot/restore pair (which several of these call sites reimplement ad
hoc for optimistic mark-as-read) removes that duplication and gives every
caller the same rollback-safe contract.

Like the previously ported `eventQueryKeys.ts` / `eventCacheRefresh.ts`
and `chatMessageOrdering.ts` / `chatThreadCacheHydration.ts`, this module
is genuinely provider-neutral and pre-routing: it only reads/writes an
in-memory React Query cache and never touches Supabase or ICP, so no
`resolveClubBackend` hybridization applies and none was added. Both
`gameNotificationRepository.ts`, `membershipNotificationRepository.ts`,
and `notificationRepository.ts` (the bundle's actual Supabase-backed
notification read/write repositories) remain out of scope for this pass:
they resolve navigation targets or club scope from specific Supabase
table shapes (`pending_invites`, `mini_leagues`, `active_games`,
`notifications` with an `.or()` cross-club-type filter) that would
require importing production table-shape assumptions to adapt safely,
and the club identity needed to route a hybrid placement decision is only
known *after* the query executes for several of them — not a bounded
slice without a larger design pass.

Adapted the bundle's own `queryKeys.test.ts` and `cachePolicy.test.ts`
(both already provider-neutral, vitest + `@tanstack/react-query` only)
into `frontend/lab-tests/imported-notification-cache-policy-baseline.test.tsx`
(12 tests): key-identity normalization, per-user/per-club cache
isolation, exact-invalidation targeting, optimistic snapshot/update/
restore round-tripping (including delete-and-restore ordering and a
no-cached-match no-op), and invalidation call order for both the base
and `includeMessageUnread` surfaces. `tsconfig.lab.json` was extended to
typecheck the two new files; no runtime allowlist expansion was made or
needed since neither file is wired into `LabApp.tsx` or any consumer.

`npm test` passed 9 Node tests and 56 Vitest files / 312 tests (12 new).
`npm run typecheck:lab`, `npm run check:isolation`, `npm run
check:prod-secrets`, and `npm run build` all passed.

## Adapted hybrid Home RSVP repository - 2026-09-16

Ported `src/features/home/homeRsvpRepository.ts` (`fetchHomeUserRsvps`) from
the bundle's `integration/all-refactoring-icp-export` branch into
`frontend/src/lab/hybridHomeRsvpRepository.ts`, replacing its raw
Postgrest-shaped `client: any` parameter with an explicit
`resolveClubBackend`-routed hybrid provider, matching the pattern already
established for `hybridEventRsvpRepository.ts`.

Home aggregates events across every club the signed-in user belongs to, and
each club can be placed on a different backend, so this repository differs
from the single-event RSVP repository in one structural way: the caller must
group event ids by the club that owns them
(`HomeRsvpEventGroup { clubId, eventIds }`), and
`createHybridHomeRsvpRepository().fetchRsvpsAcrossClubs()` resolves and
queries each club's backend independently (caching one provider per backend
identity, same as every other hybrid service in this lab). A club with no
currently-visible events is skipped without resolving a backend or
constructing a provider at all, matching the bundle's original
"does not query" behaviour.

Unlike the single-event RSVP read (which is the authoritative record for
that event and must fail closed and propagate directly), Home's RSVP status
is a best-effort summary spanning every club membership: one temporarily
unavailable club must not make the rest of Home's dashboard unusable. That
degradation is still never silently swallowed and never becomes a same-club
Supabase fallback — each club's outcome is returned as an inspectable
`HomeRsvpGroupOutcome` (`{status:'ok', rows}` or
`{status:'unavailable', error}`), so a caller can show a "some clubs' RSVP
status could not be loaded" notice explicitly while still rendering the
clubs that did load. This mirrors the enrichment-outcome fix applied
earlier to the event RSVP repository, applied here at the per-club
aggregation boundary instead of the per-lookup boundary.

`frontend/lab-tests/imported-home-rsvp-repository-baseline.test.tsx` (9
tests) covers: the pure per-club function's empty-input short-circuit,
correct provider arguments, and failure propagation (provider-neutral,
matching the bundle's own `homeRsvpRepository.test.ts`); explicit Supabase
and explicit ICP mode aggregation with provider-client reuse; merging rows
from two clubs placed on different backends without cross-club leakage;
skipped-query clubs reported as ok with no provider resolution; one club's
ICP provider failing while another club's rows are still returned, with an
assertion that Supabase is never invoked for the failing club (no fallback);
and one club's placement being unavailable (country-policy denial) while an
independent club on the same backend type still succeeds.

`tsconfig.lab.json` was extended to typecheck the new file; no runtime
allowlist expansion was made or needed since the file is not wired into
`LabApp.tsx`. The bundle's raw Postgrest client and its `HomePage.tsx`
caller remain disconnected.

`npm test` passed 9 Node tests and 57 Vitest files / 321 tests (9 new).
`npm run typecheck:lab`, `npm run check:isolation`, `npm run
check:prod-secrets`, and `npm run build` all passed.

## Imported membership query-key factory and team-membership cache completion - 2026-09-16

Ported `src/features/membership/membershipQueryKeys.ts` and
`src/features/membership/teamMembershipCacheCompletion.ts` from the bundle's
`integration/all-refactoring-icp-export` branch to
`frontend/src/lab/membershipQueryKeys.ts` and
`frontend/src/lab/teamMembershipCacheCompletion.ts`: a canonical
`membershipKeys` cache-key factory (invite tokens, pending invites, team
roles/children, chat members, authorized scopes) plus the invalidation
helpers that reconcile every affected cache surface after a team-role
change, a full member removal, a child-assignment removal, a chat-managed
membership change, or the current user leaving a team. The bundle's
`queryClient: any` parameter was typed as `QueryClient` from
`@tanstack/react-query`, matching the convention already used by
`eventCacheRefresh.ts` and `notificationCachePolicy.ts`.

Confirmed genuine duplication in the sanitized source before choosing this
slice: grep found the underlying key literals (`team-roles`,
`team-children`, `user-invite-roles`, `pending-invites-for-user`,
`authorized-scopes`, `chat-members`) repeated as raw strings across roughly
20 files (`useAuthorizedScopes.ts`, `TeamDetailPage.tsx`,
`ManageTeamRolesPage.tsx`, `AddTeamMemberSheet.tsx`,
`PromoteToTeamAdminDialog.tsx`, etc.), each independently deciding which
surfaces to invalidate after a membership mutation — exactly the kind of
duplicated invalidation-completeness risk this centralizes.

Like every other cache-key/cache-policy helper ported this session, both
files are pure/provider-neutral: they only compute cache keys and
invalidate an in-memory React Query cache, never touching Supabase or ICP,
so no `resolveClubBackend` hybridization applies and none was added.

Adapted the bundle's own `membershipQueryKeys.test.ts` and
`teamMembershipCacheCompletion.test.ts` into
`frontend/lab-tests/imported-team-membership-cache-completion-baseline.test.tsx`
(10 tests), replacing the bundle's untyped mock `{ invalidateQueries: vi.fn() }`
client with a real `QueryClient` plus `vi.spyOn`, to keep the ported code
strictly typed against `QueryClient` rather than `any`. Coverage: every key
factory case, and every invalidation-order assertion for role change, full
member removal, child removal, chat-managed role change, atomic chat member
removal, and leaving a team.

`tsconfig.lab.json` was extended to typecheck the two new files; no runtime
allowlist expansion was made or needed since neither file is wired into
`LabApp.tsx` or any consumer. The bundle's ~20 duplicated call sites remain
untouched and disconnected.

`npm test` passed 9 Node tests and 58 Vitest files / 331 tests (10 new).
`npm run typecheck:lab`, `npm run check:isolation`, `npm run
check:prod-secrets`, and `npm run build` all passed.

## Imported hybrid Home rewards repository across club placements — 2026-09-16

Ported `src/features/home/homeRewardsRepository.ts` from the export bundle into
`frontend/src/lab/hybridHomeRewardsRepository.ts`, replacing its raw Postgrest-shaped
`client: any` parameter with an explicit `resolveClubBackend`-routed hybrid provider,
matching the architecture established in `hybridEventRsvpRepository.ts` and
`hybridHomeRsvpRepository.ts`.

Home displays rewards across clubs where the user is a member. Each club can reside
on a distinct backend (ICP canister or Supabase), so `fetchRewardsAcrossClubs` resolves
and queries each club's backend independently, caching one provider per backend identity.
The pure helpers `selectNextHomeRewardInfo` (computing the next reward threshold among Pro
clubs, with app-admin bypass, filtering out inactive and player-of-the-match rewards) and
`mergeHomeUserChildren` (combining owned and guardian-linked children with de-duplication
and alphabetical name sorting) were preserved and isolated from raw database queries.

One club's unavailable backend never disrupts the rest of the Home rewards view and never
triggers a Supabase fallback in ICP mode. Each club outcome is typed as an inspectable
`HomeRewardsGroupOutcome` (`{ status: 'ok', rewards }` or `{ status: 'unavailable', error }`).

Added 17 tests in `frontend/lab-tests/imported-home-rewards-repository-baseline.test.tsx` covering:
pure provider contracts, threshold selection rules, child list de-duplication/sorting, explicit
Supabase/ICP mode routing and client reuse, multi-club isolation without cross-club leakage,
failing ICP provider isolation with zero Supabase fallback calls, and placement country policy
denial handling.

`tsconfig.lab.json` was extended to typecheck `hybridHomeRewardsRepository.ts`; no runtime
allowlist expansion was made or needed. The bundle's raw Postgrest client and UI caller
remain disconnected.

`npm test` passed 9 Node tests and 60 Vitest files / 354 tests (17 new).
`npm run typecheck:lab`, `npm run check:isolation`, `npm run check:prod-secrets`, and
`npm run build` all passed.

## Imported hybrid Home entitlement repository across club placements — 2026-09-16

Ported `src/features/home/homeEntitlementRepository.ts` from the export bundle into
`frontend/src/lab/hybridHomeEntitlementRepository.ts`, replacing its raw Postgrest-shaped
`client: any` reads with explicit placement-routed ICP/Supabase providers. This was chosen
after confirming the current checkpoint had already adapted Home RSVP and Home rewards but
had no Home entitlement lab repository.

The adapted boundary requires Home team entitlement inputs to be grouped by the owning
club (`HomeEntitlementScope`) before routing, because backend placement is authoritative
per club rather than per team id. The repository resolves each club through
`resolveClubBackend`, caches one provider per backend identity, and never falls back to
Supabase when an ICP placement/provider is unavailable. It preserves the source-derived
entitlement rules for club subscription flags, team subscription flags, and the legacy
`teams.is_pro` trial fallback through the provider-neutral `resolveHomeProAccess` helper.

Home entitlement reads are fail-closed but inspectable: a provider or placement failure for
one club returns a typed per-club `{ status: 'unavailable', error }` outcome and contributes
`false` to the aggregate Pro access result, while independent clubs can still return
`{ status: 'ok', hasPro }` or reward-club rows. Reward-club lookup similarly scopes an active
club to only that club, de-duplicates all-membership club ids, preserves input order, and
reports unavailable clubs without cross-backend fallback.

Added 15 tests in `frontend/lab-tests/imported-home-entitlement-repository-baseline.test.tsx`
covering: entitlement flag resolution, legacy team trial fallback, fail-closed missing
payloads, club/team scope normalization, pure provider contracts, explicit Supabase and ICP
routing with provider reuse, multi-backend aggregation, unavailable ICP provider behavior
with zero Supabase fallback calls, placement country-policy denial, active-club scoping, and
reward-club aggregation across placements.

`tsconfig.lab.json` was extended to typecheck `hybridHomeEntitlementRepository.ts`; no
runtime allowlist expansion was made. The bundle's raw Postgrest client, Home page caller,
local Supabase RLS tests, and production Supabase integration code remain disconnected.

Focused validation:

- `npx vitest run --config vitest.lab.config.mjs --configLoader runner lab-tests/imported-home-entitlement-repository-baseline.test.tsx`
  passed 1 file / 15 tests.
- `npm run typecheck:lab` passed.
- `npm run check:isolation` passed.
- `npm run check:prod-secrets` passed.
- `npm test` passed 9 Node tests and 61 Vitest files / 369 tests.
- `npm run build` passed with the existing Browserslist, Tailwind arbitrary-class, and
  third-party `"use client"` directive warnings.

  ## Authoritative exported-test inventory and runnable tiers - 2026-09-17

  The authoritative test source is the local Git bundle
  `docs/ignite-all-refactoring-icp-export.bundle`, ref
  `refs/heads/integration/all-refactoring-icp-export`, commit
  `7f3a86ba449d2e847843ea9a77ff7e9b76751019`. Its non-browser inventory is
  exactly **586** test/spec source files:

  | Source group | Files | Lab disposition |
  | --- | ---: | --- |
  | `src/` frontend Vitest sources | 536 | 180 retained files run unchanged under the guarded legacy Vitest tier; selected behavior is also translated into 31 isolated hybrid baselines. |
  | `archive/` | 4 | Excluded: archived sports modules are outside the current source/runtime and have no local provider boundary. |
  | `tests/integration/` + `tests/local-supabase/` | 35 | Excluded: requires the original Supabase schema, RLS engine, and credentials. Re-expressed behavior must use the synthetic placement, local Supabase-compatible, and ICP provider adapters instead. |
  | `supabase/functions/` | 8 | Excluded: Deno Edge Function code is inert reference material; worker behavior is covered through local queue/secret-boundary tests. |
  | `supabase/tests/` | 3 | Excluded: SQL tests would execute the inert Supabase backend/migrations. |

  The remaining **356** `src/` sources are not directly runnable unchanged:
  20 are Edge Function-oriented tests and 336 require absent production
  routes, migrations, integrations, native/payment facilities, or source
  modules. A controlled import of the 328 missing non-Edge source tests was
  run under the hard network guard and produced 557 failures, including
  missing inert migration/workflow files and incompatible unported UI
  assumptions. The files were removed again; no production shim, credential,
  network client, or Supabase fallback was added to make those failures pass.

  Eleven browser/native files are outside the 586 count: 10 Playwright browser
  specifications and one iOS OS-resume harness. The lab's
  `playwright.config.ts` only runs the isolated hybrid browser spec on
  loopback; the original browser/native specifications remain excluded because
  they assume the full original application, local Supabase, or native tooling.

  Runnable test tiers are now explicit:

  ```sh
  cd frontend
  npm run test                 # isolated local-provider and ICP adapter suite
  npm run test:legacy          # retained source tests with a hard real-network guard
  npm run test:e2e             # isolated loopback hybrid browser coverage
  npm run check:exported-tests # verifies bundle ref and inventory prerequisites
  npm run test:exported        # active + legacy tiers and the authoritative inventory check
  ```

  `check-exported-test-inventory.mjs` verifies the exact bundle ref/commit,
  the Vitest and Playwright configurations, and the retained source/translated
  baseline floors. It is an accounting guard, not a claim of Supabase RLS
  parity or production readiness. Directly runnable tests use only synthetic
  identities, the fail-closed local Supabase-compatible adapter, or local ICP
  actors; no exported test is permitted to contact a production endpoint.

## Exported frontend test-porting phase 1, batch 1 - 2026-09-17

The authoritative bundle comparison was regenerated from
`docs/ignite-all-refactoring-icp-export.bundle` at
`refs/heads/integration/all-refactoring-icp-export`
(`7f3a86ba449d2e847843ea9a77ff7e9b76751019`). It now finds 536 exported
`src/` test/spec files, 222 retained source test files in this lab, and 335
currently absent bundle test files before this batch. Of that gap, 20 are
Edge Function-oriented and remain deferred because their source is inert
reference text; the non-Edge phase-1 gap is therefore 315 files.

This batch processed 21 non-Edge files:

- **20 ported and passing** source test files (185 tests), raising the
  retained source-test inventory from 202 to **222** files. The guarded legacy
  suite executes 200 files after its explicit Edge Function and production-only
  exclusions. The batch includes
  deterministic chat virtualization and scheduled-upload coverage, pitch
  planner analysis/admission/cadence validation, and local cache, scheduling,
  RSVP, search, unread-count, entitlement, and upload-error utilities.
- Supabase-shaped tests use `createMockSupabaseClient` and only synthetic
  user IDs, responses, storage paths, and `example.invalid` URLs. No test
  contacts Supabase or any other non-loopback service; the legacy setup's hard
  network guard remains active. No runtime allowlist entry was added.
- **1 excluded:** `src/lib/chatMessageReconciliation.characterization.test.ts`.
  Its six assertions require source-order contracts across six full production
  chat page implementations. Those pages are not a self-contained local
  provider boundary and their expected query-envelope implementation is absent
  from the sanitized lab sources. Recreating it would require porting the
  unported production chat-routing/realtime subsystem, so it remains excluded
  rather than weakening the assertions or adding a production shim.

The remaining phase-1 non-Edge work is **294 files** (315 minus 20 ported and
one explicit exclusion), plus the separately deferred 20 Edge Function tests.
This accounting is not a claim of production Supabase RLS parity or production
readiness.

Focused batch validation passed:

```sh
cd frontend
npx vitest run --config vitest.legacy.config.mjs \
  src/components/chat/chatRowHeightEstimator.test.ts \
  src/components/chat/chatRowPreviewEstimate.test.ts \
  src/components/chat/chatRowSignature.test.ts \
  src/components/chat/chatVirtuosoEnvironment.test.ts \
  src/components/chat/scheduledMessageUpload.test.ts \
  src/components/pitch/planner/analysis.test.ts \
  src/components/pitch/planner/diagnostics.test.ts \
  src/components/pitch/planner/existingPlan.test.ts \
  src/components/pitch/planner/standardMode.test.ts \
  src/components/pitch/planner/validation.test.ts \
  src/lib/competitionScheduler.test.ts \
  src/lib/matchResultFormat.test.ts \
  src/lib/messageCache.characterization.test.ts \
  src/lib/messageQueue.test.ts \
  src/lib/messagesPageCache.characterization.test.ts \
  src/lib/rsvpAudience.test.ts \
  src/lib/searchChatHistory.test.ts \
  src/lib/unreadMessageCounts.test.ts \
  src/lib/uploadErrorUtils.test.ts \
  src/lib/proShareGate.test.ts
# 20 files / 185 tests passed
```

Aggregate validation also passed:

```sh
cd frontend
npm run test:legacy  # 200 files / 2,186 tests passed; 2 existing skipped tests
npm run typecheck:lab
npm run check:isolation
npm run check:exported-tests
```

## Imported hybrid event supporting reads across club placements — 2026-09-16

Ported `src/features/events/eventSupportingReadsRepository.ts` from the export bundle
into `frontend/src/lab/hybridEventSupportingReadsRepository.ts`, replacing the bundle's
raw Postgrest-shaped `client: any` event guest and duty reads with explicit
club-placement routing. This slice was chosen after confirming the current checkpoint had
already adapted Home RSVP/rewards/entitlements and membership cache helpers, while event
supporting reads remained unported and small enough to keep disconnected from runtime UI.

The adapted boundary requires callers to supply the event's owning `clubId`, because hybrid
placement is authoritative by club rather than by event id. The repository resolves that
club through `resolveClubBackend`, caches one provider per backend identity, and never
falls back to Supabase when an ICP placement or provider is unavailable. Guest and duty
reads remain authoritative and fail closed. Guest adder profile enrichment keeps the
source's neutral `"A member"` display fallback but now returns an inspectable
`adderProfilesEnrichment` outcome (`skipped`, `ok`, or `unavailable`) instead of silently
hiding display-only degradation.

Added 10 tests in
`frontend/lab-tests/imported-event-supporting-reads-repository-baseline.test.tsx` covering:
event-scoped guest reads, profile id de-duplication, typed degraded profile enrichment,
authoritative guest/duty read failure propagation, explicit Supabase and ICP routing with
provider reuse, cross-club backend isolation, ICP provider failure with zero Supabase
fallback calls, and unavailable placement handling with no fallback.

`tsconfig.lab.json` was extended to typecheck `hybridEventSupportingReadsRepository.ts`; no
runtime allowlist expansion was made. The bundle's raw Postgrest client and event detail UI
caller remain disconnected.

Focused validation:

- `npx vitest run --config vitest.lab.config.mjs --configLoader runner lab-tests/imported-event-supporting-reads-repository-baseline.test.tsx`
  passed 1 file / 10 tests.
- `npm run typecheck:lab` passed.
- `npm run check:isolation` passed.
- `npm run check:prod-secrets` passed.
- `npm test` passed 9 Node tests and 62 Vitest files / 379 tests.
- `npm run build` passed with the existing Browserslist, Tailwind arbitrary-class, and
  third-party `"use client"` directive warnings.

## Imported hybrid targeted attendance roster across club placements — 2026-09-16

Ported `src/features/events/targetedAttendanceRepository.ts` from the export bundle into
`frontend/src/lab/hybridTargetedAttendanceRepository.ts`. The bundle's source called a
`get_targeted_event_attendance_roster` SECURITY DEFINER RPC with a raw Supabase-shaped
`client: any` and only an event id — used by `EventDetailPage` because event managers
(club admin / committee / target-team admin) cannot read other members' `children` rows
directly under RLS. This slice was chosen after confirming the current checkpoint had
already adapted hybrid event RSVP, event supporting reads, Home RSVP/rewards/entitlements
and membership cache helpers, while the targeted attendance roster remained unported, was
event/attendance-scoped, and stayed small and bounded enough to keep disconnected from
runtime UI.

The adapted boundary requires callers to supply the event's owning `clubId`, because
hybrid placement is authoritative by club rather than by event id. The repository resolves
that club through `resolveClubBackend`, caches one provider per backend identity, and never
falls back to Supabase when an ICP placement or provider is unavailable. The roster read
remains authoritative and fails closed — a denied or failed lookup propagates rather than
returning an empty roster. The three pure composition helpers (`selectScopedChildRoster`,
`mergeTargetedChildren`, `selectTargetedReminderMembers`) were ported unchanged in behavior,
with the bundle's `any`-typed parameters replaced by explicit row types.

Added 13 tests in
`frontend/lab-tests/imported-targeted-attendance-repository-baseline.test.tsx` covering:
event-scoped roster reads, authoritative read failure propagation, child-row filtering,
de-duplicating merge of RLS-visible and scoped children with visible-name precedence,
targeted reminder audience composition (team-targeted adults plus linked parents/guardians,
exclusion of unrelated teams and unlinked officials, no duplicate adults), explicit
Supabase and ICP routing with provider reuse, cross-club backend isolation, ICP provider
failure with zero Supabase fallback calls, and unavailable placement handling with no
fallback.

`tsconfig.lab.json` was extended to typecheck `hybridTargetedAttendanceRepository.ts`; no
runtime allowlist expansion was made. The bundle's raw RPC client and `EventDetailPage`
caller remain disconnected.

Focused validation:

- `npx vitest run --config vitest.lab.config.mjs --configLoader runner lab-tests/imported-targeted-attendance-repository-baseline.test.tsx`
  passed 1 file / 13 tests.
- `npm run typecheck:lab` passed.
- `npm run check:isolation` passed.
- `npm run check:prod-secrets` passed.
- `npm test` passed 9 Node tests and 63 Vitest files / 392 tests.
- `npm run build` passed with the existing Browserslist, Tailwind arbitrary-class, and
  third-party `"use client"` directive warnings.

## Wired hybrid Home entitlement/rewards helpers into HomePage — 2026-09-16

`HomePage.tsx` is unported page source (not in `frontend/lab-runtime-files.json`) that had
previously acquired `hybridHomeRewardsRepository.ts` and `hybridHomeEntitlementRepository.ts`
as imported, disconnected helpers with no page caller. Rather than leave that helper-only
work disconnected, `HomePage.tsx` was edited in place to consume the two pure composition
helpers it already duplicated inline, following the same "replace duplicated decision logic,
keep the existing data-fetch boundary" pattern used for `VaultPage.tsx` and
`EventDetailPage.tsx`.

- The Pro-access query's inline `hasClubPro` / `hasTeamPro` / legacy `teams.is_pro` boolean-or
  chain was replaced with `resolveHomeProAccess(clubSubsResult.data, teamSubsResult.data,
  teamsResult.data)` from `hybridHomeEntitlementRepository.ts`. Behavior is unchanged: any club
  subscription, team subscription, or legacy team trial flag still grants Pro access.
- The `userChildren` query's inline owned/guardian-linked child de-duplication and
  alphabetical sort was replaced with `mergeHomeUserChildren(owned, guardianLinks)` from
  `hybridHomeRewardsRepository.ts`. Behavior is unchanged: guardian-linked children still win
  on id collision and the result is still sorted by name.
- The page's raw Supabase read calls, query keys, and all other Home behavior are untouched;
  no provider/backend routing was introduced and no runtime allowlist expansion was made,
  since HomePage remains outside `lab-runtime-files.json` pending its own isolation gate.

Focused validation:

- `npx tsc -p tsconfig.app.json --noEmit` was compared before/after the edit: the same two
  pre-existing `HomePage.tsx` errors (untyped `useQuery` generic at the legacy-events query,
  and an `Event[]` narrowing mismatch) remain at shifted line numbers only; no new errors were
  introduced by this change.
- `npm run typecheck:lab` passed (HomePage.tsx is not part of the lab `files` list and was not
  newly added, matching the existing `VaultPage.tsx`/`EventDetailPage.tsx` precedent).
- `npm run check:isolation` and `npm run check:prod-secrets` passed.
- `npm test` passed 9 Node tests and 63 Vitest files / 392 tests (unchanged — this slice reused
  already-tested pure helpers rather than adding new ones).
- `npm run build` passed with the existing Browserslist, Tailwind arbitrary-class, and
  third-party `"use client"` directive warnings.

## Exported frontend test-porting phase 1 reconciliation - 2026-09-17

This entry supersedes the earlier batch-1 inventory paragraph above. The exact
comparison was regenerated against the local authoritative bundle
`docs/ignite-all-refactoring-icp-export.bundle`, ref
`refs/heads/integration/all-refactoring-icp-export`, commit
`7f3a86ba449d2e847843ea9a77ff7e9b76751019`, normalizing bundle `src/` paths to
`frontend/src/` paths. The bundle contains 536 `src/` test/spec files, including
20 `src/edge-functions/` tests. Therefore the non-Edge source inventory is 516.
The final lab contains 396 source test/spec files, 13 of which are Edge-oriented,
for 383 retained non-Edge files. The normalized raw non-Edge gap is **134 bundle
files**; one current retained non-Edge test is current-only and is not a bundle
match. The lab also contains 72 files under `frontend/lab-tests`.

The retained batches were:

| Batch | Ported files | Passing tests | Result |
| --- | ---: | ---: | --- |
| 1 | 25 | 190 | Passed focused run |
| 2 | 26 | 210 | Passed focused run |
| 3 | 26 | 225 | Passed focused run |
| 4 | 21 | 170 | Passed focused run; one candidate overlapped the existing state |
| 5 | 13 | 193 | Passed focused run |
| 6 | 19 | 164 | Passed focused run |
| 7 | 20 | 153 | Passed focused run |
| 8 | 20 | 168 | Passed focused run |
| 9 | 4 | 14 | Passed focused guard-only run |
| **Aggregate** | **174 committed files** | **1,487** | **All focused runs passed** |

The earlier focused candidate manifests summed to 175 selections because one
candidate overlapped the existing state; file inventory and commits use the final
normalized filesystem. The ported coverage is limited to synthetic, deterministic
utilities, policies, repositories, hooks, components, and static safety guards.
Supabase-shaped tests use `createMockSupabaseClient`; provider-shaped tests use
local actor/provider seams. No runtime allowlist entry was added, no production
endpoint or credential was used, and no backend source was executed.

Explicit exclusions from the nine batches remain outside the runnable source
inventory:

- `src/lib/chatMessageReconciliation.characterization.test.ts`: requires query
  and ordering contracts across six absent production chat pages.
- `src/features/events/eventSubmissionGate.test.ts`: asserts static wiring that
  is absent from the current `CreateEventPage.tsx`; recreating the page refactor
  would not be a bounded test port.
- `src/features/membership/bulkInvitationWorkflow.test.ts`: requires the absent
  large `membershipMutationService` integration.
- `src/features/notifications/cacheContract.guard.test.ts`: requires the absent
  `useNotificationRealtime.ts` subsystem.
- Eight chat characterization tests requiring absent page-level chat refactors:
  `src/lib/chatComposerEdit.characterization.test.ts`,
  `src/lib/chatComposerIntent.characterization.test.ts`,
  `src/lib/chatComposerSubmission.characterization.test.ts`,
  `src/lib/chatScheduleIntent.characterization.test.ts`,
  `src/features/messaging/scopes/chatScopeCapabilities.characterization.test.ts`,
  `src/features/messaging/thread/chatMessageOrdering.characterization.test.ts`,
  `src/features/messaging/thread/chatThreadCacheHydration.characterization.test.ts`,
  and `src/features/messaging/thread/chatThreadQueryData.characterization.test.ts`.
- `src/components/chat/ChatHeaderShell.test.tsx` and
  `src/components/layout/DesktopMessagesRail.test.ts`: current component source
  drifted from the exported contracts; porting would require a broad absent chat
  layout refactor rather than a provider-neutral test seam.
- The 17 static guard/characterization files removed in batch 9 require absent
  migrations, deployment/promotion workflows, native Capacitor configuration,
  dependency-governance files, production-only scripts, or large source
  refactors: `src/test/messagingPolicyParity.guard.test.ts`,
  `src/test/remainingDependencySecuritySafety.test.ts`,
  `src/test/pitchBoardEntryPoints.guard.test.ts`,
  `src/test/teamRecreationChatIsolation.guard.test.ts`,
  `src/test/capacitorUpgradeSafety.test.ts`,
  `src/test/deletedTeamPickerIsolation.guard.test.ts`,
  `src/test/vendorRepositoryGovernance.guard.test.ts`,
  `src/test/chatPageOrchestration.characterization.test.ts`,
  `src/test/xmldomSecurityUpgradeSafety.test.ts`,
  `src/test/pushDeliveryDeploymentSafety.test.ts`,
  `src/test/legalReacceptanceSecurity.guard.test.ts`,
  `src/test/destructiveMigrationGuard.test.ts`,
  `src/test/notificationRealtimeOwnership.guard.test.ts`,
  `src/test/chatSurfaceNavigationParity.characterization.test.ts`,
  `src/test/viteUpgradeSafety.test.ts`,
  `src/test/promotionWorkflowEventIsolation.guard.test.ts`, and
  `src/test/membershipInviteBoundary.guard.test.ts`.

These exclusions are accounting decisions, not weakened assertions. The
unported source remains disconnected from the runtime; production migrations,
Edge Functions, native/payment integrations, deployment workflows, and the
fail-closed Supabase client were not recreated or enabled.

Final validation for this reconciliation:

```sh
cd frontend
npm run test:legacy          # passed: 374 files / 3,726 tests; 2 skipped
npm run check:exported-tests  # passed: 396 retained source files / 31 baselines
npm run typecheck:lab        # passed
npm run check:isolation       # passed
git diff --check              # passed
```

The full legacy run completed after all nine batches under the hard real-network
guard. The inventory checker now requires at least 396 retained source test files
and 31 translated baselines.

## Exported frontend test-porting resumed batch - 2026-09-17

Resumed the uncommitted frontend work left after the ninth exported-test batch
without reverting any committed test-porting history. The orphaned batch adds 18
source test files across competition fixtures, event/group dialogs, role and
guardian management, legal reacceptance, offline/push UI, media/lazy-loading
hooks, chat composer submission, and related component seams. Those tests run
against synthetic local doubles, `createMockSupabaseClient`, or provider-neutral
lab adapters only; no production Supabase client, credential, remote endpoint,
or inert backend Edge Function was enabled or executed.

The retained source inventory is now **414** `frontend/src` test files, including
13 Edge-oriented source tests that remain excluded by the guarded legacy tier.
The observed active legacy tier is **392** files.

Validation for this resumed checkpoint:

```sh
cd frontend
npx vitest run --config vitest.legacy.config.mjs \
  src/components/CompetitionFixturesPanel.characterization.test.tsx \
  src/components/CompetitionFixturesPanel.query-contracts.test.tsx \
  src/components/CompetitionFixturesPanel.results.test.tsx \
  src/components/EventGroupsManager.characterization.test.tsx \
  src/components/EventViewMemberRow.test.tsx \
  src/components/LegalReacceptanceGate.test.tsx \
  src/components/ManageGuardiansDialog.characterization.test.tsx \
  src/components/ManageRolesDialog.test.tsx \
  src/components/OfflineIndicator.test.tsx \
  src/components/PlayHQTeamLinkCard.test.tsx \
  src/components/PushNotificationManager.test.tsx \
  src/components/QuickRSVPDialog.test.tsx \
  src/components/RecurringEventActionDialog.test.tsx \
  src/components/admin/LegalReacceptanceAdminCard.test.tsx \
  src/components/chat/ChatHeaderShell.test.tsx \
  src/hooks/useLazyFabric.test.tsx \
  src/hooks/useRealtimePerfSampler.test.tsx \
  src/lib/chatComposerSubmission.characterization.test.ts
# passed: 18 files / 151 tests
npm run test:legacy          # passed: 392 files / 3,877 passed; 2 skipped
npm test                     # passed: 9 Node tests and 67 Vitest files / 415 tests
npm run test:provider-matrix # passed: 1 file / 5 tests
npm run test:e2e             # passed: 2 Chromium loopback tests
npm run typecheck:lab        # passed
npm run check:isolation      # passed
npm run check:exported-tests # passed: 414 retained source files / 31 baselines
npm run build                # passed
```

The inventory checker now requires at least 414 retained source test files and
31 translated hybrid baselines. The browser coverage uses only the loopback Vite
server and verifies that ICP and hybrid modes remain fail-closed with no
external browser traffic.
