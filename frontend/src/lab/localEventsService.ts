import { Actor } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { idlFactory } from './bindings/events_domain/declarations/events_domain.did.js';
import type { Event as IcpEvent, _SERVICE } from './bindings/events_domain/declarations/events_domain.did.js';
import { createLocalAgent, fetchLocalLabConfig } from './localActor';

export interface LocalScheduleEvent {
  id: string;
  title: string;
  type: 'game' | 'training' | 'social';
  event_date: string;
  address: string | null;
  suburb: string | null;
  location_name: string | null;
  club_id: string;
  team_id: string | null;
  mini_league_id: string | null;
  is_cancelled: boolean;
  is_bye: boolean | null;
  is_recurring: boolean;
  parent_event_id: string | null;
  opponent: string | null;
  teams: { name: string } | null;
  clubs: { name: string; sport: string | null };
  description: string;
  starts_at_ms: bigint;
  ends_at_ms: bigint;
}

function titleToType(title: string): LocalScheduleEvent['type'] {
  const normalized = title.toLowerCase();
  if (normalized.includes('training')) return 'training';
  if (normalized.includes('social')) return 'social';
  return 'game';
}

function convertEvent(event: IcpEvent): LocalScheduleEvent {
  const start = new Date(Number(event.starts_at_ms));
  return {
    id: event.id,
    title: event.title,
    type: titleToType(event.title),
    event_date: Number.isFinite(start.getTime()) ? start.toISOString().slice(0, 10) : new Date(0).toISOString().slice(0, 10),
    address: null,
    suburb: null,
    location_name: 'Local ICP canister',
    club_id: event.club_id,
    team_id: event.team_id[0] ?? null,
    mini_league_id: null,
    is_cancelled: false,
    is_bye: false,
    is_recurring: false,
    parent_event_id: null,
    opponent: null,
    teams: event.team_id.length ? { name: 'ICP team' } : null,
    clubs: { name: 'ICP club', sport: null },
    description: event.description,
    starts_at_ms: event.starts_at_ms,
    ends_at_ms: event.ends_at_ms,
  };
}

export function isLocalEventsCanisterUnavailable(error: unknown): boolean {
  return error instanceof Error && /events domain canister is not configured/i.test(error.message);
}

export function createEventsDomainClient(actor: Pick<_SERVICE, 'list_events' | 'create_event' | 'update_event'>) {
  return {
    async listEvents(clubId?: string | null, teamId?: string | null): Promise<LocalScheduleEvent[]> {
      const events = await actor.list_events(clubId ? [clubId] : [], teamId ? [teamId] : []);
      return events.map(convertEvent);
    },
    async createEvent(
      clubId: string,
      teamId: string | null,
      title: string,
      description: string,
      startsAtMs: bigint,
      endsAtMs: bigint,
    ): Promise<LocalScheduleEvent> {
      const result = await actor.create_event(clubId, teamId ? [teamId] : [], title, description, startsAtMs, endsAtMs);
      if ('Err' in result) throw new Error(result.Err);
      return convertEvent(result.Ok);
    },
    async getEvent(id: string): Promise<LocalScheduleEvent> {
      const events = await actor.list_events([], []);
      const event = events.find((candidate) => candidate.id === id);
      if (!event) throw new Error('Event not found');
      return convertEvent(event);
    },
    async updateEvent(
      id: string,
      title: string,
      description: string,
      startsAtMs: bigint,
      endsAtMs: bigint,
    ): Promise<LocalScheduleEvent> {
      const result = await actor.update_event(id, title, description, startsAtMs, endsAtMs);
      if ('Err' in result) throw new Error(result.Err);
      return convertEvent(result.Ok);
    },
  };
}

async function connectEventsActor(persona: string): Promise<_SERVICE> {
  const config = await fetchLocalLabConfig();
  const eventsCanisterId = config.canisterIds?.events_domain ?? config.canisterIds?.events_domain_motoko;
  if (!eventsCanisterId) throw new Error('Local events domain canister is not configured.');
  const agent = await createLocalAgent(config, persona, location.origin);
  return Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: Principal.fromText(eventsCanisterId),
  });
}

export async function listLocalEvents(persona: string, clubId?: string | null, teamId?: string | null): Promise<LocalScheduleEvent[]> {
  return createEventsDomainClient(await connectEventsActor(persona)).listEvents(clubId, teamId);
}

export async function createLocalEvent(
  persona: string,
  clubId: string,
  teamId: string | null,
  title: string,
  description: string,
  startsAtMs: bigint,
  endsAtMs: bigint,
): Promise<LocalScheduleEvent> {
  return createEventsDomainClient(await connectEventsActor(persona)).createEvent(clubId, teamId, title, description, startsAtMs, endsAtMs);
}

export async function getLocalEvent(persona: string, id: string): Promise<LocalScheduleEvent> {
  return createEventsDomainClient(await connectEventsActor(persona)).getEvent(id);
}

export async function updateLocalEvent(
  persona: string,
  id: string,
  title: string,
  description: string,
  startsAtMs: bigint,
  endsAtMs: bigint,
): Promise<LocalScheduleEvent> {
  return createEventsDomainClient(await connectEventsActor(persona)).updateEvent(id, title, description, startsAtMs, endsAtMs);
}
