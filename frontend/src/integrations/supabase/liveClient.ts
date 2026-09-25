import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getActiveSupabaseTarget } from "@/live/targetRegistry";

const target = getActiveSupabaseTarget();

export const supabase = createClient<Database>(target.url, target.anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: `ignite-live-${target.alias}-auth`,
  },
  global: {
    headers: {
      "x-ignite-backend-target": target.alias,
    },
  },
});
