# Authored frontend duplication baseline

This is the immutable Phase 0 evidence for the frontend duplication plan. The
baseline was captured before the pitch-board consolidation in Phase 1.1.

## Reproduction

Run from `frontend/`:

```sh
out=$(mktemp -d)
npx --no-install jscpd src \
  --min-tokens 50 \
  --min-lines 5 \
  --ignore '**/*.test.ts,**/*.test.tsx,src/integrations/supabase/types.ts,src/lab/bindings/**,src/lab/generated-contracts/**' \
  --reporters json \
  --output "$out" \
  --silent
```

The scanner is pinned to `jscpd 5.3.0` in
[`frontend/package.json`](../frontend/package.json). The two baseline runs used
the same scanner, path, thresholds, exclusions, and reporter options. The
original command relied on jscpd's equivalent defaults of 50 tokens and 5
lines; those thresholds are explicit in the ratchet and reproduction command
above.

The scan includes authored `frontend/src` source and excludes tests, generated
Supabase types, and generated Candid bindings. Clones involving `src/lab/**`
are reported for visibility but excluded from the authored ratchet because
those lab/production mirrors are intentional isolation copies.

## Reproducible baseline runs

| Run | Scanned lines | Counted clone groups | Counted duplicated lines | Counted duplication |
| --- | ---: | ---: | ---: | ---: |
| Baseline run 1 | 330,188 | 1,310 | 17,582 | 5.3248% |
| Baseline run 2 | 330,188 | 1,310 | 17,582 | 5.3248% |

Both runs reported 65 intentional lab-mirror clone groups. The baseline
ratchet file remains unchanged; it is the pre-refactor threshold, not a
replacement for this evidence.

## Largest authored pages/components

The largest 25 authored pages/components at baseline were:

| Lines | File |
| ---: | --- |
| 5,585 | `src/components/pitch/AutoSubPlanDialog.tsx` |
| 5,495 | `src/pages/VaultPage.tsx` |
| 4,613 | `src/pages/EventDetailPage.tsx` |
| 3,607 | `src/pages/MessagesPage.tsx` |
| 3,575 | `src/components/AddTeamMemberSheet.tsx` |
| 3,438 | `src/components/pitch/PitchBoard.tsx` |
| 3,208 | `src/pages/GroupChatPage.tsx` |
| 3,127 | `src/pages/HomePage.tsx` |
| 3,088 | `src/pages/TeamDetailPage.tsx` |
| 2,833 | `src/components/chat/VirtualizedChatMessageList.tsx` |
| 2,780 | `src/pages/ClubDetailPage.tsx` |
| 2,752 | `src/components/CompetitionFixturesPanel.tsx` |
| 2,431 | `src/pages/TeamChatPage.tsx` |
| 2,271 | `src/pages/MediaPage.tsx` |
| 2,228 | `src/pages/JoinTeamPage.tsx` |
| 2,083 | `src/pages/ManageUsersPage.tsx` |
| 2,081 | `src/pages/ClubSetupWizardPage.tsx` |
| 2,040 | `src/components/pitch/PitchBoardLandscapeLayout.tsx` |
| 1,977 | `src/pages/ClubChatPage.tsx` |
| 1,946 | `src/pages/CreateEventPage.tsx` |
| 1,851 | `src/components/pitch/PitchBoardPortraitLayout.tsx` |
| 1,846 | `src/pages/ClubEngagementAnalyticsPage.tsx` |
| 1,816 | `src/pages/CompetitionDetailPage.tsx` |
| 1,761 | `src/components/NextUpCarousel.tsx` |
| 1,749 | `src/pages/DirectMessagePage.tsx` |

## Baseline quality and product evidence

| Measure | Baseline |
| --- | ---: |
| Product TypeScript diagnostics | 171 |
| Product source-backed diagnostics | 111 |
| Product missing-reference diagnostics | 49 |
| Product inert Edge Function reference diagnostics | 11 |
| Product diagnostics resolved since baseline | 14 |
| Authored quality files | 1,225 |
| `as any` occurrences | 1,201 |
| `console` calls | 1,271 |
| Direct Supabase imports | 463 |
| Product JavaScript | 8,878,193 bytes |
| Largest product JavaScript chunk | 1,112,736 bytes |
| Product JavaScript chunks | 499 |
| Product CSS | 172,904 bytes |
| Product CSS chunks | 1 |
| Pitch portrait route chunk | 47,975 bytes |
| Pitch landscape route chunk | 53,092 bytes |
| PitchBoard route chunk | 137,605 bytes |
| Targeted pitch test files | 16 |
| Targeted pitch tests | 138 |

