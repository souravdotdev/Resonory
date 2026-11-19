import { describe, expect, it } from "vitest";
import { failedItemType } from "@/domain/rules/failedItemType";

describe("failedItemType", () => {
  it("is a Link for an Item with no Item type yet, so it still displays like any other Item", () => {
    expect(failedItemType(null)).toBe("link");
  });

  it.each(["article", "video", "pdf", "link"] as const)("keeps the Item type %s", (type) => {
    expect(failedItemType(type)).toBe(type);
  });
});
