# Frontend Vendor Handover Audit

Audit date: 2026-09-19

## Executive decision

## Baseline implementation update — 2026-09-18

The first reproducible-baseline work package is now implemented without
changing the isolated lab entry or runtime allowlist:

- `frontend/product-index.html`, `frontend/src/product-main.tsx`, and
  `frontend/vite.product.config.ts` provide a separate guarded product/staging
  build target. The lab continues to use `vite.config.ts` and `src/main.tsx`.
- `npm run build:product` produces `dist-product` without loading `.env` files or
  exposing inherited `VITE_*` variables. It does not add credentials or a
  provider fallback.
- `rollup-plugin-visualizer` emits HTML and raw-data bundle reports, and
  `check:product-bundle` enforces the measured baseline budget. The current
  product build is 8,887,246 bytes of JavaScript and 172,796 bytes of CSS,
  with 9,800,000- and 500,000-byte review ceilings; the largest JavaScript
  chunk is 1,112,493 bytes.
- `eslint.config.mjs` and `lint` establish a zero-warning ratchet for the new
  provider-neutral observability and product-build surfaces. `tsconfig.strict.json`
  and `typecheck:strict` establish a strict sidecar for those modules without
  forcing an unsafe global strict-mode conversion.
- `check:quality-ratchet` records the current source counts for `as any`,
  console calls, and direct Supabase-client imports in
  `frontend/quality-baseline.json`. Generated type definitions, tests, and the
  centralized logger are explicit exclusions; increases fail CI.
- `src/lib/observability` provides redacted, provider-neutral logging and
  telemetry boundaries. The product entry records Web Vitals through the
  boundary; no Supabase telemetry sink is installed.
- `.github/workflows/frontend-quality.yml` runs lab isolation, lab and legacy
  tests, lab and strict typechecks, lint, both builds, and bundle budgets
  without deployment credentials.
- `DirectMessagePage` and `ScheduledMessagesPage` now defer the scheduling
  dialog until it is opened, using the existing retry-safe lazy loader and a
  local Suspense boundary. A characterization contract prevents either route
  from reverting to an eager dialog import.
- The member and mini-league CSV import dialogs now share the same parser and
  email validator in `src/lib/csv.ts`; focused tests preserve quoted-comma,
  trimming, and email-validation behavior. Lab/reference-only mirrors remain
  intentionally separate.
- `CancelEventConfirmDialog` and `RecurringCancelEventDialog` now share
  recipient counting, stale-request fencing, and fail-closed lookup handling
  through `useEventCancellationRecipients`; their action-specific UI and
  callbacks remain separate.

This establishes a build and quality baseline, not production release
readiness. The product entry still contains the documented direct-Supabase
reference domains, and the budget is intentionally a review ceiling derived
from the first product build rather than a claim that the bundle is optimal.

### Milestone validation

The 2026-09-18 milestone ran the following checks from `frontend/`:

- `npm test`: 275 Node tests and 1,714 Vitest tests passed.
- `npm run test:legacy`: completed successfully; the existing suite emits
  jsdom/dynamic-import diagnostics but reported no test failure.
- `npm run typecheck:lab`, `npm run typecheck:strict`, and the configured
  zero-warning `npm run lint` passed.
- Isolation, production-secret, and quality-ratchet checks passed.
- Both the isolated lab build and guarded product build passed.
- Product bundle analysis and budgets passed at 8,887,246 JavaScript bytes,
  172,796 CSS bytes, 492 JavaScript chunks, and a 1,112,493-byte largest
  JavaScript chunk.

The full reference-product check `tsc -p tsconfig.app.json` is not yet a
passing gate. It currently reports pre-existing errors across unported
components (for example `unknown` Supabase query results and timer types) and
missing inert Edge Function/reference modules under `src/edge-functions`.
Those errors are intentionally not hidden by this handover work; the strict
sidecar remains limited to newly governed provider-neutral modules until each
product domain is migrated and its source dependencies are available.

