import { describe, expect, it } from "vitest";
import { canonicalUrl } from "@/domain/rules/canonicalUrl";

describe("canonicalUrl", () => {
  it.each([
    // Tracking params stripped; everything else about the query preserved as-is
    ["https://example.com/page?utm_source=twitter&utm_medium=social", "https://example.com/page"],
    ["https://example.com/page?utm_campaign=launch", "https://example.com/page"],
    ["https://example.com/page?fbclid=abc123", "https://example.com/page"],
    ["https://example.com/page?gclid=abc123", "https://example.com/page"],
    ["https://example.com/page?igshid=abc123", "https://example.com/page"],
    ["https://example.com/page?mc_cid=abc&mc_eid=def", "https://example.com/page"],
    [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=xyz",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    ],
    // A real query param's case survives; only the stripped tracking param goes
    ["https://example.com/search?q=Hello&utm_source=x", "https://example.com/search?q=Hello"],
    // Fragment stripped
    ["https://example.com/page#section-2", "https://example.com/page"],
    // Trailing slash stripped, except the bare root
    ["https://example.com/page/", "https://example.com/page"],
    ["https://example.com/", "https://example.com/"],
    ["https://example.com", "https://example.com/"],
    // Host lowercased; the path's own case is left alone
    ["https://EXAMPLE.com/Page", "https://example.com/Page"],
  ])("normalizes %s to %s", (raw, expected) => {
    expect(canonicalUrl(raw)).toBe(expected);
  });

  it("normalizes two differently-decorated links to the same page identically", () => {
    const a = canonicalUrl("https://EXAMPLE.com/page/?utm_source=twitter#top");
    const b = canonicalUrl("https://example.com/page?fbclid=xyz");

    expect(a).toBe(b);
  });

  it("returns null for an unparseable value", () => {
    expect(canonicalUrl("not a url")).toBeNull();
  });
});
