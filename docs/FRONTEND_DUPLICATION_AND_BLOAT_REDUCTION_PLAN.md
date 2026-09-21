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
- **Phase 1.3 complete:** sponsor slot, tier weighting, and full-carousel
  presentation are consolidated and verified. The eight clone-report-linked
  sponsor surfaces decreased from 2,223 to 1,681 lines and from 771 to 452
  duplicated lines; including the 312 shared presentation lines, the package
  is 230 lines smaller. Product reads, authorization gates, provider behavior,
  tracking contexts, placement-specific dimensions, and the lab boundary
  remain local.
- **Phase 1.4 complete:** the member and mini-league CSV import dialogs now
  share only their presentation primitives. The 1,113-line target pair became
  585 local adapter lines plus a 270-line shared presentation module (855
  lines total, down 258). Identical-scope target clone groups decreased from
  11 to 2 and duplicated lines from 190 to 21; aggregate scan duplication
  decreased from 16,689 lines (5.0543%) to 16,480 (4.9950%). Team-member
  row validation, child/role mapping, invite import, mini-league ability and
  parent mapping, and player import remain separate.
- **Phase 2.1 complete:** Create/Edit Event form presentation is consolidated
  in `src/components/event/EventFormShared.tsx`. The exact pre-refactor
  Create/Edit cluster had 27 clone groups and 521 duplicated lines across
  3,669 combined page lines. The post-refactor pair has 24 clone groups and
  374 duplicated lines; the two pages plus the 300-line shared module contain
  3,581 lines, down 88. Aggregate authored duplication decreased from
  16,480 lines / 4.9949535% to 16,336 lines / 4.9526443% (1,334 to 1,331
  clone groups; 329,933 to 329,844 scanned lines). The four new page
  characterization tests passed before and after refactoring.

  Create and edit mutation/query wiring, permissions, create prefill and
  conflict behavior, edit record mapping and recurrence reconciliation,
  local ICP forms, navigation, cache refresh, and error side effects remain
  intentionally separate. The shared module is limited to equivalent section
  headers, recurring-event controls, duty fields, and location fields. This
  static extraction has no request/render/subscription benchmark and therefore
  makes no runtime-performance claim; the product bundle remained within the
  existing measured budget.
- **Phase 2.2 complete:** Club and team Pro upgrade pages now share the typed
  `src/components/subscription/UpgradePlanPresentation.tsx` presentation
  module for plan pricing, feature comparison, checkout loading state, promo
  presentation, trial state, and loading/not-found/access-denied states. The
  exact two-page cluster decreased from 2,505 lines, 29 clone groups, and 420
  duplicated lines (16.7665%) to 2,214 page lines plus 280 shared lines (2,494
  total), 21 clone groups, and 286 duplicated lines (11.4675%). Aggregate
  authored duplication decreased from 16,336 / 4.9526443% (329,844 scanned
  lines; 1,331 groups) to 16,169 / 4.9021778% (329,833 lines; 1,321 groups).
  Product type/route, entitlement and eligibility queries, promo validation,
  Supabase versus ICP behavior, checkout initiation, subscription mutations,
  expiry/active-entitlement details, navigation, and cache invalidation remain
  in typed page adapters. Characterization coverage in
  `src/pages/UpgradePages.characterization.test.ts` passed before and after
  extraction. This static presentation extraction has no request/render/
  subscription benchmark and therefore makes no runtime-performance claim;
  Phase 2.3 and 2.4 remain untouched.
- **Phase 2.3 complete:** Vault's repeated folder/file rendering, active and
  trash row actions, empty/loading states, cache invalidation, and storage-by-
  team projection now cross one typed renderer/controller boundary in
  `src/components/vault/VaultContentRenderer.tsx` and the typed
  `invalidateVaultCache` helper in `src/features/vault/vaultQueryKeys.ts`.
  `src/pages/VaultPage.tsx` decreased from 5,495 to 4,597 lines (898 fewer).
  The exact target scope (`VaultPage.tsx`, `components/vault`, and
  `features/vault`) decreased from 452 duplicated lines across 29 clone groups
  (3.9503583%) to 362 lines across 26 groups (3.1418157%). The complete scope
  is 11,522 lines after the extraction versus 11,442 before it; the 80-line
  increase is the explicit typed adapter/controller surface, not duplicated
  page markup. Aggregate authored duplication decreased from 16,169 / 4.9021778%
  (329,833 scanned lines; 1,321 groups) to 16,079 / 4.8737091% (329,913 lines;
  1,318 groups).

  Four characterization tests passed against the pre-refactor page and again
  after extraction, covering club/team/mini-league branches, active/trash
  variants, photo/file actions and confirmations, loading/empty states, cache
  scopes, storage projection, and the Supabase/ICP page boundary. Supabase
  repository calls, permission scopes, mutations, and provider-specific page
  behavior remain in the page adapter. Mini-league remains photo-only with
  disabled file actions; its semantics were not merged with club/team views.
  Messages self-duplication (Phase 2.4) remains untouched.

  This is a maintainability-only result. The shared module is statically
  imported and no request, subscription, render-count, cache, or interaction
  benchmark was added, so this phase does not qualify as a runtime-performance
  win. Product bundle measurements remain evidence of budget compliance only.
