import { describe, expect, it } from "vitest";
import {
  ItemTagParamsSchema,
  ItemTagsResponseSchema,
  MAX_TAG_INPUT_LENGTH,
  TagItemSchema,
  UntagItemParamsSchema,
} from "./index";

describe("TagItemSchema", () => {
  it("accepts a Tag name exactly as the User typed it; the API reduces it to its slug", () => {
    expect(TagItemSchema.parse({ name: "Machine Learning" })).toEqual({ name: "Machine Learning" });
  });

  it("rejects a body without a name", () => {
    expect(TagItemSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a name that isn't text", () => {
    expect(TagItemSchema.safeParse({ name: 42 }).success).toBe(false);
  });

  it("accepts a typed name up to MAX_TAG_INPUT_LENGTH characters, and rejects a longer one", () => {
    const longest = "a".repeat(MAX_TAG_INPUT_LENGTH);

    expect(TagItemSchema.safeParse({ name: longest }).success).toBe(true);
    expect(TagItemSchema.safeParse({ name: `${longest}a` }).success).toBe(false);
  });
});

describe("ItemTagParamsSchema", () => {
  it("accepts an Item id that's a uuid", () => {
    const params = { itemId: "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f" };

    expect(ItemTagParamsSchema.parse(params)).toEqual(params);
  });

  it("rejects an Item id that isn't a uuid", () => {
    expect(ItemTagParamsSchema.safeParse({ itemId: "item-1" }).success).toBe(false);
  });
});

describe("ItemTagsResponseSchema", () => {
  it("is the Item's Tags in the Item card's tag shape", () => {
    const tags = [
      { id: "tag-1", name: "memory", source: "ai" },
      { id: "tag-2", name: "machine-learning", source: "user" },
    ];

    expect(ItemTagsResponseSchema.parse(tags)).toEqual(tags);
  });

  it("accepts an Item with no Tags", () => {
    expect(ItemTagsResponseSchema.parse([])).toEqual([]);
  });

  it("rejects a Tag without its Tag source", () => {
    expect(ItemTagsResponseSchema.safeParse([{ id: "tag-1", name: "memory" }]).success).toBe(false);
  });
});

describe("UntagItemParamsSchema", () => {
  const ITEM_ID = "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
  const TAG_ID = "0f1e2d3c-4b5a-4968-8776-655443322110";

  it("accepts an Item id and a Tag id that are uuids", () => {
    const params = { itemId: ITEM_ID, tagId: TAG_ID };

    expect(UntagItemParamsSchema.parse(params)).toEqual(params);
  });

  it("rejects a Tag id that isn't a uuid", () => {
    expect(UntagItemParamsSchema.safeParse({ itemId: ITEM_ID, tagId: "tag-1" }).success).toBe(
      false,
    );
  });

  it("rejects an Item id that isn't a uuid", () => {
    expect(UntagItemParamsSchema.safeParse({ itemId: "item-1", tagId: TAG_ID }).success).toBe(
      false,
    );
  });
});
