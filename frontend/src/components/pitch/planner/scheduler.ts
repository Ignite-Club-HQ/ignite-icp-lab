// Auto-sub scheduling core: pure planning logic for `createSubPlan` and
// `createMiniLeagueSubPlan`, extracted from AutoSubPlanDialog.tsx so the
// dialog file only contains presentation/controller code. No React
// dependency — this module is deterministic, side-effect-free planning
// logic covered by the fairness matrix, mode-contract, and orchestration
// simulation test suites.
import { PitchPosition } from "../PositionBadge";
import {
  inferredOutfieldPosition,
  inferredPitchPosition,
  normalizeRotationSpeed,
  calculateTimeForecasts,
} from "./analysis";
import { buildSubWindows } from "./windows";
import { buildEqualTimePlan } from "./equalTime";
import { ensureNoStarvedPlayers } from "./standardMode";
import { isPlanPlayableFromPlayers } from "./validation";
import { type AutoSubAdvancedOverrides } from "./advancedOverrides";

export interface Player {
  id: string;
  name: string;
  number?: number;
  position: { x: number; y: number } | null;
  assignedPositions?: PitchPosition[];
  currentPitchPosition?: PitchPosition;
  minutesPlayed?: number;
  isInjured?: boolean;
  teamSide?: "a" | "b";
}

export interface SubstitutionEvent {
  time: number;
  half: 1 | 2;
  playerOut: Player;
  playerIn: Player;
  positionSwap?: {
    player: Player;
    fromPosition: PitchPosition;
    toPosition: PitchPosition;
  };
  executed?: boolean;
  skipped?: boolean;
}

export interface MiniLeagueTeams {
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];
  teamAColor?: string;
  teamBColor?: string;
  teamAName?: string;
  teamBName?: string;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

/** Target gap between Standard-mode sub windows (seconds). 7 min sits in the
 *  spec'd 6–8 min window: low disruption, predictable cadence. */
const PRACTICAL_SUB_INTERVAL_SECONDS = 7 * 60;
/** Maximum players swapped in a single Standard-mode window. */
const PRACTICAL_MAX_SUBS_PER_WINDOW = 2;
/** Fairness floor: players projected below this fraction of target minutes
 *  override the FIFO queue and are prioritised ON. */
const PRACTICAL_MIN_THRESHOLD_RATIO = 0.75;
/** Soft cap: players projected above this fraction of target minutes are
 *  prioritised to come OFF next AND blocked from coming ON. */
const PRACTICAL_MAX_THRESHOLD_RATIO = 1.2;
/** No subs before this minute mark from kickoff (settling-in window). */
const PRACTICAL_NO_SUB_BEFORE_SECONDS = 5 * 60;
/** No subs in this trailing window of each half. */
const PRACTICAL_NO_SUB_AFTER_SECONDS = 150; // 2.5 min
/** Players just subbed on are protected from being pulled off for this long. */
const PRACTICAL_RECENT_SUB_PROTECTION_SECONDS = 4 * 60;
/** How early (seconds) we may pull a sub forward to rescue a player who would
 *  otherwise breach the minimum threshold. */
const PRACTICAL_EARLY_SUB_TOLERANCE_SECONDS = 60;
/** Keep normal Standard windows from landing immediately beside forced GK
 *  participation windows. */
const PRACTICAL_GK_WINDOW_BUFFER_SECONDS = 3 * 60;

// ===========================================================================
// EQUAL-TIME OVERRIDE — global fairness post-pass.
// ---------------------------------------------------------------------------
// The conventional planner is a set of local heuristics (starter bias,
// continuity, GK protection, churn removal). Those heuristics are good at
// producing natural-looking rotations but they cannot see the whole match, so
// on some squad shapes — most visibly when the goalkeeper rotates at halftime —
// they settle on a plan whose playing-time spread breaks the coach's cap.
//
// `buildEqualTimePlan` solves the same problem globally: it allocates each
// player a per-half outfield budget (accounting for the halves a keeper is
// unavailable for outfield duty) and walks the match filling those budgets.
// This helper runs that planner across a range of substitution cadences and
// adopts its output when it is fairer than the conventional plan.
//
// It is deliberately shared by every branch of `createSubPlan` (standard,
// frequent and the legacy fallback) so fairness is enforced on the plan the
// coach actually receives, whichever branch produced it.
// ===========================================================================

/**
 * Playing-time totals using the same model as `calculateTimeForecasts` and the
 * pitch board itself: a player accrues time whenever they are on the pitch,
 * and a substitution takes `playerOut` off and puts `playerIn` on. Goalkeepers
 * are on the pitch, so their time is included automatically.
 */
function naivePlanTotals(
  players: Player[],
  plan: SubstitutionEvent[],
  halfDurationSeconds: number,
): Map<string, number> {
  const totalSec = halfDurationSeconds * 2;
  const onPitch = new Set(players.filter(p => p.position !== null).map(p => p.id));
  // Include time already banked before this plan. The equal-time planner uses
  // that history when compensating deficits; comparing candidate plans without
  // it could reject the corrective plan and preserve a visibly unfair one.
  const totals = new Map<string, number>(
    players.map(p => [p.id, Math.max(0, p.minutesPlayed ?? 0)] as const),
  );
  const abs = (s: SubstitutionEvent) =>
    s.half === 1 ? s.time : halfDurationSeconds + s.time;
  const ordered = [...plan].sort((a, b) => abs(a) - abs(b));
  let last = 0;
  for (const ev of ordered) {
    const t = Math.max(last, Math.min(totalSec, abs(ev)));
    onPitch.forEach(id => totals.set(id, (totals.get(id) ?? 0) + (t - last)));
    last = t;
    onPitch.delete(ev.playerOut.id);
    onPitch.add(ev.playerIn.id);
  }
  onPitch.forEach(id => totals.set(id, (totals.get(id) ?? 0) + (totalSec - last)));
  return totals;
}

/** Players the planner can actually rebalance — excludes locked-in keepers. */
function rebalanceablePlayers(players: Player[], rotateGkAtHalftime: boolean): Player[] {
  return players.filter(p => {
    if (p.isInjured) return false;
    const gkOnly =
      p.assignedPositions?.length === 1 && p.assignedPositions[0] === "GK";
    // A GK-only player is locked to goal for the whole match unless the keeper
    // rotates at halftime, in which case they are only locked for one half and
    // their total is still a fairness input.
    if (gkOnly && !rotateGkAtHalftime) return false;
    return true;
  });
}

function planSpreadSeconds(
  players: Player[],
  plan: SubstitutionEvent[],
  halfDurationSeconds: number,
  rotateGkAtHalftime: boolean,
): number {
  const totals = naivePlanTotals(players, plan, halfDurationSeconds);
  const values = rebalanceablePlayers(players, rotateGkAtHalftime).map(
    p => totals.get(p.id) ?? 0,
  );
  if (values.length < 2) return 0;
  return Math.max(...values) - Math.min(...values);
}

interface EqualTimeOverrideOptions {
  playerData: Player[];
  teamSize: number;
  halfDurationSeconds: number;
  gkOnPitch: Player | null | undefined;
  halftimeGkIn: Player | null | undefined;
  rotateGkAtHalftime: boolean;
  maxSpreadMinutes: number;
  rotationSpeed: number;
  eff: {
    standardTargetInterval: number;
    standardIntervalFloor: number;
    frequentIntervalFloor: number;
    minShiftSeconds: number;
  };
  priorityOrderLength: number;
  startHalf: 1 | 2;
  startElapsedSeconds: number;
  benchCount: number;
  currentPlan: SubstitutionEvent[];
}

function applyEqualTimeOverride(
  opts: EqualTimeOverrideOptions,
): SubstitutionEvent[] | null {
  const {
    playerData,
    teamSize,
    halfDurationSeconds,
    gkOnPitch,
    halftimeGkIn,
    rotateGkAtHalftime,
    maxSpreadMinutes,
    rotationSpeed,
    eff,
    priorityOrderLength,
    startHalf,
    startElapsedSeconds,
    benchCount,
    currentPlan,
  } = opts;

  // Only from kickoff, only when the coach hasn't imposed a manual priority
  // order (which is an explicit instruction to be unequal), and only when
  // there is somebody on the bench to rotate with.
  if (priorityOrderLength > 0 || startHalf !== 1 || startElapsedSeconds !== 0) return null;
  if (benchCount <= 0) return null;

  try {
    const capSec = Math.max(0, maxSpreadMinutes) * 60;
    const currentSpread = planSpreadSeconds(
      playerData,
      currentPlan,
      halfDurationSeconds,
      rotateGkAtHalftime,
    );

    // Sweep substitution cadences from the calmest to the busiest. The
    // equal-time planner groups swaps into windows spaced `minShiftSec` apart,
    // so a larger value means a quieter plan. Take the FIRST (calmest) cadence
    // that meets the cap; otherwise keep whichever produced the least spread.
    const cadenceFloor =
      rotationSpeed >= 2 ? eff.frequentIntervalFloor : eff.standardIntervalFloor;
    const rawCadences = [
      eff.standardTargetInterval,
      cadenceFloor,
      Math.max(60, eff.minShiftSeconds),
      240,
      180,
      120,
      90,
      60,
    ]
      .map(v => Math.max(60, Math.round(v)))
      .filter(v => v <= halfDurationSeconds);
    // Keep the sweep on the correct side of the selected mode's own cadence
    // floor. Without this, Standard and Frequent sweep the same superset and
    // both stop on whichever cadence first meets the spread cap — producing
    // identical plans regardless of the chosen rotation mode.
    const modeCadences = rawCadences.filter(v =>
      rotationSpeed >= 2 ? v <= eff.frequentIntervalFloor : v >= eff.standardIntervalFloor,
    );
    const cadences = Array.from(
      new Set(
        (modeCadences.length > 0
          ? modeCadences
          : [Math.max(60, Math.min(halfDurationSeconds, Math.round(cadenceFloor)))]),
      ),
    ).sort((a, b) => b - a);


    let best: { plan: SubstitutionEvent[]; spread: number } | null = null;
    for (const minShiftSec of cadences) {
      const eqResult = buildEqualTimePlan({
        players: playerData as unknown as Parameters<typeof buildEqualTimePlan>[0]["players"],
        teamSize,
        halfDurationSec: halfDurationSeconds,
        gk1H: (gkOnPitch || undefined) as never,
        gk2H: (rotateGkAtHalftime
          ? halftimeGkIn || gkOnPitch || undefined
          : gkOnPitch || undefined) as never,
        chunkSec: 30,
        minShiftSec,
        noSubBeforeSec: 0,
        noSubAfterSec: 30,
        // Standard deliberately prefers the compact equal-time cycle. Frequent
        // uses the windowed allocator so the two product modes do not collapse
        // to an identical number of match interruptions.
        preferCompactCycle: rotationSpeed < 2,
      });
      const candidate = eqResult.plan as unknown as SubstitutionEvent[];
      if (candidate.length === 0) continue;
      const spread = planSpreadSeconds(
        playerData,
        candidate,
        halfDurationSeconds,
        rotateGkAtHalftime,
      );
      if (!best || spread < best.spread) best = { plan: candidate, spread };
      if (spread <= capSec) break;
    }

    if (!best) return null;
    // Adopt when the equal-time plan meets the cap the conventional plan
    // misses, or when it is simply fairer. Ties keep the conventional plan so
    // the familiar rotation shape wins when fairness is equivalent.
    const currentMeetsCap = currentSpread <= capSec;
    const eqMeetsCap = best.spread <= capSec;
    if (eqMeetsCap && !currentMeetsCap) return best.plan;
    if (best.spread < currentSpread) return best.plan;
    return null;
  } catch (err) {
    // Never break the planner — fall through to the conventional output.
    // eslint-disable-next-line no-console
    console.warn("[createSubPlan] equal-time override failed:", err);
    return null;
  }
}


// ===========================================================================
// STANDARD-MODE CALMNESS GUARANTEE
// ---------------------------------------------------------------------------
// Product rule: "Standard" must ALWAYS be the quieter plan. Because fairness
// post-passes can push Standard onto a busier cadence than Frequent on some
// squad shapes, the public `createSubPlan` wraps the planner: it builds the
// Frequent reference plan for the same inputs and, if Standard came out with
// the same or more substitutions, re-plans Standard on progressively calmer
// interval floors until it is strictly quieter. Recursion is guarded so the
// inner calls never re-enter this wrapper.
// ===========================================================================
let standardCalmnessReentryGuard = false;

/** Calmer interval floors (sec) tried in order when Standard is too busy. */
const STANDARD_CALMDOWN_FLOORS_SEC = [300, 360, 420, 480, 540, 600];

const substitutionAbsoluteTime = (
  substitution: Pick<SubstitutionEvent, "half" | "time">,
  halfDurationSeconds: number,
) => substitution.half === 1
  ? substitution.time
  : halfDurationSeconds + substitution.time;

/** Product cadence is measured in interruption moments, not player movements. */
function countSubstitutionWindows(
  plan: SubstitutionEvent[],
  halfDurationSeconds: number,
): number {
  return new Set(plan.map((substitution) =>
    substitutionAbsoluteTime(substitution, halfDurationSeconds))).size;
}

/**
 * Find the fairest playable way to combine one adjacent pair of substitution
 * windows. This lets Standard remain genuinely quieter without deleting a
 * player's turn or hiding extra churn inside the plan.
 */
function compactOneSubstitutionWindow(
  source: SubstitutionEvent[],
  players: Player[],
  halfDurationSeconds: number,
  rotateGkAtHalftime: boolean,
  maxSpreadSeconds: number,
): SubstitutionEvent[] | null {
  const sourceWindows = Array.from(new Set(source.map((substitution) =>
    substitutionAbsoluteTime(substitution, halfDurationSeconds)))).sort((a, b) => a - b);
  if (sourceWindows.length < 2) return null;

  let best: { plan: SubstitutionEvent[]; spread: number } | null = null;
  const sameWindowYoyoCount = (plan: SubstitutionEvent[]) => {
    const windows = new Map<number, { ins: Set<string>; outs: Set<string> }>();
    for (const substitution of plan) {
      const absolute = substitutionAbsoluteTime(substitution, halfDurationSeconds);
      const window = windows.get(absolute) ?? { ins: new Set<string>(), outs: new Set<string>() };
      window.ins.add(substitution.playerIn.id);
      window.outs.add(substitution.playerOut.id);
      windows.set(absolute, window);
    }
    let count = 0;
    windows.forEach((window) => window.ins.forEach((id) => {
      if (window.outs.has(id)) count += 1;
    }));
    return count;
  };
  const sourceYoyos = sameWindowYoyoCount(source);
  for (let index = 0; index < sourceWindows.length - 1; index += 1) {
    const left = sourceWindows[index];
    const right = sourceWindows[index + 1];
    // Never merge across the halftime boundary. Keep the halftime goalkeeper
    // handover as its own explicit, predictable operation.
    if ((left < halfDurationSeconds) !== (right < halfDurationSeconds)) continue;
    if (left === halfDurationSeconds || right === halfDurationSeconds) continue;

    const midpoint = Math.round(((left + right) / 2) / 30) * 30;
    for (const target of Array.from(new Set([left, midpoint, right]))) {
      const candidate = source.map((substitution) => {
        const absolute = substitutionAbsoluteTime(substitution, halfDurationSeconds);
        if (absolute !== left && absolute !== right) return substitution;
        return {
          ...substitution,
          half: (target < halfDurationSeconds ? 1 : 2) as 1 | 2,
          time: target < halfDurationSeconds ? target : target - halfDurationSeconds,
        };
      }).sort((a, b) =>
        substitutionAbsoluteTime(a, halfDurationSeconds) -
        substitutionAbsoluteTime(b, halfDurationSeconds));

      if (!isPlanPlayableFromPlayers(players, candidate, halfDurationSeconds)) continue;
      // Combining windows must not create an on/off instruction for the same
      // player at one whistle. Preserve any unavoidable existing halftime GK
      // handover, but never introduce additional yo-yos.
      if (sameWindowYoyoCount(candidate) > Math.max(1, sourceYoyos)) continue;
      const spread = planSpreadSeconds(
        players,
        candidate,
        halfDurationSeconds,
        rotateGkAtHalftime,
      );
      if (spread > maxSpreadSeconds) continue;
      if (!best || spread < best.spread) best = { plan: candidate, spread };
    }
  }
  return best?.plan ?? null;
}

