import { describe, expect, it } from "vitest";
import { readProofLine } from "./proof-line";
import type { WaitlistStore } from "./store";

function storeWithCount(count: () => Promise<number>): WaitlistStore {
  return { join: async () => {}, count };
}

describe("readProofLine", () => {
  it("shows how many people are waiting once there are at least 100", async () => {
    expect(await readProofLine(storeWithCount(async () => 100))).toBe(
      "100 people are waiting · founding member price",
    );
  });

  it("shows the offer line while fewer than 100 are waiting", async () => {
    expect(await readProofLine(storeWithCount(async () => 99))).toBe(
      "Early access and a founding member price.",
    );
  });

  it("falls back to the offer line when the count can't be read", async () => {
    const unreachable = storeWithCount(async () => {
      throw new Error("connect ECONNREFUSED 127.0.0.1:6543");
    });

    expect(await readProofLine(unreachable)).toBe("Early access and a founding member price.");
  });

  it("groups the digits of large counts", async () => {
    expect(await readProofLine(storeWithCount(async () => 1284))).toBe(
      "1,284 people are waiting · founding member price",
    );
  });
});