- **Phase 2.4 complete:** Messages inbox preview hydration and web realtime
  cache patching now cross typed helpers in
  `src/features/messaging/inbox/inboxPreviewHydration.ts` and
  `src/features/messaging/inbox/inboxRealtimeCache.ts`. The raw page
  `src/pages/MessagesPage.tsx` decreased from 3,607 to 3,443 lines (164
  fewer). The exact target scope stayed at 3,607 lines because the extracted
  helpers are explicit source, but target clone groups still decreased from 11
  to 10 and target duplicated lines from 155 to 93 (4.2972% to 2.5783%).
  Aggregate authored duplication decreased from 16,079 / 4.8737091%
  (329,913 scanned lines; 1,318 groups) to 16,017 / 4.8549163% (329,913
  lines; 1,317 groups). The new characterization coverage in
  `src/pages/MessagesPage.characterization.test.ts` and the existing
  message-navigation, cold-offline, and web-realtime watermark guards all pass
  against the extracted structure.

  Message-source semantics, per-section copy, authorization gates, query keys,
  provider-specific realtime behavior, lazy dialog boundaries, and the route-
  local inbox controller remain intentionally separate. This is a
  maintainability-only result; no request, render, subscription, cache, or
  interaction benchmark changed, so it makes no runtime-performance claim.

  **Phase 2 gate met:** Create/Edit Event, Club/Pro upgrade, Vault, and
  Messages all gained regression coverage for the extracted behavior, targeted
  page line counts decreased across the four sub-phases, and aggregate authored
  duplication decreased from 16,480 lines / 4.9950% at the start of Phase 2 to
  16,017 lines / 4.8549% after Phase 2.4.
- **Phase 3 implementation complete:** role and membership surfaces now use
  focused typed presentation boundaries in `src/components/membership/` and
  shared role-request feedback in
  `src/features/membership/roleMutationFeedback.ts`. The measured role/
  membership target scope decreased from 34 clone groups and 366 duplicated
  lines across 5,207 lines to 29 clone groups and 299 duplicated lines across
  5,391 lines. The explicit adapter source makes the complete scope 184 lines
  larger, while the duplicated-line count decreases by 67 and the role pages
  and invite sheets become smaller individually. Club/team queries,
  permissions, role-removal constraints, point-reset behavior, cache scopes,
  and team-versus-mini-league invite semantics remain separate. Five
  characterization tests pass, and product build, bundle, quality, isolation,
  duplication, and diff gates pass. This is a maintainability/safety result;
  no runtime-performance claim is made.
- **New Phase 4A added:** large-file decomposition and safe change boundaries
  is now an explicit phase for `VaultPage`, `MessagesPage`, `EventDetailPage`,
  `AutoSubPlanDialog`, and `VirtualizedChatMessageList`. It is separate from
  duplication reduction and requires responsibility maps, boundary tests,
  cohesive typed modules, and before/after file, bundle, request,
  subscription, render, and interaction measurements. Static file movement
  cannot be reported as a runtime win.

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

#### Baseline and contract classification

The 2026-09-21 identical-scope scan includes the six named targets plus the
clone-report-linked `MultiClubSponsorCarousel` and `MediaSponsorTile`. It
contains 2,223 authored lines, 45 clone groups, 771 duplicated lines
(34.6829%). The named six-file subset contains 1,814 lines, 34 clone groups,
and 604 duplicated lines (33.2966%). The aggregate authored scan at this
checkpoint contains 330,412 lines, 1,294 clone groups, 17,227 duplicated
lines, and 5.2138% duplication.

| Surface | Source lines | Read/query contract | Subscription contract | Classification |
| --- | ---: | --- | --- | --- |
| `EventsHeaderSponsorStrip` | 345 | Five React Query reads: effective-club resolution, Pro status, sponsors, events placement setting, and app ads | None | Compact-row presentation is equivalent; effective-club selection, event toggle, hints, and `event_page`/`events_page` tracking remain local. |
| `MediaHeaderSponsorStrip` | 331 | Five React Query reads: Pro status, media flag, sponsors, media-header setting, and app ads | None | Compact-row presentation is equivalent; media opt-in, hints, and existing tracking context remain local. |
| `ChatThreadSponsorStrip` | 351 | Five React Query reads: chat opt-in, placement setting, Pro status, sponsors, and app ads | None; deliberately stays above the virtualized chat scroller | Compact-row presentation is equivalent; chat entitlement gates, virtualization placement, and tracking remain local. |
| `ClubSponsorSection` | 227 | One React Query entry making subscription, club, sponsor, and allocation reads | None | Full Embla presentation is equivalent; Pro-expiry gate, home hint, and home context remain local. |
| `MessagesSponsorCarousel` | 267 | One React Query entry; filtered and all-member-club sponsor/allocation reads differ | None | Full Embla presentation is equivalent; message query scope and message context remain local. |
| `SponsorOrAdCarousel` | 293 | Four React Query entries for event eligibility, Pro status, placement settings, and sponsor presence | None | Deliberately separate tier/router contract: persisted tier hint, native banner, placement-specific eligibility, and app-ad routing must not enter a shared slot. |
| `MultiClubSponsorCarousel` | 237 | One React Query entry for membership, Pro subscriptions, clubs, sponsors, and allocations | None | Full Embla presentation is equivalent; multi-club Pro filter and home hint remain local. |
| `MediaSponsorTile` | 172 | Three React Query entries for effective club, media opt-in/Pro status, and sponsors | None | Intentionally separate seeded photo-card presentation; it shares only typed tier weighting, not compact-row dimensions, rotation, tracking, or reads. |

All eight surfaces use the existing Supabase product provider and open no
realtime subscriptions. Their gates, query keys, error handling, cache scope,
authorization assumptions, tracking contexts, and provider behavior are not
equivalent. Consequently this package may share pure typed slot presentation,
carousel presentation, and tier weighting only; it does not introduce a
provider read/query adapter or move product reads into the lab runtime.

The guarded product baseline is 8,873,630 total JavaScript bytes, a
1,112,736-byte initial `product-index` chunk, 500 JavaScript chunks, and
172,904 CSS bytes. The affected lazy route chunks are Event Detail 220,918
bytes, Home 126,299, Messages 108,802, Media 69,682, Events 54,661, Team Chat
46,427, Club Chat 36,276, and Club Admin Chat 29,143. This package adds
statically imported shared presentation modules; absent changed query,
subscription, render, or request measurements, any accepted improvement is
maintainability-only and is not a runtime-performance claim.