The product TypeScript baseline already had 14 ratchet failures from unrelated
dirty worktree changes. Phase 1.1 must not add diagnostics; it does not repair
those unrelated failures.

## Leading clone classification

The leading baseline clones were classified before implementation:

| Clone area | Classification and disposition |
| --- | --- |
| Pitch landscape/portrait imports and loading block | True removable duplication; consolidated in Phase 1.1. |
| `ClubThemeToggle` / `AppHeader` | Similar-looking presentation; keep separate until behavior and ownership contracts are characterized. |
| `VaultPage` self-duplication | True removable duplication; deferred to Phase 2.3. |
| `ChatMessage` / `GroupChatMessageRow` | Similar-looking but behaviorally different message surfaces; defer pending chat matrix. |
| Pitch landscape/portrait bench rendering | True removable presentation duplication; consolidated in Phase 1.1 while preserving outer orientation wrappers. |
| `CreateEventPage` / `EditEventPage` | True removable duplication with mutation differences; deferred to Phase 2.1. |
| `NextUpCarousel` / `EventCard` | Similar-looking cards with different data and interaction contracts; defer. |
| Pitch landscape/portrait bench controls | True removable presentation duplication; consolidated in Phase 1.1. |
| `CreateEventPage` / `EditEventPage` repeated form sections | True removable presentation duplication; deferred to Phase 2.1. |
| `BroadcastChatPage` / `ClubChatPage` | Similar-looking but route/provider behavior differs; keep local pending characterization. |
| `VaultPage` self-duplication | True removable duplication; deferred to Phase 2.3. |
| Mini-league admin/parent join-link cards | True removable presentation duplication; reserved for Phase 1.2. |
| `CompetitionFixturesPanel` self-duplication | True removable duplication; defer until its repeated sections are characterized. |
| `ClubChatPage` / `TeamChatPage` | Similar-looking but route-specific behavior differs; defer to chat phases. |
| Pitch swap preview overlays | Visually similar but orientation-specific sizing/coordinate behavior remains local; not merged in Phase 1.1. |

Generated code and tests did not enter this classification because they are
excluded consistently from the authored scanner scope. Intentional lab mirrors
remain disconnected and excluded from the ratchet.

## Phase 1.1 result

The two targeted layout files decreased from 3,891 combined lines
(2,040 landscape + 1,851 portrait) to 3,703 combined lines
(1,946 landscape + 1,757 portrait), a reduction of 188 lines. The shared
typed presentation files are:

- `src/components/pitch/PitchBoardSharedPresentation.tsx`
- `src/components/pitch/PitchBoardBenchPlayers.tsx`
- `src/components/pitch/PitchBoardPositionDialogs.tsx`

On the identical authored scan scope, the post-change result is 330,392
scanned lines, 1,302 counted clone groups, 17,415 counted duplicated lines,
and 5.2710% counted duplication. The increase in total scanned lines is the
small typed presentation/adaptor surface required to remove the larger
orientation-local copies; the targeted combined layout source and both
duplication measures decreased.

The position/bench extraction intentionally does not merge orientation-specific
pitch composition, sizing, coordinates, gesture handling, timer placement,
sheet behavior, or native status-bar/orientation behavior.
For the targeted pair alone, the same scan decreased pitch-pair clone groups
from 41 to 34 and duplicated lines from 884 to 753.

## Phase 1.2 result

The mini-league join-link cards had no direct card characterization tests
before this package. The adjacent invite and acceptance coverage consisted of
7 suites and 39 tests across the parent acceptance guard, invite acceptance
policy, and parent-invite sheet characterization tests.

The targeted cards started at 758 combined lines
(406 admin + 352 parent), 17 target clone groups, and 322 duplicated lines
(42.48%) using the identical 50-token/5-line pair scan. The cards now contain
486 combined lines (276 admin + 210 parent), a reduction of 272 lines. The
target pair now has 11 clone groups and 170 duplicated lines (34.98%).

The shared typed presentation and narrow role contract are:

