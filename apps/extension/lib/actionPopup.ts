import { browser } from "wxt/browser";
import { getStoredApiKey, onStoredApiKeyChanged } from "./apiKeyStorage";

/**
 * A default popup and `chrome.action.onClicked` are mutually exclusive: Chrome
 * only fires `onClicked` when no popup is set for the action. This extension
 * needs both surfaces — the popup to take the API key, direct click-to-save
 * once one exists — so the popup is toggled at runtime instead of fixed at
 * build time: no key yet → click opens the popup to collect one; a key is
 * stored → the popup is cleared so a click instead fires `onClicked` and
 * saves the page (#143/#146).
 */
export function popupPathFor(hasApiKey: boolean, popupUrl: string): string {
  return hasApiKey ? "" : popupUrl;
}

async function syncActionPopup(): Promise<void> {
  const apiKey = await getStoredApiKey();
  const popup = popupPathFor(Boolean(apiKey), browser.runtime.getURL("/popup.html"));
  await browser.action.setPopup({ popup });
}

/** Keeps the toolbar popup in sync with whether an API key is stored. Call once on background startup. */
export function watchActionPopup(): void {
  void syncActionPopup();
  onStoredApiKeyChanged(() => void syncActionPopup());
}
