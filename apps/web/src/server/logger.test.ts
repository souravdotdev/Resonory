import { afterEach, describe, expect, it, vi } from "vitest";

// `logger` is built once at module load, writing straight to stdout (the
// same way every other app's composition-root logger does — see
// packages/logger/src/base.test.ts for the in-memory-stream pattern used to
// test createLogger itself). Here we only need to confirm this app wired
// the factory correctly, so we spy on the one write it produces.
describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is importable and constructed without throwing", async () => {
    await expect(import("./logger")).resolves.toBeTruthy();
  });

  it("tags every log line with this app's name", async () => {
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    const { logger } = await import("./logger");
    logger.info("hello from web");

    const [line] = write.mock.calls[0]!;
    const parsed = JSON.parse(String(line));
    expect(parsed.app).toBe("web");
    expect(parsed.msg).toBe("hello from web");
  });
});
