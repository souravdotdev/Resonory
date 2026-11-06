import { describe, expect, it } from "vitest";
import { CreateItemSchema, MAX_HTML_LENGTH } from "./index";

describe("CreateItemSchema", () => {
  it.each(["https://example.com/article", "http://example.com/article"])("accepts %s", (url) => {
    expect(CreateItemSchema.parse({ url })).toEqual({ url });
  });

  it("trims leading and trailing spaces from the link", () => {
    expect(CreateItemSchema.parse({ url: "  https://example.com/a  " })).toEqual({
      url: "https://example.com/a",
    });
  });

  it.each(["ftp://example.com/file", "javascript:alert(1)", "mailto:me@example.com"])(
    "rejects the non-http(s) link %s",
    (url) => {
      expect(CreateItemSchema.safeParse({ url }).success).toBe(false);
    },
  );

  it.each(["not a url", "", "https://"])("rejects the malformed link %j", (url) => {
    expect(CreateItemSchema.safeParse({ url }).success).toBe(false);
  });

  it("accepts a link of exactly 2048 characters and rejects one of 2049", () => {
    const base = "https://example.com/";
    const atLimit = base + "a".repeat(2048 - base.length);

    expect(CreateItemSchema.safeParse({ url: atLimit }).success).toBe(true);
    expect(CreateItemSchema.safeParse({ url: atLimit + "a" }).success).toBe(false);
  });

  it("accepts a URL with captured page content alongside it", () => {
    const html = "<!doctype html><html><head><title>A page</title></head></html>";

    expect(CreateItemSchema.parse({ url: "https://example.com/a", html })).toEqual({
      url: "https://example.com/a",
      html,
    });
  });

  it("leaves html undefined when the caller sends only a URL, same as today", () => {
    const parsed = CreateItemSchema.parse({ url: "https://example.com/a" });

    expect(parsed).toEqual({ url: "https://example.com/a" });
    expect(parsed.html).toBeUndefined();
  });

  it(`accepts html of exactly ${MAX_HTML_LENGTH} characters and rejects one character more`, () => {
    const atLimit = "a".repeat(MAX_HTML_LENGTH);

    expect(
      CreateItemSchema.safeParse({ url: "https://example.com/a", html: atLimit }).success,
    ).toBe(true);
    expect(
      CreateItemSchema.safeParse({ url: "https://example.com/a", html: atLimit + "a" }).success,
    ).toBe(false);
  });
});
