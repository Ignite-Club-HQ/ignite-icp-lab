import { describe, expect, it } from 'vitest';
import {
  filterCompetitionFixtures,
  groupFixturesByRound,
  summarizeFixtureRounds,
} from '../src/features/competitions/fixtures/fixtureListModel';

function fixture(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    competition_id: 'competition-1',
    division_id: 'division-a',
    round_number: 1,
    home_team_id: 'team-home',
    away_team_id: 'team-away',
    home: { id: 'team-home', name: 'Riverside' },
    away: { id: 'team-away', name: 'Hilltown' },
    ...overrides,
  };
}

describe('ported fixture list use cases', () => {
  it('summarizes scheduled rounds and keeps the maximum round available to an injected action', () => {
    const matches = [
      fixture('round-two', { round_number: 2 }),
      fixture('round-one', { round_number: 1 }),
    ];

    expect(summarizeFixtureRounds(matches)).toEqual({
      roundNumbers: [2, 1],
      totalRounds: 2,
      maximumRound: 2,
    });
    expect(groupFixturesByRound(matches).map((group) => [group.key, group.label]))
      .toEqual([
        ['r2', 'Round 2'],
        ['r1', 'Round 1'],
      ]);
  });

  it('distinguishes a filter with no matches from a genuinely empty competition', () => {
    const matches = [fixture('match-1')];
    const noMatchFilter = filterCompetitionFixtures(
      matches,
      { divisionId: 'division-a', teamId: 'missing-team', clubId: '_all' },
      new Map(),
    );

    expect(noMatchFilter).toEqual([]);
    expect(summarizeFixtureRounds(matches).totalRounds).toBe(1);
    expect(summarizeFixtureRounds([])).toEqual({
      roundNumbers: [],
      totalRounds: 0,
      maximumRound: 0,
    });
  });

  it('keeps external team fixtures filterable through their linked club', () => {
    const matches = [fixture('external-match', {
      home_team_id: null,
      away_team_id: null,
      home: null,
      away: null,
      external_home_team_id: 'external-home',
      external_away_team_id: 'external-away',
    })];
    const clubs = new Map([
      ['external-home', { clubId: 'club-riverside', clubName: 'Riverside FC' }],
    ]);

    expect(filterCompetitionFixtures(
      matches,
      { divisionId: '_all', teamId: '_all', clubId: 'club-riverside' },
      clubs,
    ).map((match) => match.id)).toEqual(['external-match']);
  });
});
