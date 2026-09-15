/**
 * Provider-neutral contract for read-only team visibility.
 *
 * Verified source policy (see docs/PORTING_PLAN.md for the full citation):
 *   CREATE POLICY "Authenticated users can view teams" ON public.teams
 *     FOR SELECT TO authenticated USING (true);
 *
 * Any authenticated user can read any team, regardless of club membership,
 * because the product lets users browse/request to join teams. Anonymous
 * (unauthenticated) callers are still denied. This slice intentionally
 * excludes team create/update, which is gated by a `has_role` branch
 * (team_admin OR club_admin OR app_admin) independent of `is_team_member`
 * and is deferred to a future write-side pass.
 */
export type TeamLifecycleStatus = 'draft' | 'active' | 'archived';

export interface TeamDirectoryActor {
  /** Stable application account ID; never used as a principal or role. */
  accountId: string;
}

export interface TeamRecord {
  id: string;
  clubId: string;
  name: string;
  /** Mirrors `public.team_lifecycle_status` enum: draft | active | archived. */
  lifecycleStatus: TeamLifecycleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TeamPage {
  items: TeamRecord[];
  nextCursor: string | null;
}

export interface TeamListOptions {
  clubId?: string;
  cursor?: string;
  limit?: number;
}

/**
 * The eventual ICP implementation must preserve "any authenticated caller
 * may read any team" inside the canister. The fixture adapter is synthetic
 * evidence only and is not in the active lab runtime allowlist.
 */
export interface TeamService {
  list(actor: TeamDirectoryActor | null, options?: TeamListOptions): Promise<TeamPage>;
  get(actor: TeamDirectoryActor | null, id: string): Promise<TeamRecord>;
}
