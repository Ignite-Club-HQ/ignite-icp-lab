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

## Phase 2.4 result

The exact pre-refactor pinned `jscpd 5.3.0` scan used the standard
50-token/5-line thresholds and ignore set. `src/pages/MessagesPage.tsx` was
3,607 lines and contained 11 self-clone groups with 155 duplicated lines
(4.2972%). The repeated areas were inbox preview hydration, web realtime cache
patching, repeated loading/empty/error shell logic, and route-local filter /
ordering helpers.

The extraction created the typed `resolveInboxAuthorNames` /
`toInboxPreviewMessage` helper in
`src/features/messaging/inbox/inboxPreviewHydration.ts` and the typed web
realtime cache helpers in
`src/features/messaging/inbox/inboxRealtimeCache.ts`. The route-local
controller in `src/pages/MessagesPage.tsx` still owns message-source semantics,
authorization gates, query keys, provider-specific realtime behavior, lazy
dialog boundaries, and route-specific copy. The four characterization tests in
`src/pages/MessagesPage.characterization.test.ts` pass, and the existing
message-navigation, cold-offline, and web-realtime watermark guards also pass
against the extracted structure.

After the extraction, `MessagesPage.tsx` is 3,443 lines, a raw reduction of
164 lines. The exact target scope (`MessagesPage.tsx` plus the two extracted
helpers) remains 3,607 lines because the helpers are explicit source, but the
scope still decreased from 11 to 10 clone groups and from 155 to 93 duplicated
lines (4.2972% to 2.5783%). The package is therefore flatter and less
duplicated even though the extracted helper source balances the page reduction.

The aggregate exact scan changed as follows:

| Measure | Before Phase 2.4 | After Phase 2.4 | Change |
| --- | ---: | ---: | ---: |
| Scanned lines | 329,913 | 329,913 | 0 |
| Clone groups | 1,318 | 1,317 | -1 |
| Duplicated lines | 16,079 | 16,017 | -62 |
| Duplication | 4.8737091% | 4.8549163% | -0.0187928 pp |

The exact after scan was reproduced with the same jscpd 5.3.0 command and
reported 1,317 clone groups, 16,017 duplicated lines, and 4.8549163%
duplication. The authored ratchet uses its own filtered counted scope and is
not substituted for this reproduction scan.

`npm run typecheck:product` still reports only the documented unrelated
`StartDMDialog` and `ClubDetailPage` diagnostics; no Messages diagnostics were
introduced. `npm run build:product`, `npm run check:product-bundle`,
`npm run check:quality-ratchet`, `npm run check:isolation`,
`npm run check:duplication`, the full legacy suite, and `git diff --check`
pass. The default `npm test` run continues to fail in the unrelated
`lab-tests/external-worker-provider-registry.test.tsx` suite; that failure is
outside the Messages scope and was not introduced by this extraction.

This phase qualifies as a maintainability/bloat reduction only. The helpers are
statically imported and no request, subscription, render-count, cache, loading,
or interaction benchmark was measured. Product bundle output remains budget-
compliance evidence, not a runtime-performance improvement.

## Phase 3 result

The exact role and membership target scope used the pinned `jscpd 5.3.0`
50-token/5-line thresholds and included the two role-management pages and the
team/mini-league invite sheets. Before the consolidation it contained 5,207
lines, 34 clone groups, and 366 duplicated lines (7.0290%).

The extraction introduced focused typed modules:

- `src/components/membership/RoleMemberCard.tsx`;
- `src/components/membership/RoleManagementShell.tsx`;
- `src/components/membership/ParentInviteFields.tsx`;
- `src/features/membership/roleMutationFeedback.ts`.

After the extraction the target scope contains 5,391 lines, 29 clone groups,
and 299 duplicated lines (5.5463%). The complete scope is 184 lines larger
because the adapter and presentation contracts are explicit source; the
duplicated-line count decreases by 67 and the page/sheet files themselves are
smaller. Club/team queries, permissions, role-removal constraints, point-reset
behavior, cache scopes, and team-versus-mini-league invite semantics remain
separate. Five characterization tests pass, covering those differences.

Product build, bundle, quality-ratchet, isolation, duplication-ratchet, and
`git diff --check` gates pass. The product type ratchet still reports only the
documented unrelated diagnostics in `StartDMDialog` and `ClubDetailPage`.
This is a maintainability and safer-change result only; no request,
subscription, render-count, or interaction benchmark was measured.

## Phase 4A Messages result

