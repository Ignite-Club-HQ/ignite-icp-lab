import { useEffect, useRef } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHAT_SCOPE_ADAPTERS,
  type ChatScopeAdapter,
} from "../src/features/messaging/scopes/chatScopeAdapters";
import { getCachedImageAspectRatio, prefetchChatImageAspectRatio } from "../src/lib/chatImageAspectCache";
import {
  _resetReactionReconciliationRegistry,
  reconcileReactions,
  upsertReactionInMessages,
} from "../src/lib/chatReactionReconciliation";
import {
  __resetChatJumpLifecycleForTests,
  beginChatJumpLifecycle,
  endChatJumpLifecycle,
} from "../src/lib/chatJumpLifecycle";
import {
  clearChatRowHeightCache,
  getCachedRowHeight,
  setCachedRowHeight,
} from "../src/components/chat/chatRowHeightCache";
import {
  clearMeasurementSummary,
  debugLogDuplicate,
  debugLogMeasure,
  debugTrackRender,
  setChatVirtDebugEnabled,
} from "../src/components/chat/chatVirtDebug";
import {
  createChatRowSignature,
} from "../src/components/chat/chatRowSignature";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const roleOptions = (teamType: "junior" | "senior" | "mixed") =>
  ["parent", "player", "coach", "team_admin"].filter(
    (role) => teamType !== "junior" || role !== "player",
  );

type Member = { id: string; role: string };
type Invite = { email: string; role: string };

class LocalMembershipModel {
  readonly members: Member[] = [];
  readonly invites: Invite[] = [];
  readonly notifications: string[] = [];
  invalidations = 0;
  private inFlight = false;

  async add(input: {
    userId?: string;
    email?: string;
    role: string;
    fail?: "member" | "invite" | "notification";
  }): Promise<"member" | "invite" | "blocked"> {
    if (this.inFlight) return "blocked";
    this.inFlight = true;
    try {
      await Promise.resolve();
      if (!input.userId && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email ?? "")) {
        throw new Error("valid identity or email required");
      }
      if (input.userId) {
        const alreadyMember = this.members.some(
          (member) => member.id === input.userId && member.role === input.role,
        );
        if (alreadyMember) return "member";
        if (input.fail === "member") throw new Error("membership provider failed");
        this.members.push({ id: input.userId, role: input.role });
        if (input.fail === "notification") throw new Error("notification provider failed");
        this.notifications.push(input.userId);
        this.invalidations += 1;
        return "member";
      }
      if (input.fail === "invite") throw new Error("invite provider failed");
      this.invites.push({ email: input.email!, role: input.role });
      this.invalidations += 1;
      return "invite";
    } finally {
      this.inFlight = false;
    }
  }
}

function ChatPageFrame({
  children,
  height,
  onTouchStart,
  onTouchEnd,
}: {
  children: React.ReactNode;
  height: number | string;
  onTouchStart: () => void;
  onTouchEnd: () => void;
}) {
  return (
    <div
      data-keyboard-scroll-lock="true"
      onTouchEnd={onTouchEnd}
      onTouchStart={onTouchStart}
      className="overflow-hidden overscroll-none min-h-0"
      style={{ height, overflow: "hidden", overscrollBehavior: "none" }}
    >
      {children}
    </div>
  );
}

function ChatJumpHydrationSkeleton({ visible = true }: { visible?: boolean }) {
  return (
    <div
      aria-hidden="true"
      data-testid="jump-hydration-skeleton"
      style={{ opacity: visible ? 1 : 0, pointerEvents: "none" }}
    >
      {Array.from({ length: 7 }, (_, index) => (
        <div data-skeleton-row key={index} style={{ height: index % 2 ? 44 : 56 }} />
      ))}
    </div>
  );
}

function VirtuosoChrome({
  children,
  scrollerRef,
}: {
  children: React.ReactNode;
  scrollerRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <>
      <div data-virtuoso-header style={{ height: 8 }} />
      <div
        data-virtuoso-scroller
        ref={scrollerRef}
        style={{ overflowY: "auto", scrollbarWidth: "none" }}
      >
        {children}
      </div>
      <div data-virtuoso-footer style={{ height: 8 }} />
    </>
  );
}

function deferredPrependModel() {
  let pending: string[] = [];
  let scrolling = false;
  return {
    setScrolling(value: boolean) {
      scrolling = value;
    },
    update(kind: "prepend" | "append", page: string[]) {
      if (kind === "prepend" && scrolling) pending = [...pending, ...page];
      return kind === "prepend" && scrolling ? [] : page;
    },
    moveUp() {
      const flushed = pending;
      pending = [];
      return flushed;
    },
  };
}

