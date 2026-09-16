import type { Principal } from '@icp-sdk/core/principal';
import { resolveClubBackend } from './backendRouter';
import type { HybridBackend, PlacementRegistry } from './hybridClubLinksService';

export type EventRsvpRow = {
  id: string;
  event_id: string;
  user_id: string | null;
  child_id: string | null;
  status: string;
  mini_league_players?: unknown;
  [key: string]: unknown;
};

export type EventRsvpProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type EventRsvpChild = { id: string; name: string };

export type EventRsvpProfileLoader = (userIds: string[]) => Promise<EventRsvpProfile[]>;

/**
 * The authoritative RSVP read plus display-only child lookups for one event.
 * Both belong to the same club backend, so a single provider serves both.
 */
export interface EventRsvpProvider {
  listRsvps(eventId: string): Promise<EventRsvpRow[]>;
  listChildren(childIds: string[]): Promise<EventRsvpChild[]>;
}

export type EventRsvpProviders = {
  icp: (canister: Principal) => Promise<EventRsvpProvider>;
  supabase: (environment: string) => Promise<EventRsvpProvider>;
};

function backendKey(backend: HybridBackend): string {
  return 'Icp' in backend
    ? `icp:${backend.Icp.canister.toText()}`
    : `supabase:${backend.Supabase.environment}`;
}

/**
 * Read the authoritative RSVP rows for one event, then enrich display-only
 * profile and child information. The RSVP read fails closed; enrichment is
 * explicitly best effort so valid attendance never disappears because an
 * avatar/name or child lookup is temporarily unavailable.
 *
 * Adapted from the bundle's `eventRsvpRepository`, which took a raw
 * Supabase-shaped `client: any` and relied on Postgrest's `{ data, error }`
 * responses never throwing to make enrichment implicitly best effort. The
 * provider boundary here uses throwing async methods (matching every other
 * hybrid provider in this lab), so enrichment failures are now caught
 * explicitly rather than depending on a non-throwing client convention.
 */
export async function fetchEventRsvps(
  provider: EventRsvpProvider,
  eventId: string,
  loadProfiles: EventRsvpProfileLoader,
): Promise<EventRsvpRow[]> {
  const rows = await provider.listRsvps(eventId);

  const userIds = rows.filter(row => row.user_id).map(row => row.user_id as string);
  const childIds = rows.filter(row => row.child_id).map(row => row.child_id as string);

  let profilesMap: Record<string, Omit<EventRsvpProfile, 'id'>> = {};
  if (userIds.length > 0) {
    try {
      const profiles = await loadProfiles(userIds);
      profilesMap = Object.fromEntries(
        profiles.map(profile => [profile.id, { display_name: profile.display_name, avatar_url: profile.avatar_url }]),
      );
    } catch {
      // best effort — valid attendance rows must not disappear because of this
    }
  }

  let childrenMap: Record<string, EventRsvpChild> = {};
  if (childIds.length > 0) {
    try {
      const children = await provider.listChildren(childIds);
      childrenMap = Object.fromEntries(children.map(child => [child.id, child]));
    } catch {
      // best effort — valid attendance rows must not disappear because of this
    }
  }

  return rows.map(row => ({
    ...row,
    profiles: row.user_id ? profilesMap[row.user_id] ?? null : null,
    children: row.child_id ? childrenMap[row.child_id] ?? null : null,
  }));
}

/**
 * Placement-routed adaptation: resolves the club's authoritative backend and
 * caches one provider per backend identity, mirroring every other hybrid
 * service in this lab. An unavailable/disabled backend surfaces its reason
 * with no Supabase fallback in ICP mode.
 */
export function createHybridEventRsvpRepository(
  registry: PlacementRegistry,
  providers: EventRsvpProviders,
) {
  const clients = new Map<string, EventRsvpProvider>();

  const providerFor = async (clubId: string): Promise<EventRsvpProvider> => {
    const routed = await resolveClubBackend(registry, clubId);
    const key = backendKey(routed.backend);
    const existing = clients.get(key);
    if (existing) return existing;

    const provider = 'Icp' in routed.backend
      ? await providers.icp(routed.backend.Icp.canister)
      : await providers.supabase(routed.backend.Supabase.environment);
    clients.set(key, provider);
    return provider;
  };

  return {
    async fetchRsvps(
      clubId: string,
      eventId: string,
      loadProfiles: EventRsvpProfileLoader,
    ): Promise<EventRsvpRow[]> {
      const provider = await providerFor(clubId);
      return fetchEventRsvps(provider, eventId, loadProfiles);
    },
    clearProviderCache() {
      clients.clear();
    },
  };
}