export function createSubPlan(
  playerData: Player[],
  teamSize: number,
  halfDurationSeconds: number,
  rotationSpeedInput: number = 1,
  disablePositionSwaps: boolean = false,
  disableBatchSubs: boolean = false,
  rotateGkAtHalftime: boolean = true,
  startElapsedSeconds: number = 0,
  startHalf: 1 | 2 = 1,
  preferredSecondHalfGkId?: string,
  maxSpreadMinutes: number = 5,
  advancedOverrides: AutoSubAdvancedOverrides = {}
): SubstitutionEvent[] {
  const run = (speed: number, overrides: AutoSubAdvancedOverrides) =>
    createSubPlanInternal(
      playerData,
      teamSize,
      halfDurationSeconds,
      speed,
      disablePositionSwaps,
      disableBatchSubs,
      rotateGkAtHalftime,
      startElapsedSeconds,
      startHalf,
      preferredSecondHalfGkId,
      maxSpreadMinutes,
      overrides,
    );

  const plan = run(rotationSpeedInput, advancedOverrides);
  const speed = normalizeRotationSpeed(rotationSpeedInput);
  // Only Standard (speed 1) carries the "always fewer subs" promise.
  if (speed !== 1 || standardCalmnessReentryGuard || plan.length === 0) return plan;

  standardCalmnessReentryGuard = true;
  try {
    const frequentReference = run(2, advancedOverrides);
    if (frequentReference.length === 0) {
      return plan;
    }

    const frequentWindows = countSubstitutionWindows(frequentReference, halfDurationSeconds);
    const capSeconds = Math.max(0, maxSpreadMinutes) * 60;
    const qualifying: SubstitutionEvent[][] = [];
    const consider = (candidate: SubstitutionEvent[] | null) => {
      if (!candidate) return;
      if (countSubstitutionWindows(candidate, halfDurationSeconds) >= frequentWindows) return;
      if (candidate.length > frequentReference.length) return;
      if (planSpreadSeconds(
        playerData,
        candidate,
        halfDurationSeconds,
        rotateGkAtHalftime,
      ) > capSeconds) return;
      qualifying.push(candidate);
    };

    consider(plan);
    consider(compactOneSubstitutionWindow(
      plan,
      playerData,
      halfDurationSeconds,
      rotateGkAtHalftime,
      capSeconds,
    ));
    // Frequent is the tightest fair allocation. Coalescing one of its windows
    // is a safe Standard candidate: same player movements, one less match
    // interruption, and accepted only if the selected spread remains intact.
    consider(compactOneSubstitutionWindow(
      frequentReference,
      playerData,
      halfDurationSeconds,
      rotateGkAtHalftime,
      capSeconds,
    ));

    let best = plan;
    for (const floorSec of STANDARD_CALMDOWN_FLOORS_SEC) {
      if (floorSec > halfDurationSeconds) break;
      const calmer = run(1, {
        ...advancedOverrides,
        standardIntervalFloorSec: floorSec,
        standardTargetIntervalSec: Math.max(
          floorSec,
          advancedOverrides.standardTargetIntervalSec ?? floorSec + 120,
        ),
      });
      if (calmer.length === 0) continue;
      if (calmer.length < best.length) best = calmer;
      consider(calmer);
      consider(compactOneSubstitutionWindow(
        calmer,
        playerData,
        halfDurationSeconds,
        rotateGkAtHalftime,
        capSeconds,
      ));
      // Preserve the legacy fallback boundary when no cap-preserving compact
      // candidate exists. Continuing to ever-higher floors can reduce raw
      // event count at the cost of a dramatically worse playing-time spread.
      if (best.length < frequentReference.length) break;
    }

    if (qualifying.length > 0) {
      return qualifying.sort((left, right) => {
        const spreadDelta = planSpreadSeconds(
          playerData, left, halfDurationSeconds, rotateGkAtHalftime,
        ) - planSpreadSeconds(
          playerData, right, halfDurationSeconds, rotateGkAtHalftime,
        );
        if (spreadDelta !== 0) return spreadDelta;
        return countSubstitutionWindows(left, halfDurationSeconds) -
          countSubstitutionWindows(right, halfDurationSeconds);
      })[0];
    }
    return best;
  } catch {
    return plan;
  } finally {
    standardCalmnessReentryGuard = false;
  }
}

