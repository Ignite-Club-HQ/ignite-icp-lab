import type {
  CompetitionDraft,
  CompetitionPage,
  CompetitionPatch,
  CompetitionRecord,
  CompetitionService,
} from "./CompetitionService";

/**
 * Candid-shaped boundary for the local competition canister slice.
 *
 * These declarations are intentionally committed separately from the
 * provider-neutral service. They model the generated binding shape without
 * pretending that a canister or generated declaration exists in this lab.
 * Authorization comes from the authenticated actor's caller principal; no
 * account ID or role is sent as an authority argument.
 */
export type CompetitionDomainResult<T> = { Ok: T } | { Err: string };

export interface CompetitionWireRecord {
  id: string;
  name: string;
  description: [] | [string];
  organizer_club_id: string;
  created_by: string;
  sport: [] | [string];
  season: [] | [string];
  status: string;
  visibility: string;
  revision: number;
  created_at: string;
  updated_at: string;
}

export interface CompetitionWirePage {
  items: CompetitionWireRecord[];
  next_cursor: [] | [string];
}

export interface CompetitionListRequest {
  club_id: [] | [string];
  cursor: [] | [string];
  limit: number;
}

export interface CompetitionCreateRequest {
  request_id: string;
  name: string;
  description: [] | [string];
  organizer_club_id: string;
  sport: [] | [string];
  season: [] | [string];
  status: string;
  visibility: string;
}

export interface CompetitionUpdateRequest {
  competition_id: string;
  request_id: string;
  expected_revision: number;
  patch: {
    name: [] | [string];
    description: [] | [string];
    sport: [] | [string];
    season: [] | [string];
    status: [] | [string];
    visibility: [] | [string];
  };
}

export interface CompetitionDomainActor {
  list_competitions(
    request: CompetitionListRequest,
  ): Promise<CompetitionDomainResult<CompetitionWirePage>>;
  get_competition(
    request: { competition_id: string },
  ): Promise<CompetitionDomainResult<CompetitionWireRecord>>;
  create_competition(
    request: CompetitionCreateRequest,
  ): Promise<CompetitionDomainResult<CompetitionWireRecord>>;
  update_competition(
    request: CompetitionUpdateRequest,
  ): Promise<CompetitionDomainResult<CompetitionWireRecord>>;
}

export interface CompetitionIdentity {
  principalText: string;
  accountId: string;
}

export interface AuthenticatedCompetitionActorFactory {
  connect(identity: CompetitionIdentity): Promise<CompetitionDomainActor>;
}

/**
 * A typed adapter is the only place where Candid wire records should become
 * frontend domain records. It is not enabled in the lab runtime yet.
 */
export interface AuthenticatedCompetitionServiceFactory {
  create(
    factory: AuthenticatedCompetitionActorFactory,
    identity: CompetitionIdentity,
  ): CompetitionService;
}

export type CompetitionBindingDomainTypes = {
  record: CompetitionRecord;
  page: CompetitionPage;
  draft: CompetitionDraft;
  patch: CompetitionPatch;
};
