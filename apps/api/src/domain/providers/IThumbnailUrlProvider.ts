/**
 * Turns a stored Thumbnail key into a short-lived URL a User's browser can load,
 * or null when it can't be signed (the object is gone, the key is bad …): the
 * card then shows no Thumbnail. The storage adapter implements it; the bucket
 * itself stays private.
 */
export interface IThumbnailUrlProvider {
  resolve(thumbnailKey: string): Promise<string | null>;

  /**
   * Signs many Thumbnail keys at once, so a list of cards doesn't make one
   * request per Thumbnail. Every key gets an entry: its URL, or null when it
   * can't be signed. It never throws: if signing fails as a whole, every key is null.
   */
  resolveMany(thumbnailKeys: readonly string[]): Promise<ReadonlyMap<string, string | null>>;
}
