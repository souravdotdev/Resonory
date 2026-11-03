import { describe, expect, it, vi } from "vitest";

describe("background entrypoint", () => {
  it("exists and exports a defined background definition", async () => {
    const background = await import("../entrypoints/background");

    expect(background.default).toBeDefined();
  });

  it("logs on load", async () => {
    const background = await import("../entrypoints/background");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    background.default.main?.();

    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
