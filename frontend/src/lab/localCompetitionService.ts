import { Actor } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { idlFactory } from './bindings/competition_domain/declarations/competition_domain.did.js';
import type { Competition as IcpCompetition, _SERVICE } from './bindings/competition_domain/declarations/competition_domain.did.js';
import { createLocalAgent, fetchLocalLabConfig } from './localActor';

export interface LocalCompetitionSummary {
  id: string;
  name: string;
  sport: string | null;
  season: string;
  status: string;
  visibility: string;
  organizer_club_id: string;
  source: string;
  last_synced_at: string | null;
  clubs: { name: string } | null;
  competition_entries: unknown[];
  revision: bigint;
}

function convertCompetition(competition: IcpCompetition): LocalCompetitionSummary {
  return {
    id: competition.id,
    name: competition.name,
    sport: null,
    season: competition.season,
    status: competition.status,
    visibility: 'local',
    organizer_club_id: competition.club_id,
    source: 'icp',
    last_synced_at: null,
    clubs: competition.club_id ? { name: 'ICP club' } : null,
    competition_entries: [],
    revision: competition.revision,
  };
}

export function isLocalCompetitionCanisterUnavailable(error: unknown): boolean {
  return error instanceof Error && /competition domain canister is not configured/i.test(error.message);
}

export function createCompetitionDomainClient(actor: Pick<_SERVICE, 'export_state' | 'create_competition' | 'claim_join_token'>) {
  return {
    async listCompetitions(): Promise<LocalCompetitionSummary[]> {
      const result = await actor.export_state();
      if ('Err' in result) throw new Error(result.Err);
      return result.Ok.competitions.map(convertCompetition);
    },
    async getCompetition(id: string): Promise<LocalCompetitionSummary> {
      const result = await actor.export_state();
      if ('Err' in result) throw new Error(result.Err);
      const competitions = result.Ok.competitions.map(convertCompetition);
      const competition = competitions.find((candidate) => candidate.id === id);
      if (!competition) throw new Error('Competition not found');
      return competition;
    },
    async createCompetition(clubId: string, name: string, season: string): Promise<LocalCompetitionSummary> {
      const result = await actor.create_competition(clubId, name, season);
      if ('Err' in result) throw new Error(result.Err);
      return convertCompetition(result.Ok);
    },
    async claimJoinToken(token: string): Promise<string> {
      const result = await actor.claim_join_token(token);
      if ('Err' in result) throw new Error(result.Err);
      return result.Ok;
    },
  };
}

async function connectCompetitionActor(persona: string): Promise<_SERVICE> {
  const config = await fetchLocalLabConfig();
  const competitionCanisterId = config.canisterIds?.competition_domain ?? config.canisterIds?.competition_domain_motoko;
  if (!competitionCanisterId) throw new Error('Local competition domain canister is not configured.');
  const agent = await createLocalAgent(config, persona, location.origin);
  return Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: Principal.fromText(competitionCanisterId),
  });
}

export async function listLocalCompetitions(persona: string): Promise<LocalCompetitionSummary[]> {
  return createCompetitionDomainClient(await connectCompetitionActor(persona)).listCompetitions();
}

export async function getLocalCompetition(persona: string, id: string): Promise<LocalCompetitionSummary> {
  return createCompetitionDomainClient(await connectCompetitionActor(persona)).getCompetition(id);
}

export async function createLocalCompetition(
  persona: string,
  clubId: string,
  name: string,
  season: string,
): Promise<LocalCompetitionSummary> {
  return createCompetitionDomainClient(await connectCompetitionActor(persona)).createCompetition(clubId, name, season);
}

export async function claimLocalCompetitionJoinToken(persona: string, token: string): Promise<string> {
  return createCompetitionDomainClient(await connectCompetitionActor(persona)).claimJoinToken(token);
}
