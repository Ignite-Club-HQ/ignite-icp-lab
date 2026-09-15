import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEMO_MEMBER_CLUB_ID,
  DEMO_ORGANIZER_CLUB_ID,
  createFixtureCompetitionService,
  selectCompetitionService,
} from '../src/lab/competitionService.mjs';

const admin = {
  accountId: 'synthetic-admin-account',
  adminClubIds: [DEMO_ORGANIZER_CLUB_ID],
  memberClubIds: [DEMO_ORGANIZER_CLUB_ID],
};
const member = {
  accountId: 'synthetic-member-account',
  memberClubIds: [DEMO_ORGANIZER_CLUB_ID],
};
const outsider = {
  accountId: 'synthetic-outsider-account',
  memberClubIds: [DEMO_MEMBER_CLUB_ID],
};

function seed() {
  return createFixtureCompetitionService({
    initial: [
      {
        id: 'public-active',
        name: 'Public Active',
        organizerClubId: DEMO_ORGANIZER_CLUB_ID,
        createdAt: '2026-01-03T00:00:00.000Z',
        status: 'active',
        visibility: 'public',
      },
      {
        id: 'private-active',
        name: 'Private Active',
        organizerClubId: DEMO_ORGANIZER_CLUB_ID,
        createdAt: '2026-01-02T00:00:00.000Z',
        status: 'active',
        visibility: 'private',
      },
      {
        id: 'draft-private',
        name: 'Draft Private',
        organizerClubId: DEMO_ORGANIZER_CLUB_ID,
        createdAt: '2026-01-01T00:00:00.000Z',
        status: 'draft',
        visibility: 'private',
      },
      {
        id: 'archived-public',
        name: 'Archived Public',
        organizerClubId: DEMO_ORGANIZER_CLUB_ID,
        createdAt: '2025-12-31T00:00:00.000Z',
        status: 'archived',
        visibility: 'public',
      },
    ],
  });
}

test('direct reads enforce anonymous, member, admin and outsider visibility', async () => {
  const service = seed();
  assert.equal((await service.get(null, 'public-active')).name, 'Public Active');
  await assert.rejects(service.get(null, 'private-active'), /Not authorized/);
  assert.equal((await service.get(member, 'private-active')).name, 'Private Active');
  assert.equal((await service.get(admin, 'draft-private')).name, 'Draft Private');
  assert.equal((await service.get(admin, 'archived-public')).name, 'Archived Public');
  await assert.rejects(service.get(outsider, 'private-active'), /Not authorized/);
  await assert.rejects(service.get(outsider, 'draft-private'), /Not authorized/);
  await assert.rejects(service.get(member, 'archived-public'), /Not authorized/);
  await assert.rejects(service.get(admin, 'missing'), /Competition not found/);
});

test('list is deterministic, bounded and cursor-paginated without leaking drafts', async () => {
  const service = seed();
  const first = await service.list(member, { limit: 1 });
  assert.deepEqual(first.items.map(row => row.id), ['public-active']);
  assert.ok(first.nextCursor);
  const second = await service.list(member, { cursor: first.nextCursor, limit: 10 });
  assert.deepEqual(second.items.map(row => row.id), ['private-active']);
  assert.deepEqual((await service.list(null, { limit: 50 })).items.map(row => row.id), ['public-active']);
  const memberPage = await service.list(member, { limit: 50 });
  assert.deepEqual(memberPage.items.map(row => row.id), ['public-active', 'private-active']);
  await assert.rejects(service.list(member, { limit: 51 }), /between 1 and 50/);
  await assert.rejects(service.list(member, { cursor: 'bad' }), /Invalid competition cursor/);
});

test('admin create is scoped, bounded and idempotent', async () => {
  const service = createFixtureCompetitionService();
  const draft = {
    name: 'Synthetic Cup',
    organizerClubId: DEMO_ORGANIZER_CLUB_ID,
    sport: 'football',
    status: 'draft',
    visibility: 'private',
  };
  const created = await service.create(admin, draft, 'create-1');
  const replay = await service.create(admin, draft, 'create-1');
  assert.deepEqual(replay, created);
  assert.equal((await service.list(admin, { limit: 50 })).items.length, 1);
  await assert.rejects(service.create(member, draft, 'create-member'), /Not authorized/);
  await assert.rejects(service.create(admin, { ...draft, name: 'x'.repeat(161) }, 'create-long'), /1–160/);
  await assert.rejects(service.create(admin, { ...draft, name: 'Other', organizerClubId: DEMO_MEMBER_CLUB_ID }, 'create-cross-club'), /Not authorized/);
  await assert.rejects(service.create(admin, { ...draft, name: 'Different' }, 'create-1'), /different input/);
});

