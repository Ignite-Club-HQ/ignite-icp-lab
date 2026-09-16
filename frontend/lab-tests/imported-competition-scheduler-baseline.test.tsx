import { expect, test } from 'vitest';
import {
  advanceByFrequency,
  buildRoundRobinPairings,
  dateKey,
  nextAllowedDay,
  snapToAllowedWeekday,
} from '../src/lab/competitionScheduler';

test('builds deterministic round-robin pairings without bye fixtures', () => {
  const pairings = buildRoundRobinPairings(['team-a', 'team-b', 'team-c', 'team-d']);

  expect(pairings).toHaveLength(6);
  expect(pairings).toEqual(buildRoundRobinPairings(['team-a', 'team-b', 'team-c', 'team-d']));
  expect(new Set(pairings.map(pair => [pair.home, pair.away].sort().join(':'))).size).toBe(6);
  expect(pairings.every(pair => pair.home !== pair.away)).toBe(true);
});

test('adds an odd-team bye without emitting a placeholder fixture', () => {
  const pairings = buildRoundRobinPairings(['team-a', 'team-b', 'team-c']);

  expect(pairings).toHaveLength(3);
  expect(pairings.every(pair => !pair.home.includes('BYE') && !pair.away.includes('BYE'))).toBe(true);
});

test('alternates home and away assignment by round', () => {
  const pairings = buildRoundRobinPairings(['team-a', 'team-b', 'team-c', 'team-d']);
  const firstRound = pairings.filter(pair => pair.round === 1);
  const secondRound = pairings.filter(pair => pair.round === 2);

  expect(firstRound).toEqual([
    { round: 1, home: 'team-a', away: 'team-d' },
    { round: 1, home: 'team-b', away: 'team-c' },
  ]);
  expect(secondRound).toEqual([
    { round: 2, home: 'team-c', away: 'team-a' },
    { round: 2, home: 'team-b', away: 'team-d' },
  ]);
});

test('advances supported competition frequencies without mutating the input date', () => {
  const date = new Date(2026, 0, 31);

  expect(dateKey(advanceByFrequency(date, 'weekly', 0))).toBe('2026-02-07');
  expect(dateKey(advanceByFrequency(date, 'biweekly', 0))).toBe('2026-02-14');
  expect(dateKey(advanceByFrequency(date, 'triweekly', 0))).toBe('2026-02-21');
  expect(dateKey(advanceByFrequency(date, 'monthly', 0))).toBe('2026-02-28');
  expect(dateKey(advanceByFrequency(date, 'custom', 0))).toBe('2026-02-01');
  expect(dateKey(date)).toBe('2026-01-31');
});

test('snaps to allowed weekdays and advances strictly after the current day', () => {
  const saturday = new Date(2026, 0, 3);

  expect(dateKey(snapToAllowedWeekday(saturday, [1]))).toBe('2026-01-05');
  expect(dateKey(snapToAllowedWeekday(saturday, []))).toBe('2026-01-03');
  expect(dateKey(nextAllowedDay(saturday, [6]))).toBe('2026-01-10');
});
