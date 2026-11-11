import { isProbablyReaderable, Readability } from "@mozilla/readability";
import { injectable } from "inversify";
import { parseHTML } from "linkedom";
import type { ITextExtractor } from "@/domain/providers/ITextExtractor";

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
 * `ITextExtractor` with Mozilla Readability over linkedom: the page counts as
 * having main content only when `isProbablyReaderable` says so, and then
 * Readability picks it. Its text keeps paragraphs apart: each block element
 * becomes a blank line, a `<br>` a line break, and runs of source whitespace
 * inside them one space (as a browser renders them; `<pre>` keeps its own).
 */
@injectable()
export class ReadabilityTextExtractor implements ITextExtractor {
  extractText(html: string, _pageUrl: string): string | null {
    const { document } = parseHTML(html);
    if (!isProbablyReaderable(document)) return null;
    const article = new Readability<ContentNode>(document, {
      serializer: (node) => node as ContentNode,
    }).parse();
    return article?.content ? textOf(article.content) : null;
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
