import { expect, test } from 'vitest';
import { Principal } from '@icp-sdk/core/principal';
import { createIdentityAccessClient } from '../src/lab/identityAccessClient';
import type { _SERVICE } from '../src/lab/bindings/identity_access/declarations/identity_access.did';

const account = { id: 'account-1', principals: [Principal.fromText('aaaaa-aa')], version: 0n };
const actor = {
  whoami: async () => ({ Ok: account }),
  access: async () => ({ Ok: { account_id: account.id, app_admin: false, club_admin: true, guardian: false, team_member: true } }),
  begin_link: async () => ({ Err: 'synthetic denial' }),
  accept_link: async () => ({ Err: 'synthetic denial' }),
  revoke: async () => ({ Err: 'synthetic denial' }),
} as unknown as _SERVICE;

test('identity access client converts successful decisions and preserves canister errors', async () => {
  const client = createIdentityAccessClient(actor);
  await expect(client.whoami()).resolves.toEqual(account);
  await expect(client.access('club-a', 'team-a', 'child-a')).resolves.toMatchObject({ club_admin: true, team_member: true });
  await expect(client.beginLink(Principal.fromText('2ibo7-dia'))).rejects.toThrow('synthetic denial');
});

test('disposed identity access client rejects late and future calls', async () => {
  const client = createIdentityAccessClient(actor);
  client.dispose();
  await expect(client.whoami()).rejects.toThrow('Identity changed');
});
