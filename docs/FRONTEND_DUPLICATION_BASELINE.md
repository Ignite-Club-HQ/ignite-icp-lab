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
(2,040 landscape + 1,851 portrait) to 3,701 combined lines
(1,945 landscape + 1,756 portrait), a reduction of 190 lines. The shared
typed presentation files are:

- `src/components/pitch/PitchBoardSharedPresentation.tsx`
- `src/components/pitch/PitchBoardBenchPlayers.tsx`
- `src/components/pitch/PitchBoardPositionDialogs.tsx`

On the identical authored scan scope, the post-change result is 330,384
scanned lines, 1,302 counted clone groups, 17,415 counted duplicated lines,
and 5.2711% counted duplication. The increase in total scanned lines is the
small typed presentation/adaptor surface required to remove the larger
orientation-local copies; the targeted combined layout source and both
duplication measures decreased.

The position/bench extraction intentionally does not merge orientation-specific
pitch composition, sizing, coordinates, gesture handling, timer placement,
sheet behavior, or native status-bar/orientation behavior.
For the targeted pair alone, the same scan decreased pitch-pair clone groups
from 41 to 34 and duplicated lines from 884 to 753.
