import { Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { usePageTitle } from "@/hooks/usePageTitle";

interface CompetitionBackendUnavailableNoticeProps {
  title: string;
  feature: string;
}

/**
 * Explicit unavailable/read-only state for competition-lifecycle pages when
 * no local ICP-backed competitions provider exists yet.
 *
 * Per docs/PORTING_PLAN.md, the competitions domain has no local canister,
 * Candid contract or fixture adapter yet -- only the club-links domain has
 * been ported and isolation-tested so far. This notice replaces the
 * Supabase-backed page body entirely instead of mounting any Supabase
 * query, effect, subscription, RPC or mutation.
 *
 * Append `?backend=supabase` to this route to use the existing, unchanged
 * Supabase-backed implementation for comparison.
 */
export function CompetitionBackendUnavailableNotice({ title, feature }: CompetitionBackendUnavailableNoticeProps) {
  usePageTitle(title);
  return (
    <div className="container max-w-2xl mx-auto px-4 py-10">
      <Card>
        <CardContent className="p-6 space-y-3 text-sm">
          <div className="flex items-center gap-2 font-semibold text-base">
            <Info className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            {feature} is not available in ICP mode yet
          </div>
          <p className="text-muted-foreground">
            The competitions domain has no local ICP canister or fixture adapter in this lab yet -- only
            the club-links domain has been ported and isolation-tested so far. This lab never falls back
            to the disabled Supabase client automatically.
          </p>
          <p className="text-muted-foreground">
            Append <code className="rounded bg-muted px-1 py-0.5">?backend=supabase</code> to this URL to
            use the existing, unchanged Supabase-backed implementation for comparison.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
