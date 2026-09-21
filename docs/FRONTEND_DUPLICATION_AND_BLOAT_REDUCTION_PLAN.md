# Frontend Duplication and Bloat Reduction Plan

## Purpose

This document is the controlling plan for the frontend refactor. Its objective is to produce a demonstrable reduction in frontend maintenance cost by:

1. reducing duplicated authored code;
2. shrinking the largest page and component files;
3. eliminating redundant orchestration rather than merely moving code;
4. reducing repeated queries, cache handling, rendering, and state management;
5. preserving current behavior, the hybrid Supabase/ICP architecture, and lab isolation.

Passing builds or extracting a helper does not count as success unless the agreed aggregate metrics improve. Dead-import cleanup is useful hygiene but is not a substitute for structural consolidation.

## Current execution status

- **Phase 0 complete:** the reproducible two-run baseline is recorded in
  [`docs/FRONTEND_DUPLICATION_BASELINE.md`](./FRONTEND_DUPLICATION_BASELINE.md).
- **Phase 1.1 complete:** pitch-board shared typed presentation extraction is
  implemented and verified. The two target layouts decreased from 3,891 to
  3,703 combined lines; counted authored duplication decreased from 17,582 to
  17,415 lines (5.3248% to 5.2710%). The targeted pair decreased from 41 to 34
  clone groups and from 884 to 753 duplicated lines.
- The intentionally separate orientation-specific pitch composition, sizing,
  coordinate, gesture, timer, sheet, native status-bar, and orientation
  behavior remains local to each layout.
- **Phase 1.2 complete:** mini-league admin/parent join-link card presentation
  is consolidated and verified. The target cards decreased from 758 to 486
  combined lines, and target duplicated lines decreased from 322 to 170 across
  17 to 11 clone groups. Aggregate authored duplication decreased from 17,415
  to 17,227 lines (5.2710% to 5.2138%). Role-specific authorization, queries,
  invite metadata, warnings, copy, and action adapters remain local.

## Architectural boundaries

All work under this plan must preserve these constraints:

- Supabase remains authoritative for existing, unported product workloads.
- ICP/local behavior remains explicit and must not silently fall back to Supabase.
- The fail-closed Supabase lab client remains disabled.
- Only files in `frontend/lab-runtime-files.json` may enter the lab runtime bundle.
- Intentionally isolated lab mirrors must not be merged merely to improve a duplication score.
- Route-specific offline, optimistic-send, realtime, entitlement, or ICP behavior stays local until contract equivalence is proved by tests.
- No production credentials, data, deployment wiring, OAuth, push, billing, or signing integrations are introduced.

## Success measures

One reproducible baseline command and configuration must be used throughout the program.

| Measure | Required outcome |
| --- | --- |
| Authored duplicated lines | Decrease after every work package |
| Authored duplication percentage | Decrease after every work package |
| Total authored lines | Must not increase unless justified by tests or required adapters |
| Lines in each targeted large page/component | Material decrease |
| Duplicate network/query implementations | Decrease |
| Duplicate cache invalidation implementations | Decrease |
| Product bundle and route chunk sizes | No regression; improve where lazy boundaries permit |
| Product TypeScript diagnostics | No increase |
| Lab and legacy test results | No regression |
| Lab isolation checks | Remain green |

Generated bindings, generated Supabase types, tests, build output, and intentional lab mirrors must be excluded consistently from authored-code metrics. Historical percentages must not be compared unless scanner version, options, thresholds, extensions, paths, and exclusions are identical.

## Runtime performance program targets

Large-file decomposition and runtime performance are separate from duplication
reduction. Moving code into additional statically imported files may improve
navigation and ownership, but it does not qualify as a runtime improvement.
Runtime claims require measured loading, rendering, data-access, or dependency
improvements.

The Phase 0 product baseline is:

| Measure | Phase 0 baseline | Program target |
| --- | ---: | ---: |
| Initial product JavaScript chunk | 1,112,736 bytes | Below 800 KB; stretch target below 700 KB |
| Total product JavaScript | 8,878,193 bytes | Reduce by 10-20% where dependency and route splitting permit |
| Ten largest runtime files | 3,088-5,585 lines each | Reduce each targeted file by 30-50% |
| Ordinary route-page size | Several routes exceed 3,000 lines | Move toward a 1,500-line ceiling |
| Ordinary presentation-component size | Several components exceed 2,000-5,000 lines | Move toward an 800-1,000-line ceiling |
| Requests, subscriptions, renders, and cache invalidations | Not yet consistently measured | Establish per-route baselines and eliminate confirmed redundancy |

