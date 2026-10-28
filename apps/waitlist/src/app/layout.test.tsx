import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import RootLayout, { metadata } from "./layout";
import { SiteNav } from "./site-nav";

// next/font only works inside the Next compiler.
vi.mock("geist/font/sans", () => ({ GeistSans: { variable: "font-geist-sans" } }));
vi.mock("geist/font/mono", () => ({ GeistMono: { variable: "font-geist-mono" } }));

describe("site metadata", () => {
  it("titles the page with the headline and makes it indexable", () => {
    expect(metadata.title).toBe("Resonory · You saved it. Resonory brings it back.");
    expect(String(metadata.metadataBase)).toBe("https://resonory.com/");
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });

  it("gives social previews the same title and description", () => {
    expect(metadata.openGraph).toMatchObject({
      title: "Resonory · You saved it. Resonory brings it back.",
      description: metadata.description,
      url: "/",
      siteName: "Resonory",
      type: "website",
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Resonory · You saved it. Resonory brings it back.",
      description: metadata.description,
    });
  });
});

describe("root layout", () => {
  it("makes a skip to content link the first thing keyboard focus reaches", () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <SiteNav />
        <main id="main">Hero</main>
      </RootLayout>,
    );
    const doc = new DOMParser().parseFromString(html, "text/html");

    const firstFocusable = doc.body.querySelector("a[href], button, input, [tabindex]");
    expect(firstFocusable?.textContent).toBe("Skip to content");
    expect(firstFocusable?.getAttribute("href")).toBe("#main");
  });
});