test('update enforces revision fencing and retry idempotency', async () => {
  const service = seed();
  const before = await service.get(admin, 'private-active');
  const updated = await service.update(admin, before.id, { name: 'Renamed' }, before.revision, 'update-1');
  assert.equal(updated.name, 'Renamed');
  assert.equal(updated.revision, before.revision + 1);
  assert.deepEqual(await service.update(admin, before.id, { name: 'Renamed' }, before.revision, 'update-1'), updated);
  await assert.rejects(service.update(admin, before.id, { name: 'Again' }, before.revision, 'update-stale'), /Stale/);
  await assert.rejects(service.update(member, before.id, { name: 'Nope' }, updated.revision, 'update-member'), /Not authorized/);
  await assert.rejects(service.update(admin, before.id, { name: 'Different' }, before.revision, 'update-1'), /different input/);
});

test('provider selection is explicit and never falls back to Supabase', () => {
  const fixture = createFixtureCompetitionService();
  assert.equal(selectCompetitionService('fixture', { fixture }), fixture);
  assert.equal(selectCompetitionService('icp', { icp: fixture }), fixture);
  assert.throws(() => selectCompetitionService('icp'), /No fallback/);
  assert.throws(() => selectCompetitionService('supabase', { fixture }), /No fallback/);
});

test('snapshot export/import preserves populated state, retries and future IDs', async () => {
  const source = seed();
  const created = await source.create(admin, {
    name: 'Durable Cup',
    organizerClubId: DEMO_ORGANIZER_CLUB_ID,
    status: 'active',
    visibility: 'private',
  }, 'durable-create');
  const updated = await source.update(admin, created.id, { name: 'Durable Cup Updated' }, created.revision, 'durable-update');
  const snapshot = await source.exportSnapshot();
  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.competitions.length, 5);
  assert.equal(snapshot.requests.length, 2);

  const restored = createFixtureCompetitionService();
  await restored.importSnapshot(snapshot);
  assert.deepEqual(await restored.reconcileSnapshot(snapshot), {
    equal: true,
    missingIds: [],
    unexpectedIds: [],
    changedIds: [],
    requestLedgerEqual: true,
    sequenceEqual: true,
  });
  assert.deepEqual(await restored.get(admin, updated.id), updated);
  assert.deepEqual(
    await restored.update(admin, created.id, { name: 'Durable Cup Updated' }, created.revision, 'durable-update'),
    updated,
  );
  const next = await restored.create(admin, {
    name: 'After Restore',
    organizerClubId: DEMO_ORGANIZER_CLUB_ID,
  }, 'after-restore');
  assert.notEqual(next.id, created.id);
});

test('snapshot reconciliation reports drift and invalid import is atomic', async () => {
  const service = seed();
  const snapshot = await service.exportSnapshot();
  const drifted = structuredClone(snapshot);
  drifted.competitions[0].name = 'Tampered';
  drifted.competitions.push({
    ...drifted.competitions[0],
    id: 'unexpected',
    name: 'Unexpected',
  });
  const report = await service.reconcileSnapshot(drifted);
  assert.equal(report.equal, false);
  assert.deepEqual(report.changedIds, [snapshot.competitions[0].id]);
  assert.deepEqual(report.unexpectedIds, []);
  assert.deepEqual(report.missingIds, ['unexpected']);

  await assert.rejects(service.importSnapshot({
    ...snapshot,
    competitions: [snapshot.competitions[0], snapshot.competitions[0]],
  }), /duplicate competition IDs/);
  assert.deepEqual(await service.reconcileSnapshot(snapshot), {
    equal: true,
    missingIds: [],
    unexpectedIds: [],
    changedIds: [],
    requestLedgerEqual: true,
    sequenceEqual: true,
  });
});

test('snapshot bounds and schema validation fail closed', async () => {
  const service = seed();
  const snapshot = await service.exportSnapshot();
  await assert.rejects(service.importSnapshot({ ...snapshot, schemaVersion: 2 }), /Unsupported/);
  await assert.rejects(service.importSnapshot({
    ...snapshot,
    requests: Array.from({ length: 2001 }, (_, index) => ({
      key: `request-${index}`,
      fingerprint: 'fingerprint',
      result: snapshot.competitions[0],
    })),
  }), /request limit/);
});
