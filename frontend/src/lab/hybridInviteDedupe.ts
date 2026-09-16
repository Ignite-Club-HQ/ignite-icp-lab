import type { Principal } from '@icp-sdk/core/principal';
import { resolveClubBackend } from './backendRouter';
import type { PlacementRegistry } from './hybridClubLinksService';

export interface InviteDedupeMatch {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  alreadyInClub: boolean;
  alreadyInTeam: boolean;
  alreadyInMiniLeague: boolean;
}

export interface InviteDedupeRequest {
  email: string;
  clubId: string;
  teamId?: string | null;
  miniLeagueId?: string | null;
}

export interface InviteDedupeProvider {
  lookup(request: {
    email: string;
    clubId: string;
    teamId: string | null;
    miniLeagueId: string | null;
  }): Promise<unknown>;
}

export interface InviteDedupeProviders {
  icp: (canister: Principal) => Promise<InviteDedupeProvider>;
  supabase: (environment: string) => Promise<InviteDedupeProvider>;
}

export function isPlausibleInvitableEmail(raw: string | null | undefined): boolean {
  if (typeof raw !== 'string') return false;
  const email = raw.trim();
  if (email.length === 0 || email.length > 254 || /\s/.test(email)) return false;

  const at = email.indexOf('@');
  if (at <= 0 || at !== email.lastIndexOf('@')) return false;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!local || !domain) return false;
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(domain)) return false;
  if (!/^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(local)) return false;
  return !local.startsWith('.') && !local.endsWith('.') && !local.includes('..');
}

function parseDedupeResponse(raw: unknown): InviteDedupeMatch | null {
  const candidate: unknown = Array.isArray(raw) ? raw[0] : raw;
  if (!candidate || typeof candidate !== 'object') return null;

  const record = candidate as Record<string, unknown>;
  if (typeof record.user_id !== 'string' || record.user_id.length === 0) return null;
  const stringOrNull = (value: unknown) => (typeof value === 'string' ? value : null);
  const boolOrFalse = (value: unknown) => value === true;

  return {
    userId: record.user_id,
    displayName: stringOrNull(record.display_name),
    avatarUrl: stringOrNull(record.avatar_url),
    alreadyInClub: boolOrFalse(record.already_in_club),
    alreadyInTeam: boolOrFalse(record.already_in_team),
    alreadyInMiniLeague: boolOrFalse(record.already_in_mini_league),
  };
}

function backendKey(backend: { Icp: { canister: Principal } } | { Supabase: { environment: string } }): string {
  return 'Icp' in backend
    ? `icp:${backend.Icp.canister.toText()}`
    : `supabase:${backend.Supabase.environment}`;
}

/**
 * Centralizes invite deduplication lookup while keeping provider selection
 * explicit and scoped to the club's authoritative placement.
 */
export function createHybridInviteDedupeService(
  registry: PlacementRegistry,
  providers: InviteDedupeProviders,
) {
  const clients = new Map<string, InviteDedupeProvider>();

  return {
    async lookup(request: InviteDedupeRequest): Promise<InviteDedupeMatch | null> {
      const email = request.email.trim().toLowerCase();
      if (!isPlausibleInvitableEmail(email)) return null;

      const routed = await resolveClubBackend(registry, request.clubId);
      const key = backendKey(routed.backend);
      let provider = clients.get(key);
      if (!provider) {
        provider = 'Icp' in routed.backend
          ? await providers.icp(routed.backend.Icp.canister)
          : await providers.supabase(routed.backend.Supabase.environment);
        clients.set(key, provider);
      }

      const raw = await provider.lookup({
        email,
        clubId: request.clubId,
        teamId: request.teamId ?? null,
        miniLeagueId: request.miniLeagueId ?? null,
      });
      return parseDedupeResponse(raw);
    },
    clearProviderCache() {
      clients.clear();
    },
  };
}
