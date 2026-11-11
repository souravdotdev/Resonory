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

  describe("on a YouTube video", () => {
    const VIDEO_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const page = { url: VIDEO_URL, html: "<html></html>" };
    const playerCaptions = {
      videoId: "dQw4w9WgXcQ",
      language: "en",
      tracks: [
        {
          baseUrl: "https://www.youtube.com/api/timedtext?v=dQw4w9WgXcQ&lang=en",
          languageCode: "en",
        },
      ],
    };
    const json3 = JSON.stringify({
      events: [{ segs: [{ utf8: "Never gonna give you up" }] }],
    });

    /** Answers each injection in turn: the page capture, then the main-world ones. */
    const injectionsAnswering = (...results: unknown[]) => {
      for (const result of results) {
        browserMock.scripting.executeScript.mockResolvedValueOnce([{ result }]);
      }
    };

    const saveTab = async () => {
      browserMock.storage.local.get.mockResolvedValue({ resonory_api_key: "key_abc123" });
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", fetchMock);
      const background = await import("../entrypoints/background");
      background.default.main?.();

      onClickedListener?.({ id: 7 });
      await vi.waitFor(() => {
        expect(browserMock.action.setBadgeText).toHaveBeenCalledWith({ text: "✓" });
      });
      vi.unstubAllGlobals();
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      return JSON.parse(init.body as string);
    };

    it("reads the live player's captions in the page's own world and sends them", async () => {
      injectionsAnswering(page, playerCaptions, json3);

      const body = await saveTab();

      expect(body).toEqual({ ...page, captions: "Never gonna give you up" });
      expect(browserMock.scripting.executeScript).toHaveBeenCalledWith(
        expect.objectContaining({ target: { tabId: 7 }, world: "MAIN" }),
      );
      expect(browserMock.scripting.executeScript).toHaveBeenLastCalledWith(
        expect.objectContaining({
          world: "MAIN",
          args: ["https://www.youtube.com/api/timedtext?v=dQw4w9WgXcQ&lang=en&fmt=json3"],
        }),
      );
    });

    it("saves without captions when the player is on another video (stale after in-app navigation)", async () => {
      injectionsAnswering(page, { ...playerCaptions, videoId: "someOtherId" });

      const body = await saveTab();

      expect(body).toEqual(page);
      expect(browserMock.scripting.executeScript).toHaveBeenCalledTimes(2);
    });

    it("saves without captions for a video that has none", async () => {
      injectionsAnswering(page, null);

      expect(await saveTab()).toEqual(page);
    });

    it("still saves when reading the captions fails", async () => {
      injectionsAnswering(page);
      browserMock.scripting.executeScript.mockRejectedValueOnce(new Error("Frame was removed"));

      expect(await saveTab()).toEqual(page);
    });

    it("still saves when fetching the caption track fails", async () => {
      injectionsAnswering(page, playerCaptions, null);

      expect(await saveTab()).toEqual(page);
    });
  });

  it("runs no caption injection on a tab that isn't a YouTube video", async () => {
    browserMock.storage.local.get.mockResolvedValue({ resonory_api_key: "key_abc123" });
    browserMock.scripting.executeScript.mockResolvedValue([
      { result: { url: "https://example.com/article", html: "<html></html>" } },
    ]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const background = await import("../entrypoints/background");
    background.default.main?.();

    onClickedListener?.({ id: 7 });
    await vi.waitFor(() => {
      expect(browserMock.action.setBadgeText).toHaveBeenCalledWith({ text: "✓" });
    });

    expect(browserMock.scripting.executeScript).toHaveBeenCalledTimes(1);
    expect(browserMock.scripting.executeScript).not.toHaveBeenCalledWith(
      expect.objectContaining({ world: "MAIN" }),
    );
    vi.unstubAllGlobals();
  });
});