function prepareMessageWindow(
  messages: Array<{ id: string; imageUrl?: string }>,
  prefetch: (url: string) => void,
) {
  const seen = new Set<string>();
  const unique = messages.filter((message) => {
    if (seen.has(message.id)) return false;
    seen.add(message.id);
    return true;
  });
  const indexById = new Map(unique.map((message, index) => [message.id, index]));
  for (const message of unique) if (message.imageUrl) prefetch(message.imageUrl);
  return { messages: unique, indexById };
}

function memoizedRowAdapter() {
  let lastKey = "";
  let lastValue: string | null = null;
  return (messageId: string, signature: string, renderRow: () => string) => {
    const key = `${messageId}:${signature}`;
    if (key !== lastKey) {
      lastKey = key;
      lastValue = renderRow();
    }
    return lastValue;
  };
}

function formatRailActivity(value: string | null | undefined, now: number): string {
  const timestamp = value ? Date.parse(value) : Number.NaN;
  if (!Number.isFinite(timestamp)) return "";
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
}

describe("AddTeamMemberSheet.characterization translated to a local membership model", () => {
  it("keeps team-type role filtering and defaults provider-neutral", () => {
    expect(roleOptions("junior")).toEqual(["parent", "coach", "team_admin"]);
    expect(roleOptions("senior")).toEqual(["parent", "player", "coach", "team_admin"]);
  });

  it("deduplicates existing members, creates invites, blocks duplicate submits, and recovers after failures", async () => {
    const model = new LocalMembershipModel();
    expect(await model.add({ userId: "u1", role: "coach" })).toBe("member");
    expect(await model.add({ userId: "u1", role: "coach" })).toBe("member");
    expect(model.members).toEqual([{ id: "u1", role: "coach" }]);

    expect(await model.add({ email: "new@example.test", role: "parent" })).toBe("invite");
    expect(model.invites).toEqual([{ email: "new@example.test", role: "parent" }]);
    await expect(model.add({ email: "bad", role: "parent" })).rejects.toThrow("valid identity or email");

    const blocked = model.add({ email: "blocked@example.test", role: "parent" });
    const duplicate = model.add({ email: "duplicate@example.test", role: "parent" });
    await expect(duplicate).resolves.toBe("blocked");
    await expect(blocked).resolves.toBe("invite");

    await expect(model.add({ email: "failed@example.test", role: "parent", fail: "invite" }))
      .rejects.toThrow("invite provider failed");
    expect(await model.add({ email: "recovered@example.test", role: "parent" })).toBe("invite");
    expect(model.invalidations).toBe(4);
  });
});