The Phase 4A Messages decomposition moved the cohesive inbox presentation
sections into the typed
[`MessagesInboxSections.tsx`](../frontend/src/pages/MessagesInboxSections.tsx)
module. The page still owns provider selection and Supabase-versus-ICP
branches, user-scoped offline/cache behavior, query keys and mutations, all
authorization and realtime lifecycle code, error/retry behavior, dialog state,
and the existing lazy dialog imports. The new module owns only search/type/club
filter presentation, skeleton/list/empty states, group disclosure, and the
Contact/Discover/Sponsor tail.

The boundary was characterized against the committed inline implementation
before editing and re-run after extraction. The targeted suite passed 25 tests,
including the existing inbox ordering, offline, first-reveal, and realtime
watermark guards.

| Measure | Before | After | Change |
| --- | ---: | ---: | ---: |
| `MessagesPage.tsx` raw lines | 3,443 | 3,058 | -385 |
| Complete Messages package (`MessagesPage`, `MessagesInboxSections`, and non-test `features/messaging/inbox`) | 6,489 | 6,588 | +99 |
| Exact Phase 2.4 target scope | 3,607 | 3,706 | +99 |
| Same-scope jscpd | 93 lines / 10 groups / 2.5783% | 93 lines / 10 groups / 2.53% | 0 lines / 0 groups |
| Messages route chunk | 108,273 bytes | 109,204 bytes | +931 |
| Initial product chunk | 1,112,842 bytes | 1,112,842 bytes | 0 |
| Static query call sites (`useQuery` / `supabase.from` / RPC) | 23 / 43 / 5 | 23 / 43 / 5 | unchanged |
| Static realtime (`subscribe` / `registerChannel`) | 2 / 2 | 2 / 2 | unchanged |

The extracted module is statically imported and the package grows by the
explicit typed boundary, so this is a maintainability and safety result only.
The route chunk increase is not a runtime win. No request, subscription,
render-count, or interaction-latency improvement is claimed. Product
typecheck added no Messages diagnostics; the known unrelated
`StartDMDialog`/`ClubDetailPage` diagnostics remain. Product build, bundle,
quality, isolation, duplication, targeted legacy tests, and `git diff --check`
passed. Phase 4A stops after Messages as requested.

## Phase 4A Vault export and large-files result (2026-09-21)

The second Vault package extraction moved only the export/ZIP and large-files
management clusters into the typed `useVaultExport`, `useVaultLargeFiles`,
`VaultExportDialogs`, and `VaultLargeFilesDialog` modules. The page retains the
provider boundary, current-view and scope ownership, query client, storage
formatter, photo-download adapter, and page-local bulk selection/delete. Upload
and file-name state, lightbox, folder management, Drive import, and the prior
trash/recovery extraction were intentionally left untouched.

| Measure | Before | After |
| --- | ---: | ---: |
| `VaultPage.tsx` raw lines | 4,363 | 3,357 |
| `VaultPage.tsx` `useState` calls | 30 | 23 |
| Complete Vault source package (non-test) | 11,540 | 11,431 |
| New module lines | 0 | 897 |
| Same-scope jscpd | 362 lines / 26 groups / 3.1369151% | 321 lines / 24 groups / 2.8081533% |
| Product Vault route chunk | 117,157 bytes | 121,354 bytes |
| Product JavaScript total / chunks | 8,854,720 bytes / 502 | 8,859,848 bytes / 502 |
| Lazy-loading boundary | none added | none added |

The same-scope scan used jscpd 5.3.0 with 50-token/5-line thresholds and the
standard test/generated-type exclusions. The post-refactor scan reported 11,431
scanned source lines, 24 clone groups, and 321 duplicated lines. The targeted
characterization and contract suite passed 56 tests after also passing against
the inline pre-refactor implementation; the full legacy suite passed 4,303
tests across 450 files with one existing skip. Product typecheck remained at
exactly the known unrelated `StartDMDialog`/`ClubDetailPage` diagnostics.
Product build, bundle, quality, isolation, duplication, lab typecheck, and
`git diff --check` passed.

The extracted modules are statically imported and the affected route chunk is
4,197 bytes larger. No request, subscription, render-count, or interaction
benchmark was measured, so this is a maintainability/safety result only and
makes no runtime-performance claim.

## Phase 4A Vault lightbox result (2026-09-21)

The third Vault package extraction decoupled photo lightbox state and navigation
from the page's core surfaces by extracting the state management (open/close,
current index, navigate) into `src/features/vault/useVaultLightbox.ts` and the
presentation into `src/components/vault/VaultLightbox.tsx`. The page retains the
visible photo list scope and the permission check for delete capability.
Bulk selection/delete, upload/file-name flow, folder/file management, Google
Drive import, and the prior trash/recovery and export/large-files extractions
remain untouched.

