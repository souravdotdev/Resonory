/** The longest Text an Item keeps: the search vector reads no further. */
export const MAX_TEXT_LENGTH = 100_000;

/**
 * An Item's Text from its page's main-content text: whitespace normalised
 * (each line's runs of spaces and tabs turned into one space and trimmed, and
 * blank lines between paragraphs kept, at most one in a row), capped at
 * `MAX_TEXT_LENGTH` characters. Null when there is no page text, or it's blank.
 */
export function itemText(pageText: string | null): string | null {
  if (pageText === null) return null;
  const text = normaliseText(pageText);
  return text === "" ? null : capped(text);
}

/** Whitespace collapsed within lines, keeping paragraph breaks. */
function normaliseText(text: string): string {
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** At most `MAX_TEXT_LENGTH` characters, never ending in half a surrogate pair. */
function capped(text: string): string {
  if (text.length <= MAX_TEXT_LENGTH) return text;
  const end = /[\uD800-\uDBFF]/.test(text[MAX_TEXT_LENGTH - 1]!)
    ? MAX_TEXT_LENGTH - 1
    : MAX_TEXT_LENGTH;
  return text.slice(0, end).trimEnd();
}
