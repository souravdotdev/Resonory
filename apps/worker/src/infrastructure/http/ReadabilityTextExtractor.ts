import { isProbablyReaderable, Readability } from "@mozilla/readability";
import { injectable } from "inversify";
import { parseHTML } from "linkedom";
import type { ITextExtractor } from "@/domain/providers/ITextExtractor";
import type { KnownTextExtractor } from "@/domain/rules/knownSites";
import { knownTextSourceFor } from "@/domain/rules/knownTextSource";
import {
  childrenTextOf,
  type DomNode,
  type TextRules,
  textOf,
} from "@/infrastructure/http/domText";
import { xPostText } from "@/infrastructure/http/xPostText";

/**
 * Each known-site extractor (`knownSites.ts`), by name: what it reads from
 * the captured page, or null when it finds nothing there. Adding one is one
 * entry here; tsc asks for it as soon as the name is added.
 */
const KNOWN_SITE_TEXT: Record<
  KnownTextExtractor,
  (document: DomNode, postId: string) => string | null
> = {
  xPost: xPostText,
};

/** Elements whose start and end are a line break when a page is read as text. */
const BLOCK_ELEMENTS = new Set([
  "ADDRESS",
  "ARTICLE",
  "ASIDE",
  "BLOCKQUOTE",
  "DD",
  "DETAILS",
  "DIV",
  "DL",
  "DT",
  "FIGCAPTION",
  "FIGURE",
  "FOOTER",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HEADER",
  "HR",
  "LI",
  "MAIN",
  "OL",
  "P",
  "PRE",
  "SECTION",
  "SUMMARY",
  "TABLE",
  "TR",
  "UL",
]);

/**
 * `ITextExtractor` over linkedom. A known site's extractor goes first (an X
 * post's own words, see `knownTextSource.ts`); when the URL has none, or it
 * finds nothing in the page, Mozilla Readability reads the main content: the
 * page counts as having any only when `isProbablyReaderable` says so, and then
 * Readability picks it. Its text keeps paragraphs apart: each block element
 * becomes a blank line, a `<br>` a line break, and runs of source whitespace
 * inside them one space (as a browser renders them; `<pre>` keeps its own).
 */
@injectable()
export class ReadabilityTextExtractor implements ITextExtractor {
  extractText(html: string, pageUrl: string): string | null {
    const { document } = parseHTML(html);
    const known = knownTextSourceFor(pageUrl);
    const knownText = known && KNOWN_SITE_TEXT[known.extractor](document, known.postId);
    if (knownText) return knownText;
    if (!isProbablyReaderable(document)) return null;
    const article = new Readability<DomNode>(document, {
      serializer: (node) => node as DomNode,
    }).parse();
    return article?.content ? textOf(article.content, PAGE_TEXT) : null;
  }
}

/**
 * How a page's main content reads as text: block boundaries as blank lines, a
 * `<br>` as a line break, and runs of source whitespace as one space (as a
 * browser renders them), except inside a `<pre>`, which keeps its own.
 */
const PAGE_TEXT: TextRules = { text: (data) => data.replace(/\s+/g, " "), element: pageElement };
const PREFORMATTED: TextRules = { text: (data) => data, element: pageElement };

function pageElement(name: string, element: DomNode, children: () => string): string {
  if (name === "BR") return "\n";
  const inner = name === "PRE" ? childrenTextOf(element, PREFORMATTED) : children();
  return BLOCK_ELEMENTS.has(name) ? `\n\n${inner}\n\n` : inner;
}
