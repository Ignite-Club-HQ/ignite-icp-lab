/**
 * Provider-neutral contract for read-only club visibility.
 *
 * This is a deliberately narrow slice of the source `public.clubs` domain.
 * It reproduces only the verified current SELECT policies from the inert
 * reference migrations, not club creation/update/subscription/marketplace
 * management, which carry additional unverified business rules (billing,
 * PlayHQ sync, theming) outside this pass's scope.
 *
 * Verified source policies are all additive/permissive (Postgres RLS unions
 * every matching policy), so the effective SELECT set is the union of three
 * independently-added policies (see docs/PORTING_PLAN.md for full
 * citations):
 *   CREATE POLICY "Club members can view their clubs" ON public.clubs
 *     FOR SELECT USING (is_club_member(auth.uid(), id) OR has_role(auth.uid(), 'app_admin', NULL, NULL));
 *   CREATE POLICY "Authenticated users can view clubs for discovery" ON public.clubs
 *     FOR SELECT USING (auth.uid() IS NOT NULL AND listed_on_marketplace = true);
 *   CREATE POLICY "Creators can view their clubs" ON public.clubs
 *     FOR SELECT TO authenticated USING (created_by = auth.uid());
 *
 * The third policy (added after the first two, never dropped) lets a club's
 * creator read it back immediately after INSERT, before they hold any
 * membership role and even if it is not marketplace-listed. This adapter
 * models `createdBy` explicitly rather than folding it into membership.
 *
 * Note this remains narrower than the club-links/competition domains: the
 * clubs table SELECT policy set has no separate club-admin branch
 * independent of `is_club_member`. A club admin's own visibility comes from
 * the direct-role branch of `is_club_member`, which the source's auto-clear
 * trigger keeps from ever coinciding with an exclusion row in practice. This
 * adapter does not model that trigger; it only reproduces the SELECT
 * policies as written. Soft-delete (`clubs.deleted_at`, added later) is also
 * not filtered by any of these SELECT policies in source, so it is
 * deliberately not modeled here either.
 */
export interface ClubDirectoryActor {
  /** Stable application account ID; never used as a principal or role. */
  accountId: string;
  appAdmin?: boolean;
  /** Clubs where the caller is an ordinary member, including admin roles,
   * team-derived membership, and parent/guardian inheritance, minus club
   * exclusion. This must mirror `is_club_member` exactly. */
  memberClubIds?: readonly string[];
}

export interface ClubRecord {
  id: string;
  name: string;
  /** Mirrors `clubs.listed_on_marketplace`; gates the discovery SELECT policy. */
  listedOnMarketplace: boolean;
  /** Mirrors `clubs.created_by`; gates the creator-can-view-own-club SELECT policy. */
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClubPage {
  items: ClubRecord[];
  nextCursor: string | null;
}

export interface ClubListOptions {
  cursor?: string;
  limit?: number;
}

/**
 * The eventual ICP implementation must preserve these SELECT semantics
 * inside the canister. The fixture adapter is synthetic evidence only and
 * is intentionally not in the active lab runtime allowlist.
 */
export interface ClubService {
  list(actor: ClubDirectoryActor | null, options?: ClubListOptions): Promise<ClubPage>;
  get(actor: ClubDirectoryActor | null, id: string): Promise<ClubRecord>;
}