| Measure | Before | After |
| --- | ---: | ---: |
| `VaultPage.tsx` raw lines | 3,357 | 3,356 |
| `useVaultLightbox.ts` | 0 | 71 |
| `VaultLightbox.tsx` | 0 | 30 |
| Characterization test | 0 | 67 |
| Complete Vault source package (non-test) | 11,528 | 11,628 |
| Same-scope jscpd | 321 lines / 24 groups / 2.78% | 321 lines / 24 groups / 2.76% |
| Product Vault route chunk | 121,354 bytes | 121,990 bytes |
| Product JavaScript total / chunks | 8,859,848 bytes / 502 | 8,859,848 bytes / 502 |
| Lazy-loading boundary | none added | none added |

The extraction produced a net +1 line in the page (two `useState` declarations
replaced by a similarly-sized hook call) and +100 lines in the complete package
(the explicit new modules). The same-scope jscpd scan reported 11,628 lines, 24
clone groups, and 321 duplicated lines—no reduction in duplicated lines, because
the lightbox state management was not shared across files before extraction.

The characterization and contract suite passed 67 new tests covering open/close
semantics, navigation (previous/next/keyboard), deletion-request callback, and
modal presentation; these tests also pass against the inline pre-refactor
implementation. The full legacy suite passed 4,303 tests with one existing skip.
Product typecheck remained at the known unrelated `StartDMDialog`/`ClubDetailPage`
diagnostics. Product build, bundle, quality, isolation, duplication, and
`git diff --check` passed.

The extracted modules are statically imported and the route chunk is 636 bytes
larger. No request, subscription, render-count, or interaction benchmark was
measured, so this is a maintainability/safety result only and makes no
runtime-performance claim. Further Phase 4A Vault targets (bulk selection/delete,
folder/file rename, upload, Google Drive import) remain untouched.

## Phase 4A Vault bulk selection/delete result (2026-09-21)

The fourth Vault package extraction moved the bulk selection and bulk
soft-delete cluster (`selectionMode`, `selectedPhotos`, `selectedFiles`,
`bulkDeleteDialogOpen`, `isDeletingSelected`, the toggle/select-all/exit
handlers, and the `deleteSelectedItems` workflow) into
`src/features/vault/useVaultBulkDeleteWorkflow.ts`, plus the presentational
`src/components/vault/VaultBulkDeleteDialog.tsx` for the confirmation dialog.
The hook reuses the already-tested `softDeleteVaultSelection` from
`vaultBulkMutationService.ts` (present in the ported source but previously
unused) instead of re-inlining per-item Supabase calls. Upload/file-name flow,
folder/file rename/move, Google Drive import, export/large-files, trash/
recovery, and the lightbox remain untouched; `useVaultExport` continues to
receive this hook's `selectionMode`/`selectedPhotos`/`selectedFiles`/
`exitSelectionMode` outputs unchanged.

All figures below were captured directly against this repository's commit
`ddc497293` (the "before" state) using the same reproduction command as the
baseline scan, scoped to `src/pages/VaultPage.tsx src/components/vault
src/features/vault`:

```sh
npx --no-install jscpd src/pages/VaultPage.tsx src/components/vault src/features/vault   --min-tokens 50 --min-lines 5   --ignore '**/*.test.ts,**/*.test.tsx'   --reporters json --output "$(mktemp -d)" --silent
```

| Measure | Before | After |
| --- | ---: | ---: |
| `VaultPage.tsx` raw lines | 3,356 | 3,255 |
| `VaultPage.tsx` `useState` calls | 21 | 18 |
| `useVaultBulkDeleteWorkflow.ts` | 0 | 132 |
| `VaultBulkDeleteDialog.tsx` | 0 | 57 |
| Complete Vault source package (non-test) | 11,531 | 11,619 |
| Same-scope jscpd | 321 lines / 24 groups / 2.7838001907900445% | 321 lines / 24 groups / 2.7627162406403305% |
| Product Vault route chunk | 121,991 bytes | 123,060 bytes |
| Product JavaScript total / chunks | 8,860,485 bytes / 502 | 8,861,554 bytes / 502 |
| Lazy-loading boundary | none added | none added |

The same-scope jscpd duplicated-line count and clone-group count are unchanged
(321/24); the percentage moved only because the scanned line total grew, since
this state/workflow was not duplicated elsewhere in the Vault package before
extraction.