The initial-chunk target must not be achieved by moving required startup code
into another chunk that is immediately requested. The total-JavaScript target
must not be achieved by disabling or dropping required behavior.

### What qualifies as a runtime improvement

- optional dialogs, editors, admin panels, exports, charts, media tooling, and
  specialist modes load only when opened;
- route-specific code does not enter the root dependency graph unnecessarily;
- duplicated queries, profile hydration, subscriptions, cache entries, and
  invalidations are consolidated;
- expensive filtering, sorting, and projection are not repeated during
  unrelated renders;
- list updates rerender the smallest practical subtree;
- provider-neutral adapters avoid loading inactive provider implementations
  where the architecture permits;
- bundle, request, subscription, render, or interaction measurements improve
  against the recorded baseline.

### What does not qualify

- splitting one large source file into several files that are all statically
  imported by the same route;
- adding `useMemo`, `useCallback`, or `React.memo` without profiling evidence;
- moving code to a barrel export that pulls the same dependency graph into the
  initial bundle;
- replacing a straightforward large component with a more complex generic
  abstraction while runtime behavior remains unchanged;
- reporting total build size as initial-load cost without distinguishing lazy
  route chunks from startup chunks.

### Runtime acceptance evidence

Every large-page or performance package must record, where applicable:

1. initial and affected route chunk sizes before and after;
2. whether newly extracted modules are static or lazy boundaries;
3. requests made during initial route load and the tested interaction;
4. realtime subscriptions opened and closed;
5. query-cache entries and invalidations caused by common mutations;
6. render counts for the route shell and affected large lists;
7. interaction latency for the targeted expensive workflow;
8. total lines and responsibility boundaries in the original route/component;
9. confirmation that behavior, provider selection, and lab isolation remain
   unchanged.

An extraction can be accepted for maintainability without a runtime gain, but
it must be labelled honestly and must still reduce file size or duplication.
It must not be counted toward the runtime targets.

## Definition of done for each work package

Every package must provide:

1. the clone or bloat area targeted;
2. baseline duplicated-line and combined-line counts;
3. characterization tests covering behavioral differences before consolidation;
4. the implementation;
5. an identical-scope duplication scan afterward;
6. combined line-count and duplication deltas;
7. relevant targeted tests;
8. product typecheck;
9. guarded product build when runtime imports change;
10. lab isolation validation when runtime boundaries are involved;
11. a note explaining behavior intentionally left separate.

A package is rejected if it:

- moves duplication without reducing it;
- increases aggregate duplicated lines or percentage;
- creates a shared abstraction more complex than the duplicated implementations;
- hides different behavior behind `as any`, route-name switches, or excessive boolean props;
- merges contracts that are not behaviorally equivalent;
- weakens provider selection or lab isolation;
- broadens the runtime allowlist before the domain is provider-neutral and isolated.

## Phase 0 - establish an honest baseline

Before further structural refactoring:

- pin and document the duplication scanner version;
- document the exact command, minimum tokens/lines, languages, paths, and exclusions;
- run the baseline twice and require identical results;
- record authored source lines, duplicated lines, clone groups, and percentage;
- record line counts for the largest 25 pages/components;
- record product bundle and route chunk sizes;
- record current product TypeScript diagnostics;
- classify each leading clone as:
  - true removable duplication;
  - intentionally isolated lab duplication;
  - generated code;
  - test duplication;
  - similar-looking but behaviorally different code.

The immutable starting report must be retained as evidence. Existing ratchets may be retained only after their scope and baseline are reconciled with this phase.

**Exit gate:** no structural package starts until the baseline reproduces twice with identical results.

## Phase 1 - high-impact, lower-risk presentation consolidation

### 1.1 Pitch board portrait/landscape layouts

Target: `PitchBoardLandscapeLayout.tsx` and `PitchBoardPortraitLayout.tsx`.

Extract shared:

- board chrome and loading states;
- dialog composition;
- score/timer panels;
- player and bench presentation;
- repeated controls and action menus;
- shared conditional sections.

Keep local:

