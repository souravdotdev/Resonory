import { describe, expect, it } from "vitest";
import { thumbnailKeyOf } from "@/domain/rules/thumbnailKey";

describe("thumbnailKeyOf", () => {
  it("is the same key for the same canonical URL", () => {
    const url = "https://example.com/page";

    expect(thumbnailKeyOf(url)).toBe(thumbnailKeyOf(url));
  });

  it("is a different key for a different canonical URL", () => {
    expect(thumbnailKeyOf("https://example.com/a")).not.toBe(
      thumbnailKeyOf("https://example.com/b"),
    );
  });

  it("is a .webp path under a shared prefix, not under any Item or User", () => {
    const key = thumbnailKeyOf("https://example.com/page");

    expect(key).toMatch(/^shared\/[0-9a-f]{64}\.webp$/);
  });
});
