import { addDays, addMonths } from 'date-fns';

export type Frequency = 'weekly' | 'biweekly' | 'triweekly' | 'monthly' | 'custom';

export interface Pairing {
  round: number;
  home: string;
  away: string;
}

export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function advanceByFrequency(
  date: Date,
  frequency: Frequency,
  customDays: number,
): Date {
  switch (frequency) {
    case 'weekly':
      return addDays(date, 7);
    case 'biweekly':
      return addDays(date, 14);
    case 'triweekly':
      return addDays(date, 21);
    case 'monthly':
      return addMonths(date, 1);
    case 'custom':
      return addDays(date, Math.max(1, customDays));
  }
}

/** Snap forward to the next allowed weekday, including the current date. */
export function snapToAllowedWeekday(date: Date, allowedWeekdays: number[]): Date {
  if (allowedWeekdays.length === 0) return new Date(date);

  const result = new Date(date);
  for (let offset = 0; offset <= 7; offset += 1) {
    if (allowedWeekdays.includes(result.getDay())) return result;
    result.setDate(result.getDate() + 1);
  }
  return new Date(date);
}

/** Return the next allowed weekday strictly after the supplied date. */
export function nextAllowedDay(date: Date, allowedWeekdays: number[]): Date {
  const next = addDays(date, 1);
  return snapToAllowedWeekday(
    next,
    allowedWeekdays.length ? allowedWeekdays : [0, 1, 2, 3, 4, 5, 6],
  );
}

/**
 * Build round-robin pairings with the circle method and alternating home/away
 * assignment. Odd-sized competitions receive a bye and no bye fixture.
 */
export function buildRoundRobinPairings(teamIds: string[]): Pairing[] {
  const teams = [...teamIds];
  if (teams.length < 2) return [];
  if (teams.length % 2 === 1) teams.push('__BYE__');

  const roundCount = teams.length - 1;
  const half = teams.length / 2;
  const pairings: Pairing[] = [];
  let rotation = [...teams];

  for (let round = 0; round < roundCount; round += 1) {
    for (let index = 0; index < half; index += 1) {
      const first = rotation[index];
      const second = rotation[rotation.length - 1 - index];
      if (first === '__BYE__' || second === '__BYE__') continue;

      pairings.push(round % 2 === 0
        ? { round: round + 1, home: first, away: second }
        : { round: round + 1, home: second, away: first });
    }
    rotation = [rotation[0], rotation[rotation.length - 1], ...rotation.slice(1, -1)];
  }

  return pairings;
}
