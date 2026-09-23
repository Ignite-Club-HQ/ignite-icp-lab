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

### Phase 4A AutoSub dialog result (2026-09-22)

`src/components/pitch/AutoSubPlanDialog.tsx` had accumulated the AutoSub
scheduler, forecast calculations, fairness analysis, threshold tuning, coach
fix recommendations, DnD forecast rows, and all forecast presentation in one
5,585-line module. This round retained the scheduler's public exports and
orchestration in the dialog, while moving bounded presentation and pure
decision responsibilities to small typed modules:

- `AdvancedSettingsPanel.tsx` (232 lines) and
  `planner/advancedOverrides.ts` (28) own the expert-control UI and shared
  override/default contract;
- `FairnessSimulatorPanel.tsx` (133), `FairnessDiagnostics.tsx` (132), and
  `PlanForecastSummary.tsx` (349) own independent forecast presentation;
- `PlayerMinutesPresentation.tsx` (176) owns attention rows and sortable
  minute rows with structural forecast props;
- `PlanFixSuggestions.tsx` (94) and `planner/planFixes.ts` (175) separate
  coach-facing priority presentation from its pure, directly tested decision
  rules.

The dialog now imports established, already-tested canonical planner helpers
from `planner/analysis.ts`, `planner/validation.ts`, and
`planner/standardMode.ts` for forecasts, role inference, rotation-speed
normalization, plan playability, and starvation repair. Its legacy exports
remain re-exported from the dialog, preserving current pitch/test import
paths. This removed duplicated helper implementations rather than creating
parallel planner modules.

| Metric | Before | After |
| --- | ---: | ---: |
| `AutoSubPlanDialog.tsx` raw lines | 5,585 | 3,882 |
| Complete non-test pitch package | 42,598 | 42,214 |
| New largest extracted AutoSub module | 0 | 349 |
| Same-scope jscpd | 2,137 lines / 166 groups / 5.0165% | 2,128 lines / 164 groups / 5.0410% |
| Product AutoSub lazy chunk | not measured for this exact pre-change commit | 77,730 bytes |
| Product JavaScript total / chunks | not measured for this exact pre-change commit | 8,870,648 bytes / 502 |
| Lazy-loading boundary | existing AutoSub dialog lazy import | unchanged |

The dialog is 1,703 lines (30.5%) smaller and the complete pitch package is
384 lines smaller. The largest new module is 349 lines, well below the
500–700 line guardrail. The scoped clone count and duplicate lines decrease
slightly; this was primarily a decomposition and duplicate-helper
consolidation, not a standalone duplication campaign.

New direct component contracts cover expert-control edits/resets/read-only
mode, forecast status/mode selection, player-minute flags and DnD affordances,
fairness diagnostic rendering, plan-fix actions, and clamped plan-fix
decisions. Existing AutoSub planner/fairness contracts, a 240-case matrix,
and pitch orchestration simulations remain the primary behavioral protection
for the scheduler. Full legacy tests (467 files, 4,471 passed, one skipped),
lab typecheck, product build and bundle budget, isolation, quality/duplication
ratchets, and diff checks passed.

The 77,730-byte lazy chunk is budget evidence only. No lazy-loading boundary,
request/subscription count, render count, interaction latency, or
user-perceived performance measurement changed; this is a maintainability,
testability, and change-safety result only. The remaining dialog is the
tightly coupled scheduler/controller. A future scheduler-core migration
requires its own responsibility map, compatibility exports, and separate
behavioral baseline; do not continue reducing it by mechanically moving
functions.

### Phase 4A AutoSub scheduler relocation (2026-09-22, follow-up)

After the above decomposition, `AutoSubPlanDialog.tsx` was still 3,882 lines
because the tightly coupled scheduler (`createSubPlan`,
`createSubPlanInternal`, `createMiniLeagueSubPlan`, and their private
constants/helpers) accounted for ~3,050 of those lines with zero React
dependency. Rather than the higher-risk work of splitting that algorithm's
internals (which needs its own responsibility map and behavioral baseline, as
noted above), this step did a **pure, unmodified relocation**: the entire
scheduler block moved verbatim into a new `planner/scheduler.ts` module
alongside the other existing `planner/*` files. No control flow, ordering, or
decision logic changed — only file location and imports.

`AutoSubPlanDialog.tsx` re-exports `createSubPlan`, `createMiniLeagueSubPlan`,
and the `Player`/`SubstitutionEvent`/`MiniLeagueTeams` types from
`planner/scheduler.ts`, preserving every existing import path (dialog default
export, `createSubPlan`, `createMiniLeagueSubPlan`, `isPlanPlayableFromPlayers`,
`calculateTimeForecasts`, `normalizeRotationSpeed`, `AutoSubAdvancedOverrides`).

| Metric | Before | After |
| --- | ---: | ---: |
| `AutoSubPlanDialog.tsx` raw lines | 3,882 | 883 |
| `planner/scheduler.ts` raw lines | 0 (new) | 3,020 |
| Complete non-test pitch package | 42,214 | 42,233 |
| Product AutoSub lazy chunk | 77,730 bytes | 77,730 bytes (unchanged) |
| Product JavaScript total / chunks | 8,870,648 bytes / 502 | 8,870,648 bytes / 502 (unchanged) |

The dialog file is now 883 lines — a further 3,010 lines (77.5%) smaller, and
below the size of any other file in the pitch package except `PitchBoard.tsx`
(pre-existing, out of scope) and the new `scheduler.ts` itself. Because the
move added no logic and no new UI, the bundle byte totals are byte-identical
before and after, and the package's non-test line total moved by only 19
lines (a header comment). This confirms the change is a structural relocation,
not a behavior or bundle change.

`planner/scheduler.ts` is now the second-largest file in the pitch package
(3,020 lines). It intentionally stays as one module: it is the same
tightly-coupled scheduler algorithm called out above, and splitting its
internals still requires a dedicated responsibility map, compatibility
exports, and an independent behavioral baseline before any further reduction
— it was not fragmented here to avoid trading one oversized file for another.

Full legacy tests (467 files, 4,471 passed, one skipped), the 240-case
AutoSub fairness matrix, the full focused planner/AutoSub suite (211 tests
across 17 files), lab typecheck, direct `tsc` diagnostics on the touched
files, product typecheck (only the pre-existing 14-diagnostic baseline drift
in `StartDMDialog`/`ClubDetailPage`), product build, product bundle budget,
isolation, quality ratchet, and duplication ratchet all passed after this
move.

