import { parsedUrl } from "@/domain/rules/parsedUrl";
import { type DomNode, type TextRules, textOf } from "@/infrastructure/http/domText";

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
export function xPostText(document: DomNode, postId: string): string | null {
  const post = Array.from(document.querySelectorAll('article[data-testid="tweet"]')).find((cell) =>
    Array.from(cell.querySelectorAll("a[href]")).some((link) => isPermalink(link, postId)),
  );
  const words = post?.querySelector('[data-testid="tweetText"]');
  const text = words ? textOf(words, POST_WORDS) : "";
  return text.trim() === "" ? null : text;
}

/** Whether a link is a post cell's permalink (it wraps the cell's `<time>`) to this post. */
function isPermalink(link: DomNode, postId: string): boolean {
  if (!link.querySelector("time")) return false;
  const url = parsedUrl(link.getAttribute("href") ?? "", "https://x.com");
  return url !== null && new RegExp(`/status/${postId}/?$`).test(url.pathname);
}

/** How a post's words node renders: its text as written, emoji images as their `alt`. */
const POST_WORDS: TextRules = {
  text: (data) => data,
  element: (name, element, children) =>
    name === "IMG" ? (element.getAttribute("alt") ?? "") : children(),
};