### Incremental refactor update — 2026-09-19

The following bounded extractions were completed without adding any product
module to the lab runtime allowlist, changing the lab entry, enabling a
fallback provider, or contacting a production service:

- All six chat pages now obtain remote history search table, scope filter, and
  reaction foreign-key metadata from the typed chat scope adapters through
  `chatHistorySearchFetcher`. Each page retains its existing message select
  shape and its local-ICP search branch.
- `MessagesPage` delegates unified inbox row construction, Pro locking, mute
  state, realtime unread precedence, support deduplication, and draft ordering
  to `buildUnifiedInboxConversations`; the page remains responsible for
  authorization-scoped source queries, filters, realtime, and rendering.
- `EventDetailPage` delegates attendee role-scope resolution and attendee row
  presentation to `EventAttendeeCard`; RSVP, payment, attendance, and event
  mutation orchestration remain in the page.
- `VaultPage` delegates pure file-size, file-kind, and external-link display
  classification to `vaultFilePresentation`. Download/open behavior remains
  page-local, preserving the guarded `safeOpenUrl` path and the inert
  `reference.invalid` destinations.
- Photo, comment, and chat-message reports now share one typed report-dialog
  shell. Their endpoints, immutable IDs, subject-specific reason lists,
  accessible radio IDs, authentication messaging, and request payloads remain
  supplied by thin wrappers.
- The team, club, group, and direct-message chat pages now use one
  `ChatAttachmentPickers` boundary. It dynamically imports and mounts the
  Event, News, and Board pickers only after the matching composer action; its
  typed props preserve each page's team/club/league/competition scope.
- `MessagesPage` now defers the inbox action sheet, recap sheet, direct-message
  dialog, custom-group dialog, and create-group dialog until interaction.

This pass reduced the directly touched page sources by 190 lines in
`MessagesPage`, 168 in `EventDetailPage`, and 50 in `VaultPage` compared with
the previous audit snapshot. It also replaced approximately 400 repeated
report-dialog lines with one shared, tested shell. These line counts are
maintainability evidence only, not a bundle-size or user-perceived-performance
claim.

Focused validation actually run for this increment:

- chat history characterization (54 tests), scope search tests, attachment
  lazy-loading contract (2 Node tests), and imported chat behavior contracts;
- inbox-composition unit tests (7 tests);
- event-attendee role tests (3 tests) plus event-detail characterization (8
  tests);
- Vault presentation unit tests (7 tests) plus Vault characterization (9
  tests);
- report-message authentication/submission characterization (6 tests);
- Messages dialog-loading contract (1 Node test).

The full product diagnostic ratchet remains blocked by its documented
reference-product backlog. The check reports the pre-existing page diagnostics
in chat and fixture-derived query shapes; none were introduced by these
extractions. The next safe chat slice is a controller for shared pagination,
reconciliation, draft, composer, and cache lifecycle. It is intentionally not
merged yet because the six routes still have different optimistic mutation,
local-ICP, entitlement, and Realtime semantics that need route-by-route
characterization before centralizing them. Sponsor header strips and mini-league
join-link cards remain separate for the same reason: their placement,
permission, analytics, and confirmation flows differ beyond their visible
markup.

### Handover status

| Handover objective | Status | Decision |
| --- | --- | --- |
| Continue the isolated ICP lab and synthetic hybrid proof | Green | Ready to hand over with the existing runbooks and test baselines |
| Refactor and port the remaining frontend domains under controlled milestones | Amber | Ready only with the scope, boundaries, and acceptance gates in this document |
| Take responsibility for a production hybrid frontend release | Red | Not ready for production sign-off |

The repository is suitable for a capable vendor to continue engineering work, but it is not yet a complete production frontend delivery package. The isolated lab has strong safeguards and regression coverage, and a guarded product/staging build now provides a reproducible baseline. The full product frontend remains reference/porting source: most product modules still access Supabase directly, the global TypeScript configuration remains permissive, and the product typecheck still has an explicitly inventoried backlog.

