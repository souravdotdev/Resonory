/** The longest Text an Item keeps: the search vector reads no further. */
export const MAX_TEXT_LENGTH = 100_000;

/** Where an Item's Text can come from, in order of precedence. */
export interface TextSources {
  /** A video's captions, read from the User's own tab (issue #164). */
  captions?: string;
  /**
   * The page's main-content text, or null when it has none. Only asked for
   * when the captions don't answer, so a captioned video's page is never
   * extracted.
   */
  pageText: () => string | null;
}

/**
 * An Item's Text: its captions when it has any, otherwise its page's
 * main-content text. Either one is whitespace normalised (each line's runs of
 * spaces and tabs turned into one space and trimmed, and blank lines between
 * paragraphs kept, at most one in a row) and capped at `MAX_TEXT_LENGTH`
 * characters; a blank one counts as none. Null when neither answers.
 */
export function itemText({ captions, pageText }: TextSources): string | null {
  return textOf(captions ?? null) ?? textOf(pageText());
}

/** Normalised and capped; null when absent or blank. */
function textOf(source: string | null): string | null {
  if (source === null) return null;
  const text = normaliseText(source);
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