- `src/components/mini-league/MiniLeagueJoinLinkCard.tsx`
- `src/components/mini-league/miniLeagueJoinLinkCardContract.ts`

Characterization coverage was added in:

- `src/components/mini-league/MiniLeagueJoinLinkCard.test.tsx`
- `src/components/mini-league/miniLeagueJoinLinkCardContract.test.ts`

The identical authored scan scope now reports 330,412 scanned lines, 1,294
counted clone groups, 17,227 counted duplicated lines, and 5.2138% counted
duplication. This is a reduction of 188 duplicated lines and 0.0572
percentage points from the Phase 1.1 checkpoint. Role-specific Supabase
queries, authorization checks, invite metadata, confirmation warning, share
copy/actions, and QR generation remain in the admin and parent adapters; the
shared component owns presentation and forwards those actions through typed
callbacks.

The final guarded product bundle passed its budget check at 8,873,630
JavaScript bytes, 1,112,736-byte largest chunk, 500 JavaScript chunks, and
172,904 CSS bytes. JavaScript bytes decreased from the Phase 1.1 checkpoint
(8,875,459 bytes) and the largest chunk and CSS totals were unchanged; the
shared presentation introduced one additional small common chunk.

## Phase 1.4 result

The CSV package started with 1,113 combined physical source lines: 601 in
`src/components/MemberCSVImportDialog.tsx` and 512 in
`src/components/MiniLeagueMemberCSVImportDialog.tsx`. The exact pinned
`jscpd 5.3.0` 50-token/5-line scan from the reproduction command reported 11
target clone groups, 190 duplicated lines, and 17.0710% duplication. All 11
groups were between those two files; no other CSV import dialog was linked by
this target clone report. The groups were:

| Member dialog range | Mini-league dialog range | Duplicated lines |
| --- | --- | ---: |
| 2-21 | 2-21 | 20 |
| 64-70 | 67-72 | 7 |
| 215-225 | 145-155 | 11 |
| 225-245 | 155-175 | 21 |
| 252-290 | 182-220 | 39 |
| 333-342 | 274-283 | 10 |
| 350-369 | 291-310 | 20 |
| 391-404 | 321-334 | 14 |
| 415-433 | 343-361 | 19 |
| 433-454 | 361-382 | 22 |
| 454-471 | 382-399 | 18 |

Before this package, `src/components/FixturesCSVImport.test.tsx` was the only
existing source CSV-import test and did not cover either member dialog. The
new `src/components/MemberCSVImportDialogs.characterization.test.tsx` has four
portal-aware tests. They passed before refactoring and after it, using
Testing Library `screen` to find the Radix-portaled dialog before locating its
file input. They cover team child/role mapping, team invalid-role reporting,
mini-league ability/parent mapping, mini-league invalid-ability reporting, and
the two distinct template filenames.

The extraction created the focused
`src/components/csv-import/CsvImportPresentation.tsx` module. It owns the
dialog frame, format-guide presentation, file/drop-zone UI, imported-file and
issue summaries, preview shell, and CSV template download lifecycle. The two
local adapters keep their parsers, field mappings, row editors, validation,
and import callbacks. The two residual clone groups (21 lines) are the file
reader and invalid-file handling surrounding those deliberately separate
parser adapters.

The post-change package contains 855 physical source lines: 334 team-member
adapter lines, 251 mini-league adapter lines, and 270 shared presentation
lines. The same target scan now reports 2 clone groups, 21 duplicated lines,
and 2.4561% duplication. This reduces the complete target package by 258
lines, 9 clone groups, 169 duplicated lines, and 14.6148 percentage points.
The same aggregate scan reports 329,933 scanned lines, 1,334 clone groups,
16,480 duplicated lines, and 4.9950% duplication, improving on the pre-change
330,191 lines, 1,345 groups, 16,689 duplicated lines, and 5.0543% duplication.

The targeted characterization tests pass (4 tests). The dedicated lab suite
passes (279 Node tests and 1,720 Vitest tests), and the legacy suite passes
(4,269 tests and 1 skipped). The guarded product build, product bundle check,
quality ratchet, duplication ratchet, and isolation check pass. The product
type ratchet reports only its 14 pre-existing unrelated diagnostics in
`StartDMDialog` and `ClubDetailPage`; this package adds none. The guarded
product bundle reports 8,862,636 JavaScript bytes, a 1,112,837-byte largest
chunk, 501 JavaScript chunks, and 172,904 CSS bytes, all within budget.

