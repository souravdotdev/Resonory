import { describe, expect, it } from "vitest";
import { HtmlPageParser } from "@/infrastructure/http/HtmlPageParser";

const PAGE_URL = "https://example.com/page";

describe("HtmlPageParser", () => {
  it("reads meta tags, the title and JSON-LD from a full HTML document", () => {
    const html = `
      <!doctype html>
      <html>
        <head>
          <title>A page</title>
          <meta property="og:title" content="The real title">
          <meta property="og:description" content="What it's about">
          <script type="application/ld+json">{"@type": "Article"}</script>
        </head>
        <body>Ignored: this isn't a tag reader for the whole document.</body>
      </html>
    `;

    const head = new HtmlPageParser().parseHead(html, PAGE_URL);

    expect(head.title).toBe("A page");
    expect(head.meta).toEqual([
      { key: "og:title", content: "The real title" },
      { key: "og:description", content: "What it's about" },
    ]);
    expect(head.jsonLd).toEqual([{ "@type": "Article" }]);
  });

  it("stops reading at </head>, so a body never contaminates the extracted tags", () => {
    const html = `<html><head><title>Head title</title></head><body>
      <meta property="og:title" content="Body meta, must be ignored">
    </body></html>`;

    const head = new HtmlPageParser().parseHead(html, PAGE_URL);

    expect(head.title).toBe("Head title");
    expect(head.meta).toEqual([]);
  });

  it("makes oEmbed discovery links absolute against the given page URL", () => {
    const html = `<head><link rel="alternate" type="application/json+oembed" href="/oembed?url=x"></head>`;

    const head = new HtmlPageParser().parseHead(html, PAGE_URL);

    expect(head.oEmbedLinks).toEqual([{ url: "https://example.com/oembed?url=x", format: "json" }]);
  });
});
