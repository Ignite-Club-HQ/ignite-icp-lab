# Ignite ICP lab: club-links source reference

Source commit: 556782e51e101c446b4c36265f35ea17fd3c31ff.
Rebuilt from the same source snapshot after the earlier temporary package expired.

## Isolation and scope

This is inert reference text, not a runnable application or complete database baseline. Keep under reference/ outside build inputs. No production client configuration, environment files, Git metadata, deployment workflows or production records are included. URL/email literals are sanitized; MANIFEST.json records provenance and redaction locations. Do not execute the SQL or restore Supabase connectivity.

Work only in ignite-icp-lab and its separate Codespace. Before running anything verify checkout/remotes, credentials, environment, workflows and forwarded ports. Never mount or modify the production workspace. Use synthetic users, clubs and links, local identities and a local ICP backend only. Never call Supabase or open production URLs. Fail closed if the local backend is unavailable. A separate repository and these instructions do not themselves enforce network isolation; this transfer does not certify the other Codespace's isolation.

Before writing ICP code read https://skills.internetcomputer.org/llms.txt, fetch the current skills index and relevant skills. Follow current guidance rather than older tooling knowledge.

## First port

Build a local Rust canister and small React lab page for club links. Preserve the actual frontend interaction patterns below. Introduce ClubLinksService methods for visible/admin lists, get, create, edit, delete, set-active and reorder, with synthetic and local ICP adapters. Do not add a live Supabase adapter to the lab. Preserve UUID domain IDs independently of principals. Store links by ID and ordered club index; bound inputs/results, use atomic reorder, retriable mutation idempotency and upgrade-safe persistence. Caller principals must be authenticated server-side; client roles are never proof.

Long-term scope is an incremental backend port covering identity/account linking, clubs/teams/membership, schedules, notifications, media/Vault, messaging and remaining integrations. This package covers the first domain and selected dependencies only. Obtain separately sanitized source slices before implementing later domains; do not invent missing behavior or attempt production cutover.

## Frontend behavior and dependencies

HomePage -> ClubLinksSection -> useClubQuickLinks/useClubPolicyDocs. ClubDetailPage -> ClubLinksManager with isAdmin gating. App -> ClubLinkEmbedPage -> LegalPageEmbed. routeClubScope resolves club-link IDs. Full feature files and broad auth/theme/browser helpers are included as reference; selected caller excerpts show integration. UI primitives and transitive dependencies are not a buildable closure. Replace broad contexts with synthetic local fixtures in the demo.

The home section also reads vault_folders/vault_files: keep document tiles synthetic or explicitly disabled until that separate storage domain is ported. Do not initialize production auth or global bootstrap services. The member list spans authorized clubs when no filter is selected; activeClubFilter is not authorization. Preserve sort_order then created_at ordering. The embed page reads by ID and depends on RLS. Persistent snapshots and query caches need identity-aware clearing and access-revocation behavior.

Admin CRUD currently calls Supabase directly. Reorder is two separate updates; make it atomic in the port. Editing includes club_id, so authorize both old and new scope or deliberately prohibit club reassignment. Record this design choice.

## Security contract

The second club-links migration replaces the first migration's admin helper calls. Preserve all five replacement policies: admin insert, update (old/new scope), delete and read-all; member active-only read. is_club_admin_for authorizes club_admin for the club OR app_admin. is_club_member includes direct club roles, team roles, parent and guardian relationships, with club exclusions. The independent admin branch can authorize an excluded admin; do not silently impose a blanket denial that changes this rule. Frontend isAdmin is never a backend security boundary. Every query, direct ID lookup, list/index path, update, delete, bulk/import and reorder method needs appropriate authorization.

Test anonymous, outsider, member, club admin, app admin, parent, guardian and excluded identities; inactive visibility; wrong-club mutations; old/new scope; direct-ID reads; and admin/exclusion interaction. Test validation, ordering, concurrency, retries, cache identity changes, loading/error/empty states, upgrade persistence and synthetic export/import reconciliation. Included helper tests do not prove domain policy coverage.

## Evidence limits

Generated types describe the checked-in snapshot, not deployed schema. Selected migration history is not a complete baseline. Production drift and additional permission changes require a later authorized read-only audit. This package contains no production data migration or working ICP implementation.

## src/components/clubs/ClubLinksManager.tsx (starting line 1)

````text
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, Plus, Trash2, Pencil, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { CLUB_LINK_ICONS } from "@/components/home/ClubLinksSection";

interface ClubLinkRecord {
  id: string;
  title: string;
  subtitle: string | null;
  url: string;
  icon: string;
  open_mode: string;
  sort_order: number;
  is_active: boolean;
}

interface DraftState {
  id?: string;
  title: string;
  subtitle: string;
  url: string;
  icon: string;
  open_mode: string;
  is_active: boolean;
}

const EMPTY_DRAFT: DraftState = {
  title: "",
  subtitle: "",
  url: "",
  icon: "link",
  open_mode: "browser",
  is_active: true,
};

