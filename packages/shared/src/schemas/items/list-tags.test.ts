import { describe, expect, it } from "vitest";
import { ListTagsResponseSchema } from "./index";

describe("ListTagsResponseSchema", () => {
  it("is the User's Tags, each with its id and Tag name", () => {
    const tags = [
      { id: "tag-1", name: "memory" },
      { id: "tag-2", name: "machine-learning" },
    ];

    expect(ListTagsResponseSchema.parse(tags)).toEqual(tags);
  });

  it("accepts a User with no Tags", () => {
    expect(ListTagsResponseSchema.parse([])).toEqual([]);
  });

  it("rejects a Tag without a name", () => {
    expect(ListTagsResponseSchema.safeParse([{ id: "tag-1" }]).success).toBe(false);
  });

  it("drops anything beyond the id and name, such as the owner", () => {
    expect(
      ListTagsResponseSchema.parse([{ id: "tag-1", name: "memory", userId: "user-1" }]),
    ).toEqual([{ id: "tag-1", name: "memory" }]);
  });
});
