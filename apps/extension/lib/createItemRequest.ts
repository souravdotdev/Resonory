import type { CreateItemInput } from "@resonory/shared/schemas/items";

/** A captured tab, ready to send: its URL and page content (`capturedHtml`), plus captions on a YouTube video. */
export interface CapturedPage {
  url: string;
  html: string;
  /**
   * A YouTube video's plain caption text, from the second, main-world
   * injection (`lib/captureCaptions.ts`). Absent on every other tab, or when
   * the video has none.
   */
  captions?: string;
}

/** Everything `fetch` needs to call the create-Item endpoint. */
export interface CreateItemRequest {
  method: "POST";
  headers: Record<string, string>;
  body: string;
}

/**
 * Turns a captured tab (url + rendered HTML, plus captions on a YouTube
 * video) and the stored API key into the create-Item request's
 * method/headers/body. The one pure function this spec requires be
 * unit-testable without any `chrome.*` API (#143/#146): no
 * `fetch`, no `chrome.scripting`, no `chrome.storage` — just data in, data out.
 *
 * `x-api-key` is the header `@better-auth/api-key`'s `enableSessionForAPIKeys`
 * reads by default (confirmed against apps/api's `createAuth.ts`).
 */
export function buildCreateItemRequest(capture: CapturedPage, apiKey: string): CreateItemRequest {
  const body: CreateItemInput = { url: capture.url, html: capture.html };
  if (capture.captions !== undefined) body.captions = capture.captions;

  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  };
}
