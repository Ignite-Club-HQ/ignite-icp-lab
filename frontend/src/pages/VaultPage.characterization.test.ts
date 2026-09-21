import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pagesDirectory = dirname(fileURLToPath(import.meta.url));
const vaultPageSource = readFileSync(join(pagesDirectory, "VaultPage.tsx"), "utf8");
const rendererSource = existsSync(join(pagesDirectory, "../components/vault/VaultContentRenderer.tsx"))
  ? readFileSync(join(pagesDirectory, "../components/vault/VaultContentRenderer.tsx"), "utf8")
  : "";
const source = `${vaultPageSource}\n${rendererSource}`;

describe("VaultPage rendering and provider-boundary characterization", () => {
  it("keeps club, team, and mini-league scope branches distinct", () => {
    expect(vaultPageSource).toContain('currentView.type === "club"');
    expect(vaultPageSource).toContain('currentView.type === "team"');
    expect(vaultPageSource).toContain('currentView.type === "mini-league"');
    expect(source).toContain("files: [],");
    expect(source).toContain("canDeleteFile: () => false");
    expect(source).toContain("onRenameFile: () => undefined");
  });

  it("keeps the shared active-content and trash variants observable", () => {
    expect(source).toContain("ContentSection");
    expect(source).toContain("TrashSection");
    expect(source).toContain("photos.map");
    expect(source).toContain("files.map");
    expect(source).toContain("isTrashView ? \"Trash is empty\"");
    expect(source).toContain('if (isLoading)');
    expect(source).toContain("Loading trash...");
    expect(source).toContain("Deleted Photos ({photos.length})");
    expect(source).toContain("Deleted Files ({files.length})");
  });

  it("preserves row actions, confirmation callbacks, and cache scopes", () => {
    expect(source).toContain('aria-label="File actions"');
    expect(source).toContain('label="Move to Folder"');
    expect(source).toContain('label="Rename"');
    expect(source).toContain('label="Delete" destructive');
    expect(vaultPageSource).toContain('showTrash ? permanentDeletePhotoMutation.mutate');
    expect(vaultPageSource).toContain('showTrash ? permanentDeleteFileMutation.mutate');
    expect(vaultPageSource).toContain('invalidateVaultCache(queryClient, ["trash", "files"]);');
    expect(vaultPageSource).toContain('invalidateVaultCache(queryClient, ["files", "clubs", "storageBreakdown"]);');
    expect(vaultPageSource).toContain('invalidateVaultCache(queryClient, ["trash", "files", "storageBreakdown", "photos"]);');
  });

  it("preserves storage projection and the provider-specific page boundary", () => {
    expect(vaultPageSource).toContain("currentTeamStorageUsed");
    expect(source).toContain("byTeam.slice(0, 5)");
    expect(vaultPageSource).toContain("VaultStorageTeamProjection");
    expect(vaultPageSource).toContain("VaultStorageBreakdown");
    expect(vaultPageSource).toContain("function SupabaseVaultPage");
    expect(vaultPageSource).toContain("resolveLocalAuthMode");
    expect(vaultPageSource).toContain("IcpUnavailablePage");
    expect(vaultPageSource).not.toContain("SupabaseVaultPage = Icp");
  });
});
