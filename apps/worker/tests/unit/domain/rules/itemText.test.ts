import { describe, expect, it, vi } from "vitest";
import { itemText, MAX_TEXT_LENGTH } from "@/domain/rules/itemText";

const pageText = (text: string | null) => () => text;

describe("itemText", () => {
  it("is the captions when there are any, without asking for the page's text", () => {
    const page = vi.fn(() => "The page's text");

    expect(itemText({ captions: "What is said in the video", pageText: page })).toBe(
      "What is said in the video",
    );
    expect(page).not.toHaveBeenCalled();
  });

  it.each([
    ["no captions", undefined],
    ["blank captions", " \n\t\n "],
  ])("is the page's text with %s", (_case, captions) => {
    expect(itemText({ captions, pageText: pageText("The page's text") })).toBe("The page's text");
  });

  it.each([
    ["no captions and no page text", undefined, null],
    ["blank page text", undefined, "  \n\n\t "],
    ["blank captions and blank page text", "   ", "\n"],
  ])("is none with %s", (_case, captions, page) => {
    expect(itemText({ captions, pageText: pageText(page) })).toBeNull();
  });

  it.each([
    ["runs of spaces and tabs within a line", "one  \t two   three", "one two three"],
    ["each line trimmed", "  first line  \n\t second line\t", "first line\nsecond line"],
    ["single line breaks kept", "first line\nsecond line", "first line\nsecond line"],
    ["one blank line between paragraphs at most", "first\n\n\n\n\nsecond", "first\n\nsecond"],
    ["blank lines around the text dropped", "\n\n  only paragraph  \n\n\n", "only paragraph"],
    ["Windows and old Mac line breaks read as line breaks", "one\r\ntwo\rthree", "one\ntwo\nthree"],
    ["lines of only whitespace counted as blank", "first\n   \n\t\n \nsecond", "first\n\nsecond"],
  ])("normalises whitespace: %s", (_case, raw, expected) => {
    expect(itemText({ pageText: pageText(raw) })).toBe(expected);
    expect(itemText({ captions: raw, pageText: pageText(null) })).toBe(expected);
  });

  it(`keeps text of exactly ${MAX_TEXT_LENGTH} characters whole`, () => {
    const text = "a".repeat(MAX_TEXT_LENGTH);

    expect(itemText({ pageText: pageText(text) })).toBe(text);
  });

  it("caps text at 100,000 characters", () => {
    expect(MAX_TEXT_LENGTH).toBe(100_000);
    expect(itemText({ pageText: pageText("a".repeat(MAX_TEXT_LENGTH + 50)) })).toHaveLength(
      MAX_TEXT_LENGTH,
    );
  });

  it("trims the whitespace the cut leaves at the end", () => {
    const text = `${"a".repeat(MAX_TEXT_LENGTH - 1)} b`;

    expect(itemText({ pageText: pageText(text) })).toBe("a".repeat(MAX_TEXT_LENGTH - 1));
  });

  it("never ends in half an emoji when the cut falls inside one", () => {
    // "😀" is two UTF-16 units; its first sits at the last position the cap keeps.
    const text = `${"a".repeat(MAX_TEXT_LENGTH - 1)}😀 after`;

    expect(itemText({ pageText: pageText(text) })).toBe("a".repeat(MAX_TEXT_LENGTH - 1));
  });

  it("keeps an emoji the cap ends right after", () => {
    const text = `${"a".repeat(MAX_TEXT_LENGTH - 2)}😀 after`;

    expect(itemText({ pageText: pageText(text) })).toBe(`${"a".repeat(MAX_TEXT_LENGTH - 2)}😀`);
  });

  it("caps captions the same way", () => {
    expect(
      itemText({ captions: "a".repeat(MAX_TEXT_LENGTH + 1), pageText: pageText(null) }),
    ).toHaveLength(MAX_TEXT_LENGTH);
  });
});
