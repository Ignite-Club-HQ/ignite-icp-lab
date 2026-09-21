import { useState } from "react";
import { format } from "date-fns";
import {
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FolderDown,
  FolderOpen,
  HardDrive,
  Loader2,
  MoreVertical,
  Pencil,
  RotateCcw,
  Sheet,
  Trash2,
  CheckSquare,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import {
  Sheet as UISheet,
  SheetContent as UISheetContent,
  SheetHeader as UISheetHeader,
  SheetTitle as UISheetTitle,
} from "@/components/ui/sheet";
import { HighlightedText } from "@/components/vault/HighlightedText";
import { VaultFolderCard } from "@/components/vault/VaultFolderCard";
import { formatVaultFileSize, getVaultExternalLinkInfo, isVaultDocumentFile, isVaultSpreadsheetFile } from "@/features/vault/vaultFilePresentation";
import { useSignedPhotoUrl } from "@/hooks/useSignedPhotoUrl";
import { toast } from "sonner";



export type VaultStorageTeamProjection = {
  teamId: string | null;
  teamName: string;
  size: number;
};

export function VaultStorageTeamProjection({
  byTeam,
  totalStorage,
  formatStorageSize,
}: {
  byTeam: readonly VaultStorageTeamProjection[];
  totalStorage: number;
  formatStorageSize: (bytes: number) => string;
}) {
  if (byTeam.length === 0) return null;

  return (
    <Collapsible className="pt-3 border-t">
      <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group">
        <span>Storage by Team</span>
        <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {byTeam.slice(0, 5).map((team) => {
          const percentage = totalStorage > 0
            ? Math.min(100, (team.size / totalStorage) * 100)
            : 0;
          return (
            <div key={team.teamId || "club"} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FolderOpen className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{team.teamName}</span>
                </div>
                <span className="text-muted-foreground shrink-0">
                  {formatStorageSize(team.size)} ({Math.round(percentage)}%)
                </span>
              </div>
              <Progress
                value={percentage}
                className="h-1.5 w-full bg-white dark:bg-muted [&>div]:bg-primary"
              />
            </div>
          );
        })}
        {byTeam.length > 5 && (
          <span className="text-xs text-muted-foreground">+{byTeam.length - 5} more teams</span>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export type VaultPhoto = {
  id: string;
  file_url?: string | null;
  image_url?: string | null;
  title?: string | null;
  uploader_id?: string | null;
  deleted_at?: string | null;
  team_id?: string | null;
  folder?: { name?: string | null } | null;
  [key: string]: any;
};

export type VaultFile = {
  id: string;
  name: string;
  file_url: string;
  file_type?: string | null;
  file_size?: number | null;
  created_at?: string | null;
  deleted_at?: string | null;
  is_external_link?: boolean | null;
  uploaded_by?: string | null;
  team_id?: string | null;
  folder?: { name?: string | null } | null;
  [key: string]: any;
};

// Photo item with three-dot menu for actions
export function VaultPhotoItem({
  photo,
  index,
  onPhotoClick,
  canDelete,
  onDelete,
  onDownload,
  canRename,
  onRename,
  selectionMode = false,
  isSelected = false,
  onToggleSelection,
}: {
  photo: any;
  index: number;
  onPhotoClick: (index: number) => void;
  canDelete: boolean;
  onDelete: (id: string) => void;
  onDownload?: (url: string, filename: string) => void;
  canRename?: boolean;
  onRename?: (photo: any) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Use file_url or image_url (mini-league photos use image_url)
  const rawPhotoUrl = photo.file_url || photo.image_url;
  
  // Get signed URL for private bucket photos
  const { signedUrl, isLoading: isLoadingSignedUrl } = useSignedPhotoUrl(rawPhotoUrl);
  const photoUrl = signedUrl || rawPhotoUrl;
  
  // If no URL is available, show error state
  if (!rawPhotoUrl) {
    return (
      <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
        <span className="text-xs text-muted-foreground">No image</span>
      </div>
    );
  }
  
  // Show loading state while fetching signed URL or loading image
  if (isLoadingSignedUrl || (!isLoaded && !hasError)) {
    return (
      <>
        {/* Only start preloading once we have a signed URL */}
        {!isLoadingSignedUrl && photoUrl && (
          <img
            src={photoUrl}
            alt=""
            style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              console.error('[VaultPhotoItem] Failed to load image:', photoUrl);
              setHasError(true);
            }}
          />
        )}
        {/* Placeholder skeleton while loading */}
        <div className="aspect-square rounded-lg bg-muted animate-pulse" />
      </>
    );
  }
  
  // Show error state if image failed to load
  if (hasError) {
    return (
      <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
        <span className="text-xs text-muted-foreground text-center px-2">Failed to load</span>
      </div>
    );
  }

  const hasActions = onDownload || (canRename && onRename) || canDelete;

  return (
    <div className={`relative group ${selectionMode && isSelected ? 'ring-2 ring-primary rounded-lg' : ''}`}>
      <img
        src={photoUrl}
        alt={photo.title || "Photo"}
        className={`aspect-square object-cover rounded-lg cursor-pointer transition-opacity select-none hover:opacity-90 ${selectionMode && isSelected ? 'opacity-75' : ''}`}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => selectionMode ? onToggleSelection?.(photo.id) : onPhotoClick(index)}
      />
      {/* Selection checkbox overlay */}
      {selectionMode && (
        <div 
          className="absolute top-1.5 left-1.5 z-10"
          onClick={(e) => { e.stopPropagation(); onToggleSelection?.(photo.id); }}
        >
          <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            isSelected 
              ? 'bg-primary border-primary text-primary-foreground' 
              : 'bg-background/80 border-muted-foreground/50'
          }`}>
            {isSelected && <CheckSquare className="h-3.5 w-3.5" />}
          </div>
        </div>
      )}
      {/* Three-dot menu for actions - hide in selection mode */}
      {!selectionMode && hasActions && (
        <div className="absolute top-1 right-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              {onDownload && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onDownload(photoUrl, photo.title || `photo-${photo.id}.jpg`);
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>
              )}
              {canRename && onRename && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onRename(photo);
                }}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(photo.id);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

// Helper function to download and open in external service
function downloadAndOpenExternal(
  fileUrl: string, 
  fileName: string, 
  serviceUrl: string,
  serviceName: string,
  instructions: string,
  showToast: (msg: string, opts?: { description?: string }) => void
): void {
  // Download the file first
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = fileName;
  link.click();
  
  // Show toast with instructions
  showToast("File downloaded!", {
    description: `Opening ${serviceName}... ${instructions}`
  });
  
  // Open the service after a brief delay
  setTimeout(async () => {
    const { safeOpenUrl } = await import("@/lib/safeOpenUrl");
    safeOpenUrl(serviceUrl);
  }, 500);
}

// Helper function to open a file in Google Sheets
function openInGoogleSheets(fileUrl: string, fileName: string, showToast: (msg: string, opts?: { description?: string }) => void): void {
  downloadAndOpenExternal(
    fileUrl, 
    fileName, 
    "https://reference.invalid",
    "Google Sheets",
    "Use File > Import to open your downloaded file.",
    showToast
  );
}

// Helper function to open a file in Google Drive
function openInGoogleDrive(fileUrl: string, fileName: string, showToast: (msg: string, opts?: { description?: string }) => void): void {
  downloadAndOpenExternal(
    fileUrl, 
    fileName, 
    "https://reference.invalid",
    "Google Drive",
    "Click 'New' > 'File upload' to upload your downloaded file.",
    showToast
  );
}

// Helper function to open a file in Dropbox
function openInDropbox(fileUrl: string, fileName: string, showToast: (msg: string, opts?: { description?: string }) => void): void {
  downloadAndOpenExternal(
    fileUrl, 
    fileName, 
    "https://reference.invalid",
    "Dropbox",
    "Click 'Upload' to add your downloaded file.",
    showToast
  );
}

export interface ContentSectionProps {
  photos: VaultPhoto[];
  files: VaultFile[];
  onPhotoClick: (index: number) => void;
  canDeletePhoto: (photo: VaultPhoto) => boolean;
  canDeleteFile: (file: VaultFile) => boolean;
  canRenamePhoto?: (photo: VaultPhoto) => boolean;
  canRenameFile?: (file: VaultFile) => boolean;
  canMoveFile?: (file: VaultFile) => boolean;
  onDeletePhoto: (id: string) => void;
  onDeleteFile: (id: string) => void;
  onRenamePhoto?: (photo: VaultPhoto) => void;
  onRenameFile?: (file: VaultFile) => void;
  onMoveFile?: (file: VaultFile) => void;
  onDownloadPhoto?: (url: string, filename: string) => void;
  // Selection mode props
  selectionMode?: boolean;
  selectedPhotos?: Set<string>;
  selectedFiles?: Set<string>;
  onTogglePhotoSelection?: (id: string) => void;
  onToggleFileSelection?: (id: string) => void;
  // Trash mode props
  isTrashView?: boolean;
  onRestorePhoto?: (id: string) => void;
  onRestoreFile?: (id: string) => void;
  onPermanentDeletePhoto?: (id: string) => void;
  onPermanentDeleteFile?: (id: string) => void;
  searchQuery?: string;
}

export function ContentSection({ 
  photos, 
  files, 
  onPhotoClick,
  canDeletePhoto,
  canDeleteFile,
  canRenamePhoto,
  canRenameFile,
  canMoveFile,
  onDeletePhoto,
  onDeleteFile,
  onRenamePhoto,
  onRenameFile,
  onMoveFile,
  onDownloadPhoto,
  selectionMode = false,
  selectedPhotos,
  selectedFiles,
  onTogglePhotoSelection,
  onToggleFileSelection,
  isTrashView = false,
  onRestorePhoto,
  onRestoreFile,
  onPermanentDeletePhoto,
  onPermanentDeleteFile,
  searchQuery,
}: ContentSectionProps) {
  const hasContent = photos.length > 0 || files.length > 0;
  const [actionSheetFile, setActionSheetFile] = useState<any | null>(null);

  if (!hasContent) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{isTrashView ? "Trash is empty" : "This folder is empty"}</p>
          <p className="text-sm text-muted-foreground mt-1">{isTrashView ? "Deleted files will appear here" : "Upload photos or files to get started"}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {photos.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Photos ({photos.length})</h2>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <VaultPhotoItem
                key={photo.id}
                photo={photo}
                index={index}
                onPhotoClick={selectionMode ? () => onTogglePhotoSelection?.(photo.id) : onPhotoClick}
                canDelete={canDeletePhoto(photo)}
                onDelete={onDeletePhoto}
                onDownload={onDownloadPhoto}
                canRename={canRenamePhoto?.(photo)}
                onRename={onRenamePhoto}
                selectionMode={selectionMode}
                isSelected={selectedPhotos?.has(photo.id) || false}
                onToggleSelection={onTogglePhotoSelection}
              />
            ))}
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Files ({files.length})</h2>
          <div className="space-y-2">
            {files.map((file) => {
              const isExternalLink = file.is_external_link;
              const externalLinkInfo = isExternalLink ? getVaultExternalLinkInfo(file.file_url) : null;
              
              return (
              <Card 
                key={file.id} 
                className="group cursor-pointer"
                onClick={() => {
                  // External links go to the browser; stored files hand off to
                  // the native viewer so the real file name is shown.
                  if (isExternalLink) {
                    import("@/lib/safeOpenUrl").then(({ safeOpenUrl }) => safeOpenUrl(file.file_url));
                  } else {
                    import("@/lib/safeOpenFile").then(({ safeOpenFile }) =>
                      safeOpenFile(file.file_url, {
                        fileName: file.name || undefined,
                        mimeType: file.file_type || undefined,
                      }),
                    ).catch(() => {});
                  }
                }}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  {isExternalLink && externalLinkInfo ? (
                    <div className="p-2 rounded-lg bg-muted flex items-center justify-center text-lg">
                      {externalLinkInfo.icon}
                    </div>
                  ) : (
                    <div className={`p-2 rounded-lg ${isVaultSpreadsheetFile(file.name || '') ? 'bg-green-500/10' : 'bg-primary/10'}`}>
                      {isVaultSpreadsheetFile(file.name || '') ? (
                        <FileSpreadsheet className="h-4 w-4 text-green-600" />
                      ) : (
                        <FileText className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      <HighlightedText text={file.name} query={searchQuery} />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isExternalLink && externalLinkInfo ? (
                        <span className={externalLinkInfo.color}>{externalLinkInfo.type}</span>
                      ) : (
                        <>
                          {format(new Date(file.created_at), "MMM d, yyyy")}
                          {file.file_size ? ` • ${formatVaultFileSize(file.file_size)}` : ''}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                      {isTrashView ? (
                        <>
                          {onRestoreFile && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRestoreFile(file.id);
                              }}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          {onPermanentDeleteFile && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteFile(file.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionSheetFile(file);
                          }}
                          aria-label="File actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* File actions bottom sheet */}
      <UISheet open={!!actionSheetFile} onOpenChange={(o) => { if (!o) setActionSheetFile(null); }}>
        <UISheetContent side="bottom" className="rounded-t-xl pb-[max(env(safe-area-inset-bottom),1rem)]">
          {actionSheetFile && (() => {
            const file = actionSheetFile;
            const isExternalLink = file.is_external_link;
            const externalLinkInfo = isExternalLink ? getVaultExternalLinkInfo(file.file_url) : null;
            const close = () => setActionSheetFile(null);
            const Item = ({ icon: Icon, label, onClick, destructive = false }: { icon: any; label: string; onClick: () => void; destructive?: boolean }) => (
              <button
                type="button"
                onClick={() => { onClick(); close(); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm hover:bg-accent active:bg-accent transition-colors ${destructive ? 'text-destructive' : 'text-foreground'}`}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </button>
            );
            return (
              <>
                <UISheetHeader className="text-left">
                  <UISheetTitle className="truncate">{file.name}</UISheetTitle>
                </UISheetHeader>
                <div className="mt-2 flex flex-col gap-1">
                  {isExternalLink ? (
                    <Item
                      icon={ExternalLink}
                      label={`Open ${externalLinkInfo?.type || 'Link'}`}
                      onClick={() => import("@/lib/safeOpenUrl").then(({ safeOpenUrl }) => safeOpenUrl(file.file_url))}
                    />
                  ) : (
                    <>
                      <Item
                        icon={ExternalLink}
                        label="Open"
                        onClick={() =>
                          import("@/lib/safeOpenFile").then(({ safeOpenFile }) =>
                            safeOpenFile(file.file_url, {
                              fileName: file.name || undefined,
                              mimeType: file.file_type || undefined,
                            }),
                          ).catch(() => {})
                        }
                      />
                      <Item
                        icon={Download}
                        label="Download"
                        onClick={async () => {
                          const { resolveSignedUrl } = await import("@/hooks/useSignedPhotoUrl");
                          const href = await resolveSignedUrl(file.file_url);
                          const a = document.createElement('a');
                          a.href = href;
                          a.download = file.name || '';
                          a.rel = 'noopener';
                          a.target = '_blank';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}
                      />
                    </>
                  )}
                  {!isExternalLink && isVaultSpreadsheetFile(file.name || '') && (
                    <Item
                      icon={Sheet}
                      label="Open in Google Sheets"
                      onClick={() => openInGoogleSheets(file.file_url, file.name || 'spreadsheet', toast)}
                    />
                  )}
                  {!isExternalLink && isVaultDocumentFile(file.name || '') && (
                    <Item
                      icon={HardDrive}
                      label="Open in Google Drive"
                      onClick={() => openInGoogleDrive(file.file_url, file.name || 'document', toast)}
                    />
                  )}
                  {canMoveFile?.(file) && onMoveFile && (
                    <Item icon={FolderDown} label="Move to Folder" onClick={() => onMoveFile(file)} />
                  )}
                  {canRenameFile?.(file) && onRenameFile && (
                    <Item icon={Pencil} label="Rename" onClick={() => onRenameFile(file)} />
                  )}
                  {canDeleteFile(file) && (
                    <Item icon={Trash2} label="Delete" destructive onClick={() => onDeleteFile(file.id)} />
                  )}
                </div>
              </>
            );
          })()}
        </UISheetContent>
      </UISheet>
    </div>
  );
}

