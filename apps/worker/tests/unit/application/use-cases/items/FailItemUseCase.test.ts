import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { FailItemUseCase } from "@/application/use-cases/items/FailItemUseCase";
import type { Item, ItemRef, ItemType } from "@/domain/entities/Item";
import type { IThumbnailStore } from "@/domain/providers/IThumbnailStore";
import type { IItemRepository } from "@/domain/repositories/IItemRepository";

const USER_ID = "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
const OTHER_USER_ID = "0b6a1f7e-2c3d-4e5f-8a9b-1c2d3e4f5a6b";
const ITEM_ID = "00000000-0000-4000-8000-000000000001";

// An in-memory Item repository holding one Processing Item for USER_ID.
function itemsInMemory(type: ItemType | null = null) {
  const item: Item = {
    id: ITEM_ID,
    userId: USER_ID,
    sourceUrl: "https://example.com/a-post",
    type,
    status: "processing",
  };
  const owns = ({ itemId, userId }: ItemRef) => itemId === item.id && userId === item.userId;
  const repository: IItemRepository = {
    findById: vi.fn(async (ref: ItemRef) => (owns(ref) ? { ...item } : null)),
    markReady: vi.fn(async () => true),
    markFailed: vi.fn(async (ref: ItemRef, failedType: ItemType) => {
      if (owns(ref)) {
        item.status = "failed";
        item.type = failedType;
      }
    }),
    findProcessingBefore: vi.fn(async () => []),
    markFailedIfProcessing: vi.fn(async () => false),
    findTaggable: vi.fn(async () => null),
  };
  return { repository, item };
}

describe("FailItemUseCase", () => {
  it("marks an Item with no Item type Failed as a Link", async () => {
    const { repository, item } = itemsInMemory();
    const useCase = new FailItemUseCase(repository);

    const result = await useCase.execute({ itemId: ITEM_ID, userId: USER_ID });

    expect(result).toEqual({ outcome: "failed", type: "link" });
    expect(item).toMatchObject({ status: "failed", type: "link" });
  });

  it("keeps the Item type an Item already has", async () => {
    const { repository, item } = itemsInMemory("video");
    const useCase = new FailItemUseCase(repository);

    const result = await useCase.execute({ itemId: ITEM_ID, userId: USER_ID });

    expect(result).toEqual({ outcome: "failed", type: "video" });
    expect(item).toMatchObject({ status: "failed", type: "video" });
  });

  it("does nothing for an Item that no longer exists", async () => {
    const { repository } = itemsInMemory();
    const useCase = new FailItemUseCase(repository);

    const result = await useCase.execute({
      itemId: "00000000-0000-4000-8000-000000000099",
      userId: USER_ID,
    });

    expect(result).toEqual({ outcome: "missing" });
    expect(repository.markFailed).not.toHaveBeenCalled();
  });

  it("never touches another User's Item", async () => {
    const { repository, item } = itemsInMemory();
    const useCase = new FailItemUseCase(repository);

    const result = await useCase.execute({ itemId: ITEM_ID, userId: OTHER_USER_ID });

    expect(result).toEqual({ outcome: "missing" });
    expect(item).toMatchObject({ status: "processing", type: null });
  });
});

describe("FailItemUseCase, an Item deleted before its last attempt failed", () => {
  const ITEM_KEY = `${USER_ID}/${ITEM_ID}.webp`;
  const THUMBNAIL = new Uint8Array([1, 2, 3]);

  // A Thumbnail store keeping objects in a Map, by key.
  function thumbnailsInMemory() {
    const objects = new Map<string, Uint8Array>();
    const store = {
      put: vi.fn(async (key: string, thumbnail: Uint8Array) => {
        objects.set(key, thumbnail);
      }),
      delete: vi.fn(async (key: string) => {
        objects.delete(key);
      }),
    } satisfies IThumbnailStore;
    return { store, objects };
  }

  it("deletes what an attempt uploaded before the Item was deleted", async () => {
    const { repository } = itemsInMemory();
    vi.mocked(repository.findById).mockResolvedValue(null);
    const { store, objects } = thumbnailsInMemory();
    objects.set(ITEM_KEY, THUMBNAIL);
    const useCase = new FailItemUseCase(repository, store);

    const result = await useCase.execute({ itemId: ITEM_ID, userId: USER_ID });

    expect(result).toEqual({ outcome: "missing" });
    expect(objects).toEqual(new Map());
    expect(repository.markFailed).not.toHaveBeenCalled();
  });

  it("hands back a failed delete with its key, still ending as missing", async () => {
    const { repository } = itemsInMemory();
    vi.mocked(repository.findById).mockResolvedValue(null);
    const { store } = thumbnailsInMemory();
    const failure = new Error("Storage answered 500");
    store.delete.mockRejectedValue(failure);
    const useCase = new FailItemUseCase(repository, store);

    const result = await useCase.execute({ itemId: ITEM_ID, userId: USER_ID });

    expect(result).toEqual({
      outcome: "missing",
      orphanedThumbnail: { key: ITEM_KEY, error: failure },
    });
  });

  it("deletes only at the job's own key, so another User's Thumbnail is never touched", async () => {
    const { repository } = itemsInMemory();
    const { store, objects } = thumbnailsInMemory();
    objects.set(ITEM_KEY, THUMBNAIL);
    const useCase = new FailItemUseCase(repository, store);

    await useCase.execute({ itemId: ITEM_ID, userId: OTHER_USER_ID });

    expect(store.delete).toHaveBeenCalledWith(`${OTHER_USER_ID}/${ITEM_ID}.webp`);
    expect(objects).toEqual(new Map([[ITEM_KEY, THUMBNAIL]]));
  });

  it("deletes nothing for an Item that still exists", async () => {
    const { repository } = itemsInMemory();
    const { store } = thumbnailsInMemory();
    const useCase = new FailItemUseCase(repository, store);

    await useCase.execute({ itemId: ITEM_ID, userId: USER_ID });

    expect(store.delete).not.toHaveBeenCalled();
  });
});
