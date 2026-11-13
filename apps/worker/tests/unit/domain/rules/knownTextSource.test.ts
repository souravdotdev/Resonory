import { describe, expect, it } from "vitest";
import { knownTextSourceFor } from "@/domain/rules/knownTextSource";

describe("knownTextSourceFor", () => {
  it.each([
    ["https://x.com/resonory/status/1856001234567890123", "1856001234567890123"],
    ["https://twitter.com/resonory/status/1856001234567890123", "1856001234567890123"],
    ["https://www.x.com/resonory/status/1856001234567890123", "1856001234567890123"],
    ["https://m.x.com/resonory/status/1856001234567890123", "1856001234567890123"],
    ["https://x.com/resonory/status/1856001234567890123/", "1856001234567890123"],
    ["https://x.com/resonory/status/1856001234567890123/photo/1", "1856001234567890123"],
    ["https://x.com/resonory/status/1856001234567890123?s=20#reply", "1856001234567890123"],
  ])("reads %s with the X post extractor, for the post it names", (url, postId) => {
    expect(knownTextSourceFor(url)).toEqual({ extractor: "xPost", postId });
  });

  it("reads a reply's own id, never the post it replies to", () => {
    expect(knownTextSourceFor("https://x.com/someone/status/222?in_reply_to=111")).toEqual({
      extractor: "xPost",
      postId: "222",
    });
  });

  it.each([
    ["an X profile", "https://x.com/resonory"],
    ["an X search", "https://x.com/search?q=status"],
    ["an X status link without an id", "https://x.com/resonory/status/"],
    ["another network's post", "https://bsky.app/profile/someone.bsky.social/post/3kabc"],
    ["a Reddit post", "https://www.reddit.com/r/programming/comments/abc123/a_post/"],
    ["a Mastodon post", "https://mastodon.social/@someone/112233445566778899"],
    ["an article", "https://example.com/blog/a-long-read"],
    ["a host that only ends like X's", "https://notx.com/resonory/status/1856001234567890123"],
    ["an unparseable URL", "not a url"],
  ])("has none for %s", (_case, url) => {
    expect(knownTextSourceFor(url)).toBeNull();
  });
});
