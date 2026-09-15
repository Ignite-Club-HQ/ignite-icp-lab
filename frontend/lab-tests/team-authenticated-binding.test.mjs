import test from 'node:test';
import assert from 'node:assert/strict';
import { createFixtureTeamService } from '../src/lab/teamService.mjs';
import {
  createAuthenticatedTeamService,
  createSyntheticAuthenticatedTeamFactory,
} from '../src/lab/teamAuthenticatedBinding.mjs';
import { createFixtureIdentityAccessService } from '../src/lab/identityAccessService.mjs';
import { LOCAL_ACTOR_CONFIGS, createLocalActorTransport } from '../src/lab/localActorTransport.mjs';

const CLUB_A = 'club-a';
const CLUB_B = 'club-b';

const outsiderA = { accountId: 'synthetic-outsider-a-account', principalText: 'synthetic-outsider-a-principal' };
const outsiderB = { accountId: 'synthetic-outsider-b-account', principalText: 'synthetic-outsider-b-principal' };

const identityRecords = [
  { accountId: outsiderA.accountId, principalText: outsiderA.principalText, roles: [] },
  { accountId: outsiderB.accountId, principalText: outsiderB.principalText, roles: [] },
];

function setup() {
  const service = createFixtureTeamService({
    initial: [
      { id: 'team-a1', clubId: CLUB_A, name: 'A First', lifecycleStatus: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'team-b1', clubId: CLUB_B, name: 'B First', lifecycleStatus: 'archived', createdAt: '2026-01-02T00:00:00.000Z' },
    ],
  });
  const identityAccess = createFixtureIdentityAccessService({ identities: identityRecords });
  const factory = createSyntheticAuthenticatedTeamFactory({ service, identityAccess });
  return { service, factory };
}

test('any authenticated bound actor can read a team from a club they have no role in', async () => {
  const { factory } = setup();
  const bound = createAuthenticatedTeamService(factory, outsiderA);
  const team = await bound.get(outsiderA, 'team-b1');
  assert.equal(team.clubId, CLUB_B);
  assert.equal(team.lifecycleStatus, 'archived');
});

test('forged clubId/role fields on the caller object have no effect since teams do not gate on membership', async () => {
  const { factory } = setup();
  const bound = createAuthenticatedTeamService(factory, outsiderB);
  const forged = { accountId: outsiderB.accountId, appAdmin: true, memberClubIds: [] };
  const page = await bound.list(forged, { limit: 10 });
  assert.deepEqual(page.items.map(row => row.id).sort(), ['team-a1', 'team-b1']);
});

test('a caller object for a different account is rejected before reaching the actor', async () => {
  const { factory } = setup();
  const bound = createAuthenticatedTeamService(factory, outsiderA);
  await assert.rejects(() => bound.get(outsiderB, 'team-a1'), /identity mismatch/);
});

test('the team binding uses the shared local actor transport with its own canister config', async () => {
  const seen = [];
  const wrappedFactory = createSyntheticAuthenticatedTeamFactory({
    service: createFixtureTeamService(),
    identityAccess: createFixtureIdentityAccessService({ identities: identityRecords }),
    transportFactory: config => {
      seen.push(config.config);
      return createLocalActorTransport(config);
    },
  });
  await wrappedFactory.connect(outsiderA);
  assert.deepEqual(seen, [LOCAL_ACTOR_CONFIGS.team]);
  assert.notEqual(LOCAL_ACTOR_CONFIGS.team.canisterId, LOCAL_ACTOR_CONFIGS.club.canisterId);
  assert.notEqual(LOCAL_ACTOR_CONFIGS.team.canisterId, LOCAL_ACTOR_CONFIGS.competition.canisterId);
  assert.notEqual(LOCAL_ACTOR_CONFIGS.team.canisterId, LOCAL_ACTOR_CONFIGS.identity.canisterId);
});

test('connecting without a resolvable identity is rejected', async () => {
  const { factory } = setup();
  await assert.rejects(() => factory.connect({ accountId: '', principalText: '' }),
    /Authenticated principal and account required/);
  await assert.rejects(() => factory.connect({ accountId: 'ghost', principalText: 'ghost-principal' }),
    /Anonymous or unknown principal/);
});
