import { beforeEach, describe, expect, it, vi } from "vitest";

const { storageLocal, onChangedListeners } = vi.hoisted(() => ({
  storageLocal: { get: vi.fn(), set: vi.fn() },
  onChangedListeners: [] as Array<(changes: unknown, areaName: string) => void>,
}));

vi.mock("wxt/browser", () => ({
  browser: {
    storage: {
      local: storageLocal,
      onChanged: {
        addListener: (listener: (changes: unknown, areaName: string) => void) => {
          onChangedListeners.push(listener);
        },
      },
    },
  },
}));

import { getStoredApiKey, onStoredApiKeyChanged, setStoredApiKey } from "../lib/apiKeyStorage";

describe("apiKeyStorage", () => {
  beforeEach(() => {
    storageLocal.get.mockReset();
    storageLocal.set.mockReset();
    onChangedListeners.length = 0;
  });

  it("returns undefined when no key has been stored", async () => {
    storageLocal.get.mockResolvedValue({});

    await expect(getStoredApiKey()).resolves.toBeUndefined();
  });

  it("returns the stored key", async () => {
    storageLocal.get.mockResolvedValue({ resonory_api_key: "key_abc123" });

    await expect(getStoredApiKey()).resolves.toBe("key_abc123");
  });

  it("persists the key in chrome.storage.local (never .sync)", async () => {
    storageLocal.set.mockResolvedValue(undefined);

    await setStoredApiKey("key_abc123");

    expect(storageLocal.set).toHaveBeenCalledWith({ resonory_api_key: "key_abc123" });
  });

  it("notifies listeners only when the api key entry itself changes in the local area", () => {
    const listener = vi.fn();
    onStoredApiKeyChanged(listener);

    const [registered] = onChangedListeners;
    registered?.({ resonory_api_key: { newValue: "key_abc123" } }, "local");
    registered?.({ some_other_key: { newValue: "x" } }, "local");
    registered?.({ resonory_api_key: { newValue: "key_xyz" } }, "sync");

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
