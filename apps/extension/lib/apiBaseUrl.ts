// The local API's default address, the same default apps/web's
// `NEXT_PUBLIC_API_URL` falls back to.
export const DEFAULT_API_BASE_URL = "http://localhost:4000";

/**
 * Turns the raw `WXT_API_URL` value into the base URL the extension calls:
 * unset or empty falls back to the local API, anything else must be an
 * http(s) URL, and a trailing slash is dropped so `${base}/items` never
 * doubles it. Throws on an invalid value, so a misconfigured build fails
 * instead of shipping an extension that can't reach the API.
 */
export function resolveApiBaseUrl(raw: string | undefined): string {
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_API_BASE_URL;
  }

  const value = raw.trim();
  const url = URL.canParse(value) ? new URL(value) : undefined;
  if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) {
    throw new Error(
      `Invalid WXT_API_URL "${raw}": must be an http(s) URL, such as https://api.example.com`,
    );
  }

  return value.replace(/\/+$/, "");
}