function normalizeUrl(raw: string): string | null {
  // Strip all whitespace (mobile keyboards frequently insert stray spaces,
  // which would otherwise be percent-encoded into the hostname as %20).
  const trimmed = raw.replace(/\s+/g, "");
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    // Hostname must look like a real domain: labels separated by dots, no encoded chars.
    if (!/^[a-z0-9.-]+$/i.test(parsed.hostname)) return null;
    if (!parsed.hostname.includes(".")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}


/**
 * Club-admin management for the home page "Club Info & Links" tiles.
 */
export default function ClubLinksManager({ clubId }: { clubId: string }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<DraftState | null>(null);

  const { data: links = [], isLoading } = useQuery<ClubLinkRecord[]>({
    queryKey: ["club-links-admin", clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_links")
        .select("id, title, subtitle, url, icon, open_mode, sort_order, is_active")
        .eq("club_id", clubId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as ClubLinkRecord[];
    },
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["club-links-admin", clubId] }),
      queryClient.invalidateQueries({ queryKey: ["club-quick-links"] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: async (value: DraftState) => {
      const url = normalizeUrl(value.url);
      if (!value.title.trim()) throw new Error("Please enter a title.");
      if (!url) throw new Error("Please enter a valid web address.");

      const payload = {
        club_id: clubId,
        title: value.title.trim(),
        subtitle: value.subtitle.trim() || null,
        url,
        icon: value.icon,
        open_mode: value.open_mode,
        is_active: value.is_active,
      };

      if (value.id) {
        const { error } = await supabase.from("club_links").update(payload).eq("id", value.id);
        if (error) throw error;
        return;
      }

      const nextOrder = links.length ? Math.max(...links.map((l) => l.sort_order)) + 1 : 0;
      const { error } = await supabase
        .from("club_links")
        .insert({ ...payload, sort_order: nextOrder });
      if (error) throw error;
    },
    onSuccess: async () => {
      setDraft(null);
      await invalidate();
      toast({ title: "Link saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't save link", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("club_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidate();
      toast({ title: "Link removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't remove link", description: error.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("club_links").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error: Error) => {
      toast({ title: "Couldn't update link", description: error.message, variant: "destructive" });
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ index, direction }: { index: number; direction: -1 | 1 }) => {
      const target = index + direction;
      if (target < 0 || target >= links.length) return;
      const a = links[index];
      const b = links[target];
      const { error: errA } = await supabase
        .from("club_links")
        .update({ sort_order: b.sort_order })
        .eq("id", a.id);
      if (errA) throw errA;
      const { error: errB } = await supabase
        .from("club_links")
        .update({ sort_order: a.sort_order })
        .eq("id", b.id);
      if (errB) throw errB;
    },
    onSuccess: invalidate,
  });

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Club Info &amp; Links</h3>
            <p className="text-xs text-muted-foreground">
              Tiles shown on every member&apos;s home page — policies, registration, clothing and more.
            </p>
          </div>
          {!draft && (
            <Button size="sm" variant="outline" onClick={() => setDraft({ ...EMPTY_DRAFT })}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          )}
        </div>

        {draft && (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">
                {draft.id ? "Edit link" : "New link"}
              </span>
              <Button size="icon" variant="ghost" onClick={() => setDraft(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-1">
              <Label htmlFor="club-link-title">Title</Label>
              <Input
                id="club-link-title"
                value={draft.title}
                placeholder="Registration"
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="club-link-subtitle">Subtitle (optional)</Label>
              <Input
                id="club-link-subtitle"
                value={draft.subtitle}
                placeholder="Season 2026"
                onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="club-link-url">Web address</Label>
              <Input
                id="club-link-url"
                inputMode="url"
                autoCapitalize="none"
                value={draft.url}
                placeholder="https://reference.invalid"
                onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Icon</Label>
                <Select value={draft.icon} onValueChange={(v) => setDraft({ ...draft, icon: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(CLUB_LINK_ICONS).map((key) => (
                      <SelectItem key={key} value={key} className="capitalize">
                        {key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Opens</Label>
                <Select
                  value={draft.open_mode}
                  onValueChange={(v) => setDraft({ ...draft, open_mode: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="browser">In-app browser</SelectItem>
                    <SelectItem value="embed">Embedded page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="club-link-active" className="text-xs">
                Visible to members
              </Label>
              <Switch
                id="club-link-active"
                checked={draft.is_active}
                onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
              />
            </div>

            <Button
              className="w-full"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate(draft)}
            >
              {draft.id ? "Save changes" : "Add link"}
            </Button>
          </div>
        )}

        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading links…</p>
        ) : links.length === 0 ? (
          <p className="text-xs text-muted-foreground">No links yet.</p>
        ) : (
          <ul className="space-y-2">
            {links.map((link, index) => (
              <li
                key={link.id}
                className="flex items-center gap-2 rounded-lg border border-border p-2"
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    aria-label="Move up"
                    className="text-muted-foreground disabled:opacity-30"
                    disabled={index === 0}
                    onClick={() => moveMutation.mutate({ index, direction: -1 })}
                  >
                    <GripVertical className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    className="text-muted-foreground disabled:opacity-30"
                    disabled={index === links.length - 1}
                    onClick={() => moveMutation.mutate({ index, direction: 1 })}
                  >
                    <GripVertical className="h-3 w-3" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{link.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{link.url}</p>
                </div>
                <Switch
                  checked={link.is_active}
                  aria-label="Visible to members"
                  onCheckedChange={(v) => toggleMutation.mutate({ id: link.id, is_active: v })}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Edit link"
                  onClick={() =>
                    setDraft({
                      id: link.id,
                      title: link.title,
                      subtitle: link.subtitle || "",
                      url: link.url,
                      icon: link.icon,
                      open_mode: link.open_mode,
                      is_active: link.is_active,
                    })
                  }
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Remove link"
                  onClick={() => deleteMutation.mutate(link.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
````

## src/components/home/ClubLinksSection.tsx (starting line 1)

````text
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";
import {
  ChevronDown,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  Shield,
  ShieldCheck,
  ShoppingBag,
  ClipboardList,
  CreditCard,
  Calendar,
  Info,
  Users,
  Trophy,
  HeartHandshake,
} from "lucide-react";
import { useClubTheme } from "@/hooks/useClubTheme";
import { useClubQuickLinks, useClubPolicyDocs } from "@/features/clubLinks/useClubQuickLinks";
import { safeOpenUrl } from "@/lib/safeOpenUrl";
import { safeOpenFile } from "@/lib/safeOpenFile";
import { toast } from "@/hooks/use-toast";

const OPEN_STATE_KEY = "ignite_home_club_links_open";

export const CLUB_LINK_ICONS: Record<string, typeof LinkIcon> = {
  link: LinkIcon,
  policy: Shield,
  safety: ShieldCheck,
  clothing: ShoppingBag,
  registration: ClipboardList,
  payment: CreditCard,
  calendar: Calendar,
  info: Info,
  members: Users,
  results: Trophy,
  volunteer: HeartHandshake,
  document: FileText,
};

function iconFor(key: string | null | undefined) {
  return CLUB_LINK_ICONS[(key || "link").toLowerCase()] || LinkIcon;
}

interface Tile {
  id: string;
  title: string;
  subtitle?: string | null;
  Icon: typeof LinkIcon;
  onOpen: () => void | Promise<void>;
}

/**
 * Home page "Club Info & Links" tile grid — club-managed quick links plus any
 * documents in a club Vault policies folder. Renders nothing when the viewer's
 * clubs expose no links or policy documents.
 */
export default function ClubLinksSection() {
  const navigate = useNavigate();
  const { activeClubFilter } = useClubTheme();
  const { data: links = [] } = useClubQuickLinks(activeClubFilter);
  const { data: policies = [] } = useClubPolicyDocs(activeClubFilter);

  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(OPEN_STATE_KEY) !== "closed";
    } catch {
      return true;
    }
  });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(OPEN_STATE_KEY, next ? "open" : "closed");
    } catch {
      /* storage unavailable — state stays in-memory only */
    }
  };

  const tiles = useMemo<Tile[]>(() => {
    const linkTiles: Tile[] = links.map((link) => ({
      id: `link-${link.id}`,
      title: link.title,
      subtitle: link.subtitle,
      Icon: iconFor(link.icon),
      onOpen: async () => {
        if (link.open_mode === "embed") {
          navigate(`/club-link/${link.id}`);
          return;
        }
        try {
          await safeOpenUrl(link.url);
        } catch {
          toast({
            title: "Couldn't open link",
            description: "Please try again in a moment.",
            variant: "destructive",
          });
        }
      },
    }));

    const policyTiles: Tile[] = policies.map((doc) => ({
      id: `doc-${doc.id}`,
      title: doc.name,
      subtitle: "Club document",
      Icon: FileText,
      onOpen: async () => {
        try {
          if (doc.is_external_link) {
            await safeOpenUrl(doc.file_url);
          } else {
            await safeOpenFile(doc.file_url, { fileName: doc.name });
          }
        } catch {
          toast({
            title: "Couldn't open document",
            description: "Please try again in a moment.",
            variant: "destructive",
          });
        }
      },
    }));

    return [...linkTiles, ...policyTiles];
  }, [links, policies, navigate]);

  if (tiles.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={handleOpenChange}>
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-1 py-1 text-left">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">Club Info &amp; Links</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {tiles.length}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-2">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {tiles.map((tile) => (
            <Card
              key={tile.id}
              role="button"
              tabIndex={0}
              onClick={() => void tile.onOpen()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void tile.onOpen();
                }
              }}
              className="flex cursor-pointer flex-col items-center gap-1.5 bg-card p-3 text-center transition-colors hover:bg-accent/50 active:bg-accent"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <tile.Icon className="h-4 w-4" />
              </span>
              <span className="line-clamp-2 text-[11px] font-medium leading-tight text-foreground">
                {tile.title}
              </span>
              {tile.subtitle && (
                <span className="line-clamp-1 text-[10px] text-muted-foreground">
                  {tile.subtitle}
                </span>
              )}
            </Card>
          ))}
        </div>
        <p className="mt-2 flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
          <ExternalLink className="h-3 w-3" /> Some links open your club&apos;s website
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
````

## src/features/clubLinks/useClubQuickLinks.ts (starting line 1)

````text
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { readHomeSectionSnapshot, writeHomeSectionSnapshot } from "@/lib/homeSectionSnapshot";

export interface ClubLinkRow {
  id: string;
  club_id: string;
  title: string;
  subtitle: string | null;
  url: string;
  icon: string;
  open_mode: string;
  sort_order: number;
  is_active: boolean;
}

export interface ClubPolicyDoc {
  id: string;
  name: string;
  file_url: string;
  file_type: string | null;
  is_external_link: boolean | null;
  club_id: string | null;
}

/**
 * Club-managed quick links (registration, clothing, policies pages, ...).
 * RLS already restricts rows to clubs the viewer belongs to, so an optional
 * clubId only narrows an already-authorized set — it is never the security
 * boundary.
 */
export function useClubQuickLinks(clubId?: string | null) {
  return useQuery<ClubLinkRow[]>({
    queryKey: ["club-quick-links", clubId ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("club_links")
        .select("id, club_id, title, subtitle, url, icon, open_mode, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (clubId) query = query.eq("club_id", clubId);

      const { data, error } = await query;
      if (error) throw error;
      const rows = (data || []) as ClubLinkRow[];
      writeHomeSectionSnapshot("club-links", clubId, rows);
      return rows;
    },
    // Paint last known links immediately so the Home tile grid appears with
    // the rest of the page rather than seconds later.
    placeholderData: () =>
      readHomeSectionSnapshot<ClubLinkRow[]>("club-links", clubId) ?? undefined,
    staleTime: 5 * 60 * 1000,
  });
}

const POLICY_FOLDER_PATTERNS = ["polic", "child safety", "code of conduct"];

/**
 * Documents stored in a club-scoped Vault folder whose name looks like a
 * policy folder ("Policies", "Club Policies", "Child Safety Policy", ...).
 * Vault RLS decides visibility; unauthorized viewers simply get nothing.
 */
export function useClubPolicyDocs(clubId?: string | null) {
  return useQuery<ClubPolicyDoc[]>({
    queryKey: ["club-policy-docs", clubId ?? "all"],
    queryFn: async () => {
      let folderQuery = supabase
        .from("vault_folders")
        .select("id, name, club_id")
        .is("deleted_at", null)
        .not("club_id", "is", null)
        .is("team_id", null)
        .is("chat_group_id", null);

      if (clubId) folderQuery = folderQuery.eq("club_id", clubId);

      const { data: folders, error: folderError } = await folderQuery;
      if (folderError) throw folderError;

      const policyFolderIds = (folders || [])
        .filter((f) => {
          const name = (f.name || "").toLowerCase();
          return POLICY_FOLDER_PATTERNS.some((p) => name.includes(p));
        })
        .map((f) => f.id);

      if (policyFolderIds.length === 0) {
        writeHomeSectionSnapshot("club-policy-docs", clubId, []);
        return [];
      }

      const { data: files, error: fileError } = await supabase
        .from("vault_files")
        .select("id, name, file_url, file_type, is_external_link, club_id")
        .is("deleted_at", null)
        .in("folder_id", policyFolderIds)
        .order("name", { ascending: true });

      if (fileError) throw fileError;
      const rows = (files || []) as ClubPolicyDoc[];
      writeHomeSectionSnapshot("club-policy-docs", clubId, rows);
      return rows;
    },
    placeholderData: () =>
      readHomeSectionSnapshot<ClubPolicyDoc[]>("club-policy-docs", clubId) ?? undefined,
    staleTime: 5 * 60 * 1000,
  });
}
````

## src/pages/ClubLinkEmbedPage.tsx (starting line 1)

````text
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import LegalPageEmbed from "@/components/LegalPageEmbed";
import { Button } from "@/components/ui/button";

/**
 * Renders a club-managed link inside the app (native in-app web view).
 * Falls back to a plain redirect on web, matching LegalPageEmbed behaviour.
 */
export default function ClubLinkEmbedPage() {
  const { linkId } = useParams<{ linkId: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["club-link", linkId],
    enabled: !!linkId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_links")
        .select("id, title, url")
        .eq("id", linkId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.url) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <p className="text-sm text-muted-foreground">This link is no longer available.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    );
  }

  return <LegalPageEmbed title={data.title} websiteUrl={data.url} />;
}
````

## src/lib/routeClubScope.ts (starting line 1)

````text
/**
 * Route → owning club resolution.
 *
 * A number of routes render content that belongs to exactly one club (a team,
 * a club chat, a group chat, an event, a mini-league, a vault folder …). When
 * the user changes the active club filter from the header picker, staying on
 * another club's content is a scoping leak: the chrome says club B while the
 * body still shows club A.
 *
 * This module describes, purely from the pathname, *how* to resolve the owning
 * club for the current route:
 *  - `{ kind: "none" }`      → route is not club-scoped (lists, admin, profile…)
 *  - `{ kind: "direct" }`    → the club id is already in the URL
 *  - `{ kind: "lookup" }`    → a single-column lookup resolves the owning club
 *
 * Lookups are intentionally one column on one row so they are cheap and highly
 * cacheable. `nullable: true` means a NULL club_id is legitimate (e.g. personal
 * chat groups, team-only events) and must NOT be treated as a mismatch.
 */

export type ClubScopeTable =
  | "teams"
  | "events"
  | "chat_groups"
  | "mini_leagues"
  | "vault_folders"
  | "club_admin_conversations"
  | "photos"
  | "club_links";

export type RouteClubScope =
  | { kind: "none" }
  | { kind: "direct"; clubId: string }
  | { kind: "lookup"; table: ClubScopeTable; id: string }
  /**
   * Competitions span clubs: the owning club is the organiser, but every club
   * with an entered team is also legitimately "in" the competition. The guard
   * resolves the full set of participating clubs and bounces only when the newly
   * selected club is in none of them.
   */
  | { kind: "membership"; competitionId: string }
  /**
   * Direct messages have no owning club column, but DM eligibility IS club
   * based (`can_dm_user`). A DM with a member of club A must not stay open once
   * the filter moves to club B unless the other participant is also a member of
   * club B. The guard resolves the other participant and checks membership.
   */
  | { kind: "dm"; conversationId: string };

const seg = (pathname: string) => pathname.split("?")[0].split("#")[0].split("/").filter(Boolean);

/**
 * Routes that are deliberately exempt because their content spans clubs or is
 * not club-owned at all (app admin tools, the user's own profile, competitions
 * and associations which are cross-club by design, DMs, public pages).
 */
const EXEMPT_ROOTS = new Set([
  "admin",
  "associations",
  "profile",
  "edit-profile",
  "account",
  "settings",
  "notifications",
  "children",
  "roles",
  "reports",
  "auth",
  "join",
  "join-club",
  "j",
  "eoi",
  "eoi-embed",
  "eoi-complete",
  "claim-team",
  "terms",
  "privacy",
  "cancellation",
  "video-guide",
  "share",
  "c",
  "signup-pro",
  "complete-profile",
  "reset-password",
  "verify-reset-code",
]);

export function resolveRouteClubScope(pathname: string): RouteClubScope {
  const parts = seg(pathname);
  if (parts.length === 0) return { kind: "none" };
  const [root, a, b, c] = parts;

  if (EXEMPT_ROOTS.has(root)) return { kind: "none" };

  switch (root) {
    // /clubs/:clubId/** — the club id is the first param
    case "clubs":
      if (!a || a === "new") return { kind: "none" };
      return { kind: "direct", clubId: a };

    // /competitions/:id/** — allowed for the organiser club and any entered club
    case "competitions":
      if (!a || a === "new" || a === "join") return { kind: "none" };
      return { kind: "membership", competitionId: a };

    case "pay-fees":
      return a ? { kind: "direct", clubId: a } : { kind: "none" };

    // /teams/:teamId/**
    case "teams":
      if (!a || a === "new") return { kind: "none" };
      return { kind: "lookup", table: "teams", id: a };

    // /events/:id/**
    case "events":
      if (!a || a === "new" || a === "import") return { kind: "none" };
      return { kind: "lookup", table: "events", id: a };

    // /groups/:groupId
    case "groups":
      return a ? { kind: "lookup", table: "chat_groups", id: a } : { kind: "none" };

    // /media/:photoId — a single photo belongs to at most one club
    case "media":
      return a ? { kind: "lookup", table: "photos", id: a } : { kind: "none" };

    // /club-link/:linkId — embedded club policy/registration/shop link
    case "club-link":
      return a ? { kind: "lookup", table: "club_links", id: a } : { kind: "none" };

    case "mini-leagues":
      return a ? { kind: "lookup", table: "mini_leagues", id: a } : { kind: "none" };

    // /vault and /vault/folder/:folderId
    case "vault":
      if (a === "folder" && b) return { kind: "lookup", table: "vault_folders", id: b };
      return { kind: "none" };

    case "messages":
      // /messages/club/:clubId
      if (a === "club" && b) return { kind: "direct", clubId: b };
      // /messages/club-admin/:conversationId
      if (a === "club-admin" && b)
        return { kind: "lookup", table: "club_admin_conversations", id: b };
      // DMs, broadcast, welcome and the inbox itself are not club-owned
      // /messages/dm/:conversationId — scoped by the other participant's clubs
      if (a === "dm" && b) return { kind: "dm", conversationId: b };
      if (!a || a === "dm" || a === "broadcast" || a === "welcome") return { kind: "none" };
      // /messages/:teamId — team chat
      if (!b && !c) return { kind: "lookup", table: "teams", id: a };
      return { kind: "none" };

    default:
      return { kind: "none" };
  }
}

/** Tables where a NULL club_id is legitimate (personal / unscoped rows). */
export const NULLABLE_CLUB_TABLES: ReadonlySet<ClubScopeTable> = new Set([
  "chat_groups",
  "events",
  "vault_folders",
  "photos",
]);
````

## src/lib/homeSectionSnapshot.ts (starting line 1)

````text
// Lightweight localStorage snapshots for the Home page's async side sections
// (Club News, Club Info & Links). Mirrors nextUpEventsCache: cold opens paint
// the last known content immediately instead of appearing seconds later once
// the query resolves. Keyed per section + scope (club filter).

const PREFIX = "ignite_home_section_";
const TTL_MS = 24 * 60 * 60 * 1000;

interface Entry<T> {
  data: T;
  timestamp: number;
}

const key = (section: string, scope: string | null | undefined) =>
  `${PREFIX}${section}_${scope || "all"}`;

export function readHomeSectionSnapshot<T>(
  section: string,
  scope: string | null | undefined,
): T | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(key(section, scope));
    if (!raw) return null;
    const entry: Entry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export function writeHomeSectionSnapshot<T>(
  section: string,
  scope: string | null | undefined,
  data: T,
): void {
  try {
    if (typeof localStorage === "undefined") return;
    const entry: Entry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(key(section, scope), JSON.stringify(entry));
  } catch {
    /* quota or unavailable — ignore */
  }
}
````

## src/lib/safeOpenUrl.ts (starting line 1)

````text
import { Capacitor } from '@capacitor/core';

/**
 * Safely open a URL on both web and native platforms.
 *
 * On web: uses window.open (standard behaviour).
 * On native (Capacitor): uses the Capacitor Browser plugin which opens an
 * in-app SFSafariViewController / Chrome Custom Tab — keeping the user inside
 * the app and avoiding App Store rejections for "leaving the app unexpectedly".
 *
 * Falls back to window.open if the Browser plugin isn't available.
 *
 * For Supabase private-bucket URLs (e.g. vault files stored in the `photos`
 * bucket), this function transparently exchanges the public URL for a
 * short-lived signed URL so the browser can fetch the object — otherwise
 * the request fails with "Bucket not found" (404).
 */
// URLs that should open in their native app rather than an in-app browser
const NATIVE_APP_DOMAINS = ['facebook.com', 'fb.com', 'fb.me', 'instagram.com', 'twitter.com', 'x.com', 'docs.google.com', 'sheets.google.com', 'drive.google.com'];

function shouldOpenInNativeApp(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return NATIVE_APP_DOMAINS.some(d => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

export async function safeOpenUrl(url: string): Promise<void> {
  // Resolve Supabase private-bucket URLs to signed URLs before opening.
  let resolvedUrl = url;
  try {
    if (url.includes("/storage/v1/object/")) {
      const { resolveSignedUrl } = await import("@/hooks/useSignedPhotoUrl");
      resolvedUrl = await resolveSignedUrl(url);
    }
  } catch (err) {
    console.warn('[safeOpenUrl] Failed to resolve signed URL, opening original:', err);
  }

  if (!Capacitor.isNativePlatform()) {
    window.open(resolvedUrl, '_blank');
    return;
  }

  // For social-media URLs, let the OS handle them so the native app opens
  if (shouldOpenInNativeApp(resolvedUrl)) {
    window.open(resolvedUrl, '_blank');
    return;
  }

  try {
    const { Browser } = await import('@capacitor/browser');
    console.log('[safeOpenUrl] Opening in-app browser:', resolvedUrl);
    await Browser.open({ url: resolvedUrl, windowName: '_blank' });
    console.log('[safeOpenUrl] Browser.open resolved successfully');
  } catch (err) {
    console.warn('[safeOpenUrl] Browser plugin failed, falling back:', err);
    window.open(resolvedUrl, '_blank');
  }
}
````

## src/lib/safeOpenFile.ts (starting line 1)

````text
import { Capacitor } from "@capacitor/core";
import { safeOpenUrl } from "./safeOpenUrl";

/**
 * Recognized Supabase storage URL forms that require authorization before
 * download/open. Kept in sync with the classifier used by resolveSignedUrl.
 */
const PRIVATE_STORAGE_MARKERS = [
  "/storage/v1/object/public/",
  "/storage/v1/object/sign/",
  "/storage/v1/object/authenticated/",
  "/storage/v1/render/image/public/",
  "/storage/v1/render/image/sign/",
];

function isSupabaseStorageUrl(url: string): boolean {
  const clean = url.split("?")[0].split("#")[0];
  return PRIVATE_STORAGE_MARKERS.some((m) => clean.includes(m));
}

type LocalCopy = {
  /** file:// URI (or native path) of the cached copy. */
  uri: string;
  /** Content type reported by the server when we fetched the bytes ourselves. */
  serverContentType: string | null;
};

/**
 * Open a remote file (PDF, docx, etc.) in the most user-friendly way.
 *
 * Native pipeline (Android / iOS):
 *   1. Resolve an authorized signed URL for Supabase storage files (fail closed).
 *   2. Download to the app cache under the file's REAL name so the OS viewer
 *      shows "Club policy.pdf" rather than a storage host name. We try the
 *      native downloader first and fall back to fetch + write, because
 *      Filesystem.downloadFile is known to fail on some devices / signed URLs.
 *   3. Hand the local copy to the OS viewer (specific MIME, then generic).
 *   4. If no viewer can take it, offer the OS share sheet (still shows the
 *      real file name, lets the user pick Drive / Files / another app).
 *   5. Only as a last resort open the signed URL in the browser.
 *
 * Security: for recognized Supabase storage URLs we resolve to an authorized
 * signed URL BEFORE any download or browser operation. If signing fails we
 * fail closed — the raw private URL is never downloaded, opened, or passed to
 * the browser fallback, and no tokens or private URLs are included in errors.
 */
export async function safeOpenFile(
  url: string,
  opts: { fileName?: string; mimeType?: string } = {},
): Promise<void> {
  const isNative = Capacitor.isNativePlatform();
  const isStorageUrl = isSupabaseStorageUrl(url);

  // Resolve signed URL up-front for Supabase storage URLs. Fail closed on
  // signing errors so we never expose or download the raw private URL.
  let resolvedUrl = url;
  if (isStorageUrl) {
    try {
      const { resolveSignedUrl } = await import("@/hooks/useSignedPhotoUrl");
      resolvedUrl = await resolveSignedUrl(url);
    } catch {
      // Do not include the raw URL, tokens, or the underlying error message
      // (which may contain sensitive query params) in the thrown error.
      console.warn("[safeOpenFile] signing failed; refusing to open private file");
      throw new Error("This file could not be authorized for viewing. Please try again.");
    }
  }

  if (!isNative) {
    await safeOpenUrl(resolvedUrl);
    return;
  }

  // Build a safe filename in a unique cache sub-directory so the viewer
  // shows the real document name (not a timestamped/mangled one).
  const guessedName = opts.fileName?.trim() || guessFileNameFromUrl(resolvedUrl);
  const displayName = withExtension(sanitizeFileName(guessedName), resolvedUrl);
  const relativePath = `ignite-files/${Date.now()}/${displayName}`;

  let local: LocalCopy | null = null;
  try {
    local = await downloadToCache(resolvedUrl, relativePath, displayName);
  } catch (err) {
    console.warn("[safeOpenFile] could not cache file locally:", describeError(err));
  }

  if (!local) {
    // Nothing on disk to hand to a viewer — browser is the only option left.
    console.warn("[safeOpenFile] no local copy; falling back to browser");
    await safeOpenUrl(resolvedUrl);
    return;
  }

  const primaryType =
    normalizeMimeType(opts.mimeType) ||
    normalizeMimeType(local.serverContentType) ||
    guessMimeFromName(displayName);

  if (await openWithViewer(local.uri, primaryType)) return;

  // No viewer accepted the file. The share sheet still surfaces the real file
  // name and lets the user pick Files / Drive / another app — far better than
  // a browser tab showing the storage host name.
  if (await shareLocalFile(local.uri, displayName)) return;

  // Fall back to browser using the RESOLVED URL only — never the raw
  // private URL.
  console.warn("[safeOpenFile] viewer and share unavailable, falling back to browser");
  await safeOpenUrl(resolvedUrl);
}

/**
 * Download the remote file into the app cache. Tries the native downloader
 * first, then a fetch + write fallback (the same strategy downloadImage uses
 * because Filesystem.downloadFile is unreliable on some Android builds and
 * with some signed URLs). Throws only when every strategy fails.
 */
async function downloadToCache(
  url: string,
  relativePath: string,
  displayName: string,
): Promise<LocalCopy> {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");

  // Strategy 1: native download straight to disk.
  try {
    const dl = (await Filesystem.downloadFile({
      url,
      path: relativePath,
      directory: Directory.Cache,
      recursive: true,
    })) as { path?: string; uri?: string };
    let uri = dl?.path || dl?.uri || null;
    if (!uri) {
      uri = (await Filesystem.getUri({ path: relativePath, directory: Directory.Cache })).uri;
    }
    if (uri) {
      // Confirm bytes actually landed — some builds resolve with a path but
      // write nothing (e.g. HTTP errors swallowed by the native downloader).
      let size = -1;
      try {
        size = (await Filesystem.stat({ path: relativePath, directory: Directory.Cache })).size ?? -1;
      } catch {
        size = -1; // stat unsupported here; trust the downloader
      }
      if (size !== 0) return { uri, serverContentType: null };
    }
    console.warn("[safeOpenFile] native download produced no readable file; trying fetch");
  } catch (err) {
    console.warn("[safeOpenFile] Filesystem.downloadFile failed, trying fetch:", describeError(err));
  }

  // Strategy 2: fetch the bytes in the WebView and write them ourselves.
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch file (${response.status})`);
  const blob = await response.blob();
  const serverContentType =
    (blob.type || response.headers.get("content-type") || "").split(";")[0].trim() || null;
  const base64 = await blobToBase64(blob);

  const writeAt = async (path: string) => {
    const written = await Filesystem.writeFile({
      path,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    });
    return written.uri || (await Filesystem.getUri({ path, directory: Directory.Cache })).uri;
  };

  try {
    const uri = await writeAt(relativePath);
    if (uri) return { uri, serverContentType };
  } catch (err) {
    console.warn("[safeOpenFile] nested cache write failed, trying flat path:", describeError(err));
  }

  // Strategy 3: flat cache path (some Filesystem builds mishandle nested
  // directories). Keep the real name at the end so the viewer still shows it.
  const uri = await writeAt(`ignite-${Date.now()}-${displayName}`);
  if (!uri) throw new Error("Cache write produced no local path");
  return { uri, serverContentType };
}

/** Try the OS viewer with the specific type, then generically. */
async function openWithViewer(localPath: string, primaryType: string): Promise<boolean> {
  let FileOpener: { open: (o: { filePath: string; contentType?: string; openWithDefault?: boolean }) => Promise<void> };
  try {
    ({ FileOpener } = await import("@capacitor-community/file-opener"));
  } catch (err) {
    console.warn("[safeOpenFile] FileOpener unavailable:", describeError(err));
    return false;
  }

  try {
    await FileOpener.open({ filePath: localPath, contentType: primaryType, openWithDefault: true });
    return true;
  } catch (openErr) {
    // Some devices reject a specific content type but happily open the file
    // when asked generically.
    console.warn("[safeOpenFile] viewer rejected content type, retrying generically:", describeError(openErr));
  }

  try {
    await FileOpener.open({
      filePath: localPath,
      contentType: "application/octet-stream",
      openWithDefault: true,
    });
    return true;
  } catch (err) {
    console.warn("[safeOpenFile] generic viewer open failed:", describeError(err));
    return false;
  }
}

/** Offer the OS share sheet for the cached copy (keeps the real file name). */
async function shareLocalFile(localPath: string, title: string): Promise<boolean> {
  try {
    const { Share } = await import("@capacitor/share");
    await Share.share({ title, files: [localPath] });
    return true;
  } catch (err) {
    // User dismissing the sheet also rejects — that's still "handled".
    if (isUserCancel(err)) return true;
    console.warn("[safeOpenFile] share fallback failed:", describeError(err));
    return false;
  }
}

function isUserCancel(err: unknown): boolean {
  const msg = describeError(err).toLowerCase();
  return msg.includes("cancel") || msg.includes("dismiss");
}

function describeError(err: unknown): string {
  if (!err) return "unknown";
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && "message" in (err as Record<string, unknown>)) {
    return String((err as Record<string, unknown>).message);
  }
  return String(err);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.onloadend = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Accept only real MIME types ("type/subtype"). Vault records sometimes store
 * bare extensions ("pdf") in file_type, which native viewers reject.
 */
function normalizeMimeType(value?: string | null): string | null {
  const v = (value || "").trim().toLowerCase().split(";")[0].trim();
  if (!v || v === "application/octet-stream") return null;
  if (!/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(v)) return null;
  return v;
}

function guessFileNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop() || "file";
    return decodeURIComponent(last);
  } catch {
    return "file";
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "file";
}

function guessMimeFromName(name: string): string {
  const ext = (name.split(".").pop() || "").toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "ppt":
      return "application/vnd.ms-powerpoint";
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "csv":
      return "text/csv";
    case "txt":
      return "text/plain";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    case "mp4":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    case "mp3":
      return "audio/mpeg";
    case "zip":
      return "application/zip";
    default:
      return "application/octet-stream";
  }
}

/**
 * Ensure the local file keeps a sensible extension so the OS picks the right
 * viewer — falls back to the extension from the remote URL path.
 */
function withExtension(name: string, url: string): string {
  if (/\.[a-zA-Z0-9]{1,8}$/.test(name)) return name;
  const fromUrl = guessFileNameFromUrl(url);
  const m = fromUrl.match(/\.[a-zA-Z0-9]{1,8}$/);
  return m ? `${name}${m[0]}` : name;
}
````

## src/components/LegalPageEmbed.tsx (starting line 1)

````text
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { useEffect, useState } from "react";

interface LegalPageEmbedProps {
  title: string;
  websiteUrl: string;
}

export default function LegalPageEmbed({ title, websiteUrl }: LegalPageEmbedProps) {
  const navigate = useNavigate();
  const isNative = Capacitor.isNativePlatform();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // On web, redirect to the website directly
    if (!isNative) {
      window.location.href = websiteUrl;
    }
  }, [isNative, websiteUrl]);

  // On web, show nothing while redirecting
  if (!isNative) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div
        className="sticky top-0 z-10 bg-background border-b border-border px-4 pb-4 flex items-center gap-3"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 24px)" }}
      >
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>

      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <iframe
          src={websiteUrl}
          className="w-full h-full border-0"
          style={{ minHeight: "calc(100vh - 64px)" }}
          onLoad={() => setIsLoading(false)}
          title={title}
        />
      </div>
    </div>
  );
}
````

## src/hooks/useClubTheme.tsx (starting line 1)

````text
import { createContext, useContext, useEffect, useLayoutEffect, useState, useCallback, ReactNode } from "react";
import { useQuery, keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { purgeClubScopedQueryCache } from "@/lib/clubScopeCachePurge";
import { guardClubListResult, resetClubListEmptyGuard } from "@/lib/clubListEmptyGuard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { preloadLogo } from "@/components/ui/logo-image";
import { consumeAuthThemeHint } from "@/lib/authThemeHint";
import {
  clearAppliedNotificationClubSwitch,
  getAppliedNotificationClubSwitch,
} from "@/lib/notificationClubSwitch";


interface HSLColor {
  h: number;
  s: number;
  l: number;
}

interface ClubTheme {
  clubId: string;
  clubName: string;
  logoUrl: string | null;
  showLogoInHeader: boolean;
  showNameInHeader: boolean;
  logoOnlyMode: boolean;
  sport: string | null;
  // Light mode colors
  primary: HSLColor | null;
  secondary: HSLColor | null;
  accent: HSLColor | null;
  // Dark mode colors
  darkPrimary: HSLColor | null;
  darkSecondary: HSLColor | null;
  darkAccent: HSLColor | null;
}

// Cache structure - includes logoUrl for instant header display
interface CachedThemeData {
  clubId: string;
  clubName: string;
  logoUrl: string | null;
  showLogoInHeader: boolean;
  showNameInHeader: boolean;
  logoOnlyMode: boolean;
  sport: string | null;
  primary: HSLColor | null;
  secondary: HSLColor | null;
  accent: HSLColor | null;
  darkPrimary: HSLColor | null;
  darkSecondary: HSLColor | null;
  darkAccent: HSLColor | null;
}

// Helper to convert full theme to cacheable version (includes logoUrl for instant display)
const toCacheableTheme = (theme: ClubTheme): CachedThemeData => ({
  clubId: theme.clubId,
  clubName: theme.clubName,
  logoUrl: theme.logoUrl,
  showLogoInHeader: theme.showLogoInHeader,
  showNameInHeader: theme.showNameInHeader,
  logoOnlyMode: theme.logoOnlyMode,
  sport: theme.sport,
  primary: theme.primary,
  secondary: theme.secondary,
  accent: theme.accent,
  darkPrimary: theme.darkPrimary,
  darkSecondary: theme.darkSecondary,
  darkAccent: theme.darkAccent,
});

// Safe localStorage setter that handles quota errors
const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    // Quota exceeded - try to clear old theme data first
    console.warn('localStorage quota exceeded, clearing old theme data');
    try {
      // Clear all theme data keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith(STORAGE_KEY_PREFIX) || k.startsWith(STORAGE_DATA_KEY_PREFIX))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      // Retry
      localStorage.setItem(key, value);
    } catch {
      // Still failed - just skip caching
      console.warn('Failed to cache theme data');
    }
  }
};

interface FreeClubData {
  id: string;
  name: string;
  logo_url: string | null;
}

interface ClubThemeContextType {
  availableClubThemes: ClubTheme[];
  activeClubTheme: string | null; // club ID or null - also acts as content filter
  activeThemeData: ClubTheme | null;
  activeFreeClubData: FreeClubData | null;
  setActiveClubTheme: (clubId: string | null) => void;
  isLoading: boolean;
  isThemeReady: boolean; // True when theme loading from DB is complete
  // Club filter helpers - when a theme is active, content is filtered to that club
  activeClubFilter: string | null; // Same as activeClubTheme - for semantic clarity
  activeClubTeamIds: string[]; // Team IDs belonging to the active club (for filtering)
}

const ClubThemeContext = createContext<ClubThemeContextType>({
  availableClubThemes: [],
  activeClubTheme: null,
  activeThemeData: null,
  activeFreeClubData: null,
  setActiveClubTheme: () => {},
  isLoading: false,
  isThemeReady: false,
  activeClubFilter: null,
  activeClubTeamIds: [],
});

const STORAGE_KEY_PREFIX = "ignite-club-theme-";
const STORAGE_DATA_KEY_PREFIX = "ignite-club-theme-data-";
const NO_CLUB_THEME_SENTINEL = "__ignite_no_club__";

const getStorageKey = (userId: string) => `${STORAGE_KEY_PREFIX}${userId}`;
const getStorageDataKey = (userId: string) => `${STORAGE_DATA_KEY_PREFIX}${userId}`;
const isNoClubThemePreference = (value: string | null) => value === NO_CLUB_THEME_SENTINEL;

// Track last applied signature to avoid redundant CSS variable writes
let lastAppliedThemeSignature: string | null = null;

// Helper to clear ALL theme-related inline CSS properties from document root
const clearAllThemeCSS = () => {
  const root = document.documentElement;
  root.style.removeProperty("--primary");
  root.style.removeProperty("--primary-foreground");
  root.style.removeProperty("--secondary");
  root.style.removeProperty("--secondary-foreground");
  root.style.removeProperty("--accent");
  root.style.removeProperty("--accent-foreground");
  root.style.removeProperty("--ring");
  root.style.removeProperty("--rsvp-selected");
  root.style.removeProperty("--rsvp-selected-foreground");
  root.style.removeProperty("--background");
  root.style.removeProperty("--card");
  root.style.removeProperty("--card-foreground");
  root.style.removeProperty("--border");
  root.style.removeProperty("--input");
  root.style.removeProperty("--muted");
  root.style.removeProperty("--popover");
  root.style.removeProperty("--popover-foreground");
  // Reset throttle signature so next applyThemeCSS will run
  lastAppliedThemeSignature = null;
};

// Apply theme CSS from theme data based on current mode
const applyThemeCSS = (theme: ClubTheme | null, isDarkMode: boolean) => {
  const root = document.documentElement;

  // Build a stable signature representing the resolved theme + mode
  const signature = !theme || theme.logoOnlyMode
    ? `none|${isDarkMode}`
    : JSON.stringify({
        c: theme.clubId,
        d: isDarkMode,
        p: isDarkMode ? (theme.darkPrimary || theme.primary) : theme.primary,
        s: isDarkMode ? (theme.darkSecondary || theme.secondary) : theme.secondary,
        a: isDarkMode ? (theme.darkAccent || theme.accent) : theme.accent,
        lo: theme.logoOnlyMode,
      });

  // Skip if nothing changed since the last application
  if (signature === lastAppliedThemeSignature) {
    return;
  }
  lastAppliedThemeSignature = signature;

  if (!theme || theme.logoOnlyMode) {
    clearAllThemeCSS();
    return;
  }

  // Choose colors based on mode - fall back to light colors if dark not set
  const primary = isDarkMode ? (theme.darkPrimary || theme.primary) : theme.primary;
  const secondary = isDarkMode ? (theme.darkSecondary || theme.secondary) : theme.secondary;
  const accent = isDarkMode ? (theme.darkAccent || theme.accent) : theme.accent;

  if (primary) {
    const cssValue = `${primary.h} ${primary.s}% ${primary.l}%`;
    root.style.setProperty("--primary", cssValue);
    const fgL = primary.l > 50 ? 10 : 98;
    root.style.setProperty("--primary-foreground", `${primary.h} 10% ${fgL}%`);
    root.style.setProperty("--ring", cssValue);

    // RSVP "selected" state must follow the club identity too — otherwise the
    // Going / Maybe / Can't go buttons keep the default Ignite blue while the
    // rest of the card is club-branded.
    const rsvpL = Math.min(Math.max(primary.l, isDarkMode ? 44 : 34), isDarkMode ? 58 : 50);
    const rsvpS = Math.max(primary.s, 40);
    root.style.setProperty("--rsvp-selected", `${primary.h} ${rsvpS}% ${rsvpL}%`);
    root.style.setProperty("--rsvp-selected-foreground", `${primary.h} 10% ${rsvpL > 55 ? 12 : 98}%`);
  }


  if (secondary) {
    root.style.setProperty("--secondary", `${secondary.h} ${secondary.s}% ${secondary.l}%`);
    const fgL = secondary.l > 50 ? 20 : 90;
    root.style.setProperty("--secondary-foreground", `${secondary.h} 40% ${fgL}%`);
  }

  if (accent) {
    root.style.setProperty("--accent", `${accent.h} ${accent.s}% ${accent.l}%`);
    // Ensure strong contrast: dark foreground on light accents, light on dark accents
    // Use a wider threshold to handle mid-range lightness values
    const fgL = accent.l >= 45 ? 15 : 90;
    root.style.setProperty("--accent-foreground", `${accent.h} 50% ${fgL}%`);
  }

  // Club-themed light mode polish: apply subtle branded tints to background, cards, borders
  // This makes light mode feel more branded without changing layout or the default Ignite theme
  if (!isDarkMode && primary) {
    const h = primary.h;
    // Soft blue-grey/cool tinted page background
    root.style.setProperty("--background", `${h} 12% 95%`);
    // Cards slightly whiter than page background for separation
    root.style.setProperty("--card", `${h} 8% 99%`);
    root.style.setProperty("--card-foreground", `${h} 10% 10%`);
    // Subtly clearer borders
    root.style.setProperty("--border", `${h} 14% 82%`);
    root.style.setProperty("--input", `${h} 14% 82%`);
    // Tinted muted backgrounds
    root.style.setProperty("--muted", `${h} 10% 91%`);
    root.style.setProperty("--popover", `${h} 8% 98%`);
    root.style.setProperty("--popover-foreground", `${h} 10% 10%`);
  } else {
    // Dark mode or no club theme in light mode - restore defaults
    root.style.removeProperty("--background");
    root.style.removeProperty("--card");
    root.style.removeProperty("--card-foreground");
    root.style.removeProperty("--border");
    root.style.removeProperty("--input");
    root.style.removeProperty("--muted");
    root.style.removeProperty("--popover");
    root.style.removeProperty("--popover-foreground");
  }
};

export function ClubThemeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  // Safely access auth context - may not be available during HMR or initial render
  let user = null;
  let authLoading = true; // Assume loading until we know for sure
  try {
    const auth = useAuth();
    user = auth.user;
    authLoading = auth.loading;
  } catch (e) {
    // AuthProvider not yet available (HMR or render order issue)
    console.warn('[ClubThemeProvider] AuthProvider not available yet');
  }
  
  const { resolvedTheme } = useTheme();
  
  // CRITICAL: Read theme from DOM class first, then localStorage
  // During Google OAuth return, useAuth updates DOM class synchronously when profile is fetched,
  // but localStorage and next-themes may still have stale values from the previous user.
  // The DOM class is the authoritative source after auth updates it.
  const getEffectiveTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
      const isDarkClass = document.documentElement.classList.contains('dark');
      if (isDarkClass) return 'dark';
      if (document.documentElement.classList.contains('light')) return 'light';
      
      const stored = localStorage.getItem('app-theme');
      if (stored === 'dark' || stored === 'light') {
        return stored;
      }
    }
    return 'light';
  }, []);
  
  // REACTIVE dark mode state: track DOM class changes via MutationObserver
  // This ensures club theme CSS is immediately re-applied when theme toggles,
  // preventing the "washed out" flash on first toggle.
  const [isDarkMode, setIsDarkMode] = useState(() => getEffectiveTheme() === "dark");
  
  useEffect(() => {
    // Sync on mount
    setIsDarkMode(getEffectiveTheme() === "dark");
    
    const observer = new MutationObserver(() => {
      setIsDarkMode(getEffectiveTheme() === "dark");
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, [getEffectiveTheme]);

  // SYNCHRONOUS INITIALIZATION: Read from localStorage during initial state setup
  // This ensures theme is available immediately on first render, not after an effect
  const getInitialThemeState = (): { themeId: string | null; themeData: ClubTheme | null } => {
    if (typeof window === 'undefined' || !user?.id) {
      return { themeId: null, themeData: null };
    }
    
    const storedId = localStorage.getItem(getStorageKey(user.id));
    const storedData = localStorage.getItem(getStorageDataKey(user.id));
    
    if (isNoClubThemePreference(storedId)) {
      return { themeId: null, themeData: null };
    }

    if (storedId && storedData) {
      try {
        const parsedData = JSON.parse(storedData) as CachedThemeData;
        if (parsedData.clubId === storedId) {
          const themeFromCache: ClubTheme = { 
            ...parsedData, 
            logoUrl: parsedData.logoUrl ?? null, 
            sport: parsedData.sport ?? null 
          };
          // Apply theme CSS immediately during initialization
          // CRITICAL: Use getEffectiveTheme() instead of resolvedTheme here because
          // resolvedTheme is undefined during initial render before next-themes hydrates
          applyThemeCSS(themeFromCache, getEffectiveTheme() === "dark");
          return { themeId: storedId, themeData: themeFromCache };
        }
      } catch {
        // Invalid cache
      }
    }
    
    if (storedId) {
      return { themeId: storedId, themeData: null };
    }
    
    return { themeId: null, themeData: null };
  };

  // Use lazy initialization to read from localStorage synchronously
  const [activeClubTheme, setActiveClubThemeStateRaw] = useState<string | null>(() => {
    const pinned = getAppliedNotificationClubSwitch();
    if (pinned) return pinned;
    return getInitialThemeState().themeId;
  });

  /**
   * Guarded state setter.
   *
   * This provider re-asserts `activeClubTheme` from localStorage / the profile
   * row in several async bootstrap paths (fresh-login restore, the layout-effect
   * sync, the DB load, the CSS effect's fallback). On a notification tap for a
   * DIFFERENT club those late writes raced the switch and dragged the filter
   * back to the previously selected club — the app ended up showing a
   * Bridgewater thread while filtered to Basket Range.
   *
   * While a notification-driven switch is pinned (short TTL), no bootstrap path
   * may point the filter anywhere else. Explicit user selection via
   * `setActiveClubTheme` clears the pin first, so the club picker is unaffected.
   */
  const setActiveClubThemeState = (next: string | null) => {
    const pinned = getAppliedNotificationClubSwitch();
    if (pinned && next !== pinned) {
      console.log('[ClubTheme] ignoring bootstrap club write while notification switch is pinned', { next, pinned });
      return;
    }
    setActiveClubThemeStateRaw(next);
  };
  const [cachedThemeData, setCachedThemeData] = useState<ClubTheme | null>(() => {
    return getInitialThemeState().themeData;
  });

  // Track if we've checked for default theme for this user session
  const [hasCheckedDefault, setHasCheckedDefault] = useState(false);
  // Track if we're loading theme from database
  const [isLoadingFromDb, setIsLoadingFromDb] = useState(false);
  // Track if we've ever started the DB load for this user session
  const [hasStartedDbLoad, setHasStartedDbLoad] = useState(false);
  // Track the last user ID to detect user switches (e.g., Google OAuth to different account)
  const [lastUserId, setLastUserId] = useState<string | null>(null);
  // Track if we're in the middle of a user switch - prevents isThemeReady from being true prematurely
  const [isUserSwitching, setIsUserSwitching] = useState(false);
  // Track if cached theme was applied on fresh login - allows instant rendering without waiting for DB
  const [hasCacheAppliedOnLogin, setHasCacheAppliedOnLogin] = useState(false);

  // CRITICAL: Detect user switch and reset ALL theme state
  // Only clear cache on actual user SWITCH (different user ID), not fresh login (same user returning)
  // Fresh login: restore from localStorage cache for instant logo display
  useLayoutEffect(() => {
    const isFreshLogin = user?.id && !lastUserId;
    const isUserSwitch = user?.id && lastUserId && user.id !== lastUserId;
    
    if (isUserSwitch) {
      console.log('[ClubTheme] User switch detected, clearing theme state');
      setIsUserSwitching(true);
      setHasCacheAppliedOnLogin(false);
      clearAllThemeCSS();
      setActiveClubThemeState(null);
      setCachedThemeData(null);
      setHasCheckedDefault(false);
      setHasStartedDbLoad(false);
      setIsLoadingFromDb(true);
      
      // Clear localStorage for the OLD user's cache to prevent cross-contamination
      if (lastUserId) {
        localStorage.removeItem(getStorageKey(lastUserId));
        localStorage.removeItem(getStorageDataKey(lastUserId));
      }
    } else if (isFreshLogin) {
      console.log('[ClubTheme] Fresh login detected, restoring from cache if available');
      // On fresh login, try to restore from cache immediately for instant logo
      const storedId = localStorage.getItem(getStorageKey(user.id));
      const storedData = localStorage.getItem(getStorageDataKey(user.id));
      
      let cacheApplied = false;
      if (isNoClubThemePreference(storedId)) {
        setActiveClubThemeState(null);
        setCachedThemeData(null);
        localStorage.removeItem(getStorageDataKey(user.id));
        clearAllThemeCSS();
        cacheApplied = true;
      } else if (storedId && storedData) {
        try {
          const parsedData = JSON.parse(storedData) as CachedThemeData;
          if (parsedData.clubId === storedId) {
            const themeFromCache: ClubTheme = { 
              ...parsedData, 
              logoUrl: parsedData.logoUrl ?? null, 
              sport: parsedData.sport ?? null 
            };
            setActiveClubThemeState(storedId);
            setCachedThemeData(themeFromCache);
            applyThemeCSS(themeFromCache, getEffectiveTheme() === "dark");
            cacheApplied = true;
            
            // Preload the logo image so it's ready when the header renders.
            // Use LogoImage's shared cache so the visible <img> reuses the decoded entry
            // instead of issuing a fresh fetch + decode on mount.
            if (themeFromCache.logoUrl) {
              preloadLogo(themeFromCache.logoUrl);
            }
          }
        } catch {
          // Invalid cache, will be populated from DB
        }
      } else if (!storedId) {
        // No cached theme for this user = they use Ignite Mode, also instant-ready
        cacheApplied = true;
      }
      
      setHasCacheAppliedOnLogin(cacheApplied);
      setHasCheckedDefault(false);
      setHasStartedDbLoad(false);
      setIsLoadingFromDb(true);
    }
    
    // Update lastUserId after handling
    if (user?.id !== lastUserId) {
      setLastUserId(user?.id ?? null);
    }
  }, [user?.id, lastUserId]);

  // Re-read from localStorage when the authenticated user changes.
  // Use useLayoutEffect to ensure this runs synchronously before browser paint
  // This handles subsequent updates after initial render
  useLayoutEffect(() => {
    if (user?.id && typeof window !== "undefined") {
      const storedId = localStorage.getItem(getStorageKey(user.id));
      const storedData = localStorage.getItem(getStorageDataKey(user.id));
      
      // If localStorage has theme data for THIS user, sync state
      if (isNoClubThemePreference(storedId)) {
        setActiveClubThemeState(null);
        setCachedThemeData(null);
        localStorage.removeItem(getStorageDataKey(user.id));
        clearAllThemeCSS();
      } else if (storedId) {
        setActiveClubThemeState(storedId);
        
        if (storedData) {
          try {
            const parsedData = JSON.parse(storedData) as CachedThemeData;
            if (parsedData.clubId === storedId) {
              const themeFromCache: ClubTheme = { 
                ...parsedData, 
                logoUrl: parsedData.logoUrl ?? null, 
                sport: parsedData.sport ?? null 
              };
              setCachedThemeData(themeFromCache);
              applyThemeCSS(themeFromCache, isDarkMode);
            }
          } catch {
            // Invalid cache
          }
        }
      } else {
        // No cache for this user - clear any stale state
        setActiveClubThemeState(null);
        setCachedThemeData(null);
      }
    }
  }, [user?.id, isDarkMode]);

  // Ensure loading state is set when user becomes available (before DB fetch)
  useEffect(() => {
    if (user?.id && !hasStartedDbLoad) {
      setIsLoadingFromDb(true);
      setHasStartedDbLoad(true);
    }
    // Reset when user logs out
    if (!user?.id && hasStartedDbLoad) {
      setHasStartedDbLoad(false);
    }
  }, [user?.id, hasStartedDbLoad]);

  // Load theme preference from database for cross-device sync
  // The localStorage read is handled by the effect above (triggered by localStorageVersion)
  useEffect(() => {
    if (user?.id && typeof window !== "undefined") {
      const storedId = localStorage.getItem(getStorageKey(user.id));
      
      // Load theme preference from database (cross-device sync)
      const loadThemeFromDb = async () => {
        setIsLoadingFromDb(true);
        try {
          // Short-circuit the profiles round-trip when useAuth.fetchProfile
          // just retrieved active_club_theme_id during the SIGNED_IN gate.
          const hint = consumeAuthThemeHint(user.id);
          let data: { active_club_theme_id: string | null } | null = null;
          let error: unknown = null;
          if (hint) {
            data = { active_club_theme_id: hint.value };
          } else {
            const res = await supabase
              .from('profiles')
              .select('active_club_theme_id')
              .eq('id', user.id)
              .single();
            data = res.data as any;
            error = res.error;
          }

          if (!error && data) {
            // A notification tap is a newer, explicit user action than this
            // async profile read. If the read started before the tap, resolve
            // the remainder of this load against the pinned club instead of
            // restoring the old profile club's cache, CSS and localStorage.
            const notificationPinnedClub = getAppliedNotificationClubSwitch();
            if (notificationPinnedClub && data.active_club_theme_id !== notificationPinnedClub) {
              data = { active_club_theme_id: notificationPinnedClub };
            }
            const storedPreference = localStorage.getItem(getStorageKey(user.id));

            if (isNoClubThemePreference(storedPreference)) {
              // Same-device explicit "All Clubs" choice wins over any older DB value.
              // This prevents logout/login from resurrecting a previous club filter.
              if (data.active_club_theme_id) {
                supabase
                  .from('profiles')
                  .update({ active_club_theme_id: null })
                  .eq('id', user.id)
                  .then(({ error }) => {
                    if (error) console.error('Failed to sync no-club preference:', error);
                  });
              }
              localStorage.removeItem(getStorageDataKey(user.id));
              setActiveClubThemeState(null);
              setCachedThemeData(null);
              clearAllThemeCSS();
              setHasCheckedDefault(true);
              return;
            }

            if (storedPreference && storedPreference !== data.active_club_theme_id) {
              // Local selection is the last same-device action. If the user logs out
              // immediately after switching clubs, the DB update may not have won
              // the race; never let an older DB value select a different club.
              data = { active_club_theme_id: storedPreference };
              supabase
                .from('profiles')
                .update({ active_club_theme_id: storedPreference })
                .eq('id', user.id)
                .then(({ error }) => {
                  if (error) console.error('Failed to sync local club preference:', error);
                });
            }

            // We successfully fetched profile data
            if (data.active_club_theme_id) {
              // Database has a club theme preference - use it (overrides localStorage for cross-device sync)
              setActiveClubThemeState(data.active_club_theme_id);
              safeSetItem(getStorageKey(user.id), data.active_club_theme_id);
              // User has explicit preference - don't auto-set
              setHasCheckedDefault(true);
              
              // Check if we have FRESH localStorage data that matches the DB preference
              const freshStoredData = localStorage.getItem(getStorageDataKey(user.id));
              let themeApplied = false;
              
              if (freshStoredData) {
                try {
                  const parsedData = JSON.parse(freshStoredData) as CachedThemeData;
                  // Only use cached data if it matches the club ID from database
                  if (parsedData.clubId === data.active_club_theme_id) {
                    const themeFromCache: ClubTheme = { 
                      ...parsedData, 
                      logoUrl: parsedData.logoUrl ?? null, 
                      sport: parsedData.sport ?? null 
                    };
                    setCachedThemeData(themeFromCache);
                    applyThemeCSS(themeFromCache, isDarkMode);
                    themeApplied = true;
                  }
                } catch {
                  // Invalid cache, will fetch from server
                }
              }
              
              // If no valid cache or cache didn't match, fetch from server
              if (!themeApplied) {
                const { data: clubData } = await supabase
                  .from('clubs')
                  .select(`
                    id, name, logo_url, show_logo_in_header, show_name_in_header, logo_only_mode, sport,
                    theme_primary_h, theme_primary_s, theme_primary_l,
                    theme_dark_primary_h, theme_dark_primary_s, theme_dark_primary_l,
                    theme_secondary_h, theme_secondary_s, theme_secondary_l,
                    theme_dark_secondary_h, theme_dark_secondary_s, theme_dark_secondary_l,
                    theme_accent_h, theme_accent_s, theme_accent_l,
                    theme_dark_accent_h, theme_dark_accent_s, theme_dark_accent_l
                  `)
                  .eq('id', data.active_club_theme_id)
                  .single();
                
                if (clubData) {
                  const themeData: ClubTheme = {
                    clubId: clubData.id,
                    clubName: clubData.name,
                    logoUrl: clubData.logo_url,
                    showLogoInHeader: clubData.show_logo_in_header ?? false,
                    showNameInHeader: clubData.show_name_in_header ?? true,
                    logoOnlyMode: clubData.logo_only_mode ?? false,
                    sport: clubData.sport,
                    primary: clubData.theme_primary_h !== null ? { h: clubData.theme_primary_h, s: clubData.theme_primary_s!, l: clubData.theme_primary_l! } : null,
                    secondary: clubData.theme_secondary_h !== null ? { h: clubData.theme_secondary_h, s: clubData.theme_secondary_s!, l: clubData.theme_secondary_l! } : null,
                    accent: clubData.theme_accent_h !== null ? { h: clubData.theme_accent_h, s: clubData.theme_accent_s!, l: clubData.theme_accent_l! } : null,
                    darkPrimary: clubData.theme_dark_primary_h !== null ? { h: clubData.theme_dark_primary_h, s: clubData.theme_dark_primary_s!, l: clubData.theme_dark_primary_l! } : null,
                    darkSecondary: clubData.theme_dark_secondary_h !== null ? { h: clubData.theme_dark_secondary_h, s: clubData.theme_dark_secondary_s!, l: clubData.theme_dark_secondary_l! } : null,
                    darkAccent: clubData.theme_dark_accent_h !== null ? { h: clubData.theme_dark_accent_h, s: clubData.theme_dark_accent_s!, l: clubData.theme_dark_accent_l! } : null,
                  };
                  console.log('[ClubTheme] DB load complete - applying theme CSS:', {
                    clubId: themeData.clubId,
                    primary: themeData.primary,
                    darkPrimary: themeData.darkPrimary,
                    isDarkMode,
                    logoOnlyMode: themeData.logoOnlyMode,
                  });
                  safeSetItem(getStorageDataKey(user.id), JSON.stringify(toCacheableTheme(themeData)));
                  setCachedThemeData(themeData);
                  applyThemeCSS(themeData, isDarkMode);
                  // Preload logo image for instant header display
                  if (themeData.logoUrl) { const img = new Image(); img.src = themeData.logoUrl; }
                  console.log('[ClubTheme] Applied theme CSS from DB load');
                }
              }
            } else {
              // Database has null/undefined active_club_theme_id.
              // Only write the explicit "no club" sentinel when the user
              // previously had a real club selected on this device (i.e.
              // localStorage already had a value). For brand-new users
              // (storedPreference === null) we must NOT pin them to the
              // sentinel — the invite-accept flow on CompleteProfilePage
              // is about to seed their active club from the invite, and
              // a sentinel here would race it and win.
              const hadPriorPreference = storedPreference !== null;
              if (hadPriorPreference) {
                console.log('[ClubTheme] DB has no active club theme - syncing local sentinel to match');
                safeSetItem(getStorageKey(user.id), NO_CLUB_THEME_SENTINEL);
                localStorage.removeItem(getStorageDataKey(user.id));
              } else {
                console.log('[ClubTheme] DB has no active club theme and no local preference - leaving unset for invite seeding');
              }
              setActiveClubThemeState(null);
              setCachedThemeData(null);
              setHasCheckedDefault(true);
            }
          } else if (storedId) {
            // Have localStorage but failed to fetch DB - use localStorage, don't auto-set
            setHasCheckedDefault(true);
          }
          // If no data and no storedId, hasCheckedDefault stays false and auto-set may occur
        } catch (err) {
          console.error('Failed to load club theme from database:', err);
        } finally {
          setIsLoadingFromDb(false);
          setIsUserSwitching(false); // Clear switching flag - theme is now ready
        }
      };
      
      loadThemeFromDb();
    }
  }, [user?.id, isDarkMode]);


  // Clear theme CSS on logout (but keep localStorage preference for re-login)
  useEffect(() => {
    if (!user) {
      setActiveClubThemeState(null);
      // Clear CSS variables but DON'T remove localStorage - restore on re-login
      clearAllThemeCSS();
      // Drop the empty-guard bookkeeping so the next user starts clean.
      resetClubListEmptyGuard();
    }
  }, [user]);


  // Fetch all Pro clubs that the user belongs to with custom themes.
  // Resilience: throw on Supabase errors + `keepPreviousData` so a transient
  // reconnect refetch (partial embed, RLS hiccup, network blip) never
  // overwrites a good cached list with an empty one — that was previously
  // causing the club selector to disappear + theme to drop after coming back
  // online.
  const { data: availableClubThemes = [], isLoading, isSuccess: isClubThemesSuccess, isError: isClubThemesError } = useQuery({
    queryKey: ["club-themes", user?.id],
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user?.id) return [];

      // Get user's clubs through their roles
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("club_id")
        .eq("user_id", user.id)
        .not("club_id", "is", null);

      if (rolesError) throw rolesError;
      const clubIds = [...new Set((userRoles || []).map(r => r.club_id).filter(Boolean))];

      // Also get clubs from teams
      const { data: teamRoles, error: teamRolesError } = await supabase
        .from("user_roles")
        .select("team_id, teams!inner(club_id)")
        .eq("user_id", user.id)
        .not("team_id", "is", null);
      if (teamRolesError) throw teamRolesError;

      if (teamRoles) {
        teamRoles.forEach(r => {
          const teamClubId = (r.teams as any)?.club_id;
          if (teamClubId && !clubIds.includes(teamClubId)) {
            clubIds.push(teamClubId);
          }
        });
      }

      if (!clubIds.length) return guardClubListResult(`club-themes:${user.id}`, []);

      // Fetch clubs with theme settings (left join on subscriptions)
      const { data: clubs, error: clubsError } = await supabase
        .from("clubs")
        .select(`
          id,
          name,
          logo_url,
          show_logo_in_header,
          show_name_in_header,
          logo_only_mode,
          sport,
          is_pro,
          theme_enabled,
          theme_primary_h,
          theme_primary_s,
          theme_primary_l,
          theme_secondary_h,
          theme_secondary_s,
          theme_secondary_l,
          theme_accent_h,
          theme_accent_s,
          theme_accent_l,
          theme_dark_primary_h,
          theme_dark_primary_s,
          theme_dark_primary_l,
          theme_dark_secondary_h,
          theme_dark_secondary_s,
          theme_dark_secondary_l,
          theme_dark_accent_h,
          theme_dark_accent_s,
          theme_dark_accent_l,
          club_subscriptions(is_pro, is_pro_football, expires_at)
        `)
        .in("id", clubIds)
        .is("deleted_at", null);

      if (clubsError) throw clubsError;
      if (!clubs) return [];

      // Filter to only Pro clubs with theme data that have theme enabled
      return guardClubListResult(`club-themes:${user.id}`, clubs
        .filter(club => {
          // Handle both array and single object subscription data
          const subs = club.club_subscriptions as any;
          const sub = Array.isArray(subs) && subs.length > 0 ? subs[0] : 
                     (subs && !Array.isArray(subs) ? subs : null);
          const hasProFromSub = sub && (sub.is_pro || sub.is_pro_football) && 
            (!sub.expires_at || new Date(sub.expires_at) > new Date());
          // Check club.is_pro flag directly (synced by trigger)
          const hasPro = club.is_pro === true || hasProFromSub === true;
          const hasTheme = club.theme_primary_h !== null;
          const themeEnabled = (club as any).theme_enabled !== false; // Default to true
          return hasPro && hasTheme && themeEnabled;
        })
        .map(club => ({
          clubId: club.id,
          clubName: club.name,
          logoUrl: club.logo_url,
          showLogoInHeader: club.show_logo_in_header ?? false,
          showNameInHeader: club.show_name_in_header ?? true,
          logoOnlyMode: club.logo_only_mode ?? false,
          sport: club.sport,
          primary: club.theme_primary_h !== null ? {
            h: club.theme_primary_h!,
            s: club.theme_primary_s!,
            l: club.theme_primary_l!,
          } : null,
          secondary: club.theme_secondary_h !== null ? {
            h: club.theme_secondary_h!,
            s: club.theme_secondary_s!,
            l: club.theme_secondary_l!,
          } : null,
          accent: club.theme_accent_h !== null ? {
            h: club.theme_accent_h!,
            s: club.theme_accent_s!,
            l: club.theme_accent_l!,
          } : null,
          darkPrimary: club.theme_dark_primary_h !== null ? {
            h: club.theme_dark_primary_h!,
            s: club.theme_dark_primary_s!,
            l: club.theme_dark_primary_l!,
          } : null,
          darkSecondary: club.theme_dark_secondary_h !== null ? {
            h: club.theme_dark_secondary_h!,
            s: club.theme_dark_secondary_s!,
            l: club.theme_dark_secondary_l!,
          } : null,
          darkAccent: club.theme_dark_accent_h !== null ? {
            h: club.theme_dark_accent_h!,
            s: club.theme_dark_accent_s!,
            l: club.theme_dark_accent_l!,
          } : null,
        })));

    },
    retry: 3,
    enabled: !!user?.id,
  });

  // ALL clubs the user belongs to (Pro + free) — used to validate active club
  // selections that aren't themed and to display free club names in the header.
  const { data: userClubs = [], isLoading: isUserClubsLoading, isSuccess: isUserClubsSuccess }= useQuery<{ id: string; name: string; logo_url: string | null }[]>({
    queryKey: ["user-clubs-for-switcher", user?.id],
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user?.id) return [];
      const [rolesRes, teamRolesRes] = await Promise.all([
        supabase.from("user_roles").select("club_id").eq("user_id", user.id).not("club_id", "is", null),
        supabase.from("user_roles").select("teams!inner(club_id)").eq("user_id", user.id).not("team_id", "is", null),
      ]);
      // Propagate errors so react-query keeps prior data on a transient
      // reconnect failure — otherwise the club dropdown briefly empties out.
      if (rolesRes.error) throw rolesRes.error;
      if (teamRolesRes.error) throw teamRolesRes.error;
      const ids = new Set<string>();
      (rolesRes.data || []).forEach((r: any) => r.club_id && ids.add(r.club_id));
      (teamRolesRes.data || []).forEach((r: any) => {
        const cid = r.teams?.club_id;
        if (cid) ids.add(cid);
      });
      if (!ids.size) return guardClubListResult(`user-clubs:${user.id}`, []);
      const { data: clubs, error: clubsError } = await supabase
        .from("clubs")
        .select("id, name, logo_url")
        .in("id", Array.from(ids))
        .is("deleted_at", null);
      if (clubsError) throw clubsError;
      return guardClubListResult(
        `user-clubs:${user.id}`,
        (clubs || []).map(c => ({ id: c.id, name: c.name, logo_url: c.logo_url })),
      );
    },
    retry: 3,
    enabled: !!user?.id,

  });

  // Establish an explicit default for users who haven't set a preference yet.
  // Never auto-pick the first available club: multi-club users must not come
  // back from logout with a different club selected just because ordering or
  // DB/local cache hydration changed.
  useEffect(() => {
    if (!user?.id || hasCheckedDefault || isLoading || isLoadingFromDb) return;
    
    // Check if user has any stored preference (including explicit "none")
    const hasStoredPreference = localStorage.getItem(getStorageKey(user.id)) !== null;
    
    if (!hasStoredPreference) {
      safeSetItem(getStorageKey(user.id), NO_CLUB_THEME_SENTINEL);
      localStorage.removeItem(getStorageDataKey(user.id));
      setActiveClubThemeState(null);
      setCachedThemeData(null);
      clearAllThemeCSS();
    }
    
    setHasCheckedDefault(true);
  }, [user?.id, isLoading, isLoadingFromDb, hasCheckedDefault]);

  const setActiveClubTheme = (clubId: string | null) => {
    // Explicit selection (club picker, or an applied notification switch) is
    // always authoritative: drop any pin so it cannot block this write, then
    // set state directly rather than through the guarded setter.
    const pinned = getAppliedNotificationClubSwitch();
    if (pinned && pinned !== clubId) clearAppliedNotificationClubSwitch();
    const changed = clubId !== activeClubTheme;
    setActiveClubThemeStateRaw(clubId);
    // Drop every club-scoped cache entry so the previous club's teams, chats,
    // events, media and vault rows cannot paint under the new club's chrome.
    if (changed) purgeClubScopedQueryCache(queryClient);
    if (user?.id) {
      const key = getStorageKey(user.id);
      const dataKey = getStorageDataKey(user.id);
      if (clubId) {
        safeSetItem(key, clubId);
        // Also cache the theme data for instant loading
        const themeData = availableClubThemes.find(t => t.clubId === clubId);
        if (themeData) {
          safeSetItem(dataKey, JSON.stringify(toCacheableTheme(themeData)));
          setCachedThemeData(themeData);
        } else {
          // Free / non-themed club — keep selection as active filter but clear theme overrides
          localStorage.removeItem(dataKey);
          setCachedThemeData(null);
          clearAllThemeCSS();
        }
      } else {
        safeSetItem(key, NO_CLUB_THEME_SENTINEL);
        localStorage.removeItem(dataKey);
        setCachedThemeData(null);
        clearAllThemeCSS();
      }
      
      // Save preference to database for cross-device sync
      supabase
        .from('profiles')
        .update({ active_club_theme_id: clubId })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) console.error('Failed to save club theme preference:', error);
        });
    }
  };

  // Apply theme CSS variables - only when user is logged in
  // Re-apply when dark/light mode changes
  useEffect(() => {
    const root = document.documentElement;

    // CRITICAL: Don't do anything while loading from DB or switching users
    // This prevents race condition where CSS is cleared before DB load completes
    if (isLoadingFromDb || isUserSwitching) {
      console.log('[ClubTheme] Skipping CSS effect - still loading/switching');
      return;
    }

    // Don't apply theme if not logged in
    if (!user) {
      clearAllThemeCSS();
      return;
    }

    // CRITICAL: Don't clear CSS if localStorage has theme data that React state hasn't caught up with yet
    // This prevents race condition where CompleteProfilePage sets theme but state hasn't updated
    if (!activeClubTheme) {
      // Check localStorage before clearing - might have theme data that state hasn't synced yet
      const storedId = localStorage.getItem(getStorageKey(user.id));
      const storedData = localStorage.getItem(getStorageDataKey(user.id));
      
      if (storedId && storedData) {
        // localStorage has theme data - apply it instead of clearing
        try {
          const parsedData = JSON.parse(storedData) as CachedThemeData;
          if (parsedData.clubId === storedId && parsedData.primary) {
            // Apply the cached theme instead of clearing
            const themeFromCache: ClubTheme = { 
              ...parsedData, 
              logoUrl: parsedData.logoUrl ?? null, 
              sport: parsedData.sport ?? null 
            };
            applyThemeCSS(themeFromCache, isDarkMode);
            // Update state to sync with localStorage
            setActiveClubThemeState(storedId);
            setCachedThemeData(themeFromCache);
            return;
          }
        } catch {
          // Invalid cache, fall through to clear
        }
      }
      
      // No localStorage data - safe to clear theme overrides
      clearAllThemeCSS();
      return;
    }

    // Try to find theme from server data first
    const theme = availableClubThemes.find(t => t.clubId === activeClubTheme);

    // Fall back to cached theme ONLY while the server query has not yet
    // succeeded — this keeps the theme visible on cold-start before the query
    // resolves. Once the query has succeeded and the club is not in the themed
    // (Pro) list, we must NOT apply cached colours: doing so would let a free
    // club keep Pro branding after a downgrade / trial expiry.
    const canUseCache = !isClubThemesSuccess;
    const themeToApply = theme || (canUseCache ? cachedThemeData : null);

    if (!themeToApply) {
      // If server data is loaded and this club isn't themed, clear overrides.
      if (isClubThemesSuccess && !availableClubThemes.some(t => t.clubId === activeClubTheme)) {
        clearAllThemeCSS();
      }
      return;
    }


    // Skip applying colors if logo-only mode is enabled
    if (themeToApply.logoOnlyMode) {
      clearAllThemeCSS();
      return;
    }

    // DEBUG: Log what we're applying
    console.log('[ClubTheme] CSS effect applying theme:', {
      source: theme ? 'availableClubThemes' : 'cachedThemeData',
      clubId: themeToApply.clubId,
      isDarkMode,
      primary: themeToApply.primary,
      darkPrimary: themeToApply.darkPrimary,
      resolvedTheme,
    });

    applyThemeCSS(themeToApply, isDarkMode);
  }, [activeClubTheme, availableClubThemes, cachedThemeData, user, isDarkMode, isLoadingFromDb, isUserSwitching, resolvedTheme, isClubThemesSuccess]);

  // Validate theme data only. This must never change activeClubTheme: the club
  // filter is user-controlled and can only be changed through setActiveClubTheme.
  useEffect(() => {
    if (!activeClubTheme) return;
    // Wait until the themed-clubs query has finished — otherwise we'd evict
    // a still-valid themed cache before server data arrives.
    if (isLoading || isUserClubsLoading) return;
    // CRITICAL: Only evict when BOTH queries have actually succeeded with data.
    // If either query errored (e.g. transient network drop after token refresh),
    // `availableClubThemes` is the default empty array — evicting here would
    // permanently wipe the theme until app restart. Bail out and let the next
    // successful refetch (on reconnect) re-validate.
    if (!isClubThemesSuccess || !isUserClubsSuccess) return;
    if (isClubThemesError) return;
    const inThemed = availableClubThemes.some(t => t.clubId === activeClubTheme);

    if (!inThemed) {
      // Club is not in the themed (Pro + theme_enabled) list. Even if the user
      // still owns the club (free plan or theme disabled), we must evict any
      // stale cached theme so free clubs don't keep Pro colours after a
      // downgrade / trial expiry. The apply-effect above already refuses to
      // fall back to cache once the themed query succeeded, but we also drop
      // the persisted cache here to keep localStorage consistent.


      // Club is free/non-themed/inaccessible for theme rendering.
      // Evict any stale themed cache so the header drops the logo + colours
      // and renders the free-club branch (name only, default Ignite icon).
      if (cachedThemeData) {
        setCachedThemeData(null);
        clearAllThemeCSS();
        if (user?.id) {
          localStorage.removeItem(getStorageDataKey(user.id));
        }
      }
    }
  }, [activeClubTheme, availableClubThemes, userClubs, isLoading, isUserClubsLoading, isClubThemesSuccess, isUserClubsSuccess, isClubThemesError, cachedThemeData, user?.id]);

  // Cache theme data when server data becomes available
  useEffect(() => {
    if (user?.id && activeClubTheme && availableClubThemes.length > 0) {
      const serverTheme = availableClubThemes.find(t => t.clubId === activeClubTheme);
      if (serverTheme) {
        safeSetItem(getStorageDataKey(user.id), JSON.stringify(toCacheableTheme(serverTheme)));
        setCachedThemeData(serverTheme);
      }
    }
  }, [user?.id, activeClubTheme, availableClubThemes]);

  // Use server data if available. Fall back to cached data whenever the
  // themed-clubs query hasn't produced a match — this covers both the initial
  // load AND background refetches after reconnect where a transient partial
  // response can briefly drop the active club from `availableClubThemes`.
  // The eviction effect above is the only path that clears `cachedThemeData`
  // when the club is genuinely gone (missing from userClubs too).
  const serverThemeMatch = activeClubTheme
    ? availableClubThemes.find(t => t.clubId === activeClubTheme) ?? null
    : null;
  const matchingCachedTheme = cachedThemeData?.clubId === activeClubTheme
    ? cachedThemeData
    : null;
  const activeThemeData = activeClubTheme
    ? serverThemeMatch ?? matchingCachedTheme
    : null;

  // Free club data: when a club is selected but has no theme (Pro + theme required)
  const activeFreeClubData = activeClubTheme && !activeThemeData
    ? userClubs.find(c => c.id === activeClubTheme) ?? null
    : null;

  // Pre-warm the club logo decode cache the instant we know the URL.
  // The header consults the same module-level cache, so when AppHeader
  // mounts after login the logo paints synchronously instead of flashing
  // in after a network round-trip + decode.
  useEffect(() => {
    const url = activeThemeData?.logoUrl;
    if (url) {
      void import("@/components/ui/logo-image").then(({ preloadLogo }) => preloadLogo(url));
    }
    // Also warm any other available club logos so switching clubs is instant.
    availableClubThemes.forEach((t) => {
      if (t.logoUrl) {
        void import("@/components/ui/logo-image").then(({ preloadLogo }) => preloadLogo(t.logoUrl!));
      }
    });
  }, [activeThemeData?.logoUrl, availableClubThemes]);

  // Fetch teams belonging to the active club (for content filtering)
  const { data: activeClubTeamIds = [] } = useQuery({
    queryKey: ["active-club-teams", activeClubTheme],
    queryFn: async () => {
      if (!activeClubTheme) return [];
      const { data, error } = await supabase
        .from("teams")
        .select("id")
        .eq("club_id", activeClubTheme);
      if (error) return [];
      return data.map(t => t.id);
    },
    enabled: !!activeClubTheme,
    staleTime: 300000, // Cache for 5 minutes
  });

  // Theme is ready when:
  // - Auth is DONE loading AND there's no user (truly anonymous) - no theme to load
  // - OR user exists AND we have valid cached theme data in state (from localStorage)
  // - OR user exists AND we've started AND finished loading from DB
  // This prevents flash of default theme on first login
  // CRITICAL: We must wait for auth to finish loading before claiming "no user"
  // CRITICAL: During user switch/fresh login, we must wait until isUserSwitching is cleared
  // CRITICAL: hasLocalThemeData should only be trusted when NOT user switching
  const hasLocalThemeData = activeClubTheme !== null && cachedThemeData !== null;
  const dbLoadComplete = hasStartedDbLoad && !isLoadingFromDb;
  // Only trust cached data if we're not switching users - otherwise wait for DB
  const themeIsReady = !isUserSwitching && (
    (!authLoading && !user?.id) || // No user - no theme to load
    dbLoadComplete || // DB load is complete - theme is authoritative
    hasCacheAppliedOnLogin || // Fresh login with cached theme applied - render instantly
    (!isLoadingFromDb && hasLocalThemeData && !authLoading) // Have cache AND not loading
  );
  
  // Debug logging for theme readiness
  if (typeof window !== 'undefined' && user?.id) {
    console.log('[ClubTheme] Ready check:', {
      isUserSwitching,
      authLoading,
      hasLocalThemeData,
      dbLoadComplete,
      isLoadingFromDb,
      hasStartedDbLoad,
      themeIsReady,
      activeClubTheme,
      hasCachedData: !!cachedThemeData,
    });
  }

  return (
    <ClubThemeContext.Provider value={{
      availableClubThemes,
      activeClubTheme,
      activeThemeData,
      activeFreeClubData,
      setActiveClubTheme,
      isLoading,
      isThemeReady: themeIsReady,
      activeClubFilter: activeClubTheme,
      activeClubTeamIds,
    }}>
      {children}
    </ClubThemeContext.Provider>
  );
}

export function useClubTheme() {
  return useContext(ClubThemeContext);
}

/**
 * Synchronously check localStorage for cached club theme data.
 * Use this for initial render to prevent gradient flash before React hydrates.
 * Returns true if user has an active club theme cached.
 */
export function hasClubThemeCached(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // Check for any cached theme data - means user has club theme active
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_DATA_KEY_PREFIX)) {
        const data = localStorage.getItem(key);
        if (data) return true;
      }
    }
  } catch {
    // localStorage not available
  }
  return false;
}
````

## src/hooks/useAuth.tsx (starting line 1)

````text
import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { useQueryClient, onlineManager } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToPushNotifications } from "@/lib/pushNotifications";
import { prefetchUserData } from "@/lib/prefetchData";
import { clearProfileCache } from "@/lib/profileCache";
import { clearRolesCache } from "@/lib/rolesCache";
import { clearClubTeamCache } from "@/lib/clubTeamCache";
import { clearUserScopedCaches } from "@/lib/clearUserScopedCaches";
import { revokeAllForUser } from "@/lib/realtimeChannelRegistry";
import { setAuthThemeHint } from "@/lib/authThemeHint";
import { mark as coldMark } from "@/lib/coldStartMarks";


import { syncPasskeyAccountsFromDatabase } from "@/hooks/usePasskey";
import { MESSAGE_NOTIFICATION_TYPES } from "@/lib/notificationTypes";
import { fetchUnreadMessageCounts, getTotalUnreadMessageCount } from "@/lib/unreadMessageCounts";
import { markProfileCompleted } from "@/components/InviteFlowProgress";
import { isNativePlatform, unregisterNativePush } from "@/lib/nativePush";
import { isTransientAuthFailure } from "@/lib/authRecoveryClassification";
import { refreshSessionOnce } from "@/lib/refreshSessionOnce";


interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  ignite_points: number;
  theme_preference: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  profileError: boolean;
  initialized: boolean; // True only after first auth check completes
  /** 'restoring' until the stored session has been resolved one way or the other. */
  sessionRestoration: "restoring" | "authenticated" | "signed_out";
  profileResolved: boolean; // True only after profile has been fetched from server at least once
  unreadCount: number;
  unreadMessagesCount: number;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  clearUnreadCount: () => void;
  decrementUnreadCount: (n: number) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PROFILE_CACHE_KEY = 'ignite_cached_profile';

interface CachedProfileData {
  profile: Profile;
  userId: string;
  cachedAt: number;
}

// Profile cache now includes userId to prevent cross-user cache collisions
function getCachedProfile(userId?: string): Profile | null {
  try {
    const cached = localStorage.getItem(PROFILE_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached) as CachedProfileData;
      // CRITICAL: Only return cache if userId matches
      // This prevents stale cache from wrong user causing login issues
      if (userId && data.userId !== userId) {
        console.log('[Auth] Cached profile userId mismatch, clearing stale cache');
        localStorage.removeItem(PROFILE_CACHE_KEY);
        return null;
      }
      // Also validate cache structure has expected fields
      if (data.profile && data.profile.id) {
        return data.profile;
      }
      // Legacy format - clear it
      localStorage.removeItem(PROFILE_CACHE_KEY);
    }
  } catch {
    // Ignore parse errors, clear invalid cache
    localStorage.removeItem(PROFILE_CACHE_KEY);
  }
  return null;
}

// Get cached profile with its userId for validation
function getCachedProfileWithUser(): { profile: Profile; userId: string } | null {
  try {
    const cached = localStorage.getItem(PROFILE_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached) as CachedProfileData;
      if (data.profile && data.profile.id && data.userId) {
        return { profile: data.profile, userId: data.userId };
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
}

// SYNCHRONOUS initialization: Check if we have a valid cached profile with display_name
// This runs ONCE at module load time to determine initial state
function getInitialAuthState(): { 
  profile: Profile | null; 
  initialized: boolean; 
  loading: boolean; 
  profileLoading: boolean;
  cachedUserId: string | null;
} {
  const cached = getCachedProfileWithUser();
  if (cached && cached.profile.display_name) {
    // We have a complete cached profile - start as "ready"
    // The async session check will validate this is still correct
    return {
      profile: cached.profile,
      initialized: true,
      loading: false,
      profileLoading: false,
      cachedUserId: cached.userId,
    };
  }
  // No valid cache - need to wait for async check
  return {
    profile: null,
    initialized: false,
    loading: true,
    profileLoading: true,
    cachedUserId: null,
  };
}

// Compute initial state once at module load
const initialAuthState = getInitialAuthState();

function setCachedProfile(profile: Profile | null, userId?: string) {
  try {
    if (profile && userId) {
      const cacheData: CachedProfileData = {
        profile,
        userId,
        cachedAt: Date.now(),
      };
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cacheData));
    } else {
      localStorage.removeItem(PROFILE_CACHE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const waitForSessionUser = useCallback(async (expectedUserId: string, maxAttempts = 8): Promise<Session | null> => {
    const stop = () => {};
    try {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const { data, error } = await supabase.auth.getSession();
          const session = data.session;

          if (!error && session?.user?.id === expectedUserId && session.access_token) {
            return session;
          }
        } catch {
          // Ignore transient session restore errors while polling
        }

        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 120 * attempt));
        }
      }
      return null;
    } finally {
      stop();
    }
  }, []);
  
  // SYNCHRONOUS HYDRATION: Use pre-computed initial state from cache
  // This eliminates flash by starting with cached profile if available
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(initialAuthState.profile);
  const [loading, setLoading] = useState(initialAuthState.loading);
  const [profileLoading, setProfileLoading] = useState(initialAuthState.profileLoading);
  const [profileError, setProfileError] = useState(false);
  const [initialized, setInitialized] = useState(initialAuthState.initialized);
  // sessionRestoration distinguishes "we haven't finished restoring the stored
  // session yet" from "there is definitively no session". Without it, a cold
  // start with a cached profile reports initialized=true / user=null for a few
  // hundred ms and route guards flash the login screen before the restored
  // session lands (notification cold start was the worst offender).
  const [sessionRestoration, setSessionRestoration] =
    useState<"restoring" | "authenticated" | "signed_out">("restoring");
  // Cold-start instrumentation: fire the `auth_ready` mark exactly once
  // when `initialized` first flips true, regardless of which of the ~10
  // setInitialized(true) sites triggered it.
  useEffect(() => {
    if (initialized) coldMark("auth_ready");
  }, [initialized]);
  // profileResolved: true once the profile has been fetched from the server at least once
  // for the current session. Prevents routing to /complete-profile based on stale/missing cache.
  const [profileResolved, setProfileResolved] = useState(!!initialAuthState.profile?.display_name);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  // Track the cached userId we started with (for validation)
  const [cachedUserId] = useState(initialAuthState.cachedUserId);

  // Flag to track if this is a fresh login (not a page refresh)
  const [isFreshLogin, setIsFreshLogin] = useState(false);
  
  // Ref to track the current user ID for use inside stable callbacks
  const currentUserIdRef = useRef<string | null>(null);

  // CRITICAL FIX: applyTheme is now a direct parameter, not dependent on React state
  // This avoids stale closure issues during Google OAuth where isFreshLogin state
  // wasn't available in the callback at the right time
  const fetchProfile = useCallback(async (userId: string, retries = 5, applyTheme = false, retryOnMissing = false): Promise<Profile | null> => {
    setProfileError(false);
    const maxMissingProfileAttempts = retryOnMissing ? retries : 1;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Create a timeout promise to prevent hanging - increased to 15s for slow connections
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 15000)
        );
        
        const fetchPromise = supabase
          .from("profiles")
          .select("id, display_name, avatar_url, ignite_points, theme_preference, events_view_mode, active_club_theme_id")
          .eq("id", userId)
          .maybeSingle();

        
        const result = await Promise.race([fetchPromise, timeoutPromise]);
        const { data, error } = result;
        
        if (error) {
          console.error(`Error fetching profile (attempt ${attempt}/${retries}):`, error);
          // Retry on any error - be more aggressive
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }
          setProfileError(true);
          return null;
        }
        
        if (data) {
          const profileData = data as Profile;
          setProfile(profileData);
          setProfileResolved(true);
          setCachedProfile(profileData, userId);
          setProfileError(false);
          // Hand the freshly-fetched active_club_theme_id to useClubTheme so it
          // can skip its own profiles round-trip on cold-login Gate 2.
          try {
            setAuthThemeHint(userId, (data as any).active_club_theme_id ?? null);
          } catch { /* noop */ }

          
          // HARD RULE: If profile has display_name, set the profileCompleted flag for this user
          // This ensures invite flow progress dots never appear for users with completed profiles
          if (profileData.display_name) {
            markProfileCompleted(userId);
          }
          
          // CRITICAL FIX: Apply theme when applyTheme=true (passed by caller)
          // The caller determines if this is a fresh login, not React state
          // This fixes Google OAuth where the closure captured stale isFreshLogin state
          // Only apply if profile has display_name - skip for incomplete profiles going to CompleteProfilePage
          if (applyTheme && profileData.display_name) {
            const root = window.document.documentElement;
            const themeToApply = profileData.theme_preference || 'light'; // Default to light for new users
            root.classList.remove('light', 'dark');
            root.classList.add(themeToApply);
            root.style.colorScheme = themeToApply;
            localStorage.setItem('app-theme', themeToApply);
            console.log('[Auth] Applied theme preference on fresh login:', themeToApply, '(was:', localStorage.getItem('app-theme'), ')');
          }
          
          return profileData;
        }
        
        const shouldRetryMissingProfile = retryOnMissing && attempt < maxMissingProfileAttempts;
        if (shouldRetryMissingProfile) {
          const delay = Math.min(300 * attempt, 1500);
          console.warn(`[Auth] Profile not available yet (attempt ${attempt}/${maxMissingProfileAttempts}), retrying...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // No profile found - this is okay for new users, not an error
        console.log('No profile found for user:', userId);
        setProfileResolved(true);
        return null;
      } catch (err: any) {
        console.error(`Exception fetching profile (attempt ${attempt}/${retries}):`, err);
        if (attempt < retries) {
          // Exponential backoff with jitter
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000) + Math.random() * 500;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        setProfileError(true);
        return null;
      }
    }
    setProfileError(true);
    return null;
  }, []); // No dependencies - applyTheme is a parameter, not state

  // MESSAGE_NOTIFICATION_TYPES imported from @/lib/notificationTypes

  const fetchUnreadCount = useCallback(async (userId: string) => {
    const [allResult, messageCounts] = await Promise.all([
      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false),
      fetchUnreadMessageCounts(userId),
    ]);

    setUnreadCount(allResult.count || 0);
    setUnreadMessagesCount(getTotalUnreadMessageCount(messageCounts));
  }, []);

  useEffect(() => {
    let mounted = true;
    let profileFetched = false;
    
    const handleSession = async (currentSession: Session | null, isInitial = false, applyTheme = false) => {
      const __hsStop = () => {};
      try {
      if (!mounted || !currentSession?.user) {
        console.log('[Auth] handleSession early exit - mounted:', mounted, 'hasUser:', !!currentSession?.user);
        return;
      }
      
      const userId = currentSession.user.id;
      console.log('[Auth] handleSession called - userId:', userId, 'isInitial:', isInitial, 'applyTheme:', applyTheme, 'profileFetched:', profileFetched);
      
      // CHECK: If we started with a cached profile, validate it's for this user
      // If userId mismatch, we need to clear and refetch - this is a USER SWITCH scenario
      const isUserSwitch = cachedUserId && cachedUserId !== userId;
      if (isUserSwitch) {
        console.log('[Auth] Session user differs from cached - clearing stale cache for user switch');
        setProfile(null);
        setProfileResolved(false);
        setCachedProfile(null);
        // Clear the old cache from localStorage too
        localStorage.removeItem(PROFILE_CACHE_KEY);
        // Reset the profileFetched flag since we're switching users
        profileFetched = false;
      }
      
      // Prevent duplicate fetches within same session (but allow user switches)
      // CRITICAL: For SIGNED_IN event (isInitial=false, applyTheme=true), we MUST proceed
      // even if profileFetched is true from a previous INITIAL_SESSION
      const shouldSkip = profileFetched && !isInitial && !isUserSwitch && !applyTheme;
      if (shouldSkip) {
        console.log('[Auth] handleSession skipping - already fetched');
        return;
      }
      profileFetched = true;
      
      // If we already have initialized=true from sync hydration AND userId matches (no switch),
      // AND this is NOT a fresh login (applyTheme=true means fresh login), just do background refresh
      // CRITICAL: For fresh logins (applyTheme=true), we must NOT skip - we need to apply theme
      if (!isUserSwitch && !applyTheme && initialized && profile?.display_name && cachedUserId === userId) {
        console.log('[Auth] handleSession - using cached profile, background refresh only');
        // Already ready from sync hydration - just background refresh
        fetchProfile(userId, 5, false).catch(() => {});
        // Prefetch other data
        setTimeout(() => {
          prefetchUserData(queryClient, userId).catch(console.error);
          fetchUnreadCount(userId).catch(console.error);
          const email = currentSession.user.email;
          const displayName = currentSession.user.user_metadata?.full_name || 
                             currentSession.user.user_metadata?.name;
          if (email) {
            syncPasskeyAccountsFromDatabase(userId, email, displayName).catch(console.error);
          }
        }, 100);
        return;
      }
      
      // Small delay to ensure session is fully propagated to Supabase
      // This helps with RLS policies that check auth.uid().
      // On non-fresh-login paths (page refresh / INITIAL_SESSION) we already
      // have a valid `currentSession` from getSession()/onAuthStateChange, so
      // skip the deliberate sleep + redundant getSession() polling that was
      // adding up to ~1.8s to cold-start before `initialized` could flip.
      const sessionAlreadyValid = !!currentSession?.access_token && currentSession.user?.id === userId;
      let stableSession: Session | null = null;
      if (applyTheme) {
        // Fresh login: JWT may not yet be propagated — keep the original poll.
        await new Promise(resolve => setTimeout(resolve, 100));
        stableSession = await waitForSessionUser(userId, 10);
      } else if (sessionAlreadyValid) {
        stableSession = currentSession;
      } else {
        // Defensive: short poll only when the session passed in is missing/stale.
        stableSession = await waitForSessionUser(userId, 3);
      }
      const sessionForBackgroundTasks = stableSession ?? currentSession;

      if (stableSession && mounted) {
        setSession(stableSession);
        setUser(stableSession.user);
        setSessionRestoration("authenticated");
      }
      
      // If we have a cached profile for THIS USER with display_name, TRUST IT immediately
      // This eliminates the flash on page refresh - no need to wait for server
      // NOTE: Don't use cache if this is a user switch (cache was just cleared)
      // CRITICAL: On fresh login (applyTheme=true), we must fetch to apply DB theme preference
      const cached = (isUserSwitch || applyTheme) ? null : getCachedProfile(userId);
      if (cached && cached.id === userId && cached.display_name) {
        // TRUST the cached profile - user is already set up
        setProfile(cached);
        setProfileResolved(true); // Cache with display_name is trustworthy
        setProfileLoading(false);
        setLoading(false);
        setInitialized(true);
        
        // Background refresh - update cache silently, no blocking
        fetchProfile(userId, 5, false).catch(() => {
          // Silent fail - we already have valid cached data
        });
      } else if (cached && cached.id === userId && !cached.display_name) {
        // Cached profile exists but no display_name - need to complete profile
        // Still trust the cache for immediate render
        setProfile(cached);
        setProfileLoading(false);
        setLoading(false);
        setInitialized(true);
        
        // Background refresh
        fetchProfile(userId, 5, false).catch(() => {});
      } else {
        // No cache, user switch, or fresh login - must fetch profile before proceeding
        console.log('[Auth] Fetching profile for user:', userId, isUserSwitch ? '(user switch)' : '', applyTheme ? '(fresh login)' : '');
        setProfileLoading(true);
        const __fpStop = () => {};
        try {
          const fetchedProfile = await fetchProfile(userId, 5, applyTheme, true);
          if (mounted) {
            setProfileLoading(false);
            setLoading(false);
            setInitialized(true);
            console.log('[Auth] Profile fetch complete, initialized:', !!fetchedProfile);
          }
        } catch (err) {
          console.error('[Auth] Profile fetch failed:', err);
          if (mounted) {
            setProfileLoading(false);
            setLoading(false);
            setInitialized(true); // Initialize even on error to prevent hang
          }
        } finally {
          __fpStop();
        }
      }
      // Background prefetch - fire and forget
      setTimeout(() => {
        prefetchUserData(queryClient, userId).catch(console.error);
        fetchUnreadCount(userId).catch(console.error);
        // Sync passkey accounts from database to restore any lost localStorage data
        const email = sessionForBackgroundTasks.user.email;
        const displayName = sessionForBackgroundTasks.user.user_metadata?.full_name || 
                           sessionForBackgroundTasks.user.user_metadata?.name;
        if (email) {
          syncPasskeyAccountsFromDatabase(userId, email, displayName).catch(console.error);
        }
      }, 100);
      } finally {
        __hsStop();
      }
    };
    
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!mounted) return;
        
        // Check if we're in a native app context
        const isNative = typeof (window as any).Capacitor !== 'undefined' && 
                         (window as any).Capacitor?.isNativePlatform?.();
        
        console.log('Auth state change:', event, currentSession?.user?.id, 'isNative:', isNative);
        
        const incomingUserId = currentSession?.user?.id ?? null;
        const previousUserId = currentUserIdRef.current || cachedUserId;
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setSessionRestoration(currentSession?.user ? "authenticated" : "signed_out");
        currentUserIdRef.current = incomingUserId;
        // Keep client-perf logger in sync so slow-query rows are attributed.
        try {
          // dynamic import to avoid a hard load-order dependency
          import("@/lib/clientPerfLog").then(m => m.setClientPerfUserId(incomingUserId));
        } catch { /* ignore */ }
        
        if (event === 'PASSWORD_RECOVERY') {
          // Recovery session: do NOT treat as a fresh login (no cache clear,
          // no profile fetch redirect). Just hold the session and ensure the
          // user is on /reset-password so they can set a new password.
          console.log('[Auth] PASSWORD_RECOVERY event - routing to reset password');
          handleSession(currentSession, false, false);
          if (typeof window !== 'undefined' && window.location.pathname !== '/reset-password') {
            window.location.href = '/reset-password';
          }
        } else if (event === 'SIGNED_IN') {
          const isSameUserResuming = !!previousUserId && previousUserId === incomingUserId;
          
          if (isSameUserResuming) {
            // Same user resuming (e.g., phone lock/unlock, app background/foreground)
            // Do NOT clear query cache — this causes data to flash/disappear
            console.log('[Auth] SIGNED_IN event - same user resuming, skipping cache clear', isNative ? '(native app)' : '(web)');
            handleSession(currentSession, false, false);
          } else {
            // FRESH LOGIN or different user: Reset state to block AppLayout until profile is fetched
            console.log('[Auth] SIGNED_IN event - processing login', isNative ? '(native app)' : '(web)');
            // If we're on the reset password page, this SIGNED_IN is from the
            // recovery code exchange — do NOT redirect away or clear cache
            // aggressively, the user still needs to set their new password.
            const onResetPage = typeof window !== 'undefined' && window.location.pathname === '/reset-password';
            if (onResetPage) {
              console.log('[Auth] SIGNED_IN on /reset-password — treating as recovery, skipping cache clear');
              handleSession(currentSession, false, false);
            } else {
              // Clear all cached query data to force fresh fetches with the new session
              // This prevents stale/empty RLS results from a previous logged-out window
              queryClient.clear();
              // Also wipe per-user localStorage / in-memory caches (mediaCache,
              // profileCache, rolesCache, …) that live OUTSIDE React Query.
              // Without this, a different user logging in on the same device
              // sees the previous user's gallery photos, rosters, messages,
              // etc. on first paint until fresh data overrides them — a
              // cross-account data leak.
              try {
                clearUserScopedCaches();
                if (previousUserId) revokeAllForUser(previousUserId);
              } catch { /* noop */ }

              setIsFreshLogin(true);
              setInitialized(false);
              setLoading(true);
              setProfileLoading(true);
              setProfileResolved(false);
              handleSession(currentSession, false, true);
            }
          }
        } else if ((event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && currentSession?.user) {
          // Page refresh or token refresh - don't override theme
          console.log('[Auth] Session restored:', event, isNative ? '(native app)' : '(web)');
          setIsFreshLogin(false);
          handleSession(currentSession, event === 'INITIAL_SESSION', false);

          if (event === 'TOKEN_REFRESHED') {
            // Push the fresh JWT into the realtime websocket so subscriptions
            // opened before the refresh don't keep authenticating with a stale
            // token (root cause of chat channels losing access mid-session).
            try { (supabase.realtime as any)?.setAuth?.(currentSession.access_token); } catch { /* noop */ }
            // Re-run only the queries that historically silently failed under
            // a stale token (Pro gate + events). A blanket
            // refetchQueries({ type: 'active' }) here causes a refetch storm
            // on Android mid-navigation and can stall the WebView. The global
            // 401 fetch interceptor (supabaseAuthRetry) already heals other
            // in-flight requests on the same refresh.
            try {
              queryClient.invalidateQueries({ queryKey: ['has-pro-access'] });
              queryClient.invalidateQueries({ queryKey: ['events'] });
            } catch { /* noop */ }
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('[Auth] SIGNED_OUT event');
          // A refresh-token rotation race on app resume can fire a SPURIOUS
          // SIGNED_OUT immediately followed by SIGNED_IN for the same user.
          // Wiping React Query + every `ignite_*` localStorage cache in that
          // window destroys the last-good snapshots (Next Up, My Teams, …) and
          // the follow-up refetch can race a mid-rotation token, painting the
          // "set up your club" empty state. So VERIFY the sign-out is real
          // before doing anything destructive; state resets below are harmless
          // because a real session immediately re-populates them.
          setTimeout(() => {
            void (async () => {
              try {
                const { data } = await supabase.auth.getSession();
                const stillSignedIn = !!data?.session?.user?.id;
                if (stillSignedIn) {
                  console.log('[Auth] SIGNED_OUT was spurious (session still valid) — skipping cache wipe');
                  return;
                }
                queryClient.clear();
                clearUserScopedCaches();
                if (previousUserId) revokeAllForUser(previousUserId);
              } catch { /* noop */ }
            })();
          }, 400);


          profileFetched = false;
          setIsFreshLogin(false);
          setProfile(null);
          setProfileResolved(false);
          setCachedProfile(null);
          setUnreadCount(0);
          setUnreadMessagesCount(0);
          setProfileLoading(false);
          setLoading(false);
          setInitialized(true); // Stay initialized but with no user
        }

      }
    );

    // Check for existing session (initial load) with timeout
    // PWA launches can hang on getSession if network is slow/offline
    // Increased timeout for slower networks (e.g., mobile on 3G)
    const sessionTimeout = setTimeout(() => {
      if (mounted && loading) {
        // Check if we have a cached profile to fall back on
        const cachedFallback = getCachedProfileWithUser();
        if (cachedFallback && cachedFallback.profile.display_name) {
          console.warn('[Auth] Session check timed out - restoring from cache, will retry in background');
          setProfile(cachedFallback.profile);
          setLoading(false);
          setProfileLoading(false);
          setInitialized(true);
          
          // Background retry: silently re-check session after timeout
          // This handles transient Supabase latency spikes
          supabase.auth.getSession().then(async ({ data: { session: retrySession } }) => {
            if (!mounted) return;
            if (retrySession?.user) {
              console.log('[Auth] Background session retry succeeded');
              setSession(retrySession);
              setUser(retrySession.user);
              setSessionRestoration("authenticated");
              if (!profileFetched) {
                await handleSession(retrySession, true, false);
              }
            } else {
              setSessionRestoration("signed_out");
            }
          }).catch(e => {
            console.warn('[Auth] Background session retry failed:', e);
            setSessionRestoration("signed_out");
          });
        } else {
          console.warn('[Auth] Session check timed out, no cache available');
          setLoading(false);
          setProfileLoading(false);
          setInitialized(true);
          setSessionRestoration("signed_out");
        }
      }
    }, 10000); // 10 second timeout for slow connections

    const __initSessionStop = () => {};
    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      __initSessionStop();
      clearTimeout(sessionTimeout);
      if (!mounted) return;
      
      console.log('Initial session check:', existingSession?.user?.id);
      
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setSessionRestoration(existingSession?.user ? "authenticated" : "signed_out");
      
      if (existingSession?.user && !profileFetched) {
        // Initial page load - don't apply theme from profile (localStorage is source of truth)
        await handleSession(existingSession, true, false);
      } else {
        // No session - done loading
        if (mounted) {
          setProfileLoading(false);
          setLoading(false);
          setInitialized(true); // Mark as initialized
        }
      }
    }).catch(err => {
      __initSessionStop();
      clearTimeout(sessionTimeout);
      console.error('Error getting session:', err);
      if (mounted) {
        setLoading(false);
        setProfileLoading(false);
        setInitialized(true); // Mark as initialized even on error
        // Transient failure with a cached identity: stay in "restoring" so the
        // route guard shows the auth-check state instead of flashing /auth.
        // The resume/visibility recovery pass below resolves it either way.
        setSessionRestoration(cachedUserId ? "restoring" : "signed_out");
      }
    });

    return () => {
      mounted = false;
      clearTimeout(sessionTimeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile, queryClient, waitForSessionUser]);

  // SESSION RECOVERY: Check session health when the app returns to the foreground.
  // On Android, forcing refreshSession() on every resume can race token rotation
  // and trigger refresh_token_not_found, which looks like a random logout.
  useEffect(() => {
    const isNative = typeof (window as any).Capacitor !== 'undefined' && 
                     (window as any).Capacitor?.isNativePlatform?.();
    let lastResumeCheck = 0;
    let recoveryInFlight = false;

    const recoverSession = async (source: string) => {
      const now = Date.now();
      if (recoveryInFlight || now - lastResumeCheck < 3000) return;
      lastResumeCheck = now;
      recoveryInFlight = true;

      console.log(`[Auth] ${source} - checking session health`);

      try {
        const hadCachedProfile = !!getCachedProfileWithUser();

        // First trust the stored session. This avoids unnecessary refresh-token
        // rotation on resume, which was the main source of Android logouts.
        const { data: currentData, error: currentError } = await supabase.auth.getSession();
        if (!currentError && currentData.session) {
          console.log(`[Auth] ${source} - session still valid`);
          setSession(currentData.session);
          setUser(currentData.session.user);
          setSessionRestoration("authenticated");
          return;
        }

        if (!hadCachedProfile) {
          console.log(`[Auth] ${source} - no prior session to recover`);
          return;
        }

        console.warn(`[Auth] ${source} - no active session found, attempting one-time refresh`);
        // Single-flight: never race the supabase-js autoRefresh timer or the
        // 401-retry interceptor — a rotated-token replay would look like a
        // logout.
        const { session: refreshedSession, error: refreshError } = await refreshSessionOnce(12000);
        const refreshData = { session: refreshedSession };

        if (!refreshError && refreshData.session) {
          console.log(`[Auth] ${source} - session recovered via refresh`);
          setSession(refreshData.session);
          setUser(refreshData.session.user);
          setSessionRestoration("authenticated");
          return;
        }

        const refreshCode = (refreshError as { code?: string } | null)?.code;
        const refreshMessage = refreshError?.message ?? "";
        const tokenMissing = refreshCode === 'refresh_token_not_found' || /refresh token not found/i.test(refreshMessage);

        // Give Supabase a brief moment in case another refresh path already won the race.
        await new Promise(resolve => setTimeout(resolve, 250));

        const { data: retryData, error: retryError } = await supabase.auth.getSession();
        if (!retryError && retryData.session) {
          console.log(`[Auth] ${source} - session restored after retry`);
          setSession(retryData.session);
          setUser(retryData.session.user);
          setSessionRestoration("authenticated");
          return;
        }

        // CRITICAL: never tear down the local session because the network was
        // unreachable. Clearing the cache + `setUser(null)` here is what made the
        // club switcher vanish and the theme fall back to Ignite after a coverage
        // drop, with no path back until relaunch.
        if (!tokenMissing && (isTransientAuthFailure(refreshError) || isTransientAuthFailure(retryError))) {
          console.warn(`[Auth] ${source} - refresh failed for network reasons; keeping session`, refreshError ?? retryError ?? null);
          return;
        }

        console.warn(`[Auth] ${source} - session unrecoverable`, refreshError ?? currentError ?? retryError ?? null);

        queryClient.clear();
        clearProfileCache();
        clearClubTeamCache();
        clearRolesCache();
        setUser(null);
        setSession(null);
        setSessionRestoration("signed_out");
        setProfile(null);
        setCachedProfile(null);
        setUnreadCount(0);
        setUnreadMessagesCount(0);
        setLoading(false);
        setProfileLoading(false);
        setInitialized(true);

        if (tokenMissing) {
          console.warn(`[Auth] ${source} - refresh token missing after resume; user must sign in again`);
        }
      } catch (err) {
        console.error(`[Auth] ${source} - error during recovery (possibly offline):`, err);
        // Network error - don't log out, user might just be offline
      } finally {
        recoveryInFlight = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        recoverSession('visibilitychange');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Coverage restored: re-run the health check so a session that could not be
    // verified while offline recovers without waiting for the next resume.
    const unsubscribeOnline = onlineManager.subscribe(() => {
      if (onlineManager.isOnline()) recoverSession('reconnect');
    });


    // Native apps: also listen for Capacitor App resume event
    // This fires more reliably than visibilitychange on Android
    let resumeListener: { remove: () => Promise<void> } | null = null;
    if (isNative) {
      import('@capacitor/app').then(({ App }) => {
        App.addListener('resume', () => {
          recoverSession('capacitor-resume');
        }).then(listener => {
          resumeListener = listener;
        }).catch(err => {
          console.warn('[Auth] Failed to attach resume listener:', err);
        });
      }).catch(() => {});
    }

    // Foreground heartbeat: every 4 minutes while the page is visible, check
    // session expiry and refresh proactively. Long focused sessions (e.g.
    // chatting for 30+ min on iOS) otherwise rely solely on supabase-js's
    // internal timer, which can be throttled in WKWebView and iframed previews.
    const heartbeat = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      supabase.auth.getSession().then(({ data }) => {
        const session = data.session;
        if (!session) return;
        const expiresAt = session.expires_at ?? 0;
        const nowSec = Math.floor(Date.now() / 1000);
        // Refresh when <2 min remaining.
        if (expiresAt - nowSec < 120) {
          refreshSessionOnce(12000).catch(() => { /* ignore — recovery path will pick up */ });
        }
      }).catch(() => {});
    }, 4 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unsubscribeOnline();

      resumeListener?.remove().catch(() => {});
      window.clearInterval(heartbeat);
    };
  }, [queryClient]);

  // Real-time notifications subscription and push registration
  useEffect(() => {
    if (!user) return;

    // Silently enable push notifications if permission already granted
    const setupPushNotifications = async () => {
      // Only attempt if notifications are supported and already permitted
      if (!('Notification' in window) || Notification.permission !== 'granted') {
        return; // Silently skip - user can enable via settings
      }
      
      try {
        // Use silent mode - don't prompt, just subscribe if already permitted
        const result = await subscribeToPushNotifications(user.id, true);
        if (result.success) {
          console.log('[Auth] Push notifications enabled on login');
        }
        // Don't log errors in silent mode - it's expected to fail if not set up
      } catch (error) {
        // Silently ignore errors in auto-setup
      }
    };
    
    setupPushNotifications();

    // RAF-throttled, deduped invalidations so a burst of notifications
    // doesn't chain refetches and freeze the UI on slow devices.
    const inboxRefreshState = { unread: 0, team: 0, club: 0, group: 0, dm: 0, broadcast: 0 } as Record<string, number>;
    const scheduleInboxRefresh = (key: keyof typeof inboxRefreshState, fn: () => void) => {
      if (inboxRefreshState[key]) return;
      inboxRefreshState[key] = requestAnimationFrame(() => {
        inboxRefreshState[key] = 0;
        fn();
      });
    };

    const channel = supabase
      .channel(`notifications-global:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Optimistic increment for instant UI feedback
          setUnreadCount((prev) => prev + 1);
          
          const notificationType = (payload.new as any)?.type;
          if (MESSAGE_NOTIFICATION_TYPES.includes(notificationType)) {
            setUnreadMessagesCount((prev) => prev + 1);

            // Keep the inbox previews + per-thread unread badges in sync.
            // The dedicated message-table realtime channel can miss events
            // (RLS race / throttling), but the user-filtered notifications
            // channel is reliable. We RAF-dedupe per query so a burst of
            // notifications fires at most one refetch per frame per query.
            scheduleInboxRefresh('unread', () => {
              queryClient.invalidateQueries({ queryKey: ["unread-message-counts", user.id] });
              queryClient.invalidateQueries({ queryKey: ["club-unread-count"] });
              queryClient.invalidateQueries({ queryKey: ["club-messages-unread"] });
            });
            if (notificationType === 'team_message') {
              scheduleInboxRefresh('team', () => queryClient.invalidateQueries({ queryKey: ["my-teams-with-messages", user.id] }));
            } else if (notificationType === 'club_message') {
              scheduleInboxRefresh('club', () => queryClient.invalidateQueries({ queryKey: ["member-clubs-with-messages", user.id] }));
            } else if (notificationType === 'group_message') {
              scheduleInboxRefresh('group', () => queryClient.invalidateQueries({ queryKey: ["my-chat-groups-with-messages", user.id] }));
            } else if (notificationType === 'direct_message') {
              scheduleInboxRefresh('dm', () => queryClient.invalidateQueries({ queryKey: ["dm-conversations", user.id] }));
            } else if (notificationType === 'broadcast') {
              scheduleInboxRefresh('broadcast', () => queryClient.invalidateQueries({ queryKey: ["latest-broadcast"] }));
            }
          }
          
          // Browser-level notifications are intentionally NOT fired here.
          // Push delivery is native-only (FCM/APNs via the Capacitor app); web
          // push is disabled. Firing showBrowserNotification from an open tab
          // produced Chrome-branded "igniteclubhq.app" alerts duplicating the
          // native app's notifications. In-app UI (bell + toasts) covers the
          // browser case.
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && (payload.new as any).is_read === true) {
            // RAF-dedupe: opening a thread with N unread messages fires N
            // UPDATE events back-to-back; without dedupe we'd chain N full
            // RPC round-trips and stall the badge for hundreds of ms.
            scheduleInboxRefresh('unread', () => {
              fetchUnreadCount(user.id);
              queryClient.invalidateQueries({ queryKey: ["club-unread-count"] });
              queryClient.invalidateQueries({ queryKey: ["club-messages-unread"] });
              queryClient.invalidateQueries({ queryKey: ["unread-message-counts"] });
              queryClient.invalidateQueries({ queryKey: ["recent-notifications"] });
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          scheduleInboxRefresh('unread', () => {
            fetchUnreadCount(user.id);
            queryClient.invalidateQueries({ queryKey: ["club-unread-count"] });
            queryClient.invalidateQueries({ queryKey: ["club-messages-unread"] });
            queryClient.invalidateQueries({ queryKey: ["unread-message-counts"] });
            queryClient.invalidateQueries({ queryKey: ["recent-notifications"] });
          });
        }
      )
      .subscribe();

    // Re-sync unread count from server when app becomes visible or focused.
    // visibility + focus often both fire on native resume, so debounce them
    // into a single invalidation window (~500 ms) to avoid duplicate RPCs.
    let resyncTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleResync = () => {
      if (resyncTimer) return;
      resyncTimer = setTimeout(() => {
        resyncTimer = null;
        fetchUnreadCount(user.id);
        queryClient.invalidateQueries({ queryKey: ["club-unread-count"] });
        queryClient.invalidateQueries({ queryKey: ["club-messages-unread"] });
        queryClient.invalidateQueries({ queryKey: ["unread-message-counts"] });
        queryClient.invalidateQueries({ queryKey: ["recent-notifications"] });
      }, 500);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') scheduleResync();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const handleFocus = () => scheduleResync();
    window.addEventListener('focus', handleFocus);

    return () => {
      supabase.removeChannel(channel);
      Object.keys(inboxRefreshState).forEach((k) => {
        if (inboxRefreshState[k]) cancelAnimationFrame(inboxRefreshState[k]);
      });
      if (resyncTimer) clearTimeout(resyncTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, queryClient]);

  const signUp = async (email: string, password: string) => {
    // Check for pending redirect (e.g., from invite link)
    let pendingRedirect: string | null = null;
    try {
      pendingRedirect = sessionStorage.getItem("redirectAfterAuth");
    } catch {
      pendingRedirect = null;
    }
    const redirectUrl = pendingRedirect 
      ? `${window.location.origin}${pendingRedirect}`
      : `${window.location.origin}/`;
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl },
      });
      // When email confirmation is required, signUp resolves with no session.
      // Surface that explicitly so callers can tell the user what happens next
      // instead of silently doing nothing.
      const needsEmailConfirmation = !error && !data?.session;
      return { error: error as Error | null, needsEmailConfirmation };
    } catch (err) {
      console.error('[Auth] signUp error:', err);
      return { error: err as Error, needsEmailConfirmation: false };
    }
  };


  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error as Error | null };
    } catch (err) {
      console.error('[Auth] signIn error:', err);
      return { error: err as Error };
    }
  };

  const signInWithGoogle = async () => {
    // Check for pending redirect (e.g., from invite link)
    let pendingRedirect: string | null = null;
    try {
      pendingRedirect = sessionStorage.getItem("redirectAfterAuth");
    } catch {
      pendingRedirect = null;
    }
    
    // For native apps, use the published app URL for OAuth redirects
    // The WebView can't handle capacitor:// or ionic:// schemes for OAuth
    const isNative = typeof (window as any).Capacitor !== 'undefined' && 
                     (window as any).Capacitor?.isNativePlatform?.();
    
    // Use the published app URL for native, or current origin for web
    // For native: OAuth will redirect to the published URL, which triggers App Links
    // and brings the user back into the native app with the tokens
    const baseUrl = isNative 
      ? 'https://reference.invalid'
      : window.location.origin;
    
    const redirectUrl = pendingRedirect 
      ? `${baseUrl}${pendingRedirect}`
      : `${baseUrl}/`;
      
    console.log('[Auth] Google OAuth redirect URL:', redirectUrl, 'isNative:', isNative);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        // Skip the browser redirect - we'll handle token exchange in the app
        // This is needed for the native app to capture the callback
        skipBrowserRedirect: false,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    const currentUserId = user?.id;

    try {
      if (currentUserId && isNativePlatform()) {
        await unregisterNativePush(currentUserId);
      }
    } catch (error) {
      console.error('[Auth] Native push cleanup failed during sign out:', error);
    }

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
    setUser(null);
    setSession(null);
    setSessionRestoration("signed_out");
    setProfile(null);
    setCachedProfile(null);
    currentUserIdRef.current = null; // Clear so re-login is treated as fresh (applies theme from DB)
    // Clear ALL React Query cache to prevent stale RLS data on re-login
    queryClient.clear();
    clearRolesCache(); // Clear cached user roles (security-critical)
    setUnreadCount(0);
    setUnreadMessagesCount(0);
  };

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  const refreshUnreadCount = useCallback(async () => {
    if (user) {
      await fetchUnreadCount(user.id);
    }
  }, [user, fetchUnreadCount]);

  const clearUnreadCount = useCallback(() => {
    setUnreadCount(0);
    setUnreadMessagesCount(0);
  }, []);

  const decrementUnreadCount = useCallback((n: number) => {
    if (!n || n <= 0) return;
    setUnreadCount((prev) => Math.max(0, prev - n));
    setUnreadMessagesCount((prev) => Math.max(0, prev - n));
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      profileLoading,
      profileError,
      initialized,
      sessionRestoration,
      profileResolved,
      unreadCount,
      unreadMessagesCount,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      refreshProfile,
      refreshUnreadCount,
      clearUnreadCount,
      decrementUnreadCount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
````

## src/test/routeClubScope.test.ts (starting line 1)

````text
import { describe, it, expect } from "vitest";
import { resolveRouteClubScope } from "@/lib/routeClubScope";

describe("resolveRouteClubScope", () => {
  it("resolves club id directly from club-prefixed routes", () => {
    expect(resolveRouteClubScope("/clubs/abc")).toEqual({ kind: "direct", clubId: "abc" });
    expect(resolveRouteClubScope("/clubs/abc/seasons")).toEqual({ kind: "direct", clubId: "abc" });
    expect(resolveRouteClubScope("/messages/club/abc")).toEqual({ kind: "direct", clubId: "abc" });
    expect(resolveRouteClubScope("/pay-fees/abc")).toEqual({ kind: "direct", clubId: "abc" });
  });

  it("looks up owning club for entity routes", () => {
    expect(resolveRouteClubScope("/teams/t1")).toEqual({ kind: "lookup", table: "teams", id: "t1" });
    expect(resolveRouteClubScope("/messages/t1")).toEqual({ kind: "lookup", table: "teams", id: "t1" });
    expect(resolveRouteClubScope("/groups/g1")).toEqual({ kind: "lookup", table: "chat_groups", id: "g1" });
    expect(resolveRouteClubScope("/events/e1")).toEqual({ kind: "lookup", table: "events", id: "e1" });
    expect(resolveRouteClubScope("/mini-leagues/m1")).toEqual({ kind: "lookup", table: "mini_leagues", id: "m1" });
    expect(resolveRouteClubScope("/vault/folder/f1")).toEqual({ kind: "lookup", table: "vault_folders", id: "f1" });
    expect(resolveRouteClubScope("/messages/club-admin/c1")).toEqual({
      kind: "lookup",
      table: "club_admin_conversations",
      id: "c1",
    });
  });

  it("scopes DMs by the other participant's clubs", () => {
    expect(resolveRouteClubScope("/messages/dm/c1")).toEqual({ kind: "dm", conversationId: "c1" });
    expect(resolveRouteClubScope("/messages/dm")).toEqual({ kind: "none" });
  });

  it("leaves cross-club, personal and creation routes unscoped", () => {
    for (const p of [
      "/",
      "/events",
      "/events/new",
      "/messages",
      "/messages/broadcast",
      "/messages/welcome",
      "/vault",
      "/media",
      "/leaderboard",
      "/clubs",
      "/clubs/new",
      "/teams/new",
      "/associations/x",
      "/admin/users",
      "/profile",
      "/settings",
    ]) {
      expect(resolveRouteClubScope(p), p).toEqual({ kind: "none" });
    }
  });
});
````

## src/lib/safeOpenFile.test.ts (starting line 1)

````text
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Hoisted mocks ---
const capacitorMock = vi.hoisted(() => ({
  isNativePlatform: vi.fn(() => true),
}));
const filesystemMock = vi.hoisted(() => ({
  downloadFile: vi.fn(),
  writeFile: vi.fn(async (_options: { path: string; data: string; directory?: unknown; recursive?: boolean }) => ({ uri: "file:///cache/written" })),
  stat: vi.fn(async () => ({ size: 1234 })),
  getUri: vi.fn(async () => ({ uri: "file:///cache/x" })),
}));
const fileOpenerMock = vi.hoisted(() => ({ open: vi.fn() }));
const shareMock = vi.hoisted(() => ({ share: vi.fn() }));
const fetchMock = vi.hoisted(() => vi.fn());
const safeOpenUrlMock = vi.hoisted(() => vi.fn(async () => {}));
const resolveSignedUrlMock = vi.hoisted(() => vi.fn());

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => capacitorMock.isNativePlatform(),
  },
}));
vi.mock("@capacitor/filesystem", () => ({
  Filesystem: filesystemMock,
  Directory: { Cache: "CACHE" },
}));
vi.mock("@capacitor-community/file-opener", () => ({
  FileOpener: fileOpenerMock,
}));
vi.mock("@capacitor/share", () => ({ Share: shareMock }));
vi.mock("./safeOpenUrl", () => ({ safeOpenUrl: safeOpenUrlMock }));
vi.mock("@/hooks/useSignedPhotoUrl", () => ({
  resolveSignedUrl: resolveSignedUrlMock,
}));

import { safeOpenFile } from "./safeOpenFile";

const RAW_PRIVATE =
  "https://reference.invalid";
const SIGNED =
  "https://reference.invalid";

beforeEach(() => {
  vi.clearAllMocks();
  capacitorMock.isNativePlatform.mockReturnValue(true);
  filesystemMock.downloadFile.mockResolvedValue({ path: "file:///cache/x" });
  filesystemMock.writeFile.mockResolvedValue({ uri: "file:///cache/written" });
  filesystemMock.stat.mockResolvedValue({ size: 1234 });
  fileOpenerMock.open.mockResolvedValue(undefined);
  shareMock.share.mockRejectedValue(new Error("Share not available"));
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  // jsdom FileReader works on real Blobs; keep it.
});

function okResponse(type = "application/pdf") {
  const blob = new Blob(["%PDF-1.4 test"], { type });
  return {
    ok: true,
    status: 200,
    headers: { get: (k: string) => (k.toLowerCase() === "content-type" ? type : null) },
    blob: async () => blob,
  } as unknown as Response;
}

describe("safeOpenFile — private URL fail-closed", () => {
  it("must not download or expose a raw private URL when signing fails", async () => {
    resolveSignedUrlMock.mockRejectedValueOnce(new Error("Unable to create signed URL"));

    await expect(safeOpenFile(RAW_PRIVATE)).rejects.toThrow();

    expect(filesystemMock.downloadFile).not.toHaveBeenCalled();
    expect(fileOpenerMock.open).not.toHaveBeenCalled();
    expect(safeOpenUrlMock).not.toHaveBeenCalled();

    // Any thrown error must not leak the raw URL, tokens, or query params.
    try {
      await safeOpenFile(RAW_PRIVATE);
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).not.toContain(RAW_PRIVATE);
      expect(msg).not.toContain("token");
      expect(msg).not.toContain("secret.pdf");
    }
  });

  it("signing failure triggers no native download or file opener", async () => {
    resolveSignedUrlMock.mockRejectedValue(new Error("signing failed"));
    await expect(safeOpenFile(RAW_PRIVATE)).rejects.toBeTruthy();
    expect(filesystemMock.downloadFile).not.toHaveBeenCalled();
    expect(fileOpenerMock.open).not.toHaveBeenCalled();
  });

  it("signing failure never sends the raw private URL to safeOpenUrl", async () => {
    resolveSignedUrlMock.mockRejectedValue(new Error("signing failed"));
    await expect(safeOpenFile(RAW_PRIVATE)).rejects.toBeTruthy();
    expect(safeOpenUrlMock).not.toHaveBeenCalled();
  });

  it.each([
    "/storage/v1/object/public/photos/a.pdf",
    "/storage/v1/object/sign/photos/a.pdf",
    "/storage/v1/object/authenticated/photos/a.pdf",
    "/storage/v1/render/image/public/photos/a.png",
    "/storage/v1/render/image/sign/photos/a.png",
  ])("every supported private storage URL form fails closed when signing fails: %s", async (path) => {
    resolveSignedUrlMock.mockRejectedValue(new Error("nope"));
    const url = `https://reference.invalid`;
    await expect(safeOpenFile(url)).rejects.toBeTruthy();
    expect(filesystemMock.downloadFile).not.toHaveBeenCalled();
    expect(safeOpenUrlMock).not.toHaveBeenCalled();
  });
});

describe("safeOpenFile — successful signing", () => {
  it("downloads and opens using the signed URL, never the raw URL", async () => {
    resolveSignedUrlMock.mockResolvedValue(SIGNED);
    await safeOpenFile(RAW_PRIVATE);

    expect(filesystemMock.downloadFile).toHaveBeenCalledTimes(1);
    const arg = filesystemMock.downloadFile.mock.calls[0][0];
    expect(arg.url).toBe(SIGNED);
    expect(fileOpenerMock.open).toHaveBeenCalledTimes(1);
  });

  it("retries generically when the viewer rejects the content type", async () => {
    resolveSignedUrlMock.mockResolvedValue(SIGNED);
    fileOpenerMock.open.mockRejectedValueOnce(new Error("bad content type"));

    await safeOpenFile(RAW_PRIVATE);

    expect(fileOpenerMock.open).toHaveBeenCalledTimes(2);
    expect(fileOpenerMock.open.mock.calls[1][0].contentType).toBe("application/octet-stream");
    expect(safeOpenUrlMock).not.toHaveBeenCalled();
  });

  it("only falls back to the browser with the signed URL when viewer AND share both fail", async () => {
    resolveSignedUrlMock.mockResolvedValue(SIGNED);
    fileOpenerMock.open.mockRejectedValue(new Error("no viewer"));
    shareMock.share.mockRejectedValue(new Error("no share"));

    await safeOpenFile(RAW_PRIVATE);

    expect(shareMock.share).toHaveBeenCalledTimes(1);
    expect(safeOpenUrlMock).toHaveBeenCalledTimes(1);
    expect(safeOpenUrlMock).toHaveBeenCalledWith(SIGNED);
    expect(safeOpenUrlMock).not.toHaveBeenCalledWith(RAW_PRIVATE);
  });

  it("offers the share sheet (real file name) instead of the browser when no viewer accepts the file", async () => {
    resolveSignedUrlMock.mockResolvedValue(SIGNED);
    fileOpenerMock.open.mockRejectedValue(new Error("no viewer"));
    shareMock.share.mockResolvedValue({ activityType: "x" });

    await safeOpenFile(RAW_PRIVATE, { fileName: "Club policy.pdf" });

    expect(shareMock.share).toHaveBeenCalledTimes(1);
    expect(shareMock.share.mock.calls[0][0].title).toBe("Club_policy.pdf");
    expect(shareMock.share.mock.calls[0][0].files[0]).toBe("file:///cache/x");
    expect(safeOpenUrlMock).not.toHaveBeenCalled();
  });

  it("treats a dismissed share sheet as handled (no browser tab)", async () => {
    resolveSignedUrlMock.mockResolvedValue(SIGNED);
    fileOpenerMock.open.mockRejectedValue(new Error("no viewer"));
    shareMock.share.mockRejectedValue(new Error("Share canceled"));

    await safeOpenFile(RAW_PRIVATE);

    expect(safeOpenUrlMock).not.toHaveBeenCalled();
  });

  it("passes a bare extension file_type through the MIME guesser", async () => {
    resolveSignedUrlMock.mockResolvedValue(SIGNED);
    await safeOpenFile(RAW_PRIVATE, { fileName: "Club policy.pdf", mimeType: "pdf" });
    expect(fileOpenerMock.open.mock.calls[0][0].contentType).toBe("application/pdf");
  });

  it("keeps the real file name as the last path segment so the viewer title is the document name", async () => {
    resolveSignedUrlMock.mockResolvedValue(SIGNED);
    await safeOpenFile(RAW_PRIVATE, { fileName: "Club policy.pdf" });
    const path: string = filesystemMock.downloadFile.mock.calls[0][0].path;
    expect(path.endsWith("/Club_policy.pdf")).toBe(true);
    expect(path).not.toContain("secret.pdf");
  });
});

describe("safeOpenFile — download resilience (native)", () => {
  it("falls back to fetch + writeFile when Filesystem.downloadFile throws, then opens the viewer", async () => {
    resolveSignedUrlMock.mockResolvedValue(SIGNED);
    filesystemMock.downloadFile.mockRejectedValue(new Error("downloadFile not implemented"));
    fetchMock.mockResolvedValue(okResponse("application/pdf"));

    await safeOpenFile(RAW_PRIVATE, { fileName: "Club policy.pdf" });

    expect(fetchMock).toHaveBeenCalledWith(SIGNED);
    expect(filesystemMock.writeFile).toHaveBeenCalledTimes(1);
    expect(filesystemMock.writeFile.mock.calls[0][0].path.endsWith("/Club_policy.pdf")).toBe(true);
    expect(fileOpenerMock.open).toHaveBeenCalledTimes(1);
    expect(fileOpenerMock.open.mock.calls[0][0].filePath).toBe("file:///cache/written");
    expect(safeOpenUrlMock).not.toHaveBeenCalled();
  });

  it("re-downloads via fetch when the native downloader leaves an empty file", async () => {
    resolveSignedUrlMock.mockResolvedValue(SIGNED);
    filesystemMock.stat.mockResolvedValue({ size: 0 });
    fetchMock.mockResolvedValue(okResponse("application/pdf"));

    await safeOpenFile(RAW_PRIVATE, { fileName: "Club policy.pdf" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(filesystemMock.writeFile).toHaveBeenCalledTimes(1);
    expect(safeOpenUrlMock).not.toHaveBeenCalled();
  });

  it("uses the server content type when the record has no usable MIME", async () => {
    resolveSignedUrlMock.mockResolvedValue(SIGNED);
    filesystemMock.downloadFile.mockRejectedValue(new Error("nope"));
    fetchMock.mockResolvedValue(okResponse("application/msword"));

    await safeOpenFile(RAW_PRIVATE, { fileName: "letter" });

    expect(fileOpenerMock.open.mock.calls[0][0].contentType).toBe("application/msword");
  });

  it("retries with a flat cache path when the nested write fails", async () => {
    resolveSignedUrlMock.mockResolvedValue(SIGNED);
    filesystemMock.downloadFile.mockRejectedValue(new Error("nope"));
    fetchMock.mockResolvedValue(okResponse());
    filesystemMock.writeFile
      .mockRejectedValueOnce(new Error("ENOENT nested"))
      .mockResolvedValueOnce({ uri: "file:///cache/flat" });

    await safeOpenFile(RAW_PRIVATE, { fileName: "Club policy.pdf" });

    expect(filesystemMock.writeFile).toHaveBeenCalledTimes(2);
    expect(filesystemMock.writeFile.mock.calls[1][0].path).not.toContain("/");
    expect(filesystemMock.writeFile.mock.calls[1][0].path.endsWith("-Club_policy.pdf")).toBe(true);
    expect(fileOpenerMock.open.mock.calls[0][0].filePath).toBe("file:///cache/flat");
  });

  it("only opens the browser when no local copy could be produced at all", async () => {
    resolveSignedUrlMock.mockResolvedValue(SIGNED);
    filesystemMock.downloadFile.mockRejectedValue(new Error("nope"));
    fetchMock.mockResolvedValue({ ok: false, status: 403 } as unknown as Response);

    await safeOpenFile(RAW_PRIVATE);

    expect(fileOpenerMock.open).not.toHaveBeenCalled();
    expect(shareMock.share).not.toHaveBeenCalled();
    expect(safeOpenUrlMock).toHaveBeenCalledWith(SIGNED);
  });

});

describe("safeOpenFile — external / public non-storage URLs", () => {
  it("does not call the signer for external URLs and retains browser fallback", async () => {
    const externalUrl = "https://reference.invalid";
    filesystemMock.downloadFile.mockRejectedValueOnce(new Error("download failed"));
    fetchMock.mockRejectedValue(new Error("network"));

    await safeOpenFile(externalUrl);

    expect(resolveSignedUrlMock).not.toHaveBeenCalled();
    expect(safeOpenUrlMock).toHaveBeenCalledWith(externalUrl);
  });

  it("does not call the signer for external URLs on web", async () => {
    capacitorMock.isNativePlatform.mockReturnValue(false);
    const externalUrl = "https://reference.invalid";
    await safeOpenFile(externalUrl);
    expect(resolveSignedUrlMock).not.toHaveBeenCalled();
    expect(safeOpenUrlMock).toHaveBeenCalledWith(externalUrl);
  });
});
````

## supabase/migrations/20260809224221_62548908-dcc8-4ac3-bd34-1c8167bd16f1.sql (starting line 1)

````text
CREATE TABLE public.club_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  url TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'link',
  open_mode TEXT NOT NULL DEFAULT 'browser',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX club_links_club_idx ON public.club_links (club_id, is_active, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_links TO authenticated;
GRANT ALL ON public.club_links TO service_role;

ALTER TABLE public.club_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club members can view active club links"
ON public.club_links FOR SELECT TO authenticated
USING (
  is_active
  AND (
    public.is_club_member(auth.uid(), club_id)
    OR public.is_club_admin(club_id, auth.uid())
    OR public.has_role(auth.uid(), 'app_admin'::app_role)
  )
);

CREATE POLICY "Club admins can view all club links"
ON public.club_links FOR SELECT TO authenticated
USING (
  public.is_club_admin(club_id, auth.uid())
  OR public.has_role(auth.uid(), 'app_admin'::app_role)
);

CREATE POLICY "Club admins can insert club links"
ON public.club_links FOR INSERT TO authenticated
WITH CHECK (
  public.is_club_admin(club_id, auth.uid())
  OR public.has_role(auth.uid(), 'app_admin'::app_role)
);

CREATE POLICY "Club admins can update club links"
ON public.club_links FOR UPDATE TO authenticated
USING (
  public.is_club_admin(club_id, auth.uid())
  OR public.has_role(auth.uid(), 'app_admin'::app_role)
)
WITH CHECK (
  public.is_club_admin(club_id, auth.uid())
  OR public.has_role(auth.uid(), 'app_admin'::app_role)
);

CREATE POLICY "Club admins can delete club links"
ON public.club_links FOR DELETE TO authenticated
USING (
  public.is_club_admin(club_id, auth.uid())
  OR public.has_role(auth.uid(), 'app_admin'::app_role)
);

CREATE TRIGGER club_links_set_updated_at
BEFORE UPDATE ON public.club_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
````

## supabase/migrations/20260809232528_d284eb4c-2205-4a09-80f0-778f37558781.sql (starting line 1)

````text
DROP POLICY IF EXISTS "Club admins can insert club links" ON public.club_links;
DROP POLICY IF EXISTS "Club admins can update club links" ON public.club_links;
DROP POLICY IF EXISTS "Club admins can delete club links" ON public.club_links;
DROP POLICY IF EXISTS "Club admins can view all club links" ON public.club_links;
DROP POLICY IF EXISTS "Club members can view active club links" ON public.club_links;

CREATE POLICY "Club admins can insert club links"
  ON public.club_links FOR INSERT TO authenticated
  WITH CHECK (public.is_club_admin_for(club_id));

CREATE POLICY "Club admins can update club links"
  ON public.club_links FOR UPDATE TO authenticated
  USING (public.is_club_admin_for(club_id))
  WITH CHECK (public.is_club_admin_for(club_id));

CREATE POLICY "Club admins can delete club links"
  ON public.club_links FOR DELETE TO authenticated
  USING (public.is_club_admin_for(club_id));

CREATE POLICY "Club admins can view all club links"
  ON public.club_links FOR SELECT TO authenticated
  USING (public.is_club_admin_for(club_id));

CREATE POLICY "Club members can view active club links"
  ON public.club_links FOR SELECT TO authenticated
  USING (is_active AND (public.is_club_member(auth.uid(), club_id) OR public.is_club_admin_for(club_id)));
````

## supabase/migrations/20260417195631_a60831b6-63eb-4ff5-96e5-c52c66ff9a30.sql (starting line 10)

````text
CREATE OR REPLACE FUNCTION public.is_club_admin_for(_club_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (
        (ur.role = 'club_admin' AND ur.club_id = _club_id)
        OR ur.role = 'app_admin'
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_club_admin_for(uuid) TO authenticated;

-- RPC: suggest draft team allocations
CREATE OR REPLACE FUNCTION public.suggest_eoi_teams(_season_id uuid)
````

## supabase/migrations/20260721114111_aa56e96d-22f4-415a-bedd-486e04eb5849.sql (starting line 1)

````text

-- Option 2: scoped guardian suppression, so removing a member no longer
-- unassigns their child from the team (which was also cutting off other
-- guardians and the child itself).

------------------------------------------------------------------------------
-- 1. Exclusion tables
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_member_exclusions (
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  excluded_at timestamptz NOT NULL DEFAULT now(),
  excluded_by uuid,
  PRIMARY KEY (team_id, user_id)
);

GRANT SELECT ON public.team_member_exclusions TO authenticated;
GRANT ALL ON public.team_member_exclusions TO service_role;
ALTER TABLE public.team_member_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view team exclusions"
  ON public.team_member_exclusions
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'app_admin'::app_role)
    OR public.has_role(auth.uid(), 'team_admin'::app_role, NULL, team_id)
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id
        AND public.has_role(auth.uid(), 'club_admin'::app_role, t.club_id)
    )
  );

CREATE TABLE IF NOT EXISTS public.club_member_exclusions (
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  excluded_at timestamptz NOT NULL DEFAULT now(),
  excluded_by uuid,
  PRIMARY KEY (club_id, user_id)
);

GRANT SELECT ON public.club_member_exclusions TO authenticated;
GRANT ALL ON public.club_member_exclusions TO service_role;
ALTER TABLE public.club_member_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view club exclusions"
  ON public.club_member_exclusions
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'app_admin'::app_role)
    OR public.has_role(auth.uid(), 'club_admin'::app_role, club_id)
  );

------------------------------------------------------------------------------
-- 2. Update membership checks to honour exclusions.
--    A user with an explicit user_roles row is normally not "excluded" because
--    the auto-clear trigger below wipes the exclusion the moment a role is
--    inserted. The exclusion clause therefore mainly filters guardian/parent-
--    derived membership.
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _user_id AND ur.team_id = _team_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.child_team_assignments cta
      JOIN public.children c ON c.id = cta.child_id
      WHERE cta.team_id = _team_id AND c.parent_id = _user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.child_team_assignments cta
      JOIN public.child_guardians cg ON cg.child_id = cta.child_id
      WHERE cta.team_id = _team_id AND cg.guardian_id = _user_id
    )
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.team_member_exclusions tme
    WHERE tme.team_id = _team_id AND tme.user_id = _user_id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.club_member_exclusions cme
    JOIN public.teams t ON t.id = _team_id
    WHERE cme.club_id = t.club_id AND cme.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_club_member(_user_id uuid, _club_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _user_id AND ur.club_id = _club_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.teams t ON t.id = ur.team_id
      WHERE ur.user_id = _user_id AND t.club_id = _club_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.child_team_assignments cta
      JOIN public.teams t ON t.id = cta.team_id
      JOIN public.children c ON c.id = cta.child_id
      WHERE t.club_id = _club_id AND c.parent_id = _user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.child_team_assignments cta
      JOIN public.teams t ON t.id = cta.team_id
      JOIN public.child_guardians cg ON cg.child_id = cta.child_id
      WHERE t.club_id = _club_id AND cg.guardian_id = _user_id
    )
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.club_member_exclusions cme
    WHERE cme.club_id = _club_id AND cme.user_id = _user_id
  );
$$;

------------------------------------------------------------------------------
-- 3. Auto-clear exclusions when a user is (re-)added to a role.
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clear_member_exclusion_on_role_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.team_id IS NOT NULL THEN
    DELETE FROM public.team_member_exclusions
      WHERE team_id = NEW.team_id AND user_id = NEW.user_id;
    DELETE FROM public.club_member_exclusions cme
      USING public.teams t
      WHERE t.id = NEW.team_id
        AND cme.club_id = t.club_id
        AND cme.user_id = NEW.user_id;
  END IF;
  IF NEW.club_id IS NOT NULL THEN
    DELETE FROM public.club_member_exclusions
      WHERE club_id = NEW.club_id AND user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_member_exclusion_on_role_insert ON public.user_roles;
CREATE TRIGGER trg_clear_member_exclusion_on_role_insert
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.clear_member_exclusion_on_role_insert();

------------------------------------------------------------------------------
-- 4. Replace remove_team_member / remove_club_member so they suppress via the
````

## src/pages/HomePage.tsx (starting line 93)

````text
// before the section becomes visible. Still lazy() so it doesn't block first paint.
const myTeamsCarouselImport = () =>
  import("@/components/MyTeamsPremiumCarousel").then((m) => ({ default: m.MyTeamsPremiumCarousel }));
// Fire the request immediately (don't await — let it stream alongside other resources).
myTeamsCarouselImport();
const MyTeamsPremiumCarousel = lazy(myTeamsCarouselImport);
// Eagerly imported: these render alongside the rest of the first Home paint —
// a lazy chunk made them appear noticeably after everything else.
import ClubLinksSection from "@/components/home/ClubLinksSection";
import ClubNewsSection from "@/components/home/ClubNewsSection";


import { NextUpCarousel } from "@/components/NextUpCarousel";
import { getCachedNextUp, setCachedNextUp, clearCachedNextUp } from "@/lib/nextUpEventsCache";
import { ContactClubButton } from "@/components/ContactClubButton";

import { HomeQuickActionsFab } from "@/components/HomeQuickActionsFab";
````

## src/pages/HomePage.tsx (starting line 2243)

````text

          {/* Club News - compact latest-post card; renders nothing when the club has no posts */}
          <Suspense fallback={null}>
            <ClubNewsSection />
          </Suspense>

          {/* Club Info & Links - collapsible tile grid directly below the teams carousel */}
          <Suspense fallback={null}>
            <ClubLinksSection />
          </Suspense>

          {/* Club Files - first-class entry point to the File Vault for permitted roles.
              Synchronous (role-based only) so it never causes a post-reveal layout shift. */}
          {canAccessVault && (
            <Card
              className="border overflow-hidden cursor-pointer bg-card"
              role="button"
````

## src/pages/ClubDetailPage.tsx (starting line 1)

````text
import { useState, useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClubSetupProgressCard } from "@/components/club/ClubSetupProgressCard";
import ClubLinksManager from "@/components/clubs/ClubLinksManager";
import { clearClubSetupLocalState } from "@/lib/clubSetupLocalState";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Users, Plus, Crown, Settings, Trash2, Pencil, Building2, Shield, Flame, Search, X, Folder, ChevronDown, ChevronRight, GripVertical, CreditCard, FolderPlus, Loader2, Gift, Lock, FolderOpen, MessageCircle, FolderInput, Trophy, Archive, ArchiveRestore, ArrowRightLeft, Sparkles, RefreshCw, FileSpreadsheet } from "lucide-react";
import { sendScheduleBroadcast } from "@/lib/scheduleBroadcast";
import { SwipeableRow } from "@/components/ui/swipeable-row";
import { ArchiveTeamDialog } from "@/components/ArchiveTeamDialog";
import { getSportEmoji } from "@/lib/sportEmojis";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
````

## src/pages/ClubDetailPage.tsx (starting line 635)

````text
        .eq("club_id", id)
        .in("role", ["club_admin", "team_admin", "coach", "committee_member"]);
      if (error) throw error;
      return (roles?.length ?? 0) > 0;
    },
    enabled: !!id && !!user,
  });

  const isAdmin = userRole === "club_admin" || isAppAdmin;
  const isMember = !!userRole || isAppAdmin;

  // Fetch pending invites for this club
  const { data: pendingInvites = [] } = useQuery({
    queryKey: ["pending-invites", null, id, isAdmin],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_invites")
````

## src/pages/ClubDetailPage.tsx (starting line 2522)

````text
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">Club Info & Links</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="pt-2">
              <ClubLinksManager clubId={id} />
            </div>
          </AccordionContent>
        </AccordionItem>
      )}



      {/* Club Branding - configurable by all admins; colours only apply on Pro */}
````

## src/App.tsx (starting line 50)

````text
// Lazy loaded pages (code splitting)
const EventsPage = lazyWithRetry(() => import("./pages/EventsPage"));
const EventDetailPage = lazyWithRetry(() => import("./pages/EventDetailPage"));
const CreateEventPage = lazyWithRetry(() => import("./pages/CreateEventPage"));
const EditEventPage = lazyWithRetry(() => import("./pages/EditEventPage"));
const ImportFixturesPage = lazyWithRetry(() => import("./pages/ImportFixturesPage"));
const ClubsPage = lazyWithRetry(() => import("./pages/ClubsPage"));
const ClubDetailPage = lazyWithRetry(() => import("./pages/ClubDetailPage"));
const ClubLinkEmbedPage = lazyWithRetry(() => import("./pages/ClubLinkEmbedPage"));
const CreateClubPage = lazyWithRetry(() => import("./pages/CreateClubPage"));
const ClubSetupWizardPage = lazyWithRetry(() => import("./pages/ClubSetupWizardPage"));
const StartPage = lazyWithRetry(() => import("./pages/StartPage"));
const StartTeamPage = lazyWithRetry(() => import("./pages/StartTeamPage"));
const EditClubPage = lazyWithRetry(() => import("./pages/EditClubPage"));
const CreateTeamPage = lazyWithRetry(() => import("./pages/CreateTeamPage"));
const EditTeamPage = lazyWithRetry(() => import("./pages/EditTeamPage"));
const TeamDetailPage = lazyWithRetry(() => import("./pages/TeamDetailPage"));
````

## src/App.tsx (starting line 431)

````text
                  <Route path="/events/:id/edit" element={<EditEventPage />} />
                  <Route path="/events/:id/groups/:groupId/pitch" element={<EventGroupPitchPage />} />
                  <Route path="/events/:id/groups/:groupId/duties" element={<EventGroupPitchPage />} />
                  <Route path="/clubs" element={<ClubsPage />} />
                  <Route path="/clubs/new" element={<CreateClubPage />} />
                  <Route path="/start" element={<StartPage />} />
                  <Route path="/teams/new" element={<StartTeamPage />} />
                  <Route path="/clubs/:id" element={<ClubDetailPage />} />
                  <Route path="/club-link/:linkId" element={<ClubLinkEmbedPage />} />
                  <Route path="/news" element={<ClubNewsPage />} />
                  <Route path="/news/:newsId" element={<ClubNewsPostPage />} />
                  <Route path="/clubs/:clubId/setup" element={<ClubSetupWizardPage />} />
                  <Route path="/clubs/:id/edit" element={<EditClubPage />} />
                  <Route path="/clubs/:clubId/teams/new" element={<CreateTeamPage />} />
                  <Route path="/clubs/:clubId/roles" element={<ManageRolesPage />} />
                  <Route path="/clubs/:clubId/rewards" element={<ClubRewardsPage />} />
                  <Route path="/clubs/:clubId/rewards/report" element={<ClubRewardsReportPage />} />
````

## src/integrations/supabase/types.ts (starting line 1759)

````text
      club_links: {
        Row: {
          club_id: string
          created_at: string
          created_by: string | null
          icon: string
          id: string
          is_active: boolean
          open_mode: string
          sort_order: number
          subtitle: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          open_mode?: string
          sort_order?: number
          subtitle?: string | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          open_mode?: string
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_links_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_links_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "public_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
````

## src/integrations/supabase/types.ts (starting line 2310)

````text
      clubs: {
        Row: {
          admin_user_id: string | null
          ai_catch_up_enabled: boolean
          allow_guests_default: boolean
          auto_reward_threshold: number | null
          bot_user_id: string | null
          chat_thread_ads_enabled: boolean
          city: string | null
          class_mode_enabled: boolean
          contact_email: string | null
          created_at: string
          created_by: string | null
          current_season_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          events_sponsor_strip_enabled: boolean
          force_disable_message_previews: boolean
          id: string
          invite_email_style: string
          is_pro: boolean
          kind: string
          last_message_at: string | null
          last_message_author_id: string | null
          last_message_author_name: string | null
          last_message_id: string | null
          last_message_image_url: string | null
          last_message_text: string | null
          latitude: number | null
          listed_on_marketplace: boolean
          logo_only_mode: boolean | null
          logo_url: string | null
          longitude: number | null
          max_guests_per_member_default: number
          media_header_sponsors_enabled: boolean
          media_sponsors_enabled: boolean
          member_count: number | null
          member_payments_enabled: boolean
          name: string
          notify_committee: boolean
          notify_committee_chat: boolean
          parent_org_id: string | null
          playhq_org_id: string | null
          playhq_tenant: string | null
          points_display_name: string | null
          points_icon_url: string | null
          primary_sponsor_id: string | null
          proposed_tier: string | null
          purged_at: string | null
          purged_by: string | null
          recognition_gold_threshold: number
          recognition_silver_threshold: number
          seeking_advertiser: boolean
          show_logo_in_header: boolean
          show_name_in_header: boolean | null
          sponsorship_pitch: string | null
          sport: string | null
          state: string | null
          storage_used_bytes: number
          stripe_connect_account_id: string | null
          stripe_connect_onboarding_complete: boolean
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_expiry: string | null
          subscription_source: string | null
          subscription_status: string
          team_count: number | null
          theme_accent_h: number | null
          theme_accent_l: number | null
          theme_accent_s: number | null
          theme_dark_accent_h: number | null
          theme_dark_accent_l: number | null
          theme_dark_accent_s: number | null
          theme_dark_primary_h: number | null
          theme_dark_primary_l: number | null
          theme_dark_primary_s: number | null
          theme_dark_secondary_h: number | null
          theme_dark_secondary_l: number | null
          theme_dark_secondary_s: number | null
          theme_enabled: boolean
          theme_primary_h: number | null
          theme_primary_l: number | null
          theme_primary_s: number | null
          theme_secondary_h: number | null
          theme_secondary_l: number | null
          theme_secondary_s: number | null
          updated_at: string
        }
        Insert: {
          admin_user_id?: string | null
          ai_catch_up_enabled?: boolean
          allow_guests_default?: boolean
          auto_reward_threshold?: number | null
          bot_user_id?: string | null
          chat_thread_ads_enabled?: boolean
          city?: string | null
          class_mode_enabled?: boolean
          contact_email?: string | null
          created_at?: string
          created_by?: string | null
          current_season_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          events_sponsor_strip_enabled?: boolean
          force_disable_message_previews?: boolean
          id?: string
          invite_email_style?: string
          is_pro?: boolean
          kind?: string
          last_message_at?: string | null
          last_message_author_id?: string | null
          last_message_author_name?: string | null
          last_message_id?: string | null
          last_message_image_url?: string | null
          last_message_text?: string | null
          latitude?: number | null
          listed_on_marketplace?: boolean
          logo_only_mode?: boolean | null
          logo_url?: string | null
          longitude?: number | null
          max_guests_per_member_default?: number
          media_header_sponsors_enabled?: boolean
          media_sponsors_enabled?: boolean
          member_count?: number | null
          member_payments_enabled?: boolean
          name: string
          notify_committee?: boolean
          notify_committee_chat?: boolean
          parent_org_id?: string | null
          playhq_org_id?: string | null
          playhq_tenant?: string | null
          points_display_name?: string | null
          points_icon_url?: string | null
          primary_sponsor_id?: string | null
          proposed_tier?: string | null
          purged_at?: string | null
          purged_by?: string | null
          recognition_gold_threshold?: number
          recognition_silver_threshold?: number
          seeking_advertiser?: boolean
          show_logo_in_header?: boolean
          show_name_in_header?: boolean | null
          sponsorship_pitch?: string | null
          sport?: string | null
          state?: string | null
          storage_used_bytes?: number
          stripe_connect_account_id?: string | null
          stripe_connect_onboarding_complete?: boolean
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_expiry?: string | null
          subscription_source?: string | null
          subscription_status?: string
          team_count?: number | null
          theme_accent_h?: number | null
          theme_accent_l?: number | null
          theme_accent_s?: number | null
          theme_dark_accent_h?: number | null
          theme_dark_accent_l?: number | null
          theme_dark_accent_s?: number | null
          theme_dark_primary_h?: number | null
          theme_dark_primary_l?: number | null
          theme_dark_primary_s?: number | null
          theme_dark_secondary_h?: number | null
          theme_dark_secondary_l?: number | null
          theme_dark_secondary_s?: number | null
          theme_enabled?: boolean
          theme_primary_h?: number | null
          theme_primary_l?: number | null
          theme_primary_s?: number | null
          theme_secondary_h?: number | null
          theme_secondary_l?: number | null
          theme_secondary_s?: number | null
          updated_at?: string
        }
        Update: {
          admin_user_id?: string | null
          ai_catch_up_enabled?: boolean
          allow_guests_default?: boolean
          auto_reward_threshold?: number | null
          bot_user_id?: string | null
          chat_thread_ads_enabled?: boolean
          city?: string | null
          class_mode_enabled?: boolean
          contact_email?: string | null
          created_at?: string
          created_by?: string | null
          current_season_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          events_sponsor_strip_enabled?: boolean
          force_disable_message_previews?: boolean
          id?: string
          invite_email_style?: string
          is_pro?: boolean
          kind?: string
          last_message_at?: string | null
          last_message_author_id?: string | null
          last_message_author_name?: string | null
          last_message_id?: string | null
          last_message_image_url?: string | null
          last_message_text?: string | null
          latitude?: number | null
          listed_on_marketplace?: boolean
          logo_only_mode?: boolean | null
          logo_url?: string | null
          longitude?: number | null
          max_guests_per_member_default?: number
          media_header_sponsors_enabled?: boolean
          media_sponsors_enabled?: boolean
          member_count?: number | null
          member_payments_enabled?: boolean
          name?: string
          notify_committee?: boolean
          notify_committee_chat?: boolean
          parent_org_id?: string | null
          playhq_org_id?: string | null
          playhq_tenant?: string | null
          points_display_name?: string | null
          points_icon_url?: string | null
          primary_sponsor_id?: string | null
          proposed_tier?: string | null
          purged_at?: string | null
          purged_by?: string | null
          recognition_gold_threshold?: number
          recognition_silver_threshold?: number
          seeking_advertiser?: boolean
          show_logo_in_header?: boolean
          show_name_in_header?: boolean | null
          sponsorship_pitch?: string | null
          sport?: string | null
          state?: string | null
          storage_used_bytes?: number
          stripe_connect_account_id?: string | null
          stripe_connect_onboarding_complete?: boolean
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_expiry?: string | null
          subscription_source?: string | null
          subscription_status?: string
          team_count?: number | null
          theme_accent_h?: number | null
          theme_accent_l?: number | null
          theme_accent_s?: number | null
          theme_dark_accent_h?: number | null
          theme_dark_accent_l?: number | null
          theme_dark_accent_s?: number | null
          theme_dark_primary_h?: number | null
          theme_dark_primary_l?: number | null
          theme_dark_primary_s?: number | null
          theme_dark_secondary_h?: number | null
          theme_dark_secondary_l?: number | null
          theme_dark_secondary_s?: number | null
          theme_enabled?: boolean
          theme_primary_h?: number | null
          theme_primary_l?: number | null
          theme_primary_s?: number | null
          theme_secondary_h?: number | null
          theme_secondary_l?: number | null
          theme_secondary_s?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clubs_current_season_id_fkey"
            columns: ["current_season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clubs_parent_org_id_fkey"
            columns: ["parent_org_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clubs_parent_org_id_fkey"
            columns: ["parent_org_id"]
            isOneToOne: false
            referencedRelation: "public_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clubs_primary_sponsor_id_fkey"
            columns: ["primary_sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
````

## src/integrations/supabase/types.ts (starting line 9618)

````text
      teams: {
        Row: {
          archived_at: string | null
          auto_chat_post_enabled: boolean
          auto_rsvp_dm_cadences: string[]
          auto_rsvp_dm_enabled: boolean
          auto_rsvp_dm_event_types: string[]
          auto_rsvp_push_cadences: string[]
          auto_rsvp_push_enabled: boolean
          auto_rsvp_push_event_types: string[]
          class_capacity: number | null
          class_day: string | null
          class_duration_minutes: number | null
          class_time: string | null
          club_id: string | null
          created_at: string
          created_by: string | null
          default_formation: string | null
          default_match_arrival_minutes: number | null
          default_pitch_format: string | null
          default_pitch_orientation: string | null
          default_pitch_view: string | null
          default_rsvp_audience: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          folder_id: string | null
          id: string
          is_archived: boolean
          is_pro: boolean
          is_shell: boolean
          last_message_at: string | null
          last_message_author_id: string | null
          last_message_author_name: string | null
          last_message_club_announcement_name: string | null
          last_message_id: string | null
          last_message_image_url: string | null
          last_message_is_club_announcement: boolean | null
          last_message_is_system: boolean | null
          last_message_text: string | null
          level_age: string | null
          lifecycle_status: Database["public"]["Enums"]["team_lifecycle_status"]
          logo_url: string | null
          name: string
          playhq_auto_create_events: boolean
          playhq_competition_id: string | null
          playhq_grade_id: string | null
          playhq_season_id: string | null
          playhq_team_id: string | null
          pro_activated_at: string | null
          pro_expires_at: string | null
          season_id: string | null
          season_label: string | null
          shell_claim_token: string | null
          shell_claimed_at: string | null
          shell_claimed_by: string | null
          shell_contact_email: string | null
          shell_contact_name: string | null
          shell_invited_by: string | null
          shell_last_invite_sent_at: string | null
          sponsor_id: string | null
          stripe_subscription_id: string | null
          team_type: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          auto_chat_post_enabled?: boolean
          auto_rsvp_dm_cadences?: string[]
          auto_rsvp_dm_enabled?: boolean
          auto_rsvp_dm_event_types?: string[]
          auto_rsvp_push_cadences?: string[]
          auto_rsvp_push_enabled?: boolean
          auto_rsvp_push_event_types?: string[]
          class_capacity?: number | null
          class_day?: string | null
          class_duration_minutes?: number | null
          class_time?: string | null
          club_id?: string | null
          created_at?: string
          created_by?: string | null
          default_formation?: string | null
          default_match_arrival_minutes?: number | null
          default_pitch_format?: string | null
          default_pitch_orientation?: string | null
          default_pitch_view?: string | null
          default_rsvp_audience?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          folder_id?: string | null
          id?: string
          is_archived?: boolean
          is_pro?: boolean
          is_shell?: boolean
          last_message_at?: string | null
          last_message_author_id?: string | null
          last_message_author_name?: string | null
          last_message_club_announcement_name?: string | null
          last_message_id?: string | null
          last_message_image_url?: string | null
          last_message_is_club_announcement?: boolean | null
          last_message_is_system?: boolean | null
          last_message_text?: string | null
          level_age?: string | null
          lifecycle_status?: Database["public"]["Enums"]["team_lifecycle_status"]
          logo_url?: string | null
          name: string
          playhq_auto_create_events?: boolean
          playhq_competition_id?: string | null
          playhq_grade_id?: string | null
          playhq_season_id?: string | null
          playhq_team_id?: string | null
          pro_activated_at?: string | null
          pro_expires_at?: string | null
          season_id?: string | null
          season_label?: string | null
          shell_claim_token?: string | null
          shell_claimed_at?: string | null
          shell_claimed_by?: string | null
          shell_contact_email?: string | null
          shell_contact_name?: string | null
          shell_invited_by?: string | null
          shell_last_invite_sent_at?: string | null
          sponsor_id?: string | null
          stripe_subscription_id?: string | null
          team_type?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          auto_chat_post_enabled?: boolean
          auto_rsvp_dm_cadences?: string[]
          auto_rsvp_dm_enabled?: boolean
          auto_rsvp_dm_event_types?: string[]
          auto_rsvp_push_cadences?: string[]
          auto_rsvp_push_enabled?: boolean
          auto_rsvp_push_event_types?: string[]
          class_capacity?: number | null
          class_day?: string | null
          class_duration_minutes?: number | null
          class_time?: string | null
          club_id?: string | null
          created_at?: string
          created_by?: string | null
          default_formation?: string | null
          default_match_arrival_minutes?: number | null
          default_pitch_format?: string | null
          default_pitch_orientation?: string | null
          default_pitch_view?: string | null
          default_rsvp_audience?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          folder_id?: string | null
          id?: string
          is_archived?: boolean
          is_pro?: boolean
          is_shell?: boolean
          last_message_at?: string | null
          last_message_author_id?: string | null
          last_message_author_name?: string | null
          last_message_club_announcement_name?: string | null
          last_message_id?: string | null
          last_message_image_url?: string | null
          last_message_is_club_announcement?: boolean | null
          last_message_is_system?: boolean | null
          last_message_text?: string | null
          level_age?: string | null
          lifecycle_status?: Database["public"]["Enums"]["team_lifecycle_status"]
          logo_url?: string | null
          name?: string
          playhq_auto_create_events?: boolean
          playhq_competition_id?: string | null
          playhq_grade_id?: string | null
          playhq_season_id?: string | null
          playhq_team_id?: string | null
          pro_activated_at?: string | null
          pro_expires_at?: string | null
          season_id?: string | null
          season_label?: string | null
          shell_claim_token?: string | null
          shell_claimed_at?: string | null
          shell_claimed_by?: string | null
          shell_contact_email?: string | null
          shell_contact_name?: string | null
          shell_invited_by?: string | null
          shell_last_invite_sent_at?: string | null
          sponsor_id?: string | null
          stripe_subscription_id?: string | null
          team_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "public_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "team_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_playhq_competition_id_fkey"
            columns: ["playhq_competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
````

## src/integrations/supabase/types.ts (starting line 7640)

````text
      profiles: {
        Row: {
          accessibility_prefs: Json
          active_club_theme_id: string | null
          ai_catch_up_acknowledged_at: string | null
          ai_catch_up_enabled: boolean
          avatar_url: string | null
          club_switcher_hint_seen_at: string | null
          created_at: string
          display_name: string | null
          email_hash: string | null
          events_view_mode: string | null
          has_sausage_reward: boolean | null
          id: string
          ignite_points: number
          last_seen_at: string | null
          leaderboard_opt_out: boolean
          photo_consent: boolean | null
          photo_consent_given_at: string | null
          privacy_accepted_at: string | null
          profile_visibility: string | null
          scheduled_deletion_at: string | null
          terms_accepted_at: string | null
          theme_preference: string | null
          updated_at: string
        }
        Insert: {
          accessibility_prefs?: Json
          active_club_theme_id?: string | null
          ai_catch_up_acknowledged_at?: string | null
          ai_catch_up_enabled?: boolean
          avatar_url?: string | null
          club_switcher_hint_seen_at?: string | null
          created_at?: string
          display_name?: string | null
          email_hash?: string | null
          events_view_mode?: string | null
          has_sausage_reward?: boolean | null
          id: string
          ignite_points?: number
          last_seen_at?: string | null
          leaderboard_opt_out?: boolean
          photo_consent?: boolean | null
          photo_consent_given_at?: string | null
          privacy_accepted_at?: string | null
          profile_visibility?: string | null
          scheduled_deletion_at?: string | null
          terms_accepted_at?: string | null
          theme_preference?: string | null
          updated_at?: string
        }
        Update: {
          accessibility_prefs?: Json
          active_club_theme_id?: string | null
          ai_catch_up_acknowledged_at?: string | null
          ai_catch_up_enabled?: boolean
          avatar_url?: string | null
          club_switcher_hint_seen_at?: string | null
          created_at?: string
          display_name?: string | null
          email_hash?: string | null
          events_view_mode?: string | null
          has_sausage_reward?: boolean | null
          id?: string
          ignite_points?: number
          last_seen_at?: string | null
          leaderboard_opt_out?: boolean
          photo_consent?: boolean | null
          photo_consent_given_at?: string | null
          privacy_accepted_at?: string | null
          profile_visibility?: string | null
          scheduled_deletion_at?: string | null
          terms_accepted_at?: string | null
          theme_preference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_club_theme_id_fkey"
            columns: ["active_club_theme_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_active_club_theme_id_fkey"
            columns: ["active_club_theme_id"]
            isOneToOne: false
            referencedRelation: "public_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
````

## src/integrations/supabase/types.ts (starting line 10083)

````text
      user_roles: {
        Row: {
          club_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          team_id: string | null
          user_id: string
          via_captain: boolean
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          team_id?: string | null
          user_id: string
          via_captain?: boolean
        }
        Update: {
          club_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          team_id?: string | null
          user_id?: string
          via_captain?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "public_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
````

## src/integrations/supabase/types.ts (starting line 1310)

````text
      children: {
        Row: {
          created_at: string
          id: string
          ignite_points: number
          name: string
          parent_id: string | null
          year_of_birth: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          ignite_points?: number
          name: string
          parent_id?: string | null
          year_of_birth?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          ignite_points?: number
          name?: string
          parent_id?: string | null
          year_of_birth?: number | null
        }
        Relationships: []
      }
````

## src/integrations/supabase/types.ts (starting line 1130)

````text
      child_guardians: {
        Row: {
          child_id: string
          created_at: string
          guardian_id: string
          id: string
          is_primary: boolean | null
          relationship_type: string | null
        }
        Insert: {
          child_id: string
          created_at?: string
          guardian_id: string
          id?: string
          is_primary?: boolean | null
          relationship_type?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string
          guardian_id?: string
          id?: string
          is_primary?: boolean | null
          relationship_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "child_guardians_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_guardians_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
````

## src/integrations/supabase/types.ts (starting line 1214)

````text
      child_team_assignments: {
        Row: {
          child_id: string
          created_at: string
          id: string
          team_id: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          team_id: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_team_assignments_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_team_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
````

## src/integrations/supabase/types.ts (starting line 1819)

````text
      club_member_exclusions: {
        Row: {
          club_id: string
          excluded_at: string
          excluded_by: string | null
          user_id: string
        }
        Insert: {
          club_id: string
          excluded_at?: string
          excluded_by?: string | null
          user_id: string
        }
        Update: {
          club_id?: string
          excluded_at?: string
          excluded_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_member_exclusions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_member_exclusions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "public_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
````

## src/integrations/supabase/types.ts (starting line 9158)

````text
      team_member_exclusions: {
        Row: {
          excluded_at: string
          excluded_by: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          excluded_at?: string
          excluded_by?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          excluded_at?: string
          excluded_by?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_member_exclusions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
````

## src/integrations/supabase/types.ts (starting line 10390)

````text
      vault_folders: {
        Row: {
          chat_group_id: string | null
          club_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          drive_folder_id: string | null
          id: string
          name: string
          parent_id: string | null
          restricted_roles: Database["public"]["Enums"]["app_role"][] | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          chat_group_id?: string | null
          club_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          drive_folder_id?: string | null
          id?: string
          name: string
          parent_id?: string | null
          restricted_roles?: Database["public"]["Enums"]["app_role"][] | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          chat_group_id?: string | null
          club_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          drive_folder_id?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          restricted_roles?: Database["public"]["Enums"]["app_role"][] | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_folders_chat_group_id_fkey"
            columns: ["chat_group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_folders_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_folders_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "public_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "vault_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_folders_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
````

## src/integrations/supabase/types.ts (starting line 10288)

````text
      vault_files: {
        Row: {
          club_id: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          drive_file_id: string | null
          drive_modified_time: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          folder_id: string | null
          id: string
          is_external_link: boolean | null
          mini_league_id: string | null
          name: string
          storage_bucket: string | null
          storage_path: string | null
          team_id: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          drive_file_id?: string | null
          drive_modified_time?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          folder_id?: string | null
          id?: string
          is_external_link?: boolean | null
          mini_league_id?: string | null
          name: string
          storage_bucket?: string | null
          storage_path?: string | null
          team_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          club_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          drive_file_id?: string | null
          drive_modified_time?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          folder_id?: string | null
          id?: string
          is_external_link?: boolean | null
          mini_league_id?: string | null
          name?: string
          storage_bucket?: string | null
          storage_path?: string | null
          team_id?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vault_files_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_files_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "public_clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "vault_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_files_mini_league_id_fkey"
            columns: ["mini_league_id"]
            isOneToOne: false
            referencedRelation: "mini_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_files_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
````
