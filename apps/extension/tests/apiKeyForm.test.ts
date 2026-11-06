import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/apiKeyStorage", () => ({
  getStoredApiKey: vi.fn().mockResolvedValue(undefined),
  setStoredApiKey: vi.fn().mockResolvedValue(undefined),
}));

import { renderApiKeyForm } from "../lib/apiKeyForm";

// The one seam both the popup and the options page (issue #154) share: this
// pure render function, independent of any DOM or chrome.* API. Neither
// entrypoint's own chrome.*-dependent wiring is separately unit-tested
// (#143's testing decision) — covering it once here is enough for both.
describe("apiKeyForm", () => {
  it("renders Resonory branding into the given root", () => {
    const root = { innerHTML: "" };

    renderApiKeyForm(root);

    expect(root.innerHTML).toContain("Resonory");
  });

  it("renders an API-key form, independent of any DOM or chrome.* API", () => {
    const root = { innerHTML: "" };

    renderApiKeyForm(root);

    expect(root.innerHTML).toContain('id="api-key-form"');
    expect(root.innerHTML).toContain('id="api-key-input"');
  });
});