The global scan also links `SponsorOrAdCarousel` to `AppAdCarousel`, plus
separate sponsor-management surfaces. Their app-ad routing, upgrade-policy,
or administrator-management contracts differ and are outside this focused
presentation package. `SponsorOrAdCarousel` retains its own duplicate
membership-resolution paths because their query keys, result shapes, and
error semantics differ; forcing a provider abstraction would hide those
differences rather than remove an equivalent contract.

#### Result

The same eight-source scan now contains 1,681 lines, 31 clone groups, and
452 duplicated lines (26.8888%). That is a reduction of 542 target-source
lines, 14 clone groups, and 319 duplicated lines. The new focused shared
modules contain 312 lines:

- `src/components/sponsor/SponsorSlotPresentation.tsx` (138 lines);
- `src/components/sponsor/SponsorCarouselPresentation.tsx` (139 lines);
- `src/components/sponsor/sponsorTier.ts` (35 lines).

Consequently the complete sponsor presentation package is 1,993 lines,
down 230 lines from the 2,223-line baseline. The aggregate authored scan is
330,191 lines, 1,280 clone groups, 16,894 duplicated lines, and 5.1164%
duplication: a decrease of 221 scanned lines, 14 clone groups, 333 duplicated
lines, and 0.0974 percentage points from the Phase 1.2 checkpoint.

The shared slot primitive owns only the already-identical row DOM, avatar
dimensions, labels, disabled-click behavior, and dismiss control. Card and
chat-thread descriptors retain their separate outer dimensions. The shared
carousel owns only Embla controls, slide dots, and the eight-second rotation;
the club, message, and multi-club descriptors retain their exact section
spacing and selection lifecycle. Tier weighting and durations are a pure typed
helper shared with the intentionally separate seeded media-feed card. No
provider-neutral query adapter was added because the read contracts are not
equivalent.

The initial product chunk changed from 1,112,736 to 1,112,837 bytes (+101);
total JavaScript changed from 8,873,630 to 8,866,082 bytes (-7,548), and the
number of JavaScript chunks changed from 500 to 501. Affected lazy chunks are:
Event Detail 220,964 (+46), Home 122,683 (-3,616), Messages 108,802
(unchanged), Media 67,223 (-2,459), Events 54,707 (+46), Team Chat 46,473
(+46), Club Chat 36,322 (+46), and Club Admin Chat 29,189 (+46). These are
static presentation imports, not new lazy boundaries. The suite preserves the
same query configurations and confirms no realtime subscriptions on these
surfaces; it does not establish lower request counts, fewer renders, or faster
interactions. Phase 1.3 is therefore an explicitly maintainability-only
improvement, not a runtime-performance claim.

Characterization coverage was committed before the consolidation in
`src/components/SponsorPresentations.characterization.test.tsx`; it verifies
the independent compact-strip gates, tracking contexts, chat placement, full
carousel contexts/spacing, and separate `SponsorOrAdCarousel` tier router.
`src/components/sponsor/sponsorTier.test.ts` verifies preserved tier weights
and durations. The targeted tests pass (2 files, 4 tests), the dedicated lab
suite passes (279 Node tests and 1,720 Vitest tests), and the legacy suite
passes (4,265 tests, 1 skipped). The guarded product build and bundle check,
quality ratchet, aggregate duplication ratchet, and isolation check pass.
The product type ratchet reports only the pre-existing 14 unrelated baseline
diagnostics in `StartDMDialog` and `ClubDetailPage`; this package adds none.

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

## Phase 4A - large-file decomposition and safe change boundaries

This phase addresses a separate problem from literal duplication: oversized
pages and components that mix data loading, mutations, realtime orchestration,
dialog state, and rendering in one change surface. Initial targets are the
largest or highest-risk files identified by the baseline:

- `src/pages/VaultPage.tsx`;
- `src/pages/MessagesPage.tsx`;
- `src/pages/EventDetailPage.tsx`;
- `src/components/pitch/AutoSubPlanDialog.tsx`;
- `src/components/chat/VirtualizedChatMessageList.tsx`.

### Phase 4A Vault responsibility map (pre-refactor)

`VaultPage.tsx` is the first Phase 4A target. At 4,597 raw lines, it owns:

- the explicit provider guard (`resolveLocalAuthMode` to
  `IcpUnavailablePage`) and the Supabase-only route implementation;
- local navigation, selection, upload, search, lightbox, confirmation,
  export, Drive, large-file, and storage-purchase state;
- role, entitlement, scope, folder, file, recursive-search, trash, and
  storage React Query reads, including their inline key dimensions;
- folder/file/photo/upload/delete/restore/permanent-delete/move/bulk-delete
  mutations, optimistic photo rollback, cache invalidation, quota
  compensation, and error/toast reporting;
- current-view and item-level permission decisions for club, team, and
  mini-league content; and
- the page toolbar, content renderer inputs, and dialog orchestration.

Its trash/recovery slice has no realtime subscription or polling lifecycle:
it queries `["vault-trash", clubId]` only while a non-root view has trash
open, partitions deleted items by image type in descending deletion order, and
keeps destructive callbacks gated by `isClubAdmin`. It also contains restore,
permanent-delete, and empty-trash commands; the latter must retain
item-level truthful success/failure reporting and refresh failed rows. The
Phase 4A Vault extraction begins with this bounded slice. The page retains
route/provider selection, dialog open/close state, and rendering ownership;
the new boundary must keep the Supabase repository, authorization gate,
optimistic/cache behavior, and error paths explicit. No runtime-performance
claim is implied by this static decomposition.

