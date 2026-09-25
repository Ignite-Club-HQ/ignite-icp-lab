/**
 * Live-track replacement for `@/lab/localRuntimeMode`'s `resolveLocalAuthMode`,
 * aliased in only for the live build (see `vite.live.config.ts`).
 *
 * Every call site across the shared page/data-layer code (100+ files) calls
 * `resolveLocalAuthMode(search, true)`, hardcoding the "isolated lab" branch
 * literally at each call site — see the lab's own version of this function
 * for its doc comment: "the lab passes `true` while a promoted application
 * must pass its deployment configuration instead of inheriting local mode
 * or fixture behavior." Because every call site already passes a literal
 * `true`, only aliasing this whole module (the same alias-substitution
 * pattern already used for the Supabase client and Internet Identity auth
 * module) can change that decision for the live build without editing
 * every call site.
 *
 * For the live track, the deployed Supabase project is the real, working
 * source of truth for every domain today — no mainnet ICP canister IDs are
 * deployed yet (see Phase 3 of docs/PRODUCTION_LAUNCH_PLAN.md) — so this
 * always resolves to `false` (real Supabase auth/data), ignoring the
 * `localLabMode` argument entirely (it is always `true` from every caller
 * and carries no live-specific signal), unless a developer explicitly opts
 * into the ICP-only diagnostic path for manual testing via `?backend=icp`
 * (mirroring, but inverting, the lab's `?backend=supabase` escape hatch).
 */
export function resolveLocalAuthMode(search: string, _localLabMode = true): boolean {
  const params = new URLSearchParams(search);
  return params.get('backend') === 'icp';
}