This is a maintainability-only consolidation. The build supplies a bundle
measurement, but the worktree contains unrelated changes and this package did
not add a request, subscription, or render benchmark. It therefore makes no
claim of lower request counts, fewer renders, faster interaction, or a
Phase-1.4-attributable runtime improvement.


## Phase 2.1 result

The exact pre-refactor pinned `jscpd 5.3.0` scan for the Create/Edit Event
page pair reported 27 clone groups and 521 duplicated lines. The pages were
1,946 and 1,723 lines respectively (3,669 combined). The report-linked
non-pair groups were deliberately classified as unrelated:
`MoveFileDialog`/`CreateEventPage` (9 lines),
`ClassEnrolmentPage`/`EditEventPage` (12 lines),
`CreateEventPage`/`ImportFixturesPage` (8 lines), and
`EditEventPage`/`EventDetailPage` (27 lines). No event-form subcomponent was
linked by the pre-refactor report.

The 27 exact Create/Edit page clone groups before edits were:

| First range | Second range | Duplicated lines |
| --- | --- | ---: |
| `pages/CreateEventPage.tsx:14-21` | `pages/EditEventPage.tsx:5-12` | 8 |
| `pages/CreateEventPage.tsx:38-53` | `pages/EditEventPage.tsx:34-49` | 16 |
| `pages/CreateEventPage.tsx:68-89` | `pages/EditEventPage.tsx:60-79` | 22 |
| `pages/CreateEventPage.tsx:136-147` | `pages/EditEventPage.tsx:142-153` | 12 |
| `pages/CreateEventPage.tsx:154-168` | `pages/EditEventPage.tsx:160-174` | 15 |
| `pages/CreateEventPage.tsx:268-275` | `pages/EditEventPage.tsx:270-277` | 8 |
| `pages/CreateEventPage.tsx:272-287` | `pages/EditEventPage.tsx:255-270` | 16 |
| `pages/CreateEventPage.tsx:294-309` | `pages/EditEventPage.tsx:289-303` | 16 |
| `pages/CreateEventPage.tsx:336-342` | `pages/CreateEventPage.tsx:365-371` | 7 |
| `pages/CreateEventPage.tsx:384-399` | `pages/EditEventPage.tsx:317-332` | 16 |
| `pages/CreateEventPage.tsx:401-409` | `pages/EditEventPage.tsx:337-345` | 9 |
| `pages/CreateEventPage.tsx:619-635` | `pages/EditEventPage.tsx:513-529` | 17 |
| `pages/CreateEventPage.tsx:645-657` | `pages/EditEventPage.tsx:539-551` | 13 |
| `pages/CreateEventPage.tsx:723-769` | `pages/EditEventPage.tsx:343-387` | 47 |
| `pages/CreateEventPage.tsx:908-924` | `pages/EditEventPage.tsx:806-822` | 17 |
| `pages/CreateEventPage.tsx:966-972` | `pages/EditEventPage.tsx:852-858` | 7 |
| `pages/CreateEventPage.tsx:1096-1136` | `pages/EditEventPage.tsx:1013-1053` | 41 |
| `pages/CreateEventPage.tsx:1367-1387` | `pages/EditEventPage.tsx:1196-1216` | 21 |
| `pages/CreateEventPage.tsx:1403-1409` | `pages/EditEventPage.tsx:1233-1239` | 7 |
| `pages/CreateEventPage.tsx:1423-1434` | `pages/EditEventPage.tsx:1600-1611` | 12 |
| `pages/CreateEventPage.tsx:1517-1542` | `pages/EditEventPage.tsx:1301-1326` | 26 |
| `pages/CreateEventPage.tsx:1648-1659` | `pages/EditEventPage.tsx:1363-1374` | 12 |
| `pages/CreateEventPage.tsx:1698-1759` | `pages/EditEventPage.tsx:1428-1489` | 62 |
| `pages/CreateEventPage.tsx:1759-1769` | `pages/EditEventPage.tsx:1489-1499` | 11 |
| `pages/CreateEventPage.tsx:1769-1822` | `pages/EditEventPage.tsx:1499-1552` | 54 |
| `pages/CreateEventPage.tsx:1825-1840` | `pages/EditEventPage.tsx:1555-1570` | 16 |
| `pages/CreateEventPage.tsx:1842-1854` | `pages/EditEventPage.tsx:1570-1582` | 13 |