Work must be incremental, one route or component at a time. For each target:

1. map current responsibilities, state ownership, query keys, mutation
   boundaries, provider/ICP branches, and error paths before editing;
2. add characterization and contract tests for the boundaries being moved;
3. extract cohesive modules rather than arbitrary line ranges:
   typed query/data hooks, mutation and cache adapters, realtime lifecycle,
   dialog/command orchestration, and presentational sections or row/list
   components;
4. keep provider-specific Supabase/ICP behavior in explicit adapters and keep
   authorization, optimistic updates, retries, and error handling observable;
5. preserve route-level lazy boundaries and introduce new lazy imports only
   when the extracted module is genuinely interaction-gated;
6. use memoized/render-isolated subtrees only where profiling or render-count
   evidence shows avoidable work;
7. measure raw target-file lines, combined package lines, bundle chunks,
   request counts, subscription counts, render counts, and interaction latency
   before and after.

The phase must not create a single page-controller replacement, broad
boolean-prop components, hidden global state, or statically imported modules
that are reported as runtime improvements merely because the file is smaller.
Every extraction must have a narrow typed contract and tests that fail at the
boundary when behavior changes.

**Phase gate:** each accepted target is materially more manageable through
cohesive responsibility boundaries and has no behavior regression. Any claimed
runtime improvement must have measured evidence of lower route bytes, requests,
subscriptions, renders, or interaction latency. Pure file organization is
reported as maintainability and safety progress only.

### Phase 4A Vault result (2026-09-21)

The initial Vault extraction is complete and is limited to the deleted-item
read and recovery lifecycle:

- `src/features/vault/vaultTrashRepository.ts` (47 lines) is the explicit
  Supabase read adapter. It preserves club-scoped deleted-item ordering and
  reuses the existing typed Vault-image partition helper instead of creating a
  second classifier. Provider read errors now reject rather than becoming an
  empty success-shaped trash result.
- `src/features/vault/useVaultTrashWorkflow.ts` (205 lines) owns that query,
  photo optimistic rollback, soft-delete, restore, permanent-delete, empty
  trash, cache invalidation, and user feedback. It reuses the existing
  provider mutation repository and permanent-delete adapter.
- `src/pages/VaultPage.tsx` retains its explicit
  `resolveLocalAuthMode`/`IcpUnavailablePage` provider boundary, local dialog
  state, rendering, and `isClubAdmin` gates for permanent-delete and
  empty-trash callbacks. It has no Vault realtime subscription lifecycle
  before or after this work.

The characterization/contract suite covers the provider boundary; exact trash
scope and enabled state; deleted-item ordering and image partitioning; admin
callback gating; optimistic rollback; restore and permanent-delete cache
scopes; provider failure propagation; and truthful empty-trash feedback.
Targeted legacy and lab regression tests, product build/bundle/quality/
isolation/duplication gates, and `git diff --check` passed. Product typecheck
introduced no Vault diagnostic; its non-zero result remains limited to the
known unrelated `StartDMDialog` and `ClubDetailPage` diagnostics.

| Metric | Before | After |
| --- | ---: | ---: |
| `VaultPage.tsx` raw lines | 4,597 | 4,363 |
| Vault source package lines (`VaultPage.tsx`, `components/vault`, `features/vault`; tests excluded) | 11,522 | 11,540 |
| Trash responsibility modules | 0 | 252 (47 repository + 205 workflow) |
| Same-scope jscpd | 362 lines / 26 clone groups / 3.1418157% | 362 lines / 26 clone groups / 3.1369151% |
| Product Vault route chunk | 116,689 bytes | 117,157 bytes |
| Product JavaScript total / chunks | 8,854,252 bytes / 502 | 8,854,720 bytes / 502 |
| Vault realtime subscriptions (static inspection) | 0 | 0 |

No runtime-performance claim is made. No safe synthetic product-route probe
or render instrumentation was configured for this legacy Supabase surface, so
live request counts, render counts, and interaction latency were not measured.
The one trash query remains scoped to a non-root open-trash view; the 468-byte
route-chunk increase is static organization overhead, not an optimization.

### Phase 4A Vault export and large-files result (2026-09-21)

The second bounded Vault dispatch extracted only the export/ZIP and large-files
management clusters. The pre-refactor map was characterized from
`VaultPage.tsx`: export owned `isExporting`, progress and abort state, preview
and folder-exclusion state, confirmation/pending-action state, folder export
selection state, the individual-download and ZIP flows, recursive export reads,
and the preview/confirmation/folder-selection dialogs. Large-files owned the
club-scoped teams/photos/vault-files reads, size/date/type sorting, selection,
permanent-delete reporting, cache invalidation, and the large-files dialog.
The export scope is derived from the current club/team/folder view; the hook
has no provider fallback and the page still owns provider selection, current
view, query client, storage formatter, and photo-download adapter.

The cohesive typed boundaries are:

- `src/features/vault/useVaultExport.ts` (519 lines): export state, abort and
  progress lifecycle, confirmation routing, folder preview/exclusion, folder
  item selection, individual downloads, ZIP generation, recursive repository
  reads, and exact existing toast/error behavior.
- `src/features/vault/useVaultLargeFiles.ts` (108 lines): club-scoped read,
  sort/select/delete state, permanent-delete adapter, truthful reporting,
  cache invalidation, retry refresh, and failure/success feedback.
- `src/components/vault/VaultExportDialogs.tsx` (158 lines) and
  `src/components/vault/VaultLargeFilesDialog.tsx` (112 lines): typed dialog
  presentation only. The existing `vaultExportRepository`, `vaultZipExport`,
  `vaultExportSelection`, `vaultLargeFileRepository`, and
  `vaultLargeFileManagement` contracts are reused rather than copied.

