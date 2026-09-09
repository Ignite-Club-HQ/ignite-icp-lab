import { describe, it, expect } from "vitest";
import { parseRecipients, looksLikeMultiRecipient } from "./recipientParser";

describe("recipientParser — supported formats", () => {
  it("parses a bare email", () => {
    expect(parseRecipients("redacted@example.invalid")).toEqual([{ name: "alice", email: "redacted@example.invalid" }]);
  });

  it("parses name-only", () => {
    expect(parseRecipients("Alice Smith")).toEqual([{ name: "Alice Smith", email: "" }]);
  });

  it("parses Name <email>", () => {
    expect(parseRecipients("Alice Smith <redacted@example.invalid>")).toEqual([
      { name: "Alice Smith", email: "redacted@example.invalid" },
    ]);
  });

  it("parses `Name, email` as one entry when it's the only recipient", () => {
    expect(parseRecipients("Alice Smith, redacted@example.invalid")).toEqual([
      { name: "Alice Smith", email: "redacted@example.invalid" },
    ]);
  });

  it("splits on newline / tab / semicolon", () => {
    expect(parseRecipients("redacted@example.invalid\redacted@example.invalid\redacted@example.invalid;redacted@example.invalid")).toEqual([
      { name: "a", email: "redacted@example.invalid" },
      { name: "b", email: "redacted@example.invalid" },
      { name: "c", email: "redacted@example.invalid" },
      { name: "d", email: "redacted@example.invalid" },
    ]);
  });

  it("splits on commas when multiple emails are present", () => {
    expect(parseRecipients("redacted@example.invalid, redacted@example.invalid")).toEqual([
      { name: "a", email: "redacted@example.invalid" },
      { name: "b", email: "redacted@example.invalid" },
    ]);
  });

  it("dedupes case-insensitively", () => {
    expect(parseRecipients("redacted@example.invalid\redacted@example.invalid")).toEqual([{ name: "A", email: "redacted@example.invalid" }]);
  });
});

describe("recipientParser — hardened rejections", () => {
  it("rejects `Alex <redacted@example.invalid extra>` (extra tokens in bracket body)", () => {
    expect(parseRecipients("Alex <redacted@example.invalid extra>")).toEqual([]);
  });

  it("rejects `Alex <redacted@example.invalid><redacted@example.invalid>` (multiple brackets)", () => {
    expect(parseRecipients("Alex <redacted@example.invalid><redacted@example.invalid>")).toEqual([]);
  });

  it("rejects unmatched opening bracket", () => {
    expect(parseRecipients("Alex <redacted@example.invalid")).toEqual([]);
  });

  it("rejects unmatched closing bracket", () => {
    expect(parseRecipients("Alex redacted@example.invalid>")).toEqual([]);
  });

  it("rejects nested brackets", () => {
    expect(parseRecipients("Alex <<redacted@example.invalid>>")).toEqual([]);
  });

  it("rejects content after the closing bracket", () => {
    expect(parseRecipients("Alex <redacted@example.invalid> redacted@example.invalid")).toEqual([]);
  });

  it("rejects a name-only entry that contains @-noise", () => {
    expect(parseRecipients("Alex @broken")).toEqual([]);
  });

  it("rejects an ambiguous un-splittable entry containing two emails", () => {
    // No list separators (comma/semicolon/newline/tab) → one entry with two
    // emails. Ambiguous — must be rejected so we never silently graft the
    // name onto an attacker-controlled second address.
    expect(parseRecipients("Alex redacted@example.invalid redacted@example.invalid")).toEqual([]);
  });
});

describe("looksLikeMultiRecipient", () => {
  it("returns true for newline-separated pairs", () => {
    expect(looksLikeMultiRecipient("redacted@example.invalid\redacted@example.invalid")).toBe(true);
  });
  it("returns true for two bare emails", () => {
    expect(looksLikeMultiRecipient("redacted@example.invalid, redacted@example.invalid")).toBe(true);
  });
  it("returns false for a single Name <email>", () => {
    expect(looksLikeMultiRecipient("Alice <redacted@example.invalid>")).toBe(false);
  });
});
