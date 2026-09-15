import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createFixtureIdentityAccessService,
  selectIdentityAccessService,
} from '../src/lab/identityAccessService.mjs';

const CLUB = 'synthetic-club';
const OTHER_CLUB = 'other-club';
const TEAM = 'synthetic-team';

const identities = [
  {
    accountId: 'app-admin-account',
    principalText: 'principal-app-admin',
    displayName: 'App Admin',
    profileVisibility: 'private',
    roles: [{ role: 'app_admin' }],
  },
  {
    accountId: 'club-admin-account',
    principalText: 'principal-club-admin',
    displayName: 'Club Admin',
    roles: [{ role: 'club_admin', clubId: CLUB }],
  },
  {
    accountId: 'member-account',
    principalText: 'principal-member',
    displayName: 'Member',
    roles: [{ role: 'member', clubId: CLUB }],
  },
  {
    accountId: 'team-player-account',
    principalText: 'principal-team-player',
    displayName: 'Team Player',
    roles: [{ role: 'player', teamId: TEAM }],
  },
  {
    accountId: 'outsider-account',
    principalText: 'principal-outsider',
    displayName: 'Outsider',
    profileVisibility: 'private',
    roles: [{ role: 'member', clubId: OTHER_CLUB }],
  },
  {
    accountId: 'excluded-admin-account',
    principalText: 'principal-excluded-admin',
    displayName: 'Excluded Admin',
    roles: [{ role: 'club_admin', clubId: CLUB }],
  },
  {
    accountId: 'parent-account',
    principalText: 'principal-parent',
    displayName: 'Parent',
    roles: [],
  },
  {
    accountId: 'guardian-account',
    principalText: 'principal-guardian',
    displayName: 'Guardian',
    roles: [],
  },
];

function service() {
  return createFixtureIdentityAccessService({
    identities,
    teamClubs: { [TEAM]: CLUB },
    children: [
      {
        childId: 'child-1',
        clubId: CLUB,
        parentAccountId: 'parent-account',
        guardianAccountIds: ['guardian-account'],
      },
    ],
    exclusions: [{ accountId: 'excluded-admin-account', clubId: CLUB }],
  });
}

test('resolves account IDs from principals and rejects unknown or anonymous callers', async () => {
  const access = service();
  assert.deepEqual(await access.resolveAccount('principal-member'), {
    accountId: 'member-account',
    principalText: 'principal-member',
  });
  await assert.rejects(access.resolveAccount(''), /Anonymous or unknown/);
  await assert.rejects(access.resolveAccount('unknown'), /Anonymous or unknown/);
});

test('authorization projection is server-owned and exposes only derived club scopes', async () => {
  const access = service();
  assert.deepEqual(await access.resolveAuthorization('principal-club-admin'), {
    accountId: 'club-admin-account',
    principalText: 'principal-club-admin',
    appAdmin: false,
    adminClubIds: [CLUB],
    memberClubIds: [CLUB],
  });
  const excluded = await access.resolveAuthorization('principal-excluded-admin');
  assert.deepEqual(excluded.adminClubIds, [CLUB]);
  assert.deepEqual(excluded.memberClubIds, []);
  const appAdmin = await access.resolveAuthorization('principal-app-admin');
  assert.equal(appAdmin.appAdmin, true);
});

test('admin, member, team, parent and guardian branches are explicit', async () => {
  const access = service();
  assert.equal((await access.getClubAccess('principal-app-admin', CLUB)).isAdmin, true);
  assert.equal((await access.getClubAccess('principal-club-admin', CLUB)).isClubAdmin, true);
  assert.equal((await access.getClubAccess('principal-member', CLUB)).isMember, true);
  assert.equal((await access.getClubAccess('principal-team-player', CLUB)).teamRole, true);
  assert.equal((await access.getClubAccess('principal-parent', CLUB)).parentOfChild, true);
  assert.equal((await access.getClubAccess('principal-guardian', CLUB)).guardianOfChild, true);
  assert.equal((await access.getClubAccess('principal-outsider', CLUB)).isMember, false);
});

test('exclusion denies membership but does not erase independent admin authority', async () => {
  const decision = await service().getClubAccess('principal-excluded-admin', CLUB);
  assert.equal(decision.excluded, true);
  assert.equal(decision.isMember, false);
  assert.equal(decision.isAdmin, true);
  assert.equal(decision.isClubAdmin, true);
});

test('child access is limited to parent or guardian links', async () => {
  const access = service();
  assert.equal(await access.canAccessChild('principal-parent', 'child-1'), true);
  assert.equal(await access.canAccessChild('principal-guardian', 'child-1'), true);
  assert.equal(await access.canAccessChild('principal-member', 'child-1'), false);
  await assert.rejects(access.canAccessChild('principal-member', 'missing-child'), /Child not found/);
  assert.equal(
    await service().getClubAccess('principal-parent', OTHER_CLUB).then(decision => decision.parentOfChild),
    false,
  );
});

test('profile visibility protects private profiles and permits self access', async () => {
  const access = service();
  assert.equal((await access.getProfile('principal-member', 'member-account')).displayName, 'Member');
  await assert.rejects(access.getProfile('principal-member', 'outsider-account'), /Not authorized/);
  assert.equal((await access.getProfile('principal-outsider', 'outsider-account')).displayName, 'Outsider');
  await assert.rejects(access.getProfile('principal-member', 'app-admin-account'), /Not authorized/);
});

test('provider selection is explicit and never falls back', () => {
  const fixture = service();
  assert.equal(selectIdentityAccessService('fixture', { fixture }), fixture);
  assert.equal(selectIdentityAccessService('icp', { icp: fixture }), fixture);
  assert.throws(() => selectIdentityAccessService('icp'), /No fallback/);
  assert.throws(() => selectIdentityAccessService('supabase', { fixture }), /No fallback/);
});

test('identity fixture validation rejects duplicate identities and invalid profile visibility', () => {
  assert.throws(() => createFixtureIdentityAccessService({
    identities: [
      { accountId: 'same', principalText: 'p1' },
      { accountId: 'same', principalText: 'p2' },
    ],
  }), /Duplicate identity/);
  assert.throws(() => createFixtureIdentityAccessService({
    identities: [{
      accountId: 'account',
      principalText: 'principal',
      profileVisibility: 'everyone',
    }],
  }), /Invalid profile visibility/);
});
