import type { CapturedPage } from "./createItemRequest";

/**
 * Injected into the active tab via `chrome.scripting.executeScript` on a
 * toolbar-icon click (the `activeTab` grant makes this momentary access
 * possible with no broad host permission). Runs in the page's own context,
 * so it must be self-contained — no closures over anything outside itself —
 * and reads straight off `document`/`location`. Not unit-tested: it's pure
 * DOM reading, verified manually per #140/#143's testing decisions.
 *
 * Captures `document.head` only, not the full document: the worker's
 * `HtmlPageParser` trims any captured HTML down to its head before parsing
 * (`htmlHeadOf`, the same cutoff a live fetch's capped body read uses) — the
 * body is never read for title/description/thumbnail extraction. Sending it
 * anyway is pure waste, and on a heavy page (YouTube's inline player state,
 * for instance) can be large enough to blow past the API's request-body
 * limit for no benefit.
 */
export function capturePage(): CapturedPage {
  return {
    url: location.href,
    html: document.head.outerHTML,
  };
}
