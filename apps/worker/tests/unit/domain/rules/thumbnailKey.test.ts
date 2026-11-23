import { describe, expect, it } from "vitest";
import { thumbnailKeyOf } from "@/domain/rules/thumbnailKey";

describe("thumbnailKeyOf", () => {
  const USER_ID = "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
  const ITEM_ID = "00000000-0000-4000-8000-000000000001";
  const OTHER_ITEM_ID = "00000000-0000-4000-8000-000000000002";

  it("is the Item's .webp object inside its User's folder", () => {
    expect(thumbnailKeyOf({ userId: USER_ID, itemId: ITEM_ID })).toBe(
      "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f/00000000-0000-4000-8000-000000000001.webp",
    );
  });

  it("is a different key for another Item of the same User", () => {
    expect(thumbnailKeyOf({ userId: USER_ID, itemId: OTHER_ITEM_ID })).toBe(
      `${USER_ID}/${OTHER_ITEM_ID}.webp`,
    );
  });
});