### Phase 4A AutoSub scheduler internal split (2026-09-27, follow-up)

`planner/scheduler.ts` (3,020 lines) had absorbed nearly the entire
`AutoSubPlanDialog.tsx` decomposition and had become the pitch package's
second-largest file, so this step pulled apart `createSubPlanInternal`'s own
internals — the responsibility map called out in the prior phase. Two
changes were made, both behaviour-preserving:

1. **Duplicate consolidation.** `scheduler.ts` carried local copies of
   `naivePlanTotals`, `rebalanceablePlayers`, `planSpreadSeconds`,
   `EqualTimeOverrideOptions`, and `applyEqualTimeOverride` that were
   near-identical to already-existing, already-tested, but previously unused
   generic implementations in `planner/equalTimeOverride.ts`
   (`calculatePlanTotals`, `rebalanceablePlayers`, `calculatePlanSpread`,
   `EqualTimeOverrideOptions`, `buildEqualTimeOverride`). `scheduler.ts` was
   rewired onto the canonical module and its local copies (~220 lines) were
   deleted — a real duplication fix, not just a line-count move.
2. **Branch extraction.** `createSubPlanInternal`'s two large, mutually
   exclusive branches — "PRACTICAL MODE" (`rotationSpeed === 1`, a
   self-contained FIFO planner ending in its own `return`) and
   "BALANCED / FREQUENT MODES" (`rotationSpeed >= 2`, the fairness-driven
   planner that runs to the function's final `return`) — were moved into
   two new sibling modules, `planner/practicalMode.ts` and
   `planner/fairnessMode.ts`. Each exports a single function
   (`buildPracticalModePlan` / `buildFairnessModePlan`) taking an explicit
   context object built from the same setup-phase locals
   `createSubPlanInternal` already computed; `scheduler.ts` now calls these
   functions instead of inlining the branch bodies. Extraction used a
   compiler-driven technique: paste the branch body into the new file behind
   a stub context type, run `tsc --noEmit -p tsconfig.app.json` directly
   (not the root composite `tsconfig.json`, which silently skips
   newly-created files not yet imported anywhere), and add every
   "Cannot find name" identifier to the context interface until the file
   compiles cleanly, then wire the real call site.

| Metric | Before | After |
| --- | ---: | ---: |
| `planner/scheduler.ts` raw lines | 3,020 | 666 |
| `planner/practicalMode.ts` raw lines | 0 (new) | 683 |
| `planner/fairnessMode.ts` raw lines | 0 (new) | 1,594 |
| `planner/equalTimeOverride.ts` raw lines | 184 (pre-existing, now wired in) | 184 (unchanged) |
| Product AutoSub lazy chunk | 77,730 bytes | 79,240 bytes (module-boundary overhead only) |
| Product JavaScript total / chunks | 8,870,648 bytes / 502 | 8,872,165 bytes / 502 |
| Duplication ratchet duplicated lines | 17,582 | 15,899 (−1,683) |

`scheduler.ts` is no longer the pitch package's largest planner file;
`fairnessMode.ts` (1,594 lines) is now the largest of the three, reflecting
that the BALANCED/FREQUENT branch is inherently the most complex part of the
algorithm (equal-playing-time optimisation, priority-bias ordering, spread
escalation, equal-time overrides, starved-player smoothing all in one pass).
It was moved as a single unit rather than force-split further, consistent
with this plan's guardrail against relocating bloat into another
equally-oversized file — a further internal split of `fairnessMode.ts` would
need its own responsibility map before proceeding, the same rule applied to
`scheduler.ts` in the prior phase.

Verification for this step: `tsc --noEmit -p tsconfig.app.json` clean on all
three touched/created files (confirmed against a temporarily-reverted
baseline that the pre-existing 171 product diagnostics are unchanged and
unrelated); the focused AutoSub/planner batch (240-case fairness matrix,
acceptance, goalkeeper-rotation regression, mode-contract regression,
orchestration sims, `equalTimeOverride.test.ts` — 390 tests across 8 files)
passed after each extraction step; full legacy suite (467 files, 4,471
passed, 1 skipped); `typecheck:lab` clean; `typecheck:product` (only the
same pre-existing 14-diagnostic baseline drift in
`StartDMDialog`/`ClubDetailPage`); `build:product` succeeded;
`check:product-bundle` within budget (8.87 MB / 9.8 MB total JS budget);
`check:isolation` passed; `check:quality-ratchet` passed; `check:duplication`
improved by 1,683 duplicated lines (the `equalTimeOverride` consolidation).

### Phase 4A fairness planner dead-code cleanup (2026-09-22, follow-up)

A follow-up audit of the extracted `planner/fairnessMode.ts` found that an
older window-planning and rebalance implementation remained below the active
planner's unconditional `return`. That 646-line branch could never execute.
Several setup helpers above the active planner existed only to support that
unreachable branch. This cleanup deletes the unreachable branch and those
dead-only helpers instead of moving them into another file.

| Metric | Before | After |
| --- | ---: | ---: |
| `planner/fairnessMode.ts` raw lines | 1,594 | 779 |
| New production modules | 0 | 0 |
| Product AutoSub lazy chunk | 79,240 bytes | 79,000 bytes |
| Product JavaScript total / chunks | 8,872,165 bytes / 502 | 8,871,921 bytes / 502 |
| Duplication ratchet duplicated lines | 15,899 | 15,841 |

This is an 815-line (51.1%) reduction in the fairness planner with no new
module and no active control-flow change. The three primary planner files are
now similarly bounded: `scheduler.ts` 666 lines, `practicalMode.ts` 683 lines,
and `fairnessMode.ts` 779 lines. Focused AutoSub/planner tests (390 across 8
files, including the 240-case matrix), touched-file TypeScript diagnostics,
`typecheck:lab`, product build, product bundle budget, isolation, quality
ratchet, and duplication ratchet all passed.

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

### Phase 4A Vault Drive/Add Link result (2026-09-21)

The Drive/Add Link/OAuth/title-resolution feature cluster in `VaultPage.tsx`
was extracted into a typed workflow hook and dialog component:

- `src/features/vault/useVaultDriveLinkWorkflow.ts` (190 lines): Add Link
  dialog state, Google Drive import/link dialog state, Drive title-resolution
  loading and toast lifecycle, saved OAuth error handling, saved OAuth code
  exchange, import-versus-link token routing, cache invalidation, and the
  Add Link mutation.
- `src/components/vault/VaultDriveLinkDialogs.tsx` (106 lines): Add Link,
  Google Drive import, and Link Drive Folder dialog wiring, retaining their
  existing lazy component boundaries.
- `src/features/vault/vaultMutationRepository.ts`: new
  `createVaultLinkFile` repository helper, reusing the already-tested
  `getVaultScope` scoping model instead of leaving club/team/mini-league
  insert branching inline in the page.

The page retains `currentView`, folder scope ownership, upload/file-name
flow, storage purchase state, content rendering, and the previously extracted
trash/recovery, export/large-files, lightbox, bulk-delete, and folder/file
management boundaries. The Drive workflow receives readonly scope inputs and
the existing `supabase.functions.invoke` boundary from the page; it does not
introduce a fallback provider, global state, or a new loading boundary.

| Metric | Before | After |
| --- | ---: | ---: |
| `VaultPage.tsx` raw lines | 2,883 | 2,732 |
| `VaultPage.tsx` `useState` calls | 12 | 8 |
| `useVaultDriveLinkWorkflow.ts` | 0 | 190 |
| `VaultDriveLinkDialogs.tsx` | 0 | 106 |
| Characterization test | 0 | 147 |
| Complete Vault source package (non-test, same scope) | 11,943 | 12,122 |
| Same-scope jscpd | 318 lines / 24 groups / 2.66% | 298 lines / 22 groups / 2.46% |
| Product Vault route chunk | 126,670 bytes | 128,117 bytes |
| Product JavaScript total / chunks | 8,861,554 bytes / 502 | 8,866,611 bytes / 502 |
| Lazy-loading boundary | existing dialog lazy boundaries only | existing dialog lazy boundaries retained |

The source package grows by 179 non-test lines because the repository/helper
contract and hook/dialog boundary are explicit; the page itself is 151 lines
smaller and has four fewer local state declarations. Unlike the lightbox
round, this extraction also reduces measured same-scope duplication by 20
duplicated lines and two clone groups because the page no longer owns all
Drive/Add Link dialog wiring and insert scoping inline.

Characterization coverage in
`src/pages/VaultPage.drive-link.characterization.test.ts` covers saved OAuth
error cleanup, saved code exchange redirect URI semantics, failure handling,
folder-link versus import token routing, pending-flag cleanup, Add Link
scoping and toasts, title-resolution toasts/cache invalidation, dialog
mutation wiring, and Drive dialog target-scope props. Existing bulk-delete
and folder-management characterization tests were updated only to assert the
new stable Drive boundary rather than expecting the cluster to remain inline.
Targeted Vault tests passed (61 tests). Product typecheck introduced no
Vault diagnostic; its ratchet failure remains the known unrelated 14
`StartDMDialog`/`ClubDetailPage` diagnostics. Product build, bundle budget,
quality ratchet, duplication ratchet, isolation, and same-scope jscpd passed.

The extracted modules are statically imported and the route chunk is 1,447
bytes larger than the folder-management result. No request, subscription,
render-count, or interaction-latency benchmark was measured, so this is a
maintainability/safety result only and makes no runtime-performance claim.
The main remaining high-line-count Vault cluster is upload/file-name flow.

### Phase 4A Vault upload/file-name result (2026-09-22)

The upload/file-name/quota-reservation feature cluster in `VaultPage.tsx` —
the last remaining untouched Vault cluster named in the prior round — was
extracted into a typed workflow hook:

- `src/features/vault/useVaultUploadWorkflow.ts` (125 lines): the upload
  dialog's open/uploading/upload-type/file-name state, the photo and file
  upload mutations, and both the raw-file-input (`handleFileUpload`, dead
  code with no JSX caller both before and after this round) and dialog
  (`handleDialogUpload`) upload handlers.

Rather than re-inlining the reserve/upload/settle/compensate/insert mechanics
in the new hook, its two mutations now call the already-existing but
previously unused `uploadVaultItem` from `src/features/vault/vaultUploadService.ts`
(added in an earlier round, covered by its own `vaultUploadService.test.ts`,
but never wired into `VaultPage.tsx` until this round). `uploadVaultItem`
reproduces the exact storage-path construction (club/team/mini-league/
unassigned, `${timestamp}-${randomSuffix}.${fileExt}`), the
reserve-before-write quota call, upload failure settlement, metadata insert
scoping, orphaned-object compensation on insert failure, and success
settlement that were previously duplicated inline across both mutations. The
one-line "Compensate: never leave an orphaned object billed against the
club." comment was restored at the service's compensation call site so the
documented rationale is preserved now that the code path is live. The page
retains `currentView`, folder scope ownership, `canUpload`/`canManageVaultPro`
gates, and every other previously extracted Vault workflow boundary
(trash/recovery, export/large-files, lightbox, bulk-delete, folder/file
management, Drive/Add Link); the upload hook receives `currentView`,
`getCurrentFolderId`, `userId`, and `queryClient` as readonly/stable inputs,
matching the contract used by the other extracted Vault workflow hooks.

| Metric | Before | After |
| --- | ---: | ---: |
| `VaultPage.tsx` raw lines | 2,732 | 2,548 |
| `VaultPage.tsx` `useState` calls | 8 | 4 |
| `useVaultUploadWorkflow.ts` | 0 | 125 |
| Characterization test | 0 | 158 |
| Complete Vault source package (non-test, same scope) | 12,122 | 12,064 |
| Same-scope jscpd | 298 lines / 22 groups / 2.46% | 235 lines / 19 groups / 1.95% |
| Product Vault route chunk | 128,117 bytes | 128,050 bytes |
| Product JavaScript total / chunks | 8,866,611 bytes / 502 | 8,866,544 bytes / 502 |
| Lazy-loading boundary | existing dialog lazy boundaries only | existing dialog lazy boundaries retained |

Unlike every prior Phase 4A Vault round, the complete non-test Vault package
shrank (12,122 → 12,064, -58 lines) even though a new 125-line hook was
added, because the extraction reuses `uploadVaultItem`'s already-tested logic
instead of duplicating it a third time (previously duplicated once each in
the photo and file mutations). Same-scope jscpd duplication also dropped
further (298 → 235 duplicated lines, 22 → 19 clone groups) for the same
reason.

`src/pages/VaultPage.upload.characterization.test.ts` (13 tests) was added
and proven to pass against the original inline `VaultPage.tsx` before
extraction, then kept green against the extracted hook. It covers: quota
reserved before any bytes are written for both photo and file uploads; the
exact club/team/mini-league/unassigned storage path shapes; settlement as
failed (never inserting metadata) when the storage upload itself fails;
compensating the orphaned storage object and settling as failed when the
metadata insert fails; settling as successful only after both steps succeed;
`buildVaultStorageUrl` usage and photo-only `file_type` scoping; the
`customFileName || fileName || file.name` resolution order; the exact
`["files", "clubs", "storageBreakdown"]` (both) and `["clubFreeUsage"]`
(file-only) cache-invalidation scopes; dialog-close-on-success semantics for
both upload kinds, `fileName` reset and the success toast for file uploads
only (photo uploads intentionally have no success toast); the exact failure
toasts; the `uploading` flag lifecycle for both the raw-input and dialog
upload paths (including the dialog path's try/finally); a boundary-narrowness
check; and that upload dialog wiring, the `canUpload` gate, and every other
Vault cluster remain untouched. The pre-existing
`VaultPage.characterization.test.ts`, `VaultPage.drive-link.characterization.test.ts`,
and `VaultPage.folder-management.characterization.test.ts` "untouched
cluster" assertions that referenced the now-moved `uploadPhotoMutation`/
`uploadFileMutation` identifiers or the now-moved cache-invalidation literal
were updated to assert the new `useVaultUploadWorkflow` boundary instead of
expecting the cluster to remain inline, matching the pattern used by every
prior round.

Targeted Vault tests passed (206 tests across 23 files). The full legacy
suite passed 4,364 tests across 455 files (1 pre-existing skip, 0 failures).
Product typecheck introduced no new Vault diagnostic; its ratchet failure
remains limited to the known unrelated 14 `StartDMDialog`/`ClubDetailPage`
diagnostics. `typecheck:lab` was clean. Product build, bundle budget
(8,866,544 / 9,800,000 JS bytes; largest chunk 1,112,842 / 1,500,000 bytes),
quality ratchet (`asAny` 1,201→1,189, `consoleCalls` 1,271→1,267, both
decreased or held), duplication ratchet (1,669 duplicated lines removed
repo-wide since baseline), isolation, same-scope jscpd, and `git diff --check`
all passed.

The extracted module is statically imported and the route chunk is 67 bytes
smaller than the Drive/Add Link result — not evidence of a runtime
improvement, just line movement between chunks. No request, subscription,
render-count, or interaction-latency evidence was collected, and no
runtime-performance claim is made — this is a maintainability/safety
extraction only. This completes every workflow cluster named in the original
Phase 4A Vault responsibility map (trash/recovery, export/large-files,
lightbox, bulk selection/delete, folder/file management, Drive/Add Link, and
upload/file-name). The subsequently authorized header/storage/action-toolbar
presentation extraction is recorded separately below.

### Phase 4A Vault header/storage/action-toolbar result (2026-09-22)

The presentation-only follow-up moved the visible root/inner header, breadcrumb
hierarchy, compact and expanded storage panel, selection/export controls, and
Upload/Add/More toolbars into the statically imported
[`VaultTopSection.tsx`](../frontend/src/components/vault/VaultTopSection.tsx).
Its public contract groups the inputs into header, storage,
selection/export, and primary-action models rather than exposing a flat list
of boolean props. Internal `VaultPageHeader`, `VaultStoragePanel`,
`VaultActionToolbar`, and `VaultMoreMenuItems` sections keep each rendering
responsibility local and remove the duplicated More-menu item markup.

[`VaultPage.tsx`](../frontend/src/pages/VaultPage.tsx) still owns
`currentView`, every query and workflow hook, the storage data and quota
inputs, upload/Drive/export/bulk-delete/folder/trash actions, and all dialogs.
The page computes and passes the hierarchy returned by `getHierarchyNodes`;
the presentation module wires the existing node callbacks and `goBack`
adapter. The Drive allowlist and iOS gate moved with the menu presentation,
but the Drive workflow, OAuth handling, title resolution, folder linking, and
mutations did not.

The before state is commit `99d3b55b8`. Measurements use the same non-test
Vault package scope and 50-token/5-line jscpd command as the preceding Vault
round:

| Metric | Before | After |
| --- | ---: | ---: |
| `VaultPage.tsx` raw lines | 2,548 | 2,114 |
| `VaultTopSection.tsx` raw lines | 0 | 646 |
| Complete Vault source package (non-test, same scope) | 12,064 | 12,276 |
| `VaultPage.tsx` local `useState` declarations | 10 | 10 |
| Same-scope jscpd duplicated lines / groups / percent | 235 / 19 / 1.9479% | 235 / 19 / 1.9143% |
| Product Vault route chunk | 128,050 bytes | 129,860 bytes |
| Product JavaScript total / chunks | 8,866,544 bytes / 502 | 8,868,354 bytes / 502 |
| Lazy-loading boundary | route plus existing interaction-gated dialogs/breakdown | unchanged |

The local-state count is a direct count of `const [...] = useState...`
declarations in the page at both revisions. It corrects the earlier upload
round's table entry of four; this presentation extraction intentionally owns
no state and does not change the actual count of ten. The main file decreased
by 434 lines (17.0%). The explicit typed presentation boundary makes the
complete package 212 lines larger. Counted duplicated lines and clone groups
are unchanged; the percentage decrease is denominator-only and is not claimed
as duplication removal.

[`VaultPage.top-section.characterization.test.ts`](../frontend/src/pages/VaultPage.top-section.characterization.test.ts)
adds eight source-contract tests. They were run against the original inline
page before extraction and again afterward (73 tests across the eight Vault
characterization files both times). The contract covers root and inner
headers, `getHierarchyNodes`/`goBack` navigation, storage calculations and
labels, expanded breakdowns, selection/export/download/delete enablement,
Upload/Add/More visibility, Drive allowlist/iOS/admin gates and callbacks, the
large-file threshold, purchase CTA, page-owned workflows/current view/dialogs,
and unchanged lazy boundaries.

Post-extraction validation passed 283 tests across all 32 Vault test files and
the full legacy suite passed 4,372 tests across 456 files (one existing skip).
Lab typecheck and isolation passed. Product typecheck returned only the 14
known unrelated `StartDMDialog`/`ClubDetailPage` diagnostics and no Vault
diagnostic. Product build, bundle budget (8,868,354 / 9,800,000 JavaScript
bytes; largest chunk 1,112,842 / 1,500,000 bytes), quality ratchet,
duplication ratchet, and diff checks passed.

`VaultTopSection` is a static import. Existing `VaultPage` route lazy loading,
`UploadFilesDialog`, `VaultStorageBreakdown`, storage-purchase, and other
interaction-gated lazy imports retain their prior boundaries. The 1,810-byte
route increase is bundle-budget evidence, not a runtime improvement. No
request, subscription, render-count, interaction-latency, or user-perceived
performance evidence was collected. This is a maintainability/safety result
only, with no runtime-performance claim. Phase 4A stops after this
presentation extraction; data-model extraction is not started.

### Phase 4A Vault navigation/search presentation result (2026-09-22)

`src/components/vault/VaultMainContent.tsx` now owns the route presentation
after `VaultTopSection`: the non-root/non-trash search UI and status, root
club picker, club team-folder and mini-league panels, and the typed
club/team/mini-league content-renderer entries. `VaultPage.tsx` retains the
data/query model, current-view and URL navigation ownership, all mutation and
workflow boundaries, and page-owned callbacks passed through a narrow typed
model.

| Metric | Before | After |
| --- | ---: | ---: |
| `VaultPage.tsx` raw lines | 2,114 | 1,887 |
| New presentation module | 0 | 425 |
| New characterization test | 0 | 177 |
| Complete Vault source package (non-test) | 12,276 | 12,474 |
| Same-scope jscpd | 235 lines / 19 groups / 1.91% | 208 lines / 18 groups / 1.67% |
| Product Vault route chunk | 129,860 bytes | 130,929 bytes |
| Lazy-loading boundary | unchanged | unchanged |

The page is 227 lines smaller. The explicit package grows by 198 non-test
lines, but exact-scope duplication also falls by 27 duplicated lines and one
clone group. Contracts cover search accessibility/status, root club Pro
upgrade routing, club team/mini-league navigation, grouped-folder rendering,
and all three content-renderer variants including mini-league's read-only
file policy. Focused contracts passed (20 tests); the complete legacy suite
passed 4,384 tests with one pre-existing skip. Build, bundle, quality,
isolation, duplication, and lab typecheck gates pass. Product typecheck
remains only at the known unrelated 14 `StartDMDialog`/`ClubDetailPage`
diagnostics.

This is a static presentation extraction: the route chunk increases by 1,069
bytes and no request, subscription, render-count, or interaction measurement
changed. It is therefore a maintainability/safety result only, not a runtime
performance claim. Further large reduction now requires data/access/query
model extraction, which is intentionally higher risk and must be separately
characterized rather than merged into this presentation change.

### Phase 4A Vault access/entitlement/root-navigation data-model result (2026-09-22)

`src/features/vault/useVaultAccessModel.ts` now owns the access/entitlement/
root-navigation query-derived data model: the app-admin query, user-roles
query (with its existing debug log preserved), `hasVaultRoleAccess`, the
`userClubs` query and its once-only root auto-navigation effect,
`isClubAdmin`/`isCoachOrTeamAdmin`/`userTeamIds` derivations,
`adminUpgradeInfo`, the scoped club/team Pro-entitlement queries and
current-context Pro derivation, the root-level any-Pro-access query, and the
final `canAccessVault`/`hasProButNoRole`/`isLoadingAccess` decisions.
`VaultPage.tsx` keeps `currentView`/`setCurrentView` ownership and passes it
to the hook as a read-only input plus an explicit `onAutoNavigateToClub`
callback; the hook fires that callback, it does not navigate directly. All
other Vault content/search/storage queries, workflow hooks, mutations,
presentation components, dialogs, and the already-extracted navigation JSX
are unchanged.

The hook composes the previously unused (zero-consumer, already fully
tested) `src/features/vault/vaultAccessRepository.ts` fetch functions,
`src/features/vault/vaultAccess.ts` pure decision functions, and
`src/features/vault/vaultQueryKeys.ts` key builders instead of duplicating
this logic a second time. This mirrors the established sibling pattern
(`useVaultFolderManagement.ts` + `vaultMutationRepository.ts`) and leaves
the previously-wired `src/lab/vaultAccess.ts` module orphaned (still
present and tested, no longer imported by the page). Every existing query
key, cache-invalidation-relevant literal (`is-app-admin`, `user-admin-roles`,
`pro-access-info`, and the `vaultKeys.clubsForUser`/`clubHasPro`/`teamHasPro`
builders consumed by `src/lib/invalidateProAccess.ts`), `enabled` condition,
and the once-only auto-navigation semantics were preserved exactly; no
fallback provider was added.

The before state is commit `5dabef09e` (this repository's current HEAD).
Measurements use the same non-test Vault package scope and 50-token/5-line
jscpd command as the preceding Vault rounds:

```sh
npx --no-install jscpd src/pages/VaultPage.tsx src/components/vault src/features/vault \
  --min-tokens 50 --min-lines 5 \
  --ignore '**/*.test.ts,**/*.test.tsx' \
  --reporters json --output "$(mktemp -d)" --silent
```

| Metric | Before | After |
| --- | ---: | ---: |
| `VaultPage.tsx` raw lines | 1,887 | 1,656 |
| New `useVaultAccessModel.ts` | 0 | 229 |
| New `useVaultAccessModel.test.tsx` (hook contract tests) | 0 | 262 |
| New `VaultPage.access-model.characterization.test.ts` | 0 | 111 |
| Complete Vault source package (non-test) | 12,474 | 12,472 |
| `VaultPage.tsx` local `useState` declarations | 4 | 4 |
| Same-scope jscpd | 208 lines / 18 groups / 1.6675% | 208 lines / 18 groups / 1.6676% |
| Product Vault route chunk | 130,929 bytes | 131,232 bytes |
| Product JavaScript total / chunks | 8,869,423 bytes / 502 | 8,869,726 bytes / 502 |
| Lazy-loading boundary | unchanged | unchanged |

The page is 231 lines smaller. Because the extraction reuses already-tested
repository/logic modules instead of duplicating them, the complete non-test
package is 2 lines smaller overall despite adding a 229-line hook. Same-scope
duplicated lines and clone-group count are unchanged (208/18); the
`useState` count is unchanged because this cluster owned no local `useState`
state before or after (only `useQuery`/`useMemo`/`useEffect`/`useRef`).

[`useVaultAccessModel.test.tsx`](../frontend/src/features/vault/useVaultAccessModel.test.tsx)
adds 18 runtime contract tests via `renderHook`, covering app-admin bypass,
role-without-Pro denial, Pro-without-role denial (`hasProButNoRole`), root
access grant, loading-state aggregation, scoped club/team Pro entitlement
by active club, club-admin/committee and coach/team-admin isolation,
upgrade-target selection, team-id ordering, and four root auto-navigation
scenarios (fires once for a matching Pro club; does not fire for a non-Pro
club, a non-root view, or no active-club filter).
[`VaultPage.access-model.characterization.test.ts`](../frontend/src/pages/VaultPage.access-model.characterization.test.ts)
adds 13 source-contract tests over the combined page/hook/repository/logic
source, following the established per-cluster characterization pattern. Both
files were run and passed against the original inline page/logic before
extraction and again afterward (13/13 characterization tests both times; all
10 Vault-page characterization test files, 98 tests, and all 24
`features/vault` test files, 224 tests, pass after extraction).

The complete legacy suite passed 4,415 tests across 459 files (one
pre-existing skip) after extraction. Lab typecheck and isolation passed.
Product typecheck returned only the 14 known unrelated
`StartDMDialog`/`ClubDetailPage` diagnostics (verified identical against
the pristine pre-extraction tree, confirming they are pre-existing baseline
drift unrelated to this change) and no new Vault diagnostic. Product build,
bundle budget (8,869,726 / 9,800,000 JavaScript bytes; largest chunk
1,112,842 / 1,500,000 bytes), quality ratchet, duplication ratchet, and
`git diff --check` passed.

The 303-byte route-chunk increase is bundle-budget evidence only, not a
runtime claim. No request, subscription, render-count, interaction-latency,
or user-perceived performance evidence was collected. This is a
maintainability/safety result only. This was the intentionally
higher-risk data-model cluster flagged by the preceding presentation round;
Vault items/files/folders/search queries and storage data remain
unextracted and are the next candidate, in a separate task.

### Phase 4A Vault content/folder/item/search data-model result (2026-09-22)

`src/features/vault/useVaultContentDataModel.ts` now owns the Vault
content/folder/item/search query-derived data model: the `subfolders` query
for the active view, the `vaultItems` query and its `photos`/`files`
classification (via the existing `partitionVaultItems`/`isVaultImageItem`
classifiers), the recursive search cluster (folder-tree query, recursive
search query, `normalizedSearch`, `recursiveEnabled` gating), and the
`displaySubfolders`/`displayPhotos`/`displayFiles` fuzzy-filtered/search
switch that the presentation layer renders. `VaultPage.tsx` keeps
`currentView` ownership, `showTrash` state (repositioned only, not moved),
URL/query-param loading, folder navigation/mutations, the access model, the
storage model, all workflow hooks (including `useVaultBulkDeleteWorkflow`,
which the extraction had briefly and unintentionally deleted mid-edit and
which was restored and re-verified in place), and every dialog/presentation
component unchanged.

The hook composes the previously unused (zero-consumer, already fully
tested) `src/features/vault/vaultReadRepository.ts` fetch functions
(`fetchVaultSubfolders`, `fetchVaultItems`, `partitionVaultItems`,
`fetchVaultFolderTree`, `searchVaultContents`) and
`src/features/vault/vaultScope.ts` (`getVaultScope`, `collectVaultClubRoles`,
`GENERIC_CHAT_FOLDER_NAMES`) instead of duplicating this logic a second
time, mirroring the established sibling pattern from the two preceding
Vault rounds. Unlike those rounds, this cluster's "before" state already had
these repository/scope modules authored and unit-tested (683 combined lines
across `vaultReadRepository.test.ts`/`vaultScope.test.ts`) but not wired into
the page — so this round is primarily a wiring/composition extraction rather
than a fresh logic extraction, and the pre-existing repository/scope test
suites already characterized the underlying query/scoping/classification
behavior before this task began. Two query-key builders in
`src/features/vault/vaultQueryKeys.ts` (`subfoldersForView`, `folderTree`)
had their `isAppAdmin` parameter widened from `boolean` to
`boolean | undefined` to preserve the original page's exact query-key
identity (the page put the raw, possibly-unresolved `isAppAdmin` value
directly into these keys); every other query key, `enabled` condition, the
`keepPreviousData: true` (`as any`) react-query v5 quirk, the escaped-`ilike`
pattern, descendant/path traversal, restricted-role filtering, chat-folder
restriction, and root-level file allowance were preserved exactly as
verified below.

The before state is commit `bc99fa578` (this repository's HEAD prior to
this task). Measurements use the same non-test Vault package scope and
50-token/5-line jscpd command as the preceding Vault rounds:

```sh
npx --no-install jscpd src/pages/VaultPage.tsx src/components/vault src/features/vault \
  --min-tokens 50 --min-lines 5 \
  --ignore '**/*.test.ts,**/*.test.tsx' \
  --reporters json --output "$(mktemp -d)" --silent
```

| Metric | Before | After |
| --- | ---: | ---: |
| `VaultPage.tsx` raw lines | 1,656 | 1,381 |
| New `useVaultContentDataModel.ts` | 0 | 233 |
| New `useVaultContentDataModel.test.tsx` (hook contract tests) | 0 | 272 |
| New `VaultPage.content-data-model.characterization.test.ts` | 0 | 146 |
| Complete Vault source package (non-test) | 10,816 | 11,049 |
| `VaultPage.tsx` local `useState` declarations | 4 | 4 |
| Same-scope jscpd | 208 lines / 18 groups / 1.6677% | 199 lines / 17 groups / 1.6010% |
| Product Vault route chunk | 131,232 bytes | 132,014 bytes |
| Product JavaScript total / chunks | 8,869,726 bytes / 502 | 8,870,508 bytes / 502 |
| Lazy-loading boundary | unchanged | unchanged |

The page is 275 lines (16.6%) smaller. Because the extraction reuses
already-tested repository/scope modules instead of duplicating them, the
complete non-test package grows by only 233 lines overall (the new hook
itself) despite the 316-line inline cluster removed from the page; the
`vaultQueryKeys.ts` type-widening changed no line count. Same-scope
duplicated lines and clone-group count both decreased slightly (208/18 to
199/17), consistent with the denominator-shift pattern seen in prior rounds
rather than a targeted duplication fix. The `useState` count is unchanged
(4 before and after) because `showTrash` remained page-owned as instructed;
only its declaration position moved to precede the new hook call.

### Phase 4A Vault content-renderer decomposition result (2026-09-22)

`src/components/vault/VaultContentRenderer.tsx` no longer combines photo
loading/action presentation, content/file rendering, file action-sheet state,
trash recovery, and folder routing. It remains the stable public entry point
and re-exports the existing `ContentSection`, `TrashSection`, `VaultPhotoItem`,
and public types so its callers do not need a broad import migration.
Responsibilities now have bounded modules:

- `VaultPhotoItem.tsx` owns signed-URL image loading/error state, photo
  selection, and the photo action menu;
- `VaultContentSection.tsx` owns photo/file content rendering, safe file/link
  opening, spreadsheet/document handoff actions, selection controls, and the
  file action sheet;
- `VaultTrashSection.tsx` owns signed trash thumbnails, recovery/permanent
  deletion controls, and empty-trash confirmation;
- `VaultTypes.ts` owns the shared item shapes.

| Metric | Before | After |
| --- | ---: | ---: |
| `VaultContentRenderer.tsx` raw lines | 946 | 121 |
| `VaultContentSection.tsx` | 0 | 396 |
| `VaultTrashSection.tsx` | 0 | 254 |
| `VaultPhotoItem.tsx` | 0 | 173 |
| `VaultTypes.ts` | 0 | 27 |
| Complete Vault source package (non-test) | 12,430 | 12,455 |
| Same-scope jscpd | 199 lines / 17 groups / 1.60097% | 199 lines / 17 groups / 1.59801% |
| Product Vault route chunk | 132,014 bytes | 132,014 bytes |
| Product JavaScript total / chunks | 8,870,508 bytes / 502 | 8,870,508 bytes / 502 |
| Lazy-loading boundary | unchanged | unchanged |

The source package grows by 25 lines, while the prior 946-line renderer is
replaced by modules of at most 396 lines. This is a maintainability and
change-safety result, not a duplication or runtime-performance result:
duplicate lines and clone groups are unchanged, no lazy-loading boundary was
introduced, and no request, subscription, render-count, interaction-latency,
or user-perceived performance benchmark was collected. Focused Vault
characterization tests, the full legacy suite (461 files, 4,444 passed, one
skipped), lab typecheck, product build and bundle budget, isolation,
quality/duplication ratchets, and `git diff --check` passed.

The next Vault priority is not further decomposition of `VaultPage.tsx` or
the renderer. Any subsequent work must first evaluate the separate
Google-Drive dialog surfaces for a genuine overlapping responsibility,
rather than mechanically moving more lines between files.

[`useVaultContentDataModel.test.tsx`](../frontend/src/features/vault/useVaultContentDataModel.test.tsx)
adds 12 runtime contract tests via `renderHook` against a mocked
`vaultReadRepository.ts`, covering: no subfolder/file fetch at the root
view; correct role/admin-flag threading into `fetchVaultSubfolders`; the
`isAppAdmin: undefined` case coercing to `false` only at the repository-call
site (not the query key); no file fetch while `showTrash` is active;
photo/file classification of fetched `vault_files` rows; non-recursive
fuzzy filtering of the active view's own folders/photos/files by both an
empty and a non-empty immediate (non-debounced) query; recursive search
disablement at root, while trashed, and with an empty/whitespace debounced
query; folder-tree fetch restricted to club/team scope (not mini-league);
folder-tree-then-search sequencing; recursive-result photo/file splitting
using the same classifier; and `isFetchingRecursive` reflecting the
in-flight recursive query.
[`VaultPage.content-data-model.characterization.test.ts`](../frontend/src/pages/VaultPage.content-data-model.characterization.test.ts)
adds 17 source-contract tests over the combined page/hook/repository/scope/
query-key/classification source, following the established per-cluster
characterization pattern. All 17 characterization assertions and all 12
hook contract tests pass; combined with the pre-existing suites, all 36
Vault-scoped test files (351 tests: 98 pre-existing page characterization +
17 new page characterization + 224 pre-existing `features/vault` + 12 new
hook contract) pass after extraction.

The complete legacy suite passed 4,444 tests across 461 files (one
pre-existing skip) after extraction. Lab typecheck and isolation passed.
Product typecheck returned only the 14 known unrelated
`StartDMDialog`/`ClubDetailPage` diagnostics (matching the documented
baseline drift from prior rounds) and no new Vault diagnostic. Product
build, bundle budget (8,870,508 / 9,800,000 JavaScript bytes; largest chunk
1,112,842 / 1,500,000 bytes), quality ratchet, duplication ratchet, and
`git diff --check` passed.

The Vault route chunk grew by 782 bytes (131,232 to 132,014) even though
the page's own source lines shrank, because the previously orphaned
`vaultReadRepository.ts`/`vaultScope.ts` modules were not reachable from any
bundled entry point before this task and are now pulled into the Vault
route chunk through the new hook; total product JavaScript grew by the
same 782 bytes. This is bundle-budget evidence only, not a runtime claim.
No request, subscription,
render-count, interaction-latency, or user-perceived performance evidence
was collected. This is a maintainability/safety result only. Storage
purchase/sizing and the delete/restore/trash workflow itself were
intentionally left page-owned per this task's scope and remain candidates
for a separate future round.

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

## Phase 4A Event detail decomposition result (2026-09-14)

`EventDetailPage.tsx` was decomposed along existing behavior boundaries rather
than moving the page wholesale. Mutation orchestration now lives in focused
hooks for duties, cancellation, reminders/invites, checkout, RSVP/admin RSVP,
local attendance, and parent-managed mini-league RSVP. Presentation was split
into event overview, action dialogs, duty roster, match awards, and pitch-board
portal components. The RSVP response panel now has its own presentation
boundary, while attendance derivation and roster rendering are split between a
view-model hook and a focused presentation component. The page remains the
owner of provider selection, queries, permissions, attendance failure/loading
policy, dialog state, and the unified attendance composition.

| Measure | Before | After | Change |
| --- | ---: | ---: | ---: |
| `EventDetailPage.tsx` raw lines | 4,613 | 1,771 | -2,842 (-61.6%) |
| Largest new hook | 0 | 474 (`useEventRsvpMutations.ts`) | +474 |
| Largest new presentation component | 0 | 477 (`EventAttendanceRosterSection.tsx`) | +477 |
| Event detail source contract | 7 tests | 7 tests | unchanged/passing |
| Product JavaScript total / chunks | not measured at the exact pre-change commit | 8,879,664 bytes / 502 | budget passing |
| Largest product JavaScript chunk | not measured at the exact pre-change commit | 1,112,842 bytes | budget passing |

No replacement file approaches the original page size. The attendance failure
contract reads the page plus the extracted action dialogs and RSVP response
section so its disabled-action assertions follow the intentional component
boundaries; the failure alert, RSVP query state, loading state, and retry
policy remain page-owned. `useEventAttendanceViewModel.ts` is 203 lines,
`EventAttendanceRosterSection.tsx` is 477 lines, and
`EventRsvpResponseSection.tsx` is 384 lines.

The full legacy suite passed 4,471 tests across 467 files (one existing skip);
the lab suite passed 1,720 tests across 153 files. `typecheck:lab`, product
build, product bundle budget, isolation, quality ratchet, duplication ratchet,
the focused Event Detail/pitch-board guards, and `git diff --check` passed.
The aggregate `npm test` command remains blocked before Vitest by the unrelated
`vault-storage-breakdown-loading-contract.test.mjs`, whose raw-source assertion
still expects the lazy storage component in `VaultPage.tsx` after it moved to
`VaultTopSection.tsx`; this Event Detail work does not alter that Vault surface.
This is a maintainability/safe-change result; no request, subscription,
render-count, or interaction-latency improvement is claimed.

## Phase 4A Add Team Member result (2026-09-22)

`AddTeamMemberSheet.tsx` was decomposed along its existing workflow boundaries.
Existing-user, pending-invite, and bulk-add mutations now live in separate
hooks. Club roster/child reads and member searches have separate data hooks,
and the bulk/single success surfaces share a bounded presentation module. The
sheet retains form state, progressive disclosure, role selection, child and
second-guardian field composition, and single/bulk form orchestration.

| Measure | Before | After | Change |
| --- | ---: | ---: | ---: |
| `AddTeamMemberSheet.tsx` raw lines | 3,552 | 1,700 | -1,852 (-52.1%) |
| Largest new mutation hook | 0 | 580 (`useAddPendingTeamMemberMutation.ts`) | +580 |
| Search data hook | 0 | 348 (`useAddTeamMemberSearch.ts`) | +348 |
| Roster data hook | 0 | 239 (`useAddTeamMemberRosterData.ts`) | +239 |
| Success presentation module | 0 | 315 (`AddTeamMemberSuccessSheets.tsx`) | +315 |
| Product JavaScript total / chunks | 8,879,664 bytes / 502 | 8,882,693 bytes / 502 | budget passing |
| Largest product JavaScript chunk | 1,112,842 bytes | 1,112,842 bytes | unchanged |

The second-parent and role/cache source contracts now read the extracted hooks
as part of the same production boundary. They continue to require all
second-parent branches to use `ensureSecondParent`, preserve partial-failure
feedback, and require canonical team-role cache completion.

Validation passed 35 focused role/membership tests, the 23-test local
membership model, 467 legacy files / 4,471 tests (one skip), 153 lab files /
1,720 tests, lab type-check, product build, product bundle budget, isolation,
quality ratchet, duplication ratchet, and `git diff --check`. The first full
lab run had one transient external-worker provider-registry failure; its
isolated rerun and the complete suite rerun both passed. No runtime-performance
claim is made.

## Phase 4A VirtualizedChatMessageList result (2026-09-22)

`VirtualizedChatMessageList.tsx` was the last file on the original Phase 4A
target list. Auditing it found that an earlier product-source port had
already produced independent, fully tested extraction modules for its row-
height math and native-environment helpers
(`chatRowHeightEstimator.ts`, `chatRowSignature.ts`,
`chatRowPreviewEstimate.ts`, `chatVirtuosoEnvironment.ts`), but the component
itself still carried a byte-for-byte duplicate of that logic inline and never
imported the ported modules. This step wired the component to the existing
modules instead of re-extracting the same logic, and additionally relocated
the self-contained prepend-scroll-motion deferral mechanism (module-level
scroll-gesture gating plus the `useDeferPrependsWhileScrolling` hook) into a
new `useDeferChatPrepends.ts` file. A follow-up extraction then moved the
self-contained Virtuoso row presentation layer (stable header/footer,
scroller/item wrappers, row measurement/cache wrapper, debug row probe,
memoized row adapter, and jump hydration skeleton) into
`chatVirtuosoRows.tsx`, leaving the large file focused on the scroll/jump
controller. A final controller pass moved the imperative scroll API,
startReached/prepend pagination gate, cold-open/bottom-follow pinning, and
post-reveal jump-anchor watcher into focused hooks while keeping their
existing order-sensitive refs in the main component.

These changes are pure relocations/wiring: no row-height, signature, native-
environment-detection, prepend-motion-timing, row measurement, or skeleton
rendering logic changed. The only non-mechanical addition is a small setter/getter API
(`setPrependScrollerElementGetter`, `isPrependUserDrivenScrollActive`)
replacing direct reads/writes of what was a raw module-level variable, so the
main component keeps working across the new file boundary.

| Measure | Before | After | Change |
| --- | ---: | ---: | ---: |
| `VirtualizedChatMessageList.tsx` raw lines | 2,833 | 1,268 | -1,565 (-55.2%) |
| `chatVirtuosoRows.tsx` (new) | 0 | 379 | +379 |
| `useDeferChatPrepends.ts` (new) | 0 | 171 | +171 |
| Controller hooks (`useChatScrollActions`, `useChatPrependPagination`, `useChatBottomFollow`, `useChatJumpAnchor`) | 0 | 692 | +692 |
| `chatRowHeightEstimator.ts` / `chatRowSignature.ts` / `chatRowPreviewEstimate.ts` / `chatVirtuosoEnvironment.ts` | already present, unwired | wired in, unchanged | 0 |
| Product JavaScript total / chunks | 8,882,693 bytes / 502 | 8,884,442 bytes / 502 | budget passing |
| Largest product JavaScript chunk | 1,112,842 bytes | 1,112,842 bytes | unchanged |

Validation passed the full chat component suite (30 files / 212 tests,
including the `chatJumpHydrationDeadline` and `chatPostRevealAnchor` raw-
source guards), 467 legacy files / 4,471 tests (one skip), 153 lab files /
1,720 tests, product type-check (only the pre-existing 14-diagnostic
`StartDMDialog`/`ClubDetailPage` baseline drift), lab type-check, product
build, product bundle budget, isolation, quality ratchet, duplication
ratchet, and `git diff --check`. Because this was a pure relocation/wiring
change, no request, render, subscription, or interaction behavior changed and
no runtime-performance claim is made.
