import { parsedUrl } from "@/domain/rules/parsedUrl";

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

/** The part of a DOM element (linkedom's) that finding and reading a post needs; the worker has no DOM lib. */
export interface PostNode {
  nodeType: number;
  textContent: string | null;
  tagName?: string;
  childNodes: ArrayLike<PostNode>;
  getAttribute(name: string): string | null;
  querySelector(selectors: string): PostNode | null;
  querySelectorAll(selectors: string): ArrayLike<PostNode>;
}

/**
 * An X post's own words, read from its captured page: the text node
 * (`[data-testid="tweetText"]`) of the post cell (`article[data-testid="tweet"]`)
 * whose permalink, the link around its `<time>`, is this post's. So the
 * replies below it, a post it replies to above it, and the sidebar's "Who to
 * follow" and trends are never read, and a quoted post inside it (after its
 * own text) neither. Line breaks are kept as X renders them, and an emoji
 * (an `<img>`) is its `alt`. Null when the page has no such cell, or its post
 * has no words (a photo alone).
 */
export function xPostText(document: PostNode, postId: string): string | null {
  const post = Array.from(document.querySelectorAll('article[data-testid="tweet"]')).find((cell) =>
    Array.from(cell.querySelectorAll("a[href]")).some((link) => isPermalink(link, postId)),
  );
  const words = post?.querySelector('[data-testid="tweetText"]');
  const text = words ? wordsOf(words) : "";
  return text.trim() === "" ? null : text;
}

/** Whether a link is a post cell's permalink (it wraps the cell's `<time>`) to this post. */
function isPermalink(link: PostNode, postId: string): boolean {
  if (!link.querySelector("time")) return false;
  const url = parsedUrl(link.getAttribute("href") ?? "", "https://x.com");
  return url !== null && new RegExp(`/status/${postId}/?$`).test(url.pathname);
}

/** The text a post's words node renders: its text as written, emoji images as their `alt`. */
function wordsOf(node: PostNode): string {
  if (node.nodeType === TEXT_NODE) return node.textContent ?? "";
  if (node.nodeType !== ELEMENT_NODE) return "";
  if (node.tagName?.toUpperCase() === "IMG") return node.getAttribute("alt") ?? "";
  return Array.from(node.childNodes, wordsOf).join("");
}
