import { MAX_HTML_LENGTH } from "@resonory/shared/schemas/items";

/** What `capturePage` reads off the active tab: its URL, and its `<head>` and stripped `<body>` as HTML. */
export interface CapturedDocument {
  url: string;
  head: string;
  body: string;
}

/**
 * The captured page content to send: the head plus the body, or, when that's
 * over the create-Item schema's `MAX_HTML_LENGTH`, the head alone with an
 * empty body. An oversized page then still saves, with its title,
 * description and Thumbnail (all read from the head), just without Text,
 * rather than failing the whole save on the API's 400.
 */
export function capturedHtml({ head, body }: CapturedDocument): string {
  const html = `<!doctype html><html>${head}${body}</html>`;
  return html.length <= MAX_HTML_LENGTH ? html : `<!doctype html><html>${head}<body></body></html>`;
}
