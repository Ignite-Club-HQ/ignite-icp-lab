# Production Handoff Export Guide (Phase 8, Step 1)

This document is the concrete, actionable output of Phase 8 Step 1 in
[PRODUCTION_LAUNCH_PLAN.md](PRODUCTION_LAUNCH_PLAN.md): "curate the export."
It exists so the repository owner can run the export and push to a new
repository themselves, with no ambiguity about what is included, what is
excluded, and why.

**This lab does not create the new GitHub repository or push to it.** That
decision (owner/org, name, visibility) belongs to you. Everything below is
prepared so that once you've created the destination repository, the
actual export is a single script run plus a `git push`.

## 1. What "the live build" already is

This repo does not need a from-scratch rewrite to become production code.
There is already a real, working, guarded production entry point:

- `frontend/src/product-main.tsx` — the real app bootstrap (installs the
  Supabase auth retry, telemetry, renders `App.tsx`).
- `frontend/vite.live.config.ts` — builds `live-index.html` /
  `product-main.tsx` into `dist-live/`, with three Vite aliases that swap
  in the *real* Supabase/ICP modules in place of lab-only stand-ins:
  - `@/integrations/supabase/client` → `src/integrations/supabase/liveClient.ts`
  - `@/lab/internetIdentityAuth` → `src/live/internetIdentityAuth.ts`
  - `@/lab/localRuntimeMode` → `src/live/localRuntimeMode.ts`
- `npm run build:live` (guarded by `scripts/check-live-config.mjs`) is the
  command that already produces this real, deployable bundle today.

So `dist-live/` is already a legitimate production artifact you could
deploy as-is right now. Phase 8 is about getting the **source**, not just
the built bundle, into a repository you control — so you can keep
developing it as normal application code going forward.

## 2. The one structural complication: lab code is inline, not siloed

Ideally "strip lab code" would mean "delete a folder." It doesn't, because
of how deep the fixture/live split goes:

- `frontend/src/lab/localRuntimeMode.ts` (the file that decides lab vs
  live) is imported by **106 files** across `pages/`, `hooks/`, and
  `components/` — nearly every page branches on it inline
  (`resolveLocalAuthMode(...)`), rather than the branch living in one
  place.
- `frontend/src/lab/fixtureDataLayer.ts` (the in-memory fixture dataset
  used only when in lab mode) is imported by **56 files** the same way.
- Roughly 25 other `src/lab/*` modules (hybrid repositories, local ICP
  service adapters, query-key helpers) are imported by a handful of
  shared files each, mixed in with real logic.

Given this, manually deleting `src/lab/**` before export **would break the
build** — many of those files (`localCompetitionService.ts`,
`localEventsService.ts`, `localMessagingService.ts`, the `hybrid*Repository.ts`
files, `eventQueryKeys.ts`, `membershipQueryKeys.ts`, etc.) are shared
infrastructure used by both modes, not lab-only fixtures, despite living
under `src/lab/`.

**Recommendation: do not attempt a source-level branch-by-branch strip.**
The safe, defensible approach is:

1. Export the **whole** `frontend/` source tree as-is. The lab-mode
   branches inside shared files become inert/unreachable dead code once
   you only ever build and deploy via `build:live` (or a renamed
   equivalent) going forward — they cannot be reached in a live-only
   deployment.
2. Exclude only the small set of files/directories below that are
   **wholly separate, whole-file** lab artifacts — the actual fixture
   *entry point* and its true single-purpose test/guard/reference
   scaffolding, not shared logic.
3. Treat "physically deleting the dead lab-mode branches from shared
   files" as optional, later cleanup the new repository's own team can do
   at their own pace once the new repo is the working copy — not a
   pre-condition for the handoff.

This keeps the export mechanical, low-risk, and reviewable, instead of a
large manual rewrite performed under time pressure.

## 3. Exact file/directory classification

### 3.1 Repository root — EXCLUDE from the export
- `reference/` — sanitized, inert reference-only material for this lab's
  own porting work; not application code.
- `docs/` — this lab's internal planning/tracking documents (including
  this file and `PRODUCTION_LAUNCH_PLAN.md`); not application code.
- `.icp/`, `.local-icp/`, `.mops/` — local ICP dev-network state for this
  lab's own local canister testing; regenerable, not source.
