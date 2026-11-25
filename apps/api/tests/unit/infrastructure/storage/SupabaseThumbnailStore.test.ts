import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { SupabaseThumbnailStore } from "@/infrastructure/storage/SupabaseThumbnailStore";
import type { RemoveResult, ThumbnailStorage } from "@/infrastructure/storage/thumbnailStorage";

const key = "user-1/item-1.webp";

// A fake Storage client that records which bucket and keys were removed, and signs nothing.
const storageRemoving = (answer: () => Promise<RemoveResult>) => {
  const remove = vi.fn(answer);
  const refuseToSign = async () => {
    throw new Error("signed a link while deleting");
  };
  const from = vi.fn(() => ({
    remove,
    createSignedUrl: refuseToSign,
    createSignedUrls: refuseToSign,
  }));
  return { storage: { from } satisfies ThumbnailStorage, from, remove };
};

describe("SupabaseThumbnailStore", () => {
  it("removes the key from the thumbnails bucket", async () => {
    const fake = storageRemoving(async () => ({ data: [{ name: key }], error: null }));

    await new SupabaseThumbnailStore(fake.storage).delete(key);

    expect(fake.from).toHaveBeenCalledWith("thumbnails");
    expect(fake.remove).toHaveBeenCalledWith([key]);
  });

  // Storage answers a missing object with no error and an empty list.
  it("succeeds when there's no object at the key", async () => {
    const fake = storageRemoving(async () => ({ data: [], error: null }));

    await expect(new SupabaseThumbnailStore(fake.storage).delete(key)).resolves.toBeUndefined();
  });

  it("rejects naming the bucket and key, with Storage's error as the cause", async () => {
    const error = new Error("Invalid Compact JWS");
    const fake = storageRemoving(async () => ({ data: null, error }));

    const rejection = new SupabaseThumbnailStore(fake.storage).delete(key);

    await expect(rejection).rejects.toThrow(
      /thumbnails\/user-1\/item-1\.webp.*Invalid Compact JWS/,
    );
    await expect(rejection).rejects.toMatchObject({ cause: error });
  });
});
