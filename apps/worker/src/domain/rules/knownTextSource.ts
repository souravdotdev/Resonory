import { knownSiteFor, type KnownTextExtractor } from "@/domain/rules/knownSites";
import { parsedUrl } from "@/domain/rules/parsedUrl";

/** Where a known site's captured page holds its Text: the extractor to use, and the post it reads. */
export interface KnownTextSource {
  readonly extractor: KnownTextExtractor;
  readonly postId: string;
}

/**
 * The known-site extractor for a page URL, from its known-site row's `text`
 * (`knownSites.ts`; the site's hosts and paths are that row's, never a copy),
 * with the id of the post the URL names, so a reply's page reads the reply
 * and never the post above it. Null when the URL's row has no extractor (or
 * it matches no row): its Text then comes from main-content extraction alone.
 */
export function knownTextSourceFor(pageUrl: string): KnownTextSource | null {
  const url = parsedUrl(pageUrl);
  const extractor = url && knownSiteFor(url)?.text;
  if (!extractor) return null;
  switch (extractor) {
    case "xPost": {
      // `/<user>/status/<id>`, the X row's own path.
      const postId = /\/status\/(\d+)/.exec(url.pathname)?.[1];
      return postId ? { extractor, postId } : null;
    }
  }
}
