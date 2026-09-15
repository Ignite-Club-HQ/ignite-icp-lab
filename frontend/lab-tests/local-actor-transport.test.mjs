import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLocalActorTransport,
  LOCAL_ACTOR_CONFIGS,
} from '../src/lab/localActorTransport.mjs';
import {
  createSyntheticAuthenticatedCompetitionFactory,
} from '../src/lab/competitionAuthenticatedBinding.mjs';
import {
  createSyntheticAuthenticatedIdentityFactory,
} from '../src/lab/identityAuthenticatedBinding.mjs';
import {
  DEMO_ORGANIZER_CLUB_ID,
  createFixtureCompetitionService,
} from '../src/lab/competitionService.mjs';
import { createFixtureIdentityAccessService } from '../src/lab/identityAccessService.mjs';

const identity = {
  accountId: 'transport-admin',
  principalText: 'transport-admin-principal',
  roles: [{ role: 'club_admin', clubId: DEMO_ORGANIZER_CLUB_ID }],
};

test('shared transport validates fixed synthetic configs and preserves call boundaries', async () => {
  const calls = [];
  const transport = createLocalActorTransport({
    config: LOCAL_ACTOR_CONFIGS.identity,
    dispatch: async call => {
      calls.push(call);
      return { ok: true };
    },
  });
  const args = { account_id: 'target' };
  assert.deepEqual(await transport.call('get_profile', args), { ok: true });
  args.account_id = 'changed-after-call';
  assert.deepEqual(calls, [{ method: 'get_profile', args: { account_id: 'target' } }]);
  assert.deepEqual(transport.config, LOCAL_ACTOR_CONFIGS.identity);
  assert.throws(() => createLocalActorTransport({
    config: { ...LOCAL_ACTOR_CONFIGS.identity, canisterId: 'production' },
    dispatch: async () => null,
  }), /Unsupported local actor configuration/);
  await assert.rejects(transport.call('get-profile', {}), /Invalid local actor method/);
});

test('identity and competition bindings share the local transport config seam', async () => {
  const seen = [];
  const transportFactory = options => {
    seen.push(options.config);
    return createLocalActorTransport(options);
  };
  const identityAccess = createFixtureIdentityAccessService({ identities: [identity] });
  const identityFactory = createSyntheticAuthenticatedIdentityFactory({
    service: identityAccess,
    transportFactory,
  });
  await (await identityFactory.connect(identity)).resolve_account();

  const competitionService = createFixtureCompetitionService();
  const competitionFactory = createSyntheticAuthenticatedCompetitionFactory({
    service: competitionService,
    identityAccess,
    transportFactory,
  });
  await (await competitionFactory.connect(identity)).list_competitions({
    club_id: [],
    cursor: [],
    limit: 1,
  });

  assert.deepEqual(seen, [
    LOCAL_ACTOR_CONFIGS.identity,
    LOCAL_ACTOR_CONFIGS.competition,
  ]);
  assert.notEqual(seen[0].canisterId, seen[1].canisterId);
  assert.equal(seen[0].basePath, '/icp/api/v2');
  assert.equal(seen[1].basePath, '/icp/api/v2');
});
