import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { resolveLocalAuthMode, type BackendMode } from "@/lib/backendMode";

/**
 * Reads the routed backend mode from the current location search string.
 * See src/lib/backendMode.ts for the selection rules. This hook is a thin
 * read of the URL only; it does not touch Supabase, ICP or any storage.
 */
export function useBackendMode(): BackendMode {
  const { search } = useLocation();
  return useMemo(() => resolveLocalAuthMode(search), [search]);
}
