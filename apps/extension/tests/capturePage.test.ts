// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { isJsonLdType } from "@resonory/shared/html";
import { capturePage } from "../lib/capturePage";

// capturePage reads the live `document`, so each test writes the page it's about.
function page(head: string, body: string) {
  document.head.innerHTML = head;
  document.body.innerHTML = body;
}

/** The captured head and body, parsed back, to query what survived. */
function captured() {
  const { url, head, body } = capturePage();
  const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");
  return {
    url,
    head: parse(`<html>${head}</html>`).head,
    body: parse(`<html>${body}</html>`).body,
  };
}

beforeEach(() => page("", ""));

describe("capturePage", () => {
  it("captures the tab's URL, and its head and body as HTML", () => {
    page("<title>A long read</title>", "<p>Hello</p>");

    const { url, head, body } = capturePage();

    expect(url).toBe(location.href);
    expect(head).toBe("<head><title>A long read</title></head>");
    expect(body).toBe("<body><p>Hello</p></body>");
  });

  describe("the head", () => {
    // The worker's head parser reads JSON-LD by the shared isJsonLdType, so the
    // in-page copy must keep exactly the scripts it accepts.
    it.each([
      "application/ld+json",
      "Application/LD+JSON",
      "application/ld+json; charset=utf-8",
      "  application/ld+json  ",
      "application/json",
      "text/javascript",
      "module",
      "",
      null,
    ])("keeps a script typed %j exactly when isJsonLdType accepts it", (type) => {
      const typeAttribute = type === null ? "" : ` type="${type}"`;
      page(`<script${typeAttribute}>{"@type":"Article"}</script>`, "");

      expect(captured().head.querySelectorAll("script")).toHaveLength(isJsonLdType(type) ? 1 : 0);
    });

    it("drops styles, noscript and templates, and keeps what the worker reads", () => {
      page(
        `<title>A long read</title>
         <meta property="og:title" content="A long read">
         <link rel="canonical" href="https://example.com/a">
         <style>body { color: red }</style>
         <noscript><img src="/pixel.gif"></noscript>
         <template><p>Later</p></template>`,
        "",
      );

      const { head } = captured();

      expect(head.querySelector("title")?.textContent).toBe("A long read");
      expect(head.querySelector('meta[property="og:title"]')).not.toBeNull();
      expect(head.querySelector('link[rel="canonical"]')).not.toBeNull();
      expect(head.querySelector("style, noscript, template")).toBeNull();
    });
  });

  describe("the body", () => {
    it("drops scripts (JSON-LD too), styles, noscript, svg, iframes and templates, keeping its words", () => {
      page(
        "",
        `<p>The words</p>
         <script>track()</script>
         <script type="application/ld+json">{}</script>
         <style>p { margin: 0 }</style>
         <noscript>Enable JavaScript</noscript>
         <svg><path d="M0 0"></path></svg>
         <iframe src="https://ads.example.com"></iframe>
         <template><p>Later</p></template>`,
      );

      const { body } = captured();

      expect(body.querySelector("p")?.textContent).toBe("The words");
      expect(body.querySelector("script, style, noscript, svg, iframe, template")).toBeNull();
    });
  });

  describe("inline data: URIs", () => {
    it("drops a src, href or poster that starts with one, in any case", () => {
      page(
        '<link rel="icon" href="data:image/png;base64,AAAA">',
        '<img src="data:image/png;base64,AAAA"><video poster="DATA:image/png;base64,AAAA"></video>',
      );

      const { head, body } = captured();

      expect(head.querySelector("link")?.hasAttribute("href")).toBe(false);
      expect(body.querySelector("img")?.hasAttribute("src")).toBe(false);
      expect(body.querySelector("video")?.hasAttribute("poster")).toBe(false);
    });

    it("keeps a src, href or poster that only contains the text later on", () => {
      page(
        '<link rel="canonical" href="/big-data:intro">',
        '<img src="/charts/data:2026.png"><a href="https://example.com/data:x">Link</a>',
      );

      const { head, body } = captured();

      expect(head.querySelector("link")?.getAttribute("href")).toBe("/big-data:intro");
      expect(body.querySelector("img")?.getAttribute("src")).toBe("/charts/data:2026.png");
      expect(body.querySelector("a")?.getAttribute("href")).toBe("https://example.com/data:x");
    });

    it("drops a srcset or style holding one anywhere in its value", () => {
      page(
        "",
        `<img srcset="/a.png 1x, data:image/png;base64,AAAA 2x">
         <div style="color: red; background: url(data:image/png;base64,AAAA)"></div>`,
      );

      const { body } = captured();

      expect(body.querySelector("img")?.hasAttribute("srcset")).toBe(false);
      expect(body.querySelector("div")?.hasAttribute("style")).toBe(false);
    });
  });

  it("never modifies the live page", () => {
    page(
      '<style>p {}</style><link rel="icon" href="data:image/png;base64,AAAA">',
      '<script>track()</script><img src="data:image/png;base64,AAAA">',
    );
    const before = document.documentElement.outerHTML;

    capturePage();

    expect(document.documentElement.outerHTML).toBe(before);
  });
});
