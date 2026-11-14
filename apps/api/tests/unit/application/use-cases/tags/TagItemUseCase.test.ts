import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { ItemTagsResponseSchema } from "@resonory/shared/schemas/items";
import { TagItemUseCase } from "@/application/use-cases/tags/TagItemUseCase";
import { NotFoundError, ValidationError } from "@/domain/errors";
import { anItem, taggingInMemory } from "../../../fakes/tagging";

const USER_ID = "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
const ITEM_ID = "00000000-0000-4000-8000-000000000001";

// The User's Item, ready to be tagged, and the use case over the in-memory store.
function scene() {
  const store = taggingInMemory();
  store.items.push(anItem({ id: ITEM_ID, userId: USER_ID }));
  const useCase = new TagItemUseCase(store.itemRepository, store.tagRepository);
  return { ...store, useCase };
}

describe("TagItemUseCase", () => {
  it("creates the User's Tag for a new name and puts it on the Item with Tag source user", async () => {
    const { useCase, tags, links } = scene();

    const result = await useCase.execute({ userId: USER_ID, itemId: ITEM_ID, name: "memory" });

    expect(tags).toHaveLength(1);
    expect(tags[0]).toMatchObject({ userId: USER_ID, name: "memory" });
    expect(links).toEqual([
      expect.objectContaining({ itemId: ITEM_ID, tagId: tags[0]!.id, source: "user" }),
    ]);
    expect(result).toEqual([{ id: tags[0]!.id, name: "memory", source: "user" }]);
  });

  it("stores and shows the name as its Tag name, the slug", async () => {
    const { useCase, tags } = scene();

    const result = await useCase.execute({
      userId: USER_ID,
      itemId: ITEM_ID,
      name: "  Machine Learning ",
    });

    expect(tags.map((tag) => tag.name)).toEqual(["machine-learning"]);
    expect(result.map((tag) => tag.name)).toEqual(["machine-learning"]);
  });

  it.each(["machine learning", "Machine-Learning", "MACHINE_LEARNING", "machine-learning!"])(
    "reuses the existing Tag for %j, never creating a second one",
    async (variant) => {
      const { useCase, tags, items } = scene();
      const otherItemId = "00000000-0000-4000-8000-000000000002";
      items.push(anItem({ id: otherItemId, userId: USER_ID }));
      await useCase.execute({ userId: USER_ID, itemId: ITEM_ID, name: "Machine Learning" });

      const result = await useCase.execute({ userId: USER_ID, itemId: otherItemId, name: variant });

      expect(tags).toHaveLength(1);
      expect(result).toEqual([{ id: tags[0]!.id, name: "machine-learning", source: "user" }]);
    },
  );

  it.each([
    ["empty", ""],
    ["only spaces", "   "],
    ["only punctuation", "!!! ???"],
    ["51 characters once slugified", "a".repeat(51)],
  ])("refuses a name that's %s with a ValidationError, changing nothing", async (_case, name) => {
    const { useCase, tags, links } = scene();

    await expect(useCase.execute({ userId: USER_ID, itemId: ITEM_ID, name })).rejects.toThrow(
      ValidationError,
    );
    expect(tags).toHaveLength(0);
    expect(links).toHaveLength(0);
  });

  it("refuses an Item that doesn't exist with a NotFoundError, creating no Tag", async () => {
    const { useCase, tags, links } = scene();

    await expect(
      useCase.execute({
        userId: USER_ID,
        itemId: "00000000-0000-4000-8000-000000000099",
        name: "memory",
      }),
    ).rejects.toThrow(NotFoundError);
    expect(tags).toHaveLength(0);
    expect(links).toHaveLength(0);
  });

  it("refuses another User's Item with a NotFoundError, creating no Tag", async () => {
    const { useCase, tags, links, items } = scene();
    const theirItemId = "00000000-0000-4000-8000-000000000002";
    items.push(anItem({ id: theirItemId, userId: "11111111-1111-4111-8111-111111111111" }));

    await expect(
      useCase.execute({ userId: USER_ID, itemId: theirItemId, name: "memory" }),
    ).rejects.toThrow(NotFoundError);
    expect(tags).toHaveLength(0);
    expect(links).toHaveLength(0);
  });

  it("never reuses another User's Tag with the same Tag name", async () => {
    const { useCase, tags, tagRepository } = scene();
    const theirs = await tagRepository.findOrCreate(
      "11111111-1111-4111-8111-111111111111",
      "memory",
    );

    const result = await useCase.execute({ userId: USER_ID, itemId: ITEM_ID, name: "memory" });

    expect(tags).toHaveLength(2);
    expect(result[0]!.id).not.toBe(theirs.id);
  });

  it("changes the Tag source to user when the AI already put that Tag on the Item", async () => {
    const { useCase, tags, links, tagRepository, tick } = scene();
    const tag = await tagRepository.findOrCreate(USER_ID, "memory");
    links.push({
      userId: USER_ID,
      itemId: ITEM_ID,
      tagId: tag.id,
      source: "ai",
      createdAt: tick(),
    });

    const result = await useCase.execute({ userId: USER_ID, itemId: ITEM_ID, name: "Memory" });

    expect(tags).toHaveLength(1);
    expect(links).toEqual([expect.objectContaining({ tagId: tag.id, source: "user" })]);
    expect(result).toEqual([{ id: tag.id, name: "memory", source: "user" }]);
  });

  it("changes nothing and returns the same Tags when repeated", async () => {
    const { useCase, tags, links } = scene();
    const first = await useCase.execute({ userId: USER_ID, itemId: ITEM_ID, name: "memory" });
    const linksBefore = structuredClone(links);

    const second = await useCase.execute({ userId: USER_ID, itemId: ITEM_ID, name: "memory" });

    expect(second).toEqual(first);
    expect(tags).toHaveLength(1);
    expect(links).toEqual(linksBefore);
  });

  it("ends with exactly one Tag when two requests create the same new Tag at once", async () => {
    const { useCase, tags, links, items } = scene();
    const otherItemId = "00000000-0000-4000-8000-000000000002";
    items.push(anItem({ id: otherItemId, userId: USER_ID }));

    const [onFirst, onSecond] = await Promise.all([
      useCase.execute({ userId: USER_ID, itemId: ITEM_ID, name: "Memory" }),
      useCase.execute({ userId: USER_ID, itemId: otherItemId, name: "memory" }),
    ]);

    expect(tags).toHaveLength(1);
    expect(links).toHaveLength(2);
    expect(onFirst[0]!.id).toBe(onSecond[0]!.id);
  });

  it("returns the Item's full list of Tags, in the shared response shape", async () => {
    const { useCase, links, tagRepository, tick } = scene();
    const aiTag = await tagRepository.findOrCreate(USER_ID, "spaced-repetition");
    links.push({
      userId: USER_ID,
      itemId: ITEM_ID,
      tagId: aiTag.id,
      source: "ai",
      createdAt: tick(),
    });

    const result = await useCase.execute({ userId: USER_ID, itemId: ITEM_ID, name: "memory" });

    expect(result).toEqual([
      { id: aiTag.id, name: "spaced-repetition", source: "ai" },
      { id: expect.any(String), name: "memory", source: "user" },
    ]);
    expect(ItemTagsResponseSchema.parse(result)).toEqual(result);
  });

  it("accepts a name of exactly 50 characters once slugified", async () => {
    const { useCase } = scene();

    const result = await useCase.execute({
      userId: USER_ID,
      itemId: ITEM_ID,
      name: "a".repeat(50),
    });

    expect(result.map((tag) => tag.name)).toEqual(["a".repeat(50)]);
  });
});
