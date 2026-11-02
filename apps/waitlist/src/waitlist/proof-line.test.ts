import { describe, expect, it, vi } from "vitest";
import { logger } from "@/logger";
import { readProofLine } from "./proof-line";
import type { WaitlistStore } from "./store";

function storeWithCount(count: () => Promise<number>): WaitlistStore {
  return { join: async () => ({ created: true }), markWelcomeEmailed: async () => {}, count };
}

describe("readProofLine", () => {
  it("shows how many people are waiting once there are at least 100", async () => {
    expect(await readProofLine(storeWithCount(async () => 100))).toBe(
      "100 people are waiting · be among the first",
    );
  });

  it("shows the offer line while fewer than 100 are waiting", async () => {
    expect(await readProofLine(storeWithCount(async () => 99))).toBe(
      "Join the waitlist. Be among the first to use Resonory.",
    );
  });

  it("falls back to the offer line when the count can't be read", async () => {
    const unreachable = storeWithCount(async () => {
      throw new Error("connect ECONNREFUSED 127.0.0.1:6543");
    });

    expect(await readProofLine(unreachable)).toBe(
      "Join the waitlist. Be among the first to use Resonory.",
    );
  });

  it("logs describeError's safe description, never the raw error, when the count can't be read", async () => {
    const logged = vi.spyOn(logger, "error").mockImplementation(() => undefined as never);
    const unreachable = storeWithCount(async () => {
      throw new Error("connect ECONNREFUSED for ada@example.com");
    });

    await readProofLine(unreachable);

    expect(logged).toHaveBeenCalledWith(
      { err: "Error" },
      "Could not read the Waitlist Entry count",
    );
    expect(JSON.stringify(logged.mock.calls)).not.toContain("ada@example.com");
    logged.mockRestore();
  });

  it("groups the digits of large counts", async () => {
    expect(await readProofLine(storeWithCount(async () => 1284))).toBe(
      "1,284 people are waiting · be among the first",
    );
  });
});
