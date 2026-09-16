import { Principal } from '@icp-sdk/core/principal';
import { expect, test } from 'vitest';
import {
  resolveClubBackend,
  type BackendProviders,
} from '../src/lab/backendRouter';
import { createSyntheticPlacementRegistry } from '../src/lab/syntheticPlacementRegistry';
import type { PlacementRegistry } from '../src/lab/hybridClubLinksService';

type Competition = {
  id: string;
  organizerClubId: string;
  name: string;
  status: 'open' | 'active';
  invitedTeamIds: Set<string>;
  acceptedTeamIds: Set<string>;
};

type CompetitionClient = {
  createCompetition(actor: Actor, name: string): Promise<Competition>;
  getCompetition(actor: Actor, id: string): Promise<Competition | undefined>;
  inviteTeam(actor: Actor, id: string, teamId: string): Promise<void>;
  acceptInvitation(actor: Actor, id: string): Promise<void>;
  activate(actor: Actor, id: string): Promise<void>;
};

type Actor = {
  id: string;
  clubId: string;
  teamId?: string;
  admin: boolean;
};

const CLUB_A = 'club-competition-a';
const CLUB_B = 'club-competition-b';
const TEAM_B = 'team-competition-b';
const ADMIN_A: Actor = { id: 'admin-a', clubId: CLUB_A, admin: true };
const MEMBER_A: Actor = { id: 'member-a', clubId: CLUB_A, admin: false };
const TEAM_ADMIN_B: Actor = { id: 'team-admin-b', clubId: CLUB_B, teamId: TEAM_B, admin: false };

function createCompetitionClient(): CompetitionClient {
  const competitions = new Map<string, Competition>();
  return {
    async createCompetition(actor, name) {
      if (!actor.admin) throw new Error('Organizer role required');
      const competition = {
        id: `competition-${competitions.size + 1}`,
        organizerClubId: actor.clubId,
        name,
        status: 'open' as const,
        invitedTeamIds: new Set<string>(),
        acceptedTeamIds: new Set<string>(),
      };
      competitions.set(competition.id, competition);
      return competition;
    },
    async getCompetition(actor, id) {
      const competition = competitions.get(id);
      if (!competition) return undefined;
      const canSee = actor.clubId === competition.organizerClubId
        || (actor.teamId !== undefined && competition.invitedTeamIds.has(actor.teamId));
      return canSee ? competition : undefined;
    },
    async inviteTeam(actor, id, teamId) {
      const competition = competitions.get(id);
      if (!competition || actor.clubId !== competition.organizerClubId || !actor.admin) {
        throw new Error('Organizer role required');
      }
      if (competition.invitedTeamIds.has(teamId)) throw new Error('Team already invited');
      competition.invitedTeamIds.add(teamId);
    },
    async acceptInvitation(actor, id) {
      const competition = competitions.get(id);
      if (!competition || !actor.teamId || !competition.invitedTeamIds.has(actor.teamId)) {
        throw new Error('Invitation required');
      }
      competition.acceptedTeamIds.add(actor.teamId);
    },
    async activate(actor, id) {
      const competition = competitions.get(id);
      if (!competition || actor.clubId !== competition.organizerClubId || !actor.admin) {
        throw new Error('Organizer role required');
      }
      competition.status = 'active';
    },
  };
}

async function routedClient(
  registry: PlacementRegistry,
  providers: BackendProviders<CompetitionClient>,
  clients: Map<string, CompetitionClient>,
  clubId: string,
) {
  const routed = await resolveClubBackend(registry, clubId);
  const key = routed.kind === 'icp'
    ? `icp:${routed.backend.Icp.canister.toText()}`
    : `supabase:${routed.backend.Supabase.environment}`;
  let client = clients.get(key);
  if (!client) {
    client = routed.kind === 'icp'
      ? await providers.icp(routed.backend.Icp.canister)
      : await providers.supabase(routed.backend.Supabase.environment);
    clients.set(key, client);
  }
  return client;
}

for (const mode of ['supabase', 'icp'] as const) {
  test(`preserves competition invitation lifecycle in explicit ${mode} mode`, async () => {
    const registry = createSyntheticPlacementRegistry([
      {
        clubId: CLUB_A,
        country: 'AU',
        backend: mode === 'supabase'
          ? { Supabase: { environment: 'competition-au' } }
          : { Icp: { canister: Principal.fromText('aaaaa-aa') } },
      },
      {
        clubId: CLUB_B,
        country: 'US',
        backend: mode === 'supabase'
          ? { Supabase: { environment: 'competition-us' } }
          : { Icp: { canister: Principal.fromText('2vxsx-fae') } },
      },
    ]);
    const calls: string[] = [];
    const clients = new Map<string, CompetitionClient>();
    const getClient = (key: string) => {
      let client = clients.get(key);
      if (!client) {
        client = createCompetitionClient();
        clients.set(key, client);
      }
      return client;
    };
    const providers: BackendProviders<CompetitionClient> = {
      supabase: async environment => {
        calls.push(`supabase:${environment}`);
        return getClient(`supabase:${environment}`);
      },
      icp: async canister => {
        calls.push(`icp:${canister.toText()}`);
        return getClient(`icp:${canister.toText()}`);
      },
    };
    const organizer = await routedClient(registry, providers, clients, CLUB_A);
    const invitedTeam = await routedClient(registry, providers, clients, CLUB_A);

    await expect(organizer.createCompetition(MEMBER_A, 'Synthetic Cup')).rejects.toThrow('Organizer role required');
    const competition = await organizer.createCompetition(ADMIN_A, 'Synthetic Cup');
    expect(await invitedTeam.getCompetition(TEAM_ADMIN_B, competition.id)).toBeUndefined();

    await organizer.inviteTeam(ADMIN_A, competition.id, TEAM_B);
    await expect(organizer.inviteTeam(ADMIN_A, competition.id, TEAM_B)).rejects.toThrow('Team already invited');
    await expect(invitedTeam.getCompetition(TEAM_ADMIN_B, competition.id)).resolves.toMatchObject({
      id: competition.id,
      status: 'open',
    });

    await invitedTeam.acceptInvitation(TEAM_ADMIN_B, competition.id);
    await expect(invitedTeam.activate(TEAM_ADMIN_B, competition.id)).rejects.toThrow('Organizer role required');
    await organizer.activate(ADMIN_A, competition.id);
    await expect(organizer.getCompetition(ADMIN_A, competition.id)).resolves.toMatchObject({ status: 'active' });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatch(mode === 'supabase' ? /^supabase:/ : /^icp:/);
  });
}

test('does not fall back to Supabase when the selected ICP competition provider fails', async () => {
  let supabaseCalls = 0;
  const registry = createSyntheticPlacementRegistry([{
    clubId: CLUB_A,
    country: 'AU',
    backend: { Icp: { canister: Principal.fromText('aaaaa-aa') } },
  }]);
  const providers: BackendProviders<CompetitionClient> = {
    supabase: async () => {
      supabaseCalls += 1;
      throw new Error('Supabase must not be used in ICP mode');
    },
    icp: async () => {
      throw new Error('local ICP competition provider unavailable');
    },
  };

  await expect(routedClient(registry, providers, new Map(), CLUB_A))
    .rejects.toThrow('local ICP competition provider unavailable');
  expect(supabaseCalls).toBe(0);
});
