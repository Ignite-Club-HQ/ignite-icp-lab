export type CompetitionStatus = "draft" | "active" | "archived";
export type CompetitionVisibility = "private" | "unlisted" | "public";

export interface CompetitionActor {
  /** Stable application account ID; never used as a principal or role. */
  accountId: string;
  /** Synthetic fixture authority, populated by the adapter rather than callers. */
  appAdmin?: boolean;
  adminClubIds?: readonly string[];
  memberClubIds?: readonly string[];
}

export interface CompetitionRecord {
  id: string;
  name: string;
  description: string | null;
  organizerClubId: string;
  createdBy: string;
  sport: string | null;
  season: string | null;
  status: CompetitionStatus;
  visibility: CompetitionVisibility;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitionDraft {
  name: string;
  description?: string | null;
  organizerClubId: string;
  sport?: string | null;
  season?: string | null;
  status?: CompetitionStatus;
  visibility?: CompetitionVisibility;
}

export interface CompetitionPatch {
  name?: string;
  description?: string | null;
  sport?: string | null;
  season?: string | null;
  status?: CompetitionStatus;
  visibility?: CompetitionVisibility;
}

export interface CompetitionPage {
  items: CompetitionRecord[];
  nextCursor: string | null;
}

export interface CompetitionListOptions {
  clubId?: string;
  cursor?: string;
  limit?: number;
}

/**
 * Provider-neutral seam for the competition list/detail/basic lifecycle.
 *
 * The eventual ICP implementation must preserve these authorization,
 * revision, idempotency, and bounded-page semantics inside the canister. The
 * fixture adapter is synthetic evidence only and is intentionally not in the
 * active lab runtime allowlist.
 */
export interface CompetitionService {
  list(actor: CompetitionActor | null, options?: CompetitionListOptions): Promise<CompetitionPage>;
  get(actor: CompetitionActor | null, id: string): Promise<CompetitionRecord>;
  create(actor: CompetitionActor, draft: CompetitionDraft, requestId: string): Promise<CompetitionRecord>;
  update(
    actor: CompetitionActor,
    id: string,
    patch: CompetitionPatch,
    expectedRevision: number,
    requestId: string,
  ): Promise<CompetitionRecord>;
}
