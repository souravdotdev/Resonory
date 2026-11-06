import type { PageHead } from "@/domain/entities/PageHead";

/**
 * Turns an already-captured page's HTML into the same tags a live fetch's
 * parsed head carries: meta tags, the title, JSON-LD blocks and oEmbed
 * discovery links. Used for a job that carries captured page content
 * (issue #143/#145), so `ProcessItemUseCase` can build its page
 * representation without a network fetch, while still depending only on a
 * port (HTML parsing is a tool, and belongs in infrastructure).
 */
export interface IPageHeadParser {
  parseHead(html: string, pageUrl: string): PageHead;
}