The refactor extracted the controlled shared presentation module
`src/components/event/EventFormShared.tsx`. It owns the section header,
recurrence controls, duty editor, and address/map fields. The post-refactor
page pair reports 24 clone groups and 374 duplicated lines. The pages are now
1,750 and 1,531 lines, and the shared module is 300 lines: 3,581 combined
lines across the two pages plus the shared module, down 88 lines from the
original pair. The same aggregate scan reports 329,844 scanned lines, 1,331
clone groups, 16,336 duplicated lines, and 4.9526443% duplication, compared
with 329,933 lines, 1,334 groups, 16,480 duplicated lines, and 4.9949535%
before this phase.

Characterization coverage was added in
`src/pages/EventForm.characterization.test.ts`; its four tests passed before
and after the extraction. The existing create/edit validation and workflow
suites also remain green. Create and edit mutation/query wiring, permission
checks, create prefill/favorites/conflict behavior, edit record mapping and
series-selection/reconciliation behavior, local ICP forms, navigation, and
post-submit cache/error side effects intentionally remain page-owned.
Only the equivalent controlled presentation and form interaction surfaces are
shared; no divergent create/edit behavior was merged.

This is a maintainability-only result. The product build measured
8,859,950 JavaScript bytes, a 1,112,832-byte largest chunk, 501 JavaScript
chunks, and 172,904 CSS bytes, within the existing budgets. The extraction
adds no measured request, subscription, render, cache-invalidation, loading, or
interaction evidence, so it does not qualify as a runtime-performance win.


## Phase 2.2 result

The Club/Pro upgrade-page cluster consists of
`src/pages/ClubUpgradePage.tsx` and `src/pages/UpgradeProPage.tsx`. The exact
pinned `jscpd 5.3.0` scan used the standard 50-token/5-line thresholds and
ignore set from the reproduction command above. Before edits, the pages were
1,439 and 1,066 lines (2,505 combined), with 29 clone groups and 420 duplicated
lines (16.7665%). The complete pre-refactor clone report was:

| ClubUpgradePage range | UpgradeProPage range | Duplicated lines |
| --- | --- | ---: |
| 6-16 | 5-15 | 11 |
| 83-92 | 67-76 | 10 |
| 110-115 | 110-115 | 6 |
| 333-352 | 243-262 | 20 |
| 357-370 | 267-280 | 14 |
| 375-385 | 276-287 | 11 |
| 416-422 | 498-504 (Club self-clone) | 7 |
| 429-436 | 319-326 | 8 |
| 509-519 | 369-379 | 11 |
| 525-546 | 383-404 | 22 |
| 564-584 | 419-439 | 21 |
| 593-614 | 445-465 | 22 |
| 625-637 | 475-487 | 13 |
| 662-669 | 706-713 (Club self-clone) | 8 |
| 662-669 | 529-536 | 8 |
| 708-713 | 531-536 | 6 |
| 713-721 | 536-544 | 9 |
| 723-754 | 546-577 | 32 |
| 756-777 | 579-600 | 22 |
| 904-931 | 619-647 | 28 |
| 943-952 | 660-669 | 10 |
| 985-992 | 671-678 | 8 |
| 1024-1038 | 693-707 | 15 |
| 1040-1060 | 709-729 | 21 |
| 1069-1088 | 738-757 | 20 |
| 1097-1106 | 766-775 | 10 |
| 1108-1121 | 777-790 | 14 |
| 1172-1216 | 824-868 | 45 |
| 1255-1271 | 904-919 | 17 |

The extracted `src/components/subscription/UpgradePlanPresentation.tsx` owns
only equivalent presentation: loading skeleton, not-found and access-denied
states, trial cancellation presentation, billing toggle, feature comparison,
price summary, subscription loading state, legal links, and promo-code UI.
The Club page retains its plan selector and club/team presentation; both pages
retain their own checkout callbacks and promo mutations.

