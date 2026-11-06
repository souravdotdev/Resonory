import { getStoredApiKey, setStoredApiKey } from "./apiKeyStorage";

/**
 * Renders the API-key form. Takes a duck-typed root (anything with an
 * assignable `innerHTML`) rather than reaching for `document` directly, so
 * this pure rendering logic can be unit-tested without a DOM environment.
 * Shared by the popup (first-run entry) and the options page (changing an
 * already-stored key, issue #154) — one definition, so the two surfaces
 * can't drift apart from each other.
 */
export function renderApiKeyForm(root: { innerHTML: string }): void {
  root.innerHTML = `
    <main>
      <img class="logo" src="/resonory-logo-extended.png" alt="Resonory" width="160" height="53" />
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

/**
 * Wires the form `renderApiKeyForm` just rendered into the real DOM:
 * pre-fills from whatever key is already stored, and saves on submit.
 * DOM-dependent and `chrome.storage`-dependent, so — like the rest of this
 * extension's `chrome.*` wiring — it's verified manually, not unit-tested
 * (#143's testing decision). Called once per page by each entrypoint that
 * renders the form (popup, options).
 */
export function wireApiKeyForm(): void {
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
      if (status) {
        status.textContent = "Enter an API key first.";
        status.className = "status-error";
      }
      return;
    }

    void setStoredApiKey(value).then(() => {
      if (status) {
        // Shown on both the popup and the options page (#154) — kept
        // surface-neutral rather than "close this popup", which would read
        // wrong on the options page's full tab.
        status.textContent = "Saved.";
        status.className = "status-success";
      }
    });
  });
}
