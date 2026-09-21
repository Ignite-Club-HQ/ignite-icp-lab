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