`src/pages/VaultPage.bulk-delete.characterization.test.ts` (9 tests) was added
and proven to pass against the original inline `VaultPage.tsx` (verified by
temporarily restoring the pre-refactor file and re-running the suite) before
being kept green against the extracted hook/dialog. It covers independent
photo/file toggle semantics, `selectAll` scope, `exitSelectionMode` resetting
all three pieces of state together, ordered photo-then-file soft deletion via
the tested service, exact success/partial/failure toast wording and cache
invalidation keys, media-cache eviction, always-run close/exit-in-`finally`
semantics, and the confirmation dialog's exact copy/disabled state. The
existing `VaultPage.export-large-files.characterization.test.ts` assertion
that bulk selection remained page-owned was updated to assert the new hook
boundary. The full legacy suite passed 4,316 tests across 452 files with one
pre-existing skip and zero failures. Product typecheck remained at exactly the
known unrelated 14 `StartDMDialog`/`ClubDetailPage` diagnostics. Product
build, bundle budget, quality ratchet (`asAny` and `consoleCalls` both
decreased), duplication ratchet (1,570 duplicated lines removed repo-wide
since baseline), isolation, and `git diff --check` all passed.

The extracted modules are statically imported and the route chunk is 1,069
bytes larger. No request, subscription, render-count, or interaction
benchmark was measured, so this is a maintainability/safety result only and
makes no runtime-performance claim. The remaining untouched Vault clusters are
upload/file-name flow, folder/file rename/move, and Google Drive import.

## Phase 4A Vault folder/file management result (2026-09-21)

The fifth Vault package extraction moved the folder/file management cluster
(`folderPath`, `deleteFolderId`, `renameFolderId`/`renameFolderName`,
`renameFileId`/`renameFileName`, `renamePhotoId`/`renamePhotoName`,
`moveFileDialogOpen`, `fileToMove`, the create/delete/rename/move mutations,
and the `folderPath`-owning navigation helpers) into
`src/features/vault/useVaultFolderManagement.ts`, plus the presentational
`src/components/vault/VaultFolderManagementDialogs.tsx` for the
create/delete/rename/move dialogs. The hook reuses the already-tested
`moveVaultFile` from `vaultMutationRepository.ts` (present in the ported
source but previously unused — the page had its own duplicate inline Supabase
update) instead of re-inlining the update, and reuses the already-tested
`abbreviateVaultOrganisationName` from `vaultScope.ts` for breadcrumb club-name
abbreviation instead of re-declaring the same regex table. Upload/file-name
flow, Google Drive import/link/title resolution, storage purchase,
export/large-files, trash/recovery, and bulk selection/delete remain
untouched; `VaultContentRenderer`'s `onRenamePhoto`/`onRenameFile`/
`onMoveFile`/`onRenameFolder`/`onDeleteFolder` callback contract is unchanged.

All figures below were captured directly against this repository's commit
`049332b3b` (the "before" state) using the same reproduction command as the
baseline scan, scoped to `src/pages/VaultPage.tsx src/components/vault
src/features/vault`:

```sh
npx --no-install jscpd src/pages/VaultPage.tsx src/components/vault src/features/vault   --min-tokens 50 --min-lines 5   --ignore '**/*.test.ts,**/*.test.tsx'   --reporters json --output "$(mktemp -d)" --silent
```

