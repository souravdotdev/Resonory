import { describe, expect, it } from "vitest";
import { MAX_CAPTIONS_LENGTH } from "@resonory/shared/schemas/items";
import {
  captionsFromJson3,
  captionTrackUrl,
  type PlayerCaptions,
  youTubeVideoId,
} from "../lib/youtubeCaptions";

describe("youTubeVideoId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtube.com/watch?v=dQw4w9WgXcQ&t=42", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ])("reads the video id of the watch page %s", (url, id) => {
    expect(youTubeVideoId(url)).toBe(id);
  });

  it.each([
    "https://example.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/",
    "https://www.youtube.com/@somechannel",
    "https://www.youtube.com/watch",
    "https://www.youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "not a url",
  ])("is undefined for %s, which isn't a YouTube watch page", (url) => {
    expect(youTubeVideoId(url)).toBeUndefined();
  });
});

describe("captionTrackUrl", () => {
  const PAGE_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  const track = (languageCode: string, kind?: string) => ({
    baseUrl: `https://www.youtube.com/api/timedtext?v=dQw4w9WgXcQ&lang=${languageCode}${kind ? `&kind=${kind}` : ""}`,
    languageCode,
    kind,
  });
  const player = (overrides: Partial<PlayerCaptions> = {}): PlayerCaptions => ({
    videoId: "dQw4w9WgXcQ",
    language: "fr",
    tracks: [track("de"), track("en"), track("fr")],
    ...overrides,
  });
  const languageOf = (url: string | undefined) => url && new URL(url).searchParams.get("lang");

  it("picks the track in the page's language", () => {
    expect(languageOf(captionTrackUrl(player(), PAGE_URL))).toBe("fr");
  });

  it("matches the page's language by its primary subtag", () => {
    const url = captionTrackUrl(player({ language: "fr-CA" }), PAGE_URL);

    expect(languageOf(url)).toBe("fr");
  });

  it("prefers a written track over an auto-generated one in the same language", () => {
    const url = captionTrackUrl(
      player({ language: "en", tracks: [track("en", "asr"), track("en")] }),
      PAGE_URL,
    );

    expect(new URL(url!).searchParams.has("kind")).toBe(false);
  });

  it("falls back to English when there's no track in the page's language", () => {
    expect(languageOf(captionTrackUrl(player({ language: "ja" }), PAGE_URL))).toBe("en");
  });

  it("falls back to the first track when there's neither", () => {
    const url = captionTrackUrl(
      player({ language: "ja", tracks: [track("de"), track("es")] }),
      PAGE_URL,
    );

    expect(languageOf(url)).toBe("de");
  });

  it("asks for the json3 format", () => {
    const url = captionTrackUrl(player(), PAGE_URL);

    expect(new URL(url!).searchParams.get("fmt")).toBe("json3");
  });

  it("resolves a relative track URL against the page", () => {
    const url = captionTrackUrl(
      player({ tracks: [{ baseUrl: "/api/timedtext?v=dQw4w9WgXcQ&lang=fr", languageCode: "fr" }] }),
      PAGE_URL,
    );

    expect(url).toBe("https://www.youtube.com/api/timedtext?v=dQw4w9WgXcQ&lang=fr&fmt=json3");
  });

  it("is undefined when the player is on another video than the tab (stale after in-app navigation)", () => {
    expect(captionTrackUrl(player({ videoId: "someOtherId" }), PAGE_URL)).toBeUndefined();
  });

  it("is undefined for a video without caption tracks", () => {
    expect(captionTrackUrl(player({ tracks: [] }), PAGE_URL)).toBeUndefined();
  });

  it("is undefined for a track on another origin, so the fetch stays same-origin", () => {
    const url = captionTrackUrl(
      player({ tracks: [{ baseUrl: "https://evil.example/timedtext", languageCode: "fr" }] }),
      PAGE_URL,
    );

    expect(url).toBeUndefined();
  });

  it("is undefined when the tab isn't a YouTube watch page", () => {
    expect(captionTrackUrl(player(), "https://example.com/watch?v=dQw4w9WgXcQ")).toBeUndefined();
  });
});

describe("captionsFromJson3", () => {
  const json3 = (events: unknown[]) => JSON.stringify({ events });

  it("joins each caption's segments, one caption per line", () => {
    const body = json3([
      { tStartMs: 0, segs: [{ utf8: "Never gonna " }, { utf8: "give you up" }] },
      { tStartMs: 2000, segs: [{ utf8: "never gonna let you down" }] },
    ]);

    expect(captionsFromJson3(body)).toBe("Never gonna give you up\nnever gonna let you down");
  });

  it("skips events with no words, such as window settings and line breaks", () => {
    const body = json3([
      { tStartMs: 0, id: 1, wpWinPosId: 1 },
      { tStartMs: 0, segs: [{ utf8: "Hello" }] },
      { tStartMs: 500, aAppend: 1, segs: [{ utf8: "\n" }] },
      { tStartMs: 1000, segs: [{ utf8: "world" }] },
    ]);

    expect(captionsFromJson3(body)).toBe("Hello\nworld");
  });

  it.each([
    ["an empty body", ""],
    ["a body that isn't JSON", "<html>sign in</html>"],
    ["JSON without events", JSON.stringify({ foo: 1 })],
    ["events without words", json3([{ tStartMs: 0, segs: [{ utf8: " \n " }] }])],
  ])("is undefined for %s", (_case, body) => {
    expect(captionsFromJson3(body)).toBeUndefined();
  });

  it("caps the captions at the create-Item schema's limit, so a long video still saves", () => {
    const body = json3([{ segs: [{ utf8: "a".repeat(MAX_CAPTIONS_LENGTH + 10) }] }]);

    expect(captionsFromJson3(body)).toHaveLength(MAX_CAPTIONS_LENGTH);
  });
});