- `backend/`, `Cargo.toml`, `Cargo.lock`, `mops.toml`, `mops.lock`,
  `icp.yaml`, `icp-domain-topology.json` — this lab's local Rust/Motoko
  canister source and tooling. **Decision needed from you**: if the real
  production app is meant to eventually consume these ICP canisters, they
  should go into their own dedicated repository (or a clearly separated
  path) rather than folded into the frontend export — keeping frontend and
  canister deployment lifecycles independent is standard practice. Not
  included in the frontend export below by default.
- `AGENTS.md` — instructions for coding agents operating in *this* lab;
  not relevant to a production repository.
- `netlify.toml` — this lab's own Netlify config, pointed at lab hosting;
  replace with your production hosting config, don't carry this one over.

### 3.2 `frontend/` root — EXCLUDE from the export
- `dist/`, `dist-live/`, `dist-product/` — build output, regenerate on the
  new side; never commit built artifacts.
- `node_modules/` — regenerate via `npm install`.
- `index.html`, `src/main.tsx`, `src/lab/LabApp.tsx` — the **lab-only**
  fixture entry point (confirmed: `LabApp.tsx` is imported only by
  `main.tsx`, which is imported by nothing else). Not needed in
  production, which should use `live-index.html` / `product-main.tsx` as
  its sole entry.
- `product-index.html`, `vite.product.config.ts`, `build:product` script
  path — this is an internal **guarded QA build** (bundle-size/type-error
  budget checks with `IGNITE_PRODUCT_UNUSED_` env prefix, deliberately
  secrets-free). It is not a deployable target and exists only to gate
  this lab's own CI. Exclude unless you want to keep the same budget-check
  discipline in the new repo (optional, your call).
- `lab-tests/` — this lab's own Node-based test harness for the fixture
  app specifically.
- `lab-runtime-files.json`, `lab-route-classification.json` — allowlists
  that gate *this lab's* fixture bundle; not meaningful outside this lab.
- `vitest.lab.config.mjs` — test runner config for the lab fixture app.
- `scripts/check-isolation.mjs`, `scripts/check-production-secrets.mjs`,
  `scripts/check-live-config.mjs` — these enforce *this lab's* boundary
  rules (no production secrets committed here, no accidental production
  contact). They have no purpose in a repository that is itself the
  production app — carrying them over would be actively confusing
  (they'd reference a "lab vs production" distinction that no longer
  exists on the new side).
- `duplication-baseline.json`, `quality-baseline.json`,
  `product-type-error-baseline.json`, `exported-test-mapping.json` —
  ratchet baselines specific to this lab's own quality-tracking process;
  regenerate fresh in the new repo if you want equivalent tooling there.

### 3.3 `frontend/` root and `src/` — INCLUDE in the export
- `src/App.tsx`, `src/product-main.tsx`, `live-index.html` — the real app
  shell and entry point.
- `src/pages/**` (all 146 pages), `src/components/**`, `src/hooks/**`,
  `src/lib/**` — the actual application.
- `src/integrations/supabase/liveClient.ts`, `src/live/**` — the real
  live-mode Supabase/ICP modules.
- `src/lab/**` — **include all of it**, per the reasoning in section 2.
  Most of these files are shared infrastructure, not fixture-only; the
  minority that are fixture-only (e.g. `fixtureDataLayer.ts`,
  `syntheticSupabaseProvider.ts`, `syntheticIdentities.mjs`) become dead
  code once `localRuntimeMode` always resolves to live mode, which is
  already guaranteed by `vite.live.config.ts`'s alias.
