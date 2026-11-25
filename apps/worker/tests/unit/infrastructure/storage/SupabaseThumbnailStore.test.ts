import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import {
  SupabaseThumbnailStore,
  type ThumbnailStorage,
} from "@/infrastructure/storage/SupabaseThumbnailStore";

const key = "user-1/item-1.webp";

// A fake Storage client that records which bucket and paths were removed, answering `answer`.
const storageRemoving = (answer: { error: Error | null }) => {
  const remove = vi.fn(async (_paths: string[]) => ({ data: answer.error ? null : [], ...answer }));
  const upload = vi.fn(async () => ({ error: new Error("not uploading here") }));
  const from = vi.fn((_bucket: string) => ({ upload, remove }));
  return { storage: { from } satisfies ThumbnailStorage, from, remove };
};

describe("SupabaseThumbnailStore, delete", () => {
  it("removes the key from the thumbnails bucket", async () => {
    const fake = storageRemoving({ error: null });

    await new SupabaseThumbnailStore(fake.storage).delete(key);

    expect(fake.from).toHaveBeenCalledWith("thumbnails");
    expect(fake.remove).toHaveBeenCalledWith([key]);
  });

  // Supabase answers removing a missing object with no error and an empty list.
  it("resolves when there was no object at the key", async () => {
    const fake = storageRemoving({ error: null });

    await expect(new SupabaseThumbnailStore(fake.storage).delete(key)).resolves.toBeUndefined();
  });

  it("rejects when Storage answers with an error", async () => {
    const fake = storageRemoving({ error: new Error("Invalid Compact JWS") });

    await expect(new SupabaseThumbnailStore(fake.storage).delete(key)).rejects.toThrow(
      /thumbnails\/user-1\/item-1\.webp.*Invalid Compact JWS/,
    );
  });
});
