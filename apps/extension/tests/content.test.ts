import { describe, expect, it, vi } from "vitest";

describe("content entrypoint", () => {
  it("exists, matches all http/https pages, and exports a defined content script definition", async () => {
    const content = await import("../entrypoints/content");

    expect(content.default).toBeDefined();
    expect(content.default.matches).toEqual(["*://*/*"]);
  });

  it("logs on load", async () => {
    const content = await import("../entrypoints/content");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // @ts-expect-error - a stub ctx is enough; the stub only logs.
    content.default.main?.({});

    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
