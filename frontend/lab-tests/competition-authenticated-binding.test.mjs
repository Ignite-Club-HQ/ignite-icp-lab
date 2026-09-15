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
  const factory = createSyntheticAuthenticatedCompetitionFactory({
    service,
    identities: {
      [admin.principalText]: admin,
      [member.principalText]: member,
    },
  });
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
  }), /not registered/);
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
