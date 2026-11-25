import { injectable, unmanaged } from "inversify";
import type { IThumbnailStore } from "@/domain/providers/IThumbnailStore";

/** The private Supabase Storage bucket Thumbnails are kept in. Created once by hand (docs/getting-started.md); never by the worker. */
export const THUMBNAILS_BUCKET = "thumbnails";

/**
 * The part of Supabase's Storage client this store uses. The container hands
 * it the production `StorageClient`, which checks the real client fits.
 */
export interface ThumbnailStorage {
  from(bucket: string): {
    upload(
      path: string,
      body: Uint8Array,
      options: { contentType: string; upsert: boolean },
    ): Promise<{ error: Error | null }>;
    remove(paths: string[]): Promise<{ error: Error | null }>;
  };
}

/**
 * Keeps card Thumbnails in the private `thumbnails` bucket, through Supabase's
 * Storage client sending the service role key. Each upload upserts its fixed
 * key as `image/webp`, so a retry overwrites instead of failing on a
 * duplicate. A delete removes the key; Storage answers a missing object with
 * no error, so that is a no-op. The client answers a failed call with an
 * error instead of throwing; it is thrown here so Processing sees the failure.
 */
@injectable()
export class SupabaseThumbnailStore implements IThumbnailStore {
  // Not injected: the container builds the client from the environment.
  constructor(@unmanaged() private readonly storage: ThumbnailStorage) {}

  async put(key: string, thumbnail: Uint8Array): Promise<void> {
    const { error } = await this.storage
      .from(THUMBNAILS_BUCKET)
      .upload(key, thumbnail, { contentType: "image/webp", upsert: true });
    if (error) {
      throw new Error(`Uploading ${THUMBNAILS_BUCKET}/${key} failed: ${error.message}`, {
        cause: error,
      });
    }
  }

  async delete(thumbnailKey: string): Promise<void> {
    const { error } = await this.storage.from(THUMBNAILS_BUCKET).remove([thumbnailKey]);
    if (error) {
      throw new Error(`Deleting ${THUMBNAILS_BUCKET}/${thumbnailKey} failed: ${error.message}`, {
        cause: error,
      });
    }
  }
}
