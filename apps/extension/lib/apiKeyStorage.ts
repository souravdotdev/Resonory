import { browser } from "wxt/browser";

// `chrome.storage.local`, never `.sync` — a credential shouldn't silently
// propagate across a User's devices via Google account sync (spec #143/#146).
const API_KEY_STORAGE_KEY = "resonory_api_key";

/** The stored API key, or `undefined` if none has been saved yet. */
export async function getStoredApiKey(): Promise<string | undefined> {
  const stored = await browser.storage.local.get(API_KEY_STORAGE_KEY);
  const value = stored[API_KEY_STORAGE_KEY];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Persists the API key the User pasted into the popup. */
export async function setStoredApiKey(apiKey: string): Promise<void> {
  await browser.storage.local.set({ [API_KEY_STORAGE_KEY]: apiKey });
}

/** Fires whenever the stored API key changes (set, cleared, or wiped elsewhere). */
export function onStoredApiKeyChanged(listener: () => void): void {
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && API_KEY_STORAGE_KEY in changes) {
      listener();
    }
  });
}
