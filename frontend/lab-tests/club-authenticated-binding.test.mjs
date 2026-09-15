import test from 'node:test';
import assert from 'node:assert/strict';
import { createFixtureClubService } from '../src/lab/clubService.mjs';
import {
  createAuthenticatedClubService,
  createSyntheticAuthenticatedClubFactory,
} from '../src/lab/clubAuthenticatedBinding.mjs';
import { createFixtureIdentityAccessService } from '../src/lab/identityAccessService.mjs';
import { LOCAL_ACTOR_CONFIGS, createLocalActorTransport } from '../src/lab/localActorTransport.mjs';

const OWN_CLUB = 'club-own';
const OTHER_CLUB = 'club-other';

const member = { accountId: 'synthetic-member-account', principalText: 'synthetic-member-principal' };
const outsider = { accountId: 'synthetic-outsider-account', principalText: 'synthetic-outsider-principal' };
const appAdmin = { accountId: 'synthetic-app-admin-account', principalText: 'synthetic-app-admin-principal' };

const identityRecords = [
  {
    accountId: member.accountId,
    principalText: member.principalText,
    roles: [{ role: 'member', clubId: OWN_CLUB }],
  },
  {
    accountId: outsider.accountId,
    principalText: outsider.principalText,
    roles: [],
  },
  {
    accountId: appAdmin.accountId,
    principalText: appAdmin.principalText,
    roles: [{ role: 'app_admin' }],
  },
];

function setup() {
  const service = createFixtureClubService({
    initial: [
      { id: OWN_CLUB, name: 'Own Club', listedOnMarketplace: false, createdBy: 'synthetic-founder', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: OTHER_CLUB, name: 'Other Club', listedOnMarketplace: false, createdBy: 'synthetic-founder', createdAt: '2026-01-02T00:00:00.000Z' },
      { id: 'club-listed', name: 'Listed Club', listedOnMarketplace: true, createdBy: 'synthetic-founder', createdAt: '2026-01-03T00:00:00.000Z' },
    ],
  });
  const identityAccess = createFixtureIdentityAccessService({ identities: identityRecords });
  const factory = createSyntheticAuthenticatedClubFactory({ service, identityAccess });
  return { service, factory };
}

test('authenticated binding resolves membership server-side and preserves wire/domain mapping', async () => {
  const { factory } = setup();
  const bound = createAuthenticatedClubService(factory, member);
  const page = await bound.list(member, { limit: 10 });
  assert.deepEqual(page.items.map(row => row.id).sort(), [OWN_CLUB, 'club-listed'].sort());
  const own = await bound.get(member, OWN_CLUB);
  assert.equal(own.createdBy, 'synthetic-founder');
  assert.equal(own.createdAt, '2026-01-01T00:00:00.000Z');
});

test('forged appAdmin/memberClubIds fields on the caller object cannot unlock other clubs', async () => {
  const { factory } = setup();
  const bound = createAuthenticatedClubService(factory, outsider);
  const forged = { accountId: outsider.accountId, appAdmin: true, memberClubIds: [OWN_CLUB, OTHER_CLUB] };
  await assert.rejects(() => bound.get(forged, OWN_CLUB), /Not authorized/);
  const page = await bound.list(forged, { limit: 10 });
  assert.deepEqual(page.items.map(row => row.id), ['club-listed']);
});

test('an app admin bound actor can read every club regardless of listing', async () => {
  const { factory } = setup();
  const bound = createAuthenticatedClubService(factory, appAdmin);
  const page = await bound.list(appAdmin, { limit: 10 });
  assert.equal(page.items.length, 3);
});

test('a caller object for a different account is rejected before reaching the actor', async () => {
  const { factory } = setup();
  const bound = createAuthenticatedClubService(factory, member);
  await assert.rejects(() => bound.get(outsider, OWN_CLUB), /identity mismatch/);
});

test('the club binding uses the shared local actor transport with its own canister config', async () => {
  const seen = [];
  const wrappedFactory = createSyntheticAuthenticatedClubFactory({
    service: createFixtureClubService(),
    identityAccess: createFixtureIdentityAccessService({ identities: identityRecords }),
    transportFactory: config => {
      seen.push(config.config);
      return createLocalActorTransport(config);
    },
  });
  await wrappedFactory.connect(member);
  assert.deepEqual(seen, [LOCAL_ACTOR_CONFIGS.club]);
  assert.notEqual(LOCAL_ACTOR_CONFIGS.club.canisterId, LOCAL_ACTOR_CONFIGS.competition.canisterId);
  assert.notEqual(LOCAL_ACTOR_CONFIGS.club.canisterId, LOCAL_ACTOR_CONFIGS.identity.canisterId);
  assert.notEqual(LOCAL_ACTOR_CONFIGS.club.canisterId, LOCAL_ACTOR_CONFIGS.team.canisterId);
});

test('connecting without a resolvable identity is rejected', async () => {
  const { factory } = setup();
  await assert.rejects(() => factory.connect({ accountId: '', principalText: '' }),
    /Authenticated principal and account required/);
  await assert.rejects(() => factory.connect({ accountId: 'ghost', principalText: 'ghost-principal' }),
    /Anonymous or unknown principal/);
});
