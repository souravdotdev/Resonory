import { parsedUrl } from "@/domain/rules/parsedUrl";

/**
 * The Source URL as the model is told it: no query string, fragment, or
 * username and password. A page saved through the extension can carry a signed
 * link, a magic-link token or a `?token=` in them, and the host and path are
 * enough to tag with (Items ADR 0004). A value that isn't a URL is cut at its
 * first `?` or `#` instead.
 */
export function sourceUrlForTagging(sourceUrl: string): string {
  const url = parsedUrl(sourceUrl);
  if (!url) return sourceUrl.split(/[?#]/, 1)[0]!;
  url.username = "";
  url.password = "";
  url.search = "";
  url.hash = "";
  return url.href;
}
