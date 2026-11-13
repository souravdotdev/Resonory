import { describe, expect, it } from "vitest";
import { CreateItemSchema, MAX_CAPTIONS_LENGTH, MAX_HTML_LENGTH } from "./index";

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

  it("caps html at 5 Mi characters, so a captured body and head fit", () => {
    expect(MAX_HTML_LENGTH).toBe(5 * 1024 * 1024);
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

  it("accepts a video's captions alongside the URL and captured page content", () => {
    const input = {
      url: "https://www.youtube.com/watch?v=abc",
      html: "<html></html>",
      captions: "Hello and welcome to the show.",
    };

    expect(CreateItemSchema.parse(input)).toEqual(input);
  });

  it("leaves captions undefined when the caller sends none, same as today", () => {
    expect(CreateItemSchema.parse({ url: "https://example.com/a" }).captions).toBeUndefined();
  });

  it("caps captions at 1 Mi characters", () => {
    expect(MAX_CAPTIONS_LENGTH).toBe(1024 * 1024);
  });

  it(`accepts captions of exactly ${MAX_CAPTIONS_LENGTH} characters and rejects one character more`, () => {
    const atLimit = "a".repeat(MAX_CAPTIONS_LENGTH);

    expect(
      CreateItemSchema.safeParse({ url: "https://example.com/a", captions: atLimit }).success,
    ).toBe(true);
    expect(
      CreateItemSchema.safeParse({ url: "https://example.com/a", captions: atLimit + "a" }).success,
    ).toBe(false);
  });
});
