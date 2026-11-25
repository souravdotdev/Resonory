/**
 * Where card Thumbnails are kept (the private `thumbnails` bucket in Supabase
 * Storage). `put` writes to a fixed key, overwriting what is there, so a
 * retried or reprocessed Item never leaves a second file; it rejects when the
 * write fails. `delete` removes the object at a key, so an upload for an Item
 * deleted mid-Processing leaves no orphan; deleting a missing object is a
 * no-op, and it rejects when Storage fails. Without Supabase Storage
 * configured the container binds no store, and Processing then fetches no
 * image at all.
 */
export interface IThumbnailStore {
  put(key: string, thumbnail: Uint8Array): Promise<void>;
  delete(key: string): Promise<void>;
}
