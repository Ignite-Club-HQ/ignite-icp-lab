import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ChatHeaderShell } from "./ChatHeaderShell";

function renderHeader() {
  return render(
    <MemoryRouter>
      <ChatHeaderShell
        type="team"
        name="Riverside"
        leftSlot={<button type="button">Filter threads</button>}
        rightSlot={<button type="button">Menu action</button>}
        onOpenDetails={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe("ChatHeaderShell slot composition", () => {
  it("keeps page-owned left and right slots around the shared header chrome", () => {
    renderHeader();
    const filter = screen.getByRole("button", { name: "Filter threads" });
    const back = screen.getByRole("button", { name: "Back to Messages" });
    const title = screen.getByRole("button", { name: "Open chat details for Riverside" });
    const menu = screen.getByRole("button", { name: "Menu action" });

    expect(filter.compareDocumentPosition(back) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(back.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(title.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("preserves the interactive detail affordance without owning page actions", () => {
    renderHeader();
    const details = screen.getByRole("button", { name: "Open chat details for Riverside" });
    expect(details).toHaveTextContent("Riverside");
    expect(screen.getByRole("button", { name: "Menu action" })).toBeInTheDocument();
  });
});
