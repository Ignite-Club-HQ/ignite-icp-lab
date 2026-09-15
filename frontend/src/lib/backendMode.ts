/**
 * Hybrid backend selection for routed pages that still import the
 * Supabase-backed implementation directly (see docs/PORTING_PLAN.md).
 *
 * This lab defaults to ICP-only: the fail-closed Supabase client
 * (src/integrations/supabase/client.ts) must never be reached automatically,
 * and there is no production fallback. The only way a page resolves back to
 * its pre-existing Supabase-backed implementation is an explicit
 * `?backend=supabase` query parameter on that navigation -- there is no
 * session, cookie or default that restores it silently, and it must be
 * present on every navigation that expects it.
 *
 * Everything else (`?backend=icp`, no parameter, or an unrecognised value)
 * resolves to icp. Callers must render an explicit unavailable/read-only
 * state for icp instead of mounting any Supabase-backed query, effect,
 * subscription, RPC, storage call or mutation, until that domain has a
 * local canister/fixture adapter proven by isolation tests.
 */
export type BackendMode = "supabase" | "icp";

const BACKEND_PARAM = "backend";
const SUPABASE_MODE_VALUE = "supabase";

export function resolveLocalAuthMode(search: string): BackendMode {
  const params = new URLSearchParams(search);
  return params.get(BACKEND_PARAM) === SUPABASE_MODE_VALUE ? "supabase" : "icp";
}
