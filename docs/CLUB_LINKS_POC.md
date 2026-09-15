# Local club-links ICP proof of concept

This POC runs only in `ignite-icp-lab`, with synthetic records and publicly reproducible test identities. No production repository, Supabase connection, production credentials, OAuth, push, billing, or external navigation is used. It is not a production deployment or an account-migration implementation.

## Run

Prerequisites: Node 22.12+ (Node 24 tested), Rust with the `wasm32-unknown-unknown` target, `icp`, and `ic-wasm`. Current guidance: https://skills.internetcomputer.org/llms.txt. The tested CLI is 1.5.0, Rust recipe v3.3.0, Rust CDK 0.19.0, stable structures 0.7.2, core JS SDK 5.4.0 and bindgen 0.3.0. Dependencies are locked in Cargo.lock and frontend/package-lock.json.

In the current Codespace, tools were installed under `/tmp`. In each terminal using the wrapper:

```sh
export PATH=/tmp/ignite-icp-tools/node_modules/.bin:/tmp/ignite-cargo/bin:$PATH
export CARGO_HOME=/tmp/ignite-cargo
export RUSTUP_HOME=/tmp/ignite-rustup
```

These tool directories are temporary and need reinstalling if the Codespace removes `/tmp`. On a separately prepared lab environment, use its installed toolchain instead. No shell profile was changed.

From the repository root:

```sh
node frontend/scripts/local-icp.mjs start
node frontend/scripts/local-icp.mjs deploy
```

In a second terminal:

```sh
cd frontend
npm ci --ignore-scripts
npm run dev
```

Keep forwarded port **5180 private**. Select **Local ICP canister** in the page's Data source selector. The default remains an explicitly selected in-memory fixture session. ICP failure never switches to fixtures.

The editor defaults to the synthetic club administrator. The member view uses a separate signed member identity. Try the outsider, parent, guardian and excluded-administrator identities. Non-administrators cannot load the editor; the separate member preview remains the fixed member persona.

For a planned stop or restart, the wrapper freezes the canister, downloads a complete canister snapshot, verifies file sizes and SHA-256 hashes, and records a recovery plan before stopping the owned local process. Vite is not needed:

```sh
node frontend/scripts/local-icp.mjs backup
node frontend/scripts/local-icp.mjs verify-backup
node frontend/scripts/local-icp.mjs stop
node frontend/scripts/local-icp.mjs start
# Or, while running:
node frontend/scripts/local-icp.mjs restart
```

**Managed network restart creates a fresh network in the tested setup.** The wrapper restores the saved Wasm and memory to a newly created canister and refreshes its local binding. This is automated snapshot recovery, not native network persistence. It preserves ACLs, account mappings and mutation receipts as well as links. Restore refuses to overwrite an existing mapped canister. `full-restore-probe` restores a separate new canister without changing the working mapping. Backup artifacts remain under `.local-icp/backups/`; retain them outside ephemeral storage if they matter. They are local integrity checks, not signed or independently trusted backups.

The wrapper verifies the PocketIC executable path, process start time and owned listening control socket against this project's descriptor before shutdown, including when the launcher has already exited. It never kills an arbitrary port listener. Lifecycle actions are serialized with `.local-icp/lifecycle.lock`; if a wrapper is killed, investigate the owning process before removing a stale lock. A failed recovery retains its recovery plan; an already linked destination requires inspection rather than automatic overwrite.

An abrupt Codespace loss can still lose updates since the last verified backup. A link-only checkpoint cannot reconstruct ACL edits or receipts. In the resumed 2026-09-10 session, the previous network and temporary tools were gone; its existing artifacts were preserved. The new full-recovery tests therefore run in a separate synthetic project. The original working binding is stale: `start` intentionally refuses to replace it without a full shutdown snapshot. Do not bypass that refusal or cite the separate test as recovery of the old network.

The wrapper accepts only named local actions, supplies explicit local CLI targets, and uses an allowlisted subprocess environment. Synthetic CLI identity/config/cache files are under ignored `.local-icp/`; managed network state is under ignored `.icp/cache/`. The initial tooling bootstrap downloaded ICP binaries and created the same public synthetic governor in the CLI's user data directory before the wrapper's data directory was isolated; the final wrapper uses its own data directory. No production identity was used. Never invoke mainnet deployment commands for this POC. ICP CLI itself still has built-in mainnet support; this runbook is not an OS/network sandbox.

## Implementation

- `backend/club_links/src/lib.rs`: Rust canister and all server authorization.
- `backend/club_links/club_links.did`: committed Candid contract; a Rust test detects drift.
- `frontend/src/lab/bindings/declarations/`: generated raw Candid bindings.
- `frontend/src/lab/localActor.ts`: authenticated core SDK actor, explicit root key, fixed same-origin proxy transport, query signature verification enabled.
- `frontend/src/lab/icpClubLinksService.ts`: UI adapter, revisions, retry handling and identity disposal.
- `frontend/src/lab/syntheticIdentities.mjs`: public deterministic test identities and synthetic relationship graph.
- `frontend/scripts/local-icp.mjs`: local startup, deployment, upgrade and restore-probe orchestration.

