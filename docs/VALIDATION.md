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
- The new route tests cover the default ICP decision, explicit/unknown query
  values, reactive router selection, an ICP-mode competition unavailable state
  with zero Supabase calls, and the preserved explicit Supabase comparison
  path.
- Competition and mini-league pages remain outside the runtime allowlist. No
  local competition provider or production integration was added.
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