function createSubPlanInternal(

  playerData: Player[],
  teamSize: number,
  halfDurationSeconds: number,
  rotationSpeedInput: number = 1,
  disablePositionSwaps: boolean = false,
  disableBatchSubs: boolean = false,
  rotateGkAtHalftime: boolean = true,
  startElapsedSeconds: number = 0,
  startHalf: 1 | 2 = 1,
  preferredSecondHalfGkId?: string,
  maxSpreadMinutes: number = 5,
  advancedOverrides: AutoSubAdvancedOverrides = {}
): SubstitutionEvent[] {
  const rotationSpeed = normalizeRotationSpeed(rotationSpeedInput);
  // Resolve overrides → effective tunables (clamped to safe ranges)
  const ov = advancedOverrides || {};
  // Ultra-thin bench auto-tighten: when bench is ≤1 the standard floors
  // (4 min interval / 3 min shift) become the bottleneck and prevent
  // equal-time rotations. Drop them so e.g. a 5-player / 4-a-side / 40-min
  // squad can sub every 4 min and land each player on 32'/8'.
  const _benchCount = (playerData ?? []).filter(p => p.position === null).length;
  const _ultraThinBench = _benchCount > 0 && _benchCount <= 1;
  const _autoIntervalFloor = _ultraThinBench ? 180 : 240;       // 3 min vs 4 min
  const _autoFreqFloor     = _ultraThinBench ? 120 : 180;       // 2 min vs 3 min
  const _autoMinShift      = _ultraThinBench ? 150 : 180;       // 2.5 min vs 3 min
  const _autoTarget        = _ultraThinBench ? 240 : PRACTICAL_SUB_INTERVAL_SECONDS;
  const eff = {
    standardTargetInterval: Math.max(180, Math.min(900, ov.standardTargetIntervalSec ?? _autoTarget)),
    standardIntervalFloor: Math.max(120, Math.min(600, ov.standardIntervalFloorSec ?? _autoIntervalFloor)),
    frequentIntervalFloor: Math.max(60, Math.min(420, ov.frequentIntervalFloorSec ?? _autoFreqFloor)),
    minShiftSeconds: Math.max(60, Math.min(360, ov.minShiftSeconds ?? _autoMinShift)),
    halftimeGuardSeconds: ov.halftimeGuardSeconds !== undefined
      ? Math.max(0, Math.min(420, ov.halftimeGuardSeconds))
      : undefined, // undefined → fall back to interval floor at use site
  };
  const priorityOrder = Array.isArray(ov.playerPriorityOrder) ? ov.playerPriorityOrder : [];
  const priorityRank = new Map(priorityOrder.map((id, index) => [id, index] as const));
  const priorityBiasMaxSeconds = Math.max(0, (maxSpreadMinutes * 60) / 2);
  const priorityTargetBiasSeconds = (id: string) => {
    const rank = priorityRank.get(id);
    if (rank === undefined || priorityOrder.length < 2 || priorityBiasMaxSeconds <= 0) return 0;
    const midpoint = (priorityOrder.length - 1) / 2;
    return ((midpoint - rank) / Math.max(1, midpoint)) * priorityBiasMaxSeconds;
  };
  const priorityPullOffCompare = (a: string, b: string) => {
    if (priorityOrder.length < 2) return 0;
    return (priorityRank.get(b) ?? Number.MAX_SAFE_INTEGER) - (priorityRank.get(a) ?? Number.MAX_SAFE_INTEGER);
  };
  const priorityBringOnCompare = (a: string, b: string) => {
    if (priorityOrder.length < 2) return 0;
    return (priorityRank.get(a) ?? Number.MAX_SAFE_INTEGER) - (priorityRank.get(b) ?? Number.MAX_SAFE_INTEGER);
  };
  const plan: SubstitutionEvent[] = [];

  if (!playerData || playerData.length === 0 || teamSize <= 0 || halfDurationSeconds <= 0) {
    return [];
  }

  playerData = playerData.map(p =>
    p.position !== null && !p.currentPitchPosition
      ? { ...p, currentPitchPosition: inferredPitchPosition(p) }
      : p
  );

  const playersOnPitch = playerData.filter(p => p.position !== null);
  const benchPlayers = playerData.filter(p => p.position === null);

  if (benchPlayers.length === 0) return [];

  // Separate GK from outfield players
  const gkOnPitch = playersOnPitch.find(p => p.currentPitchPosition === "GK");
  // Resolve the 2H GK. If the coach explicitly picked one in the lineup
  // screen, honour it absolutely — whether they're currently on the bench
  // OR already on the pitch in an outfield role. Only fall back to the
  // sole-GK bench player when no explicit preference was provided.
  const explicitGkOnBench = preferredSecondHalfGkId
    ? benchPlayers.find(p => p.id === preferredSecondHalfGkId)
    : undefined;
  const explicitGkOnPitch = preferredSecondHalfGkId
    ? playersOnPitch.find(p => p.id === preferredSecondHalfGkId && p.currentPitchPosition !== "GK")
    : undefined;
  const fallbackGkOnBench = !preferredSecondHalfGkId
    ? benchPlayers.find(p => p.assignedPositions?.includes("GK") && p.assignedPositions?.length === 1)
    : undefined;

  // `gkOnBench` represents a 2H GK that needs to come ON from the bench at HT.
  // If the explicit pick is already on the pitch, there's no bench-incoming GK.
  const gkOnBench = explicitGkOnBench || (preferredSecondHalfGkId ? undefined : fallbackGkOnBench);
  const preferredOnPitchGk = explicitGkOnPitch;
  const predictedFallbackGk = !gkOnBench && !preferredOnPitchGk && rotateGkAtHalftime && gkOnPitch
    ? benchPlayers.find(p => p.assignedPositions?.includes("GK") || !p.assignedPositions?.length) || null
    : null;
  const halftimeGkIn = rotateGkAtHalftime && gkOnPitch && startHalf === 1
    ? (gkOnBench || preferredOnPitchGk || predictedFallbackGk || null)
    : null;

  // Determine whether the starting GK will be rotated out at halftime — if so,
  // they need to be eligible for H2 outfield rotation, otherwise they sit the
  // entire 2nd half (e.g. starting GK gets 50% while everyone else gets 67–83%).
  const startingGkWillRotate = !!(rotateGkAtHalftime && gkOnPitch && startHalf === 1);
  const startingGkCanPlayOutfield = !!gkOnPitch;
  const includeStartingGkInRotation = startingGkWillRotate && startingGkCanPlayOutfield;

  const outfieldPlayers = playerData.filter(p => {
    if (p.currentPitchPosition === "GK") {
      // Include the starting GK in the rotation pool so they can come on as
      // an outfielder in the 2nd half after the halftime GK swap.
      return includeStartingGkInRotation;
    }
    if (halftimeGkIn && p.id === halftimeGkIn.id) return true;
    if (p.assignedPositions?.includes("GK") && p.assignedPositions?.length === 1) return false;
    return true;
  });

  const outfieldOnPitch = playersOnPitch.filter(p => p.currentPitchPosition !== "GK");
  const outfieldOnBench = benchPlayers.filter(p => {
    if (halftimeGkIn && p.id === halftimeGkIn.id) return true;
    if (p.assignedPositions?.includes("GK") && p.assignedPositions?.length === 1) return false;
    return true;
  });

  if (outfieldOnBench.length === 0) {
    if (rotateGkAtHalftime && gkOnBench && gkOnPitch) {
      plan.push({
        time: 0,
        half: 2,
        playerOut: gkOnPitch,
        playerIn: gkOnBench,
        executed: false,
      });
    }
    return plan;
  }

  // Calculate remaining game time based on when we're starting
  // Clamp elapsed time to half duration to avoid negative remaining time
  const clampedStartElapsed = Math.min(startElapsedSeconds, halfDurationSeconds);
  const remainingInCurrentHalf = halfDurationSeconds - clampedStartElapsed;
  const remainingHalves = startHalf === 1 ? remainingInCurrentHalf + halfDurationSeconds : remainingInCurrentHalf;
  const totalRemainingSeconds = Math.max(remainingHalves, 0);
  const fieldPositions = outfieldOnPitch.length || Math.max(teamSize - (gkOnPitch ? 1 : 0), 1);
  const totalOutfieldPlayers = outfieldPlayers.length;

  // EXACT EQUAL-TIME ROTATION FOR ONE-BENCH + HALFTIME GK SWAP
  // ---------------------------------------------------------------------------
  // Canonical case: 7-a-side, 8 available, 40 min. Everyone must get exactly
  // 35' because each player has one equal bench stint. With a halftime GK swap,
  // the 2H GK must be benched before HT, then the 1H GK must immediately return
  // as an outfielder at HT. The generic planner tends to drift here because it
  // protects GK continuity and starts H2 with the 1H GK still benched.
  const oneBenchHalftimeGkExactEligible =
    priorityOrder.length === 0 &&
    rotateGkAtHalftime &&
    !!gkOnPitch &&
    !!halftimeGkIn &&
    gkOnPitch.id !== halftimeGkIn.id &&
    outfieldOnBench.length === 1 &&
    playerData.filter(p => !p.isInjured).length === teamSize + 1 &&
    startHalf === 1 &&
    clampedStartElapsed === 0;

  if (oneBenchHalftimeGkExactEligible) {
    const healthyPlayers = playerData.filter(p => !p.isInjured);
    const totalMatchSec = halfDurationSeconds * 2;
    const benchStintSec = totalMatchSec / healthyPlayers.length;
    const periodsPerHalf = halfDurationSeconds / benchStintSec;
    const exactPossible =
      Number.isInteger(benchStintSec) &&
      Number.isInteger(periodsPerHalf) &&
      periodsPerHalf >= 2;

    if (exactPossible) {
      const playerById = new Map(playerData.map(p => [p.id, p]));
      const nonGkOutfield = outfieldOnPitch.filter(p => p.id !== halftimeGkIn.id);
      const h1RegularBenchCount = Math.max(0, periodsPerHalf - 2);
      const h1Regulars = nonGkOutfield.slice(0, h1RegularBenchCount);
      const h2Regulars = nonGkOutfield.slice(h1RegularBenchCount);
      const h1BenchQueue = [outfieldOnBench[0], ...h1Regulars, halftimeGkIn];
      const h2BenchQueue = [...h2Regulars, gkOnPitch];

      if (h1BenchQueue.length === periodsPerHalf && h2BenchQueue.length === periodsPerHalf) {
        const currentPositions = new Map<string, PitchPosition>();
        outfieldOnPitch.forEach(p => currentPositions.set(p.id, inferredOutfieldPosition(p)));
        const exactPlan: SubstitutionEvent[] = [];

        const emitDirectSub = (half: 1 | 2, time: number, outgoing: Player, incoming: Player) => {
          const outPos = currentPositions.get(outgoing.id) || inferredOutfieldPosition(outgoing);
          exactPlan.push({
            time,
            half,
            playerOut: { ...outgoing, currentPitchPosition: outPos },
            playerIn: { ...incoming, currentPitchPosition: outPos },
            executed: false,
          });
          currentPositions.delete(outgoing.id);
          currentPositions.set(incoming.id, outPos);
        };

        for (let i = 1; i < h1BenchQueue.length; i++) {
          const outgoing = playerById.get(h1BenchQueue[i].id);
          const incoming = playerById.get(h1BenchQueue[i - 1].id);
          if (!outgoing || !incoming) break;
          emitDirectSub(1, Math.round(benchStintSec * i), outgoing, incoming);
        }

        exactPlan.push({
          time: 0,
          half: 2,
          playerOut: gkOnPitch,
          playerIn: halftimeGkIn,
          executed: false,
        });

        currentPositions.delete(halftimeGkIn.id);

        for (let i = 0; i < h2BenchQueue.length; i++) {
          const outgoing = playerById.get(h2BenchQueue[i].id);
          const incoming = i === 0 ? gkOnPitch : playerById.get(h2BenchQueue[i - 1].id);
          if (!outgoing || !incoming) break;
          emitDirectSub(2, Math.round(benchStintSec * i), outgoing, incoming);
        }

        return exactPlan;
      }
    }
  }

  // EXACT EQUAL-TIME ROTATION FOR ULTRA-THIN BENCHES
  // -------------------------------------------------
  // 4-a-side with 5 available players is the canonical case: one player is
  // always off, so equal game time means equal BENCH periods. The generic
  // planner spaces `N` windows across the match, which accidentally creates
  // short first/long later bench stints (e.g. 18/17/17/16/13). For exactly one
  // bench player and no GK constraint, use a simple queue with periods snapped
  // to a full multiple of the player count. Examples:
  // - 20 min match, 5 players → 5 × 4-min periods → everyone plays 16'
  // - 40 min match, 5 players → 10 × 4-min periods → everyone plays 32'
  // Allow the exact thin-bench planner to also cover the case where there's a
  // full-game GK locked into goal (no halftime swap). The remaining outfielders
  // + 1 bench rotate via simple round-robin, achieving exact equal outfield
  // minutes — e.g. 8 players / 7-aside / 40 min with locked GK → 7 outfielders
  // each play 34.3 min, GK 40 min (mathematical floor for that config).
  const canUseExactThinBenchPlanner =
    outfieldOnBench.length === 1 &&
    totalOutfieldPlayers === outfieldOnPitch.length + 1 &&
    totalOutfieldPlayers > 1 &&
    !halftimeGkIn &&
    startHalf === 1 &&
    clampedStartElapsed === 0 &&
    totalRemainingSeconds > 0;

  if (canUseExactThinBenchPlanner) {
    const preferredPeriodSeconds = 4 * 60;
    const minimumPeriodsForCadence = Math.max(
      totalOutfieldPlayers,
      Math.ceil(totalRemainingSeconds / preferredPeriodSeconds),
    );
    const equalPeriodCount = Math.max(
      totalOutfieldPlayers,
      Math.ceil(minimumPeriodsForCadence / totalOutfieldPlayers) * totalOutfieldPlayers,
    );
    const thinPlayerById = new Map(playerData.map(p => [p.id, p]));
    const rotationOnPitch = outfieldOnPitch.map(p => ({
      id: p.id,
      position: (p.currentPitchPosition || "MID") as PitchPosition,
    }));
    let benchId = outfieldOnBench[0].id;
    const exactPlan: SubstitutionEvent[] = [];

    for (let period = 1; period < equalPeriodCount; period++) {
      const absoluteSeconds = Math.round((totalRemainingSeconds * period) / equalPeriodCount);
      const outgoing = rotationOnPitch.shift();
      const incoming = thinPlayerById.get(benchId);
      const playerOut = outgoing ? thinPlayerById.get(outgoing.id) : undefined;
      if (!outgoing || !incoming || !playerOut) break;

      const { half, time } = absoluteSeconds < halfDurationSeconds
        ? { half: 1 as const, time: absoluteSeconds }
        : { half: 2 as const, time: absoluteSeconds - halfDurationSeconds };

      exactPlan.push({
        time,
        half,
        playerOut,
        playerIn: { ...incoming, currentPitchPosition: outgoing.position },
        executed: false,
      });

      rotationOnPitch.push({ id: incoming.id, position: outgoing.position });
      benchId = outgoing.id;
    }

    return exactPlan;
  }

  // ===========================================================================
  // PRACTICAL MODE (rotationSpeed === 1) — early return.
  // FIFO queue rotation, ~7 min between sub windows, max 2 swaps per window.
  // No spread escalation. Designed to mirror how a real junior coach manages
  // a game: predictable order, few interruptions, "fair enough" distribution.
  // ===========================================================================
  if (rotationSpeed === 1) {
    const startAbs = startHalf === 1 ? clampedStartElapsed : halfDurationSeconds + clampedStartElapsed;
    const endAbs = halfDurationSeconds * 2;
    const subsPerWindow = Math.max(
      1,
      Math.min(
        disableBatchSubs ? 1 : PRACTICAL_MAX_SUBS_PER_WINDOW,
        outfieldOnBench.length,
        outfieldOnPitch.length
      )
    );
    // BENCH-AWARE CADENCE: the default 7-min window keeps Standard low-disruption,
    // but with a large bench (e.g. 9v9 +5, 11v11 +6) a fixed 7-min cadence can't
    // rotate everyone through within the spread cap and minutes blow out to 16-20'.
    // Shrink the interval just enough to deliver one full rotation cycle in the
    // remaining game time, with a hard floor of 4 min so windows never get tricky.
    // Cycle = N off-events needed (one per outfielder), batched `subsPerWindow` at a time.
    const cycleWindowsNeeded = Math.ceil(totalOutfieldPlayers / subsPerWindow);
    const cadenceForCycle = totalRemainingSeconds > 0 && cycleWindowsNeeded > 0
      ? Math.floor(totalRemainingSeconds / (cycleWindowsNeeded + 1))
      : eff.standardTargetInterval;
    const PRACTICAL_MIN_INTERVAL = Math.min(
      eff.standardIntervalFloor,
      Math.max(90, Math.floor(cadenceForCycle || eff.standardIntervalFloor)),
    ); // Short games / large benches must not be starved by a fixed 4-min floor.
    const intervalSec = Math.max(
      PRACTICAL_MIN_INTERVAL,
      Math.min(eff.standardTargetInterval, cadenceForCycle)
    );
    const noSubBeforeSeconds = Math.min(
      PRACTICAL_NO_SUB_BEFORE_SECONDS,
      Math.max(60, Math.floor(halfDurationSeconds * 0.2)),
    );
    const noSubAfterSeconds = Math.min(
      PRACTICAL_NO_SUB_AFTER_SECONDS,
      Math.max(45, Math.floor(halfDurationSeconds * 0.12)),
    );
    const halftimeBlackoutSeconds = Math.min(90, Math.max(30, Math.floor(intervalSec * 0.5)));

    // ---- Fairness model ------------------------------------------------------
    // targetSec = (gameDuration × playersOnField) / totalPlayers
    // minThreshold = 0.75 × target — fairness floor (override FIFO)
    // maxThreshold = 1.20 × target — soft cap (prioritise OFF, block ON)
    // GK priority is handled with protected outfield runs either side of the
    // halftime keeper swap, without adding double-credit on top of GK minutes.
    const fullGameSec = halfDurationSeconds * 2;
    const fairPlayerCount = Math.max(playerData.filter(p => !p.isInjured).length, 1);
    const targetSecPerPlayer = (fullGameSec * teamSize) / fairPlayerCount;
    const playerTargetSec = (id: string) => Math.max(0, targetSecPerPlayer + priorityTargetBiasSeconds(id));
    const playerMinThresholdSec = (id: string) => playerTargetSec(id) * PRACTICAL_MIN_THRESHOLD_RATIO;
    const playerMaxThresholdSec = (id: string) => playerTargetSec(id) * PRACTICAL_MAX_THRESHOLD_RATIO;

    // GK-PROTECTED players: anyone assigned as GK in any half. They must finish
    // at or near the top of the allowed spread (target + spread/2) without
    // exceeding the spread cap. We don't widen the spread to favour them — we
    // bias OUT/IN selection so they sit at the top of the existing range.
    const gkProtectedIds = new Set<string>();
    if (gkOnPitch) gkProtectedIds.add(gkOnPitch.id);
    if (halftimeGkIn) gkProtectedIds.add(halftimeGkIn.id);
    const isGkProtected = (id: string) => gkProtectedIds.has(id);
    // Top of the allowed spread — GK-protected players aim for this.
    const gkCeilingSec = targetSecPerPlayer + (maxSpreadMinutes / 2) * 60;

    // Track projected playing seconds per outfield player. Seed from minutes
    // already accumulated (for mid-game starts), converted to seconds.
    const projected = new Map<string, number>();
    outfieldPlayers.forEach(p => projected.set(p.id, p.minutesPlayed || 0));
    if (gkOnPitch && startHalf === 1) {
      projected.set(gkOnPitch.id, (projected.get(gkOnPitch.id) || 0) + halfDurationSeconds);
    }
    if (halftimeGkIn) {
      projected.set(halftimeGkIn.id, (projected.get(halftimeGkIn.id) || 0) + halfDurationSeconds);
    }

    const halfTimeAbs = halfDurationSeconds;

    const remainingOutfieldAvailability = (id: string, absT: number) => {
      if (includeStartingGkInRotation && id === gkOnPitch?.id) {
        return Math.max(1, endAbs - Math.max(absT, halfTimeAbs));
      }
      if (halftimeGkIn && id === halftimeGkIn.id) {
        return absT < halfTimeAbs ? Math.max(1, halfTimeAbs - absT) : 1;
      }
      return Math.max(1, endAbs - absT);
    };

    const isKeeperRotationPlayer = (id: string) => id === gkOnPitch?.id || id === halftimeGkIn?.id;
    const needsProtectedOutfieldRun = (id: string) => {
      const guaranteedGkSeconds = id === gkOnPitch?.id || id === halftimeGkIn?.id ? halfDurationSeconds : 0;
      return guaranteedGkSeconds < targetSecPerPlayer - (maxSpreadMinutes * 60) / 2;
    };
    // GKs already get a guaranteed 20 min in goal — that's the priority. Do
    // NOT add an additional outfield bonus on top, or their total minutes
    // balloon past the cap and starve bench players (creating large spreads).
    // The "priority" for GKs is realised purely by being shielded from being
    // pulled off too early (see overCap/FIFO filters below) and by the forced
    // outfield window for the 2H GK before halftime.
    const effectiveMinSec = (id: string) => playerMinThresholdSec(id);
    const effectiveTargetSec = (id: string) => playerTargetSec(id);
    const shortfall = (id: string) => effectiveTargetSec(id) - (projected.get(id) || 0);
    const needScore = (id: string, absT: number, queueIndex = 0) => {
      const need = shortfall(id);
      return (need / remainingOutfieldAvailability(id, absT)) * 10000 + need * 0.05 - queueIndex * 0.01;
    };

    // Build candidate sub-window times.
    // Rules: no subs before minute 5 from kickoff, none in last ~2.5 min of
    // each half, none right around halftime. ~7 min cadence keeps things
    // predictable and lands us in the 8–14 total subs sweet spot.
    const earliestAbs = Math.max(startAbs + 60, noSubBeforeSeconds);
    const isInBlackout = (t: number) => {
      // Last N seconds of half 1
      if (t > halfDurationSeconds - noSubAfterSeconds && t <= halfDurationSeconds) return true;
      // Last N seconds of half 2
      if (t > endAbs - noSubAfterSeconds) return true;
      // Right around halftime
      if (Math.abs(t - halfDurationSeconds) < halftimeBlackoutSeconds) return true;
      // Before settling-in window in either half
      if (t < noSubBeforeSeconds) return true;
      if (t > halfDurationSeconds && t < halfDurationSeconds + noSubBeforeSeconds) return true;
      return false;
    };

    // Forced and extra window collectors (consumed by buildSubWindows below).
    const forcedWindowTimes: number[] = [];
    const extraWindowTimes: number[] = [];
    // GOALKEEPER RULE: GKs may ONLY be swapped at halftime (the GK position
    // itself can only change at start-of-game or halftime). However, the
    // nominated 2H GK can play OUTFIELD in 1H — they're just a normal field
    // player until they take the gloves at HT. Same for the 1H GK in 2H.
    // We give the 2H GK a forced outfield run in 1H so they don't end the
    // match well below the fairness floor.
    const forcedInByWindow = new Map<number, string>();
    const forcedOutByWindow = new Map<number, string>();
    let halftimeGkBenchByAbs: number | null = null;
    if (halftimeGkIn && needsProtectedOutfieldRun(halftimeGkIn.id) && startHalf === 1 && halfDurationSeconds > 12 * 60) {
      const tinySquad = outfieldOnBench.length <= 2;
      const h1GkOn = noSubBeforeSeconds;
      const h1GkOffOffset = tinySquad ? noSubAfterSeconds : Math.max(noSubAfterSeconds, Math.min(3 * 60, intervalSec));
      const h1GkOff = Math.max(h1GkOn + 9 * 60, halfDurationSeconds - h1GkOffOffset);
      halftimeGkBenchByAbs = Math.floor(h1GkOff);
      [h1GkOn, h1GkOff].forEach(gkTime => {
        if (gkTime > startAbs) forcedWindowTimes.push(Math.floor(gkTime));
      });
      if (h1GkOn > startAbs) forcedInByWindow.set(Math.floor(h1GkOn), halftimeGkIn.id);
      if (h1GkOff > startAbs) forcedOutByWindow.set(Math.floor(h1GkOff), halftimeGkIn.id);
    }
    // Mirror window in H2 for the 1H GK so they get outfield time toward the
    // top of the allowed spread.
    if (includeStartingGkInRotation && gkOnPitch && needsProtectedOutfieldRun(gkOnPitch.id) && halfDurationSeconds > 12 * 60) {
      const tinySquad = outfieldOnBench.length <= 2;
      const h2GkOnOffset = tinySquad ? Math.min(2 * 60, noSubBeforeSeconds) : noSubBeforeSeconds;
      const h2GkOn = halfDurationSeconds + h2GkOnOffset;
      if (h2GkOn > startAbs) {
        forcedWindowTimes.push(Math.floor(h2GkOn));
        forcedInByWindow.set(Math.floor(h2GkOn), gkOnPitch.id);
      }
    }
    if (startAbs < halfTimeAbs && halfDurationSeconds > 18 * 60 && outfieldOnBench.length >= 3) {
      const h2FairnessRescue = halfDurationSeconds + Math.floor(halfDurationSeconds * 0.5);
      if (h2FairnessRescue < endAbs - noSubAfterSeconds && !isInBlackout(h2FairnessRescue)) {
        extraWindowTimes.push(Math.floor(h2FairnessRescue));
      }
      const h2LateFairnessRescue = halfDurationSeconds + Math.floor(halfDurationSeconds * 0.72);
      if (h2LateFairnessRescue < endAbs - noSubAfterSeconds && !isInBlackout(h2LateFairnessRescue)) {
        extraWindowTimes.push(Math.floor(h2LateFairnessRescue));
      }
    }
    // Tiny squads (≤2 bench): extra mid-2H rescue window so 1H FWDs get pulled.
    if (outfieldOnBench.length <= 2 && halfDurationSeconds > 14 * 60) {
      const h2R = halfDurationSeconds + Math.floor(halfDurationSeconds * 0.5);
      if (h2R < endAbs - noSubAfterSeconds && !isInBlackout(h2R)) {
        extraWindowTimes.push(h2R);
      }
    }

    // Unified window builder — single source of truth for cadence, blackouts,
    // and forced-time merging across Standard / Frequent / Advanced.
    const baseWindowTimes = buildSubWindows({
      startAbs,
      endAbs,
      halfDurationSeconds,
      targetIntervalSec: intervalSec,
      intervalFloorSec: PRACTICAL_MIN_INTERVAL,
      noSubBeforeSec: noSubBeforeSeconds,
      noSubAfterSec: noSubAfterSeconds,
      halftimeGuardSec: halftimeBlackoutSeconds,
      halftimeGuardActive: true,
      forcedTimes: forcedWindowTimes,
      extraTimes: extraWindowTimes,
      forcedBufferSec: PRACTICAL_GK_WINDOW_BUFFER_SECONDS,
    });

    const onPitchOrder: string[] = outfieldOnPitch.map(p => p.id);
    const benchOrder: string[] = outfieldOnBench.map(p => p.id);

    // Track when each player was last subbed ON (absolute seconds) — used to
    // protect recent subs from being immediately pulled off.
    const lastSubbedOnAbs = new Map<string, number>();

    // RULE: every outfield starter must be benched at least once. Track who
    // has yet to be subbed off; bias selection toward never-benched players.
    // GK-PROTECTED EXEMPTION: players assigned as GK in either half are
    // exempt from the bench-once rule. They should be allowed to play their
    // full outfield run before/after their GK shift to reach the top of the
    // allowed spread (equal-highest minutes).
    const neverBenched = new Set<string>(
      outfieldOnPitch.filter(p => !isGkProtected(p.id)).map(p => p.id),
    );

    const willGkSwapAtHt =
      rotateGkAtHalftime && startHalf === 1 && !!gkOnPitch && !!halftimeGkIn;

    // Accrue projected outfield time as we walk through the schedule.
    let lastTickAbs = startAbs;
    const accrueUntil = (absT: number) => {
      const dt = Math.max(0, absT - lastTickAbs);
      if (dt === 0) return;
      onPitchOrder.forEach(id => projected.set(id, (projected.get(id) || 0) + dt));
      lastTickAbs = absT;
    };

    const pendingWindows = [...baseWindowTimes];
    let gkSwapApplied = false;

    while (pendingWindows.length > 0) {
      let t = pendingWindows.shift()!;

      // Rescue check: if any bench player is currently below the floor and
      // would stay below by this window, allow pulling sub up to ~2 min earlier.
      const isForcedGkWindow = forcedInByWindow.has(t) || forcedOutByWindow.has(t);
      const benchUnder = benchOrder.filter(
        id => (projected.get(id) || 0) < effectiveMinSec(id)
      );
      if (!isForcedGkWindow && benchUnder.length > 0) {
        const earliest = Math.max(lastTickAbs + 60, t - PRACTICAL_EARLY_SUB_TOLERANCE_SECONDS);
        if (earliest < t) t = Math.floor(earliest);
      }

      // Apply HT GK swap to queues at first window after halftime.
      if (willGkSwapAtHt && !gkSwapApplied && t > halfTimeAbs) {
        accrueUntil(halfTimeAbs);
        const startingGkId = gkOnPitch!.id;
        const h2GkId = halftimeGkIn!.id;
        const ip = onPitchOrder.indexOf(h2GkId);
        if (ip >= 0) onPitchOrder.splice(ip, 1);
        const ib = benchOrder.indexOf(h2GkId);
        if (ib >= 0) benchOrder.splice(ib, 1);
        if (!benchOrder.includes(startingGkId)) benchOrder.unshift(startingGkId);
        gkSwapApplied = true;
      }

      accrueUntil(t);

      const swaps = Math.min(subsPerWindow, onPitchOrder.length, benchOrder.length);
      if (swaps === 0) continue;
      const windowIns = new Set<string>();
      const windowOuts = new Set<string>();

      const { half, time } = (() => ({
        half: (t < halfDurationSeconds ? 1 : 2) as 1 | 2,
        time: t < halfDurationSeconds ? t : t - halfDurationSeconds,
      }))();

      for (let i = 0; i < swaps; i++) {
        const isActiveGk = (id: string) =>
          (gkOnPitch && id === gkOnPitch.id && t < halfTimeAbs) ||
          (halftimeGkIn && id === halftimeGkIn.id && t >= halfTimeAbs);

        // -------- Pick playerOut --------
        // Priority: (1) the nominated 2H GK must be back on the bench before
        // halftime, (2) the highest-minute player, especially if over cap.
        // Over-cap pull: prefer subbing off players who are above the cap, OR
        // when a bench player is below their effective floor. Keepers should
        // generally NOT be pulled off via over-cap logic — they need their
        // outfield run to land in the top half of total minutes.
        // GK-PROTECTED PROMOTION (OUT): if any GK-protected player on the
        // pitch is below their target ceiling AND a non-GK-protected player
        // on the pitch is at/above the non-GK floor, prefer pulling the
        // non-GK-protected player off so the GK-protected one keeps banking
        // outfield minutes toward the top of the spread.
        const gkProtectedOnPitchBelowCeiling = onPitchOrder.some(
          id => isGkProtected(id) && needsProtectedOutfieldRun(id) && !isActiveGk(id) && (projected.get(id) || 0) < gkCeilingSec - 30
        );

        const overCap = onPitchOrder
          .filter(id => !isActiveGk(id))
          .filter(id => !windowIns.has(id))
          // Protect recently-subbed-on players (<4 min on field).
          .filter(id => {
            const onAt = lastSubbedOnAbs.get(id);
            return onAt === undefined || (t - onAt) >= PRACTICAL_RECENT_SUB_PROTECTION_SECONDS;
          })
          // Keep the nominated 2H GK on until their planned pre-halftime bench window.
          .filter(id => id !== halftimeGkIn?.id || halftimeGkBenchByAbs === null || t >= halftimeGkBenchByAbs)
          // Don't pull a GK-protected player off via over-cap until they've
          // reached the top of the allowed spread (gkCeilingSec). Their
          // outfield run should land them at equal-highest minutes.
          .filter(id => !isGkProtected(id) || !needsProtectedOutfieldRun(id) || (projected.get(id) || 0) >= gkCeilingSec - 30)
          .filter(id => (projected.get(id) || 0) > playerMaxThresholdSec(id) || benchOrder.some(benchId => (projected.get(benchId) || 0) < effectiveMinSec(benchId)))
          .sort((a, b) => {
            // GK-protected promotion: prefer pulling non-GK-protected first
            // when a GK-protected on-pitch is still below ceiling.
            if (gkProtectedOnPitchBelowCeiling) {
              const aGk = isGkProtected(a) ? 1 : 0;
              const bGk = isGkProtected(b) ? 1 : 0;
              if (aGk !== bGk) return aGk - bGk;
            }
            // Bench-everyone rule: prefer pulling never-benched players first.
            const aNB = neverBenched.has(a) ? 1 : 0;
            const bNB = neverBenched.has(b) ? 1 : 0;
            if (aNB !== bNB) return bNB - aNB;
            const priorityCmp = priorityPullOffCompare(a, b);
            if (priorityCmp !== 0) return priorityCmp;
            return (projected.get(b) || 0) - (projected.get(a) || 0);
          });

        let outId: string | null = null;
        const forcedOutId = forcedOutByWindow.get(t);
        const h2GkNeedsBenchForHalftime = halftimeGkIn?.id &&
          (halftimeGkBenchByAbs === null || t >= halftimeGkBenchByAbs) &&
          !windowIns.has(halftimeGkIn.id) &&
          onPitchOrder.includes(halftimeGkIn.id);
        if (forcedOutId && onPitchOrder.includes(forcedOutId) && !windowIns.has(forcedOutId)) {
          outId = forcedOutId;
          const idx = onPitchOrder.indexOf(outId);
          if (idx >= 0) onPitchOrder.splice(idx, 1);
        } else if (h2GkNeedsBenchForHalftime) {
          outId = halftimeGkIn!.id;
          const idx = onPitchOrder.indexOf(outId);
          if (idx >= 0) onPitchOrder.splice(idx, 1);
        } else if (overCap.length > 0) {
          outId = overCap[0];
          const idx = onPitchOrder.indexOf(outId);
          if (idx >= 0) onPitchOrder.splice(idx, 1);
        } else {
          // Build the eligible candidate list, then choose.
          const buildEligible = (allowRecentSub: boolean) => {
            const out: string[] = [];
            for (let j = 0; j < onPitchOrder.length; j++) {
              const candidate = onPitchOrder[j];
              if (isActiveGk(candidate)) continue;
              if (windowIns.has(candidate)) continue;
              if (candidate === halftimeGkIn?.id && halftimeGkBenchByAbs !== null && t < halftimeGkBenchByAbs) continue;
              // Don't sub off a GK-protected player while they're still below
              // their ceiling — they need to finish at the top of the spread.
              if (isGkProtected(candidate) && needsProtectedOutfieldRun(candidate) && (projected.get(candidate) || 0) < gkCeilingSec - 30) continue;
              if (isKeeperRotationPlayer(candidate) && (projected.get(candidate) || 0) < effectiveMinSec(candidate)) continue;
              if (!allowRecentSub) {
                const onAt = lastSubbedOnAbs.get(candidate);
                if (onAt !== undefined && (t - onAt) < PRACTICAL_RECENT_SUB_PROTECTION_SECONDS) continue;
              }
              out.push(candidate);
            }
            return out;
          };

          // BENCH-EVERYONE GUARANTEE: if remaining sub windows are scarce
          // relative to never-benched starters still on the pitch, force one
          // of them off NOW — even if it costs a recently-subbed player a
          // shorter shift. Threshold: windows-left ≤ never-benched-on-pitch.
          const neverBenchedOnPitch = onPitchOrder.filter(id => neverBenched.has(id) && !isActiveGk(id) && !windowIns.has(id));
          const windowsLeft = pendingWindows.length + 1;
          const mustForceNeverBenched = neverBenchedOnPitch.length > 0 && windowsLeft <= neverBenchedOnPitch.length + 1;

          let eligible = buildEligible(false);
          // If we must force a never-benched player but none are eligible
          // under the recent-sub-protection rule, drop that protection.
          if (mustForceNeverBenched && !eligible.some(id => neverBenched.has(id))) {
            eligible = buildEligible(true);
          }

          if (eligible.length > 0) {
            // GK-protected first; never-benched next; then existing tiebreaks.
            eligible.sort((a, b) => {
              if (gkProtectedOnPitchBelowCeiling) {
                const aGk = isGkProtected(a) ? 1 : 0;
                const bGk = isGkProtected(b) ? 1 : 0;
                if (aGk !== bGk) return aGk - bGk;
              }
              const aNB = neverBenched.has(a) ? 1 : 0;
              const bNB = neverBenched.has(b) ? 1 : 0;
              if (aNB !== bNB) return bNB - aNB;
              const priorityCmp = priorityPullOffCompare(a, b);
              if (priorityCmp !== 0) return priorityCmp;
              if (aNB === 1 && bNB === 1) {
                return onPitchOrder.indexOf(b) - onPitchOrder.indexOf(a);
              }
              if (outfieldOnBench.length <= 2) {
                return (projected.get(b) || 0) - (projected.get(a) || 0);
              }
              return onPitchOrder.indexOf(a) - onPitchOrder.indexOf(b);
            });
            outId = eligible[0];
            const idx = onPitchOrder.indexOf(outId);
            if (idx >= 0) onPitchOrder.splice(idx, 1);
          }
        }
        if (!outId) break;

        // -------- Pick playerIn --------
        // Priority: lowest adjusted minutes first. This preserves simple
        // windows but makes Standard genuinely fair instead of queue-only.
        const under = benchOrder
          .map((id, index) => ({ id, proj: projected.get(id) || 0, score: needScore(id, t, index) }))
          .filter(b => !windowOuts.has(b.id))
          .filter(b => b.proj < effectiveMinSec(b.id))
          .sort((a, b) => (b.score - a.score) || priorityBringOnCompare(a.id, b.id));

        let inId: string | undefined;
        const forcedInId = forcedInByWindow.get(t);
        if (forcedInId && benchOrder.includes(forcedInId) && !windowOuts.has(forcedInId)) {
          inId = forcedInId;
          const idx = benchOrder.indexOf(inId);
          if (idx >= 0) benchOrder.splice(idx, 1);
        } else if (under.length > 0) {
          inId = under[0].id;
          const idx = benchOrder.indexOf(inId);
          if (idx >= 0) benchOrder.splice(idx, 1);
        } else {
          // Mostly FIFO. Only jump the queue for a genuinely low-minute player
          // (or a forced GK window); otherwise bench order stays predictable.
          const fifoCandidates = benchOrder
            .map((id, index) => ({ id, index, score: needScore(id, t, index), projected: projected.get(id) || 0 }))
            .filter(item => !windowOuts.has(item.id))
            .filter(item => item.projected <= playerMaxThresholdSec(item.id));
          const fifoFirst = fifoCandidates[0];
          const urgent = fifoCandidates
            .filter(item => item.projected < targetSecPerPlayer)
            .sort((a, b) => (b.score - a.score) || priorityBringOnCompare(a.id, b.id))[0];
          const fifoIdx = (urgent && (!fifoFirst || urgent.score > fifoFirst.score + 500))
            ? urgent.index
            : fifoFirst?.index ?? -1;
          if (fifoIdx >= 0) {
            inId = benchOrder.splice(fifoIdx, 1)[0];
          } else {
            const fallbackIdx = benchOrder.findIndex(id => !windowOuts.has(id));
            inId = fallbackIdx >= 0 ? benchOrder.splice(fallbackIdx, 1)[0] : undefined;
          }
        }

        if (!inId) {
          onPitchOrder.unshift(outId);
          break;
        }

        const playerOut = playerData.find(p => p.id === outId)!;
        const playerIn = playerData.find(p => p.id === inId)!;
        const pos = (playerOut.currentPitchPosition || "MID") as PitchPosition;

        plan.push({
          time,
          half,
          playerOut,
          playerIn: { ...playerIn, currentPitchPosition: pos },
          executed: false,
        });

        onPitchOrder.push(inId);
        windowIns.add(inId);
        windowOuts.add(outId);
        benchOrder.push(outId);
        lastSubbedOnAbs.set(inId, t);
        neverBenched.delete(outId);
      }

      // BENCH-EVERYONE GUARANTEE: if there are still never-benched starters
      // on the pitch and we don't have enough remaining windows to bench them
      // all, inject extra synthetic windows ~2 min apart before end of game.
      const tNext = pendingWindows[0] ?? endAbs;
      const isActiveGkAt = (id: string, absT: number) =>
        (gkOnPitch && id === gkOnPitch.id && absT < halfTimeAbs) ||
        (halftimeGkIn && id === halftimeGkIn.id && absT >= halfTimeAbs);
      const stillNB = onPitchOrder.filter(id => neverBenched.has(id) && !isActiveGkAt(id, tNext));
      if (stillNB.length > pendingWindows.length) {
        const deficit = stillNB.length - pendingWindows.length;
        const lastScheduled = pendingWindows.length > 0 ? pendingWindows[pendingWindows.length - 1] : t;
        for (let k = 1; k <= deficit; k++) {
          const extra = Math.min(
            lastScheduled + k * Math.max(90, Math.min(2 * 60, intervalSec)),
            endAbs - noSubAfterSeconds,
          );
          if (extra > t && !pendingWindows.includes(extra)) {
            pendingWindows.push(extra);
          }
        }
        pendingWindows.sort((a, b) => a - b);
      }
    }

    // Final accrual to end of game.
    accrueUntil(endAbs);

    if (willGkSwapAtHt && startHalf === 1) {
      plan.push({
        time: 0,
        half: 2,
        playerOut: gkOnPitch!,
        playerIn: halftimeGkIn!,
        executed: false,
      });
    }

    // ===========================================================================
    // STANDARD-MODE REMOVAL PASS — drop late "churn" subs that demote the
    // already-lowest player. The fill loop above can schedule a sub like
    // `Louie -> Hugo` right before full time even when Louie is already the
    // most-underplayed player on the field; benching them at the death just
    // makes the spread worse. We delete a sub iff the resulting plan is still
    // playable AND the lowest projected total strictly improves while spread
    // does not get worse.
    // ===========================================================================
    const subAbs = (s: SubstitutionEvent) =>
      s.half === 1 ? s.time : halfDurationSeconds + s.time;
    const isHtGkSwap = (s: SubstitutionEvent) =>
      !!gkOnPitch && s.half === 2 && s.time === 0 && s.playerOut.id === gkOnPitch.id;
    const standardGkDuty = (id: string) => {
      let duty = 0;
      if (startingGkWillRotate && gkOnPitch && id === gkOnPitch.id) {
        duty += Math.max(0, halfDurationSeconds - startElapsedSeconds);
      }
      if (halftimeGkIn && id === halftimeGkIn.id) duty += halfDurationSeconds;
      return duty;
    };
    const standardSimulate = (candidatePlan: SubstitutionEvent[]) => {
      const onP = new Set<string>(outfieldOnPitch.map(p => p.id));
      const totals = new Map<string, number>();
      outfieldPlayers.forEach(p => totals.set(p.id, p.minutesPlayed || 0));
      const sorted = [...candidatePlan].sort((a, b) => subAbs(a) - subAbs(b));
      let last = startAbs;
      let valid = true;
      for (const ev of sorted) {
        const t = subAbs(ev);
        if (t < last) valid = false;
        const elapsed = Math.max(0, t - last);
        onP.forEach(id => totals.set(id, (totals.get(id) || 0) + elapsed));
        last = t;
        if (isHtGkSwap(ev)) { onP.delete(ev.playerIn.id); continue; }
        if (!onP.has(ev.playerOut.id) || onP.has(ev.playerIn.id)) valid = false;
        onP.delete(ev.playerOut.id);
        onP.add(ev.playerIn.id);
      }
      const tail = Math.max(0, endAbs - last);
      onP.forEach(id => totals.set(id, (totals.get(id) || 0) + tail));
      const projected = new Map<string, number>();
      for (const p of outfieldPlayers) {
        projected.set(p.id, (totals.get(p.id) || 0) + standardGkDuty(p.id));
      }
      return { projected, valid };
    };
    const STANDARD_REMOVAL_TOLERANCE = 5;
    for (let pass = 0; pass < 6; pass++) {
      const sim = standardSimulate(plan);
      if (!sim.valid) break;
      const values = [...sim.projected.values()];
      if (values.length < 2) break;
      const baseMin = Math.min(...values);
      const baseSpread = Math.max(...values) - baseMin;

      let bestRemoval: { index: number; min: number; spread: number } | null = null;
      for (let i = 0; i < plan.length; i++) {
        if (isHtGkSwap(plan[i])) continue;
        const trialPlan = plan.filter((_, j) => j !== i);
        const trial = standardSimulate(trialPlan);
        if (!trial.valid) continue;
        const tv = [...trial.projected.values()];
        const trialMin = Math.min(...tv);
        const trialSpread = Math.max(...tv) - trialMin;
        if (trialMin > baseMin + STANDARD_REMOVAL_TOLERANCE && trialSpread <= baseSpread) {
          if (
            !bestRemoval ||
            trialMin > bestRemoval.min ||
            (trialMin === bestRemoval.min && trialSpread < bestRemoval.spread)
          ) {
            bestRemoval = { index: i, min: trialMin, spread: trialSpread };
          }
        }
      }
      if (!bestRemoval) break;
      plan.splice(bestRemoval.index, 1);
    }

    const sortedStandard = plan.sort((a, b) =>
      (a.half === 1 ? a.time : halfDurationSeconds + a.time) -
      (b.half === 1 ? b.time : halfDurationSeconds + b.time)
    );
    {
      const eqPlan = applyEqualTimeOverride({
        playerData, teamSize, halfDurationSeconds,
        gkOnPitch, halftimeGkIn, rotateGkAtHalftime, maxSpreadMinutes,
        rotationSpeed, eff,
        priorityOrderLength: priorityOrder.length,
        startHalf, startElapsedSeconds: clampedStartElapsed,
        benchCount: outfieldOnBench.length,
        currentPlan: sortedStandard,
      });
      if (eqPlan) {
        sortedStandard.length = 0;
        sortedStandard.push(...eqPlan);
      }
    }

    return ensureNoStarvedPlayers(sortedStandard, playerData, halfDurationSeconds);
  }
  // ===========================================================================
  // BALANCED / FREQUENT MODES — fairness-driven planner below.
  // ===========================================================================


  // CORE PRINCIPLE: Equal playing time for ALL outfield players over remaining game
  // Use remaining time for calculations
  const totalFieldSeconds = totalRemainingSeconds * fieldPositions;
  const idealSecondsPerPlayer = Math.floor(totalFieldSeconds / totalOutfieldPlayers);

  // Track accumulated playing time
  // Initialize playing time with already-accumulated minutes for mid-game starts
  const playingTime = new Map<string, number>();
  outfieldPlayers.forEach(p => playingTime.set(p.id, p.minutesPlayed || 0));

  // Track who's currently on pitch and their positions
  const currentOnPitch = new Map<string, PitchPosition>();
  outfieldOnPitch.forEach(p => {
    currentOnPitch.set(p.id, p.currentPitchPosition as PitchPosition);
  });

  const getPlayer = (id: string) => outfieldPlayers.find(p => p.id === id);

  // Calculate minimum number of subs needed to achieve equal time
  const minSubsNeeded = Math.max(outfieldOnBench.length, Math.ceil(totalOutfieldPlayers / 2));

  // Determine how many players to sub at once based on rotation speed and bench size
  // Key principle: batch as many subs together as possible to reduce interruptions
  // With a large bench, we want to swap multiple players simultaneously
  let subsAtOnce = 1;
  if (!disableBatchSubs && outfieldOnBench.length >= 2) {
    const hasLargeBench = outfieldOnBench.length >= 4;
    switch (rotationSpeed) {
      case 1: subsAtOnce = 1; break;
      case 2: subsAtOnce = Math.min(2, outfieldOnBench.length); break;
      case 3: subsAtOnce = Math.min(hasLargeBench ? 3 : 2, outfieldOnBench.length); break;
      default: subsAtOnce = 1;
    }
  }

  // Calculate the ideal number of sub windows to achieve equal playing time
  // Goal: minimize interruptions while maintaining fairness
  // Each window swaps up to subsAtOnce players, so we need fewer windows with bigger batches
  const totalSubsNeeded = Math.max(minSubsNeeded, outfieldOnBench.length);
  const idealWindows = Math.ceil(totalSubsNeeded / subsAtOnce);

  // Apply rotation speed modifier
  // All modes ensure every bench player gets rotated in — the difference is batch size,
  // which affects how many sub windows are needed (more windows = more interruptions)
  let subWindowsPerHalf: number;
  switch (rotationSpeed) {
    case 1: // Minimal - 1 sub at a time, so needs more windows but less disruption per window
      subWindowsPerHalf = Math.max(2, totalSubsNeeded);
      break;
    case 3: // Equal Time - bigger batches, slightly more windows for finer control
      subWindowsPerHalf = Math.max(2, idealWindows);
      break;
    case 2: // Balanced
    default:
      subWindowsPerHalf = Math.max(1, idealWindows);
      break;
  }

  // Minimum 45 seconds between sub windows for practicality
  const minSubInterval = 45;
  const maxWindowsPerHalf = Math.floor(halfDurationSeconds / minSubInterval);
  const actualWindowsPerHalf = Math.min(subWindowsPerHalf, maxWindowsPerHalf);

  // Generate sub window times evenly distributed
  const generateSubTimes = (halfDuration: number, numWindows: number): number[] => {
    const times: number[] = [];
    if (numWindows <= 0) return times;
    const interval = halfDuration / (numWindows + 1);
    for (let i = 1; i <= numWindows; i++) {
      times.push(Math.floor(i * interval));
    }
    return times;
  };

  // Helper to find best substitution candidate
  const findBestSubCandidate = (
    onPitchSorted: { id: string; time: number; player: Player }[],
    benchSorted: { id: string; time: number; player: Player }[],
    excludePlayerOutIds: Set<string>,
    excludePlayerInIds: Set<string>
  ) => {
    interface SubCandidate {
      playerOut: Player;
      playerIn: Player;
      positionSwap?: SubstitutionEvent["positionSwap"];
      score: number;
      positionValid: boolean;
    }

    const candidates: SubCandidate[] = [];

    const filteredOnPitch = onPitchSorted.filter(p => !excludePlayerOutIds.has(p.id));
    const filteredBench = benchSorted.filter(p => !excludePlayerInIds.has(p.id));

    for (const benchEntry of filteredBench) {
      for (const pitchEntry of filteredOnPitch) {
        const pitchPos = currentOnPitch.get(pitchEntry.id);
        const timeDiffCorrected = pitchEntry.time - benchEntry.time;

        // Use a 30-second minimum threshold instead of hard zero to allow
        // beneficial rotations when times are close but not exactly equal
        if (timeDiffCorrected < 30) continue;

        const directMatch = !benchEntry.player.assignedPositions?.length ||
            benchEntry.player.assignedPositions.includes(pitchPos!);

        if (directMatch) {
          candidates.push({
            playerOut: pitchEntry.player,
            playerIn: benchEntry.player,
            score: timeDiffCorrected,
            positionValid: true
          });
        }

        if (!disablePositionSwaps) {
          const pitchPlayers = Array.from(currentOnPitch.entries());
          for (const [swapId, swapPos] of pitchPlayers) {
            if (swapId === pitchEntry.id || excludePlayerOutIds.has(swapId)) continue;
            const swapPlayer = getPlayer(swapId);
            if (!swapPlayer) continue;

            const swapPlayerCanPlayOutPos = !swapPlayer.assignedPositions?.length ||
                swapPlayer.assignedPositions.includes(pitchPos!);
            const incomingCanPlaySwapPos = !benchEntry.player.assignedPositions?.length ||
                benchEntry.player.assignedPositions.includes(swapPos);

            if (swapPlayerCanPlayOutPos && incomingCanPlaySwapPos) {
              candidates.push({
                playerOut: pitchEntry.player,
                playerIn: benchEntry.player,
                positionSwap: {
                  player: swapPlayer,
                  fromPosition: swapPos,
                  toPosition: pitchPos!,
                },
                score: timeDiffCorrected,
                positionValid: true
              });
            }
          }
        }

        if (!candidates.some(c => c.playerOut.id === pitchEntry.player.id && c.playerIn.id === benchEntry.player.id && c.positionValid)) {
          candidates.push({
            playerOut: pitchEntry.player,
            playerIn: benchEntry.player,
            score: timeDiffCorrected * 0.5,
            positionValid: false
          });
        }
      }
    }

    candidates.sort((a, b) => {
      if (a.positionValid !== b.positionValid) return b.positionValid ? 1 : -1;
      return b.score - a.score;
    });

    return candidates[0] || null;
  };

  // Threshold: subs within this many seconds of half-end get snapped
  const END_OF_HALF_SNAP_THRESHOLD = 60;

  // FAIRNESS TARGET: balance TOTAL minutes, not just outfield minutes. A player
  // doing a half in goal already has that GK time banked, so their outfield
  // target is the shared total target minus their GK duty. This gives GKs real
  // field time without forcing them 5-10 minutes above everyone else.
  const averageTotalSecondsPerPlayer = playerData.length > 0
    ? (totalRemainingSeconds * teamSize) / playerData.length
    : 0;
  const isGkPlayer = (id: string) =>
    (includeStartingGkInRotation && id === gkOnPitch?.id) ||
    (halftimeGkIn ? id === halftimeGkIn.id : false);
  const gkDutySeconds = (id: string) => {
    let duty = 0;
    if (startingGkWillRotate && id === gkOnPitch?.id) {
      duty += Math.max(0, halfDurationSeconds - startElapsedSeconds);
    }
    if (halftimeGkIn && id === halftimeGkIn.id) {
      duty += halfDurationSeconds;
    }
    return duty;
  };
  // FAIRNESS RULE: every player's TOTAL minutes target (field + GK duty) is
  // equal. GKs do NOT get extra total minutes — that would mean less time for
  // outfielders. Instead, GKs get a tiebreaker priority bonus in the scheduler
  // (see scoring below) so when needs are equal, the GK is rotated on first,
  // landing them at "equal top" of the playing time list rather than below.
  const fieldTargetSeconds = (id: string) =>
    Math.max(0, averageTotalSecondsPerPlayer - gkDutySeconds(id));
  // Adjusted time for sorting: players above their personal target are picked
  // off first; players furthest below target are picked on first.
  const adjustedTime = (id: string) =>
    (playingTime.get(id) || 0) - fieldTargetSeconds(id);

  const canUseInOutfield = (player: Player, position?: PitchPosition) => {
    if (!position || position === "GK" || player.isInjured) return false;
    // A nominated half-game GK still needs fair total minutes, so allow them
    // to cover an outfield slot outside their goalkeeping half.
    if (player.id === gkOnPitch?.id || player.id === halftimeGkIn?.id) return true;
    if (player.assignedPositions?.length === 1 && player.assignedPositions.includes("GK")) return true;
    return !player.assignedPositions?.length || player.assignedPositions.includes(position);
  };

  const playerById = new Map(playerData.map(p => [p.id, p]));
  const fieldSlots = outfieldOnPitch.map(p => ({
    position: p.currentPitchPosition as PitchPosition,
    playerId: p.id,
  }));

  const currentFieldSeconds = new Map<string, number>();
  outfieldPlayers.forEach(p => currentFieldSeconds.set(p.id, p.minutesPlayed || 0));

  const totalExistingSeconds = playerData.reduce((sum, p) => sum + (p.minutesPlayed || 0), 0);
  const sharedTotalTarget = playerData.length > 0
    ? (totalExistingSeconds + totalRemainingSeconds * teamSize) / playerData.length
    : 0;
    const rawFieldTargets = new Map<string, number>();
  outfieldPlayers.forEach(p => {
    // FAIRNESS: every player aims for the SAME total minutes (field + GK duty).
    // GKs already have GK time banked, so their outfield target is the shared
    // total minus their GK duty. They naturally play LESS outfield, not more —
    // landing them at equal total minutes alongside everyone else.
      const base = Math.max(0, sharedTotalTarget + priorityTargetBiasSeconds(p.id) - (p.minutesPlayed || 0) - gkDutySeconds(p.id));
    rawFieldTargets.set(p.id, base);
  });
  const rawTargetTotal = Array.from(rawFieldTargets.values()).reduce((sum, value) => sum + value, 0);
  const fieldTargetScale = rawTargetTotal > 0 ? totalFieldSeconds / rawTargetTotal : 1;
  const targetFieldSeconds = (id: string) => (rawFieldTargets.get(id) || 0) * fieldTargetScale;

  const toPlanTime = (absoluteSeconds: number): { half: 1 | 2; time: number } => ({
    half: absoluteSeconds < halfDurationSeconds ? 1 : 2,
    time: absoluteSeconds < halfDurationSeconds ? absoluteSeconds : absoluteSeconds - halfDurationSeconds,
  });

  const startAbsoluteSeconds = startHalf === 1 ? clampedStartElapsed : halfDurationSeconds + clampedStartElapsed;
  const endAbsoluteSeconds = halfDurationSeconds * 2;
  // Cap subs per window, but do NOT under-schedule windows in minimal mode.
  // Minimal means fewer players swapped at once; it must still create enough
  // rotation points for every rotatable player to share bench time fairly.
  const benchSize = Math.max(1, outfieldOnBench.length);
  const maxSubEventsPerWindow = Math.max(
    1,
    Math.min(disableBatchSubs ? 1 : subsAtOnce, benchSize, fieldSlots.length)
  );
  // Rotation continuity: with multiple bench players, someone who has just been
  // brought on should not be the player removed at the very next rotation.
  // They re-enter the normal off-order after one further window has passed.
  let previousRotationPlayerInIds = new Set<string>();

  // QUEUE TRACKING (queue-first rotation with fairness override)
  // ------------------------------------------------------------
  // Players go on/off in FIFO order: oldest-waiting bench player goes on,
  // longest-on-pitch player goes off. Fairness only overrides queue order
  // when the projected end-of-game gap exceeds FAIRNESS_TOLERANCE_SECONDS.
  // A MIN_SHIFT_SECONDS guarantees no player is pulled too soon after coming on.
  const FAIRNESS_TOLERANCE_SECONDS = 60;
  const MIN_SHIFT_SECONDS = eff.minShiftSeconds;
  // Position weight for ordering starters into the off-queue:
  // GK never rotates off via queue; defenders go first, then mids, then forwards.
  const positionRotationOrder = (pos: PitchPosition | undefined): number => {
    switch (pos) {
      case "GK": return 99;
      case "DEF": return 0;
      case "MID": return 1;
      case "FWD": return 2;
      default: return 3;
    }
  };
  // lastOnAt = absolute seconds when the player most recently entered the pitch.
  // Starters are seeded with offsets based on position so DEF rotate first.
  // Lower lastOnAt = been on longer = next off.
  const lastOnAt = new Map<string, number>();
  outfieldOnPitch.forEach(p => {
    const offset = positionRotationOrder(p.currentPitchPosition as PitchPosition);
    // Sub-second offsets keep starters ordered by position without affecting
    // shift-length math (which works in whole seconds).
    lastOnAt.set(p.id, startAbsoluteSeconds - 1000 + offset);
  });
  // lastOffAt = absolute seconds when the player most recently came off the pitch.
  // Bench players at start are all "waiting" since startAbsoluteSeconds.
  // Lower lastOffAt = been waiting longer = next on.
  const lastOffAt = new Map<string, number>();
  outfieldOnBench.forEach((p, idx) => {
    // Slight stagger by bench order so the first bench player goes on first.
    lastOffAt.set(p.id, startAbsoluteSeconds - 1000 + idx);
  });

  // FAIRNESS-DRIVEN WINDOW COUNT
  // ----------------------------
  // For perfectly equal minutes, each player spends T·B/N seconds on the bench
  // (T = remaining time, B = bench size, N = total rotatable players). One full
  // "cycle" rotates every player off exactly once and requires N sub-events.
  // With `subsAtOnce` swaps per window, a full cycle = N / subsAtOnce windows.
  //
  // Speed controls how many cycles we run (more cycles = shorter shifts, more
  // disruption, but identical fairness ceiling). All speeds aim for at least
  // ONE full cycle so every bench player gets equal time off.
  const baseCycleEvents = totalOutfieldPlayers; // one off-event per player
  // Cycles per speed: minimal=1 (longest shifts), balanced=1, fast=2 (shorter shifts)
  // Both minimal and balanced run a single full fairness cycle — they differ in
  // batch size (subsAtOnce), not in window count. Fast doubles rotations.
  let cycleMultiplier = rotationSpeed === 3 ? 2 : 1;
  // SPREAD CAP ESCALATION: when the user has set a tight max-spread, a single
  // cycle may not give bench players enough on-pitch time to converge. The
  // dominant residual spread comes from players "locked out" of part of the
  // game (e.g. half-game GKs) who need a precise number of outfield turns to
  // hit their share. Estimate that residual and add cycles until it fits.
  const maxGkLockoutSeconds = Math.max(
    0,
    ...outfieldPlayers.map(p => gkDutySeconds(p.id))
  );
  // Residual spread ≈ outfield need a locked-out player misses if we run too
  // few cycles. A locked-out player needs ~`shareOutfield` minutes; a single
  // cycle gives them at most one turn (~window length).
  const targetSpreadSeconds = Math.max(60, maxSpreadMinutes * 60);
  const estimatedResidualSpread = maxGkLockoutSeconds > 0
    ? Math.min(maxGkLockoutSeconds, halfDurationSeconds * 0.4)
    : 0;
  if (estimatedResidualSpread > targetSpreadSeconds) {
    // LIGHT FREQUENT: cap escalation tighter so we don't pile on extra cycles.
    // Frequent (speed=2) tops out at +1 cycle; Fast (speed=3) keeps the higher
    // ceiling for tight-spread scenarios.
    const escalationCeiling = rotationSpeed === 3 ? 6 : 2;
    const escalationBoost = rotationSpeed === 3 ? 2 : 0;
    cycleMultiplier = Math.min(
      escalationCeiling,
      Math.max(cycleMultiplier, Math.ceil(estimatedResidualSpread / targetSpreadSeconds) + escalationBoost)
    );
  }
  // Pick the smallest window count whose total off-events (W * subsAtOnce) is
  // a multiple of N players — this is the ONLY way to get exactly equal time.
  const desiredOffEvents = baseCycleEvents * cycleMultiplier;
  let targetWindowsTotal = Math.max(1, Math.ceil(desiredOffEvents / maxSubEventsPerWindow));
  // Snap upward until W * subsAtOnce is divisible by N (fairness divisibility).
  while ((targetWindowsTotal * maxSubEventsPerWindow) % totalOutfieldPlayers !== 0) {
    targetWindowsTotal++;
    // Safety: never exceed 2x the desired count
    if (targetWindowsTotal > Math.ceil(desiredOffEvents / maxSubEventsPerWindow) * 2 + totalOutfieldPlayers) break;
  }
  // Floor interval prevents churn but never overrides fairness windows. We
  // recompute as evenly-spaced windows across remaining time.
  // LIGHT FREQUENT: raise the floor for speed=2 from 120s to 180s so shifts
  // are noticeably longer than current Frequent (~3 min vs ~2 min) while
  // still rotating much more often than Standard (~5 min).
  const intervalFromWindows = totalRemainingSeconds / (targetWindowsTotal + 1);
  const minIntervalFloor = rotationSpeed === 3
    ? 90
    : Math.min(eff.frequentIntervalFloor, Math.max(60, Math.floor(intervalFromWindows)));
  const halftimeGuardWindow = eff.halftimeGuardSeconds ?? minIntervalFloor;
  const maxIntervalSeconds = Math.max(minIntervalFloor, Math.floor(intervalFromWindows));
  const directEventTimes = new Set<number>();

  // SHIFT-FLOOR GUARD: if a halftime GK swap is going to happen, don't place
  // any interval-driven sub window within `minIntervalFloor` seconds of HT —
  // otherwise a player can come on at window N and be forced off at HT, producing
  // a sub-1-min "shift" that's impossible for the optimizer to remove because
  // the HT event is fixed.
  const halftimeGuardActive = !!(
    startAbsoluteSeconds < halfDurationSeconds && rotateGkAtHalftime && gkOnPitch && halftimeGkIn
  );

  // Unified window builder — same helper Standard uses, just with Frequent's
  // numbers. Frequent has no settling-in window and a 45 s edge buffer.
  const sortedDirectEventTimes = buildSubWindows({
    startAbs: startAbsoluteSeconds,
    endAbs: endAbsoluteSeconds,
    halfDurationSeconds,
    targetIntervalSec: maxIntervalSeconds,
    intervalFloorSec: maxIntervalSeconds,
    noSubBeforeSec: 0,
    noSubAfterSec: 45,
    halftimeGuardSec: halftimeGuardWindow,
    halftimeGuardActive,
    edgeBufferSec: 45,
    includeHalftimeWhenGuardActive: true,
  });


  const isAvailableForInterval = (player: Player, intervalStart: number, intervalEnd: number) => {
    if (player.isInjured) return false;
    if (includeStartingGkInRotation && player.id === gkOnPitch?.id && intervalStart < halfDurationSeconds) return false;
    if (halftimeGkIn && player.id === halftimeGkIn.id && intervalEnd > halfDurationSeconds) return false;
    return true;
  };

  const remainingAvailabilitySeconds = (player: Player, intervalStart: number) => {
    const start = Math.max(intervalStart, startAbsoluteSeconds);
    if (includeStartingGkInRotation && player.id === gkOnPitch?.id) {
      return Math.max(1, endAbsoluteSeconds - Math.max(start, halfDurationSeconds));
    }
    if (halftimeGkIn && player.id === halftimeGkIn.id) {
      return Math.max(1, halfDurationSeconds - Math.min(start, halfDurationSeconds));
    }
    return Math.max(1, endAbsoluteSeconds - start);
  };

  const addFieldTime = (elapsed: number) => {
    if (elapsed <= 0) return;
    fieldSlots.forEach(slot => {
      if (slot.playerId) {
        currentFieldSeconds.set(slot.playerId, (currentFieldSeconds.get(slot.playerId) || 0) + elapsed);
      }
    });
  };

  const choosePlayerForSlot = (
    position: PitchPosition,
    currentSlotPlayerId: string | null,
    usedIds: Set<string>,
    currentIds: Set<string>,
    intervalStart: number,
    intervalEnd: number
  ) => {
    const intervalLength = Math.max(0, intervalEnd - intervalStart);
    const candidates = outfieldPlayers.filter(player => {
      if (usedIds.has(player.id)) return false;
      if (!isAvailableForInterval(player, intervalStart, intervalEnd)) return false;
      if (!canUseInOutfield(player, position)) return false;
      // Avoid moving players between slots in the generated plan; only keep a
      // player in their current slot or bring someone on from the bench.
      if (currentIds.has(player.id) && player.id !== currentSlotPlayerId) return false;
      return true;
    });

    candidates.sort((a, b) => {
      const aNeed = targetFieldSeconds(a.id) - (currentFieldSeconds.get(a.id) || 0);
      const bNeed = targetFieldSeconds(b.id) - (currentFieldSeconds.get(b.id) || 0);
      const aUrgency = aNeed / remainingAvailabilitySeconds(a, intervalStart);
      const bUrgency = bNeed / remainingAvailabilitySeconds(b, intervalStart);
      // Pure fairness ordering — no GK bonus. With correct targets, GKs
      // already need less outfield time and will naturally end at equal totals.
      const aScore = aUrgency * 1000 + aNeed * 0.01 - intervalLength + (a.id === currentSlotPlayerId ? 20 : 0);
      const bScore = bUrgency * 1000 + bNeed * 0.01 - intervalLength + (b.id === currentSlotPlayerId ? 20 : 0);
      return bScore - aScore;
    });

    return candidates[0] || null;
  };

  const applyFairRotationAt = (absoluteSeconds: number, nextAbsoluteSeconds: number, reservedSubEvents = 0) => {
    const maxChanges = Math.max(0, maxSubEventsPerWindow - reservedSubEvents);
    if (maxChanges === 0) {
      previousRotationPlayerInIds = new Set<string>();
      return;
    }

    const currentIds = new Set(fieldSlots.map(slot => slot.playerId).filter(Boolean) as string[]);

    // FAIRNESS-DRIVEN SELECTION (with queue tiebreakers + bounce-back guard)
    // -----------------------------------------------------------------------
    // 1. Bench order: by current playing time ASC (least-played first).
    //    Tiebreaker: lastOffAt ASC (longest waiting first).
    // 2. Pitch order: by current playing time DESC (most-played first).
    //    Tiebreaker: lastOnAt ASC (longest on first).
    // 3. MIN_SHIFT_SECONDS prevents pulling someone who just came on.
    // 4. Strict anti-bounce-back: never pull a player who entered in the
    //    immediately previous window.
    // 5. Only commit a swap if it actually reduces the gap between the two
    //    players' projected end-of-game minutes (avoids churn).
    const projectedFinalSeconds = (id: string) => {
      // If they stay in their current state for the rest of the game.
      const onPitchNow = currentIds.has(id);
      const remaining = endAbsoluteSeconds - absoluteSeconds;
      const accumulated = currentFieldSeconds.get(id) || 0;
      return accumulated + (onPitchNow ? remaining : 0);
    };

    // Each player's TOTAL minutes target = field + GK duty already received.
    // Sorting by deficit-against-target (rather than raw field minutes) means
    // GKs — who have minutes banked from goalkeeping — naturally rank lower in
    // the bench queue, ensuring everyone finishes at equal TOTAL minutes.
    const totalTarget = (id: string) => {
      const p = playerById.get(id);
      const baseMinutes = p?.minutesPlayed || 0;
      return Math.max(0, sharedTotalTarget - baseMinutes - gkDutySeconds(id));
    };
    const deficit = (id: string) => totalTarget(id) - (currentFieldSeconds.get(id) || 0);
    // Urgency = deficit / time remaining where the player is still available.
    // This makes a player with limited availability (e.g. 2H-GK only available
    // in H1 for outfield duty) escalate their priority as their window closes.
    const urgency = (p: Player) => {
      const remain = remainingAvailabilitySeconds(p, absoluteSeconds);
      return deficit(p.id) / Math.max(1, remain);
    };

    // QUEUE-FIRST with hard max-spread cap.
    // -----------------------------------------------------------------------
    // The cap is enforced on PROJECTED final minutes (= field minutes already
    // banked + minutes still to be played if we leave the player in their
    // current state). When the projected spread between the most-played and
    // least-played available players would exceed the user cap, we override
    // queue order and force the worst offenders to swap. Otherwise we keep
    // pure FIFO queue ordering for predictability.
    const maxSpreadSeconds = Math.max(60, maxSpreadMinutes * 60);
    // Escalation kicks in earlier than the hard cap so we have time to correct
    // before we'd actually breach it.
    // Use 40% of the cap so corrections start well before the breach.
    const escalationThreshold = Math.max(30, maxSpreadSeconds * 0.4);

    // Each player has a TARGET total (field + GK duty already received) equal
    // to the average across the squad. The "shortfall" we want to close is
    // (target − projected total). When the spread between shortfalls breaches
    // the cap, override queue order to prioritise the most-shortfall players.
    const totalProjected = (id: string) => {
      const p = playerById.get(id);
      const baseMinutes = (p?.minutesPlayed || 0);
      return baseMinutes + gkDutySeconds(id) + projectedFinalSeconds(id);
    };
    // GK PROTECTION (Frequent mode): players assigned as GK in either half
    // should finish at the TOP of the allowed spread band — not the floor.
    // We lift their total target by the spread cap so the fairness scheduler
    // treats them as still "owed" minutes until they reach gkCeilingSec.
    const spreadHalfSec = Math.max(0, maxSpreadMinutes * 60) / 2;
    const gkCeilingTotal = sharedTotalTarget + spreadHalfSec;
    const playerTotalTarget = (id: string) => {
      const p = playerById.get(id);
      const baseMinutes = (p?.minutesPlayed || 0);
      const isProtected =
        (includeStartingGkInRotation && id === gkOnPitch?.id) ||
        (halftimeGkIn ? id === halftimeGkIn.id : false);
      const target = (isProtected ? gkCeilingTotal : sharedTotalTarget) + priorityTargetBiasSeconds(id);
      return Math.max(baseMinutes + gkDutySeconds(id), target);
    };
    const shortfall = (id: string) => playerTotalTarget(id) - totalProjected(id);

    // Snapshot now so we can detect cap breaches.
    const projectionsNow = new Map<string, number>();
    const shortfallsNow = new Map<string, number>();
    outfieldPlayers.forEach(p => {
      projectionsNow.set(p.id, totalProjected(p.id));
      shortfallsNow.set(p.id, shortfall(p.id));
    });
    const shortfallVals = Array.from(shortfallsNow.values());
    const shortfallSpread = Math.max(...shortfallVals) - Math.min(...shortfallVals);
    const capBreached = shortfallSpread > escalationThreshold;

    const isGkProtectedFreq = (id: string) =>
      (includeStartingGkInRotation && id === gkOnPitch?.id) ||
      (halftimeGkIn ? id === halftimeGkIn.id : false);

    const benchQueue = outfieldPlayers
      .filter(p => !currentIds.has(p.id))
      .filter(p => isAvailableForInterval(p, absoluteSeconds, nextAbsoluteSeconds))
      .sort((a, b) => {
        // PHASE 5: shortfall is always the primary criterion. The bench
        // player furthest below their fair-share total comes on first. FIFO
        // (longest-waiting) only acts as a tiebreaker inside a small
        // deadband to keep the queue stable when shortfalls are essentially
        // equal. The previous capBreached gate is retained as a stronger
        // override for clearly-breaching situations.
        const aS = shortfallsNow.get(a.id) ?? 0;
        const bS = shortfallsNow.get(b.id) ?? 0;
        const deadband = capBreached ? 15 : 30;
        if (Math.abs(aS - bS) > deadband) return bS - aS;
        // GK protection: bring protected players on first when both still owe minutes.
        const aGk = isGkProtectedFreq(a.id) ? 1 : 0;
        const bGk = isGkProtectedFreq(b.id) ? 1 : 0;
        if (aGk !== bGk) {
          const aProj = projectionsNow.get(a.id) ?? 0;
          const bProj = projectionsNow.get(b.id) ?? 0;
          if (aGk && aProj < gkCeilingTotal - 30) return -1;
          if (bGk && bProj < gkCeilingTotal - 30) return 1;
        }
        // Tiebreaker: pure FIFO — longest-waiting bench player first.
        return (lastOffAt.get(a.id) ?? 0) - (lastOffAt.get(b.id) ?? 0);
      });

    const pitchSlotsWithMeta = fieldSlots
      .map((slot, index) => ({ slot, index, playerOut: slot.playerId ? playerById.get(slot.playerId) : undefined }))
      .filter(({ playerOut }) => !!playerOut);

    const usedSlotIndexes = new Set<number>();
    const usedInIds = new Set<string>();
    const selectedSubs: { slotIndex: number; playerOut: Player; playerIn: Player }[] = [];

    for (let bi = 0; bi < benchQueue.length && selectedSubs.length < maxChanges; bi++) {
      const playerIn = benchQueue[bi];
      if (usedInIds.has(playerIn.id)) continue;

      // Pitch candidates compatible with this incoming player.
      // When cap is breached: pull the highest projected total first.
      // Otherwise: queue order (longest currently-on-pitch first).
      const eligibleSlots = pitchSlotsWithMeta
        .filter(({ slot, index, playerOut }) =>
          !usedSlotIndexes.has(index) &&
          !!playerOut &&
          canUseInOutfield(playerIn, slot.position) &&
          absoluteSeconds - (lastOnAt.get(playerOut!.id) ?? 0) >= MIN_SHIFT_SECONDS &&
          !previousRotationPlayerInIds.has(playerOut!.id)
        )
        .sort((a, b) => {
          // PHASE 5: shortfall-gradient pull-off. Player with the SMALLEST
          // shortfall (most over their fair share) comes off first. FIFO
          // (longest currently-on-pitch) only tiebreaks inside the deadband.
          const aS = shortfallsNow.get(a.playerOut!.id) ?? 0;
          const bS = shortfallsNow.get(b.playerOut!.id) ?? 0;
          const deadband = capBreached ? 15 : 30;
          if (Math.abs(aS - bS) > deadband) return aS - bS;
          // GK protection: never pull a protected player off until they reach
          // gkCeilingTotal — pull non-protected players first.
          const aGk = isGkProtectedFreq(a.playerOut!.id) ? 1 : 0;
          const bGk = isGkProtectedFreq(b.playerOut!.id) ? 1 : 0;
          if (aGk !== bGk) {
            const aProj = projectionsNow.get(a.playerOut!.id) ?? 0;
            const bProj = projectionsNow.get(b.playerOut!.id) ?? 0;
            if (aGk && aProj < gkCeilingTotal - 30) return 1;
            if (bGk && bProj < gkCeilingTotal - 30) return -1;
          }
          // Tiebreaker: queue order — longest currently-on-pitch first.
          return (lastOnAt.get(a.playerOut!.id) ?? 0) - (lastOnAt.get(b.playerOut!.id) ?? 0);
        });

      if (eligibleSlots.length === 0) continue;

      let chosenSlot = eligibleSlots[0];
      let playerOut = chosenSlot.playerOut!;

      // GK PROTECTION (Frequent): if the chosen slot is a GK-protected player
      // who hasn't reached the spread ceiling yet, prefer a non-GK slot if any
      // is available. Falls through to the GK swap only if no alternative.
      const bankedTotal = (id: string) => {
        const p = playerById.get(id);
        return (p?.minutesPlayed || 0) + gkDutySeconds(id) + (currentFieldSeconds.get(id) || 0);
      };
      const inIsProtected = isGkProtectedFreq(playerIn.id);
      if (
        isGkProtectedFreq(playerOut.id) &&
        bankedTotal(playerOut.id) < gkCeilingTotal - 30 &&
        !inIsProtected
      ) {
        const altSlot = eligibleSlots.find(s =>
          s !== chosenSlot && !isGkProtectedFreq(s.playerOut!.id),
        );
        if (altSlot) {
          chosenSlot = altSlot;
          playerOut = altSlot.playerOut!;
        }
      }

      // Only commit if the swap actually narrows the shortfall gap between
      // these two players. (Avoids churn when shortfalls are already balanced.)
      const inShortfall = shortfallsNow.get(playerIn.id) ?? 0;
      const outShortfall = shortfallsNow.get(playerOut.id) ?? 0;
      const gapBefore = inShortfall - outShortfall;
      if (gapBefore < 30 && !capBreached) {
        continue;
      }
      // Hard refusal: never make the spread worse (incoming player already above target).
      if (gapBefore < 0) continue;

      usedSlotIndexes.add(chosenSlot.index);
      usedInIds.add(playerIn.id);
      selectedSubs.push({ slotIndex: chosenSlot.index, playerOut, playerIn });
    }

    selectedSubs.forEach(({ slotIndex, playerOut, playerIn }) => {
      const { half, time } = toPlanTime(absoluteSeconds);
      plan.push({
        time,
        half,
        playerOut,
        playerIn,
        executed: false,
      });

      fieldSlots[slotIndex].playerId = playerIn.id;
      // Update queue trackers: outgoing player joins bench wait queue,
      // incoming player starts a fresh on-pitch shift.
      lastOffAt.set(playerOut.id, absoluteSeconds);
      lastOnAt.set(playerIn.id, absoluteSeconds);
    });

    previousRotationPlayerInIds = new Set(selectedSubs.map(sub => sub.playerIn.id));
  };

  let directLastTime = startAbsoluteSeconds;
  for (let i = 0; i < sortedDirectEventTimes.length; i++) {
    const eventTime = sortedDirectEventTimes[i];
    addFieldTime(eventTime - directLastTime);
    directLastTime = eventTime;

    let reservedSubEvents = 0;
    if (eventTime === halfDurationSeconds && rotateGkAtHalftime && gkOnPitch && halftimeGkIn) {
      plan.push({
        time: 0,
        half: 2,
        playerOut: gkOnPitch,
        playerIn: halftimeGkIn,
        executed: false,
      });
      reservedSubEvents = 1;
      fieldSlots.forEach(slot => {
        if (slot.playerId === halftimeGkIn.id) slot.playerId = null;
      });
      // Queue updates for the GK swap: starting GK becomes available for the
      // outfield bench queue (H2 onward), halftime GK is now on pitch as GK.
      lastOffAt.set(gkOnPitch.id, eventTime);
      lastOnAt.set(halftimeGkIn.id, eventTime);
    }

    const nextTime = sortedDirectEventTimes[i + 1] ?? endAbsoluteSeconds;
    applyFairRotationAt(eventTime, nextTime, reservedSubEvents);
  }
  addFieldTime(endAbsoluteSeconds - directLastTime);

  const getPlanAbsoluteSeconds = (sub: SubstitutionEvent) =>
    sub.half === 1 ? sub.time : halfDurationSeconds + sub.time;
  const isDirectHalftimeGkSwapSub = (sub: SubstitutionEvent) =>
    !!gkOnPitch && sub.half === 2 && sub.time === 0 && sub.playerOut.id === gkOnPitch.id;
  const fairPlayerIds = playerData.filter(p => !p.isInjured).map(p => p.id);

  const simulateFullPlan = (candidatePlan: SubstitutionEvent[]) => {
    const totals = new Map<string, number>();
    playerData.forEach(p => totals.set(p.id, p.minutesPlayed || 0));

    const onPitch = new Map<string, PitchPosition>();
    playersOnPitch.forEach(p => {
      if (p.currentPitchPosition) onPitch.set(p.id, p.currentPitchPosition);
    });

    // Track when each player most recently came onto the pitch (in absolute seconds).
    // Starters are seeded at startAbsoluteSeconds. Used to penalise short shifts
    // (a player taken off less than MIN_SHIFT_SECONDS_PENALTY after coming on).
    const cameOnAt = new Map<string, number>();
    playersOnPitch.forEach(p => cameOnAt.set(p.id, startAbsoluteSeconds));
    const MIN_SHIFT_SECONDS_PENALTY = eff.minShiftSeconds;

    const ordered = candidatePlan
      .map((sub, index) => ({ sub, index, absoluteSeconds: getPlanAbsoluteSeconds(sub) }))
      .sort((a, b) => a.absoluteSeconds - b.absoluteSeconds);
    const snapshots: { index: number; before: Map<string, PitchPosition>; absoluteSeconds: number; nextAbsoluteSeconds: number }[] = [];
    let last = startAbsoluteSeconds;
    let valid = true;
    let bounceBackCount = 0;
    let shortShiftCount = 0;
    let currentWindowTime: number | null = null;
    let previousWindowPlayerIns = new Set<string>();
    let currentWindowPlayerIns = new Set<string>();

    ordered.forEach((entry, orderIndex) => {
      const elapsed = entry.absoluteSeconds - last;
      if (elapsed < 0) valid = false;
      if (elapsed > 0) {
        onPitch.forEach((_, id) => totals.set(id, (totals.get(id) || 0) + elapsed));
      }

      if (currentWindowTime !== entry.absoluteSeconds) {
        previousWindowPlayerIns = currentWindowPlayerIns;
        currentWindowPlayerIns = new Set<string>();
        currentWindowTime = entry.absoluteSeconds;
      }

      if (benchSize > 1 && previousWindowPlayerIns.has(entry.sub.playerOut.id) && !isDirectHalftimeGkSwapSub(entry.sub)) {
        bounceBackCount++;
      }

      // Short-shift penalty: catches bounce-backs across more than one window.
      if (benchSize > 1 && !isDirectHalftimeGkSwapSub(entry.sub)) {
        const onSince = cameOnAt.get(entry.sub.playerOut.id);
        if (onSince !== undefined && entry.absoluteSeconds - onSince < MIN_SHIFT_SECONDS_PENALTY) {
          shortShiftCount++;
        }
      }

      snapshots.push({
        index: entry.index,
        before: new Map(onPitch),
        absoluteSeconds: entry.absoluteSeconds,
        nextAbsoluteSeconds: ordered[orderIndex + 1]?.absoluteSeconds ?? endAbsoluteSeconds,
      });

      const outPosition = onPitch.get(entry.sub.playerOut.id);
      if (!outPosition || onPitch.has(entry.sub.playerIn.id)) valid = false;

      onPitch.delete(entry.sub.playerOut.id);
      cameOnAt.delete(entry.sub.playerOut.id);
      if (entry.sub.positionSwap) {
        const swapFromPosition = onPitch.get(entry.sub.positionSwap.player.id);
        if (!swapFromPosition) valid = false;
        if (swapFromPosition) onPitch.set(entry.sub.playerIn.id, swapFromPosition);
        onPitch.set(entry.sub.positionSwap.player.id, outPosition || entry.sub.positionSwap.toPosition);
      } else if (outPosition) {
        onPitch.set(entry.sub.playerIn.id, outPosition);
      }
      cameOnAt.set(entry.sub.playerIn.id, entry.absoluteSeconds);

      currentWindowPlayerIns.add(entry.sub.playerIn.id);

      last = entry.absoluteSeconds;
    });

    const remaining = endAbsoluteSeconds - last;
    if (remaining > 0) {
      onPitch.forEach((_, id) => totals.set(id, (totals.get(id) || 0) + remaining));
    }

    return { totals, snapshots, valid, bounceBackCount, shortShiftCount };
  };

  const fairnessObjective = (totals: Map<string, number>, bounceBackCount = 0, shortShiftCount = 0) => {
    const values = fairPlayerIds.map(id => totals.get(id) || 0);
    if (values.length < 2) return 0;
    const spread = Math.max(...values) - Math.min(...values);
    return spread * 1000 + bounceBackCount * 10_000_000 + shortShiftCount * 5_000_000;
  };

  // Iterative fairness optimizer. Each pass tries every legal single-sub
  // identity replacement at every snapshot and keeps the edit that most
  // reduces (spread × 1000 + GK shortfall). Runs until no improvement.
  const MAX_OPTIMIZER_ITERATIONS = 120;
  for (let iter = 0; iter < MAX_OPTIMIZER_ITERATIONS; iter++) {
    const currentSim = simulateFullPlan(plan);
    if (!currentSim.valid) break;
    const currentScore = fairnessObjective(currentSim.totals, currentSim.bounceBackCount, currentSim.shortShiftCount);
    if (currentScore === 0) break;
    let bestEdit: { index: number; replacement: SubstitutionEvent; score: number } | null = null;

    for (const snapshot of currentSim.snapshots) {
      const original = plan[snapshot.index];
      if (!original || isDirectHalftimeGkSwapSub(original)) continue;

      const incomingCandidates = playerData.filter(player =>
        !snapshot.before.has(player.id) &&
        isAvailableForInterval(player, snapshot.absoluteSeconds, snapshot.nextAbsoluteSeconds)
      );

      for (const [outId, outPosition] of snapshot.before.entries()) {
        if (outPosition === "GK") continue;
        const playerOut = playerById.get(outId);
        if (!playerOut) continue;

        for (const playerIn of incomingCandidates) {
          if (!canUseInOutfield(playerIn, outPosition)) continue;
          if (playerOut.id === original.playerOut.id && playerIn.id === original.playerIn.id && !original.positionSwap) continue;

          const replacement: SubstitutionEvent = {
            ...original,
            playerOut,
            playerIn,
            positionSwap: undefined,
          };

          plan[snapshot.index] = replacement;
          const trial = simulateFullPlan(plan);
          const score = trial.valid ? fairnessObjective(trial.totals, trial.bounceBackCount, trial.shortShiftCount) : Number.POSITIVE_INFINITY;
          plan[snapshot.index] = original;

          // Accept any strict improvement (no slack) so the optimizer can keep
          // tightening the spread until truly optimal.
          if (trial.valid && score < (bestEdit?.score ?? currentScore)) {
            bestEdit = { index: snapshot.index, replacement, score };
          }
        }
      }
    }

    if (!bestEdit || bestEdit.score >= currentScore) break;
    plan[bestEdit.index] = bestEdit.replacement;
  }

  plan.sort((a, b) => {
    if (a.half !== b.half) return a.half - b.half;
    if (a.time !== b.time) return a.time - b.time;
    const aIsGkSwap = !!gkOnPitch && a.half === 2 && a.time === 0 && a.playerOut.id === gkOnPitch.id;
    const bIsGkSwap = !!gkOnPitch && b.half === 2 && b.time === 0 && b.playerOut.id === gkOnPitch.id;
    if (aIsGkSwap !== bIsGkSwap) return aIsGkSwap ? -1 : 1;
    return 0;
  });

  {
      const eqPlan = applyEqualTimeOverride({
        playerData, teamSize, halfDurationSeconds,
        gkOnPitch, halftimeGkIn, rotateGkAtHalftime, maxSpreadMinutes,
        rotationSpeed, eff,
        priorityOrderLength: priorityOrder.length,
        startHalf, startElapsedSeconds: clampedStartElapsed,
        benchCount: outfieldOnBench.length,
        currentPlan: plan,
      });
      if (eqPlan) {
        plan.length = 0;
        plan.push(...eqPlan);
      }
    }

  return ensureNoStarvedPlayers(plan, playerData, halfDurationSeconds);

  // Process each half (start from current half for mid-game)
  for (let half = startHalf; half <= 2; half++) {
    const isStartHalf = half === startHalf;

    // At the start of H2, apply the halftime GK swap to the simulation state:
    // the incoming GK leaves the outfield pool (they're now in goal). The
    // outgoing GK is already off the pitch and will be rotated in normally.
    if (half === 2 && halftimeGkIn && currentOnPitch.has(halftimeGkIn.id)) {
      currentOnPitch.delete(halftimeGkIn.id);
    }

    const halfRemaining = isStartHalf ? halfDurationSeconds - startElapsedSeconds : halfDurationSeconds;
    const rawSubTimes = generateSubTimes(halfRemaining, actualWindowsPerHalf)
      .map(t => isStartHalf ? t + startElapsedSeconds : t); // Offset times for current half

    // Filter subs too close to end of half:
    // - First half: snap to halftime (half 2, time 0)
    // - Second half: drop entirely (don't sub someone off within 1 min of full time)
    const subTimes: number[] = [];
    const deferredToHalftime: number[] = [];
    for (const t of rawSubTimes) {
      if ((halfDurationSeconds - t) <= END_OF_HALF_SNAP_THRESHOLD) {
        if (half === 1) {
          deferredToHalftime.push(t);
        }
        // half === 2: drop — no point subbing within 1 min of full time
      } else {
        subTimes.push(t);
      }
    }

    let lastEventTime = isStartHalf ? startElapsedSeconds : 0;

    for (const subTime of subTimes) {
      // Add elapsed time to players currently on pitch
      const elapsed = subTime - lastEventTime;
      currentOnPitch.forEach((_, id) => {
        playingTime.set(id, (playingTime.get(id) || 0) + elapsed);
      });
      lastEventTime = subTime;

      // Get sorted lists — use GK-adjusted time so goalkeepers are prioritised
      // (picked first off the bench, picked last off the pitch).
      const onPitchSorted = Array.from(currentOnPitch.keys())
        .map(id => ({ id, time: adjustedTime(id), player: getPlayer(id)! }))
        .filter(p => p.player)
        .sort((a, b) => b.time - a.time);

      const benchSorted = outfieldPlayers
        .filter(p => !currentOnPitch.has(p.id))
        // Starting GK is in the rotation pool but NOT actually available until
        // they come off goal at halftime — exclude them from H1 sub windows.
        .filter(p => !(includeStartingGkInRotation && half === 1 && p.id === gkOnPitch?.id))
        // Halftime GK substitute is in goal during H2, not on the bench.
        .filter(p => !(half === 2 && halftimeGkIn && p.id === halftimeGkIn.id))
        .map(p => ({ id: p.id, time: adjustedTime(p.id), player: p }))
        .sort((a, b) => a.time - b.time);

      if (onPitchSorted.length === 0 || benchSorted.length === 0) continue;

      // Determine how many subs to make at this time window
      const currentBenchSize = benchSorted.length;
      const subsThisWindow = Math.min(subsAtOnce, currentBenchSize, onPitchSorted.length);

      // Track which players we've already used in this window
      const usedPlayerOutIds = new Set<string>();
      const usedPlayerInIds = new Set<string>();

      for (let subIdx = 0; subIdx < subsThisWindow; subIdx++) {
        // Refresh sorted lists excluding already-used players
        const availableOnPitch = onPitchSorted.filter(p => !usedPlayerOutIds.has(p.id));
        const availableBench = benchSorted.filter(p => !usedPlayerInIds.has(p.id));

        if (availableOnPitch.length === 0 || availableBench.length === 0) break;

        const mostPlayedOnPitch = availableOnPitch[0];
        const leastPlayedOnBench = availableBench[0];

        // Only check time difference for the first sub of a batch window
        // Additional batch subs are made to rotate more players together
        // Use 30s threshold for consistency with candidate scoring
        if (subIdx === 0 && (mostPlayedOnPitch.time - leastPlayedOnBench.time) < 30) break;

        const best = findBestSubCandidate(onPitchSorted, benchSorted, usedPlayerOutIds, usedPlayerInIds);

        if (best) {
          const incomingPosition = best.positionSwap
            ? best.positionSwap.fromPosition
            : currentOnPitch.get(best.playerOut.id);

          plan.push({
            time: subTime,
            half: half as 1 | 2,
            playerOut: best.playerOut,
            playerIn: best.playerIn,
            positionSwap: best.positionSwap,
            executed: false,
          });

          // Mark players as used in this window
          usedPlayerOutIds.add(best.playerOut.id);
          usedPlayerInIds.add(best.playerIn.id);

          // Update pitch state
          currentOnPitch.delete(best.playerOut.id);
          currentOnPitch.set(best.playerIn.id, incomingPosition!);

          if (best.positionSwap) {
            currentOnPitch.set(best.positionSwap.player.id, best.positionSwap.toPosition);
          }
        } else {
          break; // No valid subs found
        }
      }
    }

    // Add remaining time in half
    const remainingTime = halfDurationSeconds - lastEventTime;
    currentOnPitch.forEach((_, id) => {
      playingTime.set(id, (playingTime.get(id) || 0) + remainingTime);
    });

    // Process deferred end-of-half subs as halftime subs (half 2, time 0)
    if (half === 1 && deferredToHalftime.length > 0) {
      const onPitchSorted = Array.from(currentOnPitch.keys())
        .map(id => ({ id, time: adjustedTime(id), player: getPlayer(id)! }))
        .filter(p => p.player)
        .sort((a, b) => b.time - a.time);
      const benchSorted = outfieldPlayers
        .filter(p => !currentOnPitch.has(p.id))
        // Starting GK is still in goal at the end of H1 — not a real bench option here.
        .filter(p => !(includeStartingGkInRotation && p.id === gkOnPitch?.id))
        .map(p => ({ id: p.id, time: adjustedTime(p.id), player: p }))
        .sort((a, b) => a.time - b.time);
      const usedOutIds = new Set<string>();
      const usedInIds = new Set<string>();
      for (let di = 0; di < deferredToHalftime.length; di++) {
        const availableOnPitch = onPitchSorted.filter(p => !usedOutIds.has(p.id));
        const availableBench = benchSorted.filter(p => !usedInIds.has(p.id));
        if (availableOnPitch.length === 0 || availableBench.length === 0) break;
        const best = findBestSubCandidate(onPitchSorted, benchSorted, usedOutIds, usedInIds);
        if (best) {
          const incomingPosition = best.positionSwap
            ? best.positionSwap.fromPosition
            : currentOnPitch.get(best.playerOut.id);
          plan.push({
            time: 0,
            half: 2,
            playerOut: best.playerOut,
            playerIn: best.playerIn,
            positionSwap: best.positionSwap,
            executed: false,
          });
          usedOutIds.add(best.playerOut.id);
          usedInIds.add(best.playerIn.id);
          currentOnPitch.delete(best.playerOut.id);
          currentOnPitch.set(best.playerIn.id, incomingPosition!);
          if (best.positionSwap) {
            currentOnPitch.set(best.positionSwap.player.id, best.positionSwap.toPosition);
          }
        } else {
          break;
        }
      }
    }
  }

  // Handle GK substitution at halftime (only if we haven't passed halftime)
  if (rotateGkAtHalftime && gkOnPitch && startHalf === 1) {
    // Prefer the H2 GK we predicted upfront (and gave the priority bonus to)
    // so the simulation stays consistent. Fall back to least-played GK-eligible
    // bench player only if none was predicted.
    const gkReplacementPlayer = halftimeGkIn || (() => {
      const benchAtHalftime = outfieldPlayers
        .filter(p => !currentOnPitch.has(p.id))
        .map(p => ({ player: p, time: playingTime.get(p.id) || 0 }))
        .sort((a, b) => a.time - b.time);
      // Eligible: players with GK in assigned positions, OR players with no positions set (eligible for all)
      const gkEligible = benchAtHalftime.filter(p =>
        p.player.assignedPositions?.includes("GK") || !p.player.assignedPositions?.length
      );
      return gkEligible[0]?.player || null;
    })();

    if (gkReplacementPlayer) {
      plan.push({
        time: 0,
        half: 2,
        playerOut: gkOnPitch,
        playerIn: gkReplacementPlayer,
        executed: false,
      });
    }
  }

  // Snap subs scheduled within 60s of the start of a half to time 0 (half-time sub)
  // This avoids scheduling a sub e.g. 14 seconds into the 2nd half when it should just happen at half time
  const HALF_BOUNDARY_THRESHOLD = 60;
  for (const sub of plan) {
    if (sub.time > 0 && sub.time <= HALF_BOUNDARY_THRESHOLD) {
      sub.time = 0;
    }
  }

  const isHalftimeGkSwapSub = (sub: SubstitutionEvent) =>
    !!gkOnPitch && sub.half === 2 && sub.time === 0 && sub.playerOut.id === gkOnPitch.id;

  const sortPlan = () => {
    plan.sort((a, b) => {
      if (a.half !== b.half) return a.half - b.half;
      if (a.time !== b.time) return a.time - b.time;
      // The GK change must happen before any other halftime subs so the H2 GK
      // is removed from the outfield rotation before normal subs are applied.
      if (isHalftimeGkSwapSub(a) !== isHalftimeGkSwapSub(b)) {
        return isHalftimeGkSwapSub(a) ? -1 : 1;
      }
      return 0;
    });
  };

  sortPlan();

  type SimulationSnapshot = {
    index: number;
    sub: SubstitutionEvent;
    before: Map<string, PitchPosition>;
  };

  const canPlayPosition = (player: Player, position?: PitchPosition) =>
    !!position && (!player.assignedPositions?.length || player.assignedPositions.includes(position));

  const simulateOutfieldPlan = (candidatePlan: SubstitutionEvent[]) => {
    const t = new Map<string, number>();
    outfieldPlayers.forEach(p => t.set(p.id, p.minutesPlayed || 0));

    const onP = new Map<string, PitchPosition>();
    outfieldOnPitch.forEach(p => onP.set(p.id, p.currentPitchPosition as PitchPosition));

    const snapshots: SimulationSnapshot[] = [];
    let valid = true;
    let lt = startElapsedSeconds;
    let lh: 1 | 2 = startHalf;

    candidatePlan.forEach((sub, index) => {
      const elapsed = sub.half === lh
        ? sub.time - lt
        : (halfDurationSeconds - lt) + sub.time;

      if (elapsed < 0) valid = false;
      if (elapsed > 0) {
        onP.forEach((_, id) => t.set(id, (t.get(id) || 0) + elapsed));
      }

      lt = sub.time;
      lh = sub.half;
      snapshots.push({ index, sub, before: new Map(onP) });

      if (isHalftimeGkSwapSub(sub)) {
        // This is a goalkeeping change, not an outfield substitution. If the
        // incoming GK was playing outfield in H1, remove them from field play.
        onP.delete(sub.playerIn.id);
        return;
      }

      const outPos = onP.get(sub.playerOut.id);
      if (!outPos || onP.has(sub.playerIn.id)) {
        valid = false;
      }

      onP.delete(sub.playerOut.id);
      if (sub.positionSwap) {
        const swapFromPos = onP.get(sub.positionSwap.player.id);
        if (!swapFromPos || !canPlayPosition(sub.playerIn, swapFromPos) || !canPlayPosition(sub.positionSwap.player, outPos)) {
          valid = false;
        }
        if (swapFromPos) onP.set(sub.playerIn.id, swapFromPos);
        if (outPos) onP.set(sub.positionSwap.player.id, outPos);
      } else if (outPos) {
        if (!canPlayPosition(sub.playerIn, outPos)) valid = false;
        onP.set(sub.playerIn.id, outPos);
      }
    });

    const endE = halfDurationSeconds - lt;
    if (endE > 0) onP.forEach((_, id) => t.set(id, (t.get(id) || 0) + endE));
    if (lh === 1) onP.forEach((_, id) => t.set(id, (t.get(id) || 0) + halfDurationSeconds));

    return { times: t, snapshots, valid };
  };

  const totalProjectedSeconds = (times: Map<string, number>, id: string) =>
    (times.get(id) || 0) + gkDutySeconds(id);

  // ITERATIVE FAIRNESS PASS: make legal, state-aware edits only. The previous
  // pass could miss cases where the overplayed player never appeared as a
  // matching `playerIn`/`playerOut`. Here we inspect the actual pitch state at
  // each sub window and replace that window with `overplayed off, underplayed on`.
  const fairnessTargets = outfieldPlayers;
  // Tolerance lowered (was 30s) so the loop keeps searching for improving
  // swaps until the spread is within ~5 seconds. The loop still exits early
  // when no swap can improve, so this only burns iterations when there's
  // actual room to tighten fairness.
  const FAIRNESS_TOLERANCE = 5;
  const MAX_REBALANCE_ITERATIONS = 32;

  const fairnessSpread = (times: Map<string, number>) => {
    const values = fairnessTargets.map(p => totalProjectedSeconds(times, p.id));
    if (values.length < 2) return 0;
    return Math.max(...values) - Math.min(...values);
  };

  for (let iter = 0; iter < MAX_REBALANCE_ITERATIONS; iter++) {
    const sim = simulateOutfieldPlan(plan);
    const ftimes = fairnessTargets.map(p => ({ id: p.id, t: totalProjectedSeconds(sim.times, p.id) }));
    if (ftimes.length < 2) break;

    ftimes.sort((a, b) => b.t - a.t);
    const over = ftimes[0];
    const under = ftimes[ftimes.length - 1];
    const currentSpread = over.t - under.t;
    if (currentSpread <= FAIRNESS_TOLERANCE) break;

    const overPlayer = getPlayer(over.id);
    const underPlayer = getPlayer(under.id);
    if (!overPlayer || !underPlayer) break;

    let bestEdit: { index: number; replacement: SubstitutionEvent; spread: number } | null = null;

    for (const snapshot of sim.snapshots) {
      const sub = plan[snapshot.index];
      if (!sub || isHalftimeGkSwapSub(sub)) continue;
      if (!snapshot.before.has(over.id) || snapshot.before.has(under.id)) continue;

      const overPosition = snapshot.before.get(over.id);
      if (!overPosition) continue;

      // Build candidate replacements for this snapshot:
      //  1. DIRECT MATCH — under can take over's position straight up.
      //  2. POSITION SWAP — find a 3rd on-pitch player Q whose slot under can
      //     play and who can move into over's slot. This unlocks a much wider
      //     pool of fairness swaps when assigned positions don't overlap.
      const candidateReplacements: SubstitutionEvent[] = [];

      if (canPlayPosition(underPlayer, overPosition)) {
        candidateReplacements.push({
          ...sub,
          playerOut: overPlayer,
          playerIn: underPlayer,
          positionSwap: undefined,
        });
      }

      if (!disablePositionSwaps) {
        for (const [qId, qPos] of snapshot.before.entries()) {
          if (qId === over.id || qId === under.id || qId === overPlayer.id) continue;
          if (!canPlayPosition(underPlayer, qPos)) continue;
          if (!canPlayPosition({ assignedPositions: getPlayer(qId)?.assignedPositions } as Player, overPosition)) continue;
          const qPlayer = getPlayer(qId);
          if (!qPlayer) continue;
          candidateReplacements.push({
            ...sub,
            playerOut: overPlayer,
            playerIn: underPlayer,
            positionSwap: {
              player: qPlayer,
              fromPosition: qPos,
              toPosition: overPosition,
            },
          });
        }
      }

      for (const replacement of candidateReplacements) {
        const original = plan[snapshot.index];
        plan[snapshot.index] = replacement;
        const trial = simulateOutfieldPlan(plan);
        const spread = trial.valid ? fairnessSpread(trial.times) : currentSpread;
        plan[snapshot.index] = original;

        if (trial.valid && spread < (bestEdit?.spread ?? currentSpread)) {
          bestEdit = { index: snapshot.index, replacement, spread };
        }
      }
    }

    if (!bestEdit) break;
    plan[bestEdit.index] = bestEdit.replacement;
  }

  // ============================================================
  // REMOVAL PASS — drop redundant subs that hurt fairness.
  // ------------------------------------------------------------
  // The fill loop can leave "tail" subs at the end of a half that bench an
  // already-low player to bring on a similar-time player. Removing such
  // subs both reduces churn and tightens the spread. We delete a sub only
  // when the resulting plan is still valid AND the new fairness min is
  // strictly higher (no other player gets demoted as a side effect).
  // ============================================================
  for (let pass = 0; pass < 6; pass++) {
    sortPlan();
    const sim = simulateOutfieldPlan(plan);
    if (!sim.valid) break;
    const baseSpread = fairnessSpread(sim.times);
    const baseMin = Math.min(...fairnessTargets.map(p => totalProjectedSeconds(sim.times, p.id)));

    let bestRemoval: { index: number; spread: number; min: number } | null = null;
    for (let i = 0; i < plan.length; i++) {
      const sub = plan[i];
      if (isHalftimeGkSwapSub(sub)) continue;
      const trialPlan = plan.filter((_, j) => j !== i);
      const trial = simulateOutfieldPlan(trialPlan);
      if (!trial.valid) continue;
      const trialMin = Math.min(...fairnessTargets.map(p => totalProjectedSeconds(trial.times, p.id)));
      const trialSpread = fairnessSpread(trial.times);
      // Accept removal only if the lowest player strictly improves AND spread
      // does not get worse. This prevents removing useful subs that happen to
      // have a neutral effect on the min.
      if (trialMin > baseMin + FAIRNESS_TOLERANCE && trialSpread <= baseSpread) {
        if (
          !bestRemoval ||
          trialMin > bestRemoval.min ||
          (trialMin === bestRemoval.min && trialSpread < bestRemoval.spread)
        ) {
          bestRemoval = { index: i, spread: trialSpread, min: trialMin };
        }
      }
    }
    if (!bestRemoval) break;
    plan.splice(bestRemoval.index, 1);
  }
  // ============================================================
  // PHASE 4 — Spread-driven extra-window injection.
  // ------------------------------------------------------------
  // The rebalance loop above can only REPLACE existing sub events. When the
  // residual spread is caused by an under-played player who never appears as
  // a candidate `playerIn` in any existing window (e.g. a bench player whose
  // assigned positions don't overlap with anyone currently being subbed off),
  // no swap can fix them. Here we try to INSERT a brand-new sub event in a
  // quiet gap so the under-played player gets on the pitch.
  //
  // Constraints:
  // - Only fires when residual spread > 2× FAIRNESS_TOLERANCE (≥10 s today).
  // - New window must respect a 90-s minimum gap from neighbouring subs.
  // - New window must not cross the half boundary.
  // - The over-played player must actually be on pitch in the candidate gap.
  // - Direct position match preferred; falls back to a 3rd-player swap.
  // - Each insertion must reduce the simulated spread.
  // ============================================================
  // Only inject when spread exceeds the user-set cap. The rebalance loop
  // above already handles tighter (≥5 s) refinements via in-place swaps.
  // Injection is heavier (adds a real sub event) so we reserve it for cases
  // where the user's max-spread preference is actually being violated.
  const SPREAD_INJECTION_THRESHOLD = Math.max(FAIRNESS_TOLERANCE * 4, maxSpreadMinutes * 60 * 1.5);
  const SPREAD_INJECTION_MIN_GAP_SEC = 90;
  const SPREAD_INJECTION_MAX_INSERTIONS = 4;

  const subAbsSeconds = (s: SubstitutionEvent) =>
    s.half === 1 ? s.time : halfDurationSeconds + s.time;

  for (let inj = 0; inj < SPREAD_INJECTION_MAX_INSERTIONS; inj++) {
    sortPlan();
    const sim = simulateOutfieldPlan(plan);
    if (!sim.valid) break;
    const ftimes = fairnessTargets.map(p => ({ id: p.id, t: totalProjectedSeconds(sim.times, p.id) }));
    if (ftimes.length < 2) break;
    ftimes.sort((a, b) => b.t - a.t);
    const over = ftimes[0];
    const under = ftimes[ftimes.length - 1];
    const currentSpread = over.t - under.t;
    if (currentSpread <= SPREAD_INJECTION_THRESHOLD) break;

    const overPlayer = getPlayer(over.id);
    const underPlayer = getPlayer(under.id);
    if (!overPlayer || !underPlayer) break;

    // Build the list of candidate gaps from existing sub timings. Each gap is
    // [prevAbs, nextAbs] within the same half, plus a synthetic final gap up
    // to end-of-game and an initial gap from start.
    type Gap = { startAbs: number; endAbs: number; insertAfterIndex: number; half: 1 | 2; pitchBefore: Map<string, PitchPosition> };
    const gaps: Gap[] = [];
    const startAbsLocal = startHalf === 1 ? startElapsedSeconds : halfDurationSeconds + startElapsedSeconds;
    const endAbsLocal = halfDurationSeconds * 2;

    // Initial pitch state at startAbs — read from sim's first snapshot if any,
    // otherwise reconstruct from outfieldOnPitch.
    const initialPitch = new Map<string, PitchPosition>();
    outfieldOnPitch.forEach(p => initialPitch.set(p.id, p.currentPitchPosition as PitchPosition));

    let prevAbs = startAbsLocal;
    let prevHalf: 1 | 2 = startHalf;
    let prevPitch = new Map(initialPitch);
    for (let i = 0; i <= sim.snapshots.length; i++) {
      const snap = sim.snapshots[i];
      const nextAbs = snap ? subAbsSeconds(snap.sub) : endAbsLocal;
      const nextHalf = snap ? snap.sub.half : (2 as const);
      // Only consider intra-half gaps (avoid HT crossings — too fiddly).
      if (prevHalf === nextHalf && nextAbs - prevAbs >= SPREAD_INJECTION_MIN_GAP_SEC * 2 + 30) {
        gaps.push({
          startAbs: prevAbs,
          endAbs: nextAbs,
          insertAfterIndex: i - 1, // -1 means insert at front
          half: prevHalf,
          pitchBefore: new Map(prevPitch),
        });
      }
      if (snap) {
        prevAbs = subAbsSeconds(snap.sub);
        prevHalf = snap.sub.half;
        // Apply this sub to pitch state for the next gap.
        const outPos = prevPitch.get(snap.sub.playerOut.id);
        prevPitch.delete(snap.sub.playerOut.id);
        if (snap.sub.positionSwap && outPos) {
          const swapFromPos = prevPitch.get(snap.sub.positionSwap.player.id);
          if (swapFromPos) {
            prevPitch.set(snap.sub.playerIn.id, swapFromPos);
            prevPitch.set(snap.sub.positionSwap.player.id, outPos);
          }
        } else if (outPos) {
          prevPitch.set(snap.sub.playerIn.id, outPos);
        }
      }
    }

    let bestInsertion: { sub: SubstitutionEvent; insertAfterIndex: number; spread: number } | null = null;

    for (const gap of gaps) {
      // Need over on pitch and under NOT on pitch in this gap.
      const overPos = gap.pitchBefore.get(over.id);
      if (!overPos) continue;
      if (gap.pitchBefore.has(under.id)) continue;

      // Pick midpoint, snap to integer, respect min-gap from both ends.
      const tAbs = Math.floor((gap.startAbs + gap.endAbs) / 2);
      if (tAbs - gap.startAbs < SPREAD_INJECTION_MIN_GAP_SEC) continue;
      if (gap.endAbs - tAbs < SPREAD_INJECTION_MIN_GAP_SEC) continue;
      const tInHalf = gap.half === 1 ? tAbs : tAbs - halfDurationSeconds;
      if (tInHalf <= 0) continue;

      const candidates: SubstitutionEvent[] = [];
      // Direct match.
      if (canPlayPosition(underPlayer, overPos)) {
        candidates.push({
          time: tInHalf,
          half: gap.half,
          playerOut: overPlayer,
          playerIn: underPlayer,
          executed: false,
        });
      }
      // Swap fallback via a 3rd on-pitch player.
      if (!disablePositionSwaps) {
        for (const [qId, qPos] of gap.pitchBefore.entries()) {
          if (qId === over.id || qId === under.id) continue;
          if (!canPlayPosition(underPlayer, qPos)) continue;
          const qPlayer = getPlayer(qId);
          if (!qPlayer || !canPlayPosition(qPlayer, overPos)) continue;
          candidates.push({
            time: tInHalf,
            half: gap.half,
            playerOut: overPlayer,
            playerIn: underPlayer,
            executed: false,
            positionSwap: { player: qPlayer, fromPosition: qPos, toPosition: overPos },
          });
        }
      }

      for (const cand of candidates) {
        const trialPlan = [...plan, cand];
        trialPlan.sort((a, b) => {
          if (a.half !== b.half) return a.half - b.half;
          if (a.time !== b.time) return a.time - b.time;
          if (isHalftimeGkSwapSub(a) !== isHalftimeGkSwapSub(b)) {
            return isHalftimeGkSwapSub(a) ? -1 : 1;
          }
          return 0;
        });
        const trial = simulateOutfieldPlan(trialPlan);
        if (!trial.valid) continue;
        const trialSpread = fairnessSpread(trial.times);
        // Hard guard: no individual fairness target may lose more than 60 s
        // of projected playing time as a side effect. Without this, the
        // injection can solve "high vs zero" by quietly downgrading an
        // already-fine middle player below the 75 % floor.
        const REGRESSION_LIMIT = 60;
        let regressed = false;
        for (const p of fairnessTargets) {
          const before = totalProjectedSeconds(sim.times, p.id);
          const after = totalProjectedSeconds(trial.times, p.id);
          if (after < before - REGRESSION_LIMIT) {
            regressed = true;
            break;
          }
        }
        if (regressed) continue;
        // Only commit if injection brings spread inside the user cap AND
        // strictly improves the current best.
        if (trialSpread <= maxSpreadMinutes * 60 && trialSpread < (bestInsertion?.spread ?? currentSpread)) {
          bestInsertion = { sub: cand, insertAfterIndex: gap.insertAfterIndex, spread: trialSpread };
        }
      }
    }

    if (!bestInsertion) break;
    plan.push(bestInsertion.sub);
  }

  sortPlan();

  // ============================================================
  // EQUAL-TIME POST-PASS — global fairness override.
  // ------------------------------------------------------------
  // When no per-player priority order is configured and we're planning from
  // kickoff, try a deterministic deficit-driven plan that globally optimises
  // toward equal target minutes. Adopt it if it strictly beats the current
  // plan's spread. This makes simple cases (e.g. 8 players / 7-aside / 40 min)
  // converge to mathematically perfect distributions instead of getting
  // dragged off-target by starter bias / continuity / GK protection.
  // ============================================================
  {
    const eqPlan = applyEqualTimeOverride({
      playerData,
      teamSize,
      halfDurationSeconds,
      gkOnPitch,
      halftimeGkIn,
      rotateGkAtHalftime,
      maxSpreadMinutes,
      rotationSpeed,
      eff,
      priorityOrderLength: priorityOrder.length,
      startHalf,
      startElapsedSeconds: clampedStartElapsed,
      benchCount: outfieldOnBench.length,
      currentPlan: plan,
    });
    if (eqPlan) {
      plan.length = 0;
      plan.push(...eqPlan);
      sortPlan();
    }
  }


  return ensureNoStarvedPlayers(plan, playerData, halfDurationSeconds);
}

