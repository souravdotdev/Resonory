import { parsedUrl } from "@/domain/rules/parsedUrl";

// Query params that only track where a link was shared from, never what it
// points to. Grows as new sharers' trackers turn up; keep it in one place.
const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "ref",
  "si",
]);

/**
 * A URL in the one canonical form two differently-decorated links to the
 * same page share: the host lowercased, a trailing slash dropped (the bare
 * root path kept), no fragment, and no tracking params — everything else
 * about the path and query (including their case) left exactly as given, so
 * a case-sensitive video ID or search term is never corrupted. Null for a
 * value that isn't a URL at all.
 */
export function canonicalUrl(rawUrl: string): string | null {
  const url = parsedUrl(rawUrl);
  if (!url) return null;

  url.hostname = url.hostname.toLowerCase();
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key)) url.searchParams.delete(key);
  }
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.href;
}
