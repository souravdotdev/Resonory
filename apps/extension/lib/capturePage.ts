import type { CapturedPage } from "./createItemRequest";

/**
 * Injected into the active tab via `chrome.scripting.executeScript` on a
 * toolbar-icon click (the `activeTab` grant makes this momentary access
 * possible with no broad host permission). Runs in the page's own context,
 * so it must be self-contained — no closures over anything outside itself —
 * and reads straight off `document`/`location`. Not unit-tested: it's pure
 * DOM reading, verified manually per #140/#143's testing decisions.
 */
export function capturePage(): CapturedPage {
  return {
    url: location.href,
    html: document.documentElement.outerHTML,
  };
}