The recommended commercial handover is therefore a staged engineering engagement, not a fixed-price production launch based on the current source alone.

## Scope and constraints

This audit covers:

- `frontend/src`
- the active lab entry and Vite configuration
- TypeScript, test, build, and CI configuration
- runtime code splitting and heavy dependency loading
- authored-code duplication
- hybrid backend separation
- maintainability and vendor onboarding readiness

This audit does not claim:

- that the full product frontend can currently be bundled from this repository;
- that the lab tests prove production Supabase RLS parity;
- that production credentials, OAuth, push, billing, or native signing are configured;
- that Codespace network or credential isolation has been certified;
- that static code metrics alone establish user-perceived performance.

The current hybrid boundaries and the fail-closed lab runtime must be preserved.

## Evidence baseline

### Codebase size

| Metric | Result |
| --- | ---: |
| TypeScript/TSX source lines under `frontend/src` | 415,039 |
| Files over 500 lines | 158 |
| Files over 1,000 lines | 61 |
| Files over 2,000 lines | 20 |
| Files over 3,000 lines | 10 |
| Test files under `frontend/src` | 435 |
| Runtime files importing the Supabase client directly | 465 |
| Runtime `as any` assertions | 1,211 |
| Runtime console calls | 1,237 |
| Runtime TODO/FIXME/HACK markers | 1 |

The low TODO count is positive, but it does not represent low debt. Most debt is structural: large files, direct infrastructure access, permissive compiler settings, repeated feature implementations, and logging without a single production telemetry boundary.

### Largest product surfaces

| File | Lines | Primary risk |
| --- | ---: | --- |
| `frontend/src/pages/VaultPage.tsx` | 5,726 | data access, export, navigation, dialogs, selection, charts, and mutations in one page |
| `frontend/src/pages/EventDetailPage.tsx` | 4,849 | broad event orchestration and high invalidation density |
| `frontend/src/pages/MessagesPage.tsx` | 3,900 | inbox orchestration, caching, filtering, and dialogs |
| `frontend/src/pages/GroupChatPage.tsx` | 3,243 | chat transport, cache reconciliation, composer, UI, and permissions |
| `frontend/src/pages/TeamDetailPage.tsx` | 3,088 | membership, roles, team settings, tabs, and dialogs |
| `frontend/src/pages/TeamChatPage.tsx` | 2,470 | duplicated chat-page orchestration |
| `frontend/src/pages/ClubChatPage.tsx` | 2,012 | duplicated chat-page orchestration |
| `frontend/src/pages/DirectMessagePage.tsx` | 1,769 | duplicated chat-page orchestration |
| `frontend/src/pages/ClubAdminChatPage.tsx` | 1,537 | duplicated chat-page orchestration |
| `frontend/src/pages/BroadcastChatPage.tsx` | 1,330 | duplicated chat-page orchestration |

The six chat routes alone contain more than 13,000 lines. Shared chat primitives already exist, including virtualization, reconciliation, draft, scroll, search, and composer helpers, but page-level orchestration remains duplicated.

### Duplication result

`jscpd` was run against authored frontend source with tests, generated Supabase types, generated Candid bindings, and generated-contract copies excluded.

| Metric | Result |
| --- | ---: |
| Authored lines scanned | 278,221 |
| Clone groups | 63 |
| Duplicated lines | 2,362 |
| Duplicated-line percentage | 0.85% |

The overall percentage is acceptable for a codebase of this size. The important issue is concentration in maintenance-sensitive feature pairs.

#### Highest-priority true consolidation candidates

