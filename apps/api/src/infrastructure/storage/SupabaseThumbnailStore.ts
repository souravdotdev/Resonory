import { inject, injectable } from "inversify";
import { TOKENS } from "@/di/tokens";
import type { IThumbnailStore } from "@/domain/providers/IThumbnailStore";
import {
  THUMBNAILS_BUCKET,
  type ThumbnailStorage,
} from "@/infrastructure/storage/thumbnailStorage";

/**
 * Deletes Thumbnail objects from Supabase Storage with the service role key.
 * Storage answers a missing object with no error, so deleting one succeeds.
 */
@injectable()
export class SupabaseThumbnailStore implements IThumbnailStore {
  constructor(@inject(TOKENS.ThumbnailStorage) private readonly storage: ThumbnailStorage) {}

  async delete(thumbnailKey: string): Promise<void> {
    const { error } = await this.storage.from(THUMBNAILS_BUCKET).remove([thumbnailKey]);
    if (error) throw error;
  }
}