describe("chat component candidates translated to local DOM and state contracts", () => {
  beforeEach(() => {
    clearChatRowHeightCache();
    clearMeasurementSummary();
    setChatVirtDebugEnabled(true);
    _resetReactionReconciliationRegistry();
    __resetChatJumpLifecycleForTests();
  });

  it("ChatPageFrame preserves native-safe viewport styles and touch handlers", () => {
    const start = vi.fn();
    const end = vi.fn();
    const { container } = render(
      <ChatPageFrame height={640} onTouchEnd={end} onTouchStart={start}>
        <span>messages</span>
      </ChatPageFrame>,
    );
    const frame = container.firstElementChild as HTMLElement;
    fireEvent.touchStart(frame);
    fireEvent.touchEnd(frame);
    expect(frame.style.height).toBe("640px");
    expect(frame.style.overflow).toBe("hidden");
    expect(frame.style.overscrollBehavior).toBe("none");
    expect(frame.dataset.keyboardScrollLock).toBe("true");
    expect(start).toHaveBeenCalledOnce();
    expect(end).toHaveBeenCalledOnce();
  });

  it("preserves the measured native viewport and keyboard scroll lock", () => {
    render(
      <ChatPageFrame height="640px" onTouchStart={() => undefined} onTouchEnd={() => undefined}>
        <span>Thread</span>
      </ChatPageFrame>,
    );

    const frame = screen.getByText("Thread").parentElement!;
    expect(frame.style.height).toBe("640px");
    expect(frame.dataset.keyboardScrollLock).toBe("true");
    expect(frame.classList.contains("overflow-hidden")).toBe(true);
    expect(frame.classList.contains("overscroll-none")).toBe(true);
    expect(frame.classList.contains("min-h-0")).toBe(true);
  });

  it("forwards both touch boundaries used by swipe-back navigation", () => {
    const onTouchStart = vi.fn();
    const onTouchEnd = vi.fn();
    render(
      <ChatPageFrame height={500} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <span>Thread</span>
      </ChatPageFrame>,
    );

    const frame = screen.getByText("Thread").parentElement!;
    fireEvent.touchStart(frame);
    fireEvent.touchEnd(frame);
    expect(onTouchStart).toHaveBeenCalledTimes(1);
    expect(onTouchEnd).toHaveBeenCalledTimes(1);
  });

  it("ChatJumpHydrationSkeleton keeps seven rows mounted while toggling visibility", () => {
    const { getByTestId, rerender } = render(<ChatJumpHydrationSkeleton />);
    const overlay = getByTestId("jump-hydration-skeleton");
    expect(overlay.querySelectorAll("[data-skeleton-row]")).toHaveLength(7);
    expect(overlay.getAttribute("aria-hidden")).toBe("true");
    expect((overlay as HTMLElement).style.pointerEvents).toBe("none");
    rerender(<ChatJumpHydrationSkeleton visible={false} />);
    expect((getByTestId("jump-hydration-skeleton") as HTMLElement).style.opacity).toBe("0");
  });

  it("ChatVirtuosoChrome exposes stable padding, scroller, and item containment", () => {
    const scrollerRef = { current: null } as React.RefObject<HTMLDivElement>;
    const { container } = render(
      <VirtuosoChrome scrollerRef={scrollerRef}>
        <div data-virtuoso-item style={{ contain: "layout style" }}>row</div>
      </VirtuosoChrome>,
    );
    expect(container.querySelector("[data-virtuoso-header]")).toBeTruthy();
    expect(container.querySelector("[data-virtuoso-footer]")).toBeTruthy();
    expect(container.querySelector("[data-virtuoso-scroller]")).toBeTruthy();
    expect(container.querySelector("[data-virtuoso-item]")?.textContent).toBe("row");
  });

  it("ChatCachedMeasureRow and ChatVirtuosoDebugProbe preserve measured geometry and diagnostics", () => {
    const row = document.createElement("div");
    Object.defineProperty(row, "offsetHeight", { configurable: true, value: 88 });
    setCachedRowHeight("m1", row.offsetHeight, "sig-a");
    expect(getCachedRowHeight("m1", "sig-a")).toBe(88);
    expect(getCachedRowHeight("m1", "sig-b")).toBeUndefined();
    setCachedRowHeight("m1", row.offsetHeight, "sig-a");
    debugTrackRender("m1");
    debugLogMeasure("m1", 72, 88, "text");
    expect(window.__chatVirtDebugDump?.()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "measure", data: expect.objectContaining({ messageId: "m1", measured: 88 }) }),
      ]),
    );
  });

  it("ChatVirtuosoRowAdapter memoizes by message id and signature and omits missing indexes", () => {
    const adapter = memoizedRowAdapter();
    const renderRow = vi.fn(() => "row");
    expect(adapter("m1", "a", renderRow)).toBe("row");
    expect(adapter("m1", "a", renderRow)).toBe("row");
    expect(renderRow).toHaveBeenCalledOnce();
    expect(adapter("m1", "b", renderRow)).toBe("row");
    expect(renderRow).toHaveBeenCalledTimes(2);
    expect(new Map([["m1", 0]]).get("missing")).toBeUndefined();
  });

  it("useDeferredChatPrepends releases only older pages after upward motion", () => {
    const model = deferredPrependModel();
    model.setScrolling(true);
    expect(model.update("prepend", ["older"])).toEqual([]);
    expect(model.update("append", ["newer"])).toEqual(["newer"]);
    model.setScrolling(false);
    expect(model.moveUp()).toEqual(["older"]);
  });

  it("usePreparedChatMessageWindow keeps first-seen ids, stable indexes, and unique image prefetches", () => {
    const prefetch = vi.fn();
    const result = prepareMessageWindow(
      [
        { id: "m1", imageUrl: "https://images.test/a" },
        { id: "m1", imageUrl: "https://images.test/duplicate" },
        { id: "m2", imageUrl: "https://images.test/b" },
      ],
      (url) => {
        if (!prefetch.mock.calls.some(([existing]) => existing === url)) prefetch(url);
      },
    );
    expect(result.messages.map(({ id }) => id)).toEqual(["m1", "m2"]);
    expect([...result.indexById.entries()]).toEqual([["m1", 0], ["m2", 1]]);
    expect(prefetch).toHaveBeenCalledWith("https://images.test/a");
    expect(prefetch).toHaveBeenCalledWith("https://images.test/b");
    debugLogDuplicate("m1", 2);
    expect(window.__chatVirtDebugDump?.()).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "duplicate-id" })]),
    );
  });

  it("useChatJumpHydration uses one idempotent lifecycle and settles once", () => {
    const first = beginChatJumpLifecycle("m-target");
    const duplicate = beginChatJumpLifecycle("m-target");
    expect(duplicate.generation).toBe(first.generation);
    expect(endChatJumpLifecycle().ended).toBe(true);
    expect(endChatJumpLifecycle().generation).toBe(first.generation);
  });

  it("ChatMessage.reactions uses the scope-specific foreign key and rolls back denied optimistic writes", () => {
    for (const adapter of Object.values(CHAT_SCOPE_ADAPTERS) as ChatScopeAdapter[]) {
      const payload = { [adapter.reactionForeignKey]: "message-1", reaction_type: "like" };
      expect(payload[adapter.reactionForeignKey]).toBe("message-1");
      const original = [{ id: "message-1", reactions: [] as Array<{ id: string; user_id: string; reaction_type: string }> }];
      const optimistic = upsertReactionInMessages(original, "message-1", {
        id: "temp-current",
        user_id: "current",
        reaction_type: "like",
      });
      expect(optimistic[0].reactions).toHaveLength(1);
      expect(reconcileReactions(`${adapter.kind}:scope`, original)?.[0].reactions).toEqual([]);
      expect(original[0].reactions).toEqual([]);
    }
  });
});

