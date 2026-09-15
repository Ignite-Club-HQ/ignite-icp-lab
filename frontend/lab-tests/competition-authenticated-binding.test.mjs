import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEMO_MEMBER_CLUB_ID,
  DEMO_ORGANIZER_CLUB_ID,
  createFixtureCompetitionService,
} from '../src/lab/competitionService.mjs';
import {
  createAuthenticatedCompetitionService,
  createSyntheticAuthenticatedCompetitionFactory,
} from '../src/lab/competitionAuthenticatedBinding.mjs';
import { createFixtureIdentityAccessService } from '../src/lab/identityAccessService.mjs';

const admin = {
  accountId: 'synthetic-admin-account',
  principalText: 'synthetic-admin-principal',
  adminClubIds: [DEMO_ORGANIZER_CLUB_ID],
  memberClubIds: [DEMO_ORGANIZER_CLUB_ID],
};
const member = {
  accountId: 'synthetic-member-account',
  principalText: 'synthetic-member-principal',
  memberClubIds: [DEMO_ORGANIZER_CLUB_ID],
};
const appAdmin = {
  accountId: 'synthetic-app-admin-account',
  principalText: 'synthetic-app-admin-principal',
};

const identityRecords = [
  {
    accountId: admin.accountId,
    principalText: admin.principalText,
    roles: [{ role: 'club_admin', clubId: DEMO_ORGANIZER_CLUB_ID }],
  },
  {
    accountId: member.accountId,
    principalText: member.principalText,
    roles: [{ role: 'member', clubId: DEMO_ORGANIZER_CLUB_ID }],
  },
  {
    accountId: appAdmin.accountId,
    principalText: appAdmin.principalText,
    roles: [{ role: 'app_admin' }],
  },
];

function setup() {
  const service = createFixtureCompetitionService({
    initial: [{
      id: 'private-competition',
      name: 'Private Synthetic Cup',
      organizerClubId: DEMO_ORGANIZER_CLUB_ID,
      status: 'active',
      visibility: 'private',
      createdAt: '2026-01-01T00:00:00.000Z',
    }],
  });
  const identityAccess = createFixtureIdentityAccessService({ identities: identityRecords });
  const factory = createSyntheticAuthenticatedCompetitionFactory({ service, identityAccess });
  return { service, factory };
}

test('authenticated binding resolves roles server-side and preserves wire/domain mapping', async () => {
  const { factory } = setup();
  const bound = createAuthenticatedCompetitionService(factory, admin);
  const page = await bound.list(admin, { limit: 10 });
  assert.equal(page.items[0].organizerClubId, DEMO_ORGANIZER_CLUB_ID);
  assert.equal(page.items[0].createdAt, '2026-01-01T00:00:00.000Z');
  const created = await bound.create(admin, {
    name: 'Bound Synthetic Cup',
    organizerClubId: DEMO_ORGANIZER_CLUB_ID,
    description: '',
    sport: 'football',
  }, 'bound-create-1');
  assert.equal(created.createdBy, admin.accountId);
  assert.equal(created.description, null);
});

test('forged frontend roles do not elevate a member bound to its principal', async () => {
  const { factory } = setup();
  const bound = createAuthenticatedCompetitionService(factory, member);
  const forged = { ...member, appAdmin: true, adminClubIds: [DEMO_ORGANIZER_CLUB_ID] };
  await assert.rejects(
    bound.create(forged, {
      name: 'Should Fail',
      organizerClubId: DEMO_ORGANIZER_CLUB_ID,
    }, 'forged-create'),
    /Not authorized/,
  );
});

test('identity mismatch, anonymous use and unknown principals fail closed', async () => {
  const { factory } = setup();
  const bound = createAuthenticatedCompetitionService(factory, admin);
  await assert.rejects(bound.list(null), /identity mismatch/);
  await assert.rejects(bound.list({ accountId: member.accountId }), /identity mismatch/);
  await assert.rejects(factory.connect({
    principalText: admin.principalText,
    accountId: member.accountId,
  }), /not registered/);
  await assert.rejects(factory.connect({
    principalText: 'unknown-principal',
    accountId: admin.accountId,
  }), /unknown|not registered/);
});

