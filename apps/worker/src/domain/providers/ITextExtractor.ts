/**
 * Turns an already-captured page's HTML into its main-content text: the
 * readable words of the page, without its navigation, footer or sidebars,
 * with block boundaries as line breaks. Null when the page has no main
 * content (a homepage, a product page). Used for a job that carries captured
 * page content (issue #143/#145), so `ProcessItemUseCase` can give the Item
 * its Text while depending only on a port (HTML parsing is a tool, and
 * belongs in infrastructure). The caller treats a thrown error as no Text.
 */
export interface ITextExtractor {
  extractText(html: string, pageUrl: string): string | null;
}