After extraction, `ClubUpgradePage.tsx` is 1,294 lines and
`UpgradeProPage.tsx` is 920 lines. The shared module is 280 lines, making the
complete package 2,494 lines, down 11 lines from the original two-page pair.
The identical target scan reports 21 clone groups and 286 duplicated lines
(11.4675%), a decrease of 8 groups, 134 duplicated lines, and 5.2990
percentage points. The aggregate scan reports 329,833 scanned lines, 1,321
clone groups, 16,169 duplicated lines, and 4.9021778% duplication, compared
with the Phase 2.1 checkpoint of 329,844 lines, 1,331 groups, 16,336 duplicated
lines, and 4.9526443%.

Characterization coverage was added in
`src/pages/UpgradePages.characterization.test.ts`; its five tests passed before
and after refactoring. They preserve the distinct club/team route and admin
contracts, promo scopes and checkout payloads, club team-limit plan selection,
and explicit club-fixture versus team-billing ICP behavior, while checking that
both variants retain the shared presentation states.

The guarded product build and bundle check passed at 8,856,603 JavaScript
bytes, a 1,112,832-byte largest chunk, 501 JavaScript chunks, and 172,904 CSS
bytes. The static imports changed the measured bundle from the Phase 2.1
checkpoint but did not add a lazy boundary, request, subscription, render, or
interaction measurement. This package is therefore a maintainability-only
improvement and makes no runtime-performance claim.

The product type ratchet reports exactly the 14 pre-existing unrelated
`StartDMDialog` and `ClubDetailPage` diagnostics; no upgrade-page diagnostic was
introduced. The dedicated lab suite, legacy suite, quality ratchet,
duplication ratchet, isolation check, and `git diff --check` pass. Vault and
Messages self-duplication remain intentionally untouched for Phases 2.3 and
2.4.

## Phase 2.3 result

The exact pre-refactor pinned `jscpd 5.3.0` scan used the standard
50-token/5-line thresholds and ignore set. `src/pages/VaultPage.tsx` was 5,495
lines. Its self-duplication comprised 22 clone groups and 412 duplicated lines.
The directly linked Vault scope (`src/pages/VaultPage.tsx`,
`src/components/vault`, and `src/features/vault`) contained 11,442 lines, 29
clone groups, and 452 duplicated lines (3.9503583%). The repeated areas were
folder/file lists, active/trash row actions and confirmations, empty/loading
states, cache invalidation calls, and storage-by-team projection.

The extraction created the typed `src/components/vault/VaultContentRenderer.tsx`
boundary and the typed `invalidateVaultCache` helper in
`src/features/vault/vaultQueryKeys.ts`. The renderer owns equivalent folder,
photo, file, trash, loading/empty, row-action, and storage projection markup;
page-owned callbacks continue to perform the provider-specific repository
work. The four characterization tests in
`src/pages/VaultPage.characterization.test.ts` passed before the extraction and
again after it. The cache-key contract tests also pass.

After the extraction, `VaultPage.tsx` is 4,597 lines, a raw reduction of 898
lines. The directly linked scope is 11,522 lines, 26 clone groups, and 362
duplicated lines (3.1418157%). The scope is 80 lines larger because the typed
renderer and cache-controller adapters are explicit source; the page itself is
materially smaller and the duplicated-line count decreased by 90.

The aggregate exact scan changed as follows:

| Measure | Before Phase 2.3 | After Phase 2.3 | Change |
| --- | ---: | ---: | ---: |
| Scanned lines | 329,833 | 329,913 | +80 |
| Clone groups | 1,321 | 1,318 | -3 |
| Duplicated lines | 16,169 | 16,079 | -90 |
| Duplication | 4.9021778% | 4.8737091% | -0.0284687 pp |

The exact after scan was reproduced with the same jscpd 5.3.0 command and
reported 1,318 clone groups, 16,079 duplicated lines, and 4.8737091%. The
quality ratchet's counted scope reports a different total because it applies
its authored-ratchet filtering; that result also passes and is not substituted
for this reproduction scan.

Supabase repository calls, permission scopes, mutations, and Supabase-versus-
ICP page behavior remain separate. Mini-league remains photo-only with file
actions disabled, rather than being merged with club/team semantics. Messages
self-duplication remains intentionally untouched for Phase 2.4.

This phase qualifies as a maintainability/bloat reduction only. The shared
module is statically imported and no request, subscription, render-count,
cache-invalidation, loading, or interaction benchmark was measured. Product
bundle output is reported only as budget-compliance evidence, not as a runtime
performance improvement.
