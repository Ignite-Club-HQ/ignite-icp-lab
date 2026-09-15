import type { TeamDirectoryActor, TeamPage, TeamRecord, TeamService } from "./TeamService";

/**
 * Candid-shaped boundary for the local team directory canister slice.
 *
 * Mirrors `ClubBindings.ts` for the broader, membership-independent teams
 * read policy: any authenticated caller may read any team. Authorization
 * still comes from the bound caller's resolved identity, not a request
 * argument, so that an anonymous (unauthenticated) caller can never reach
 * the dispatch path.
 */
export type TeamDomainResult<T> = { Ok: T } | { Err: string };

export interface TeamWireRecord {
  id: string;
  club_id: string;
  name: string;
  lifecycle_status: string;
  created_at: string;
  updated_at: string;
}

export interface TeamWirePage {
  items: TeamWireRecord[];
  next_cursor: [] | [string];
}

export interface TeamListRequest {
  club_id: [] | [string];
  cursor: [] | [string];
  limit: number;
}

export interface TeamDomainActor {
  list_teams(request: TeamListRequest): Promise<TeamDomainResult<TeamWirePage>>;
  get_team(request: { team_id: string }): Promise<TeamDomainResult<TeamWireRecord>>;
}

export interface TeamIdentity {
  principalText: string;
  accountId: string;
}

export interface AuthenticatedTeamActorFactory {
  connect(identity: TeamIdentity): Promise<TeamDomainActor>;
}

/**
 * A typed adapter is the only place where Candid wire records should become
 * frontend domain records. It is not enabled in the lab runtime yet.
 */
export interface AuthenticatedTeamServiceFactory {
  create(factory: AuthenticatedTeamActorFactory, identity: TeamIdentity): TeamService;
}

export type TeamBindingDomainTypes = {
  actor: TeamDirectoryActor;
  record: TeamRecord;
  page: TeamPage;
};
