import { describe, expect, it } from "vitest";

describe("background entrypoint", () => {
  it("exists and exports a defined background definition", async () => {
    const background = await import("../entrypoints/background");

    expect(background.default).toBeDefined();
  });
});
