import { getStoredApiKey, setStoredApiKey } from "../../lib/apiKeyStorage";

// Renders the API-key form. `renderPopup` takes a duck-typed root (anything
// with an assignable `innerHTML`) rather than reaching for `document`
// directly, so this pure rendering logic can be unit-tested without a DOM
// environment. Once a key is stored, the background script clears the
// toolbar popup (`lib/actionPopup.ts`) so this form is only ever seen before
// one exists.
export function renderPopup(root: { innerHTML: string }): void {
  root.innerHTML = `
    <main>
      <img class="logo" src="/resonory-logo.png" alt="Resonory" width="32" height="32" />
      <p>Paste your API key to start saving pages.</p>
      <form id="api-key-form">
        <label for="api-key-input">API key</label>
        <input id="api-key-input" type="password" autocomplete="off" />
        <button type="submit">Save</button>
      </form>
      <p id="api-key-status" role="status"></p>
    </main>
  `;
}

// Guarded so this module can be imported under Vitest's node environment (no
// `document` global) to unit-test `renderPopup` in isolation. Everything
// below is the DOM-dependent wiring: reading/writing the stored key via
// `chrome.storage.local`, never itself unit-tested (manual QA, per #143's
// testing decisions — only the payload-assembly function needs coverage).
if (typeof document !== "undefined") {
  const root = document.getElementById("app");
  if (root) {
    renderPopup(root);

    const form = document.getElementById("api-key-form") as HTMLFormElement | null;
    const input = document.getElementById("api-key-input") as HTMLInputElement | null;
    const status = document.getElementById("api-key-status");

    void getStoredApiKey().then((apiKey) => {
      if (apiKey && input) input.value = apiKey;
    });

    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = input?.value.trim() ?? "";

      if (!value) {
        if (status) status.textContent = "Enter an API key first.";
        return;
      }

      void setStoredApiKey(value).then(() => {
        if (status) status.textContent = "Saved. You can close this popup.";
      });
    });
  }
}
