import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, test, describe, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { resolveLocalAuthMode } from "../src/lib/backendMode";
import { useBackendMode } from "../src/hooks/useBackendMode";
import PublicCompetitionPage from "../src/pages/PublicCompetitionPage";

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: supabaseMocks.from,
  },
}));

// Focused test for the hybrid backend selector added to the competition
// lifecycle pages (CompetitionsPage, CreateCompetitionPage,
// PublicCompetitionPage). See src/lib/backendMode.ts.
//
// PublicCompetitionPage is used for the full-mount proof below because it
// is the one of the three pages that does not import src/hooks/useAuth.tsx.
// useAuth.tsx statically imports src/lib/nativePush.ts, which dynamically
// imports the intentionally-removed native dependency
// "@capacitor-firebase/messaging" (see docs/PORTING_PLAN.md: "Native and
// Supabase SDKs are removed as direct dependencies"). That makes Vite fail
// to transform ANY module reachable from useAuth in this lab, including
// CompetitionsPage.tsx and CreateCompetitionPage.tsx -- a pre-existing gap
// in the unported source, unrelated to this change. Those two pages are
// still covered at the source level (see the diff) and by the
// resolveLocalAuthMode/useBackendMode unit tests below, but a real
// full-mount render test for them is blocked until that native-push import
// is itself decoupled or stubbed, which is out of scope for this pass.

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("resolveLocalAuthMode", () => {
  test("defaults to icp with no query parameter", () => {
    expect(resolveLocalAuthMode("")).toBe("icp");
  });
  test("defaults to icp for an explicit backend=icp", () => {
    expect(resolveLocalAuthMode("?backend=icp")).toBe("icp");
  });
  test("defaults to icp for an unrecognised backend value", () => {
    expect(resolveLocalAuthMode("?backend=legacy")).toBe("icp");
  });
  test("only resolves to supabase for the exact opt-in value", () => {
    expect(resolveLocalAuthMode("?backend=supabase")).toBe("supabase");
  });
});

function ModeProbe() {
  const mode = useBackendMode();
  return <span data-testid="mode">{mode}</span>;
}

describe("useBackendMode", () => {
  test("reads the router search string reactively", () => {
    render(
      <MemoryRouter initialEntries={["/x"]}>
        <ModeProbe />
      </MemoryRouter>
    );
    expect(screen.getByTestId("mode").textContent).toBe("icp");
    cleanup();
    render(
      <MemoryRouter initialEntries={["/x?backend=supabase"]}>
        <ModeProbe />
      </MemoryRouter>
    );
    expect(screen.getByTestId("mode").textContent).toBe("supabase");
  });
});

describe("PublicCompetitionPage hybrid mounting (no fixture/adapter exists for this domain yet)", () => {
  test("ICP mode (no query parameter) renders the unavailable notice and never mounts the Supabase-backed page", () => {
    // Deliberately no QueryClientProvider ancestor: the Supabase-backed
    // PublicCompetitionPageSupabase calls useQuery() and would throw a
    // missing-QueryClient error immediately if it were mounted here. A
    // clean render of the notice proves it was not mounted, and therefore
    // that none of its Supabase queries ran.
    render(
      <MemoryRouter initialEntries={["/competitions/public/demo"]}>
        <PublicCompetitionPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/is not available in ICP mode yet/i)).toBeTruthy();
    expect(screen.getByText(/backend=supabase/)).toBeTruthy();
    expect(supabaseMocks.from).not.toHaveBeenCalled();
  });

  test("supabase mode mounts the existing Supabase-backed page", async () => {
    supabaseMocks.from.mockImplementation(() => {
      const query = {
        select: vi.fn(),
        eq: vi.fn(),
        maybeSingle: vi.fn(),
      };
      query.select.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      query.maybeSingle.mockResolvedValue({ data: null });
      return query;
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/competitions/public/demo?backend=supabase"]}>
          <Routes>
            <Route path="/competitions/public/:id" element={<PublicCompetitionPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(supabaseMocks.from).toHaveBeenCalledWith("competitions");
    });
    expect(screen.queryByText(/is not available in ICP mode yet/i)).toBeNull();
  });
});
