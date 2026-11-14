import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { ItemTagsResponseSchema } from "@resonory/shared/schemas/items";
import { UntagItemUseCase } from "@/application/use-cases/tags/UntagItemUseCase";
import type { TagSource } from "@/domain/entities/Tag";
import { NotFoundError } from "@/domain/errors";
import { anItem, taggingInMemory } from "../../../fakes/tagging";

const USER_ID = "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
const ITEM_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_USER_ID = "11111111-1111-4111-8111-111111111111";

// The User's Item and the use case over the in-memory store, plus a way to put
// one of the User's Tags on that Item with either Tag source.
function scene() {
  const store = taggingInMemory();
  store.items.push(anItem({ id: ITEM_ID, userId: USER_ID }));
  const useCase = new UntagItemUseCase(store.itemRepository, store.tagRepository);
  const tagged = async (name: string, source: TagSource) => {
    const tag = await store.tagRepository.findOrCreate(USER_ID, name);
    store.links.push({
      userId: USER_ID,
      itemId: ITEM_ID,
      tagId: tag.id,
      source,
      createdAt: store.tick(),
    });
    return tag;
  };
  return { ...store, useCase, tagged };
}

describe("UntagItemUseCase", () => {
  it("takes the Tag off the Item and returns the Item's remaining Tags", async () => {
    const { useCase, links, tagged } = scene();
    const memory = await tagged("memory", "user");
    const sleep = await tagged("sleep", "user");

    const result = await useCase.execute({ userId: USER_ID, itemId: ITEM_ID, tagId: memory.id });

    expect(links).toEqual([expect.objectContaining({ tagId: sleep.id })]);
    expect(result).toEqual([{ id: sleep.id, name: "sleep", source: "user" }]);
  });

  it("takes off a Tag the AI put on just like one the User put on", async () => {
    const { useCase, links, tagged } = scene();
    const memory = await tagged("memory", "ai");

    const result = await useCase.execute({ userId: USER_ID, itemId: ITEM_ID, tagId: memory.id });

    expect(links).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it("keeps the Tag, even when it's then on no Items", async () => {
    const { useCase, tags, tagged } = scene();
    const memory = await tagged("memory", "user");

    await useCase.execute({ userId: USER_ID, itemId: ITEM_ID, tagId: memory.id });

    expect(tags).toEqual([memory]);
  });

  it("leaves the Tag on the User's other Items", async () => {
    const { useCase, links, items, tagged, tagRepository } = scene();
    const otherItemId = "00000000-0000-4000-8000-000000000002";
    items.push(anItem({ id: otherItemId, userId: USER_ID }));
    const memory = await tagged("memory", "user");
    await tagRepository.applyAsUser({ userId: USER_ID, itemId: otherItemId, tagId: memory.id });

    await useCase.execute({ userId: USER_ID, itemId: ITEM_ID, tagId: memory.id });

    expect(links).toEqual([expect.objectContaining({ itemId: otherItemId, tagId: memory.id })]);
  });

  it("changes nothing and returns the Item's Tags when the Tag isn't on the Item", async () => {
    const { useCase, links, tagged, tagRepository } = scene();
    const sleep = await tagged("sleep", "ai");
    const memory = await tagRepository.findOrCreate(USER_ID, "memory");
    const linksBefore = structuredClone(links);

    const result = await useCase.execute({ userId: USER_ID, itemId: ITEM_ID, tagId: memory.id });

    expect(links).toEqual(linksBefore);
    expect(result).toEqual([{ id: sleep.id, name: "sleep", source: "ai" }]);
  });

  it("refuses an Item that doesn't exist with a NotFoundError", async () => {
    const { useCase, tagRepository } = scene();
    const memory = await tagRepository.findOrCreate(USER_ID, "memory");

    await expect(
      useCase.execute({
        userId: USER_ID,
        itemId: "00000000-0000-4000-8000-000000000099",
        tagId: memory.id,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("refuses another User's Item with a NotFoundError, leaving their Tags on it", async () => {
    const { useCase, items, links, tick, tagRepository } = scene();
    const theirItemId = "00000000-0000-4000-8000-000000000002";
    items.push(anItem({ id: theirItemId, userId: OTHER_USER_ID }));
    const theirs = await tagRepository.findOrCreate(OTHER_USER_ID, "memory");
    links.push({
      userId: OTHER_USER_ID,
      itemId: theirItemId,
      tagId: theirs.id,
      source: "user",
      createdAt: tick(),
    });

    await expect(
      useCase.execute({ userId: USER_ID, itemId: theirItemId, tagId: theirs.id }),
    ).rejects.toThrow(NotFoundError);
    expect(links).toHaveLength(1);
  });

  it("refuses a Tag that doesn't exist with a NotFoundError", async () => {
    const { useCase } = scene();

    await expect(
      useCase.execute({
        userId: USER_ID,
        itemId: ITEM_ID,
        tagId: "00000000-0000-4000-9000-000000000099",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("refuses another User's Tag with a NotFoundError", async () => {
    const { useCase, tagRepository } = scene();
    const theirs = await tagRepository.findOrCreate(OTHER_USER_ID, "memory");

    await expect(
      useCase.execute({ userId: USER_ID, itemId: ITEM_ID, tagId: theirs.id }),
    ).rejects.toThrow(NotFoundError);
  });

  it("returns the remaining Tags in the shared response shape", async () => {
    const { useCase, tagged } = scene();
    const memory = await tagged("memory", "user");
    await tagged("sleep", "ai");

    const result = await useCase.execute({ userId: USER_ID, itemId: ITEM_ID, tagId: memory.id });

    expect(ItemTagsResponseSchema.parse(result)).toEqual(result);
  });
});
