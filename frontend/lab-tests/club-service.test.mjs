import test from 'node:test';
import assert from 'node:assert/strict';
import { createFixtureClubService, selectClubService } from '../src/lab/clubService.mjs';

const OWN_CLUB = 'club-own';
const OTHER_CLUB = 'club-other';

const member = { accountId: 'synthetic-member', memberClubIds: [OWN_CLUB] };
const appAdmin = { accountId: 'synthetic-app-admin', appAdmin: true };
const outsider = { accountId: 'synthetic-outsider', memberClubIds: [] };

function seed() {
  return createFixtureClubService({
    initial: [
      { id: OWN_CLUB, name: 'Own Club', listedOnMarketplace: false, createdAt: '2026-01-02T00:00:00.000Z' },
      { id: OTHER_CLUB, name: 'Other Club', listedOnMarketplace: false, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'club-listed', name: 'Listed Club', listedOnMarketplace: true, createdAt: '2026-01-03T00:00:00.000Z' },
    ],
  });
}

test('anonymous callers cannot list or read any club, including listed ones', async () => {
  const service = seed();
  const page = await service.list(null);
  assert.deepEqual(page.items, []);
  await assert.rejects(() => service.get(null, 'club-listed'), /Not authorized/);
});

test('a member can read their own unlisted club but not another unlisted club', async () => {
  const service = seed();
  const own = await service.get(member, OWN_CLUB);
  assert.equal(own.id, OWN_CLUB);
  await assert.rejects(() => service.get(member, OTHER_CLUB), /Not authorized/);
});

test('an authenticated non-member can read a marketplace-listed club (discovery)', async () => {
  const service = seed();
  const listed = await service.get(outsider, 'club-listed');
  assert.equal(listed.id, 'club-listed');
});

test('an authenticated non-member cannot read an unlisted club they do not belong to', async () => {
  const service = seed();
  await assert.rejects(() => service.get(outsider, OWN_CLUB), /Not authorized/);
});

test('an app admin can read any club regardless of listing or membership', async () => {
  const service = seed();
  const own = await service.get(appAdmin, OWN_CLUB);
  const other = await service.get(appAdmin, OTHER_CLUB);
  assert.equal(own.id, OWN_CLUB);
  assert.equal(other.id, OTHER_CLUB);
});

test('list only surfaces clubs visible to the caller, in deterministic order', async () => {
  const service = seed();
  const memberPage = await service.list(member);
  assert.deepEqual(memberPage.items.map(row => row.id), ['club-listed', OWN_CLUB]);

  const adminPage = await service.list(appAdmin);
  assert.deepEqual(adminPage.items.map(row => row.id), ['club-listed', OWN_CLUB, OTHER_CLUB]);
});

test('list is bounded and paginates with a stable cursor', async () => {
  const service = seed();
  const first = await service.list(appAdmin, { limit: 2 });
  assert.equal(first.items.length, 2);
  assert.ok(first.nextCursor);
  const second = await service.list(appAdmin, { limit: 2, cursor: first.nextCursor });
  assert.equal(second.items.length, 1);
  assert.equal(second.nextCursor, null);
});

test('an invalid cursor is rejected rather than silently ignored', async () => {
  const service = seed();
  await assert.rejects(() => service.list(appAdmin, { cursor: 'after:does-not-exist' }), /Invalid|not valid/);
});

test('list limit must be between 1 and 50', async () => {
  const service = seed();
  await assert.rejects(() => service.list(appAdmin, { limit: 0 }), /Limit must be/);
  await assert.rejects(() => service.list(appAdmin, { limit: 51 }), /Limit must be/);
});

test('getting a nonexistent club is indistinguishable from an unauthorized read', async () => {
  const service = seed();
  await assert.rejects(() => service.get(member, 'club-does-not-exist'), /Not authorized/);
});

test('selectClubService is fail-closed with no fallback', () => {
  const fixture = seed();
  assert.equal(selectClubService('fixture', { fixture }), fixture);
  assert.throws(() => selectClubService('icp', { fixture }), /No fallback is permitted/);
  assert.throws(() => selectClubService('bogus', { fixture }), /No fallback is permitted/);
});
