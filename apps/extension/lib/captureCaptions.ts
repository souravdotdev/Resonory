import { browser } from "wxt/browser";
import {
  captionsFromJson3,
  captionTrackUrl,
  type PlayerCaptions,
  youTubeVideoId,
} from "./youtubeCaptions";

/**
 * A YouTube video's plain caption text, read from the tab the User is
 * watching; undefined on any other tab, for a video without captions, and on
 * any failure, so a caption problem never fails the save.
 *
 * Two injections into the page's own (main) world, under the same
 * `activeTab` grant as the page capture, so no host permission is needed:
 * one reads the live player's caption tracks, the other fetches the chosen
 * track same-origin from the page (YouTube's caption endpoint may want what
 * only the page's own player has). Choosing the track and turning it into
 * text happen here, in `lib/youtubeCaptions.ts`, where they're unit-tested.
 */
export async function captureCaptions(tabId: number, pageUrl: string): Promise<string | undefined> {
  if (!youTubeVideoId(pageUrl)) return undefined;
  try {
    const [read] = await browser.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: readPlayerCaptions,
    });
    const player = read?.result as PlayerCaptions | null | undefined;
    const trackUrl = player ? captionTrackUrl(player, pageUrl) : undefined;
    if (!trackUrl) return undefined;

    const [fetched] = await browser.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: fetchCaptionTrack,
      args: [trackUrl],
    });
    const body = fetched?.result as string | null | undefined;
    return body ? captionsFromJson3(body) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Injected into a YouTube tab's main world, so it can call the live player's
 * own `getPlayerResponse()`: `#shorts-player` on a Short, `#movie_player`
 * otherwise. That's the current video's response; the initial-load
 * `ytInitialPlayerResponse` goes stale after in-app navigation (and the
 * caller still checks the response's video id against the tab's).
 * Self-contained (no closures over anything outside itself), like
 * `capturePage`. Null when there's no player or it offers no captions.
 */
export function readPlayerCaptions(): PlayerCaptions | null {
  try {
    const playerId = location.pathname.startsWith("/shorts/") ? "shorts-player" : "movie_player";
    const player = document.getElementById(playerId) as
      (HTMLElement & { getPlayerResponse?: () => unknown }) | null;
    const response = player?.getPlayerResponse?.() as
      | {
          videoDetails?: { videoId?: unknown };
          captions?: {
            playerCaptionsTracklistRenderer?: {
              captionTracks?: { baseUrl?: unknown; languageCode?: unknown; kind?: unknown }[];
            };
          };
        }
      | undefined;
    const videoId = response?.videoDetails?.videoId;
    const tracks = response?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (typeof videoId !== "string" || !Array.isArray(tracks)) return null;
    return {
      videoId,
      language: document.documentElement.lang,
      tracks: tracks
        .filter(
          (track) => typeof track.baseUrl === "string" && typeof track.languageCode === "string",
        )
        .map((track) => ({
          baseUrl: track.baseUrl as string,
          languageCode: track.languageCode as string,
          kind: typeof track.kind === "string" ? track.kind : undefined,
        })),
    };
  } catch {
    return null;
  }
}

/**
 * Injected into a YouTube tab's main world: fetches a caption track
 * same-origin from the page, with its cookies. Self-contained, like
 * `readPlayerCaptions`. Null on any failure.
 */
export async function fetchCaptionTrack(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { credentials: "same-origin" });
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}