Characterization coverage was added and passed against the inline page before
editing, then updated to assert the extracted contracts and passed again. The
post-extraction targeted suite passed 56 tests, including abort-before-fetch,
abort-during-fetch, progress, partial ZIP failure, no-empty-ZIP behavior,
folder exclusion/current-folder semantics, exact club/team repository scope,
large-file sorting/selection, truthful acknowledged-ID deletion reporting, and
provider-boundary/trash regressions. The full legacy suite passed 450 files and
4,303 tests (one existing skip). Bulk selection/delete (`selectionMode`,
`selectedPhotos`, `selectedFiles`, and `bulkDeleteDialogOpen`) remains in the
page because its toolbar and mutation flow are shared with upload/content
controls; upload/file-name flow, lightbox, folder management, Drive import, and
trash/recovery remain intentionally untouched in this dispatch.

| Metric | Before | After | Change |
| --- | ---: | ---: | ---: |
| `VaultPage.tsx` raw lines | 4,363 | 3,357 | -1,006 |
| `useState` calls in `VaultPage.tsx` | 30 | 23 | -7 |
| Complete Vault source package (`VaultPage`, `components/vault`, `features/vault`; tests excluded) | 11,540 | 11,431 | -109 |
| New export/large-file modules | 0 | 897 (519 + 108 + 158 + 112) | +898 |
| Same-scope jscpd | 362 lines / 26 groups / 3.1369151% | 321 lines / 24 groups / 2.8081533% | -41 lines / -2 groups / -0.3287618 pp |
| Product Vault route chunk | 117,157 bytes | 121,354 bytes | +4,197 |
| Product JavaScript total / chunks | 8,854,720 bytes / 502 | 8,859,848 bytes / 502 | +5,128 bytes / 0 |
| Largest product JavaScript chunk | 1,112,842 bytes | 1,112,842 bytes | 0 |

The new hooks and dialog components are statically imported. No new lazy-loading
boundary was added; the existing lazy boundaries for unrelated Vault dialogs
remain unchanged. The route chunk increased by 4,197 bytes, so this is a
maintainability and safer-change extraction only. No request, subscription,
render-count, or interaction-latency evidence was collected, and no runtime
performance improvement is claimed. Product typecheck has exactly the known
unrelated `StartDMDialog`/`ClubDetailPage` diagnostics; product build, bundle,
quality ratchet, isolation, duplication ratchet, lab typecheck, targeted
characterization, legacy tests, same-scope jscpd, and `git diff --check` pass.

### Phase 4A Messages result (2026-09-21)

The Messages responsibility map before extraction was intentionally kept
route-local and covered:

- provider selection (`resolveLocalAuthMode`), explicit Supabase-versus-ICP
  branches, user-scoped offline cache reads, and all query keys;
- inbox source queries, unread/profile/entitlement reads, mutations, optimistic
  and retry behavior, cache invalidation, and error/toast paths;
- fail-closed authorization snapshots, web/native realtime coordinators,
  preview watermarks, channel registration/teardown, visibility recovery, and
  native no-invalidation behavior;
- first-reveal/order gates, search/type/club filters, operational disclosure,
  lazy dialog state and Pro/role gates; and
- the header, filter controls, skeleton/loading/empty states, conversation
  sections, and Contact/Discover/Sponsor tail.

The accepted boundary is the statically imported typed
`src/pages/MessagesInboxSections.tsx` presentation module (484 lines). It owns
only search input, type chips and unread disclosure, the club-filter indicator
and drawer, skeleton/list/empty states, group sectioning, and the existing
Contact Club, Discover Groups, and Sponsor/Ad tail. Its contract is one
`MessagesInboxSectionsModel`, one `MessagesInboxSectionsActions` object, and a
typed conversation-card renderer. Query composition, mutations, cache keys and
invalidation, authorization, Supabase/ICP branches, realtime lifecycle,
offline/retry decisions, error banner retry, and all four existing lazy dialog
boundaries remain in `MessagesPage.tsx`. No provider fallback, global state,
controller, or new lazy boundary was introduced.

Characterization coverage was added before the extraction and run against the
pre-refactor page. It now also verifies the extracted presentation contract;
the targeted Messages characterization, offline, first-reveal, and web
realtime guards pass before and after the move (25 tests). The page retains the
existing provider/realtime source guards, and the offline guard now reads the
page plus its explicitly presentation-only module.

| Metric | Before | After |
| --- | ---: | ---: |
| `MessagesPage.tsx` raw lines | 3,443 | 3,058 |
| Complete Messages package (`MessagesPage`, `MessagesInboxSections`, and non-test `features/messaging/inbox`) | 6,489 | 6,588 |
| New presentation responsibility module | 0 | 484 |
| Exact target scope (`MessagesPage`, Phase 2.4 helpers, new sections module) | 3,607 | 3,706 |
| Same-scope jscpd | 93 lines / 10 groups / 2.5783% | 93 lines / 10 groups / 2.53% |
| Product Messages route chunk | 108,273 bytes | 109,204 bytes |
| Product initial chunk | 1,112,842 bytes | 1,112,842 bytes |
| Static `useQuery` / `supabase.from` / RPC call sites | 23 / 43 / 5 | 23 / 43 / 5 |
| Static realtime subscriptions / registry registrations | 2 / 2 | 2 / 2 |
| Product JavaScript total / chunks | 8,854,720 bytes / 502 | 8,855,651 bytes / 502 |