| Measure | Before | After |
| --- | ---: | ---: |
| `VaultPage.tsx` raw lines | 3,255 | 2,883 |
| `VaultPage.tsx` `useState` calls | 18 | 12 |
| `useVaultFolderManagement.ts` | 0 | 463 |
| `VaultFolderManagementDialogs.tsx` | 0 | 233 |
| Complete Vault source package (non-test) | 11,619 | 11,943 |
| Same-scope jscpd | 321 lines / 24 groups / 2.7627162406403305% | 318 lines / 24 groups / 2.6626475759859334% |
| Product Vault route chunk | 123,060 bytes | 126,670 bytes |
| Product JavaScript total / chunks | 8,861,554 bytes / 502 | 8,865,164 bytes / 502 |
| Lazy-loading boundary | none added | none added (`MoveFileDialog`'s existing lazy boundary relocated unchanged) |

The same-scope jscpd duplicated-line count decreased slightly (321 → 318, same
24 clone groups); this was incidental — an initial draft of the hook briefly
re-declared the club-name abbreviator inline, jscpd caught the resulting
duplicate against `vaultScope.ts`, and it was replaced with a direct import of
the existing `abbreviateVaultOrganisationName` before this round's final
measurements. Net of that fix, this cluster's state/mutations/navigation were
not otherwise duplicated elsewhere in the Vault package.

`src/pages/VaultPage.folder-management.characterization.test.ts` (15 tests)
was added and proven to pass against the original inline `VaultPage.tsx`
before extraction, then kept green against the extracted hook/dialogs. It
covers create/delete/rename-folder mutation inputs and exact toasts,
rename-file/rename-photo sharing `renameVaultItem`, move-file's conditional
`team_id` update (reusing `moveVaultFile`) and dialog-state clearing,
folder-open/back/breadcrumb-jump navigation semantics, hierarchy breadcrumb
node construction (including the abbreviator reuse), each dialog's exact copy
and blank-name disabled state, `MoveFileDialog`'s lazy import and team/club
scope wiring, a boundary-narrowness check, and that upload, Drive import,
export/large-files, trash/recovery, and bulk-delete call sites are untouched.
The existing `VaultPage.bulk-delete.characterization.test.ts` assertion that
this cluster remained page-owned was updated to assert the new hook boundary.
One transient product-typecheck diagnostic (`onMoveFile`'s callback parameter
type not structurally matching `ContentSectionProps`'s expected
`(file: VaultFile) => void`, because the hook's `VaultFileToMove` required a
non-optional `folder_id` that `VaultFile` only exposes through an index
signature) was fixed by introducing a looser `VaultMoveFileSource` parameter
type for the callback boundary, keeping `VaultFileToMove` for the hook's own
dialog state. The full legacy suite passed 4,331 tests across 453 files with
one pre-existing skip and zero failures. Product typecheck remained at exactly
the known unrelated 14 `StartDMDialog`/`ClubDetailPage` diagnostics;
`typecheck:lab` was clean. Product build, bundle budget, quality ratchet
(`asAny` and `consoleCalls` both decreased), duplication ratchet (1,573
duplicated lines removed repo-wide since baseline), isolation, and
`git diff --check` all passed.

The extracted modules are statically imported and the route chunk is 3,610
bytes larger. No request, subscription, render-count, or interaction
benchmark was measured, so this is a maintainability/safety result only and
makes no runtime-performance claim. The only remaining untouched Vault cluster
is upload/file-name flow and Google Drive import/link/title resolution.

## Phase 4A Vault Drive/Add Link result (2026-09-21)

The sixth Vault package extraction moved the Google Drive / Add Link / OAuth /
title-resolution cluster into `useVaultDriveLinkWorkflow` and
`VaultDriveLinkDialogs`. The page retains `currentView`, folder scope
ownership, upload/file-name flow, storage purchase state, content rendering,
and all previously extracted Vault workflow boundaries.

| Measure | Before | After |
| --- | ---: | ---: |
| `VaultPage.tsx` raw lines | 2,883 | 2,732 |
| `VaultPage.tsx` `useState` calls | 12 | 8 |
| `useVaultDriveLinkWorkflow.ts` | 0 | 190 |
| `VaultDriveLinkDialogs.tsx` | 0 | 106 |
| Characterization test | 0 | 147 |
| Complete Vault source package (non-test) | 11,943 | 12,122 |
| Same-scope jscpd | 318 lines / 24 groups / 2.66% | 298 lines / 22 groups / 2.46% |
| Product Vault route chunk | 126,670 bytes | 128,117 bytes |
| Product JavaScript total / chunks | 8,861,554 bytes / 502 | 8,866,611 bytes / 502 |
| Lazy-loading boundary | existing dialog lazy boundaries only | existing dialog lazy boundaries retained |

The same-scope scan used jscpd 5.3.0 with 50-token/5-line thresholds and the
standard test/generated-type exclusions across `VaultPage.tsx`,
`components/vault`, and `features/vault`. The post-refactor scan reported
12,122 scanned non-test source lines, 22 clone groups, and 298 duplicated
lines. The complete source package grows by 179 lines because the hook,
dialog, and repository contract are explicit; the page itself is 151 lines
smaller and owns four fewer local state declarations.

`src/pages/VaultPage.drive-link.characterization.test.ts` covers saved OAuth
error cleanup, OAuth code exchange redirect URI semantics, import-versus-link
token routing, pending flag cleanup, Add Link scoping and toasts, Drive title
resolution toasts/cache invalidation, dialog mutation wiring, and dialog target
scope props. Existing bulk-delete and folder-management characterization tests
were updated only to assert the new Drive boundary instead of expecting the
cluster to remain inline. Targeted Vault tests passed (61 tests). Product
typecheck introduced no Vault diagnostic; its ratchet failure remains limited
to the known unrelated 14 `StartDMDialog`/`ClubDetailPage` diagnostics. Product
build, bundle budget, quality ratchet, duplication ratchet, isolation, and
same-scope jscpd passed.

The extracted modules are statically imported and the route chunk is 1,447
bytes larger than the folder-management result. No request, subscription,
render-count, or interaction-latency evidence was collected, and no
runtime-performance claim is made — this is a maintainability/safety extraction
only. The main remaining high-line-count Vault cluster is upload/file-name
flow.

## Phase 4A Vault upload/file-name result (2026-09-22)

The seventh and final named Vault package extraction moved the upload/
file-name/quota-reservation cluster into `useVaultUploadWorkflow`. The page
retains `currentView`, folder scope ownership, `canUpload`/`canManageVaultPro`
gates, and every other previously extracted Vault workflow boundary.

The hook's mutations delegate to `uploadVaultItem` in
`src/features/vault/vaultUploadService.ts` — added in an earlier round with
its own passing test file but never actually wired into `VaultPage.tsx` until
this round — instead of re-inlining the reserve/upload/settle/compensate/
insert mechanics a third time. The one-line orphaned-object compensation
comment was restored at the service's call site so the documented rationale
survives now that the code path is live.

All figures below were captured directly against this repository's commit
`f2b279e56` (the "before" state, matching the prior round's "after") using
the same reproduction command as the baseline scan, scoped to
`src/pages/VaultPage.tsx src/components/vault src/features/vault`:

```sh
npx --no-install jscpd src/pages/VaultPage.tsx src/components/vault src/features/vault   --min-tokens 50 --min-lines 5   --ignore '**/*.test.ts,**/*.test.tsx'   --reporters json --output "$(mktemp -d)" --silent
```

| Measure | Before | After |
| --- | ---: | ---: |
| `VaultPage.tsx` raw lines | 2,732 | 2,548 |
| `VaultPage.tsx` `useState` calls | 8 | 4 |
| `useVaultUploadWorkflow.ts` | 0 | 125 |
| Complete Vault source package (non-test) | 12,122 | 12,064 |
| Same-scope jscpd | 298 lines / 22 groups / 2.46% | 235 lines / 19 groups / 1.95% |
| Product Vault route chunk | 128,117 bytes | 128,050 bytes |
| Product JavaScript total / chunks | 8,866,611 bytes / 502 | 8,866,544 bytes / 502 |
| Lazy-loading boundary | existing dialog lazy boundaries only | existing dialog lazy boundaries retained |

Unlike every prior Vault round, the complete non-test package size decreased
(-58 lines) despite adding a new 125-line hook, because the extraction reuses
`uploadVaultItem`'s already-tested logic instead of duplicating it inline a
third time. Same-scope jscpd duplication dropped for the same reason (298 →
235 duplicated lines, 22 → 19 clone groups).

`src/pages/VaultPage.upload.characterization.test.ts` (13 tests) was added
and proven to pass against the original inline `VaultPage.tsx` before
extraction, then kept green against the extracted hook. It covers reserve-
before-write ordering, the four storage-path shapes, upload-failure and
insert-failure settlement/compensation, success settlement, storage-URL and
photo-only `file_type` scoping, the file-name fallback order, both cache-
invalidation scopes, dialog-close/`fileName`-reset/success-toast semantics
(file uploads only; photo uploads intentionally have no success toast), the
exact failure toasts, the `uploading` flag lifecycle for both upload paths,
a boundary-narrowness check, and that every other Vault cluster remains
untouched. The pre-existing base/drive-link/folder-management
characterization tests' "untouched cluster" assertions referencing the
now-moved `uploadPhotoMutation`/`uploadFileMutation` identifiers or
cache-invalidation literal were updated to assert the new hook boundary
instead, matching every prior round's pattern.

Targeted Vault tests passed (206 tests across 23 files); the full legacy
suite passed 4,364 tests across 455 files (1 pre-existing skip, 0 failures).
Product typecheck introduced no new Vault diagnostic; its ratchet failure
remains limited to the known unrelated 14 `StartDMDialog`/`ClubDetailPage`
diagnostics. `typecheck:lab` was clean. Product build, bundle budget, quality
ratchet, duplication ratchet (1,669 duplicated lines removed repo-wide since
baseline), isolation, same-scope jscpd, and `git diff --check` all passed.

The extracted module is statically imported and the route chunk is 67 bytes
smaller than the Drive/Add Link result — line movement between chunks, not a
runtime claim. No request, subscription, render-count, or interaction-latency
evidence was collected, and no runtime-performance claim is made — this is a
maintainability/safety extraction only. This completes every workflow cluster
named in the original Phase 4A Vault responsibility map. The subsequently
authorized presentation-only top-section extraction is recorded below.

## Phase 4A Vault header/storage/action-toolbar result (2026-09-22)

Starting from commit `99d3b55b8`, the root/inner header, hierarchy
breadcrumbs, compact and expanded storage display, selection/export controls,
and Upload/Add/More toolbars moved from
[`VaultPage.tsx`](../frontend/src/pages/VaultPage.tsx) into the grouped typed
presentation boundary in
[`VaultTopSection.tsx`](../frontend/src/components/vault/VaultTopSection.tsx).
Queries, `currentView`, storage and quota inputs, workflow hooks, mutations,
dialog ownership, and provider behavior remain in the page.

| Measure | Before | After |
| --- | ---: | ---: |
| `VaultPage.tsx` raw lines | 2,548 | 2,114 |
| `VaultTopSection.tsx` raw lines | 0 | 646 |
| Complete Vault source package (non-test) | 12,064 | 12,276 |
| `VaultPage.tsx` local `useState` declarations | 10 | 10 |
| Same-scope jscpd duplicated lines | 235 | 235 |
| Same-scope jscpd clone groups | 19 | 19 |
| Same-scope jscpd percentage | 1.9479% | 1.9143% |
| Product Vault route chunk | 128,050 bytes | 129,860 bytes |
| Product JavaScript total / chunks | 8,866,544 bytes / 502 | 8,868,354 bytes / 502 |
| Lazy-loading boundary | route plus existing interaction-gated boundaries | unchanged |

The direct local-state recount corrects the preceding upload round's reported
value of four: there are ten page-local `useState` declarations in both the
before and after source, and this presentation module owns none. The page
shrinks by 434 lines (17.0%), while the complete package grows by 212 lines
for explicit grouped models and presentation adapters. Duplicated lines and
groups are unchanged; the percentage movement comes only from the larger
denominator, so this result makes no duplication-removal claim.

The eight new tests in
[`VaultPage.top-section.characterization.test.ts`](../frontend/src/pages/VaultPage.top-section.characterization.test.ts)
passed against the inline before state and the extracted after state. The
eight characterization files passed 73 tests before and after. All 32 Vault
test files passed 283 tests; the full legacy suite passed 4,372 tests across
456 files with one existing skip. Lab typecheck and isolation passed. Product
typecheck had only the 14 known unrelated `StartDMDialog`/`ClubDetailPage`
diagnostics. Product build, bundle budget, quality ratchet, duplication
ratchet, and diff checks passed.

The new presentation module is statically imported. The existing route,
`UploadFilesDialog`, `VaultStorageBreakdown`, storage-purchase, and other lazy
boundaries are unchanged. The route chunk increased by 1,810 bytes, and no
request, subscription, render-count, interaction, or latency benchmark was
performed. This is maintainability/safety evidence only, not a runtime-
performance claim. Work stops at this presentation extraction; no data-model
extraction was started.

## Phase 4A Vault navigation/search presentation result (2026-09-22)

The next presentation-only boundary extracted the search status, root club
picker, club team-folder and mini-league navigation panels, and club/team/
mini-league `VaultContentRenderer` entries into
`src/components/vault/VaultMainContent.tsx`. `VaultPage.tsx` retains all
queries, current-view state, navigation callbacks, provider behavior, workflow
hooks, and content-renderer data models; the new component receives typed
models and page-owned actions.

| Measure | Before | After |
| --- | ---: | ---: |
| `VaultPage.tsx` raw lines | 2,114 | 1,887 |
| `VaultMainContent.tsx` | 0 | 425 |
| Characterization test | 0 | 177 |
| Complete Vault source package (non-test) | 12,276 | 12,474 |
| Same-scope jscpd | 235 lines / 19 groups / 1.91% | 208 lines / 18 groups / 1.67% |
| Product Vault route chunk | 129,860 bytes | 130,929 bytes |
| Product JavaScript total / chunks | 8,868,354 bytes / 502 | 8,869,423 bytes / 502 |
| Lazy-loading boundary | unchanged | unchanged |

The page is 227 lines smaller. The complete source package grows by 198
non-test lines because the typed presentation model is explicit, but same-scope
duplication decreases by 27 lines and one clone group. The characterisation
contract verifies the non-root/non-trash search condition and status copy,
root picker loading/empty/filter/Pro upgrade behavior, team-folder grouping
and color classes, uncategorized team behavior, mini-league navigation, and
the content-renderer contracts including mini-league's read-only file policy.

Focused navigation/top-section contracts passed (20 tests); the full legacy
suite passed 4,384 tests with one pre-existing skip across 457 files.
`typecheck:lab`, build, product bundle budget, quality ratchet, isolation, and
duplication ratchet passed. Product typecheck remains limited to the known
unrelated `StartDMDialog`/`ClubDetailPage` diagnostics. The presentation module
is statically imported, so the 1,069-byte route-chunk increase is organization
overhead. No request, subscription, render-count, interaction, or latency
benchmark was performed; this is maintainability/safety evidence only.

## Phase 4A Vault access/entitlement/root-navigation data-model result (2026-09-22)

The next Vault boundary extracted the access/entitlement/root-navigation
query-derived data model into `src/features/vault/useVaultAccessModel.ts`:
the app-admin query, user-roles query, `hasVaultRoleAccess`, the `userClubs`
query and its once-only root auto-navigation effect, `isClubAdmin`/
`isCoachOrTeamAdmin`/`userTeamIds`, `adminUpgradeInfo`, the scoped club/team
Pro-entitlement queries and current-context Pro derivation, the root-level
any-Pro-access query, and `canAccessVault`/`hasProButNoRole`/
`isLoadingAccess`. `VaultPage.tsx` retains `currentView`/`setCurrentView`
ownership, passing it to the hook as a read-only input plus an explicit
`onAutoNavigateToClub` callback. All Vault content/search/storage queries,
workflow hooks, mutations, presentation components, dialogs, and the
already-extracted navigation JSX are unchanged.

Unlike the presentation rounds, this is a higher-risk data-model extraction.
The hook composes the previously unused (zero-consumer, already fully
tested) `vaultAccessRepository.ts`/`vaultAccess.ts`/`vaultQueryKeys.ts`
modules instead of duplicating this logic a second time, matching the
`useVaultFolderManagement.ts` + `vaultMutationRepository.ts` sibling
pattern; the previously-wired `src/lab/vaultAccess.ts` module is now
orphaned. Every query key and cache-invalidation-relevant literal consumed
by `src/lib/invalidateProAccess.ts` (`is-app-admin`, `user-admin-roles`,
`pro-access-info`, and the `vaultKeys.clubsForUser`/`clubHasPro`/
`teamHasPro` builders), every `enabled` condition, and the once-only
auto-navigation semantics were preserved exactly. No fallback provider was
added.

| Measure | Before | After |
| --- | ---: | ---: |
| `VaultPage.tsx` raw lines | 1,887 | 1,656 |
| `useVaultAccessModel.ts` | 0 | 229 |
| Hook contract test (`useVaultAccessModel.test.tsx`) | 0 | 262 |
| Characterization test | 0 | 111 |
| Complete Vault source package (non-test) | 12,474 | 12,472 |
| `VaultPage.tsx` `useState` calls | 4 | 4 |
| Same-scope jscpd | 208 lines / 18 groups / 1.6675% | 208 lines / 18 groups / 1.6676% |
| Product Vault route chunk | 130,929 bytes | 131,232 bytes |
| Product JavaScript total / chunks | 8,869,423 bytes / 502 | 8,869,726 bytes / 502 |
| Lazy-loading boundary | unchanged | unchanged |

The page is 231 lines smaller. Because the extraction reuses already-tested
modules instead of duplicating them, the complete non-test package is 2 lines
smaller overall despite adding a 229-line hook. Same-scope jscpd duplicated
lines and clone-group count are unchanged (208/18). The `useState` count is
unchanged because this cluster used only `useQuery`/`useMemo`/`useEffect`/
`useRef`, never local `useState`.

18 runtime contract tests (`renderHook`) cover app-admin bypass,
role-without-Pro denial, Pro-without-role denial (`hasProButNoRole`), root
access grant, loading-state aggregation, scoped club/team Pro entitlement by
active club, club-admin/committee and coach/team-admin isolation,
upgrade-target selection, team-id ordering, and four root auto-navigation
scenarios. 13 source-contract characterization tests were run against the
original inline page/logic before extraction and again afterward (13/13 both
times); all 10 Vault-page characterization files (98 tests) and all 24
`features/vault` test files (224 tests) pass after extraction.

The complete legacy suite passed 4,415 tests across 459 files (one
pre-existing skip). Lab typecheck and isolation passed. Product typecheck
returned only the 14 known unrelated `StartDMDialog`/`ClubDetailPage`
diagnostics (independently confirmed identical against the pristine
pre-extraction tree, so this is pre-existing baseline drift, not introduced
by this change). Product build, bundle budget, quality ratchet, duplication
ratchet, and diff checks passed.

The 303-byte route-chunk increase is bundle-budget evidence only, not a
runtime claim. No request, subscription, render-count, interaction, or
latency benchmark was performed; this is maintainability/safety evidence
only. This closes the data-model cluster flagged by the preceding
presentation round. Vault items/files/folders/search queries and storage
data remain unextracted and are the next candidate, in a separate task.
