import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pagesDirectory = dirname(fileURLToPath(import.meta.url));
const messagesPageSource = readFileSync(join(pagesDirectory, "MessagesPage.tsx"), "utf8");
const inboxSectionsPath = join(pagesDirectory, "MessagesInboxSections.tsx");
const inboxSectionsSource = existsSync(inboxSectionsPath)
  ? readFileSync(inboxSectionsPath, "utf8")
  : "";
const presentationSource = `${messagesPageSource}\n${inboxSectionsSource}`;

describe("MessagesPage decomposition contract", () => {
  it("keeps the inbox presentation states and operational disclosure rules intact", () => {
    expect(presentationSource).toContain("You're offline — showing saved conversations.");
    expect(presentationSource).toContain("You're offline and no saved conversations are available yet");
    expect(presentationSource).toContain("Couldn't load chats. Tap to retry.");
    expect(presentationSource).toContain("No messages match");
    expect(presentationSource).toContain("No messages available");
    expect(presentationSource).toContain("Show {hiddenOps.length} more inactive group");
    expect(presentationSource).toMatch(/typeFilter === ["']groups["'] && visibleRecent\.length >= 5/);
  });

  it("keeps the provider, authorization, cache, and realtime responsibilities route-local", () => {
    expect(messagesPageSource).toContain("resolveLocalAuthMode");
    expect(messagesPageSource).toContain("useAuthorizedScopes");
    expect(messagesPageSource).toContain("registerChannel");
    expect(messagesPageSource).toContain("queryClient.invalidateQueries");
    expect(messagesPageSource).toContain("isAuthorizedInboxScope");
    expect(messagesPageSource).toContain("queueChatInvalidation");
  });

  it("preserves interaction-gated lazy dialog boundaries", () => {
    expect(messagesPageSource).toContain(
      'lazyWithRetry(() => import("@/components/chat/NewMessageSheet")',
    );
    expect(messagesPageSource).toContain(
      'lazyWithRetry(() => import("@/components/chat/StartDMDialog")',
    );
    expect(messagesPageSource).toContain(
      'lazyWithRetry(() => import("@/components/chat/CreateGroupDialog")',
    );
    expect(messagesPageSource).toContain("<Suspense fallback={null}>");
  });
});