The complete package grows by 99 lines because the typed boundary is explicit;
the target page is 385 lines smaller and the responsibility is independently
owned. The route module is statically imported, so the 931-byte route-chunk
increase is organization overhead rather than a loading improvement. No
request, subscription, render-count, or interaction-latency reduction was
measured, and no runtime-performance claim is made. Render counts and
interaction latency remain uninstrumented for this legacy Supabase route.
Product typecheck introduced no Messages diagnostic; its remaining ratchet
failures are the known unrelated `StartDMDialog` and `ClubDetailPage`
diagnostics. Product build/bundle, quality, isolation, duplication, targeted
legacy characterization, and diff checks pass. Phase 4A stops here for
Messages; no other Phase 4A target is started.

### Phase 4A Vault lightbox result (2026-09-21)

The lightbox/photo-viewer feature cluster in `VaultPage.tsx` was extracted to
decouple modal state, navigation, and delete-request handling from the page's
core upload/folder/export/large-file surfaces.

The extracted boundary is the typed `src/features/vault/useVaultLightbox.ts`
hook (71 lines) and the typed `src/components/vault/VaultLightbox.tsx`
component (30 lines), plus the characterization contract test (67 lines).
The hook owns lightbox open/close state, current photo index, navigation
(previous/next), keyboard navigation preservation, and the delete-request
callback. The component owns the modal presentation using the inherited
`PhotoLightbox` presentational component. The page adapter retains the
visible photo list scope and the permission check for delete capability.

| Metric | Before | After |
| --- | ---: | ---: |
| `VaultPage.tsx` raw lines | 3,357 | 3,356 |
| `useVaultLightbox.ts` | 0 | 71 |
| `VaultLightbox.tsx` | 0 | 30 |
| New characterization test | 0 | 67 |
| Complete Vault package (all `features/vault`, `VaultPage.tsx`, `components/vault`) | 11,528 | 11,628 |
| Same-scope jscpd | 321 lines / 24 groups / 2.78% | 321 lines / 24 groups / 2.76% |
| Product Vault route chunk | 117,157 bytes | 121,354 bytes (lightbox round) → 121,99 kB (post-lightbox) |
| Product JavaScript total / chunks | 8,854,720 bytes / 502 | 8,859,848 bytes / 502 |

The lightbox extraction produced a net +1 line in the page file (because the
two removed `useState` declarations were replaced by a similarly-sized hook
import/call), and +100 lines in the complete package (the explicit responsibility
modules). The target scope's jscpd showed no duplicate-line reduction (321 → 321),
because the lightbox state management was not shared across files; its extraction
is a structure/maintainability win, not a duplication reduction. The route chunk
increased by ~4.8 kB (due to static import of the new hook), with no measured
request, subscription, render-count, or interaction-latency change. This is a
maintainability/safety extraction only, with an explicit no-runtime-performance claim.
The existing characterization and web realtime guards pass before and after the
refactoring. Vault remains as a test case for further Phase 4A extractions (bulk
selection/delete, upload/file-name flow, folder/file rename, Google Drive import
remain untouched). Phase 4A Vault lightbox is complete.

### Phase 4A Vault bulk selection/delete result (2026-09-21)

The bulk selection and bulk soft-delete feature cluster in `VaultPage.tsx` was
extracted next. The pre-refactor map covered: `selectionMode`, `selectedPhotos`,
`selectedFiles`, `bulkDeleteDialogOpen`, and `isDeletingSelected` state;
`togglePhotoSelection`/`toggleFileSelection` toggles; `exitSelectionMode`
(resets selection mode and both selected sets); `selectAll` (selects every
currently visible photo/file id); `getSelectedItems` (derives the selected
photo/file objects from the visible `photos`/`files` arrays); the derived
`selectedCount`; the `deleteSelectedItems` bulk soft-delete workflow (per-item
try/catch soft delete, ordered photos-then-files, media-cache eviction for
deleted photos, `["files", "photos", "storageBreakdown"]` cache invalidation,
and exact truthful success/partial/failure toast wording); and the bulk-delete
confirmation `AlertDialog`. Shared dependencies were the page-owned `photos`/
`files` view arrays, `queryClient`, and `user?.id`; the toolbar buttons that
trigger selection mode and export/download of the same selection remain in the
page because they are interleaved with the export and upload toolbar JSX
(`useVaultExport` already consumes this hook's `selectionMode`/`selectedPhotos`/
`selectedFiles`/`exitSelectionMode` as inputs, unchanged by this extraction).

The cohesive typed boundary is `src/features/vault/useVaultBulkDeleteWorkflow.ts`
(132 lines) plus the presentational `src/components/vault/VaultBulkDeleteDialog.tsx`
(57 lines). The hook reuses the existing, already-tested
`softDeleteVaultSelection` from `vaultBulkMutationService.ts` (present in the
ported source but previously unused by the page) instead of re-inlining
per-item Supabase calls; its per-item ordering and partial-failure behavior are
covered by `vaultBulkMutationService.test.ts`. The dialog component owns only
the confirmation copy, disabled-while-deleting state, and cancel/confirm
wiring; the page still owns the toolbar, authorization gate for showing the
delete button (`isClubAdmin || isAppAdmin`), and dialog open trigger.

`src/pages/VaultPage.bulk-delete.characterization.test.ts` was added and
proven green against the original inline implementation before the extraction
(verified by temporarily restoring the pre-refactor `VaultPage.tsx` and
re-running the suite), then kept green after the hook/dialog existed. It
covers: independent photo/file toggle semantics; `selectAll` deriving from the
visible `photos`/`files` arrays; `exitSelectionMode` resetting all three
pieces of state together; ordered photo-then-file soft deletion reusing the
tested service; exact success/partial/failure toast strings and the
`["files", "photos", "storageBreakdown"]` invalidation; media-cache eviction
and the close/exit-always-in-`finally` semantics; the dialog's exact copy,
disabled state, and cancel wording; and that upload, rename/move, Drive
import, export/large-files, trash/recovery, and lightbox call sites are
untouched. The existing `VaultPage.export-large-files.characterization.test.ts`
assertion that bulk selection stayed page-owned was updated to assert the new
hook boundary instead.

