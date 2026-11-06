import { z } from "zod";
import { ItemCardSchema } from "./item-card";

export const MAX_URL_LENGTH = 2048;
/**
 * Generous for a captured page's `<head>` alone (the extension sends only
 * that, not the full document — see `capturePage.ts`), while still bounded:
 * a clean validation error here beats an opaque 413 from the API's
 * request-body limit for an unusually bloated head.
 */
export const MAX_HTML_LENGTH = 2 * 1024 * 1024;

/** The link a User pastes to save an Item. Shared by the web save form and the API. */
export const CreateItemSchema = z.object({
  url: z
    .string()
    .trim()
    .max(MAX_URL_LENGTH, `Links can be at most ${MAX_URL_LENGTH} characters`)
    .pipe(z.url({ protocol: /^https?$/, error: "Enter a valid http(s) link" })),
  /**
   * The page's already-rendered HTML, captured by the browser extension
   * (issue #143) so the worker can skip its own fetch. Additive and
   * optional: a caller sending only `url`, as every caller does today,
   * behaves exactly as before.
   */
  html: z
    .string()
    .max(MAX_HTML_LENGTH, `Captured page content can be at most ${MAX_HTML_LENGTH} characters`)
    .optional(),
});

export type CreateItemInput = z.infer<typeof CreateItemSchema>;

/** A saved Item comes back as its card (201), still Processing. */
export const CreateItemResponseSchema = ItemCardSchema;

export type CreateItemResponse = z.infer<typeof CreateItemResponseSchema>;
