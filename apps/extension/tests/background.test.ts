import { beforeEach, describe, expect, it, vi } from "vitest";

let onClickedListener: ((tab: { id?: number }) => void) | undefined;

const { browserMock } = vi.hoisted(() => ({
  browserMock: {
    action: {
      onClicked: {
        addListener: vi.fn(),
      },
      setPopup: vi.fn().mockResolvedValue(undefined),
      setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
      setBadgeText: vi.fn().mockResolvedValue(undefined),
    },
    runtime: {
      getURL: vi.fn((path: string) => `chrome-extension://test-id${path}`),
    },
    storage: {
      local: {
        get: vi.fn().mockResolvedValue({}),
        set: vi.fn().mockResolvedValue(undefined),
      },
      onChanged: {
        addListener: vi.fn(),
      },
    },
    scripting: {
      executeScript: vi.fn(),
    },
  },
}));

browserMock.action.onClicked.addListener.mockImplementation(
  (listener: (tab: { id?: number }) => void) => {
    onClickedListener = listener;
  },
);

vi.mock("wxt/browser", () => ({ browser: browserMock }));

describe("background entrypoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onClickedListener = undefined;
  });

  it("exists and exports a defined background definition", async () => {
    const background = await import("../entrypoints/background");

    expect(background.default).toBeDefined();
  });

  it("logs on load, syncs the action popup, and registers an onClicked listener", async () => {
    const background = await import("../entrypoints/background");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    background.default.main?.();
    await Promise.resolve();

    expect(logSpy).toHaveBeenCalled();
    expect(browserMock.action.onClicked.addListener).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("shows a failure badge when no tab id is available", async () => {
    const background = await import("../entrypoints/background");
    background.default.main?.();

    onClickedListener?.({});
    await vi.waitFor(() => {
      expect(browserMock.action.setBadgeText).toHaveBeenCalledWith({ text: "!" });
    });
  });

  it("shows a failure badge when no API key is stored", async () => {
    browserMock.storage.local.get.mockResolvedValue({});
    const background = await import("../entrypoints/background");
    background.default.main?.();

    onClickedListener?.({ id: 1 });
    await vi.waitFor(() => {
      expect(browserMock.action.setBadgeText).toHaveBeenCalledWith({ text: "!" });
    });
    expect(browserMock.scripting.executeScript).not.toHaveBeenCalled();
  });

  it("captures the tab, posts it with the stored key, and shows a success badge", async () => {
    browserMock.storage.local.get.mockResolvedValue({ resonory_api_key: "key_abc123" });
    browserMock.scripting.executeScript.mockResolvedValue([
      { result: { url: "https://example.com", html: "<html></html>" } },
    ]);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const background = await import("../entrypoints/background");
    background.default.main?.();

    onClickedListener?.({ id: 7 });
    await vi.waitFor(() => {
      expect(browserMock.action.setBadgeText).toHaveBeenCalledWith({ text: "✓" });
    });

    expect(browserMock.scripting.executeScript).toHaveBeenCalledWith(
      expect.objectContaining({ target: { tabId: 7 } }),
    );
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("key_abc123");
    expect(JSON.parse(init.body as string)).toEqual({
      url: "https://example.com",
      html: "<html></html>",
    });

    vi.unstubAllGlobals();
  });

  it("shows a failure badge when the API rejects the request", async () => {
    browserMock.storage.local.get.mockResolvedValue({ resonory_api_key: "bad-key" });
    browserMock.scripting.executeScript.mockResolvedValue([
      { result: { url: "https://example.com", html: "<html></html>" } },
    ]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    const background = await import("../entrypoints/background");
    background.default.main?.();

    onClickedListener?.({ id: 7 });
    await vi.waitFor(() => {
      expect(browserMock.action.setBadgeText).toHaveBeenCalledWith({ text: "!" });
    });

    vi.unstubAllGlobals();
  });
});
