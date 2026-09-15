import type {
  CompetitionDraft,
  CompetitionPage,
  CompetitionPatch,
  CompetitionReconciliation,
  CompetitionRecord,
  CompetitionSnapshot,
  DurableCompetitionService,
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

export interface CompetitionSnapshotRequestWire {
  key: string;
  fingerprint: string;
  result: CompetitionWireRecord;
}

export interface CompetitionSnapshotWire {
  schema_version: number;
  next_sequence: number;
  competitions: CompetitionWireRecord[];
  requests: CompetitionSnapshotRequestWire[];
}

export interface CompetitionReconciliationWire {
  equal: boolean;
  missing_ids: string[];
  unexpected_ids: string[];
  changed_ids: string[];
  request_ledger_equal: boolean;
  sequence_equal: boolean;
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
  /**
   * Cross-club administrative durability operations. The actor enforces
   * app-admin authorization from the bound caller; no role or account
   * argument is accepted from the request.
   */
  export_snapshot(): Promise<CompetitionDomainResult<CompetitionSnapshotWire>>;
  import_snapshot(
    request: { snapshot: CompetitionSnapshotWire },
  ): Promise<CompetitionDomainResult<null>>;
  reconcile_snapshot(
    request: { snapshot: CompetitionSnapshotWire },
  ): Promise<CompetitionDomainResult<CompetitionReconciliationWire>>;
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
  ): DurableCompetitionService;
}

export type CompetitionBindingDomainTypes = {
  record: CompetitionRecord;
  page: CompetitionPage;
  draft: CompetitionDraft;
  patch: CompetitionPatch;
  snapshot: CompetitionSnapshot;
  reconciliation: CompetitionReconciliation;
};
