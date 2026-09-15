import test from 'node:test';
import assert from 'node:assert/strict';
import { createFixtureTeamService, selectTeamService } from '../src/lab/teamService.mjs';

const CLUB_A = 'club-a';
const CLUB_B = 'club-b';

const outsider = { accountId: 'synthetic-outsider' };
const anotherOutsider = { accountId: 'synthetic-another-outsider' };

function seed() {
  return createFixtureTeamService({
    initial: [
      { id: 'team-a1', clubId: CLUB_A, name: 'A First', lifecycleStatus: 'active', createdAt: '2026-01-02T00:00:00.000Z' },
      { id: 'team-a2', clubId: CLUB_A, name: 'A Second', lifecycleStatus: 'draft', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'team-b1', clubId: CLUB_B, name: 'B First', lifecycleStatus: 'archived', createdAt: '2026-01-03T00:00:00.000Z' },
    ],
  });
}

test('anonymous callers cannot list or read any team', async () => {
  const service = seed();
  const page = await service.list(null);
  assert.deepEqual(page.items, []);
  await assert.rejects(() => service.get(null, 'team-a1'), /Not authorized/);
});

test('any authenticated caller can read any team regardless of club membership', async () => {
  const service = seed();
  const teamFromOtherClub = await service.get(outsider, 'team-b1');
  assert.equal(teamFromOtherClub.id, 'team-b1');
  const draftTeam = await service.get(anotherOutsider, 'team-a2');
  assert.equal(draftTeam.lifecycleStatus, 'draft');
});

test('list surfaces all teams for an authenticated caller in deterministic order', async () => {
  const service = seed();
  const page = await service.list(outsider);
  assert.deepEqual(page.items.map(row => row.id), ['team-b1', 'team-a1', 'team-a2']);
});

test('list can be filtered by clubId', async () => {
  const service = seed();
  const page = await service.list(outsider, { clubId: CLUB_A });
  assert.deepEqual(page.items.map(row => row.id).sort(), ['team-a1', 'team-a2']);
});

test('list is bounded and paginates with a stable cursor', async () => {
  const service = seed();
  const first = await service.list(outsider, { limit: 2 });
  assert.equal(first.items.length, 2);
  assert.ok(first.nextCursor);
  const second = await service.list(outsider, { limit: 2, cursor: first.nextCursor });
  assert.equal(second.items.length, 1);
  assert.equal(second.nextCursor, null);
});

test('an invalid cursor is rejected rather than silently ignored', async () => {
  const service = seed();
  await assert.rejects(() => service.list(outsider, { cursor: 'after:does-not-exist' }), /Invalid|not valid/);
});

test('list limit must be between 1 and 50', async () => {
  const service = seed();
  await assert.rejects(() => service.list(outsider, { limit: 0 }), /Limit must be/);
  await assert.rejects(() => service.list(outsider, { limit: 51 }), /Limit must be/);
});

test('getting a nonexistent team fails the same way as an unauthorized read', async () => {
  const service = seed();
  await assert.rejects(() => service.get(outsider, 'team-does-not-exist'), /Not authorized/);
});

test('selectTeamService is fail-closed with no fallback', () => {
  const fixture = seed();
  assert.equal(selectTeamService('fixture', { fixture }), fixture);
  assert.throws(() => selectTeamService('icp', { fixture }), /No fallback is permitted/);
  assert.throws(() => selectTeamService('bogus', { fixture }), /No fallback is permitted/);
});
