import { inject, injectable } from "inversify";
import { TOKENS } from "@/di/tokens";
import type {
  IThumbnailUrlProvider,
  SignedThumbnailUrls,
} from "@/domain/providers/IThumbnailUrlProvider";
import {
  THUMBNAILS_BUCKET,
  type ThumbnailStorage,
} from "@/infrastructure/storage/thumbnailStorage";

// In seconds. Long enough to keep a page of cards loaded, short enough that a leaked link dies.
const SIGNED_URL_EXPIRY = 60 * 60;

/**
 * Signs short-lived links to Thumbnails in Supabase Storage. Thumbnails are stored
 * card-sized, so no transformation is asked for (it needs a paid Supabase plan).
 * A key Storage refuses to sign (a missing object or bucket, a bad service role
 * key) gets no link, so one bad row never breaks the Library.
 */
@injectable()
export class SupabaseThumbnailUrlProvider implements IThumbnailUrlProvider {
  constructor(@inject(TOKENS.ThumbnailStorage) private readonly storage: ThumbnailStorage) {}

  async resolve(thumbnailKey: string): Promise<string | null> {
    const { data, error } = await this.storage
      .from(THUMBNAILS_BUCKET)
      .createSignedUrl(thumbnailKey, SIGNED_URL_EXPIRY);
    return error ? null : data.signedUrl;
  }

  /** One request for all the keys; a whole failed request leaves every key unsigned. */
  async resolveMany(thumbnailKeys: readonly string[]): Promise<SignedThumbnailUrls> {
    const keys = [...new Set(thumbnailKeys)];
    const urls = new Map<string, string | null>(keys.map((key) => [key, null]));
    if (keys.length === 0) return urls;
    try {
      const { data, error } = await this.storage
        .from(THUMBNAILS_BUCKET)
        .createSignedUrls(keys, SIGNED_URL_EXPIRY);
      if (error) return urls;
      // Storage answers in the order asked; a refused path's entry may have no path.
      keys.forEach((key, index) => {
        const signed = data[index];
        urls.set(key, signed && !signed.error ? signed.signedUrl : null);
      });
    } catch {
      // A network failure: no Thumbnails, but the Library still loads.
    }
    return urls;
  }
}
