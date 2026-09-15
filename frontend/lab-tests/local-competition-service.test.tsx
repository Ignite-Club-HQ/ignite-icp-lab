import { describe, expect, test, vi } from 'vitest';
import { Principal } from '@icp-sdk/core/principal';
import { createCompetitionDomainClient } from '../src/lab/localCompetitionService';
import type { _SERVICE } from '../src/lab/bindings/competition_domain/declarations/competition_domain.did.js';

const principal = Principal.fromText('aaaaa-aa');

describe('local competition service', () => {
  test('lists competitions from exported canister state', async () => {
    const exportState = vi.fn(async () => ({
      Ok: {
        schema: 1,
        governor: principal,
        competitions: [
          {
            id: 'competition-1',
            name: 'Winter League',
            season: '2026',
            status: 'active',
            club_id: 'club-1',
            revision: 2n,
          },
        ],
        seasons: [],
        entries: [],
        matches: [],
        tokens: [],
        roles: [],
      },
    }));
    const client = createCompetitionDomainClient({
      export_state: exportState,
      create_competition: vi.fn(),
    } as unknown as _SERVICE);

    await expect(client.listCompetitions()).resolves.toEqual([
      expect.objectContaining({
        id: 'competition-1',
        name: 'Winter League',
        season: '2026',
        status: 'active',
        organizer_club_id: 'club-1',
        source: 'icp',
      }),
    ]);
    expect(exportState).toHaveBeenCalledOnce();
  });

  test('creates competitions through the local canister actor', async () => {
    const createCompetition = vi.fn(async () => ({
      Ok: {
        id: 'competition-2',
        name: 'Cup',
        season: '2026',
        status: 'draft',
        club_id: 'club-1',
        revision: 1n,
      },
    }));
    const client = createCompetitionDomainClient({
      export_state: vi.fn(),
      create_competition: createCompetition,
    } as unknown as _SERVICE);

    await expect(client.createCompetition('club-1', 'Cup', '2026')).resolves.toMatchObject({
      id: 'competition-2',
      name: 'Cup',
      status: 'draft',
    });
    expect(createCompetition).toHaveBeenCalledWith('club-1', 'Cup', '2026');
  });
});
