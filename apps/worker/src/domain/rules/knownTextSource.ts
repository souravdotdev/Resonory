import { knownSiteFor, type KnownTextExtractor } from "@/domain/rules/knownSites";
import { parsedUrl } from "@/domain/rules/parsedUrl";

/** Where a known site's captured page holds its Text: the extractor to use, and the post it reads. */
export interface KnownTextSource {
  readonly extractor: KnownTextExtractor;
  readonly postId: string;
}

/**
 * The known-site extractor for a page URL, from its known-site row's `text`
 * (`knownSites.ts`; the site's hosts, paths and post-id pattern are that
 * row's, never a copy), with the id of the post the URL names, so a reply's
 * page reads the reply and never the post above it. Null when the URL's row
 * has no extractor (or it matches no row), or names no post: its Text then
 * comes from main-content extraction alone.
 */
export function knownTextSourceFor(pageUrl: string): KnownTextSource | null {
  const url = parsedUrl(pageUrl);
  const text = url && knownSiteFor(url)?.text;
  const postId = text && text.postId.exec(url.pathname)?.[1];
  return text && postId ? { extractor: text.extractor, postId } : null;
}