| Duplicate areas | Largest detected clone | Recommended boundary |
| --- | ---: | --- |
| `MemberCSVImportDialog` / `MiniLeagueMemberCSVImportDialog` | 136 lines | shared CSV drop zone, preview, error summary, and template download components |
| `CancelEventConfirmDialog` / `RecurringCancelEventDialog` | 97 lines | shared cancellation dialog shell with recurrence strategy supplied as data |
| `AddClubRoleToMemberDialog` / `AddRoleToMemberDialog` | 70 + 59 lines | shared role editor with a typed scope adapter |
| `ManageRolesPage` / `ManageTeamRolesPage` | 65 lines | shared role-table/controller package |
| repeated notification preference sections in `SettingsPage` | 74 lines | typed preference descriptor array rendered by one component |
| sponsor strips and carousels | 47-56 lines | shared sponsor-slot renderer and query adapter |
| mini-league admin/parent join-link cards | 55 + 38 lines | shared join-link card with role-specific copy and permissions |
| Events and Media header sponsor strips | 41 + 38 lines | shared header sponsor strip |
| photo/comment/message report dialogs | 33-41 lines | shared report-reason form and submission shell |

#### Intentional duplication that must not be naively removed

The following lab/reference pairs are intentionally duplicated because only allowlisted, isolated files may enter the lab bundle:

- `src/lab/vaultAccess.ts` and `src/features/vault/vaultAccess.ts`
- `src/lab/notificationCachePolicy.ts` and `src/features/notifications/cachePolicy.ts`
- `src/lab/scheduleCache.ts` and `src/lib/scheduleCache.ts`
- `src/lab/chatMessageOrdering.ts` and `src/features/messaging/thread/chatMessageOrdering.ts`
- related notification query-key and cache-hydration mirrors

Do not replace these lab modules with imports from unported production modules merely to improve a duplication score. Consolidate only after the owning domain is provider-neutral, isolated, tested, and added to `lab-runtime-files.json`.

## Quality assessment

### Strengths

1. **Strong regression evidence**
   - Legacy baseline: 413 files, 4,164 passing tests, 1 skipped.
   - Lab baseline: 274 Node tests and 1,714 Vitest tests passing.
   - Dedicated backend-switching, provider-matrix, Internet Identity, local ICP, and messaging performance commands exist.

2. **Fail-closed lab isolation**
   - `frontend/src/main.tsx` loads only the lab application.
   - `frontend/vite.config.ts` blocks modules not listed in `lab-runtime-files.json`.
   - The lab runtime does not silently fall back to a production service.

3. **Good route-level code splitting in the reference product**
   - `App.tsx` lazy-loads most pages.
   - `lazyWithRetry` handles transient chunk failures and stale deployment manifests.
   - Chat lists use virtualization and contain detailed performance/reconciliation tooling.

4. **Substantial characterization coverage**
   - Complex historical behavior is protected by guard and characterization tests, which is valuable before extraction work.

5. **Detailed hybrid and production-boundary documentation**
   - Existing execution plans, parity evidence, deployment runbooks, and production gap documents give a vendor useful context.

### Critical handover gaps

#### 1. No full product build target

The active entry point explicitly loads `LabApp`, not `App.tsx`. `npm run build` therefore proves only the isolated lab bundle. It cannot provide product bundle sizes, chunk composition, product tree-shaking evidence, or a deployable hybrid product artifact.

**Required before production ownership transfer:**

- add a separate, explicit product/staging entry and Vite configuration;
- keep the current lab build and allowlist unchanged;
- define environment validation that fails closed;
- generate a bundle visualization and enforce initial/chunk size budgets;
- run the product build in CI.

#### 2. Provider neutrality is incomplete

There are 465 non-test source files importing the Supabase client directly. This is consistent with the documented coexistence state, but it means a vendor cannot safely switch a country, club, or domain to ICP by changing configuration alone.

**Required approach:**

- migrate one bounded domain at a time behind typed repositories/services;
- resolve placement before every operation;
- keep existing Supabase workloads Supabase-authoritative;
- prohibit UI components from importing either Supabase or ICP SDKs once a domain boundary is ported;
- retain negative authorization and stale-write tests from the source RLS model.

#### 3. Type safety is below handover standard

`strict`, `strictNullChecks`, `noImplicitAny`, `noUnusedLocals`, and `noUnusedParameters` are disabled. Runtime source contains 1,211 `as any` assertions.