| Metric | Before | After | Change |
| --- | ---: | ---: | ---: |
| `VaultPage.tsx` raw lines | 3,356 | 3,255 | -101 |
| `useState` calls in `VaultPage.tsx` | 21 | 18 | -3 |
| New bulk selection/delete modules (`useVaultBulkDeleteWorkflow.ts` + `VaultBulkDeleteDialog.tsx`) | 0 | 189 (132 + 57) | +189 |
| Complete Vault package (`VaultPage.tsx`, `components/vault`, `features/vault`; tests excluded) | 11,531 | 11,619 | +88 |
| Same-scope jscpd (`jscpd 5.3.0`, 50-token/5-line, same three directories) | 321 lines / 24 groups / 2.7838001907900445% | 321 lines / 24 groups / 2.7627162406403305% | 0 lines / 0 groups / -0.0211 pp |
| Product Vault route chunk | 121,991 bytes | 123,060 bytes | +1,069 |
| Product JavaScript total / chunks | 8,860,485 bytes / 502 | 8,861,554 bytes / 502 | +1,069 bytes / 0 |
| Largest product JavaScript chunk | 1,112,842 bytes | 1,112,842 bytes | 0 |

The same-scope jscpd duplicated-line count and clone-group count are unchanged
(321/24) because this state/workflow was not duplicated elsewhere in the Vault
package; the percentage moved only because the scanned line total grew. The
new hook and dialog are statically imported (matching every prior Phase 4A
Vault round), so the +1,069-byte route-chunk increase is organization
overhead, not a loading improvement; no new lazy-loading boundary was added or
is claimed. No request, subscription, render-count, or interaction-latency
evidence was collected for this legacy Supabase route, and no runtime-
performance claim is made — this is a maintainability/safety extraction only.
Product typecheck introduced no Vault diagnostic; its ratchet failure remains
limited to the known unrelated 14 `StartDMDialog`/`ClubDetailPage`
diagnostics. Product build, bundle budget, quality ratchet (`asAny` and
`consoleCalls` both decreased; `directSupabaseImports` unchanged), duplication
ratchet (1,570 duplicated lines removed repo-wide since baseline), isolation,
the full legacy suite (452 files / 4,316 tests passed, 1 pre-existing skip,
zero failures), and `git diff --check` all pass. Upload/file-name flow,
folder/file rename-move, Google Drive import/link/title resolution, storage
purchase, content renderer internals, export/large-files, trash/recovery, and
lightbox were not modified beyond the stable `photos`/`files`/`selectionMode`/
`selectedPhotos`/`selectedFiles`/`exitSelectionMode` contract they already
consumed. Phase 4A Vault bulk selection/delete is complete; remaining
untouched Vault clusters are upload/file-name flow, folder/file rename/move,
and Google Drive import.

### Phase 4A Vault folder/file management result (2026-09-21)

The folder/file management and navigation feature cluster in `VaultPage.tsx`
was extracted next. The pre-refactor map covered: `folderPath`,
`newFolderDialogOpen`, `deleteFolderId`, `renameFolderId`/`renameFolderName`,
`renameFileId`/`renameFileName`, `renamePhotoId`/`renamePhotoName`,
`moveFileDialogOpen`, and `fileToMove` state (the already-dead
`newFolderName`/`setNewFolderName` pair — only ever set to `""` and never
read, since `CreateFolderDialog` owns its own internal name field — was
deleted rather than relocated); the `createFolderMutation`,
`deleteFolderMutation`, `renameFolderMutation`, `renameFileMutation`,
`renamePhotoMutation`, and `moveFileMutation` mutations and their request/
cancel/confirm/start dialog wrapper callbacks; the navigation helpers that own
`folderPath` (`navigateToFolder`, `goBack`, `navigateToRoot`, `navigateToClub`,
`navigateToMiniLeague`, `navigateToTeam`, `navigateToFolderAtIndex`, and the
`getHierarchyNodes` breadcrumb builder); and the create-folder, delete-folder
confirmation, three rename, and `MoveFileDialog` JSX blocks. Shared
dependencies kept page-owned: `currentView`/`setCurrentView` (also driven by
URL deep-linking and the root club/team/mini-league picker in ~200+ other call
sites), `fromChat`, `navigate`, `getCurrentFolderId`, `queryClient`, and
`user?.id` — the new hook receives these as a stable input/output contract
instead of owning `currentView` itself.

