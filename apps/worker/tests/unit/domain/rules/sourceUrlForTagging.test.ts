import { describe, expect, it } from "vitest";
import { sourceUrlForTagging } from "@/domain/rules/sourceUrlForTagging";

describe("sourceUrlForTagging", () => {
  it.each([
    // A signed link or magic-link token lives in the query or the fragment.
    ["https://example.com/doc?token=abc123&sig=xyz", "https://example.com/doc"],
    ["https://example.com/login/verify?magic=s3cret#done", "https://example.com/login/verify"],
    ["https://example.com/page#section-2", "https://example.com/page"],
    // Credentials in the address.
    ["https://user:pass@example.com/private", "https://example.com/private"],
    ["https://user@example.com/private?x=1", "https://example.com/private"],
    // The host and path stay as given, which is enough to tag with.
    [
      "https://en.wikipedia.org/wiki/Machine_learning",
      "https://en.wikipedia.org/wiki/Machine_learning",
    ],
    ["https://example.com/a/Case-Sensitive/b", "https://example.com/a/Case-Sensitive/b"],
  ])("sends %s as %s", (given, expected) => {
    expect(sourceUrlForTagging(given)).toBe(expected);
  });

  it("still drops a query or fragment from a value that isn't a URL", () => {
    expect(sourceUrlForTagging("not a url?token=abc#frag")).toBe("not a url");
  });
});
