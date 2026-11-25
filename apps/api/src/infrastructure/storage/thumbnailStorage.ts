/** What Supabase's Storage client answers when asked to sign a link. */
export type SignedUrlResult =
  { data: { signedUrl: string }; error: null } | { data: null; error: Error };

/**
 * What Supabase's Storage client answers when asked to sign many links: one entry
 * per path, in the order asked, each with its own error when that path can't be signed.
 */
export type SignedUrlsResult =
  | {
      data: { path: string | null; signedUrl: string | null; error: string | null }[];
      error: null;
    }
  | { data: null; error: Error };

/**
 * What Supabase's Storage client answers when asked to remove objects: the ones it
 * removed, so an empty list when there was nothing at the paths.
 */
export type RemoveResult = { data: unknown[]; error: null } | { data: null; error: Error };

/**
 * The part of Supabase's Storage client the Thumbnail adapters use. The container
 * binds the production `StorageClient` to it, which checks the real client fits.
 */
export interface ThumbnailStorage {
  from(bucket: string): {
    createSignedUrl(path: string, expiresIn: number): Promise<SignedUrlResult>;
    createSignedUrls(paths: string[], expiresIn: number): Promise<SignedUrlsResult>;
    remove(paths: string[]): Promise<RemoveResult>;
  };
}

// The private bucket the worker stores Thumbnails in; a key is the object's path inside it.
export const THUMBNAILS_BUCKET = "thumbnails";
