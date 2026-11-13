import { describe, expect, it } from "vitest";
import { MAX_HTML_LENGTH } from "@resonory/shared/schemas/items";
import { capturedHtml } from "../lib/capturedHtml";

const URL = "https://example.com/article";
const HEAD = "<head><title>A long read</title></head>";
const WRAPPING = "<!doctype html><html></html>".length + HEAD.length;

describe("capturedHtml", () => {
  it("joins the head and the body into one document", () => {
    expect(capturedHtml({ url: URL, head: HEAD, body: "<body><p>Hi</p></body>" })).toBe(
      `<!doctype html><html>${HEAD}<body><p>Hi</p></body></html>`,
    );
  });

  it("keeps the body when the document is exactly at the cap", () => {
    const body = `<body>${"a".repeat(MAX_HTML_LENGTH - WRAPPING - "<body></body>".length)}</body>`;

    const html = capturedHtml({ url: URL, head: HEAD, body });

    expect(html).toHaveLength(MAX_HTML_LENGTH);
    expect(html).toContain(body);
  });

  it("falls back to the head alone, with an empty body, when the document is one character over", () => {
    const body = `<body>${"a".repeat(MAX_HTML_LENGTH - WRAPPING - "<body></body>".length + 1)}</body>`;

    expect(capturedHtml({ url: URL, head: HEAD, body })).toBe(
      `<!doctype html><html>${HEAD}<body></body></html>`,
    );
  });
});
