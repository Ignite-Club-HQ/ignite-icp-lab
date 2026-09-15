import { expect, test, vi } from 'vitest';
import { Principal } from '@icp-sdk/core/principal';
import { createEventsDomainClient } from '../src/lab/localEventsService';
import type { _SERVICE } from '../src/lab/bindings/events_domain/declarations/events_domain.did';

test('events domain client maps scoped canister events into schedule rows', async () => {
  const listEvents = vi.fn(async () => [{
    id: 'event-1',
    title: 'Training night',
    creator: Principal.fromText('2ibo7-dia'),
    team_id: ['team-1'],
    description: 'Synthetic training',
    starts_at_ms: BigInt(Date.UTC(2026, 0, 2, 18, 0, 0)),
    ends_at_ms: BigInt(Date.UTC(2026, 0, 2, 19, 0, 0)),
    revision: 1n,
    club_id: 'club-1',
  }]);
  const client = createEventsDomainClient({ list_events: listEvents } as unknown as _SERVICE);

  await expect(client.listEvents('club-1', 'team-1')).resolves.toEqual([
    expect.objectContaining({
      id: 'event-1',
      title: 'Training night',
      type: 'training',
      event_date: '2026-01-02',
      club_id: 'club-1',
      team_id: 'team-1',
      location_name: 'Local ICP canister',
    }),
  ]);
  expect(listEvents).toHaveBeenCalledWith(['club-1'], ['team-1']);
});
