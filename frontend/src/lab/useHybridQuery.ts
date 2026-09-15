/**
 * Hybrid data fetcher for pages supporting both ICP and Supabase backends.
 * 
 * Usage:
 *   const { data: clubs } = useHybridQuery(
 *     ['user-clubs', userId],
 *     userId,
 *     (supabaseClient) => supabaseClient.from('clubs').select(...),
 *     () => fixtureDataLayer.getFixtureUserClubs(userId),
 *   );
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { resolveLocalAuthMode } from './localRuntimeMode';

/**
 * Hook that automatically routes queries to ICP fixtures (in lab mode)
 * or Supabase (in normal mode).
 * 
 * This is a transitional pattern for testing the app shell with both backends.
 * In production hybrid deployments, real canister implementations would replace
 * the fixture layer.
 */
export function useHybridQuery<T>(
  queryKey: (string | number)[],
  userId: string | undefined | null,
  supabaseQueryFn: (client: SupabaseClient) => Promise<{ data: T | null; error: Error | null }>,
  fixtureQueryFn: (userId: string) => T,
  options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn' | 'enabled'>,
) {
  const useIcp = resolveLocalAuthMode(typeof window !== 'undefined' ? window.location.search : '', true);
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) return null;
      
      if (useIcp) {
        // Lab mode: return synthetic fixture data
        try {
          return fixtureQueryFn(userId);
        } catch (err) {
          console.warn('[HybridQuery] Fixture query failed:', err);
          return null;
        }
      }
      
      // Normal mode: query Supabase
      const { data, error } = await supabaseQueryFn(supabase);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    ...options,
  });
}

/**
 * Variant for queries that don't depend on userId (e.g., global data).
 */
export function useHybridQueryGlobal<T>(
  queryKey: (string | number)[],
  supabaseQueryFn: (client: SupabaseClient) => Promise<{ data: T | null; error: Error | null }>,
  fixtureQueryFn: () => T,
  options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>,
) {
  const useIcp = resolveLocalAuthMode(typeof window !== 'undefined' ? window.location.search : '', true);
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      if (useIcp) {
        // Lab mode: return synthetic fixture data
        try {
          return fixtureQueryFn();
        } catch (err) {
          console.warn('[HybridQuery] Fixture query failed:', err);
          return null;
        }
      }
      
      // Normal mode: query Supabase
      const { data, error } = await supabaseQueryFn(supabase);
      if (error) throw error;
      return data;
    },
    ...options,
  });
}
