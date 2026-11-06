import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/apiKeyStorage", () => ({
  getStoredApiKey: vi.fn().mockResolvedValue(undefined),
  setStoredApiKey: vi.fn().mockResolvedValue(undefined),
}));

import { renderPopup } from "../entrypoints/popup/main";

describe("popup entrypoint", () => {
  it("renders Resonory branding into the given root", () => {
    const root = { innerHTML: "" };

    renderPopup(root);

    expect(root.innerHTML).toContain("Resonory");
  });

  it("renders an API-key form, independent of any DOM or chrome.* API", () => {
    const root = { innerHTML: "" };

    renderPopup(root);

    expect(root.innerHTML).toContain('id="api-key-form"');
    expect(root.innerHTML).toContain('id="api-key-input"');
  });
});
