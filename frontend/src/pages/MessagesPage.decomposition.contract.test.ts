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
const headerPath = join(pagesDirectory, "../components/chat/MessagesPageHeader.tsx");
const dialogsPath = join(pagesDirectory, "../components/chat/MessagesPageDialogs.tsx");
const previewSourcesPath = join(pagesDirectory, "../features/messaging/inbox/inboxPreviewSources.ts");
const prefetchPath = join(pagesDirectory, "../features/messaging/inbox/useInboxThreadPrefetch.ts");
const headerSource = existsSync(headerPath) ? readFileSync(headerPath, "utf8") : "";
const dialogsSource = existsSync(dialogsPath) ? readFileSync(dialogsPath, "utf8") : "";
const previewSourcesSource = existsSync(previewSourcesPath) ? readFileSync(previewSourcesPath, "utf8") : "";
const prefetchSource = existsSync(prefetchPath) ? readFileSync(prefetchPath, "utf8") : "";
const presentationSource = `${messagesPageSource}\n${inboxSectionsSource}\n${headerSource}\n${dialogsSource}`;

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
    expect(dialogsSource).toMatch(
      /lazyWithRetry\(\(\) =>\s*import\("@\/components\/chat\/NewMessageSheet"\)/,
    );
    expect(dialogsSource).toMatch(
      /lazyWithRetry\(\(\) =>\s*import\("@\/components\/chat\/StartDMDialog"\)/,
    );
    expect(dialogsSource).toMatch(
      /lazyWithRetry\(\(\) =>\s*import\("@\/components\/chat\/CreateGroupDialog"\)/,
    );
    expect(dialogsSource).toContain("<Suspense fallback={null}>");
  });

  it("keeps preview source fixture, RPC, and compatibility-fetch paths explicit", () => {
    expect(previewSourcesSource).toContain("fetchMemberClubsWithMessages");
    expect(previewSourcesSource).toContain("fetchTeamsWithMessages");
    expect(previewSourcesSource).toContain("fetchChatGroupsWithMessages");
    expect(previewSourcesSource).toContain("getLocalLabMessagesSnapshot");
    expect(previewSourcesSource).toContain("get_inbox_latest_club_messages");
    expect(previewSourcesSource).toContain("get_inbox_latest_team_messages");
    expect(previewSourcesSource).toContain("get_inbox_latest_group_messages");
    expect(previewSourcesSource).toContain('from("club_messages")');
    expect(previewSourcesSource).toContain('from("team_messages")');
    expect(previewSourcesSource).toContain('from("group_messages")');
  });

  it("keeps the DM source fallbacks and native-safe prefetch controller explicit", () => {
    expect(messagesPageSource).toContain("fetchDirectMessageConversations");
    expect(previewSourcesSource).toContain("get_inbox_latest_dm_messages");
    expect(previewSourcesSource).toContain('from("direct_messages")');
    expect(previewSourcesSource).toContain("getPreviousConversations");
    expect(previewSourcesSource).toContain("cacheMessagesPageData");
    expect(messagesPageSource).toContain("useInboxThreadPrefetch");
    expect(prefetchSource).toContain("isNativeRuntime()");
    expect(prefetchSource).toContain("buildInboxPrefetchJobs");
    expect(prefetchSource).toContain("requestIdleCallback");
    expect(prefetchSource).toContain("cancelIdleCallback");
  });
});
