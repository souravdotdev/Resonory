/**
 * Whether a `<script>`'s `type` declares JSON-LD: its media type, ignoring
 * parameters (`; charset=utf-8`), surrounding whitespace and case. The one
 * rule the worker's head parser reads JSON-LD by, and the extension's
 * capture keeps it by (`capturePage.ts` carries an in-page copy, since an
 * injected function can't import; its test checks the two agree).
 */
export function isJsonLdType(type: string | null | undefined): boolean {
  return type?.split(";")[0]?.trim().toLowerCase() === "application/ld+json";
}
