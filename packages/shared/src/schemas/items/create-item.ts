import { z } from "zod";
import { ItemCardSchema } from "./item-card";

export const MAX_URL_LENGTH = 2048;
/**
 * Room for a captured page's `<head>` plus its stripped `<body>` (the
 * extension drops scripts, styles and other non-content elements first — see
 * `capturePage.ts`), while still bounded. The API derives `POST /items`'
 * request-body limit from this cap, so an oversized capture gets this clean
 * validation error, never an opaque 413.
 */
export const MAX_HTML_LENGTH = 5 * 1024 * 1024;
/**
 * Room for a long video's plain caption text, read by the extension from a
 * YouTube tab. Like `MAX_HTML_LENGTH`, the API's `POST /items` body limit is
 * derived from it.
 */
export const MAX_CAPTIONS_LENGTH = 1024 * 1024;

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
  /**
   * A video's captions as plain text, read by the extension from the
   * YouTube tab the User is watching (issue #164). Additive and optional,
   * like `html`: the worker prefers them over page text for the Item's Text.
   */
  captions: z
    .string()
    .max(MAX_CAPTIONS_LENGTH, `Captions can be at most ${MAX_CAPTIONS_LENGTH} characters`)
    .optional(),
});

export type CreateItemInput = z.infer<typeof CreateItemSchema>;

/** A saved Item comes back as its card (201), still Processing. */
export const CreateItemResponseSchema = ItemCardSchema;

export type CreateItemResponse = z.infer<typeof CreateItemResponseSchema>;
