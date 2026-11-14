import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { ListTagsResponseSchema } from "@resonory/shared/schemas/items";
import { ListTagsUseCase } from "@/application/use-cases/tags/ListTagsUseCase";
import { anItem, taggingInMemory } from "../../../fakes/tagging";

const USER_ID = "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
const OTHER_USER_ID = "11111111-1111-4111-8111-111111111111";
const ITEM_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_ITEM_ID = "00000000-0000-4000-8000-000000000002";

// Two of the User's Items, and the use case over the in-memory store.
function scene() {
  const store = taggingInMemory();
  store.items.push(anItem({ id: ITEM_ID, userId: USER_ID }));
  store.items.push(anItem({ id: OTHER_ITEM_ID, userId: USER_ID }));
  const useCase = new ListTagsUseCase(store.tagRepository);
  // Puts the Tag on the Item now, as the AI or the User would.
  const link = (tagId: string, itemId: string, source: "ai" | "user" = "user") =>
    store.links.push({ userId: USER_ID, itemId, tagId, source, createdAt: store.tick() });
  return { ...store, useCase, link };
}

describe("ListTagsUseCase", () => {
  it("returns an empty list for a User with no Tags", async () => {
    const { useCase } = scene();

    expect(await useCase.execute({ userId: USER_ID })).toEqual([]);
  });

  it("returns every one of the User's Tags and none of another User's", async () => {
    const { useCase, tagRepository } = scene();
    const memory = await tagRepository.findOrCreate(USER_ID, "memory");
    await tagRepository.findOrCreate(OTHER_USER_ID, "theirs");
    await tagRepository.findOrCreate(OTHER_USER_ID, "memory");

    const result = await useCase.execute({ userId: USER_ID });

    expect(result).toEqual([{ id: memory.id, name: "memory" }]);
  });

  it("puts the most recently used Tag first, by the latest time it went on any Item", async () => {
    const { useCase, tagRepository, link } = scene();
    const memory = await tagRepository.findOrCreate(USER_ID, "memory");
    const reading = await tagRepository.findOrCreate(USER_ID, "reading");
    const design = await tagRepository.findOrCreate(USER_ID, "design");
    link(reading.id, ITEM_ID);
    link(memory.id, ITEM_ID);
    link(design.id, ITEM_ID);
    // reading was used first, but its latest use is the newest of all.
    link(reading.id, OTHER_ITEM_ID);

    const result = await useCase.execute({ userId: USER_ID });

    expect(result.map((tag) => tag.name)).toEqual(["reading", "design", "memory"]);
  });

  it("counts a Tag the AI put on an Item as used", async () => {
    const { useCase, tagRepository, link } = scene();
    const memory = await tagRepository.findOrCreate(USER_ID, "memory");
    const reading = await tagRepository.findOrCreate(USER_ID, "reading");
    link(memory.id, ITEM_ID, "user");
    link(reading.id, ITEM_ID, "ai");

    const result = await useCase.execute({ userId: USER_ID });

    expect(result.map((tag) => tag.name)).toEqual(["reading", "memory"]);
  });

  it("orders a Tag on no Items by when it was created, among the used ones", async () => {
    const { useCase, tagRepository, link } = scene();
    const memory = await tagRepository.findOrCreate(USER_ID, "memory");
    link(memory.id, ITEM_ID);
    // Created after memory's last use, but never put on an Item.
    await tagRepository.findOrCreate(USER_ID, "unused-new");
    const reading = await tagRepository.findOrCreate(USER_ID, "reading");
    link(reading.id, ITEM_ID);

    const result = await useCase.execute({ userId: USER_ID });

    expect(result.map((tag) => tag.name)).toEqual(["reading", "unused-new", "memory"]);
  });

  it("answers in the shared response shape", async () => {
    const { useCase, tagRepository } = scene();
    await tagRepository.findOrCreate(USER_ID, "memory");

    const result = await useCase.execute({ userId: USER_ID });

    expect(ListTagsResponseSchema.parse(result)).toEqual(result);
  });
});
