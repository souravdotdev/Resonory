import { MAX_CAPTIONS_LENGTH } from "@resonory/shared/schemas/items";

/** One caption track the YouTube player offers for the video it's on. */
export interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  /** `"asr"` for an auto-generated track; absent for a written one. */
  kind?: string;
}

/**
 * What `readPlayerCaptions` (`lib/captureCaptions.ts`) reads off the live
 * player in a YouTube tab: which video it's on, the page's language, and the
 * caption tracks it offers.
 */
export interface PlayerCaptions {
  videoId: string;
  /** The page's `<html lang>`, possibly empty. */
  language: string;
  tracks: CaptionTrack[];
}

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

/**
 * The video id of a YouTube watch page (`/watch?v=…`) or Short
 * (`/shorts/<id>`); undefined for any other URL.
 */
export function youTubeVideoId(url: string): string | undefined {
  if (!URL.canParse(url)) return undefined;
  const parsed = new URL(url);
  if (!YOUTUBE_HOSTS.has(parsed.hostname)) return undefined;
  if (parsed.pathname === "/watch") return parsed.searchParams.get("v") || undefined;
  return /^\/shorts\/([^/]+)\/?$/.exec(parsed.pathname)?.[1];
}

/**
 * The URL to fetch the chosen caption track from, in YouTube's json3 format.
 * The track is the page's language (by primary subtag, a written track ahead
 * of an auto-generated one), then English, then the first offered.
 *
 * Undefined, so the save goes on without captions, when the tab isn't a watch
 * page or a Short, when the player is on another video than the tab's (stale after
 * in-app navigation), when there are no tracks, or when the track isn't on
 * the page's own origin (the fetch must stay same-origin, needing no host
 * permission).
 */
export function captionTrackUrl(player: PlayerCaptions, pageUrl: string): string | undefined {
  const videoId = youTubeVideoId(pageUrl);
  if (!videoId || player.videoId !== videoId) return undefined;

  const track = chooseTrack(player.tracks, primaryLanguage(player.language));
  if (!track || !URL.canParse(track.baseUrl, pageUrl)) return undefined;

  const url = new URL(track.baseUrl, pageUrl);
  if (url.origin !== new URL(pageUrl).origin) return undefined;
  url.searchParams.set("fmt", "json3");
  return url.href;
}

/** The page's language, then English, then the first track. */
function chooseTrack(tracks: CaptionTrack[], language: string): CaptionTrack | undefined {
  return trackIn(tracks, language) ?? trackIn(tracks, "en") ?? tracks[0];
}

/** A track in the language, a written one ahead of an auto-generated one. */
function trackIn(tracks: CaptionTrack[], language: string): CaptionTrack | undefined {
  if (!language) return undefined;
  const matching = tracks.filter((track) => primaryLanguage(track.languageCode) === language);
  return matching.find((track) => track.kind !== "asr") ?? matching[0];
}

/** `"fr"` for `"fr-CA"`, lowercased. */
function primaryLanguage(tag: string): string {
  return tag.split(/[-_]/)[0]!.toLowerCase();
}

/**
 * A json3 caption track's plain text: each caption's segments joined, one
 * caption per line, captions without words skipped. Capped at the
 * create-Item schema's `MAX_CAPTIONS_LENGTH`, so a very long video still
 * saves. Undefined when the body isn't a json3 track or holds no words.
 */
export function captionsFromJson3(body: string): string | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return undefined;
  }
  const events = (parsed as { events?: unknown } | null)?.events;
  if (!Array.isArray(events)) return undefined;

  const lines = events.map((event) => wordsOf(event)).filter((line) => line !== "");
  const text = lines.join("\n");
  return text === "" ? undefined : capped(text);
}

/** At most `MAX_CAPTIONS_LENGTH` characters, never ending in half a surrogate pair (an emoji). */
function capped(text: string): string {
  if (text.length <= MAX_CAPTIONS_LENGTH) return text;
  const end = /[\uD800-\uDBFF]/.test(text[MAX_CAPTIONS_LENGTH - 1]!)
    ? MAX_CAPTIONS_LENGTH - 1
    : MAX_CAPTIONS_LENGTH;
  return text.slice(0, end);
}

/** One json3 event's words, trimmed; empty when it has none. */
function wordsOf(event: unknown): string {
  const segs = (event as { segs?: unknown } | null)?.segs;
  if (!Array.isArray(segs)) return "";
  return segs
    .map((seg) => (seg as { utf8?: unknown } | null)?.utf8)
    .filter((utf8): utf8 is string => typeof utf8 === "string")
    .join("")
    .trim();
}