- `vite.live.config.ts`, `vite.config.ts` (needed as the base config the
  live config's guard imports from), `tsconfig.*.json`,
  `tailwind.config.ts`, `postcss.config.js`, `package.json`,
  `package-lock.json`, `public/` — standard app tooling/config.
- `e2e/`, `playwright.config.ts` — end-to-end tests; these exercise real
  user flows and are valid to keep.
- `bundle-budgets.json` — only meaningful if you keep bundle-size CI
  checks; harmless to include.

### 3.4 Ambiguous — decide per your own judgment, not this lab's
- `scripts/` (the remainder not listed above) — many scripts here are
  genuinely useful build/deploy tooling (`build-live.mjs`,
  `deploy-staging.mjs`) and some are lab-specific test harnesses
  (`local-icp.mjs`, `test-canister.mjs`, `bootstrap-identity-local.mjs`).
  Review individually; the export script below includes the whole
  `scripts/` directory by default so nothing is silently lost, but you
  should prune lab-only entries once in the new repo.
- Guard/characterization test files under `src/test/` and `src/pages/` —
  many exist purely to prove this lab's own isolation/hybrid boundaries
  (e.g. `liveSupabaseAlignment.guard.test.ts`,
  `androidResumeZombieRequests.guard.test.ts`). These are harmless to keep
  (they still test real behavior) but reference lab-specific concepts in
  their names/comments; keep or prune at your discretion.

## 4. Export script

Run this from the repository root (`/workspaces/ignite-icp-lab.worktrees/copilot-worktree-2026-09-14T11-21-31`
or your own clone). It copies `frontend/` into a new directory, applying
every exclusion from section 3, and leaves it ready for a fresh `git init`.

```bash
#!/usr/bin/env bash
set -euo pipefail

SRC_ROOT="$(git rev-parse --show-toplevel)"
EXPORT_DIR="${1:-$HOME/ignite-club-hq-production-export}"

rm -rf "$EXPORT_DIR"
mkdir -p "$EXPORT_DIR"

rsync -a "$SRC_ROOT/frontend/" "$EXPORT_DIR/" \
  --exclude 'dist/' \
  --exclude 'dist-live/' \
  --exclude 'dist-product/' \
  --exclude 'node_modules/' \
  --exclude 'index.html' \
  --exclude 'src/main.tsx' \
  --exclude 'src/lab/LabApp.tsx' \
  --exclude 'product-index.html' \
  --exclude 'vite.product.config.ts' \
  --exclude 'lab-tests/' \
  --exclude 'lab-runtime-files.json' \
  --exclude 'lab-route-classification.json' \
  --exclude 'vitest.lab.config.mjs' \
  --exclude 'scripts/check-isolation.mjs' \
  --exclude 'scripts/check-production-secrets.mjs' \
  --exclude 'scripts/check-live-config.mjs' \
  --exclude 'duplication-baseline.json' \
  --exclude 'quality-baseline.json' \
  --exclude 'product-type-error-baseline.json' \
  --exclude 'exported-test-mapping.json'

# Rename live-index.html to index.html so it's the natural default entry
# in the new, production-only repository (no lab entry to disambiguate
# from anymore).
if [ -f "$EXPORT_DIR/live-index.html" ]; then
  mv "$EXPORT_DIR/live-index.html" "$EXPORT_DIR/index.html"
fi

echo "Export prepared at: $EXPORT_DIR"
echo "Next steps:"
echo "  1. cd \"$EXPORT_DIR\""
echo "  2. Review the tree, prune any of the 'ambiguous' items from section 3.4 you don't want."
echo "  3. git init && git add -A && git commit -m 'Import hybrid Supabase/ICP frontend from lab'"
echo "  4. Create the new GitHub repository yourself, then:"
echo "     git remote add origin <your-new-repo-url>"
echo "     git branch -M main"
echo "     git push -u origin main"
```

Save this as `scripts/export-production-candidate.sh` in this repo (see
section 5) and run `bash scripts/export-production-candidate.sh` (optionally
passing a destination path as the first argument).

## 5. What this lab has already prepared for you

- This guide (`docs/PRODUCTION_HANDOFF_EXPORT_GUIDE.md`).
- `scripts/export-production-candidate.sh` — the runnable version of the
  script in section 4, committed to this repo so it's a checked-in,
  repeatable tool rather than a one-off snippet.

## 6. What is deliberately left to you

- Creating the new GitHub repository (name, owner/org, visibility).
- Running the export script and reviewing its output before pushing.
- Deciding whether/when to physically remove the now-dead lab-mode
  branches from shared files (optional cleanup, not required to ship).
- Deciding what to do with `backend/` (the local ICP canister source) —
  fold into the new repo, a separate canister repo, or leave for later.
- All actual production credentials, secrets, DNS, and deployment
  configuration — none of this lab's checks, guards, or scripts carry
  real secrets, and none should be copied over; configure these fresh in
  the new repository's own CI/hosting.