// Small component to render signed thumbnail for trash photos
function TrashPhotoThumbnail({ src, alt }: { src: string; alt: string }) {
  const { signedUrl, isLoading } = useSignedPhotoUrl(src);
  const effectiveSrc = signedUrl || src;
  
  if (isLoading) {
    return <div className="h-12 w-12 rounded-lg bg-muted animate-pulse flex-shrink-0" />;
  }
  
  return (
    <img
      src={effectiveSrc}
      alt={alt}
      className="h-12 w-12 object-cover rounded-lg flex-shrink-0"
    />
  );
}

export type VaultContentRendererProps = {
  folders: Array<{ id: string; name: string }>;
  searchQuery?: string;
  onNavigateToFolder: (folder: { id: string; name: string }) => void;
  onShareFolder: (folder: { id: string; name: string }) => void;
  onExportFolder: (folder: { id: string; name: string }) => void;
  onRenameFolder: (folder: { id: string; name: string }) => void;
  onDeleteFolder: (folder: { id: string; name: string }) => void;
  canEditFolder: (folder: { id: string; name: string }) => boolean;
} & (
  | { mode: "content"; content: ContentSectionProps }
  | { mode: "trash"; trash: TrashSectionProps }
);

export function VaultContentRenderer(props: VaultContentRendererProps) {
  const {
    folders,
    searchQuery,
    onNavigateToFolder,
    onShareFolder,
    onExportFolder,
    onRenameFolder,
    onDeleteFolder,
    canEditFolder,
  } = props;
  return (
    <>
      {props.mode === "content" && folders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Folders</h2>
          {folders.map((folder) => (
            <VaultFolderCard
              key={folder.id}
              folder={folder}
              searchQuery={searchQuery}
              onNavigate={() => onNavigateToFolder(folder)}
              onShare={() => onShareFolder(folder)}
              onExport={() => onExportFolder(folder)}
              onRename={() => onRenameFolder(folder)}
              onDelete={() => onDeleteFolder(folder)}
              canEdit={canEditFolder(folder)}
            />
          ))}
        </div>
      )}
      {props.mode === "content" ? (
        <ContentSection {...props.content} />
      ) : (
        <TrashSection {...props.trash} />
      )}
    </>
  );
}

