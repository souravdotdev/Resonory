import { describe, expect, it } from "vitest";
import { describeError } from "./log-error";

describe("describeError", () => {
  it("names the error and never its message", () => {
    expect(describeError(new Error("insert for ada@example.com failed"))).toBe("Error");
  });

  it("adds a driver's code, from the error or its cause", () => {
    const driver = Object.assign(new Error("duplicate for ada@example.com"), { code: "23505" });
    expect(describeError(driver)).toBe("Error (23505)");
    expect(describeError(new Error("Failed query", { cause: driver }))).toBe("Error (23505)");
  });

  it("copes with something that isn't an Error", () => {
    expect(describeError("ada@example.com")).toBe("Unknown error");
  });
});
