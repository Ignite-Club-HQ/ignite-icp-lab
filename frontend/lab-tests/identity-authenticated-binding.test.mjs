import test from 'node:test';
import assert from 'node:assert/strict';
import { createFixtureIdentityAccessService } from '../src/lab/identityAccessService.mjs';
import {
  createAuthenticatedIdentityAccessService,
  createSyntheticAuthenticatedIdentityFactory,
} from '../src/lab/identityAuthenticatedBinding.mjs';

const CLUB = 'synthetic-club';
const admin = {
  accountId: 'identity-admin',
  principalText: 'identity-admin-principal',
  roles: [{ role: 'club_admin', clubId: CLUB }],
};
const member = {
  accountId: 'identity-member',
  principalText: 'identity-member-principal',
  roles: [{ role: 'member', clubId: CLUB }],
};

function setup() {
  const identityAccess = createFixtureIdentityAccessService({
    identities: [
      { ...admin, displayName: 'Synthetic Admin', profileVisibility: 'private' },
      { ...member, displayName: 'Synthetic Member' },
    ],
    children: [{
      childId: 'child-1',
      clubId: CLUB,
      parentAccountId: member.accountId,
    }],
  });
  const factory = createSyntheticAuthenticatedIdentityFactory({ service: identityAccess });
  return { identityAccess, factory };
}

test('identity actor maps account, authorization and access decisions through wire types', async () => {
  const { factory } = setup();
  const actor = await factory.connect(admin);
  const account = await actor.resolve_account();
  assert.deepEqual(account, {
    Ok: { account_id: admin.accountId, principal_text: admin.principalText },
  });
  const authorization = await actor.resolve_authorization();
  assert.deepEqual(authorization.Ok.admin_club_ids, [CLUB]);
  const access = await actor.get_club_access({ club_id: CLUB });
  assert.equal(access.Ok.is_admin, true);
  assert.equal(access.Ok.is_member, true);
});

test('bound identity adapter implements provider-neutral access without trusting request identity', async () => {
  const { factory } = setup();
  const bound = createAuthenticatedIdentityAccessService(factory, admin);
  assert.deepEqual(await bound.resolveAccount(admin.principalText), {
    accountId: admin.accountId,
    principalText: admin.principalText,
  });
  assert.equal((await bound.getClubAccess(admin.principalText, CLUB)).isAdmin, true);
  assert.equal(await bound.canAccessChild(admin.principalText, 'child-1'), false);
  await assert.rejects(
    bound.getClubAccess(member.principalText, CLUB),
    /identity mismatch/,
  );
});

test('anonymous, unknown and mismatched identities fail closed', async () => {
  const { factory } = setup();
  await assert.rejects(factory.connect({
    principalText: '',
    accountId: admin.accountId,
  }), /Authenticated principal/);
  await assert.rejects(factory.connect({
    principalText: 'unknown-principal',
    accountId: admin.accountId,
  }), /Anonymous or unknown/);
  await assert.rejects(factory.connect({
    principalText: admin.principalText,
    accountId: member.accountId,
  }), /not registered/);
});

test('actor returns explicit errors for unauthorized profile and missing child reads', async () => {
  const { factory } = setup();
  const actor = await factory.connect(member);
  const privateProfile = await actor.get_profile({ account_id: admin.accountId });
  assert.ok('Err' in privateProfile);
  const missingChild = await actor.can_access_child({ child_id: 'missing-child' });
  assert.deepEqual(missingChild, { Err: 'Child not found' });
});
