/**
 * Where Thumbnail objects are kept, for deleting them. The storage adapter
 * implements it; signing links to them is `IThumbnailUrlProvider`'s job.
 */
export interface IThumbnailStore {
  /**
   * Deletes the one Thumbnail object at this key. No object at the key counts
   * as success; it rejects only when Storage fails to delete.
   */
  delete(thumbnailKey: string): Promise<void>;
}