Turning strict mode on globally in one change would be unsafe. The vendor should use a strict sidecar configuration and ratchet newly ported directories first.

#### 4. No lint gate

ESLint dependencies are installed, but there is no ESLint configuration and no `lint` script. Import placement, hook dependency mistakes, floating promises, and unsafe TypeScript patterns are therefore not consistently enforced.

#### 5. CI does not run the complete frontend quality baseline

The private staging workflow builds the lab and runs selected smoke tests, but it does not run:

- the full lab test command;
- the full legacy test baseline;
- the full TypeScript check;
- lint;
- a full product build;
- bundle/performance budgets.

#### 6. Oversized modules raise change and performance risk

Route splitting prevents all pages from loading at startup, but opening a large route still requires parsing and evaluating a very large module graph. The largest pages also mix transport, caching, mutation, view-state, and rendering responsibilities, making optimization risky.

#### 7. Product performance telemetry is not part of the active lab entry

`webVitalsReporter.ts` exists and the recovered production reference entry called it, but the active lab entry does not. That is appropriate for the isolated lab because the reporter writes to Supabase. A production hybrid build needs a provider-neutral telemetry boundary rather than restoring the direct Supabase call.

#### 8. Logging needs a governed boundary

More than 1,200 runtime console calls make diagnostics discoverable, but they create noise and may leak context if production logging policy is not centralized. Replace ad hoc logging incrementally with a typed logger that supports environment filtering, redaction, correlation IDs, and a provider-neutral sink.

## Performance assessment

### Existing good practices

- route-level lazy loading;
- retry-safe dynamic imports;
- chat message virtualization;
- React Query cache/stale-time tuning;
- image and media helpers;
- dedicated chat performance marks;
- local ICP messaging benchmarks;
- local Suspense boundaries for deferred dialogs.

### Improvements completed during this audit

1. `PinVaultSheet`, `ScheduleMessageDialog`, and `CreatePollDialog` are now deferred on the chat routes that use them.
2. `JSZip` is no longer part of the initial Vault route evaluation path; it is loaded only when an export begins.
3. CSV parsing/email validation and cancellation-recipient lookup now use shared primitives without changing component contracts.
4. Team and club role dialogs now share the same accessible role-selection renderer, including state exposed through `aria-pressed`.
5. The product TypeScript backlog is inventoried and ratcheted: the current baseline is 199 diagnostics (139 source-backed, 49 missing-reference, and 11 inert Edge Function references), and new diagnostics fail the product check.
6. Existing behavior was preserved with local `Suspense` boundaries, unchanged data-access contracts, and the legacy suite passing with 4,168 tests passed and one skipped.

These changes reduce route parse/evaluation work without changing data access, permissions, caching, or backend selection.

### Next performance priorities

#### P0 - establish measurable budgets

1. Create the full product build target.
2. Record:
   - initial JS and CSS;
   - largest route chunks;
   - duplicate dependency copies;
   - LCP, INP, CLS, and TTFB by route/device class;
   - chat open-to-interactive and first-message-paint;
   - Vault export memory and cancellation behavior.
3. Set budgets in CI. Do not optimize from source line count alone.

Suggested initial review thresholds, to be ratified from a real baseline:

- no unreviewed route chunk increase above 10%;
- no new eager dependency above 50 KB gzip;
- p75 LCP below 2.5 seconds;
- p75 INP below 200 ms;
- CLS below 0.1;
- bounded chat memory growth during long sessions.

#### P0 - split the largest pages by responsibility

For each oversized page, extract in this order:

1. typed repository/service operations;
2. query-key and cache-update helpers;
3. controller hooks;
4. independent panels/dialogs;
5. pure presentational sections.

Do not perform a wholesale visual rewrite. Preserve the existing characterization tests and extract one behavior slice per commit.

#### P0 - converge chat orchestration

Create a shared chat-page controller with typed scope adapters for:

- team;
- club;
- group;
- direct message;
- club-admin;
- broadcast.

The controller should own shared pagination, reconciliation, drafts, scheduling, composer intent, search, resume behavior, and cache lifecycle. Scope adapters should supply permissions, identifiers, labels, membership queries, and transport operations.

#### P1 - defer interaction-only dependencies

Continue converting libraries and feature panels that are needed only after a user action to dynamic imports. Candidates include document/PDF generation, spreadsheet parsing, ZIP work, rarely used admin analytics, and large editor surfaces. Verify each result using the full product bundle, not the lab bundle.

#### P1 - prefetch based on intent

For dialogs and routes with predictable navigation:

- prefetch chunks on pointer hover, focus, or a short idle period;
- do not prefetch every deferred dialog at startup;
- avoid prefetching across backend/permission boundaries before authorization is known.

#### P1 - reduce render fan-out

Use React Query `select`, stable query keys, narrowly scoped context providers, and memoized leaf components where profiling shows repeat work. The codebase already uses `useMemo`/`useCallback` extensively; adding more without profiler evidence is not a goal.

## Recommended vendor work packages

### Work package 1 - reproducible product baseline

Acceptance:

- clean checkout installs with `npm ci`;
- separate lab and product builds;
- full typecheck, lint, lab tests, legacy tests, and product build run in CI;
- bundle report archived as a CI artifact;
- no production credentials required to build;
- environment selection fails closed.

### Work package 2 - quality ratchet

Acceptance:

- ESLint flat configuration committed;
- no new warnings in changed files;
- strict TypeScript sidecar configuration for new/provider-neutral code;
- `as any`, console, and direct-Supabase counts cannot increase;
- generated code and intentional lab mirrors are excluded explicitly.

### Work package 3 - chat convergence

Acceptance:

- shared typed scope adapter/controller used by at least two chat routes;
- no behavior regression in offline, resume, reconciliation, scheduling, search, and cross-thread isolation tests;
- measured route-chunk or parse-time improvement;
- remaining routes migrated incrementally.

### Work package 4 - domain-by-domain hybrid migration

Acceptance for each domain:

- UI imports only the provider-neutral service;
- Supabase and ICP implementations pass the same contract suite;
- placement, country, and club overrides are tested;
- Internet Identity and allowed alternative auth behavior are tested;
- missing/disabled providers fail closed;
- source RLS behavior has positive and negative parity evidence.

### Work package 5 - observability and performance

Acceptance:

- provider-neutral logger and telemetry boundary;
- redaction policy;
- route-specific Core Web Vitals;
- chat and Vault operational metrics;
- CI budgets and a repeatable device/network test profile.

## Vendor handover package checklist

Before contractual handover, provide:

- a clean, immutable handover commit/tag;
- known-good Node/npm/Rust versions;
- architecture and domain ownership map;
- lab versus product build explanation;
- runtime allowlist rules;
- synthetic test identities and fixtures only;
- test command matrix with expected counts;
- known flaky-test register;
- direct-Supabase migration inventory by domain;
- RLS parity evidence links;
- environment variable schema without secret values;
- staging and rollback runbooks;
- performance baseline and budgets;
- prioritized backlog with owners and acceptance tests;
- dependency and license review completed by the vendor;
- no production credentials, real user data, signing keys, or production provider configuration in the handover repository.

## Final readiness statement

The frontend is **ready for a controlled vendor engineering handover** and **not ready for a vendor production-release sign-off**.

The strongest assets are the regression suites, hybrid planning documents, lab isolation, and existing performance-oriented chat infrastructure. The principal risks are the missing full product build, incomplete provider-neutral migration, permissive TypeScript configuration, absent lint/quality ratchets, very large feature modules, and concentrated duplication in role, CSV import, cancellation, sponsor, settings, and chat orchestration flows.

The vendor should begin with the reproducible product baseline and quality ratchet before attempting broad refactors. This preserves current behavior while making future efficiency work measurable and safe.