function TrashItemActions({
  id,
  onRestore,
  onPermanentDelete,
}: {
  id: string;
  onRestore: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="text-green-600 hover:text-green-700 hover:bg-green-50"
        onClick={(e) => {
          e.stopPropagation();
          onRestore(id);
        }}
      >
        <RotateCcw className="h-4 w-4 mr-1" />
        Restore
      </Button>
      {onPermanentDelete && (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={(e) => {
            e.stopPropagation();
            onPermanentDelete(id);
          }}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      )}
    </div>
  );
}

// Trash section component - shows all deleted items in a flat list with original location
export interface TrashSectionProps {
  photos: VaultPhoto[];
  files: VaultFile[];
  isLoading: boolean;
  onRestorePhoto: (id: string) => void;
  onRestoreFile: (id: string) => void;
  onPermanentDeletePhoto?: (id: string) => void;
  onPermanentDeleteFile?: (id: string) => void;
  onEmptyTrash?: () => void;
  isEmptyingTrash?: boolean;
}

export function TrashSection({
  photos,
  files,
  isLoading,
  onRestorePhoto,
  onRestoreFile,
  onPermanentDeletePhoto,
  onPermanentDeleteFile,
  onEmptyTrash,
  isEmptyingTrash,
}: TrashSectionProps) {
  const hasContent = photos.length > 0 || files.length > 0;

  const getLocationPath = (item: any): string => {
    const parts: string[] = [];
    if (item.team?.name) {
      parts.push(item.team.name);
    }
    if (item.folder?.name) {
      parts.push(item.folder.name);
    }
    if (parts.length === 0) {
      return item.team_id ? "Team root" : "Club root";
    }
    return parts.join(" / ");
  };

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 mx-auto text-muted-foreground mb-4 animate-spin" />
          <p className="text-muted-foreground">Loading trash...</p>
        </CardContent>
      </Card>
    );
  }

  if (!hasContent) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <Trash2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Trash is empty</p>
          <p className="text-sm text-muted-foreground mt-1">Deleted files will appear here for recovery</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Auto-purge notice + Empty Trash */}
      <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
        <p className="text-xs text-muted-foreground">
          Items in trash are automatically deleted after 30 days.
        </p>
        {onEmptyTrash && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={isEmptyingTrash}
              >
                {isEmptyingTrash ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1" />
                )}
                Empty Trash
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Empty Trash?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all {photos.length + files.length} item{photos.length + files.length !== 1 ? 's' : ''} in the trash. Files will be removed from storage and cannot be recovered.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onEmptyTrash}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, empty trash
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {photos.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Deleted Photos ({photos.length})</h2>
          <div className="space-y-2">
            {photos.map((photo) => (
              <Card key={photo.id} className="group">
                <CardContent className="p-3 flex items-center gap-3">
                  <TrashPhotoThumbnail src={photo.file_url} alt={photo.title || "Photo"} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{photo.title || "Untitled photo"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <FolderOpen className="h-3 w-3" />
                      {getLocationPath(photo)}
                    </p>
                    {photo.deleted_at && (
                      <p className="text-xs text-muted-foreground">
                        Deleted {format(new Date(photo.deleted_at), "MMM d, yyyy")}
                        {(() => {
                          const daysLeft = Math.max(0, 30 - Math.floor((Date.now() - new Date(photo.deleted_at).getTime()) / (1000 * 60 * 60 * 24)));
                          return ` • Auto-deletes in ${daysLeft}d`;
                        })()}
                      </p>
                    )}
                  </div>
                  <TrashItemActions id={photo.id} onRestore={onRestorePhoto} onPermanentDelete={onPermanentDeletePhoto} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Deleted Files ({files.length})</h2>
          <div className="space-y-2">
            {files.map((file) => (
              <Card key={file.id} className="group">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <FolderOpen className="h-3 w-3" />
                      {getLocationPath(file)}
                    </p>
                    {file.deleted_at && (
                      <p className="text-xs text-muted-foreground">
                        Deleted {format(new Date(file.deleted_at), "MMM d, yyyy")}
                        {file.file_size ? ` • ${formatVaultFileSize(file.file_size)}` : ''}
                        {(() => {
                          const daysLeft = Math.max(0, 30 - Math.floor((Date.now() - new Date(file.deleted_at).getTime()) / (1000 * 60 * 60 * 24)));
                          return ` • Auto-deletes in ${daysLeft}d`;
                        })()}
                      </p>
                    )}
                  </div>
                  <TrashItemActions id={file.id} onRestore={onRestoreFile} onPermanentDelete={onPermanentDeleteFile} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
