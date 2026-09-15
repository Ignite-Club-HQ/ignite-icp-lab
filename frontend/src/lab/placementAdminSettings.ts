import type { HybridBackend } from './hybridClubLinksService';
import type { Principal } from '@icp-sdk/core/principal';

export type BackendPolicy = {
  backend: 'icp' | 'supabase';
  enabled: boolean;
  targetAlias: string;
  version: string;
};

export type CountryPolicy = {
  country: string;
  allowedBackends: Array<'icp' | 'supabase'>;
  policies: BackendPolicy[];
};

export type ClubAssignment = {
  clubId: string;
  country: string;
  backend: 'icp' | 'supabase';
  targetAlias: string;
  version: string;
};

export type PlacementAdminSettings = {
  countries: CountryPolicy[];
  clubs: ClubAssignment[];
};

export type PlacementAdminController = {
  settings(): PlacementAdminSettings;
  setCountryPolicy(policy: CountryPolicy): void;
  assignClub(assignment: ClubAssignment): void;
  decision(clubId: string): ClubAssignment | undefined;
};

function normalizeCountry(country: string): string {
  return country.trim().toUpperCase();
}

function backendAllowed(policy: CountryPolicy, backend: 'icp' | 'supabase'): boolean {
  return policy.allowedBackends.includes(backend) && policy.policies.some(item => item.backend === backend && item.enabled);
}

export function createPlacementAdminController(initial: PlacementAdminSettings): PlacementAdminController {
  const current: PlacementAdminSettings = structuredClone(initial);

  return {
    settings: () => structuredClone(current),
    setCountryPolicy(policy) {
      const country = normalizeCountry(policy.country);
      if (!/^[A-Z]{2}$/.test(country)) throw new Error('Country must be ISO alpha-2 uppercase');
      const allowed = [...new Set(policy.allowedBackends)];
      if (policy.policies.some(item => !item.targetAlias || !item.version)) throw new Error('Backend target and version are required');
      current.countries = current.countries.filter(item => item.country !== country);
      current.countries.push({ ...policy, country, allowedBackends: allowed });
    },
    assignClub(assignment) {
      const country = normalizeCountry(assignment.country);
      const policy = current.countries.find(item => item.country === country);
      if (!policy) throw new Error('Club must be assigned to a configured country');
      if (!backendAllowed(policy, assignment.backend)) throw new Error(`Backend is not allowed in ${country}`);
      const target = policy.policies.find(item => item.backend === assignment.backend && item.targetAlias === assignment.targetAlias && item.version === assignment.version && item.enabled);
      if (!target) throw new Error('Target version is not approved for this country');
      current.clubs = current.clubs.filter(item => item.clubId !== assignment.clubId);
      current.clubs.push({ ...assignment, country });
    },
    decision(clubId) {
      return current.clubs.find(item => item.clubId === clubId);
    },
  };
}

export function backendFromAssignment(assignment: ClubAssignment, canister?: Principal): HybridBackend {
  if (assignment.backend === 'icp') {
    if (!canister) throw new Error('ICP target requires a canister principal');
    return { Icp: { canister } };
  }
  return { Supabase: { environment: assignment.targetAlias } };
}
