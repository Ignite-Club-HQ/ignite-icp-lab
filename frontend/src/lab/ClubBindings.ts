import type { ClubDirectoryActor, ClubPage, ClubRecord, ClubService } from "./ClubService";

/**
 * Candid-shaped boundary for the local club directory canister slice.
 *
 * This models the generated binding shape for a read-only club directory
 * canister without pretending one exists in this lab. Authorization comes
 * from the authenticated actor's caller principal, resolved server-side by
 * the identity/access seam; no account ID, membership list, or admin flag
 * is accepted as a request argument.
 */
export type ClubDomainResult<T> = { Ok: T } | { Err: string };

export interface ClubWireRecord {
  id: string;
  name: string;
  listed_on_marketplace: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClubWirePage {
  items: ClubWireRecord[];
  next_cursor: [] | [string];
}

export interface ClubListRequest {
  cursor: [] | [string];
  limit: number;
}

export interface ClubDomainActor {
  list_clubs(request: ClubListRequest): Promise<ClubDomainResult<ClubWirePage>>;
  get_club(request: { club_id: string }): Promise<ClubDomainResult<ClubWireRecord>>;
}

export interface ClubIdentity {
  principalText: string;
  accountId: string;
}

export interface AuthenticatedClubActorFactory {
  connect(identity: ClubIdentity): Promise<ClubDomainActor>;
}

/**
 * A typed adapter is the only place where Candid wire records should become
 * frontend domain records. It is not enabled in the lab runtime yet.
 */
export interface AuthenticatedClubServiceFactory {
  create(factory: AuthenticatedClubActorFactory, identity: ClubIdentity): ClubService;
}

export type ClubBindingDomainTypes = {
  actor: ClubDirectoryActor;
  record: ClubRecord;
  page: ClubPage;
};
