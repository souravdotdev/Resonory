import { defineBackground } from "wxt/utils/define-background";
import { browser } from "wxt/browser";
import { watchActionPopup } from "../lib/actionPopup";
import { getStoredApiKey } from "../lib/apiKeyStorage";
import { showFailureBadge, showSuccessBadge } from "../lib/badge";
import { captureCaptions } from "../lib/captureCaptions";
import { capturedHtml, type CapturedDocument } from "../lib/capturedHtml";
import { capturePage } from "../lib/capturePage";
import { buildCreateItemRequest } from "../lib/createItemRequest";
import { API_BASE_URL } from "../lib/config";

/**
 * A toolbar-icon click only reaches here once an API key is stored (see
 * `lib/actionPopup.ts`) — otherwise the click opens the popup instead, to
 * collect one. Captures the active tab via a one-shot `activeTab`-scoped
 * injection (plus, on a YouTube video, its captions from the page's own
 * world), then POSTs it to the create-Item endpoint, with a badge change as
 * the only feedback (no notifications permission needed).
 */
async function saveActiveTab(tab: { id?: number }): Promise<void> {
  if (!tab.id) {
    await showFailureBadge();
    return;
  }

  const apiKey = await getStoredApiKey();
  if (!apiKey) {
    await showFailureBadge();
    return;
  }

  try {
    const [injection] = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: capturePage,
    });
    const captured = injection?.result as CapturedDocument | undefined;
    if (!captured) {
      await showFailureBadge();
      return;
    }

    // Never throws: a caption failure just means no captions.
    const captions = await captureCaptions(tab.id, captured.url);
    const request = buildCreateItemRequest(
      { url: captured.url, html: capturedHtml(captured), captions },
      apiKey,
    );
    const response = await fetch(`${API_BASE_URL}/items`, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    if (!response.ok) {
      await showFailureBadge();
      return;
    }

    await showSuccessBadge();
  } catch {
    await showFailureBadge();
  }
}

export default defineBackground(() => {
  console.log("Resonory background service worker loaded");

  watchActionPopup();
  browser.action.onClicked.addListener((tab) => void saveActiveTab(tab));
});
