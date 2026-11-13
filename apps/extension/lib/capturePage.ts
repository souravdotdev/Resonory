import type { CapturedDocument } from "./capturedHtml";

/**
 * Injected into the active tab via `chrome.scripting.executeScript` on a
 * toolbar-icon click (the `activeTab` grant makes this momentary access
 * possible with no broad host permission). Runs in the page's own context,
 * so it must be self-contained — no closures over anything outside itself —
 * and reads straight off `document`/`location`. Not unit-tested: it's pure
 * DOM reading, verified manually per #140/#143's testing decisions.
 *
 * Captures clones of `document.head` and `document.body`: the worker reads
 * the head for the title, description and Thumbnail (its `meta`, `link`,
 * `title` and JSON-LD), and the body for the Item's Text (its main content,
 * extracted there). Only the clones are stripped, so the live page is never
 * modified. The body loses what never holds readable words (scripts, styles,
 * `noscript`, `svg`, `iframe`, `template`), the head its styles, `noscript`,
 * `template` and every script but JSON-LD, and both their inline `data:` URIs
 * (an image or favicon embedded in its `src` or `href`): those are what make a
 * heavy page's capture large (YouTube's inline player state, for instance).
 * `capturedHtml` joins the two, falling back to the head alone when they're
 * over the create-Item schema's cap.
 */
export function capturePage(): CapturedDocument {
  // Matched like the worker's head parser: the type's media type, any case.
  const isJsonLd = (element: Element) =>
    element.tagName === "SCRIPT" &&
    element.getAttribute("type")?.split(";")[0]?.trim().toLowerCase() === "application/ld+json";
  const stripped = (source: HTMLElement, selector: string, keep = (_: Element) => false) => {
    const clone = source.cloneNode(true) as HTMLElement;
    for (const element of clone.querySelectorAll(selector)) {
      if (!keep(element)) element.remove();
    }
    for (const name of ["src", "srcset", "href", "poster", "style"]) {
      for (const element of clone.querySelectorAll(`[${name}*="data:"]`)) {
        element.removeAttribute(name);
      }
    }
    return clone.outerHTML;
  };
  return {
    url: location.href,
    head: stripped(document.head, "script, style, noscript, template", isJsonLd),
    body: stripped(document.body, "script, style, noscript, svg, iframe, template"),
  };
}