// Generate per-team plans for mini-league mode and merge them
export function createMiniLeagueSubPlan(
  players: Player[],
  teamSize: number,
  halfDurationSeconds: number,
  rotationSpeed: number,
  disablePositionSwaps: boolean,
  disableBatchSubs: boolean,
  rotateGkAtHalftime: boolean,
  startElapsedSeconds: number,
  startHalf: 1 | 2,
  miniLeagueTeams: MiniLeagueTeams,
  preferredSecondHalfGkId?: string,
  maxSpreadMinutes: number = 5,
  advancedOverrides: AutoSubAdvancedOverrides = {}
): SubstitutionEvent[] {
  const teamAPlayers = players.filter(p => p.teamSide === "a");
  const teamBPlayers = players.filter(p => p.teamSide === "b");

  const planA = teamAPlayers.length > 0
    ? createSubPlan(teamAPlayers, teamSize, halfDurationSeconds, rotationSpeed, disablePositionSwaps, disableBatchSubs, rotateGkAtHalftime, startElapsedSeconds, startHalf, preferredSecondHalfGkId, maxSpreadMinutes, advancedOverrides)
    : [];

  const planB = teamBPlayers.length > 0
    ? createSubPlan(teamBPlayers, teamSize, halfDurationSeconds, rotationSpeed, disablePositionSwaps, disableBatchSubs, rotateGkAtHalftime, startElapsedSeconds, startHalf, undefined, maxSpreadMinutes, advancedOverrides)
    : [];

  // Merge and sort by half then time
  const merged = [...planA, ...planB];
  merged.sort((a, b) => {
    if (a.half !== b.half) return a.half - b.half;
    return a.time - b.time;
  });

  return merged;
}
