# Validation of the lab source transfer

Validated in a Bubblewrap sandbox with a separate network namespace, cleared environment, no production source/home credentials mounted, writable lab files and read-only installed dependencies. The host production repository was read only to prepare the sanitized copy and compare source hashes.

- Isolation checker passed: active source allowlist, blocked integration imports, disabled clients, restrictive CSP, fixed loopback ICP target and no runtime environment configuration.
- Four Node tests passed: local-request URL policy, fixture CRUD/ordering/visibility, rejected unauthorized/cross-club mutations and missing-ICP fail-closed selection.
- One React DOM interaction test passed using the actual copied editor: add, edit, hide from member preview and delete.
- Vite production bundle built successfully. Dev-server smoke passed: CSP present, main entry served, unported App import rejected and absent ICP rejected at the local proxy.
- npm ci dry-run with offline mode and lifecycle scripts disabled accepted the lab package/lockfile. A fresh dependency download/install was not performed; build and UI tests used installed Vite 7.3.6 and Vitest 4.1.5 mounted read-only from the environment.
- Known credential patterns, known source environment values and direct production Supabase endpoint patterns were scanned across staged text with no remaining findings. This is bounded scanning, not a claim that a generic secret scanner can prove the absence of every conceivable identifier.
- All originally tracked production file hashes were compared with the start-of-task snapshot. No changes were made by this task. The pre-existing package-lock.json modification was preserved.

Non-blocking build warnings concern existing Tailwind arbitrary classes, Browserslist age and third-party `use client` directives. Browser behavior was checked through the local HTTP smoke and jsdom interaction test; no real browser visual/native-device test or canister test was performed. The remote Codespace environment is not audited by these checks. The full legacy frontend and original test suite remain unported source, outside the active build.