The local CLI supplies the public verification key and canister ID in `.local-icp/public.json`. Vite serves only those public fields through `/icp/api/v2/lab-config`, without caching. Browser actor calls are rewritten to `/icp/api/` and proxied to fixed loopback `127.0.0.1:4943`. There is no runtime root-key fetching or SDK default-host fallback. API v4 was added to the existing same-origin guard because the current SDK uses it for updates.

The local configuration endpoint is a development-server feature. A static `dist` preview does not independently host the local ICP proxy/configuration service and must fail closed when ICP is selected.

## Source-derived authorization contract

Reference sources are inert; none were executed:

- `reference/backend/supabase/migrations/20260809232528_d284eb4c-2205-4a09-80f0-778f37558781.sql.md`: all five replacement club-links policies.
- `reference/backend/supabase/migrations/20260417195631_a60831b6-63eb-4ff5-96e5-c52c66ff9a30.sql.md`: `is_club_admin_for`.
- `reference/backend/supabase/migrations/20260721114111_aa56e96d-22f4-415a-bedd-486e04eb5849.sql.md`: family-aware `is_club_member` and exclusions.

| Operation | Canister rule |
| --- | --- |
| Insert | Matching club administrator or application administrator |
| Edit | Same administrator check; changing club is explicitly prohibited |
| Delete, toggle, reorder | Administrator, with every affected ID checked in the requested club |
| Admin list / inactive direct get | Administrator |
| Member list / active direct get | Membership or independent administrator branch |

Membership includes direct club roles, roles on a team belonging to the club, parent-child team assignments, and guardian-child team assignments. A club exclusion denies the membership branch. It does not erase an independent administrator grant. An administrator can therefore read inactive links even through the general list method, matching the combined SELECT policies. The UI uses a different member actor for its active-only preview.

All reads and writes check the signed caller. Roles supplied by browser controls are not authorization claims. A separate synthetic governor can replace the bounded ACL with version checking, enabling revocation tests; it is not automatically a club/application administrator. No anonymous public seeding endpoint exists.

This tests this domain's source-derived rules against synthetic relationships. It does not establish full production RLS parity, actual production grants, account linking or the omitted foundational schema.

## Persistence, concurrency and limits

Stable memory assignments are permanent: 0 config/ACL/schema; 1 links by UUID; 2 ordered club index; 3 club revisions; 4 request receipts. Heap caches are not the source of truth. Upgrade checks the schema version and reconnects the stable structures without bulk heap serialization.

Every mutation checks an expected club revision, validates all affected records, and commits data/index/revision/receipt changes in one synchronous update. No inter-canister calls or external side effects occur. Reordering swaps both positions atomically. An open edit retains its original revision even if background reads refresh the list. Conflicting edits require refresh/reopening; they are never automatically rebased over someone else's change.

Request UUIDs are scoped to the authenticated principal and bound to a hash of the complete request. Repeating the exact request returns its original result; reusing the key for different content fails. Permission is rechecked before returning a receipt. The adapter retains an uncertain request after a transport error so retrying that same action does not duplicate a committed write. This pending adapter state is in memory: recovery of an ambiguous write across browser reload is a remaining production design requirement.

Deliberate POC bounds:

- Two synthetic clubs; at most 100 links each, with bounded ACL vectors.
- Complete bounded list responses, not silently truncated lists.
- Title 160 UTF-8 bytes, subtitle 300 bytes, URL 2,048 bytes, icon 40 bytes.
- HTTP(S) URLs only, no embedded credentials; external navigation remains disabled.
- 10,000 retained mutation receipts; further writes fail closed when full. No unsafe receipt eviction.
- UUID domain IDs remain independent from principals; synthetic users currently map directly to caller principals.

The record contract follows ClubLinksService, not a complete Postgres export format. Original `created_by`/`updated_at` fields, negative or duplicate legacy sort positions, and sub-millisecond timestamps need explicit mappings before real-data migration. This POC uses nonnegative unique sort positions and millisecond creation times. No claim of complete source-record migration is made.

## Verification

Only run the dedicated lab checks. Do not run unported source tests.

```sh
cargo test --locked
cargo build --locked --release --target wasm32-unknown-unknown
```

From `frontend/`:

```sh
npm run check:isolation
npm run typecheck:lab
npm test
npm run build
```

With the local network and Vite running, from the repository root, run sequentially:

```sh
node frontend/scripts/server-smoke.mjs --icp
node frontend/scripts/test-canister.mjs exercise
node frontend/scripts/local-icp.mjs upgrade
node frontend/scripts/test-canister.mjs after-upgrade
node frontend/scripts/local-icp.mjs restore-probe
node frontend/scripts/test-canister.mjs restore
```

The exercise writes synthetic test records and a comparison snapshot under `.local-icp/`. Do not edit records between the exercise and after-upgrade comparison. The upgrade uses upgrade mode, not reinstall. The restore probe creates a fresh separate local canister; it never overwrites the editor's canister. Repeating the restore-probe action creates another local test canister. Test data remains synthetic and can accumulate until the documented bounds are reached.

The restore test rejects invalid cross-club data before any write, compares every field of the bounded POC export, and rejects unauthorized or nonempty-destination imports. This is a domain import test, not a complete disaster-recovery backup: the export excludes ACL and mutation receipts. Those are tested separately for upgrade persistence. A future migration must also establish account mappings, write fencing and receipt/delta handling.

Browser check, after installing Chromium and its system dependencies:

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/ignite-playwright node frontend/scripts/browser-poc.mjs
```

It tests real canister CRUD, reload persistence, inactive member filtering, identity-switch cache clearing and excluded-administrator access, while blocking requests outside the fixed local frontend origin. It does not simulate a native mobile app or measure production latency.

For the disconnected-backend smoke, stop the local network while leaving Vite running, then run `node frontend/scripts/server-smoke.mjs` without `--icp`.

`node frontend/scripts/test-canister.mjs after-restart` compares current links against the saved checkpoint. It failed before recovery in the tested setup. The `recover-checkpoint` command then imported the saved links and passed the same complete comparison. This must not be cited as proof of automatic restart persistence.

## Remaining boundaries

Public test keys are intentionally impersonable and must never protect real data or value. No Internet Identity/legacy-account migration is included. Query signatures remain enabled, but application-level certified data is not implemented. There is no production controller recovery, capacity plan, long-term receipt cleanup, or cross-reload mutation journal. Source modules outside the explicit runtime allowlist remain disconnected, Supabase remains disabled, and Vault documents beside club links are not ported. Codespace network/credential isolation is not independently certified.

## Local migration fencing

The POC now includes governor-only `freeze_club`, `export_frozen_club`, `import_frozen_club` and `unfreeze_club` methods. A frozen club rejects all ordinary link mutations, exports only if its revision is unchanged, and can be imported into a destination that has no records or revision for that club. The source and destination still require the same compatible ACL and synthetic governor authority. The shard router's migration fence must be begun before freezing, committed only after destination reconciliation, and aborted on any failed step. This is local protocol evidence, not a production migration implementation.

The disposable end-to-end probe is `frontend/scripts/test-migration.mjs`. It seeds a synthetic link, begins and freezes a route, exports/imports the club, verifies a stale source mutation is rejected, commits the router mapping, and reads the destination record. Supply only disposable local IDs through `MIGRATION_HOST`, `MIGRATION_SOURCE_ID`, `MIGRATION_DESTINATION_ID` and `MIGRATION_ROUTER_ID`; never use production canister IDs.

## Synthetic account identity boundary

Stable region 5 adds account IDs with a bounded set of active signing principals. Existing POC ACL subjects are migrated once to deterministic synthetic UUID-shaped IDs; roles, family membership and exclusions are projected onto those account IDs. This is not an import of real Supabase UUIDs. The legacy subject remains attribution for the compatibility ACL interface and cannot reactivate a revoked key.

`whoami` returns the caller's account. `begin_identity_link(target)` requires an active account signer and creates a target-bound, version-bound challenge with a ten-minute expiry. The target must sign `accept_identity_link(id)`. The challenge number is not a bearer credential. `revoke_identity(target, expected_version)` requires an active account signer, checks the account version, and refuses to remove its last signer. The local model requires the acting principal explicitly; an account ID alone cannot authorize revocation. Governor identity linking is disabled. Every protected club-links method resolves the current active signer again. The UI remains the existing synthetic persona selector; there is no production login or account-linking UI.

The local limits are 100 accounts, eight principals per account, 100 retained unexpired challenges and four pending challenges per account. This bounded POC cell is not a production-scale identity store. Lost-all-keys recovery, audited real-user UUID import, provider verification, mobile login, rate limiting and production account recovery remain unimplemented.

Run the dedicated full-state integration test with the original network stopped and loopback port 4943 free:

```sh
cargo test --locked
cargo build --locked --release --target wasm32-unknown-unknown
node frontend/scripts/test-recovery.mjs
```

It creates a separate project under ignored `.local-icp/recovery-test-*`, uses public synthetic signing keys, compares all exported state and receipt replay after restore and upgrade, then performs two complete network stop/start recoveries. It leaves the test network stopped with a verified snapshot on success. A failed run retains its artifacts for inspection; do not blindly start another network on its port.
