# Ignite ICP Lab

Complete sanitized React source and backend source references for an incremental Supabase-to-ICP port. Source commit: `556782e51e101c446b4c36265f35ea17fd3c31ff`.

## What is here

- `frontend/src/`: the full checked-in frontend source, including pages, components, hooks, styling, database types and existing tests. Service URLs, email literals and credential literals are sanitized. Two production client modules and the startup file are replaced. The original versions are retained as inert sanitized reference text.
- `frontend/src/lab/`: a working synthetic club-links screen using the existing editor, a typed service boundary, in-memory adapter, local-network guard and dedicated tests.
- `reference/backend/`: Supabase migrations, Edge Function source and supporting backend files wrapped as inert Markdown. Also includes SQL found elsewhere in the source tree and original entry/config files for comparison. This is repository evidence, not a complete export of production schema or data.
- `reference/SOURCE_MANIFEST.json`: original source paths and hashes, substitutions and omissions.
- `reference/SUPABASE_CALL_SITES.json`: frontend Supabase call-site map to guide subsequent domains.
- `docs/PORTING_PLAN.md`: scope, architecture, remaining work and verification limits.

The full source is available for refactoring, but the entire original app is not enabled. Unported source cannot enter the default runtime bundle. The only active domain is the synthetic club-links editor and member preview. No ICP canister or working ICP adapter exists yet.

## Run in the lab Codespace

Use only this repository's Codespace. Keep forwarded port 5180 private. From `frontend/`:

```sh
npm ci --ignore-scripts
npm test
npm run build
npm run dev
```

Dependency download requires registry access. The checked-in `.npmrc` disables lifecycle scripts. No original install hooks, deployment scripts, production environment files or native signing configuration are copied. The lockfile retains the source resolution snapshot; some unused legacy transitive dependencies may remain, but no legacy integration is permitted into the runtime graph.

Open forwarded port 5180. Add and edit synthetic links; they reset on reload. External navigation and file opening are disabled. Production users cannot log in.

## Isolation

The active bundle uses an explicit source allowlist, disabled Supabase clients, a separate bootstrap, restrictive CSP and a browser network guard. Its only application API route is `/icp/api/`, proxied by the development server to fixed loopback `127.0.0.1:4943`. There is no backend at that address supplied by this transfer and no fallback. The preview build currently demonstrates fixtures only.

These safeguards do not constitute an operating-system sandbox for the entire Codespace. Do not expose production credentials to it, run the old application bootstrap, or enable unreviewed modules. Production files and services were not modified to prepare this repository.
