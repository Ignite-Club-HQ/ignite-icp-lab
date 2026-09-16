import type { Principal } from '@icp-sdk/core/principal';
import { resolveClubBackend } from './backendRouter';
import type { PlacementRegistry } from './hybridClubLinksService';

export type ClubScopeTable =
  | 'teams'
  | 'events'
  | 'chat_groups'
  | 'mini_leagues'
  | 'vault_folders'
  | 'club_admin_conversations'
  | 'photos'
  | 'club_links';

export interface ClubScopeRow {
  clubId: string | null;
  teamId: string | null;
}

export interface ClubScopeProvider {
  lookupRow(table: ClubScopeTable, id: string): Promise<unknown>;
  lookupTeamClubId(teamId: string): Promise<unknown>;
}

export interface ClubScopeProviders {
  icp: (canister: Principal) => Promise<ClubScopeProvider>;
  supabase: (environment: string) => Promise<ClubScopeProvider>;
}

const TEAM_FALLBACK_TABLES: ReadonlySet<ClubScopeTable> = new Set([
  'events',
  'photos',
  'chat_groups',
  'vault_folders',
]);

function parseScopeRow(raw: unknown): ClubScopeRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const clubId = row.clubId;
  const teamId = row.teamId;
  if (clubId !== null && typeof clubId !== 'string') return null;
  if (teamId !== null && typeof teamId !== 'string') return null;
  return { clubId: clubId ?? null, teamId: teamId ?? null };
}

function parseClubId(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const clubId = (raw as Record<string, unknown>).clubId;
  return typeof clubId === 'string' && clubId.length > 0 ? clubId : null;
}

function backendKey(backend: { Icp: { canister: Principal } } | { Supabase: { environment: string } }): string {
  return 'Icp' in backend
    ? `icp:${backend.Icp.canister.toText()}`
    : `supabase:${backend.Supabase.environment}`;
}

/**
 * Centralizes route/notification ownership lookup behind explicit placement.
 *
 * The source helper queried Supabase directly. This boundary instead uses the
 * caller's current club placement to select one provider and never falls back
 * to another backend when that provider is unavailable.
 */
export function createHybridClubScopeLookup(
  registry: PlacementRegistry,
  providers: ClubScopeProviders,
) {
  const clients = new Map<string, ClubScopeProvider>();

  return {
    async lookupRouteClubId(
      placementClubId: string,
      table: ClubScopeTable,
      id: string,
    ): Promise<string | null> {
      const routed = await resolveClubBackend(registry, placementClubId);
      const key = backendKey(routed.backend);
      let provider = clients.get(key);
      if (!provider) {
        provider = 'Icp' in routed.backend
          ? await providers.icp(routed.backend.Icp.canister)
          : await providers.supabase(routed.backend.Supabase.environment);
        clients.set(key, provider);
      }

      const row = parseScopeRow(await provider.lookupRow(table, id));
      if (!row) return null;
      if (row.clubId) return row.clubId;
      if (!TEAM_FALLBACK_TABLES.has(table) || !row.teamId) return null;
      return parseClubId(await provider.lookupTeamClubId(row.teamId));
    },
    clearProviderCache() {
      clients.clear();
    },
  };
}