- orientation-specific layout composition;
- sizing and coordinate behavior;
- gesture behavior where it differs;
- native orientation/status-bar behavior.

Do not combine the two files into a giant mode component. Prefer small shared presentation sections and typed props.

### 1.2 Mini-league join-link cards

Target: admin and parent join-link cards.

Create one typed presentation component with role-specific copy, permissions, link generation, and actions supplied through a narrow configuration or adapter. Preserve role-specific authorization outside the shared view.

### 1.3 Sponsor strips and carousels

Target overlapping event, media, message, chat-thread, and club sponsor presentations.

Create:

- one sponsor-slot presentation primitive;
- placement descriptors for dimensions and copy;
- a provider-neutral read adapter where query contracts are genuinely equivalent.

Do not centralize placement-specific authorization or tracking unless contracts match.

### 1.4 CSV import dialogs

Target member and mini-league CSV import dialogs.

Share:

- file/drop-zone UI;
- parser-result presentation;
- preview table shell;
- error and warning summary;
- template download behavior.

Keep domain row validation, mappings, and mutations behind typed adapters.

**Phase gate:** each detected target clone is eliminated or materially reduced, combined source lines fall, and presentation behavior is covered by tests.

## Phase 2 - repeated page variants and self-duplication

### 2.1 Create/Edit Event

Extract a shared event form with:

- typed form values;
- validation schema;
- field sections;
- default-value and record-to-form mapping;
- common scheduling and targeting presentation.

Keep create and update mutation adapters separate. Keep edit-only recurrence, existing-record reconciliation, and destructive behavior explicit.

Avoid a form dominated by `isEditMode` conditionals; use composable optional sections and typed submit adapters.

### 2.2 Club/Pro upgrade pages

Share plan presentation, feature comparison, pricing, loading/error states, and checkout-state UI. Keep product type, entitlement, eligibility, and checkout initiation in typed page adapters.

### 2.3 Vault self-duplication

Consolidate:

- repeated folder/file list rendering;
- repeated row actions and confirmations;
- repeated empty/loading states;
- repeated cache invalidation paths;
- repeated storage breakdown projection.

Use one typed renderer/controller boundary while retaining provider-specific repository behavior.

### 2.4 Messages self-duplication

Consolidate:

- inbox section shells;
- preview presentation;
- loading, empty, and error states;
- repeated filters and ordering;
- repeated dialog orchestration where contracts match.

**Phase gate:** create/edit and section-specific differences have regression tests; targeted page line counts and aggregate duplication both decrease.

## Phase 3 - role and membership surfaces

Complete the role-page consolidation rather than stopping at a shared reducer.

Share between club and team role management:

- roster presentation;
- requests tab and badge;
- member cards;
- role badge presentation;
- remove-role confirmation shell;
- loading and empty states;
- common mutation feedback.

Keep separate typed adapters for:

- club/team queries;
- permissions;
- role-removal constraints;
- point-reset behavior;
- cache keys and scoped invalidation.

Also consolidate repeated child, guardian, and member invite form sections across team and mini-league flows. Do not create one oversized generic membership component; use focused form sections and typed scope adapters.

**Phase gate:** the role-page clone is materially reduced, combined page size falls, and club/team authorization behavior remains independently tested.

## Phase 4 - chat convergence by contract

Chat is the largest high-risk duplication family. It must be converged incrementally, not rewritten into one universal page.

### 4.1 Build a route behavior matrix

For Team, Club, Group, Direct, Broadcast, and Club Admin chat, document:

- message table and primary key;
- read-receipt contract;
- realtime channel and payload;
- optimistic-send lifecycle;
- offline queue behavior;
- temporary-ID reconciliation;
- attachment and image flow;
- mention behavior;
- reply, reaction, edit, and delete capabilities;
- entitlement and role checks;
- ICP/local behavior;
- cache keys and invalidation;
- navigation and message-jump behavior;
- failure and retry behavior.

Every matrix row must cite tests or source evidence. Visual similarity is insufficient.

### 4.2 Extract proven-equivalent presentation layers

Proceed in this order:

1. message-list shell and virtualization;
2. loading, empty, reconnecting, and failure states;
3. search and history navigation UI;
4. reply/edit/reaction presentation;
5. composer presentation with capabilities supplied as typed data;
6. route header and shared actions.

