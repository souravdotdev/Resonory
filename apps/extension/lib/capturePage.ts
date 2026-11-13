import type { CapturedDocument } from "./capturedHtml";

/**
 * Injected into the active tab via `chrome.scripting.executeScript` on a
 * toolbar-icon click (the `activeTab` grant makes this momentary access
 * possible with no broad host permission). Runs in the page's own context,
 * so it must be self-contained — no closures over anything outside itself —
 * and reads straight off `document`/`location`. Not unit-tested: it's pure
 * DOM reading, verified manually per #140/#143's testing decisions.
 *
 * Captures `document.head` plus a clone of `document.body`: the worker reads
 * the head for the title, description and Thumbnail, and the body for the
 * Item's Text (its main content, extracted there). Only the clone is
 * stripped of what never holds readable words (scripts, styles, `noscript`,
 * `svg`, `iframe`, `template`, and inline `data:` URIs, such as an image
 * embedded in its `src`), so the live page is never modified, and those are
 * what make a heavy page's capture large (YouTube's inline player state, for
 * instance). `capturedHtml` joins the two, falling back to the head alone
 * when they're over the create-Item schema's cap.
 */
export function capturePage(): CapturedDocument {
  const body = document.body.cloneNode(true) as HTMLElement;
  for (const element of body.querySelectorAll("script, style, noscript, svg, iframe, template")) {
    element.remove();
  }
  for (const name of ["src", "srcset", "href", "poster", "style"]) {
    for (const element of body.querySelectorAll(`[${name}*="data:"]`)) {
      element.removeAttribute(name);
    }
  }
  return { url: location.href, head: document.head.outerHTML, body: body.outerHTML };
}
