import { ItemTagsResponseSchema } from "@resonory/shared/schemas/items";
import { describe, expect, it } from "vitest";
import type { AppliedTag, Tag } from "@/domain/entities/Tag";
import { toItemTagsOutput } from "@/application/dto/tags/ItemTagsOutput";

// One of the User's Tags; each test overrides only what it's about.
const tag = (overrides: Partial<Tag> = {}): Tag => ({
  id: "tag-1",
  userId: "user-1",
  name: "memory",
  createdAt: new Date("2026-04-01T00:00:00.000Z"),
  updatedAt: new Date("2026-04-02T00:00:00.000Z"),
  ...overrides,
});

const aiTag: AppliedTag = { tag: tag(), source: "ai" };
const userTag: AppliedTag = { tag: tag({ id: "tag-2", name: "learning" }), source: "user" };

describe("toItemTagsOutput", () => {
  it("gives an Item with no Tags an empty list", () => {
    expect(toItemTagsOutput([])).toEqual([]);
  });

  it("gives each Tag's id, Tag name and who applied it, keeping their order", () => {
    expect(toItemTagsOutput([userTag, aiTag])).toEqual([
      { id: "tag-2", name: "learning", source: "user" },
      { id: "tag-1", name: "memory", source: "ai" },
    ]);
  });

  it("leaves out every internal field", () => {
    for (const itemTag of toItemTagsOutput([aiTag, userTag])) {
      for (const field of ["userId", "createdAt", "updatedAt", "tag"]) {
        expect(itemTag).not.toHaveProperty(field);
      }
    }
  });

  it("produces a list that parses with the Item tags response schema", () => {
    const output = toItemTagsOutput([aiTag, userTag]);

    expect(ItemTagsResponseSchema.parse(output)).toEqual(output);
  });
});