These layers must not own provider-specific transport or cache mutations.

### 4.3 Extract proven-equivalent controller primitives

Only after characterization tests:

1. optimistic cache primitives;
2. temporary-ID reconciliation;
3. realtime lifecycle primitives;
4. offline queue primitives;
5. failed-send restoration;
6. provider-neutral transport interfaces.

Start with the closest route pair identified by the current clone report. Replace duplicated controller logic only when inputs, outputs, retry behavior, cache behavior, failure behavior, and ICP behavior match.

### 4.4 Converge route controllers pair by pair

Retain small route adapters for genuine differences. Do not use a six-route switch, broad `any` types, or dozens of capability booleans to manufacture superficial reuse.

**Phase gate:** combined chat-page lines and duplicated chat lines decrease materially while route-specific offline, optimistic, realtime, entitlement, and ICP tests remain green.

## Phase 5 - runtime efficiency and redundant data work

Line-count reduction alone is insufficient. Profile targeted routes for:

- repeated requests for the same profile/team/club data;
- duplicate profile hydration;
- duplicate subscriptions to the same channel;
- repeated filtering or sorting during render;
- inconsistent query keys producing parallel cache entries;
- family-wide invalidation where scoped updates suffice;
- derived state stored redundantly;
- heavy dialogs and modules imported eagerly;
- avoidable parent renders caused by unstable objects and callbacks.

Record before/after evidence for affected routes:

- request counts;
- subscription counts;
- render counts;
- cache entries and invalidations;
- route chunk size;
- interaction latency where measurable.

Do not introduce memoization indiscriminately. Apply it only where profiling identifies repeated expensive work or unstable identity causes meaningful rerenders.

**Phase gate:** the initial product JavaScript chunk is below 800 KB, total
product JavaScript has decreased by 10-20% where safe dependency boundaries
exist, the targeted large runtime files have decreased by 30-50%, and each
accepted runtime claim is supported by the applicable evidence above. Any
target that cannot safely be met must be documented with the dependency graph,
profile, or behavior constraint that prevents it; it must not be silently
reclassified as complete.

## Phase 6 - dead code and dependency cleanup

After structural convergence:

- use compiler/linter tooling to remove unused imports, variables, types, and unreachable helpers;
- identify unreferenced components left by consolidation;
- remove parallel helpers with the same contract;
- inspect duplicate dependency copies and bundler chunks;
- preserve imports required by source-inspection guard tests or module side effects;
- re-run full product, lab, and isolation validation.

This phase is hygiene and final trimming. It must not be reported as the primary architectural duplication improvement.

## Execution order

1. Reproducible baseline and clone classification.
2. Pitch board portrait/landscape presentation consolidation.
3. Mini-league join-link consolidation.
4. Sponsor-strip consolidation.
5. CSV import consolidation.
6. Create/Edit Event shared form.
7. Upgrade-page consolidation.
8. Vault self-duplication.
9. Messages self-duplication.
10. Full role/membership surface convergence.
11. Chat behavior matrix and characterization tests.
12. Chat presentation convergence.
13. Chat controller/transport convergence pair by pair.
14. Runtime data-fetch, subscription, render, and bundle profiling.
15. Dead-code and dependency cleanup.
16. Final metrics, regression suite, and vendor handover report.

## Commit and reporting policy

- Use small commits aligned to one work package.
- Do not mix unrelated cleanup into a structural consolidation commit.
- Report before/after duplicated lines, combined lines, and relevant runtime metrics for each package.
- Do not claim the overall refactor is improved merely because targeted tests pass.
- Do not refresh a baseline to conceal a regression. Baseline updates require a documented scope/tooling change or a verified improvement checkpoint.
- Preserve unrelated worktree changes.
- Do not push without explicit authorization.

## Final completion criteria

The refactor program is complete only when:

- all accepted work packages meet their individual gates;
- authored duplicated lines and percentage are materially below the reconciled starting baseline;
- the largest targeted pages/components have materially smaller, clearer responsibilities;
- repeated queries, subscriptions, invalidations, and expensive renders have measured reductions where identified;
- product type diagnostics have not increased;
- product build, lab tests, legacy tests, quality checks, and isolation checks pass;
- intentional route/provider differences are documented rather than hidden;
- the vendor handover audit is updated with reproducible final evidence.
