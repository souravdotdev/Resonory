import { describe, expect, it } from "vitest";
import { DeleteItemParamsSchema } from "./index";

describe("DeleteItemParamsSchema", () => {
  it("accepts an Item id that's a uuid", () => {
    const params = { itemId: "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f" };

    expect(DeleteItemParamsSchema.parse(params)).toEqual(params);
  });

  it("rejects an Item id that isn't a uuid", () => {
    expect(DeleteItemParamsSchema.safeParse({ itemId: "item-1" }).success).toBe(false);
  });
});