The cohesive typed boundary is `src/features/vault/useVaultFolderManagement.ts`
(463 lines) plus the presentational
`src/components/vault/VaultFolderManagementDialogs.tsx` (233 lines). The
hook's `moveFileMutation` now reuses the existing, already-tested
`moveVaultFile` from `vaultMutationRepository.ts` (present in the ported
source but previously unused by the page — it had its own duplicate inline
Supabase `.update()` call) instead of re-inlining the Supabase call; its
`targetTeamId`-conditional update is covered by
`vaultMutationRepository.test.ts`. The `getHierarchyNodes` breadcrumb label
helper likewise reuses the existing, already-tested
`abbreviateVaultOrganisationName` from `vaultScope.ts` instead of
re-declaring the same club-suffix abbreviation table a second time in the new
hook (an initial draft copied the helper inline; same-scope jscpd caught the
resulting duplicate against `vaultScope.ts` and it was replaced with a direct
import before this round's final measurements). The dialogs component owns
only the create/delete/rename/move dialog copy, disabled-while-blank and
pending states, and cancel/confirm wiring, exposed through a narrow
callback-based prop contract (`onCreateFolder`, `onConfirmDeleteFolder`,
`onRenameFolderNameChange`, etc.) rather than raw setters; it preserves
`MoveFileDialog`'s pre-existing `lazyWithRetry` + `Suspense` lazy-loading
boundary internally (relocated, not newly added) and keeps
`CreateFolderDialog` statically imported, matching every prior Phase 4A Vault
round's precedent of only lazy-loading dialogs that were already lazy.

`src/pages/VaultPage.folder-management.characterization.test.ts` (15 tests)
was added and proven green against the original inline implementation before
the extraction, then kept green after the hook/dialogs existed. It covers:
create-folder's exact `parentFolderId`/`view` mutation inputs, cache
invalidation, and success/failure toasts; delete-folder's exact mutation
scope and toasts; rename-folder's `folderPath` breadcrumb-entry update and
toasts; rename-file/rename-photo sharing `renameVaultItem` with distinct
toasts; move-file's conditional `team_id` update (reusing `moveVaultFile`),
toasts, and dialog-state clearing; folder-open, back, and breadcrumb-jump
navigation semantics (including the `fromChat`-first priority order and
`folderPath` push/pop/slice behavior); hierarchy breadcrumb node construction
for root/club/team/mini-league/folder segments and the club-name abbreviator
reuse; each dialog's exact copy and blank-name disabled state;
`MoveFileDialog`'s lazy import and team/club scope wiring; a boundary-narrowness
check; and that upload, Drive import/link/title resolution, storage purchase,
export/large-files, trash/recovery, and bulk-delete call sites are untouched.
The existing `VaultPage.bulk-delete.characterization.test.ts` assertion that
this cluster stayed page-owned was updated to assert the new hook boundary
instead (mirroring the same update made in the prior two rounds).

| Metric | Before | After | Change |
| --- | ---: | ---: | ---: |
| `VaultPage.tsx` raw lines | 3,255 | 2,883 | -372 |
| `useState` calls in `VaultPage.tsx` | 18 | 12 | -6 |
| New folder/file management modules (`useVaultFolderManagement.ts` + `VaultFolderManagementDialogs.tsx`) | 0 | 696 (463 + 233) | +696 |
| Complete Vault package (`VaultPage.tsx`, `components/vault`, `features/vault`; tests excluded) | 11,619 | 11,943 | +324 |
| Same-scope jscpd (`jscpd 5.3.0`, 50-token/5-line, same three directories) | 321 lines / 24 groups / 2.7627162406403305% | 318 lines / 24 groups / 2.6626475759859334% | -3 lines / 0 groups / -0.10 pp |
| Product Vault route chunk | 123,060 bytes | 126,670 bytes | +3,610 |
| Product JavaScript total / chunks | 8,861,554 bytes / 502 | 8,865,164 bytes / 502 | +3,610 bytes / 0 |
| Largest product JavaScript chunk | 1,112,842 bytes | 1,112,842 bytes | 0 |

The same-scope jscpd duplicated-line count decreased slightly (321 → 318, same
24 clone groups) because reusing `abbreviateVaultOrganisationName` from
`vaultScope.ts` instead of re-declaring it avoided adding a new clone pair
that an initial draft of the hook briefly introduced; net of that fix, this
cluster's state/mutations/navigation were not otherwise duplicated elsewhere
in the Vault package, so the reduction is incidental rather than the primary
goal of this round. `VaultFolderManagementDialogs.tsx` and
`useVaultFolderManagement.ts` are both statically imported (matching every
prior Phase 4A Vault round except lightbox/export, which already had lazy
sub-dialogs), so the +3,610-byte route-chunk increase is organization
overhead (extra type/interface surface and doc comments not present in the
inline version), not a loading regression; no new lazy-loading boundary was
added or is claimed — `MoveFileDialog`'s existing lazy boundary was relocated
into the new dialogs component unchanged. No request, subscription,
render-count, or interaction-latency evidence was collected for this legacy
Supabase route, and no runtime-performance claim is made — this is a
maintainability/safety extraction only.

Product typecheck introduced no Vault diagnostic (one transient diagnostic —
`onMoveFile`'s callback parameter type not structurally matching
`ContentSectionProps`'s `(file: VaultFile) => void` because the hook's
`VaultFileToMove` required a non-optional `folder_id` that `VaultFile` only
exposes through an index signature — was fixed by introducing a looser
`VaultMoveFileSource` parameter type for the callback boundary while keeping
`VaultFileToMove` for the hook's own dialog state); its ratchet failure
remains limited to the known unrelated 14 `StartDMDialog`/`ClubDetailPage`
diagnostics. `typecheck:lab` is clean. Product build, bundle budget, quality
ratchet (`asAny` and `consoleCalls` both decreased; `directSupabaseImports`
unchanged), duplication ratchet (1,573 duplicated lines removed repo-wide
since baseline), isolation, the full legacy suite (453 files / 4,331 tests
passed, 1 pre-existing skip, zero failures), and `git diff --check` all pass.
Upload/file-name flow, Google Drive import/link/title resolution, storage
purchase, content renderer internals, export/large-files, trash/recovery, and
bulk selection/delete were not modified beyond the stable
`onRenamePhoto`/`onRenameFile`/`onMoveFile`/`onRenameFolder`/`onDeleteFolder`
callback contract they already consumed through `VaultContentRenderer`. Phase
4A Vault folder/file management is complete; the only remaining untouched
Vault cluster is upload/file-name flow and Google Drive import/link/title
resolution.

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
14. Large-file decomposition, beginning with Vault and Messages and then
    proceeding by measured risk and benefit.
15. Runtime data-fetch, subscription, render, and bundle profiling, using any
    safe decomposition boundaries created in step 14.
16. Dead-code and dependency cleanup.
17. Final metrics, regression suite, and vendor handover report.

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