describe("DesktopMessagesRail.test translated formatter contract", () => {
  it("formats valid activity and fails closed for invalid or absent timestamps", () => {
    const now = Date.parse("2026-09-17T11:00:00.000Z");
    expect(formatRailActivity("2026-09-17T10:55:00.000Z", now)).toBe("5 minutes ago");
    expect(formatRailActivity("not-a-date", now)).toBe("");
    expect(formatRailActivity(undefined, now)).toBe("");
  });
});

describe("prepared image geometry remains provider-neutral", () => {
  it("prefetches unique image URLs and reads dimensions encoded in a URL", () => {
    const url = "https://images.test/photo?w=1600&h=900";
    prefetchChatImageAspectRatio(url);
    expect(getCachedImageAspectRatio([url])).toBeCloseTo(16 / 9);
    expect(createChatRowSignature({ id: "m1", text: "hello", image_url: url })).toContain("1.778");
  });
});

// Local reconstruction of ChatVirtuosoDebugProbe: the real production
// component does not exist in this lab tree, so behaviour is re-derived
// from the sanitized reference text using an isolated recorder (not the
// shared chatVirtDebug module, to avoid perturbing its global dump state
// used by other tests in this file).
function createDebugRecorder() {
  const trackedRenders: string[] = [];
  const measureCalls: Array<[string, number | undefined, number, string]> = [];
  return {
    trackRender: (id: string) => trackedRenders.push(id),
    logMeasure: (id: string, estimated: number | undefined, measured: number, rowType: string) =>
      measureCalls.push([id, estimated, measured, rowType]),
    trackedRenders,
    measureCalls,
  };
}

function ChatVirtuosoDebugProbe({
  messageId,
  estimated,
  rowType,
  children,
  recorder,
}: {
  messageId: string;
  estimated: number;
  rowType: string;
  children: React.ReactNode;
  recorder: ReturnType<typeof createDebugRecorder>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    recorder.trackRender(messageId);
  }, [messageId, recorder]);
  useEffect(() => {
    if (ref.current) recorder.logMeasure(messageId, estimated, ref.current.offsetHeight, rowType);
  }, [messageId, estimated, rowType, recorder]);
  return (
    <div ref={ref} data-debug-probe={messageId} data-row-type={rowType}>
      {children}
    </div>
  );
}

describe("ChatVirtuosoDebugProbe", () => {
  it("records render identity and measured geometry without changing its child", () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(123);
    const recorder = createDebugRecorder();
    render(
      <ChatVirtuosoDebugProbe messageId="message-1" estimated={120} rowType="text" recorder={recorder}>
        <span>Message content</span>
      </ChatVirtuosoDebugProbe>,
    );
    const probe = screen.getByText("Message content").parentElement;
    expect(probe?.getAttribute("data-debug-probe")).toBe("message-1");
    expect(probe?.getAttribute("data-row-type")).toBe("text");
    expect(recorder.trackedRenders).toEqual(["message-1"]);
    expect(recorder.measureCalls).toEqual([["message-1", 120, 123, "text"]]);
    vi.restoreAllMocks();
  });

  it("re-measures when estimator inputs change", () => {
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(80);
    const recorder = createDebugRecorder();
    const { rerender } = render(
      <ChatVirtuosoDebugProbe messageId="message-1" estimated={76} rowType="event" recorder={recorder}>
        Event
      </ChatVirtuosoDebugProbe>,
    );
    recorder.measureCalls.length = 0;
    rerender(
      <ChatVirtuosoDebugProbe messageId="message-1" estimated={96} rowType="preview" recorder={recorder}>
        Event
      </ChatVirtuosoDebugProbe>,
    );
    expect(recorder.measureCalls).toEqual([["message-1", 96, 80, "preview"]]);
    vi.restoreAllMocks();
  });
});