test('competition binding requires provider-neutral identity access rather than inline role state', async () => {
  const { service } = setup();
  assert.throws(() => createSyntheticAuthenticatedCompetitionFactory({
    service,
    identities: { [admin.principalText]: admin },
  }), /identity access/);
  const identityAccess = createFixtureIdentityAccessService({ identities: identityRecords });
  const factory = createSyntheticAuthenticatedCompetitionFactory({ service, identityAccess });
  const actor = await factory.connect({
    principalText: admin.principalText,
    accountId: admin.accountId,
    appAdmin: false,
    adminClubIds: [],
  });
  const created = await actor.create_competition({
    request_id: 'identity-wired-create',
    name: 'Identity Wired Cup',
    description: [],
    organizer_club_id: DEMO_ORGANIZER_CLUB_ID,
    sport: [],
    season: [],
    status: 'draft',
    visibility: 'private',
  });
  assert.ok('Ok' in created);
});

test('authenticated actor exposes explicit Candid-shaped results and retry-safe updates', async () => {
  const { factory } = setup();
  const actor = await factory.connect(admin);
  const created = await actor.create_competition({
    request_id: 'actor-create',
    name: 'Actor Cup',
    description: [],
    organizer_club_id: DEMO_ORGANIZER_CLUB_ID,
    sport: ['football'],
    season: [],
    status: 'draft',
    visibility: 'private',
  });
  assert.ok('Ok' in created);
  const id = created.Ok.id;
  const updated = await actor.update_competition({
    competition_id: id,
    request_id: 'actor-update',
    expected_revision: created.Ok.revision,
    patch: {
      name: ['Actor Cup Updated'],
      description: [],
      sport: [],
      season: [],
      status: [],
      visibility: [],
    },
  });
  assert.equal(updated.Ok.name, 'Actor Cup Updated');
  const replay = await actor.update_competition({
    competition_id: id,
    request_id: 'actor-update',
    expected_revision: created.Ok.revision,
    patch: {
      name: ['Actor Cup Updated'],
      description: [],
      sport: [],
      season: [],
      status: [],
      visibility: [],
    },
  });
  assert.deepEqual(replay, updated);
});

test('durability actor methods are restricted to an app-admin caller and preserve domain snapshots', async () => {
  const { factory } = setup();
  const adminBound = createAuthenticatedCompetitionService(factory, appAdmin);
  const created = await adminBound.create(appAdmin, {
    name: 'Snapshot Cup',
    organizerClubId: DEMO_ORGANIZER_CLUB_ID,
    status: 'active',
    visibility: 'private',
  }, 'snapshot-create');
  const snapshot = await adminBound.exportSnapshot(appAdmin);
  assert.equal(snapshot.schemaVersion, 1);
  assert.ok(snapshot.competitions.some(row => row.id === created.id));

  const clubAdminBound = createAuthenticatedCompetitionService(factory, admin);
  await assert.rejects(clubAdminBound.exportSnapshot(admin), /app admin required/);
  await assert.rejects(clubAdminBound.importSnapshot(admin, snapshot), /app admin required/);
  await assert.rejects(clubAdminBound.reconcileSnapshot(admin, snapshot), /app admin required/);

  const reconciliation = await adminBound.reconcileSnapshot(appAdmin, snapshot);
  assert.deepEqual(reconciliation, {
    equal: true,
    missingIds: [],
    unexpectedIds: [],
    changedIds: [],
    requestLedgerEqual: true,
    sequenceEqual: true,
  });

  const { factory: freshFactory } = setup();
  const freshBound = createAuthenticatedCompetitionService(freshFactory, appAdmin);
  await freshBound.importSnapshot(appAdmin, snapshot);
  const restored = await freshBound.get(appAdmin, created.id);
  assert.equal(restored.name, 'Snapshot Cup');
  assert.equal(restored.revision, created.revision);
});

test('forged app-admin fields on the caller object cannot unlock durability operations', async () => {
  const { factory } = setup();
  const bound = createAuthenticatedCompetitionService(factory, member);
  const forged = { ...member, appAdmin: true, adminClubIds: [DEMO_ORGANIZER_CLUB_ID] };
  await assert.rejects(bound.exportSnapshot(forged), /app admin required/);
});

test('durability actor rejects a snapshot from a foreign canister configuration', async () => {
  const { factory } = setup();
  const actor = await factory.connect(appAdmin);
  const exported = await actor.export_snapshot();
  assert.ok('Ok' in exported);
  const tampered = {
    ...exported.Ok,
    competitions: [exported.Ok.competitions[0], exported.Ok.competitions[0]],
  };
  const rejected = await actor.import_snapshot({ snapshot: tampered });
  assert.ok('Err' in rejected);
});
