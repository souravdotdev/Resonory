import { ListTagsResponseSchema } from "@resonory/shared/schemas/items";
import { describe, expect, it } from "vitest";
import type { Tag } from "@/domain/entities/Tag";
import { toListTagsOutput } from "@/application/dto/tags/ListTagsOutput";

// One of the User's Tags; each test overrides only what it's about.
const tag = (overrides: Partial<Tag> = {}): Tag => ({
  id: "tag-1",
  userId: "user-1",
  name: "memory",
  origin: "user",
  createdAt: new Date("2026-04-01T00:00:00.000Z"),
  updatedAt: new Date("2026-04-02T00:00:00.000Z"),
  ...overrides,
});

const memory = tag();
const learning = tag({ id: "tag-2", name: "learning" });

describe("toListTagsOutput", () => {
  it("gives a User with no Tags an empty list", () => {
    expect(toListTagsOutput([])).toEqual([]);
  });

  it("gives each Tag's id and Tag name, keeping their order", () => {
    expect(toListTagsOutput([learning, memory])).toEqual([
      { id: "tag-2", name: "learning" },
      { id: "tag-1", name: "memory" },
    ]);
  });

  it("leaves out the owner and dates", () => {
    for (const listed of toListTagsOutput([memory, learning])) {
      for (const field of ["userId", "createdAt", "updatedAt"]) {
        expect(listed).not.toHaveProperty(field);
      }
    }
  });

  it("produces a list that parses with the list Tags response schema", () => {
    const output = toListTagsOutput([memory, learning]);

    expect(ListTagsResponseSchema.parse(output)).toEqual(output);
  });
});
