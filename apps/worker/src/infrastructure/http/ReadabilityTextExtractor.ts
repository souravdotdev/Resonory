import { isProbablyReaderable, Readability } from "@mozilla/readability";
import { injectable } from "inversify";
import { parseHTML } from "linkedom";
import type { ITextExtractor } from "@/domain/providers/ITextExtractor";
import { type KnownTextSource, knownTextSourceFor } from "@/domain/rules/knownTextSource";
import { type PostNode, xPostText } from "@/infrastructure/http/xPostText";

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

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

/** The part of a DOM node (linkedom's) that reading it as text needs; the worker has no DOM lib. */
interface ContentNode {
  nodeType: number;
  textContent: string | null;
  tagName?: string;
  childNodes: ArrayLike<ContentNode>;
}

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
    const knownText = known && knownSiteText(document, known);
    if (knownText) return knownText;
    if (!isProbablyReaderable(document)) return null;
    const article = new Readability<ContentNode>(document, {
      serializer: (node) => node as ContentNode,
    }).parse();
    return article?.content ? textOf(article.content) : null;
  }
}

/** What a known site's extractor reads from its captured page, or null when it finds nothing. */
function knownSiteText(document: PostNode, { extractor, postId }: KnownTextSource): string | null {
  switch (extractor) {
    case "xPost":
      return xPostText(document, postId);
  }
}

/** The node's text, with block boundaries as blank lines. */
function textOf(node: ContentNode, preformatted = false): string {
  if (node.nodeType === TEXT_NODE) {
    const data = node.textContent ?? "";
    return preformatted ? data : data.replace(/\s+/g, " ");
  }
  if (node.nodeType !== ELEMENT_NODE) return "";
  const name = node.tagName?.toUpperCase() ?? "";
  if (name === "BR") return "\n";
  const inner = Array.from(node.childNodes, (child) =>
    textOf(child, preformatted || name === "PRE"),
  ).join("");
  return BLOCK_ELEMENTS.has(name) ? `\n\n${inner}\n\n` : inner;
}
