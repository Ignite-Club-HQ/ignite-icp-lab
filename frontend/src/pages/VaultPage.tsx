import { useState, useMemo, useCallback, useRef, useEffect, Suspense } from "react";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { getShareUrl } from "@/lib/shareUtils";
import { resolveDriveTitlesForClub } from "@/features/vault/driveTitleResolution";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { FolderOpen, FileText, Lock, Crown, ChevronRight, ChevronDown, ArrowLeft, Upload, Trash2, Download, FolderPlus, Plus, Pencil, FolderDown, Loader2, FileArchive, X, CheckSquare, Square, FileImage, HardDrive, ShoppingCart, RotateCcw, ExternalLink, Sheet, FileSpreadsheet, Link2, CloudDownload, MoreVertical, RefreshCw, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateFolderDialog } from "@/components/vault/CreateFolderDialog";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
const GoogleDriveImportDialog = lazyWithRetry(() => import("@/components/vault/GoogleDriveImportDialog").then(m => ({ default: m.GoogleDriveImportDialog })));
const LinkDriveFolderDialog = lazyWithRetry(() => import("@/components/vault/LinkDriveFolderDialog").then(m => ({ default: m.LinkDriveFolderDialog })));
const UploadFilesDialog = lazyWithRetry(() => import("@/components/vault/UploadFilesDialog").then(m => ({ default: m.UploadFilesDialog })));
const AddLinkDialog = lazyWithRetry(() => import("@/components/vault/AddLinkDialog").then(m => ({ default: m.AddLinkDialog })));
const MoveFileDialog = lazyWithRetry(() => import("@/components/vault/MoveFileDialog").then(m => ({ default: m.MoveFileDialog })));
const VaultStorageBreakdown = lazyWithRetry(() => import("@/components/vault/VaultStorageBreakdown").then(m => ({ default: m.VaultStorageBreakdown })));
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { getFolderColorClass } from "@/components/TeamFoldersManager";
import { VaultStorageBarRow } from "@/components/vault/VaultStorageBarRow";
import { fuzzyFilter } from "@/lib/fuzzySearch";
import { useDebounce } from "@/hooks/useDebounce";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { removePhotoFromCache } from "@/lib/mediaCache";
import { downloadImage } from "@/lib/downloadImage";
const StoragePurchaseDialog = lazyWithRetry(() => import("@/components/StoragePurchaseDialog").then(m => ({ default: m.StoragePurchaseDialog })));
import { useClubTheme } from "@/hooks/useClubTheme";
import {
  buildVaultStorageUrl,
  compensateVaultUpload,
  reserveVaultStorage,
  settleVaultStorage,
} from "@/lib/vaultUpload";
import { permanentlyDeleteVaultItems } from "@/lib/vaultDelete";
import { fetchVaultFolderContents, collectVaultExportContents } from "@/features/vault/vaultExportRepository";
import { isVaultImageItem } from "@/features/vault/vaultItemClassification";
import { summarizeVaultDeletion, buildVaultDeleteMessage } from "@/features/vault/vaultDeleteReporting";
import { runZipExport, summarizeZipExport, type ZipExportItem } from "@/features/vault/vaultZipExport";
import {
  createVaultFolder,
  deleteVaultFolder,
  renameVaultFolder,
  renameVaultItem,
} from "@/features/vault/vaultMutationRepository";
import { formatVaultFileSize } from "@/features/vault/vaultFilePresentation";
import { useVaultTrashWorkflow } from "@/features/vault/useVaultTrashWorkflow";
import {
  emptyVaultStorageBreakdown,
  fetchVaultStorageBreakdown,
  fetchVaultStorageSubscription,
} from "@/features/vault/vaultStorageRepository";

async function createZipArchive() {
  const { default: JSZip } = await import("jszip");
  return new JSZip();
}




import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
} from "@/components/ui/sheet";

type FolderView = 
  | { type: "root" }
  | { type: "club"; clubId: string; clubName: string; folderId?: string; folderName?: string }
  | { type: "team"; clubId: string; clubName: string; teamId: string; teamName: string; folderId?: string; folderName?: string }
  | { type: "mini-league"; clubId: string; clubName: string; miniLeagueId: string; miniLeagueName: string; folderId?: string; folderName?: string };

// Clubs allowed to use Google Drive import / sync features.
const DRIVE_IMPORT_ALLOWED_CLUB_IDS = new Set<string>([
  "966bdaec-ebf1-46da-b2b3-cc53bf05c422", // Bridgewater Soccer Club
  "493ee2e3-c834-487d-93be-d1c8a0dbc4a8", // Basket Range Cricket Club
  "36231b76-5313-478e-b8d5-23ac4f5e8b10", // Riverside FC
]);

import { IcpUnavailablePage } from "@/components/IcpUnavailablePage";
import { resolveLocalAuthMode } from "@/lab/localRuntimeMode";
import { VaultContentRenderer, VaultStorageTeamProjection, type ContentSectionProps, type TrashSectionProps } from "@/components/vault/VaultContentRenderer";
import { invalidateVaultCache } from "@/features/vault/vaultQueryKeys";
import {
  canAccessVault as resolveVaultAccess,
  getVaultAdminUpgradeInfo,
  getVaultTeamIds,
  hasVaultRoleAccess as resolveVaultRoleAccess,
  isVaultClubAdminOrCommittee,
  isVaultCoachOrTeamAdmin,
  resolveVaultVisibleClubIds,
} from "@/lab/vaultAccess";

export default function VaultPage() {
  if (resolveLocalAuthMode(typeof window !== "undefined" ? window.location.search : "", true)) {
    return <IcpUnavailablePage title="Vault storage is unavailable in ICP lab mode" description="Protected file metadata, authorization, and encrypted object storage require an approved provider-neutral design." />;
  }
  return <SupabaseVaultPage />;
}

function SupabaseVaultPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { folderId: urlFolderId } = useParams<{ folderId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  // Capture once — subsequent setSearchParams({}, { replace: true }) calls
  // below wipe location.state, which would otherwise lose the fromChat flag
  // and break the header back button after opening from a chat's pinned vault.
  const [fromChat] = useState<boolean>(
    () => (location.state as { fromChat?: boolean } | null)?.fromChat === true,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeClubFilter } = useClubTheme();
  const [currentView, setCurrentView] = useState<FolderView>({ type: "root" });
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [vaultSearchQuery, setVaultSearchQuery] = useState("");
  const debouncedVaultSearchQuery = useDebounce(vaultSearchQuery, 300);
  useEffect(() => { setVaultSearchQuery(""); }, [currentView]);

  const [uploadType, setUploadType] = useState<"photo" | "file">("photo");
  const [fileName, setFileName] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [deletePhotoId, setDeletePhotoId] = useState<string | null>(null);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [restoreItemId, setRestoreItemId] = useState<string | null>(null);
  const [restoreItemType, setRestoreItemType] = useState<"photo" | "file">("photo");
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([]);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");
  const [renameFileId, setRenameFileId] = useState<string | null>(null);
  const [renameFileName, setRenameFileName] = useState("");
  const [renamePhotoId, setRenamePhotoId] = useState<string | null>(null);
  const [renamePhotoName, setRenamePhotoName] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const exportAbortController = useRef<AbortController | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
  const [exportPreviewData, setExportPreviewData] = useState<{
    photos: any[];
    files: any[];
    folderBreakdown: { path: string; photoCount: number; fileCount: number }[];
    loading: boolean;
  }>({ photos: [], files: [], folderBreakdown: [], loading: false });
  const [excludedFolders, setExcludedFolders] = useState<Set<string>>(new Set());
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);
  const [pendingExportAction, setPendingExportAction] = useState<{ type: 'zip' | 'download' | 'zipAll'; includeSubfolders?: boolean } | null>(null);
  const [largeFilesDialogOpen, setLargeFilesDialogOpen] = useState(false);
  const [largeFilesData, setLargeFilesData] = useState<{
    loading: boolean;
    items: Array<{ id: string; type: 'photo' | 'file'; name: string; size: number; url: string; teamName?: string; createdAt: string }>;
  }>({ loading: false, items: [] });
  const [selectedLargeFiles, setSelectedLargeFiles] = useState<Set<string>>(new Set());
  const [deletingLargeFiles, setDeletingLargeFiles] = useState(false);
  const [largeFilesSortBy, setLargeFilesSortBy] = useState<'size' | 'date' | 'type'>('size');
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [storagePurchaseDialogOpen, setStoragePurchaseDialogOpen] = useState(false);
  const [addLinkDialogOpen, setAddLinkDialogOpen] = useState(false);
  const [addingLink, setAddingLink] = useState(false);
  const [moveFileDialogOpen, setMoveFileDialogOpen] = useState(false);
  const [fileToMove, setFileToMove] = useState<{ id: string; name: string; folder_id: string | null; team_id?: string | null } | null>(null);
  const [googleDriveImportOpen, setGoogleDriveImportOpen] = useState(false);
  const [linkDriveFolderOpen, setLinkDriveFolderOpen] = useState(false);
  const [resolvingDriveTitles, setResolvingDriveTitles] = useState(false);

  const handleResolveDriveTitles = async () => {
    const clubId = currentView.type !== "root" ? currentView.clubId : undefined;
    if (!clubId) return;
    setResolvingDriveTitles(true);
    const toastId = toast.loading("Fetching real Google Drive titles…");
    try {
      const summary = await resolveDriveTitlesForClub(
        clubId,
        (name, options) => supabase.functions.invoke(name, options),
      );
      if (!summary || summary.scanned === 0) {
        toast.success("No Google files needed renaming.", { id: toastId });
      } else {
        const parts: string[] = [`${summary.updated} renamed`];
        if (summary.unresolved > 0) parts.push(`${summary.unresolved} unresolved`);
        if (summary.errors > 0) parts.push(`${summary.errors} errors`);
        toast.success(parts.join(" · "), {
          id: toastId,
          description:
            summary.unresolved > 0 && !summary.hasOAuth
              ? "Tip: link a Google Drive folder so private files can be renamed too."
              : undefined,
        });
        invalidateVaultCache(queryClient, ["files"]);
      }
    } catch (err: any) {
      console.error("resolve-drive-titles failed", err);
      toast.error("Couldn't fetch Drive titles", { id: toastId, description: err?.message });
    } finally {
      setResolvingDriveTitles(false);
    }
  };
  const [folderExportDialogOpen, setFolderExportDialogOpen] = useState(false);
  const [folderExportData, setFolderExportData] = useState<{
    folderId: string;
    folderName: string;
    photos: any[];
    files: any[];
    selectedPhotos: Set<string>;
    selectedFiles: Set<string>;
    loading: boolean;
  } | null>(null);

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedPhotos(new Set());
    setSelectedFiles(new Set());
  };

  const selectAll = () => {
    setSelectedPhotos(new Set((photos || []).map(p => p.id)));
    setSelectedFiles(new Set((files || []).map(f => f.id)));
  };

  const getSelectedItems = () => {
    const selectedPhotoItems = (photos || []).filter(p => selectedPhotos.has(p.id));
    const selectedFileItems = (files || []).filter(f => selectedFiles.has(f.id));
    return { photos: selectedPhotoItems, files: selectedFileItems };
  };

  const selectedCount = selectedPhotos.size + selectedFiles.size;

  const { data: isAppAdmin, isLoading: isLoadingAppAdmin } = useQuery({
    queryKey: ["is-app-admin", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "app_admin")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const { data: userRoles, isLoading: isLoadingRoles } = useQuery({
    queryKey: ["user-admin-roles", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role, club_id, team_id")
        .eq("user_id", user!.id);
      console.log("[Vault] Fetched userRoles for user", user!.id, ":", data);
      return data || [];
    },
    enabled: !!user,
  });

  // Check if user has vault access (admins and coaches only)
  const hasVaultRoleAccess = useMemo(() => {
    return resolveVaultRoleAccess(isAppAdmin ?? false, userRoles);
  }, [isAppAdmin, userRoles]);

  const { data: userClubs, isLoading: isLoadingClubs } = useQuery({
    queryKey: ["vault-clubs", user?.id, isAppAdmin],
    queryFn: async () => {
      if (isAppAdmin) {
        const { data: clubs } = await supabase
          .from("clubs")
          .select("id, name, is_pro, storage_used_bytes")
          .order("name");
        return clubs || [];
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("club_id, team_id")
        .eq("user_id", user!.id);

      if (!roles || roles.length === 0) return [];

      // Resolve visible club ids: direct club roles plus any club reached
      // through team membership (only looked up when a team role exists).
      const teamIds = getVaultTeamIds(roles);
      let teamClubIds: (string | null)[] | undefined;
      if (teamIds.length > 0) {
        const { data: teams } = await supabase
          .from("teams")
          .select("club_id")
          .in("id", teamIds);
        teamClubIds = teams?.map((t) => t.club_id);
      }

      const clubIds = resolveVaultVisibleClubIds(roles, teamClubIds);
      if (clubIds.length === 0) return [];

      const { data: clubs } = await supabase
        .from("clubs")
        .select("id, name, is_pro, storage_used_bytes")
        .in("id", clubIds);

      return clubs || [];
    },
    enabled: !!user && isAppAdmin !== undefined,
  });

  // Auto-navigate to club view when theme filter is active - only on initial load
  const hasAutoNavigatedRef = useRef(false);
  useEffect(() => {
    if (activeClubFilter && currentView.type === "root" && userClubs && userClubs.length > 0 && !hasAutoNavigatedRef.current) {
      const club = userClubs.find(c => c.id === activeClubFilter);
      if (club && club.is_pro) {
        hasAutoNavigatedRef.current = true;
        setCurrentView({ type: "club", clubId: activeClubFilter, clubName: club.name });
      }
    }
  }, [activeClubFilter, userClubs, currentView.type]);

  // Handle Google OAuth callback from redirect
  // The OAuth code is now captured in App.tsx before router init
  // This effect just processes any saved errors
  useEffect(() => {
    const savedError = sessionStorage.getItem('googleDriveOAuthError');
    
    if (savedError) {
      console.error("[GoogleDrive OAuth] Error from Google:", savedError);
      toast.error("Google authentication was cancelled or failed");
      sessionStorage.removeItem('googleDriveOAuthError');
      sessionStorage.removeItem('googleDriveImportPending');
    }
  }, []);
  
  // Process saved OAuth code
  useEffect(() => {
    const savedCode = sessionStorage.getItem('googleDriveOAuthCode');
    
    if (savedCode) {
      console.log("[GoogleDrive OAuth] Processing saved code");
      sessionStorage.removeItem('googleDriveOAuthCode');
      
      const exchangeCode = async () => {
        try {
          const isNative = typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
          const redirectUri = isNative ? 'https://reference.invalid' : `${window.location.origin}/vault`;
          console.log("[GoogleDrive OAuth] Exchanging code with redirectUri:", redirectUri);
          
          const { data, error: exchangeError } = await supabase.functions.invoke('google-drive-import?action=exchange-code', {
            body: { code: savedCode, redirectUri },
          });
          
          if (exchangeError || data?.error) {
            console.error("[GoogleDrive OAuth] Token exchange failed:", data?.error || exchangeError);
            toast.error("Failed to connect to Google Drive");
            return;
          }
          
          console.log("[GoogleDrive OAuth] Token exchange successful");

          // Determine flow: "link a folder" pending takes precedence over "import"
          const linkPending = sessionStorage.getItem('driveLinkPending');
          if (linkPending) {
            sessionStorage.removeItem('driveLinkPending');
            sessionStorage.setItem('driveLinkAccessToken', data.accessToken);
            if (data.refreshToken) sessionStorage.setItem('driveLinkRefreshToken', data.refreshToken);
            if (data.googleEmail) sessionStorage.setItem('driveLinkGoogleEmail', data.googleEmail);
            setLinkDriveFolderOpen(true);
          } else {
            sessionStorage.setItem('googleDriveAccessToken', data.accessToken);
            // Also stash refresh token + google email so the import dialog can
            // optionally create a sync link for any folder the user imports.
            if (data.refreshToken) sessionStorage.setItem('googleDriveRefreshToken', data.refreshToken);
            if (data.googleEmail) sessionStorage.setItem('googleDriveGoogleEmail', data.googleEmail);
            setGoogleDriveImportOpen(true);
          }
        } catch (err) {
          console.error("[GoogleDrive OAuth] Exception:", err);
          toast.error("Failed to connect to Google Drive");
        } finally {
          sessionStorage.removeItem('googleDriveImportPending');
        }
      };
      
      exchangeCode();
    }
  }, []); // Only run on mount after the first effect

  // Check if user is a club admin or committee member for the current club (can see all teams)
  const isClubAdminOrCommittee = useMemo(() => {
    return isVaultClubAdminOrCommittee(isAppAdmin ?? false, currentView, userRoles);
  }, [isAppAdmin, currentView, userRoles]);

  // Alias for backward compatibility
  const isClubAdmin = isClubAdminOrCommittee;

  // Check if user is a coach or team admin in the current club (can see club-level chat folders)
  const isCoachOrTeamAdmin = useMemo(() => {
    return isVaultCoachOrTeamAdmin(isClubAdmin, currentView, userRoles);
  }, [isClubAdmin, currentView, userRoles]);

  // Get first admin club/team for upgrade link
  const adminUpgradeInfo = useMemo(() => {
    return getVaultAdminUpgradeInfo(userRoles);
  }, [userRoles]);

  // Get teams user has access to
  const userTeamIds = useMemo(() => {
    return getVaultTeamIds(userRoles);
  }, [userRoles]);

  // Check if the current club has Pro
  const { data: currentClubHasPro, isLoading: isLoadingClubHasPro } = useQuery({
    queryKey: ["vault-club-has-pro", (currentView.type === "club" || currentView.type === "team" || currentView.type === "mini-league") ? currentView.clubId : null],
    queryFn: async () => {
      if (currentView.type !== "club" && currentView.type !== "team" && currentView.type !== "mini-league") return false;
      const clubId = currentView.clubId;
      const { data } = await supabase
        .from("club_subscriptions")
        .select("is_pro, is_pro_football, admin_pro_override, admin_pro_football_override")
        .eq("club_id", clubId)
        .maybeSingle();
      return !!(data?.is_pro || data?.is_pro_football || data?.admin_pro_override || data?.admin_pro_football_override);
    },
    enabled: currentView.type === "club" || currentView.type === "team" || currentView.type === "mini-league",
  });

  // Check if the current team has Pro (for teams in non-Pro clubs)
  const { data: currentTeamHasPro, isLoading: isLoadingTeamHasPro } = useQuery({
    queryKey: ["vault-team-has-pro", currentView.type === "team" ? currentView.teamId : null],
    queryFn: async () => {
      if (currentView.type !== "team") return false;
      const { data } = await supabase
        .from("team_subscriptions")
        .select("is_pro, is_pro_football, admin_pro_override, admin_pro_football_override")
        .eq("team_id", currentView.teamId)
        .maybeSingle();
      return !!(data?.is_pro || data?.is_pro_football || data?.admin_pro_override || data?.admin_pro_football_override);
    },
    enabled: currentView.type === "team",
  });

  // Determine if current context has Pro access for uploads
  const currentContextHasPro = useMemo(() => {
    if (currentView.type === "club") {
      return currentClubHasPro || false;
    }
    if (currentView.type === "team") {
      // Team inherits Pro if club has Pro, or team has individual Pro
      return currentClubHasPro || currentTeamHasPro || false;
    }
    if (currentView.type === "mini-league") {
      // Mini-leagues are only available for Pro Football clubs
      return currentClubHasPro || false;
    }
    return false;
  }, [currentView.type, currentClubHasPro, currentTeamHasPro]);

  const { data: clubTeams } = useQuery({
    queryKey: ["vault-club-teams", currentView.type === "club" ? currentView.clubId : null, isClubAdmin, userTeamIds, currentClubHasPro],
    queryFn: async () => {
      if (currentView.type !== "club") return [];
      
      // First get all teams user can potentially access
      let teams: { id: string; name: string; folder_id: string | null }[] = [];
      
      if (isClubAdmin) {
        // Club admins and app admins can see all teams
        const { data } = await supabase
          .from("teams")
          .select("id, name, folder_id")
          .eq("club_id", currentView.clubId)
          .is("deleted_at", null)
          .order("name");
        teams = data || [];
      } else {
        // Non-club admins only see teams they are members of
        if (userTeamIds.length === 0) return [];
        
        const { data } = await supabase
          .from("teams")
          .select("id, name, folder_id")
          .eq("club_id", currentView.clubId)
          .in("id", userTeamIds)
          .is("deleted_at", null)
          .order("name");
        teams = data || [];
      }
      
      // If club has Pro, all teams inherit it - show all
      if (currentClubHasPro) return teams;
      
      // If club doesn't have Pro, only show teams with individual Pro subscriptions
      if (teams.length === 0) return [];
      
      const teamIds = teams.map(t => t.id);
      const { data: teamSubs } = await supabase
        .from("team_subscriptions")
        .select("team_id, is_pro, is_pro_football, admin_pro_override, admin_pro_football_override")
        .in("team_id", teamIds);
      
      const proTeamIds = new Set(
        (teamSubs || [])
          .filter(sub => sub.is_pro || sub.is_pro_football || sub.admin_pro_override || sub.admin_pro_football_override)
          .map(sub => sub.team_id)
      );
      
      return teams.filter(t => proTeamIds.has(t.id));
    },
    enabled: currentView.type === "club" && currentClubHasPro !== undefined,
  });

  // Fetch team folders for the current club
  const { data: teamFolders } = useQuery({
    queryKey: ["vault-team-folders", currentView.type === "club" ? currentView.clubId : null],
    queryFn: async () => {
      if (currentView.type !== "club") return [];
      const { data } = await supabase
        .from("team_folders")
        .select("*")
        .eq("club_id", currentView.clubId)
        .order("sort_order", { ascending: true });
      return data || [];
    },
    enabled: currentView.type === "club",
  });

  // Fetch mini-leagues for the current club (Pro Football only)
  const { data: clubMiniLeagues } = useQuery({
    queryKey: ["vault-club-mini-leagues", currentView.type === "club" ? currentView.clubId : null, isClubAdmin, user?.id, userRoles?.length],
    queryFn: async () => {
      if (currentView.type !== "club") return [];
      
      const clubId = currentView.clubId;
      
      // First fetch the user's roles fresh to avoid stale closure issues
      const { data: freshRoles } = await supabase
        .from("user_roles")
        .select("role, club_id, team_id")
        .eq("user_id", user!.id);
      
      console.log("[Vault Mini-Leagues] Fresh roles for user:", user!.id, freshRoles);
      
      // Check if club has Pro Football access
      const { data: clubSub } = await supabase
        .from("club_subscriptions")
        .select("is_pro_football, admin_pro_football_override")
        .eq("club_id", clubId)
        .maybeSingle();
      
      const hasProFootball = clubSub?.is_pro_football || clubSub?.admin_pro_football_override;
      if (!hasProFootball && !isAppAdmin) {
        console.log("[Vault Mini-Leagues] Club doesn't have Pro Football, returning empty");
        return [];
      }
      
      // Check roles from freshly fetched data
      const isClubAdminRole = freshRoles?.some(r => r.role === "club_admin" && r.club_id === clubId);
      const isLeagueAdmin = freshRoles?.some(r => r.role === "league_admin" && r.club_id === clubId);
      const isCoach = freshRoles?.some(r => r.role === "coach" && r.club_id === clubId);
      const isCommitteeMember = freshRoles?.some(r => r.role === "committee_member" && r.club_id === clubId);
      
      console.log("[Vault Mini-Leagues Debug]", {
        clubId,
        freshRoles,
        isAppAdmin,
        isClubAdminRole,
        isLeagueAdmin,
        isCoach,
        isCommitteeMember,
        hasAccess: isAppAdmin || isClubAdminRole || isLeagueAdmin || isCoach || isCommitteeMember
      });
      
      if (isAppAdmin || isClubAdminRole || isLeagueAdmin || isCoach || isCommitteeMember) {
        // Admins, committee members, coaches and league admins can see all mini-leagues
        const { data } = await supabase
          .from("mini_leagues")
          .select("id, name")
          .eq("club_id", clubId)
          .order("name");
        console.log("[Vault Mini-Leagues] Fetched leagues:", data);
        return data || [];
      } else {
        // Parents can only see leagues their children are in
        console.log("[Vault Mini-Leagues] User doesn't have admin access, checking for children");
        const { data: playerLeagues } = await supabase
          .from("mini_league_players")
          .select("mini_league_id, mini_leagues!inner(id, name, club_id)")
          .eq("parent_user_id", user!.id);
        
        if (playerLeagues) {
          const filtered = playerLeagues
            .filter((pl: any) => pl.mini_leagues?.club_id === clubId)
            .map((pl: any) => ({ id: pl.mini_leagues.id, name: pl.mini_leagues.name }));
          console.log("[Vault Mini-Leagues] Leagues via children:", filtered);
          return filtered;
        }
        return [];
      }
    },
    enabled: currentView.type === "club" && !!user,
  });

  const getCurrentFolderId = () => {
    if (currentView.type === "club" || currentView.type === "team" || currentView.type === "mini-league") {
      return currentView.folderId || null;
    }
    return null;
  };

  const getCurrentClubId = () => {
    if (currentView.type === "club") return currentView.clubId;
    if (currentView.type === "team") return currentView.clubId;
    if (currentView.type === "mini-league") return currentView.clubId;
    return null;
  };

  const getCurrentTeamId = () => {
    if (currentView.type === "team") return currentView.teamId;
    return null;
  };

  const getCurrentMiniLeagueId = () => {
    if (currentView.type === "mini-league") return currentView.miniLeagueId;
    return null;
  };

  const CHAT_FOLDER_NAMES = ["Chat Images", "Chat Links"];

  // Roles the current user holds in the active club (used to filter
  // role-restricted chat folders like "Coaches Chat", "Club Admin Chat", etc.)
  const userClubRoleSet = useMemo(() => {
    const set = new Set<string>();
    const clubId = getCurrentClubId();
    if (!clubId || !userRoles) return set;
    userRoles.forEach((r: any) => {
      if (r.club_id === clubId && r.role) set.add(r.role as string);
    });
    return set;
  }, [userRoles, currentView]);

  const { data: subfolders } = useQuery({
    queryKey: ["vault-subfolders", currentView, isClubAdmin, isCoachOrTeamAdmin, isAppAdmin, Array.from(userClubRoleSet).sort().join(",")],
    queryFn: async () => {
      const clubId = getCurrentClubId();
      const teamId = getCurrentTeamId();
      const miniLeagueId = getCurrentMiniLeagueId();
      const parentFolderId = getCurrentFolderId();
      
      // Build filter conditions based on view type
      let filters: Record<string, any> = {};
      let nullFilters: string[] = [];
      
      if (currentView.type === "club") {
        // Allow non-admin users into the club view ONLY if they may have
        // role-restricted chat folders to see (coaches, team admins, league admins).
        // Generic vault access stays admin-only.
        if (!isClubAdmin && !isCoachOrTeamAdmin && userClubRoleSet.size === 0) return [];
        filters.club_id = clubId;
        // vault_folders does not have a mini_league_id column; only filter by team_id.
        nullFilters = ["team_id"];
      } else if (currentView.type === "team") {
        filters.team_id = teamId;
      } else if (currentView.type === "mini-league") {
        // vault_folders has no mini_league_id column — there are no folders for mini-leagues.
        return [];
      }
      
      if (parentFolderId) {
        filters.parent_id = parentFolderId;
      } else {
        nullFilters.push("parent_id");
      }
      
      // Execute query with filters - use type assertion to avoid deep type instantiation
      let query: any = supabase.from("vault_folders").select("*").is("deleted_at", null);
      
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }
      
      for (const nullField of nullFilters) {
        query = query.is(nullField, null);
      }
      
      const { data } = await query.order("name");
      let folders = (data || []) as { id: string; name: string; parent_id: string | null; club_id: string | null; team_id: string | null; mini_league_id: string | null; chat_group_id: string | null; restricted_roles: string[] | null; created_at: string }[];

      // Apply role-restriction filtering for chat-scoped folders.
      // Club admins, committee members, and app admins can always see them.
      const isPrivilegedViewer = isAppAdmin || isClubAdmin;
      folders = folders.filter((f) => {
        if (!f.restricted_roles || f.restricted_roles.length === 0) return true;
        if (isPrivilegedViewer) return true;
        return f.restricted_roles.some((r) => userClubRoleSet.has(r));
      });

      // Non-admin coaches/team admins at club root can only see chat-scoped folders
      // (generic Chat Images / Chat Links, plus any role-restricted chat folder
      // they qualify for via restricted_roles above).
      if (currentView.type === "club" && !isClubAdmin && isCoachOrTeamAdmin) {
        folders = folders.filter(
          (f) =>
            CHAT_FOLDER_NAMES.includes(f.name) ||
            (f.restricted_roles && f.restricted_roles.length > 0)
        );
      }

      return folders;
    },
    enabled: currentView.type !== "root",
  });

  const [showTrash, setShowTrash] = useState(false);

  // Vault now reads all content from vault_files table only
  // Photos uploaded via Media page are also added to vault_files
  // Photos uploaded directly to Vault stay in vault_files only (not in photos table)
  const { data: vaultItems } = useQuery({
    queryKey: ["vault-files", currentView, isClubAdmin, isCoachOrTeamAdmin],
    queryFn: async () => {
      const folderId = getCurrentFolderId();
      let query = supabase.from("vault_files").select("*").is("deleted_at", null);
      
      if (currentView.type === "club") {
        if (!isClubAdmin && !isCoachOrTeamAdmin) return [];
        query = query.eq("club_id", currentView.clubId).is("team_id", null).is("mini_league_id", null);
        
        // Non-admin coaches/team admins can only see files inside chat folders
        if (!isClubAdmin && isCoachOrTeamAdmin && !folderId) {
          // At root level with no folder selected, they won't see loose files
          return [];
        }
      } else if (currentView.type === "team") {
        query = query.eq("team_id", currentView.teamId);
      } else if (currentView.type === "mini-league") {
        query = query.eq("mini_league_id", currentView.miniLeagueId);
      }
      
      if (folderId) {
        query = query.eq("folder_id", folderId);
      } else {
        query = query.is("folder_id", null);
      }
      
      const { data } = await query.order("created_at", { ascending: false });
      return data || [];
    },
    enabled: currentView.type !== "root" && !showTrash,
  });

  // Separate vault items into photos and files using the shared classifier
  const photos = useMemo(() => {
    if (!vaultItems) return [];
    return vaultItems.filter(isVaultImageItem).map(item => ({
      ...item,
      // Map vault_files fields to photo-like structure for compatibility
      image_url: item.file_url,
      uploader_id: item.uploaded_by,
      title: item.name, // Map name to title for compatibility with existing code
    }));
  }, [vaultItems]);

  const files = useMemo(() => {
    if (!vaultItems) return [];
    return vaultItems.filter(item => !isVaultImageItem(item));
  }, [vaultItems]);


  // Recursive search - always search inside subfolders when a query is active.
  // Performance strategy:
  //  - Debounce the query so we don't re-fetch on every keystroke.
  //  - Cache the folder tree per scope (no query in its key) so paths are
  //    available instantly across searches.
  //  - Push the name filter to Postgres via ilike so the payload only
  //    contains matches, not the entire vault.
  const recursiveEnabled = debouncedVaultSearchQuery.trim().length > 0 && currentView.type !== "root" && !showTrash;
  const recursiveScope = useMemo(() => ({
    type: currentView.type,
    clubId: getCurrentClubId(),
    teamId: getCurrentTeamId(),
    miniLeagueId: getCurrentMiniLeagueId(),
    startFolderId: getCurrentFolderId(),
  }), [currentView]);

  // Folder tree cache (per scope) — used for path display and descendant set.
  const { data: folderTree } = useQuery({
    queryKey: [
      "vault-folder-tree",
      recursiveScope.type,
      recursiveScope.clubId,
      recursiveScope.teamId,
      isClubAdmin,
      isAppAdmin,
      Array.from(userClubRoleSet).sort().join(","),
    ],
    queryFn: async () => {
      let folderQuery: any = supabase
        .from("vault_folders")
        .select("id,name,parent_id,restricted_roles");
      if (recursiveScope.type === "club") {
        folderQuery = folderQuery.eq("club_id", recursiveScope.clubId).is("team_id", null);
      } else if (recursiveScope.type === "team") {
        folderQuery = folderQuery.eq("team_id", recursiveScope.teamId);
      } else {
        return { descendants: [] as any[], pathById: new Map<string, string>(), descendantIds: [] as string[] };
      }
      const { data: rawFolders } = await folderQuery;
      const all = (rawFolders || []) as Array<{ id: string; name: string; parent_id: string | null; restricted_roles: string[] | null }>;
      const isPrivilegedViewer = isAppAdmin || isClubAdmin;
      const visible = all.filter((f) => {
        if (!f.restricted_roles || f.restricted_roles.length === 0) return true;
        if (isPrivilegedViewer) return true;
        return f.restricted_roles.some((r) => userClubRoleSet.has(r));
      });
      const childMap = new Map<string | null, typeof visible>();
      for (const f of visible) {
        const k = f.parent_id;
        if (!childMap.has(k)) childMap.set(k, []);
        childMap.get(k)!.push(f);
      }
      const descendants: typeof visible = [];
      const pathById = new Map<string, string>();
      const stack: { id: string | null; path: string }[] = [{ id: recursiveScope.startFolderId, path: "" }];
      while (stack.length) {
        const { id, path } = stack.pop()!;
        for (const k of (childMap.get(id) || [])) {
          const kPath = path ? `${path} / ${k.name}` : k.name;
          descendants.push(k);
          pathById.set(k.id, kPath);
          stack.push({ id: k.id, path: kPath });
        }
      }
      return { descendants, pathById, descendantIds: descendants.map((d) => d.id) };
    },
    enabled: recursiveScope.type === "club" || recursiveScope.type === "team",
    staleTime: 60_000,
  });

  const { data: recursiveData, isFetching: isFetchingRecursive } = useQuery({
    queryKey: [
      "vault-recursive-search",
      recursiveScope,
      debouncedVaultSearchQuery.trim().toLowerCase(),
      isClubAdmin,
      isCoachOrTeamAdmin,
      Array.from(userClubRoleSet).sort().join(","),
    ],
    queryFn: async () => {
      const safe = debouncedVaultSearchQuery.trim().replace(/[\\%_]/g, (m) => `\\${m}`);
      const pattern = `%${safe}%`;
      const tree = folderTree || { descendants: [], pathById: new Map<string, string>(), descendantIds: [] };
      const startFolderId = recursiveScope.startFolderId;

      // Server-side ilike on file name — only matches come back.
      let fileQuery: any = supabase
        .from("vault_files")
        .select("id,folder_id,club_id,team_id,mini_league_id,name,file_url,file_size,file_type,uploaded_by,created_at,is_external_link")
        .is("deleted_at", null)
        .ilike("name", pattern)
        .limit(200);
      if (recursiveScope.type === "club") {
        fileQuery = fileQuery.eq("club_id", recursiveScope.clubId).is("team_id", null).is("mini_league_id", null);
      } else if (recursiveScope.type === "team") {
        fileQuery = fileQuery.eq("team_id", recursiveScope.teamId);
      } else if (recursiveScope.type === "mini-league") {
        fileQuery = fileQuery.eq("mini_league_id", recursiveScope.miniLeagueId);
      }
      if (startFolderId) {
        const folderIds = [startFolderId, ...tree.descendantIds];
        fileQuery = fileQuery.in("folder_id", folderIds);
      }

      // Folder name matches come from the cached tree — no extra round-trip.
      const lower = debouncedVaultSearchQuery.trim().toLowerCase();
      const matchedFolders = (tree.descendants as any[]).filter((f) =>
        (f.name || "").toLowerCase().includes(lower)
      );

      const { data: rawFiles } = await fileQuery.order("created_at", { ascending: false });
      const visibleFolderIds = new Set(tree.descendants.map((d: any) => d.id));
      // For root searches with no startFolderId, also allow root-level files (folder_id null)
      const files = (rawFiles || [])
        .filter((f: any) => !f.folder_id || visibleFolderIds.has(f.folder_id) || f.folder_id === startFolderId)
        .map((f: any) => ({
          ...f,
          image_url: f.file_url,
          uploader_id: f.uploaded_by,
          title: f.name,
          folder_path: f.folder_id ? tree.pathById.get(f.folder_id) || "" : "",
        }));

      const foldersWithPath = matchedFolders.map((f: any) => ({
        ...f,
        folder_path: tree.pathById.get(f.id) || f.name,
      }));
      return { folders: foldersWithPath, files };
    },
    enabled: recursiveEnabled && !!folderTree,
    keepPreviousData: true,
    staleTime: 30_000,
  } as any);


  // Search filtering across folders, photos, and files (fuzzy + ranked)
  const normalizedSearch = vaultSearchQuery.trim();
  const recursiveResult = recursiveData as { folders: any[]; files: any[] } | undefined;
  const searchSourceFolders = recursiveEnabled ? (recursiveResult?.folders || []) : (subfolders || []);
  const searchSourcePhotos = recursiveEnabled
    ? ((recursiveResult?.files || []).filter((f: any) => f.file_type?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|bmp|svg|heic|heif|tiff|tif)$/i.test(f.name || f.file_url || "")))
    : (photos || []);
  const searchSourceFiles = recursiveEnabled
    ? ((recursiveResult?.files || []).filter((f: any) => !f.file_type?.startsWith("image/") && !/\.(jpg|jpeg|png|gif|webp|bmp|svg|heic|heif|tiff|tif)$/i.test(f.name || f.file_url || "")))
    : (files || []);
  const displaySubfolders = useMemo(() => {
    return fuzzyFilter(searchSourceFolders as any[], normalizedSearch, (f: any) => f.name || "");
  }, [searchSourceFolders, normalizedSearch]);
  const displayPhotos = useMemo(() => {
    return fuzzyFilter(searchSourcePhotos as any[], normalizedSearch, (p: any) => p.title || p.name || "");
  }, [searchSourcePhotos, normalizedSearch]);
  const displayFiles = useMemo(() => {
    return fuzzyFilter(searchSourceFiles as any[], normalizedSearch, (f: any) => f.name || "");
  }, [searchSourceFiles, normalizedSearch]);

  // Check for Pro subscription and get plan details
  // Logic: Club Pro → all teams inherit Pro; Free club → check team subscription
  const { data: proAccessInfo, isLoading: isLoadingProClub } = useQuery({
    queryKey: ["pro-access-info", user?.id],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("club_id, team_id")
        .eq("user_id", user!.id);

      if (!roles || roles.length === 0) return false;

      const clubIds = roles.map((r) => r.club_id).filter(Boolean) as string[];
      const teamIds = roles.map((r) => r.team_id).filter(Boolean) as string[];
      
      // Fetch team info to get parent club IDs
      let allClubIds = [...clubIds];
      if (teamIds.length > 0) {
        const { data: teams } = await supabase
          .from("teams")
          .select("id, club_id")
          .in("id", teamIds);
        
        if (teams) {
          teams.forEach(t => {
            if (t.club_id && !allClubIds.includes(t.club_id)) {
              allClubIds.push(t.club_id);
            }
          });
        }
      }
      
      // Check club-level Pro subscriptions first
      if (allClubIds.length > 0) {
        const { data: clubSubs } = await supabase
          .from("club_subscriptions")
          .select("club_id, is_pro, is_pro_football, admin_pro_override, admin_pro_football_override")
          .in("club_id", allClubIds);
        
        const hasClubPro = (clubSubs || []).some(sub => 
          sub.is_pro || sub.is_pro_football || sub.admin_pro_override || sub.admin_pro_football_override
        );
        
        if (hasClubPro) return true;
      }
      
      // For teams in free clubs, check team-level subscriptions
      if (teamIds.length > 0) {
        const { data: teamSubs } = await supabase
          .from("team_subscriptions")
          .select("team_id, is_pro, is_pro_football, admin_pro_override, admin_pro_football_override")
          .in("team_id", teamIds);
        
        const teamHasPro = (teamSubs || []).some(sub => 
          sub.is_pro || sub.is_pro_football || sub.admin_pro_override || sub.admin_pro_football_override
        );
        
        if (teamHasPro) return true;
      }

      // Fallback: Check for club is_pro flag
      if (allClubIds.length > 0) {
        const { data: clubs } = await supabase
          .from("clubs")
          .select("is_pro")
          .in("id", allClubIds)
          .eq("is_pro", true);

        return clubs && clubs.length > 0;
      }
      
      return false;
    },
    enabled: !!user,
  });

  const hasProClub = proAccessInfo ?? false;
  const isLoadingAccess = isLoadingAppAdmin || isLoadingProClub || isLoadingRoles || isLoadingClubHasPro || isLoadingTeamHasPro;
  // Vault access requires: 1) Pro subscription in current context AND 2) Admin/coach role
  const vaultAccessContextHasPro = currentView.type === "root" ? hasProClub : currentContextHasPro;
  const canAccessVault = resolveVaultAccess({
    isAppAdmin: isAppAdmin ?? false,
    hasRoleAccess: hasVaultRoleAccess,
    hasAnyPro: hasProClub,
    currentContextHasPro,
    isRoot: currentView.type === "root",
  });

  // Handle storage purchase success redirect
  useEffect(() => {
    if (searchParams.get("success") === "storage") {
      toast.success("Storage add-on purchased successfully! Your storage limit has been increased.");
      searchParams.delete("success");
      setSearchParams(searchParams, { replace: true });
      queryClient.invalidateQueries({ queryKey: ["club-purchased-storage"] });
      invalidateVaultCache(queryClient, ["clubs"]);
    }
  }, [searchParams, setSearchParams, queryClient]);

  // Load folder from URL parameter
  useEffect(() => {
    const loadFolderFromUrl = async () => {
      if (!urlFolderId || initialLoadComplete || !userClubs) return;
      
      try {
        // Fetch the folder to get its details
        const { data: folder, error } = await supabase
          .from("vault_folders")
          .select("*, teams!vault_folders_team_id_fkey(id, name, club_id), clubs!club_id(id, name)")
          .eq("id", urlFolderId)
          .maybeSingle();
        
        if (error || !folder) {
          toast.error("Folder not found or access denied");
          navigate("/vault", { replace: true });
          setInitialLoadComplete(true);
          return;
        }

        // Build folder path by traversing parent folders
        const path: { id: string; name: string }[] = [];
        let currentFolderId = folder.parent_id;
        
        while (currentFolderId) {
          const { data: parentFolder } = await supabase
            .from("vault_folders")
            .select("id, name, parent_id")
            .eq("id", currentFolderId)
            .maybeSingle();
          
          if (parentFolder) {
            path.unshift({ id: parentFolder.id, name: parentFolder.name });
            currentFolderId = parentFolder.parent_id;
          } else {
            break;
          }
        }
        
        // Add the target folder to path
        path.push({ id: folder.id, name: folder.name });
        setFolderPath(path);

        // Set the view based on folder type
        if (folder.team_id && folder.teams) {
          const clubId = folder.teams.club_id;
          const { data: club } = await supabase
            .from("clubs")
            .select("name")
            .eq("id", clubId)
            .maybeSingle();
          
          setCurrentView({
            type: "team",
            clubId: clubId,
            clubName: club?.name || "Unknown Club",
            teamId: folder.team_id,
            teamName: folder.teams.name,
            folderId: folder.id,
            folderName: folder.name,
          });
        } else if (folder.club_id && folder.clubs) {
          setCurrentView({
            type: "club",
            clubId: folder.club_id,
            clubName: folder.clubs.name,
            folderId: folder.id,
            folderName: folder.name,
          });
        }
        
        setInitialLoadComplete(true);
      } catch (error) {
        console.error("Error loading folder:", error);
        toast.error("Failed to load folder");
        navigate("/vault", { replace: true });
        setInitialLoadComplete(true);
      }
    };

    loadFolderFromUrl();
  }, [urlFolderId, userClubs, initialLoadComplete, navigate]);

  // Handle direct navigation via query parameters (?club=X or ?team=X)
  useEffect(() => {
    const loadFromQueryParams = async () => {
      if (urlFolderId || initialLoadComplete || !userClubs || userClubs.length === 0) return;

      const clubId = searchParams.get("club");
      const teamId = searchParams.get("team");
      const miniLeagueId = searchParams.get("miniLeague");

      if (!clubId && !teamId && !miniLeagueId) {
        setInitialLoadComplete(true);
        return;
      }

      try {
        if (miniLeagueId) {
          // Navigate directly to mini-league vault folder
          const { data: league } = await supabase
            .from("mini_leagues")
            .select("id, name, club_id")
            .eq("id", miniLeagueId)
            .maybeSingle();

          if (league) {
            const club = userClubs.find(c => c.id === league.club_id);
            if (club) {
              setCurrentView({
                type: "mini-league",
                clubId: league.club_id,
                clubName: club.name,
                miniLeagueId: league.id,
                miniLeagueName: league.name,
              });
              setSearchParams({}, { replace: true });
            }
          }
        } else if (teamId) {
          // Navigate directly to team vault
          const { data: team } = await supabase
            .from("teams")
            .select("id, name, club_id")
            .eq("id", teamId)
            .maybeSingle();

          if (team) {
            const club = userClubs.find(c => c.id === team.club_id);
            if (club) {
              setCurrentView({
                type: "team",
                clubId: team.club_id,
                clubName: club.name,
                teamId: team.id,
                teamName: team.name,
              });
              // Clear query params without losing history
              setSearchParams({}, { replace: true });
            }
          }
        } else if (clubId) {
          // Navigate directly to club vault
          const club = userClubs.find(c => c.id === clubId);
          if (club) {
            setCurrentView({
              type: "club",
              clubId: club.id,
              clubName: club.name,
            });
            // Clear query params without losing history
            setSearchParams({}, { replace: true });
          }
        }
      } catch (error) {
        console.error("Error loading from query params:", error);
      }

      setInitialLoadComplete(true);
    };

    loadFromQueryParams();
  }, [urlFolderId, userClubs, initialLoadComplete, searchParams, setSearchParams]);

  const shareFolder = async (folderId: string) => {
    const shareUrl = getShareUrl("folder", folderId);
    
    try {
      if (Capacitor.isNativePlatform()) {
        try {
          await Share.share({
            url: shareUrl,
            dialogTitle: "Share Folder",
          });
        } catch (error) {
          if ((error as Error).name !== "AbortError") {
            await navigator.clipboard.writeText(shareUrl);
            toast.success("Link copied to clipboard!");
          }
        }
        return;
      }

      if (navigator.share) {
        await navigator.share({
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard!");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard!");
      }
    }
  };

  const currentClub = useMemo(() => {
    if (currentView.type === "club") return userClubs?.find(c => c.id === currentView.clubId);
    if (currentView.type === "team") return userClubs?.find(c => c.id === currentView.clubId);
    return null;
  }, [currentView, userClubs]);

  // 5GB base storage limit for Pro tier (in bytes)
  const BASE_STORAGE_LIMIT = 5 * 1024 * 1024 * 1024;

  // Query for purchased storage and scheduled downgrade info for current club
  const { data: storageSubscriptionData } = useQuery({
    queryKey: ["purchased-storage", currentClub?.id],
    queryFn: () => currentClub?.id
      ? fetchVaultStorageSubscription(currentClub.id)
      : Promise.resolve({
        storage_purchased_gb: 0,
        scheduled_storage_downgrade_gb: null,
        storage_downgrade_at: null,
      }),
    enabled: !!currentClub?.id,
  });

  const purchasedStorageGb = storageSubscriptionData?.storage_purchased_gb || 0;
  const scheduledDowngradeGb = storageSubscriptionData?.scheduled_storage_downgrade_gb;
  const storageDowngradeAt = storageSubscriptionData?.storage_downgrade_at;

  // Total storage limit = base + purchased
  const PRO_STORAGE_LIMIT = BASE_STORAGE_LIMIT + ((purchasedStorageGb || 0) * 1024 * 1024 * 1024);

  // Query for storage breakdown by file type, team, and mini-league
  const { data: storageBreakdown } = useQuery({
    queryKey: ["storage-breakdown", currentClub?.id],
    queryFn: () => currentClub?.id
      ? fetchVaultStorageBreakdown(currentClub.id)
      : Promise.resolve(emptyVaultStorageBreakdown()),
    enabled: !!currentClub?.id,
  });

  // Get total club storage used (for Pro tier limit)
  const totalClubStorageUsed = useMemo(() => {
    return storageBreakdown?.total || 0;
  }, [storageBreakdown]);

  // Get current team's storage used (for display)
  const currentTeamStorageUsed = useMemo(() => {
    if (currentView.type === "team" && storageBreakdown?.byTeam) {
      const teamData = storageBreakdown.byTeam.find(t => t.teamId === currentView.teamId);
      return teamData?.size || 0;
    }
    if (currentView.type === "club" && storageBreakdown?.byTeam) {
      const clubLevelData = storageBreakdown.byTeam.find(t => t.teamId === null);
      return clubLevelData?.size || 0;
    }
    return 0;
  }, [currentView, storageBreakdown]);

  // Pro tier has 5GB limit + purchased storage
  const isStorageLimitReached = useMemo(() => {
    if (isAppAdmin) return false;
    if (!hasProClub) return true; // Free tier can't access vault
    // Pro tier has 5GB base limit + purchased storage (total club storage)
    return totalClubStorageUsed >= PRO_STORAGE_LIMIT;
  }, [isAppAdmin, hasProClub, totalClubStorageUsed]);

  // Track which warnings have been shown this session
  const shownWarningsRef = useRef<Set<string>>(new Set());

  // Show warning when club storage reaches 80% of Pro limit
  useEffect(() => {
    if (!storageBreakdown || !currentClub || isAppAdmin || !hasProClub) return;

    const WARNING_THRESHOLD = 0.8; // 80%
    const percentage = totalClubStorageUsed / PRO_STORAGE_LIMIT;
    const warningKey = `${currentClub.id}-pro-limit`;
    
    if (percentage >= WARNING_THRESHOLD && !shownWarningsRef.current.has(warningKey)) {
      shownWarningsRef.current.add(warningKey);
      
      if (percentage >= 1) {
        toast.error(`Storage limit reached`, {
          description: "Delete files or purchase more storage"
        });
      } else {
        toast.warning(`Club storage at ${Math.round(percentage * 100)}% capacity`, {
          description: `${formatStorageSize(PRO_STORAGE_LIMIT - totalClubStorageUsed)} remaining`
        });
      }
    }
  }, [storageBreakdown, currentClub, isAppAdmin, hasProClub, totalClubStorageUsed]);

  const formatStorageSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    } else if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${bytes} B`;
  };

  const canUpload = useMemo(() => {
    if (isStorageLimitReached) return false;
    if (!currentClub) return false;
    if (isAppAdmin) return true;

    // Role-based write access for the current context. Pro is NOT required here —
    // free clubs still get to upload from device (subject to free-tier quotas).
    // Pro-only Add features (New Folder / Add Link / Drive imports) gate on
    // `canManageVaultPro` below.
    const clubId = getCurrentClubId();
    const teamId = getCurrentTeamId();

    // Club admins and committee members can upload to any club, team, or mini-league vault within their club
    if (userRoles?.some(r => (r.role === "club_admin" || r.role === "committee_member") && r.club_id === clubId)) return true;

    // Team admins can only upload to their own team vault
    if (currentView.type === "team") {
      return userRoles?.some(r => r.role === "team_admin" && r.team_id === teamId);
    }

    // Mini-league: league admins and coaches can upload
    if (currentView.type === "mini-league") {
      return userRoles?.some(r =>
        (r.role === "league_admin" || r.role === "coach") && r.club_id === clubId
      );
    }

    // For club-level view, only club admins and committee members can upload (handled above)
    return false;
  }, [isAppAdmin, currentClub, isStorageLimitReached, currentView, userRoles]);

  // Pro-gated vault management (folders, link entries, Drive imports/sync).
  // Free users may upload from device but cannot create folders/links or pull from Drive.
  const canManageVaultPro = canUpload && currentContextHasPro;

  const canDeletePhoto = useCallback((photo: any) => {
    if (isAppAdmin) return true;
    if (photo.uploader_id === user?.id) return true;
    const clubId = currentView.type === "club" ? currentView.clubId : currentView.type === "team" ? currentView.clubId : currentView.type === "mini-league" ? currentView.clubId : null;
    const teamId = currentView.type === "team" ? currentView.teamId : null;
    if (userRoles?.some(r => (r.role === "club_admin" || r.role === "committee_member") && r.club_id === clubId)) return true;
    if (teamId && userRoles?.some(r => r.role === "team_admin" && r.team_id === teamId)) return true;
    // Mini-league: league admins and coaches can delete
    if (currentView.type === "mini-league" && userRoles?.some(r => (r.role === "league_admin" || r.role === "coach") && r.club_id === clubId)) return true;
    return false;
  }, [isAppAdmin, user?.id, currentView, userRoles]);

  const canDeleteFile = useCallback((file: any) => {
    if (isAppAdmin) return true;
    // vault_files uses uploaded_by, not uploader_id
    if ((file.uploaded_by || file.uploader_id) === user?.id) return true;
    const clubId = currentView.type === "club" ? currentView.clubId : currentView.type === "team" ? currentView.clubId : currentView.type === "mini-league" ? currentView.clubId : null;
    const teamId = currentView.type === "team" ? currentView.teamId : null;
    if (userRoles?.some(r => (r.role === "club_admin" || r.role === "committee_member") && r.club_id === clubId)) return true;
    if (teamId && userRoles?.some(r => r.role === "team_admin" && r.team_id === teamId)) return true;
    // Mini-league: league admins and coaches can delete
    if (currentView.type === "mini-league" && userRoles?.some(r => (r.role === "league_admin" || r.role === "coach") && r.club_id === clubId)) return true;
    return false;
  }, [isAppAdmin, user?.id, currentView, userRoles]);

  const canRenameFile = useCallback((file: any) => {
    if (isAppAdmin) return true;
    // vault_files uses uploaded_by, not uploader_id
    if ((file.uploaded_by || file.uploader_id) === user?.id) return true;
    const clubId = currentView.type === "club" ? currentView.clubId : currentView.type === "team" ? currentView.clubId : currentView.type === "mini-league" ? currentView.clubId : null;
    const teamId = currentView.type === "team" ? currentView.teamId : null;
    if (userRoles?.some(r => (r.role === "club_admin" || r.role === "committee_member") && r.club_id === clubId)) return true;
    if (teamId && userRoles?.some(r => r.role === "team_admin" && r.team_id === teamId)) return true;
    // Mini-league: league admins and coaches can rename
    if (currentView.type === "mini-league" && userRoles?.some(r => (r.role === "league_admin" || r.role === "coach") && r.club_id === clubId)) return true;
    return false;
  }, [isAppAdmin, user?.id, currentView, userRoles]);

  const canRenamePhoto = useCallback((photo: any) => {
    if (isAppAdmin) return true;
    if (photo.uploader_id === user?.id) return true;
    const clubId = currentView.type === "club" ? currentView.clubId : currentView.type === "team" ? currentView.clubId : currentView.type === "mini-league" ? currentView.clubId : null;
    const teamId = currentView.type === "team" ? currentView.teamId : null;
    if (userRoles?.some(r => (r.role === "club_admin" || r.role === "committee_member") && r.club_id === clubId)) return true;
    if (teamId && userRoles?.some(r => r.role === "team_admin" && r.team_id === teamId)) return true;
    // Mini-league: league admins and coaches can rename
    if (currentView.type === "mini-league" && userRoles?.some(r => (r.role === "league_admin" || r.role === "coach") && r.club_id === clubId)) return true;
    return false;
  }, [isAppAdmin, user?.id, currentView, userRoles]);

  const canDeleteFolder = useCallback((folder: any) => {
    if (isAppAdmin) return true;
    if (folder.created_by === user?.id) return true;
    const clubId = getCurrentClubId();
    const teamId = getCurrentTeamId();
    if (userRoles?.some(r => (r.role === "club_admin" || r.role === "committee_member") && r.club_id === clubId)) return true;
    if (teamId && userRoles?.some(r => r.role === "team_admin" && r.team_id === teamId)) return true;
    return false;
  }, [isAppAdmin, user?.id, getCurrentClubId, getCurrentTeamId, userRoles]);

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      await createVaultFolder({
        name,
        userId: user!.id,
        parentFolderId: getCurrentFolderId(),
        view: currentView,
      });
    },
    onSuccess: () => {
      invalidateVaultCache(queryClient, ["subfolders"]);
      setNewFolderDialogOpen(false);
      setNewFolderName("");
      toast.success("Folder created!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create folder");
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      await deleteVaultFolder(folderId);
    },
    onSuccess: () => {
      invalidateVaultCache(queryClient, ["subfolders"]);
      setDeleteFolderId(null);
      toast.success("Folder deleted");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete folder");
    },
  });

  const renameFolderMutation = useMutation({
    mutationFn: async ({ folderId, newName }: { folderId: string; newName: string }) => {
      await renameVaultFolder(folderId, newName);
    },
    onSuccess: (_, variables) => {
      invalidateVaultCache(queryClient, ["subfolders"]);
      // Update folder path if renamed folder is in the path
      setFolderPath(prev => prev.map(f => f.id === variables.folderId ? { ...f, name: variables.newName } : f));
      setRenameFolderId(null);
      setRenameFolderName("");
      toast.success("Folder renamed");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to rename folder");
    },
  });

  const renameFileMutation = useMutation({
    mutationFn: async ({ fileId, newName }: { fileId: string; newName: string }) => {
      await renameVaultItem(fileId, newName);
    },
    onSuccess: () => {
      invalidateVaultCache(queryClient, ["files"]);
      setRenameFileId(null);
      setRenameFileName("");
      toast.success("File renamed");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to rename file");
    },
  });

  // Vault photos are stored in vault_files, so rename updates vault_files.name
  const renamePhotoMutation = useMutation({
    mutationFn: async ({ photoId, newName }: { photoId: string; newName: string }) => {
      await renameVaultItem(photoId, newName);
    },
    onSuccess: () => {
      invalidateVaultCache(queryClient, ["files"]);
      setRenamePhotoId(null);
      setRenamePhotoName("");
      toast.success("Photo renamed");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to rename photo");
    },
  });

  // Vault photo uploads go to vault_files ONLY (not photos table)
  // This keeps vault photos separate from the media gallery
  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split(".").pop();
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      
      // Structure path with club/team context for easier backup identification
      let storagePath: string;
      if (currentView.type === "team" && currentView.teamId && currentView.clubId) {
        storagePath = `clubs/${currentView.clubId}/teams/${currentView.teamId}/${user!.id}/${timestamp}-${randomSuffix}.${fileExt}`;
      } else if (currentView.type === "club" && currentView.clubId) {
        storagePath = `clubs/${currentView.clubId}/${user!.id}/${timestamp}-${randomSuffix}.${fileExt}`;
      } else if (currentView.type === "mini-league" && currentView.clubId && currentView.miniLeagueId) {
        storagePath = `clubs/${currentView.clubId}/mini-leagues/${currentView.miniLeagueId}/${user!.id}/${timestamp}-${randomSuffix}.${fileExt}`;
      } else {
        storagePath = `unassigned/${user!.id}/${timestamp}-${randomSuffix}.${fileExt}`;
      }

      // Reserve quota atomically before any bytes are written.
      const reservationId = await reserveVaultStorage(
        "clubId" in currentView ? currentView.clubId ?? null : null,
        file.size,
      );


      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(storagePath, file, { cacheControl: "31536000" });

      if (uploadError) {
        await settleVaultStorage(reservationId, false);
        throw uploadError;
      }

      const storageUrl = buildVaultStorageUrl(storagePath);

      // Insert into vault_files instead of photos table
      // This keeps vault photos private and separate from the media gallery
      const insertData: any = {
        file_url: storageUrl,
        storage_bucket: "photos",
        storage_path: storagePath,
        uploaded_by: user!.id,
        name: file.name,
        folder_id: getCurrentFolderId(),
        file_size: file.size,
        file_type: file.type,
      };

      if (currentView.type === "club") {
        insertData.club_id = currentView.clubId;
      } else if (currentView.type === "team") {
        insertData.club_id = currentView.clubId;
        insertData.team_id = currentView.teamId;
      } else if (currentView.type === "mini-league") {
        insertData.club_id = currentView.clubId;
        insertData.mini_league_id = currentView.miniLeagueId;
      }

      const { error: insertError } = await supabase.from("vault_files").insert(insertData);
      if (insertError) {
        // Compensate: never leave an orphaned object billed against the club.
        await compensateVaultUpload(storagePath);
        await settleVaultStorage(reservationId, false);
        throw insertError;
      }
      await settleVaultStorage(reservationId, true);
    },

    onSuccess: () => {
      invalidateVaultCache(queryClient, ["files", "clubs", "storageBreakdown"]);
      setUploadDialogOpen(false);
      // No toast for successful photo uploads
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to upload photo");
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, customFileName }: { file: File; customFileName?: string }) => {
      const fileExt = file.name.split(".").pop();
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      
      // Structure path with club/team context for easier backup identification
      let storagePath: string;
      if (currentView.type === "team" && currentView.teamId && currentView.clubId) {
        storagePath = `clubs/${currentView.clubId}/teams/${currentView.teamId}/${user!.id}/${timestamp}-${randomSuffix}.${fileExt}`;
      } else if (currentView.type === "mini-league" && currentView.clubId && currentView.miniLeagueId) {
        storagePath = `clubs/${currentView.clubId}/mini-leagues/${currentView.miniLeagueId}/${user!.id}/${timestamp}-${randomSuffix}.${fileExt}`;
      } else if (currentView.type === "club" && currentView.clubId) {
        storagePath = `clubs/${currentView.clubId}/${user!.id}/${timestamp}-${randomSuffix}.${fileExt}`;
      } else {
        storagePath = `unassigned/${user!.id}/${timestamp}-${randomSuffix}.${fileExt}`;
      }

      // Reserve quota atomically before any bytes are written.
      const reservationId = await reserveVaultStorage(
        "clubId" in currentView ? currentView.clubId ?? null : null,
        file.size,
      );

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(storagePath, file, { cacheControl: "31536000" });

      if (uploadError) {
        await settleVaultStorage(reservationId, false);
        throw uploadError;
      }

      const storageUrl = buildVaultStorageUrl(storagePath);

      const insertData: any = {
        file_url: storageUrl,
        storage_bucket: "photos",
        storage_path: storagePath,
        uploaded_by: user!.id,
        name: customFileName || fileName || file.name,
        folder_id: getCurrentFolderId(),
        file_size: file.size,
      };

      if (currentView.type === "club") {
        insertData.club_id = currentView.clubId;
      } else if (currentView.type === "team") {
        insertData.club_id = currentView.clubId;
        insertData.team_id = currentView.teamId;
      } else if (currentView.type === "mini-league") {
        insertData.club_id = currentView.clubId;
        insertData.mini_league_id = currentView.miniLeagueId;
      }

      const { error: insertError } = await supabase.from("vault_files").insert(insertData);
      if (insertError) {
        // Compensate: never leave an orphaned object billed against the club.
        await compensateVaultUpload(storagePath);
        await settleVaultStorage(reservationId, false);
        throw insertError;
      }
      await settleVaultStorage(reservationId, true);

      // Note: Storage tracking is now per team, handled by the storage breakdown query
    },

    onSuccess: () => {
      invalidateVaultCache(queryClient, ["files", "clubs", "storageBreakdown"]);
      invalidateVaultCache(queryClient, ["clubFreeUsage"]);
      setUploadDialogOpen(false);
      setFileName("");
      toast.success("File uploaded successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to upload file");
    },
  });

  const addLinkMutation = useMutation({
    mutationFn: async ({ url, name }: { url: string; name: string }) => {
      const insertData: any = {
        file_url: url,
        uploaded_by: user!.id,
        name,
        folder_id: getCurrentFolderId(),
        is_external_link: true,
        file_size: 0, // External links have no storage size
      };

      if (currentView.type === "club") {
        insertData.club_id = currentView.clubId;
      } else if (currentView.type === "team") {
        insertData.club_id = currentView.clubId;
        insertData.team_id = currentView.teamId;
      } else if (currentView.type === "mini-league") {
        insertData.club_id = currentView.clubId;
        insertData.mini_league_id = currentView.miniLeagueId;
      }

      const { error: insertError } = await supabase.from("vault_files").insert(insertData);
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      invalidateVaultCache(queryClient, ["files"]);
      setAddLinkDialogOpen(false);
      toast.success("Link added successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add link");
    },
  });

  const {
    trashItems,
    isLoadingTrash,
    isEmptyingTrash,
    deletePhotoMutation,
    deleteFileMutation,
    restorePhotoMutation,
    restoreFileMutation,
    permanentDeletePhotoMutation,
    permanentDeleteFileMutation,
    emptyTrash,
  } = useVaultTrashWorkflow({
    currentView,
    showTrash,
    userId: user?.id,
    isClubAdmin,
    isCoachOrTeamAdmin,
    onPhotoSoftDeleteStart: () => {
      setDeletePhotoId(null);
      setLightboxOpen(false);
    },
    onFileSoftDeleteSuccess: () => setDeleteFileId(null),
  });


  // Move file to a different folder or team
  const moveFileMutation = useMutation({
    mutationFn: async ({ fileId, targetFolderId, targetTeamId }: { fileId: string; targetFolderId: string | null; targetTeamId?: string | null }) => {
      const updateData: { folder_id: string | null; team_id?: string | null } = { 
        folder_id: targetFolderId 
      };
      
      // If moving to a team (or to root), update team_id as well
      if (targetTeamId !== undefined) {
        updateData.team_id = targetTeamId;
      }
      
      const { error } = await supabase.from("vault_files")
        .update(updateData)
        .eq("id", fileId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateVaultCache(queryClient, ["files"]);
      setMoveFileDialogOpen(false);
      setFileToMove(null);
      toast.success("File moved successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to move file");
    },
  });

  // Bulk delete selected photos and files (soft delete)
  const deleteSelectedItems = async () => {
    setIsDeletingSelected(true);
    const { photos: selectedPhotoItems, files: selectedFileItems } = getSelectedItems();
    let deletedCount = 0;
    let errorCount = 0;

    try {
      // Soft delete photos (vault photos are stored in vault_files)
      for (const photo of selectedPhotoItems) {
        try {
          const { error } = await supabase.from("vault_files")
            .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id })
            .eq("id", photo.id);
          if (error) throw error;
          removePhotoFromCache(photo.id);
          deletedCount++;
        } catch (e) {
          console.error("Failed to soft-delete photo", photo.id, e);
          errorCount++;
        }
      }

      // Soft delete files
      for (const file of selectedFileItems) {
        try {
          const { error } = await supabase.from("vault_files")
            .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id })
            .eq("id", file.id);
          if (error) throw error;
          deletedCount++;
        } catch (e) {
          console.error("Failed to soft-delete file", file.id, e);
          errorCount++;
        }
      }

      invalidateVaultCache(queryClient, ["files", "photos", "storageBreakdown"]);

      if (errorCount === 0) {
        toast.success(`Moved ${deletedCount} items to trash`);
      } else {
        toast.warning(`Moved ${deletedCount} items to trash, ${errorCount} failed`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete items");
    } finally {
      setIsDeletingSelected(false);
      setBulkDeleteDialogOpen(false);
      exitSelectionMode();
    }
  };

  // Fetch large files for the current club
  const fetchLargeFiles = useCallback(async () => {
    if (!currentClub?.id) return;
    
    setLargeFilesData({ loading: true, items: [] });
    setSelectedLargeFiles(new Set());
    
    try {
      // Get teams for the club
      const { data: teamsData } = await supabase
        .from("teams")
        .select("id, name")
        .eq("club_id", currentClub.id)
        .is("deleted_at", null);
      
      const teamsMap = new Map<string | null, string>();
      (teamsData || []).forEach(t => teamsMap.set(t.id, t.name));
      teamsMap.set(null, "Club-level");
      
      // Get photos with size
      const { data: photosData } = await supabase
        .from("photos")
        .select("id, file_url, file_size, team_id, title, created_at")
        .eq("club_id", currentClub.id)
        .not("file_size", "is", null)
        .order("file_size", { ascending: false })
        .limit(50);
      
      // Get files with size
      const { data: filesData } = await supabase
        .from("vault_files")
        .select("id, file_url, file_size, team_id, name, created_at")
        .eq("club_id", currentClub.id)
        .not("file_size", "is", null)
        .order("file_size", { ascending: false })
        .limit(50);
      
      const items: Array<{ id: string; type: 'photo' | 'file'; name: string; size: number; url: string; teamName?: string; createdAt: string }> = [];
      
      (photosData || []).forEach(p => {
        items.push({
          id: p.id,
          type: 'photo',
          name: p.title || 'Photo',
          size: p.file_size || 0,
          url: p.file_url,
          teamName: teamsMap.get(p.team_id),
          createdAt: p.created_at
        });
      });
      
      (filesData || []).forEach(f => {
        items.push({
          id: f.id,
          type: 'file',
          name: f.name || 'File',
          size: f.file_size || 0,
          url: f.file_url,
          teamName: teamsMap.get(f.team_id),
          createdAt: f.created_at
        });
      });
      
      // Sort by size descending
      items.sort((a, b) => b.size - a.size);
      
      setLargeFilesData({ loading: false, items: items.slice(0, 50) });
    } catch (error) {
      console.error("Failed to fetch large files:", error);
      setLargeFilesData({ loading: false, items: [] });
      toast.error("Failed to load large files");
    }
  }, [currentClub?.id]);
  
  const toggleLargeFileSelection = (id: string) => {
    setSelectedLargeFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };
  
  const deleteSelectedLargeFiles = async () => {
    if (selectedLargeFiles.size === 0) return;
    
    setDeletingLargeFiles(true);
    
    try {
      const itemsToDelete = largeFilesData.items.filter(item => selectedLargeFiles.has(item.id));
      const photoItems = itemsToDelete.filter(i => i.type === 'photo');
      const fileItems = itemsToDelete.filter(i => i.type === 'file');
      
      // Use the permanent delete edge function to handle storage cleanup + audit
      const result = await permanentlyDeleteVaultItems({
        photoIds: photoItems.map(p => p.id),
        fileIds: fileItems.map(f => f.id),
      });

      // Truthful reporting: only server-acknowledged deletions count, and
      // freed bytes are summed over successful items only.
      const summary = summarizeVaultDeletion(
        itemsToDelete.map(i => ({ id: i.id, type: i.type, size: i.size })),
        result,
      );
      const { outcome, message } = buildVaultDeleteMessage(summary, formatStorageSize);

      if (summary.deletedCount > 0) {
        invalidateVaultCache(queryClient, ["files"]);
        invalidateVaultCache(queryClient, ["storageBreakdown"]);
        invalidateVaultCache(queryClient, ["photos"]);
      }

      // Failed items stay selected so the user can retry; successes are cleared.
      const deletedIds = new Set(summary.deletedIds);
      setSelectedLargeFiles(prev => new Set([...prev].filter(id => !deletedIds.has(id))));

      if (outcome === "failure") toast.error(message);
      else toast.success(message);
      
      // Refresh the list
      fetchLargeFiles();

    } catch (error: any) {
      toast.error(error.message || "Failed to delete files");
    } finally {
      setDeletingLargeFiles(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    if (uploadType === "photo") {
      await uploadPhotoMutation.mutateAsync(file);
    } else {
      await uploadFileMutation.mutateAsync({ file });
    }
    setUploading(false);
  };

  const handleDialogUpload = async (file: File, type: "photo" | "file", customFileName?: string) => {
    setUploading(true);
    try {
      if (type === "photo") {
        await uploadPhotoMutation.mutateAsync(file);
      } else {
        await uploadFileMutation.mutateAsync({ file, customFileName });
      }
    } finally {
      setUploading(false);
    }
  };

  const navigateToFolder = (folder: { id: string; name: string }) => {
    if (currentView.type === "club") {
      setFolderPath([...folderPath, folder]);
      setCurrentView({
        ...currentView,
        folderId: folder.id,
        folderName: folder.name,
      });
    } else if (currentView.type === "team") {
      setFolderPath([...folderPath, folder]);
      setCurrentView({
        ...currentView,
        folderId: folder.id,
        folderName: folder.name,
      });
    }
  };

  const goBack = () => {
    if (fromChat) {
      navigate(-1);
      return;
    }
    if (folderPath.length > 0) {
      const newPath = [...folderPath];
      newPath.pop();
      setFolderPath(newPath);
      const parentFolder = newPath[newPath.length - 1];
      
      if (currentView.type === "club") {
        setCurrentView({
          ...currentView,
          folderId: parentFolder?.id,
          folderName: parentFolder?.name,
        });
      } else if (currentView.type === "team") {
        setCurrentView({
          ...currentView,
          folderId: parentFolder?.id,
          folderName: parentFolder?.name,
        });
      } else if (currentView.type === "mini-league") {
        setCurrentView({
          ...currentView,
          folderId: parentFolder?.id,
          folderName: parentFolder?.name,
        });
      }
    } else if (currentView.type === "team") {
      setCurrentView({ type: "club", clubId: currentView.clubId, clubName: currentView.clubName });
    } else if (currentView.type === "mini-league") {
      setCurrentView({ type: "club", clubId: currentView.clubId, clubName: currentView.clubName });
    } else {
      setCurrentView({ type: "root" });
    }
  };

  const navigateToRoot = () => {
    setFolderPath([]);
    setCurrentView({ type: "root" });
  };

  const navigateToClub = () => {
    if (currentView.type === "club" || currentView.type === "team" || currentView.type === "mini-league") {
      setFolderPath([]);
      setCurrentView({ 
        type: "club", 
        clubId: currentView.clubId, 
        clubName: currentView.clubName 
      });
    }
  };

  const navigateToMiniLeague = () => {
    if (currentView.type === "mini-league") {
      setFolderPath([]);
      setCurrentView({
        type: "mini-league",
        clubId: currentView.clubId,
        clubName: currentView.clubName,
        miniLeagueId: currentView.miniLeagueId,
        miniLeagueName: currentView.miniLeagueName,
      });
    }
  };

  const navigateToTeam = () => {
    if (currentView.type === "team") {
      setFolderPath([]);
      setCurrentView({
        type: "team",
        clubId: currentView.clubId,
        clubName: currentView.clubName,
        teamId: currentView.teamId,
        teamName: currentView.teamName,
      });
    }
  };

  const navigateToFolderAtIndex = (index: number) => {
    const newPath = folderPath.slice(0, index + 1);
    const targetFolder = newPath[index];
    setFolderPath(newPath);
    
    if (currentView.type === "club") {
      setCurrentView({
        ...currentView,
        folderId: targetFolder.id,
        folderName: targetFolder.name,
      });
    } else if (currentView.type === "team") {
      setCurrentView({
        ...currentView,
        folderId: targetFolder.id,
        folderName: targetFolder.name,
      });
    }
  };

  // Mobile-first hierarchy: returns an ordered list of nodes that represent
  // the current vault location. The last node is the "current" page (rendered
  // as a large title); the rest become clickable chips in the secondary path.
  type CrumbNode = { key: string; label: string; onClick?: () => void };

  const abbreviateOrgName = (name: string): string => {
    if (!name) return name;
    return name
      .replace(/\bSoccer Club\b/gi, "SC")
      .replace(/\bFootball Club\b/gi, "FC")
      .replace(/\bBasketball Club\b/gi, "BC")
      .replace(/\bNetball Club\b/gi, "NC")
      .replace(/\bRugby Club\b/gi, "RC")
      .replace(/\bCricket Club\b/gi, "CC")
      .replace(/\bTennis Club\b/gi, "TC")
      .replace(/\bHockey Club\b/gi, "HC")
      .replace(/\bAthletic Club\b/gi, "AC")
      .replace(/\bSports Club\b/gi, "SC")
      .trim();
  };

  const getHierarchyNodes = (): CrumbNode[] => {
    const nodes: CrumbNode[] = [];

    // Vault root chip — only shown when we're past it.
    nodes.push({ key: "vault", label: "Vault", onClick: navigateToRoot });

    if (currentView.type === "club" || currentView.type === "team") {
      nodes.push({
        key: "club",
        label: abbreviateOrgName(currentView.clubName || "Club"),
        onClick: navigateToClub,
      });
    }

    if (currentView.type === "team") {
      nodes.push({
        key: "team",
        label: currentView.teamName || "Team",
        onClick: navigateToTeam,
      });
    }

    if (currentView.type === "mini-league") {
      nodes.push({
        key: "mini-league",
        label: currentView.miniLeagueName || "League",
        onClick: navigateToMiniLeague,
      });
    }

    folderPath.forEach((folder, index) => {
      nodes.push({
        key: `folder-${folder.id}`,
        label: folder.name,
        onClick: () => navigateToFolderAtIndex(index),
      });
    });

    return nodes;
  };


  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleLightboxDelete = (photoId: string) => {
    // Close lightbox first, then show confirmation dialog
    setLightboxOpen(false);
    setDeletePhotoId(photoId);
  };

  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch file (${response.status})`);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      toast.error("Failed to download file");
    }
  };

  const downloadPhotoFile = async (url: string, filename?: string) => {
    const friendlyName = (filename || "ignite-photo").replace(/\.[^.]+$/, "") || "ignite-photo";
    await downloadImage(url, friendlyName);
  };

  const exportCurrentFolder = async () => {
    const { photos: photosToExport, files: filesToExport } = selectionMode 
      ? getSelectedItems() 
      : { photos: photos || [], files: files || [] };

    if (!photosToExport.length && !filesToExport.length) {
      toast.error(selectionMode ? "No files selected" : "No files to export");
      return;
    }

    exportAbortController.current = new AbortController();
    const signal = exportAbortController.current.signal;
    
    const totalFiles = photosToExport.length + filesToExport.length;
    setExportProgress({ current: 0, total: totalFiles });
    setIsExporting(true);

    try {
      let downloadCount = 0;
      
      // Download photos
      for (const photo of photosToExport) {
        if (signal.aborted) throw new Error("Export cancelled");
        const filename = photo.title || `photo-${photo.id}.jpg`;
        await downloadPhotoFile(photo.file_url, filename);
        downloadCount++;
        setExportProgress({ current: downloadCount, total: totalFiles });
        // Small delay between downloads to avoid browser blocking
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Download files
      for (const file of filesToExport) {
        if (signal.aborted) throw new Error("Export cancelled");
        await downloadFile(file.file_url, file.name);
        downloadCount++;
        setExportProgress({ current: downloadCount, total: totalFiles });
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      toast.success(`Exported ${downloadCount} files`);
      if (selectionMode) exitSelectionMode();
    } catch (error: any) {
      if (error.message === "Export cancelled") {
        toast.info("Export cancelled");
      } else {
        toast.error("Export failed");
      }
    } finally {
      setIsExporting(false);
      setExportProgress({ current: 0, total: 0 });
      exportAbortController.current = null;
    }
  };

  const cancelExport = () => {
    if (exportAbortController.current) {
      exportAbortController.current.abort();
    }
  };

  // Recursive export sources come from `vault_files` only (see
  // src/features/vault/vaultExportRepository.ts). Never query public.photos here.
  const fetchFolderContents = async (
    folderId: string | null,
    clubId: string | null,
    teamId: string | null,
    path: string = ""
  ) => fetchVaultFolderContents({ folderId, clubId, teamId }, path);

  const collectAllFolderContents = async (
    folderId: string | null,
    clubId: string | null,
    teamId: string | null,
    path: string = "",
    folderBreakdown: { path: string; photoCount: number; fileCount: number }[] = []
  ) => collectVaultExportContents({ folderId, clubId, teamId }, path, folderBreakdown);


  // Open preview dialog and fetch all subfolder contents
  const openExportPreview = async () => {
    const clubId = getCurrentClubId();
    const teamId = getCurrentTeamId();
    const folderId = getCurrentFolderId();

    setExportPreviewData({ photos: [], files: [], folderBreakdown: [], loading: true });
    setExcludedFolders(new Set());
    setExportPreviewOpen(true);

    try {
      const allContents = await collectAllFolderContents(folderId, clubId, teamId, "", []);
      setExportPreviewData({
        photos: allContents.photos,
        files: allContents.files,
        folderBreakdown: allContents.folderBreakdown,
        loading: false,
      });
    } catch (error) {
      console.error("Failed to fetch folder contents:", error);
      toast.error("Failed to scan folders");
      setExportPreviewOpen(false);
    }
  };

  // Open folder export dialog - fetches folder contents and opens selection dialog
  const openFolderExportDialog = async (folder: { id: string; name: string }) => {
    const clubId = getCurrentClubId();
    const teamId = getCurrentTeamId();

    setFolderExportData({
      folderId: folder.id,
      folderName: folder.name,
      photos: [],
      files: [],
      selectedPhotos: new Set(),
      selectedFiles: new Set(),
      loading: true,
    });
    setFolderExportDialogOpen(true);

    try {
      const contents = await fetchFolderContents(folder.id, clubId, teamId, "");
      setFolderExportData({
        folderId: folder.id,
        folderName: folder.name,
        photos: contents.photos,
        files: contents.files,
        selectedPhotos: new Set(contents.photos.map((p: any) => p.id)),
        selectedFiles: new Set(contents.files.map((f: any) => f.id)),
        loading: false,
      });
    } catch (error) {
      console.error("Failed to fetch folder contents for export:", error);
      toast.error("Failed to load folder contents");
      setFolderExportDialogOpen(false);
    }
  };

  const toggleFolderExportPhotoSelection = (photoId: string) => {
    if (!folderExportData) return;
    const newSelected = new Set(folderExportData.selectedPhotos);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setFolderExportData({ ...folderExportData, selectedPhotos: newSelected });
  };

  const toggleFolderExportFileSelection = (fileId: string) => {
    if (!folderExportData) return;
    const newSelected = new Set(folderExportData.selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setFolderExportData({ ...folderExportData, selectedFiles: newSelected });
  };

  const selectAllFolderExportItems = () => {
    if (!folderExportData) return;
    setFolderExportData({
      ...folderExportData,
      selectedPhotos: new Set(folderExportData.photos.map((p: any) => p.id)),
      selectedFiles: new Set(folderExportData.files.map((f: any) => f.id)),
    });
  };

  const deselectAllFolderExportItems = () => {
    if (!folderExportData) return;
    setFolderExportData({
      ...folderExportData,
      selectedPhotos: new Set(),
      selectedFiles: new Set(),
    });
  };

  const exportSelectedFolderItems = async () => {
    if (!folderExportData) return;
    
    const photosToExport = folderExportData.photos.filter((p: any) => folderExportData.selectedPhotos.has(p.id));
    const filesToExport = folderExportData.files.filter((f: any) => folderExportData.selectedFiles.has(f.id));
    
    if (photosToExport.length === 0 && filesToExport.length === 0) {
      toast.error("No items selected for export");
      return;
    }
    
    setFolderExportDialogOpen(false);
    
    // Use ZIP export for multiple files
    const totalItems = photosToExport.length + filesToExport.length;
    if (totalItems > 1) {
      // Create ZIP
      exportAbortController.current = new AbortController();
      const signal = exportAbortController.current.signal;
      
      setExportProgress({ current: 0, total: totalItems });
      setIsExporting(true);
      
      try {
        const zip = await createZipArchive();
        const items: ZipExportItem[] = [
          ...photosToExport.map((photo: any) => ({
            id: photo.id,
            kind: "photo" as const,
            url: photo.file_url,
            filename: photo.title || `photo-${photo.id}.jpg`,
          })),
          ...filesToExport.map((file: any) => ({
            id: file.id,
            kind: "file" as const,
            url: file.file_url,
            filename: file.name,
          })),
        ];

        const result = await runZipExport(items, {
          signal,
          isAborted: () => signal.aborted,
          fetchBlob: async (url, sig) => {
            const response = await fetch(url, { signal: sig });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.blob();
          },
          addToZip: (filename, blob) => zip.file(filename, blob),
          onProgress: (processed) => setExportProgress({ current: processed, total: totalItems }),
        });

        const { outcome, message, shouldDownload } = summarizeZipExport(result);

        if (shouldDownload) {
          const zipBlob = await zip.generateAsync({ type: "blob" });
          const blobUrl = window.URL.createObjectURL(zipBlob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `${folderExportData.folderName}.zip`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        }

        if (outcome === "cancelled") toast.info(message);
        else if (outcome === "failure") toast.error(message);
        else if (outcome === "partial") toast.warning(message);
        else toast.success(message);
      } catch (error: any) {
        if (signal.aborted || error?.message === "Export cancelled") {
          toast.info("Export cancelled");
        } else {
          toast.error("Export failed");
        }
      } finally {
        setIsExporting(false);
        setExportProgress({ current: 0, total: 0 });
        exportAbortController.current = null;
      }

    } else {
      // Single file - just download
      const item = photosToExport[0] || filesToExport[0];
      if (item) {
        if (photosToExport[0]) {
          await downloadPhotoFile(item.file_url, item.title || `photo-${item.id}.jpg`);
        } else {
          await downloadFile(item.file_url, item.name || 'file');
        }
        toast.success("Downloaded file");
      }
    }
    
    setFolderExportData(null);
  };

  const toggleFolderExclusion = (folderPath: string) => {
    setExcludedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  };

  const getFilteredExportData = () => {
    const filteredPhotos = exportPreviewData.photos.filter(photo => {
      const folderPath = photo.path || "(current folder)";
      return !excludedFolders.has(folderPath);
    });
    const filteredFiles = exportPreviewData.files.filter(file => {
      const folderPath = file.path || "(current folder)";
      return !excludedFolders.has(folderPath);
    });
    return { photos: filteredPhotos, files: filteredFiles };
  };

  const getExportSummary = () => {
    if (selectionMode) {
      return { photoCount: selectedPhotos.size, fileCount: selectedFiles.size, isSelection: true };
    }
    return { photoCount: photos?.length || 0, fileCount: files?.length || 0, isSelection: false };
  };

  const handleExportConfirm = () => {
    if (!pendingExportAction) return;
    setExportConfirmOpen(false);
    
    if (pendingExportAction.type === 'zip') {
      exportAsZip(false);
    } else if (pendingExportAction.type === 'download') {
      exportCurrentFolder();
    } else if (pendingExportAction.type === 'zipAll') {
      openExportPreview();
    }
    setPendingExportAction(null);
  };

  const initiateExport = (type: 'zip' | 'download' | 'zipAll') => {
    setPendingExportAction({ type });
    setExportConfirmOpen(true);
  };

  const confirmExportWithSubfolders = async () => {
    setExportPreviewOpen(false);
    
    const { photos: photosToExport, files: filesToExport } = getFilteredExportData();
    
    if (!photosToExport.length && !filesToExport.length) {
      toast.error("No files to export");
      return;
    }

    exportAbortController.current = new AbortController();
    const signal = exportAbortController.current.signal;

    const totalFiles = photosToExport.length + filesToExport.length;
    setExportProgress({ current: 0, total: totalFiles });
    setIsExporting(true);

    try {
      const zip = await createZipArchive();
      let fileCount = 0;

      // Add photos to ZIP with path
      for (const photo of photosToExport) {
        if (signal.aborted) throw new Error("Export cancelled");
        try {
          const response = await fetch(photo.file_url, { signal });
          const blob = await response.blob();
          const filename = photo.title || `photo-${photo.id}.jpg`;
          const fullPath = photo.path ? `${photo.path}/${filename}` : filename;
          zip.file(fullPath, blob);
          fileCount++;
          setExportProgress({ current: fileCount, total: totalFiles });
        } catch (error: any) {
          if (error.name === 'AbortError' || signal.aborted) throw new Error("Export cancelled");
          console.error(`Failed to fetch photo: ${photo.id}`, error);
        }
      }

      // Add files to ZIP with path
      for (const file of filesToExport) {
        if (signal.aborted) throw new Error("Export cancelled");
        try {
          const response = await fetch(file.file_url, { signal });
          const blob = await response.blob();
          const fullPath = file.path ? `${file.path}/${file.name}` : file.name;
          zip.file(fullPath, blob);
          fileCount++;
          setExportProgress({ current: fileCount, total: totalFiles });
        } catch (error: any) {
          if (error.name === 'AbortError' || signal.aborted) throw new Error("Export cancelled");
          console.error(`Failed to fetch file: ${file.id}`, error);
        }
      }

      if (fileCount === 0) {
        toast.error("No files could be added to ZIP");
        return;
      }

      // Generate ZIP and download
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const folderName = currentView.type === "root" 
        ? "vault" 
        : currentView.folderName || (currentView.type === "team" ? currentView.teamName : currentView.clubName) || "export";
      
      const blobUrl = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${folderName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      toast.success(`Exported ${fileCount} files as ZIP`);
    } catch (error: any) {
      if (error.message === "Export cancelled") {
        toast.info("Export cancelled");
      } else {
        console.error("ZIP export failed:", error);
        toast.error("Failed to create ZIP file");
      }
    } finally {
      setIsExporting(false);
      setExportProgress({ current: 0, total: 0 });
      exportAbortController.current = null;
    }
  };

  const exportAsZip = async (includeSubfolders: boolean = false) => {
    const clubId = getCurrentClubId();
    const teamId = getCurrentTeamId();
    const folderId = getCurrentFolderId();

    let photosToExport: any[] = [];
    let filesToExport: any[] = [];

    if (selectionMode) {
      const selected = getSelectedItems();
      photosToExport = selected.photos.map(p => ({ ...p, path: "" }));
      filesToExport = selected.files.map(f => ({ ...f, path: "" }));
    } else if (includeSubfolders && currentView.type !== "root") {
      toast.info("Scanning folders...");
      const allContents = await collectAllFolderContents(folderId, clubId, teamId, "");
      photosToExport = allContents.photos;
      filesToExport = allContents.files;
    } else {
      photosToExport = (photos || []).map(p => ({ ...p, path: "" }));
      filesToExport = (files || []).map(f => ({ ...f, path: "" }));
    }

    if (!photosToExport.length && !filesToExport.length) {
      toast.error(selectionMode ? "No files selected" : "No files to export");
      return;
    }

    exportAbortController.current = new AbortController();
    const signal = exportAbortController.current.signal;

    const totalFiles = photosToExport.length + filesToExport.length;
    setExportProgress({ current: 0, total: totalFiles });
    setIsExporting(true);

    try {
      const zip = await createZipArchive();
      let fileCount = 0;

      // Add photos to ZIP with path
      for (const photo of photosToExport) {
        if (signal.aborted) throw new Error("Export cancelled");
        try {
          const response = await fetch(photo.file_url, { signal });
          const blob = await response.blob();
          const filename = photo.title || `photo-${photo.id}.jpg`;
          const fullPath = photo.path ? `${photo.path}/${filename}` : filename;
          zip.file(fullPath, blob);
          fileCount++;
          setExportProgress({ current: fileCount, total: totalFiles });
        } catch (error: any) {
          if (error.name === 'AbortError' || signal.aborted) throw new Error("Export cancelled");
          console.error(`Failed to fetch photo: ${photo.id}`, error);
        }
      }

      // Add files to ZIP with path
      for (const file of filesToExport) {
        if (signal.aborted) throw new Error("Export cancelled");
        try {
          const response = await fetch(file.file_url, { signal });
          const blob = await response.blob();
          const fullPath = file.path ? `${file.path}/${file.name}` : file.name;
          zip.file(fullPath, blob);
          fileCount++;
          setExportProgress({ current: fileCount, total: totalFiles });
        } catch (error: any) {
          if (error.name === 'AbortError' || signal.aborted) throw new Error("Export cancelled");
          console.error(`Failed to fetch file: ${file.id}`, error);
        }
      }

      if (fileCount === 0) {
        toast.error("No files could be added to ZIP");
        return;
      }

      // Generate ZIP and download
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const folderName = selectionMode 
        ? "selected-files"
        : currentView.type === "root" 
          ? "vault" 
          : currentView.folderName || (currentView.type === "team" ? currentView.teamName : currentView.clubName) || "export";
      
      const blobUrl = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${folderName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      toast.success(`Exported ${fileCount} files as ZIP`);
      if (selectionMode) exitSelectionMode();
    } catch (error: any) {
      if (error.message === "Export cancelled") {
        toast.info("Export cancelled");
      } else {
        console.error("ZIP export failed:", error);
        toast.error("Failed to create ZIP file");
      }
    } finally {
      setIsExporting(false);
      setExportProgress({ current: 0, total: 0 });
      exportAbortController.current = null;
    }
  };

  if (isLoadingAccess) {
    return (
      <div className="py-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canAccessVault) {
    // Determine if it's a role issue or a Pro subscription issue
    const hasProButNoRole = vaultAccessContextHasPro && !hasVaultRoleAccess;
    
    return (
      <div className="py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
        <Card className="border-primary/20 bg-primary/5 max-w-lg mx-auto">
          <CardContent className="p-8 text-center">
            <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            {hasProButNoRole ? (
              <>
                <h3 className="font-semibold text-lg mb-2">Permission Required</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  The File Vault is only accessible to club admins, team admins, coaches, and committee members.
                </p>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-lg mb-2">Vault is a Pro Feature</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Upgrade to Pro to unlock file storage.
                </p>
                <Badge variant="secondary" className="mb-4 bg-primary/20 text-primary">
                  <Crown className="h-3 w-3 mr-1" /> Pro Only
                </Badge>
                {(adminUpgradeInfo.clubId || adminUpgradeInfo.teamId) && (
                  <div className="mt-4">
                    <Link to={adminUpgradeInfo.teamId ? `/teams/${adminUpgradeInfo.teamId}/upgrade` : `/clubs/${adminUpgradeInfo.clubId}/upgrade`}>
                      <Button size="sm">
                        <Crown className="h-4 w-4 mr-2" />
                        Upgrade to Pro
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const contentRendererProps: ContentSectionProps = {
    searchQuery: normalizedSearch,
    photos: displayPhotos || [],
    files: displayFiles || [],
    onPhotoClick: openLightbox,
    canDeletePhoto,
    canDeleteFile,
    canRenamePhoto,
    canRenameFile,
    canMoveFile: canRenameFile,
    onDeletePhoto: setDeletePhotoId,
    onDeleteFile: setDeleteFileId,
    onRenamePhoto: (photo) => {
      setRenamePhotoId(photo.id);
      setRenamePhotoName(photo.title || "");
    },
    onRenameFile: (file) => {
      setRenameFileId(file.id);
      setRenameFileName(file.name);
    },
    onMoveFile: (file) => {
      setFileToMove({ id: file.id, name: file.name, folder_id: file.folder_id, team_id: file.team_id });
      setMoveFileDialogOpen(true);
    },
    onDownloadPhoto: downloadPhotoFile,
    selectionMode,
    selectedPhotos,
    selectedFiles,
    onTogglePhotoSelection: togglePhotoSelection,
    onToggleFileSelection: toggleFileSelection,
  };

  const miniLeagueContentRendererProps: ContentSectionProps = {
    ...contentRendererProps,
    files: [],
    canDeleteFile: () => false,
    canRenameFile: () => false,
    onDeleteFile: () => undefined,
    onRenameFile: () => undefined,
    onMoveFile: undefined,
  };

  const trashRendererProps: TrashSectionProps = {
    photos: trashItems?.photos || [],
    files: trashItems?.files || [],
    isLoading: isLoadingTrash,
    onRestorePhoto: (id) => { setRestoreItemType("photo"); setRestoreItemId(id); },
    onRestoreFile: (id) => { setRestoreItemType("file"); setRestoreItemId(id); },
    onPermanentDeletePhoto: isClubAdmin ? setDeletePhotoId : undefined,
    onPermanentDeleteFile: isClubAdmin ? setDeleteFileId : undefined,
    onEmptyTrash: isClubAdmin ? emptyTrash : undefined,
    isEmptyingTrash,
  };

  const contentRendererView = showTrash
    ? { mode: "trash" as const, trash: trashRendererProps }
    : { mode: "content" as const, content: contentRendererProps };

  return (
    <div className={currentView.type === "root" ? "py-6 space-y-6" : "pt-3 pb-6 space-y-4"}>
      {/* Header - different for root vs inner views */}
      {currentView.type === "root" ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-10 w-10"
              onClick={() => navigate(-1)}
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Vault</h1>
                <p className="text-xs text-muted-foreground">Club file storage</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(() => {
            const nodes = getHierarchyNodes();
            const current = nodes[nodes.length - 1];
            const parents = nodes.slice(0, -1);
            return (
              <div className="flex items-center gap-1 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 -ml-2 h-10 w-10"
                  onClick={goBack}
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-semibold leading-tight truncate">
                    {current?.label ?? "Vault"}
                  </h1>
                  {parents.length > 0 && (
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
                      {parents.map((node, i) => (
                        <span key={node.key} className="flex items-center gap-1 min-w-0">
                          <button
                            type="button"
                            onClick={node.onClick}
                            className="px-1.5 py-0.5 -mx-1 rounded-md hover:bg-muted active:bg-muted/70 transition-colors max-w-[160px] truncate text-foreground/70 hover:text-foreground touch-manipulation"
                          >
                            {node.label}
                          </button>
                          {i < parents.length - 1 && (
                            <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}


        
          {/* Compact Storage Bar - always visible */}
          {currentClub && (
            <Collapsible className="w-full">
              <div className="bg-card border rounded-lg p-3">
                {(() => {
                  const storagePercentage = PRO_STORAGE_LIMIT > 0 
                    ? Math.min(100, Math.max(0, (totalClubStorageUsed / PRO_STORAGE_LIMIT) * 100))
                    : 0;
                  return (
                    <VaultStorageBarRow
                      storagePercentage={storagePercentage}
                      usageLabel={`${formatStorageSize(totalClubStorageUsed)} / ${5 + (purchasedStorageGb || 0)} GB`}
                      isStorageLimitReached={isStorageLimitReached}
                      actions={
                        <>


                      {/* More Dropdown - shown here when user can't upload (so it's not alone in toolbar) */}
                      {!canUpload && !selectionMode && !isExporting && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Storage actions">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover">
                            {(photos?.length > 0 || files?.length > 0) && !showTrash && (
                              <DropdownMenuItem onClick={() => setSelectionMode(true)}>
                                <CheckSquare className="h-4 w-4 mr-2" />
                                Select
                              </DropdownMenuItem>
                            )}
                            {(photos?.length > 0 || files?.length > 0 || subfolders?.length > 0) && (
                              <>
                                <DropdownMenuItem onClick={() => initiateExport('zip')}>
                                  <FileArchive className="h-4 w-4 mr-2" />
                                  Export as ZIP
                                </DropdownMenuItem>
                                {(subfolders && subfolders.length > 0) && (
                                  <DropdownMenuItem onClick={() => initiateExport('zipAll')}>
                                    <FolderDown className="h-4 w-4 mr-2" />
                                    ZIP All (with subfolders)
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                            {(isClubAdmin || isAppAdmin) && (
                              <DropdownMenuItem onClick={() => setShowTrash(!showTrash)}>
                                {showTrash ? (
                                  <>
                                    <FolderOpen className="h-4 w-4 mr-2" />
                                    View Files
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    View Trash
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                        </>
                      }
                    />

                  );
                })()}

                
                <CollapsibleContent className="mt-3 pt-3 border-t">
                  {/* Expanded storage details */}
                  <div className="space-y-3">
                    {/* Team-specific storage - only shown in team view */}
                    {currentView.type === "team" && currentTeamStorageUsed > 0 && (
                      <div className="pb-3 border-b">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <span className="font-medium text-foreground">This Team</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-base font-semibold text-foreground">
                            {formatStorageSize(currentTeamStorageUsed)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({Math.round((currentTeamStorageUsed / totalClubStorageUsed) * 100)}% of club storage)
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Recharts only loads after the storage details are opened. */}
                    {storageBreakdown && (storageBreakdown.photos > 0 || storageBreakdown.documents > 0) && (
                      <Suspense fallback={null}>
                        <VaultStorageBreakdown
                          photos={storageBreakdown.photos}
                          documents={storageBreakdown.documents}
                          formatStorageSize={formatStorageSize}
                        />
                      </Suspense>
                    )}
                    
                    <VaultStorageTeamProjection
                      byTeam={storageBreakdown?.byTeam || []}
                      totalStorage={totalClubStorageUsed}
                      formatStorageSize={formatStorageSize}
                    />
                    
                    {/* Compact action icons row */}
                    {(isClubAdmin || (totalClubStorageUsed / PRO_STORAGE_LIMIT) >= 0.8) && (
                      <div className="pt-3 border-t flex items-center gap-2">
                        {/* Large Files - only when storage >= 80% */}
                        {(totalClubStorageUsed / PRO_STORAGE_LIMIT) >= 0.8 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setLargeFilesDialogOpen(true);
                                    fetchLargeFiles();
                                  }}
                                >
                                  <HardDrive className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Manage Large Files</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        
                        {/* Buy/Manage Storage */}
                        {isClubAdmin && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setStoragePurchaseDialogOpen(true)}
                                >
                                  <ShoppingCart className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{purchasedStorageGb > 0 ? "Manage Storage" : "Buy Storage"}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}
          
          <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
            <TooltipProvider>
              {/* Selection Mode Controls - visible when there's content */}
              {(photos?.length > 0 || files?.length > 0) && !showTrash && selectionMode && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={selectAll}
                      >
                        <CheckSquare className="h-4 w-4 mr-1" />
                        Select All
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Select all photos and files</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={exitSelectionMode}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Exit selection mode</TooltipContent>
                  </Tooltip>
                  {selectedCount > 0 && (
                    <>
                      {isExporting ? (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled
                            className="min-w-[80px]"
                          >
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            <span className="text-xs">{exportProgress.current}/{exportProgress.total}</span>
                          </Button>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={cancelExport}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Cancel export</TooltipContent>
                          </Tooltip>
                        </>
                      ) : (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="default" 
                                size="sm" 
                                onClick={() => initiateExport('zip')}
                              >
                                <FileArchive className="h-4 w-4 mr-1" />
                                Export ({selectedCount})
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Export {selectedCount} selected items as ZIP</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => initiateExport('download')}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download ({selectedCount})
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Download {selectedCount} selected items individually</TooltipContent>
                          </Tooltip>
                          {(isClubAdmin || isAppAdmin) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => setBulkDeleteDialogOpen(true)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete ({selectedCount})
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete {selectedCount} selected items</TooltipContent>
                          </Tooltip>
                          )}
                        </>
                      )}
                    </>
                  )}
                </>
              )}
              
              {/* Export progress when exporting */}
              {!selectionMode && isExporting && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled
                    className="min-w-[80px]"
                  >
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    <span className="text-xs">{exportProgress.current}/{exportProgress.total}</span>
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={cancelExport}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Cancel export</TooltipContent>
                  </Tooltip>
                </>
              )}

              {/* Main toolbar - only when not in selection mode or exporting */}
              {!selectionMode && !isExporting && (
                <>
                  {/* Primary Upload Button - always visible */}
                  {canUpload && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
                          <Upload className="h-4 w-4 mr-1" /> Upload
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Upload photos or files</TooltipContent>
                    </Tooltip>
                  )}

                  {/* Add Dropdown - New Folder, Add Link, Import from Drive */}
                  {canUpload && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        <DropdownMenuItem onClick={() => setNewFolderDialogOpen(true)}>
                          <FolderPlus className="h-4 w-4 mr-2" />
                          New Folder
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAddLinkDialogOpen(true)}>
                          <Link2 className="h-4 w-4 mr-2" />
                          Add Link
                        </DropdownMenuItem>
                        {isClubAdmin && Capacitor.getPlatform() !== 'ios' && 'clubId' in currentView && DRIVE_IMPORT_ALLOWED_CLUB_IDS.has(currentView.clubId) && (
                          <DropdownMenuItem onClick={() => setGoogleDriveImportOpen(true)}>
                            <CloudDownload className="h-4 w-4 mr-2" />
                            Import from Drive
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* More Dropdown - Export, ZIP All, View Trash - only shown here when user can upload */}
                  {canUpload && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-9 w-9">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover">
                        {(photos?.length > 0 || files?.length > 0) && !showTrash && (
                          <DropdownMenuItem onClick={() => setSelectionMode(true)}>
                            <CheckSquare className="h-4 w-4 mr-2" />
                            Select
                          </DropdownMenuItem>
                        )}
                        {(photos?.length > 0 || files?.length > 0 || subfolders?.length > 0) && (
                          <>
                            <DropdownMenuItem onClick={() => initiateExport('zip')}>
                              <FileArchive className="h-4 w-4 mr-2" />
                              Export as ZIP
                            </DropdownMenuItem>
                            {(subfolders && subfolders.length > 0) && (
                              <DropdownMenuItem onClick={() => initiateExport('zipAll')}>
                                <FolderDown className="h-4 w-4 mr-2" />
                                ZIP All (with subfolders)
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                        {(isClubAdmin || isAppAdmin) && (
                          <DropdownMenuItem onClick={() => setShowTrash(!showTrash)}>
                            {showTrash ? (
                              <>
                                <FolderOpen className="h-4 w-4 mr-2" />
                                View Files
                              </>
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4 mr-2" />
                                View Trash
                              </>
                            )}
                          </DropdownMenuItem>
                        )}
                        {isClubAdmin && Capacitor.getPlatform() !== 'ios' && 'clubId' in currentView && DRIVE_IMPORT_ALLOWED_CLUB_IDS.has(currentView.clubId) && (
                          <DropdownMenuItem onClick={() => setLinkDriveFolderOpen(true)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync with Drive folder
                          </DropdownMenuItem>
                        )}
                        {isClubAdmin && (
                          <DropdownMenuItem
                            onClick={handleResolveDriveTitles}
                            disabled={resolvingDriveTitles}
                          >
                            {resolvingDriveTitles ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Sheet className="h-4 w-4 mr-2" />
                            )}
                            Fetch real Google titles
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </>
              )}
            </TooltipProvider>

            {/* Dialogs - always rendered */}
            <CreateFolderDialog
              open={newFolderDialogOpen}
              onOpenChange={setNewFolderDialogOpen}
              onCreateFolder={(name) => createFolderMutation.mutate(name)}
              isCreating={createFolderMutation.isPending}
            />
            
            <Suspense fallback={null}>
            <UploadFilesDialog
              open={uploadDialogOpen}
              onOpenChange={setUploadDialogOpen}
              onUpload={handleDialogUpload}
              isUploading={uploading}
              targetName={currentView.folderName || (currentView.type === "team" ? currentView.teamName : currentView.type === "club" ? currentView.clubName : "Vault")}
            />
            </Suspense>

            <Suspense fallback={null}>
            <AddLinkDialog
              open={addLinkDialogOpen}
              onOpenChange={setAddLinkDialogOpen}
              onAddLink={(url, name) => addLinkMutation.mutate({ url, name })}
              isAdding={addLinkMutation.isPending}
              targetName={currentView.folderName || (currentView.type === "team" ? currentView.teamName : currentView.type === "club" ? currentView.clubName : "Vault")}
            />
            </Suspense>

            <Suspense fallback={null}>
            <GoogleDriveImportDialog
              open={googleDriveImportOpen}
              onOpenChange={setGoogleDriveImportOpen}
              onImportComplete={() => {
                invalidateVaultCache(queryClient, ["files"]);
                queryClient.invalidateQueries({ queryKey: ["vault-folders"] });
              }}
              targetFolderId={currentView.type === "team" || currentView.type === "mini-league" ? (currentView.folderId || null) : null}
              targetTeamId={currentView.type === "team" ? currentView.teamId : null}
              targetClubId={currentView.clubId}
            />
            </Suspense>

            {'clubId' in currentView && (
              <Suspense fallback={null}>
              <LinkDriveFolderDialog
                open={linkDriveFolderOpen}
                onOpenChange={setLinkDriveFolderOpen}
                vaultFolderId={currentView.folderId ?? null}
                clubId={currentView.clubId}
                teamId={currentView.type === "team" ? currentView.teamId : null}
                onChanged={() => {
                  invalidateVaultCache(queryClient, ["files"]);
                  queryClient.invalidateQueries({ queryKey: ["vault-folders"] });
                }}
              />
              </Suspense>
            )}
          </div>
        </div>
      )}

      {/* Search bar — filter folders, files, and photos in the current view */}
      {currentView.type !== "root" && !showTrash && (
        <div className="space-y-2">
          <div
            className={`relative rounded-md transition-shadow ${
              isFetchingRecursive ? "ring-2 ring-primary/40 ring-offset-0 animate-pulse" : ""
            }`}
          >
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {isFetchingRecursive ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </span>
            <Input
              value={vaultSearchQuery}
              onChange={(e) => setVaultSearchQuery(e.target.value)}
              placeholder="Search folders and files..."
              className="pl-9 pr-9"
              aria-busy={isFetchingRecursive}
            />
            {vaultSearchQuery && (
              <button
                type="button"
                onClick={() => setVaultSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-accent"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          {vaultSearchQuery.trim() && (
            <p
              className="text-xs text-muted-foreground px-1 flex items-center gap-1.5"
              role="status"
              aria-live="polite"
            >
              {isFetchingRecursive ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  <span>Searching all nested folders…</span>
                </>
              ) : (
                (() => {
                  const total = displaySubfolders.length + displayPhotos.length + displayFiles.length;
                  if (total === 0) {
                    return <span>No matches for "{vaultSearchQuery}"</span>;
                  }
                  return (
                    <span>
                      {total} {total === 1 ? "match" : "matches"} across all subfolders
                    </span>
                  );
                })()
              )}
            </p>
          )}
        </div>
      )}

      {currentView.type === "root" && (
        <div className="space-y-3">
          {isLoadingClubs ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading clubs...</p>
            </div>
          ) : !userClubs || userClubs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No clubs found</p>
              </CardContent>
            </Card>
          ) : (
            (activeClubFilter ? userClubs.filter(c => c.id === activeClubFilter) : userClubs).map((club) => {
              const isPro = club.is_pro;
              return (
                <Card
                  key={club.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => {
                    if (!isPro) {
                      navigate(`/clubs/${club.id}/upgrade`);
                      return;
                    }
                    setFolderPath([]);
                    setCurrentView({ type: "club", clubId: club.id, clubName: club.name });
                  }}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FolderOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{club.name}</p>
                      {!isPro && (
                        <p className="text-xs text-muted-foreground">Pro feature — Upgrade to unlock vault</p>
                      )}
                    </div>
                    {!isPro ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {currentView.type === "club" && (
        <div className="space-y-6">
          {/* Teams grouped by team folders - only show at root of club and not in trash view */}
          {!showTrash && !currentView.folderId && clubTeams && clubTeams.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-muted-foreground">Teams</h2>
              
              {/* Render team folders with their teams */}
              {teamFolders && teamFolders.length > 0 && teamFolders.map((folder) => {
                const teamsInFolder = clubTeams.filter(team => team.folder_id === folder.id);
                if (teamsInFolder.length === 0) return null;
                
                const colorInfo = getFolderColorClass(folder.color);
                
                return (
                  <div key={folder.id} className="space-y-2">
                    <div className={`flex items-center gap-2 px-2 py-1 rounded-lg ${colorInfo.bgClassName}`}>
                      <FolderOpen className={`h-4 w-4 ${colorInfo.className}`} />
                      <span className="text-sm font-medium">{folder.name}</span>
                      <span className="text-xs text-muted-foreground">({teamsInFolder.length})</span>
                    </div>
                    <div className="pl-2 space-y-2">
                      {teamsInFolder.map((team) => (
                        <Card
                          key={team.id}
                          className="cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => {
                            setFolderPath([]);
                            setCurrentView({ 
                              type: "team", 
                              clubId: currentView.clubId, 
                              clubName: currentView.clubName,
                              teamId: team.id, 
                              teamName: team.name 
                            });
                          }}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-secondary">
                              <FolderOpen className="h-4 w-4 text-secondary-foreground" />
                            </div>
                            <p className="font-medium flex-1 text-sm">{team.name}</p>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {/* Uncategorized teams (no folder_id) */}
              {(() => {
                const uncategorizedTeams = clubTeams.filter(team => !team.folder_id);
                if (uncategorizedTeams.length === 0) return null;
                
                // Show header only if there are team folders with teams
                const hasTeamFolders = teamFolders && teamFolders.some(folder => 
                  clubTeams.some(team => team.folder_id === folder.id)
                );
                
                return (
                  <div className="space-y-2">
                    {hasTeamFolders && (
                      <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-muted/50">
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Other Teams</span>
                        <span className="text-xs text-muted-foreground">({uncategorizedTeams.length})</span>
                      </div>
                    )}
                    <div className={hasTeamFolders ? "pl-2 space-y-2" : "space-y-2"}>
                      {uncategorizedTeams.map((team) => (
                        <Card
                          key={team.id}
                          className="cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => {
                            setFolderPath([]);
                            setCurrentView({ 
                              type: "team", 
                              clubId: currentView.clubId, 
                              clubName: currentView.clubName,
                              teamId: team.id, 
                              teamName: team.name 
                            });
                          }}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-secondary">
                              <FolderOpen className="h-4 w-4 text-secondary-foreground" />
                            </div>
                            <p className="font-medium flex-1 text-sm">{team.name}</p>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Mini-Leagues - only show at root of club and not in trash view */}
          {!showTrash && !currentView.folderId && clubMiniLeagues && clubMiniLeagues.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-muted-foreground">Mini-Leagues</h2>
              <div className="space-y-2">
                {clubMiniLeagues.map((league) => (
                  <Card
                    key={league.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => {
                      setFolderPath([]);
                      setCurrentView({ 
                        type: "mini-league", 
                        clubId: currentView.clubId, 
                        clubName: currentView.clubName,
                        miniLeagueId: league.id, 
                        miniLeagueName: league.name 
                      });
                    }}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-accent">
                        <FolderOpen className="h-4 w-4 text-accent-foreground" />
                      </div>
                      <p className="font-medium flex-1 text-sm">{league.name}</p>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <VaultContentRenderer
            folders={displaySubfolders || []}
            searchQuery={normalizedSearch}
            onNavigateToFolder={(folder) => navigateToFolder(folder)}
            onShareFolder={(folder) => shareFolder(folder.id)}
            onExportFolder={(folder) => openFolderExportDialog(folder)}
            onRenameFolder={(folder) => {
              setRenameFolderId(folder.id);
              setRenameFolderName(folder.name);
            }}
            onDeleteFolder={(folder) => setDeleteFolderId(folder.id)}
            canEditFolder={canDeleteFolder}
            {...contentRendererView}
          />
        </div>
      )}

      {currentView.type === "team" && (
        <div className="space-y-6">
          <VaultContentRenderer
            folders={displaySubfolders || []}
            searchQuery={normalizedSearch}
            onNavigateToFolder={(folder) => navigateToFolder(folder)}
            onShareFolder={(folder) => shareFolder(folder.id)}
            onExportFolder={(folder) => openFolderExportDialog(folder)}
            onRenameFolder={(folder) => {
              setRenameFolderId(folder.id);
              setRenameFolderName(folder.name);
            }}
            onDeleteFolder={(folder) => setDeleteFolderId(folder.id)}
            canEditFolder={canDeleteFolder}
            {...contentRendererView}
          />
        </div>
      )}

      {currentView.type === "mini-league" && (
        <div className="space-y-6">
          <VaultContentRenderer
            folders={[]}
            searchQuery={normalizedSearch}
            onNavigateToFolder={() => undefined}
            onShareFolder={() => undefined}
            onExportFolder={() => undefined}
            onRenameFolder={() => undefined}
            onDeleteFolder={() => undefined}
            canEditFolder={() => false}
            mode="content"
            content={miniLeagueContentRendererProps}
          />
        </div>
      )}

      {/* Photo Lightbox */}
      <PhotoLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        photos={photos || []}
        currentIndex={lightboxIndex}
        onNavigate={setLightboxIndex}
        onDelete={handleLightboxDelete}
        canDelete={photos?.[lightboxIndex] ? canDeletePhoto(photos[lightboxIndex]) : false}
      />

      {/* Delete Photo Confirmation */}
      <AlertDialog open={!!deletePhotoId} onOpenChange={() => setDeletePhotoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{showTrash ? "Permanently Delete Photo" : "Delete Photo"}</AlertDialogTitle>
            <AlertDialogDescription>
              {showTrash 
                ? "Are you sure you want to permanently delete this photo? This cannot be undone."
                : "This photo will be moved to trash."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePhotoId && (showTrash ? permanentDeletePhotoMutation.mutate(deletePhotoId) : deletePhotoMutation.mutate(deletePhotoId))}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {showTrash ? "Delete Permanently" : "Move to Trash"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete File Confirmation */}
      <AlertDialog open={!!deleteFileId} onOpenChange={() => setDeleteFileId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{showTrash ? "Permanently Delete File" : "Delete File"}</AlertDialogTitle>
            <AlertDialogDescription>
              {showTrash 
                ? "Are you sure you want to permanently delete this file? This cannot be undone."
                : "This file will be moved to trash."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteFileId && (showTrash ? permanentDeleteFileMutation.mutate(deleteFileId) : deleteFileMutation.mutate(deleteFileId))}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {showTrash ? "Delete Permanently" : "Move to Trash"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation */}
      <AlertDialog open={!!restoreItemId} onOpenChange={() => setRestoreItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore {restoreItemType === "photo" ? "Photo" : "File"}</AlertDialogTitle>
            <AlertDialogDescription>
              This {restoreItemType === "photo" ? "photo" : "file"} will be restored to its original location.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (restoreItemId) {
                  if (restoreItemType === "photo") {
                    restorePhotoMutation.mutate(restoreItemId);
                  } else {
                    restoreFileMutation.mutate(restoreItemId);
                  }
                  setRestoreItemId(null);
                }
              }}
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Items</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCount} selected item{selectedCount !== 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingSelected}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteSelectedItems}
              disabled={isDeletingSelected}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingSelected ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedCount} Item${selectedCount !== 1 ? 's' : ''}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deleteFolderId} onOpenChange={() => setDeleteFolderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this folder? Files inside will be moved to the parent folder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteFolderId && deleteFolderMutation.mutate(deleteFolderId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Large Files Manager Dialog */}
      <Dialog open={largeFilesDialogOpen} onOpenChange={(open) => {
        setLargeFilesDialogOpen(open);
        if (!open) {
          setSelectedLargeFiles(new Set());
        }
      }}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Manage Large Files
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col">
            {largeFilesData.loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : largeFilesData.items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <HardDrive className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No files with size data found</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Sort:</span>
                    <Select value={largeFilesSortBy} onValueChange={(v) => setLargeFilesSortBy(v as 'size' | 'date' | 'type')}>
                      <SelectTrigger className="w-[110px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="size">Size</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="type">Type</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {selectedLargeFiles.size > 0 
                      ? `${selectedLargeFiles.size} selected (${formatStorageSize(
                          largeFilesData.items
                            .filter(i => selectedLargeFiles.has(i.id))
                            .reduce((sum, i) => sum + i.size, 0)
                        )})`
                      : `${largeFilesData.items.length} files`
                    }
                  </span>
                  {selectedLargeFiles.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={deleteSelectedLargeFiles}
                      disabled={deletingLargeFiles}
                    >
                      {deletingLargeFiles ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-1" />
                      )}
                      Delete
                    </Button>
                  )}
                </div>
                <div className="overflow-y-auto flex-1 space-y-2 pr-1">
                  {[...largeFilesData.items]
                    .sort((a, b) => {
                      if (largeFilesSortBy === 'size') return b.size - a.size;
                      if (largeFilesSortBy === 'date') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                      if (largeFilesSortBy === 'type') return a.type.localeCompare(b.type);
                      return 0;
                    })
                    .map((item) => (
                    <div 
                      key={item.id}
                      className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedLargeFiles.has(item.id) 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:bg-muted/50"
                      }`}
                      onClick={() => toggleLargeFileSelection(item.id)}
                    >
                      <Checkbox 
                        checked={selectedLargeFiles.has(item.id)}
                        onCheckedChange={() => toggleLargeFileSelection(item.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className={`p-1.5 rounded ${item.type === 'photo' ? 'bg-primary/10' : 'bg-muted'}`}>
                        {item.type === 'photo' ? (
                          <FileImage className="h-4 w-4 text-primary" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.teamName ? `${item.teamName} • ` : ''}{format(new Date(item.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-foreground shrink-0">
                        {formatStorageSize(item.size)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={!!renameFolderId} onOpenChange={(open) => {
        if (!open) {
          setRenameFolderId(null);
          setRenameFolderName("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Folder Name</Label>
              <Input
                value={renameFolderName}
                onChange={(e) => setRenameFolderName(e.target.value)}
                placeholder="Enter new folder name"
              />
            </div>
            <Button 
              onClick={() => renameFolderId && renameFolderMutation.mutate({ folderId: renameFolderId, newName: renameFolderName })}
              disabled={!renameFolderName.trim()}
              className="w-full"
            >
              Rename Folder
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename File Dialog */}
      <Dialog open={!!renameFileId} onOpenChange={(open) => {
        if (!open) {
          setRenameFileId(null);
          setRenameFileName("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>File Name</Label>
              <Input
                value={renameFileName}
                onChange={(e) => setRenameFileName(e.target.value)}
                placeholder="Enter new file name"
              />
            </div>
            <Button 
              onClick={() => renameFileId && renameFileMutation.mutate({ fileId: renameFileId, newName: renameFileName })}
              disabled={!renameFileName.trim()}
              className="w-full"
            >
              Rename File
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Photo Dialog */}
      <Dialog open={!!renamePhotoId} onOpenChange={(open) => {
        if (!open) {
          setRenamePhotoId(null);
          setRenamePhotoName("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Photo Title</Label>
              <Input
                value={renamePhotoName}
                onChange={(e) => setRenamePhotoName(e.target.value)}
                placeholder="Enter new photo title"
              />
            </div>
            <Button 
              onClick={() => renamePhotoId && renamePhotoMutation.mutate({ photoId: renamePhotoId, newName: renamePhotoName })}
              disabled={!renamePhotoName.trim()}
              className="w-full"
            >
              Rename Photo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Preview Dialog */}
      <Dialog open={exportPreviewOpen} onOpenChange={setExportPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export All Folders</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {exportPreviewData.loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Scanning folders...</span>
              </div>
            ) : (
              <>
                {(() => {
                  const filtered = getFilteredExportData();
                  return (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Photos to export:</span>
                        <span className="font-medium">{filtered.photos.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Files to export:</span>
                        <span className="font-medium">{filtered.files.length}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t pt-2 mt-2">
                        <span className="font-medium">Total:</span>
                        <span className="font-medium">{filtered.photos.length + filtered.files.length} items</span>
                      </div>
                    </div>
                  );
                })()}

                {exportPreviewData.folderBreakdown.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Select folders to include</h4>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {exportPreviewData.folderBreakdown.map((folder, index) => {
                        const isExcluded = excludedFolders.has(folder.path);
                        return (
                          <div 
                            key={index} 
                            className={`flex items-center justify-between text-sm py-1.5 px-2 rounded cursor-pointer transition-colors ${
                              isExcluded ? 'bg-muted/20 opacity-60' : 'bg-muted/30 hover:bg-muted/50'
                            }`}
                            onClick={() => toggleFolderExclusion(folder.path)}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Checkbox 
                                checked={!isExcluded}
                                onCheckedChange={() => toggleFolderExclusion(folder.path)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className={`truncate ${isExcluded ? 'line-through' : ''}`}>{folder.path}</span>
                            </div>
                            <span className="text-muted-foreground shrink-0 ml-2">
                              {folder.photoCount + folder.fileCount} items
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setExportPreviewOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={confirmExportWithSubfolders}
                    disabled={(() => {
                      const filtered = getFilteredExportData();
                      return filtered.photos.length + filtered.files.length === 0;
                    })()}
                  >
                    <FileArchive className="h-4 w-4 mr-1" />
                    Export ZIP
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Confirmation Dialog */}
      <AlertDialog open={exportConfirmOpen} onOpenChange={setExportConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Export</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const summary = getExportSummary();
                const exportType = pendingExportAction?.type;
                
                if (summary.isSelection) {
                  return `You are about to export ${summary.photoCount + summary.fileCount} selected item${summary.photoCount + summary.fileCount !== 1 ? 's' : ''}.`;
                }
                
                if (exportType === 'zipAll') {
                  return `This will export all files in the current folder and its subfolders as a ZIP file.`;
                }
                
                return `You are about to export ${summary.photoCount} photo${summary.photoCount !== 1 ? 's' : ''} and ${summary.fileCount} file${summary.fileCount !== 1 ? 's' : ''} from the current folder.`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
            {(() => {
              const summary = getExportSummary();
              return (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Photos:</span>
                    <span className="font-medium">{summary.photoCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Files:</span>
                    <span className="font-medium">{summary.fileCount}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span className="font-medium">Total:</span>
                    <span className="font-medium">{summary.photoCount + summary.fileCount} items</span>
                  </div>
                </>
              );
            })()}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingExportAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleExportConfirm}>
              <FileArchive className="h-4 w-4 mr-1" />
              Export
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Folder Export Selection Dialog */}
      <Dialog open={folderExportDialogOpen} onOpenChange={(open) => {
        setFolderExportDialogOpen(open);
        if (!open) setFolderExportData(null);
      }}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export: {folderExportData?.folderName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col">
            {folderExportData?.loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading folder contents...</span>
              </div>
            ) : folderExportData ? (
              <>
                {/* Selection controls */}
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllFolderExportItems}
                    >
                      <CheckSquare className="h-4 w-4 mr-1" />
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={deselectAllFolderExportItems}
                    >
                      <Square className="h-4 w-4 mr-1" />
                      Deselect All
                    </Button>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {folderExportData.selectedPhotos.size + folderExportData.selectedFiles.size} selected
                  </span>
                </div>

                {/* Items list */}
                <div className="flex-1 overflow-y-auto space-y-3">
                  {folderExportData.photos.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Photos ({folderExportData.photos.length})</h3>
                      {folderExportData.photos.map((photo: any) => (
                        <div
                          key={photo.id}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent/50 ${
                            folderExportData.selectedPhotos.has(photo.id) ? 'bg-accent/50' : ''
                          }`}
                          onClick={() => toggleFolderExportPhotoSelection(photo.id)}
                        >
                          <Checkbox
                            checked={folderExportData.selectedPhotos.has(photo.id)}
                            onCheckedChange={() => toggleFolderExportPhotoSelection(photo.id)}
                          />
                          <img
                            src={photo.file_url}
                            alt={photo.title || "Photo"}
                            className="h-10 w-10 object-cover rounded"
                          />
                          <span className="text-sm truncate flex-1">{photo.title || "Untitled photo"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {folderExportData.files.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-muted-foreground">Files ({folderExportData.files.length})</h3>
                      {folderExportData.files.map((file: any) => (
                        <div
                          key={file.id}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent/50 ${
                            folderExportData.selectedFiles.has(file.id) ? 'bg-accent/50' : ''
                          }`}
                          onClick={() => toggleFolderExportFileSelection(file.id)}
                        >
                          <Checkbox
                            checked={folderExportData.selectedFiles.has(file.id)}
                            onCheckedChange={() => toggleFolderExportFileSelection(file.id)}
                          />
                          <div className="p-2 rounded-lg bg-primary/10">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-sm truncate flex-1">{file.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {folderExportData.photos.length === 0 && folderExportData.files.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FolderOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>This folder is empty</p>
                    </div>
                  )}
                </div>

                {/* Export button */}
                <div className="pt-4 border-t mt-4">
                  <Button
                    className="w-full"
                    onClick={exportSelectedFolderItems}
                    disabled={folderExportData.selectedPhotos.size + folderExportData.selectedFiles.size === 0}
                  >
                    <FileArchive className="h-4 w-4 mr-1" />
                    Export {folderExportData.selectedPhotos.size + folderExportData.selectedFiles.size} Items as ZIP
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Storage Purchase Dialog */}
      {currentClub && (
        <Suspense fallback={null}>
        <StoragePurchaseDialog
          open={storagePurchaseDialogOpen}
          onOpenChange={setStoragePurchaseDialogOpen}
          clubId={currentClub.id}
          clubName={currentClub.name}
          currentStorageLimit={PRO_STORAGE_LIMIT}
          purchasedStorageGb={purchasedStorageGb}
          scheduledDowngradeGb={scheduledDowngradeGb}
          storageDowngradeAt={storageDowngradeAt}
        />
        </Suspense>
      )}

      {/* Move File Dialog */}
      <Suspense fallback={null}>
      <MoveFileDialog
        open={moveFileDialogOpen}
        onOpenChange={setMoveFileDialogOpen}
        file={fileToMove}
        teamId={currentView.type === "team" ? currentView.teamId : null}
        clubId={currentView.type === "club" || currentView.type === "team" ? currentView.clubId : null}
        onMove={(fileId, targetFolderId, targetTeamId) => moveFileMutation.mutate({ fileId, targetFolderId, targetTeamId })}
        isMoving={moveFileMutation.isPending}
      />
      </Suspense>
    </div>
  );
}
