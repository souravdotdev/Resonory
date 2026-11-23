import "reflect-metadata";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { ProcessItemUseCase } from "@/application/use-cases/items/ProcessItemUseCase";
import {
  type Item,
  type ItemMetadata,
  type ItemRef,
  type ItemType,
  NO_METADATA,
  type ReadyItem,
} from "@/domain/entities/Item";
import type { OEmbedLink, PageHead } from "@/domain/entities/PageHead";
import type { IOEmbedProvider, OEmbed } from "@/domain/providers/IOEmbedProvider";
import type { FetchedPage, IUrlFetcher } from "@/domain/providers/IUrlFetcher";
import type { IImageFetcher } from "@/domain/providers/IImageFetcher";
import type { IThumbnailResizer } from "@/domain/providers/IThumbnailResizer";
import type { IThumbnailStore } from "@/domain/providers/IThumbnailStore";
import type { IPageHeadParser } from "@/domain/providers/IPageHeadParser";
import type { IQueueProvider, TagItemRequest } from "@/domain/providers/IQueueProvider";
import type { ITextExtractor } from "@/domain/providers/ITextExtractor";
import type { IItemRepository } from "@/domain/repositories/IItemRepository";
import { HtmlPageParser } from "@/infrastructure/http/HtmlPageParser";
import { ReadabilityTextExtractor } from "@/infrastructure/http/ReadabilityTextExtractor";

const USER_ID = "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
const OTHER_USER_ID = "0b6a1f7e-2c3d-4e5f-8a9b-1c2d3e4f5a6b";
const ITEM_ID = "00000000-0000-4000-8000-000000000001";
const REF = { itemId: ITEM_ID, userId: USER_ID };
// The Item's own Thumbnail key: its User's folder, then the Item.
const ITEM_KEY = "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f/00000000-0000-4000-8000-000000000001.webp";

// An in-memory Item repository holding one Processing Item for USER_ID.
function itemsInMemory(sourceUrl: string) {
  const item: Item &
    Partial<ItemMetadata> & { thumbnailKey?: string | null; text?: string | null } = {
    id: ITEM_ID,
    userId: USER_ID,
    sourceUrl,
    type: null,
    status: "processing",
  };
  const owns = ({ itemId, userId }: ItemRef) => itemId === item.id && userId === item.userId;
  const repository: IItemRepository = {
    findById: vi.fn(async (ref: ItemRef) => (owns(ref) ? { ...item } : null)),
    markReady: vi.fn(async (ref: ItemRef, { type, metadata, thumbnailKey, text }: ReadyItem) => {
      if (owns(ref))
        Object.assign(item, { status: "ready", type, ...metadata, thumbnailKey, text });
    }),
    markFailed: vi.fn(async () => {}),
    findTaggable: vi.fn(async () => null),
    findProcessingBefore: vi.fn(async () => []),
    markFailedIfProcessing: vi.fn(async () => false),
  };
  return { repository, item };
}

// A URL fetcher answering every fetch with the same page.
function fetcherAnswering(page: FetchedPage) {
  return { fetchPage: vi.fn(async (_sourceUrl: string) => page) } satisfies IUrlFetcher;
}

// A URL fetcher whose every fetch fails with `error`.
function fetcherFailing(error: Error) {
  return {
    fetchPage: vi.fn(async (_sourceUrl: string): Promise<FetchedPage> => {
      throw error;
    }),
  } satisfies IUrlFetcher;
}

// An oEmbed provider answering every request with the same answer.
function oEmbedsAnswering(answer: Partial<OEmbed>) {
  return {
    fetchOEmbed: vi.fn(async (_endpointUrl: string): Promise<OEmbed> => ({
      type: null,
      title: null,
      thumbnailUrl: null,
      ...answer,
    })),
  } satisfies IOEmbedProvider;
}

// An oEmbed provider whose every request fails (refused, not JSON, too big …).
function oEmbedsFailing() {
  return {
    fetchOEmbed: vi.fn(async (_endpointUrl: string): Promise<OEmbed> => {
      throw new Error("oEmbed answered 404");
    }),
  } satisfies IOEmbedProvider;
}

const PAGE_URL = "https://example.com/page";

// An answer that says nothing about the page (a 404, a 403 behind a login wall …).
const unsuccessful = (finalUrl = PAGE_URL, status = 404): FetchedPage => ({
  kind: "unsuccessful",
  finalUrl,
  status,
});

// A 2xx answer that isn't HTML, starting with these bytes.
const file = (
  contentType: string | null,
  firstBytes: Uint8Array = new Uint8Array(),
  finalUrl = PAGE_URL,
): FetchedPage => ({ kind: "file", finalUrl, contentType, firstBytes });

// An HTML page whose head declares these meta tags, title and JSON-LD.
const htmlPage = (
  meta: Record<string, string> = {},
  {
    title = null,
    jsonLd = [],
    oEmbedLinks = [],
  }: Partial<Pick<PageHead, "title" | "jsonLd">> & { oEmbedLinks?: OEmbedLink[] } = {},
): FetchedPage => ({
  kind: "html",
  finalUrl: PAGE_URL,
  contentType: "text/html; charset=utf-8",
  head: {
    meta: Object.entries(meta).map(([key, content]) => ({ key, content })),
    title,
    jsonLd,
    oEmbedLinks,
  },
});

const IMAGE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
const CARD_THUMBNAIL = new Uint8Array([0x52, 0x49, 0x46, 0x46, 9, 9]);

// An image fetcher answering every download with IMAGE.
function imagesAnswering() {
  return { fetchImage: vi.fn(async (_url: string) => IMAGE) } satisfies IImageFetcher;
}

// An image fetcher answering IMAGE only for these URLs; any other download is refused.
function imagesAt(...urls: string[]) {
  return {
    fetchImage: vi.fn(async (url: string): Promise<Uint8Array> => {
      if (urls.includes(url)) return IMAGE;
      throw new Error(`Fetching ${url} isn't an accepted image (text/html)`);
    }),
  } satisfies IImageFetcher;
}

// An image fetcher whose every download fails (refused, not an image, over 5 MB …).
function imagesFailing() {
  return {
    fetchImage: vi.fn(async (_url: string): Promise<Uint8Array> => {
      throw new Error("Fetching the image isn't an accepted image (image/svg+xml)");
    }),
  } satisfies IImageFetcher;
}

// A resizer turning every image into CARD_THUMBNAIL.
function resizerAnswering() {
  return {
    toCardThumbnail: vi.fn(async (_image: Uint8Array) => CARD_THUMBNAIL),
  } satisfies IThumbnailResizer;
}

// A resizer that can't decode anything.
function resizerFailing() {
  return {
    toCardThumbnail: vi.fn(async (_image: Uint8Array): Promise<Uint8Array> => {
      throw new Error("Input buffer contains unsupported image format");
    }),
  } satisfies IThumbnailResizer;
}

// A Thumbnail store keeping objects in a Map, by key (so a second put overwrites).
function thumbnailsInMemory() {
  const objects = new Map<string, Uint8Array>();
  const store = {
    put: vi.fn(async (key: string, thumbnail: Uint8Array) => {
      objects.set(key, thumbnail);
    }),
  } satisfies IThumbnailStore;
  return { store, objects };
}

// A Thumbnail store whose every write fails.
function thumbnailsFailing() {
  return {
    put: vi.fn(async (_key: string, _thumbnail: Uint8Array): Promise<void> => {
      throw new Error("Storage answered 500");
    }),
  } satisfies IThumbnailStore;
}

// A Thumbnail store whose first write fails and whose later writes succeed.
function thumbnailsFailingOnce() {
  let writes = 0;
  return {
    put: vi.fn(async (_key: string, _thumbnail: Uint8Array): Promise<void> => {
      if (++writes === 1) throw new Error("Storage answered 500");
    }),
  } satisfies IThumbnailStore;
}

interface ThumbnailPorts {
  images?: IImageFetcher;
  resizer?: IThumbnailResizer;
  store?: IThumbnailStore | null;
}

// A queue recording each Tag Item job it's handed.
function queueRecording() {
  return { enqueueTagItem: vi.fn(async (_request: TagItemRequest) => {}) } satisfies IQueueProvider;
}

// By default without a Thumbnail store, as the worker runs without Supabase Storage.
const useCaseFor = (
  repository: IItemRepository,
  fetcher: IUrlFetcher,
  oEmbeds: IOEmbedProvider = oEmbedsFailing(),
  { images = imagesFailing(), resizer = resizerFailing(), store = null }: ThumbnailPorts = {},
  // The real adapter: deterministic and side-effect free, so tests use it as-is
  // rather than faking it, just like a pure domain rule.
  pageParser: IPageHeadParser = new HtmlPageParser(),
  // The real adapter too, for the same reason.
  textExtractor: ITextExtractor = new ReadabilityTextExtractor(),
  queue: IQueueProvider = queueRecording(),
) =>
  new ProcessItemUseCase(
    repository,
    fetcher,
    oEmbeds,
    images,
    resizer,
    pageParser,
    textExtractor,
    queue,
    store,
  );

const run = (
  sourceUrl: string,
  fetcher: IUrlFetcher,
  oEmbeds: IOEmbedProvider = oEmbedsFailing(),
  thumbnails: ThumbnailPorts = {},
) => {
  const { repository, item } = itemsInMemory(sourceUrl);
  const useCase = useCaseFor(repository, fetcher, oEmbeds, thumbnails);
  return { item, repository, result: useCase.execute(REF) };
};

describe("ProcessItemUseCase, Item type", () => {
  it("marks a saved YouTube link Ready as a Video", async () => {
    const { item, result } = run("https://youtu.be/dQw4w9WgXcQ", fetcherAnswering(htmlPage()));

    await expect(result).resolves.toMatchObject({ outcome: "ready", type: "video" });
    expect(item).toMatchObject({ status: "ready", type: "video" });
  });

  it("fetches every Item, even one a URL rule recognises", async () => {
    const fetcher = fetcherAnswering(htmlPage());

    await run("https://youtu.be/dQw4w9WgXcQ", fetcher).result;

    expect(fetcher.fetchPage).toHaveBeenCalledWith("https://youtu.be/dQw4w9WgXcQ");
  });

  it.each([
    [file("application/pdf"), "pdf"],
    [file("image/webp"), "image"],
    [file("application/octet-stream", Buffer.from("%PDF-1.7")), "pdf"],
    [file("text/plain", Buffer.from("just text")), "link"],
    [htmlPage({}, { jsonLd: [{ "@type": "PodcastEpisode" }] }), "audio"],
    [htmlPage({ "og:type": "article" }), "article"],
    [htmlPage({ "twitter:card": "player" }), "video"],
    [htmlPage({ "og:type": "website" }, { title: "A homepage" }), "link"],
    [unsuccessful(), "link"],
  ] as [FetchedPage, ItemType][])(
    "types a URL no rule recognises by the response (%o → %s)",
    async (page, type) => {
      const fetcher = fetcherAnswering(page);
      const { item, result } = run("https://example.com/page", fetcher);

      await expect(result).resolves.toMatchObject({ outcome: "ready", type });
      expect(fetcher.fetchPage).toHaveBeenCalledWith("https://example.com/page");
      expect(item).toMatchObject({ status: "ready", type });
    },
  );

  it("types a short link by the URL it leads to", async () => {
    const page = { ...htmlPage(), finalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" };

    const { result } = run("https://bit.ly/3xYz", fetcherAnswering(page));

    await expect(result).resolves.toMatchObject({ type: "video" });
  });

  it("types a short link by the URL it leads to even when that page answers vaguely", async () => {
    const page = file(null, new Uint8Array(), "https://example.com/report.pdf");

    const { result } = run("https://t.co/abc123", fetcherAnswering(page));

    await expect(result).resolves.toMatchObject({ type: "pdf" });
  });

  // Each row: what the page says, what it should become, and why.
  it.each([
    [
      "a rule on the pasted URL over the page's JSON-LD",
      "https://github.com/vercel/next.js",
      htmlPage({ "og:type": "article" }, { jsonLd: [{ "@type": "Article" }] }),
      "code",
    ],
    [
      "a rule on the final URL over a rule on the pasted URL",
      "https://github.com/vercel/next.js",
      { ...htmlPage(), finalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
      "video",
    ],
    [
      "a rule on the final URL over the page's JSON-LD",
      "https://lnkd.in/eXyZ",
      {
        ...htmlPage({}, { jsonLd: [{ "@type": "NewsArticle" }] }),
        finalUrl: "https://youtu.be/dQw4w9WgXcQ",
      },
      "video",
    ],
    [
      "JSON-LD over Open Graph",
      "https://example.com/page",
      htmlPage({ "og:type": "article" }, { jsonLd: [{ "@type": "VideoObject" }] }),
      "video",
    ],
    [
      "JSON-LD over a Twitter Card",
      "https://example.com/page",
      htmlPage({ "twitter:card": "player" }, { jsonLd: [{ "@type": "BlogPosting" }] }),
      "article",
    ],
    [
      "Open Graph over a Twitter Card",
      "https://example.com/page",
      htmlPage({ "og:type": "music.song", "twitter:card": "player" }),
      "audio",
    ],
    [
      "Open Graph when JSON-LD declares nothing it knows",
      "https://example.com/page",
      htmlPage({ "og:video": "https://example.com/v.mp4" }, { jsonLd: [{ "@type": "WebPage" }] }),
      "video",
    ],
  ] as [string, string, FetchedPage, ItemType][])(
    "prefers %s",
    async (_case, sourceUrl, page, type) => {
      const { result } = run(sourceUrl, fetcherAnswering(page));

      await expect(result).resolves.toMatchObject({ outcome: "ready", type });
    },
  );

  it("never changes the Source URL", async () => {
    const page = unsuccessful("https://youtu.be/dQw4w9WgXcQ");
    const { item, repository, result } = run("https://bit.ly/3xYz", fetcherAnswering(page));

    await result;

    expect(item.sourceUrl).toBe("https://bit.ly/3xYz");
    expect(repository.markReady).toHaveBeenCalledWith(REF, {
      type: "video",
      metadata: NO_METADATA,
      thumbnailKey: null,
      text: null,
    });
  });
});

describe("ProcessItemUseCase, title and description", () => {
  it("writes the page's title and description to the Item when it becomes Ready", async () => {
    const page = htmlPage(
      { "og:title": "  The   real title ", description: "What it's about" },
      { title: "Site | The real title" },
    );

    const { item, repository, result } = run("https://example.com/page", fetcherAnswering(page));

    const metadata = { title: "The real title", description: "What it's about" };
    await expect(result).resolves.toEqual({
      outcome: "ready",
      type: "link",
      metadata,
      thumbnailKey: null,
      text: null,
    });
    expect(repository.markReady).toHaveBeenCalledWith(REF, {
      type: "link",
      metadata,
      thumbnailKey: null,
      text: null,
    });
    expect(item).toMatchObject({ status: "ready", ...metadata });
  });

  it("gives an Item a URL rule typed the page's title", async () => {
    const page = htmlPage({ "twitter:title": "Never Gonna Give You Up" });

    const { result } = run("https://youtu.be/dQw4w9WgXcQ", fetcherAnswering(page));

    await expect(result).resolves.toEqual({
      outcome: "ready",
      type: "video",
      metadata: { title: "Never Gonna Give You Up", description: null },
      thumbnailKey: null,
      text: null,
    });
  });

  it("reads Open Graph first, then the Twitter Card, then the page title", async () => {
    const page = htmlPage(
      { "twitter:title": "Card title", "og:description": "OG description" },
      { title: "Page title" },
    );

    const { result } = run("https://example.com/page", fetcherAnswering(page));

    await expect(result).resolves.toMatchObject({
      metadata: { title: "Card title", description: "OG description" },
    });
  });

  it("has no title or description for a response that isn't HTML", async () => {
    const page = file("application/pdf");

    const { repository, result } = run("https://example.com/paper", fetcherAnswering(page));

    await result;
    expect(repository.markReady).toHaveBeenCalledWith(REF, {
      type: "pdf",
      metadata: NO_METADATA,
      thumbnailKey: null,
      text: null,
    });
  });
});

const DISCOVERY = {
  url: "https://example.com/oembed?url=page&format=json",
  format: "json",
} as const;

describe("ProcessItemUseCase, oEmbed", () => {
  it("asks the page's oEmbed discovery link, once", async () => {
    const oEmbeds = oEmbedsAnswering({ type: "video" });

    const { result } = run(
      "https://example.com/page",
      fetcherAnswering(
        htmlPage({}, { oEmbedLinks: [DISCOVERY, { ...DISCOVERY, url: "https://example.com/2" }] }),
      ),
      oEmbeds,
    );

    await expect(result).resolves.toMatchObject({ type: "video" });
    expect(oEmbeds.fetchOEmbed).toHaveBeenCalledTimes(1);
    expect(oEmbeds.fetchOEmbed).toHaveBeenCalledWith(DISCOVERY.url);
  });

  it("asks a known provider's endpoint, chosen from the final URL, even behind a login wall", async () => {
    const oEmbeds = oEmbedsAnswering({ type: "rich", title: "A post on X" });
    const page = unsuccessful("https://x.com/someone/status/1234567890", 403);

    const { result } = run("https://t.co/abc123", fetcherAnswering(page), oEmbeds);

    await expect(result).resolves.toEqual({
      outcome: "ready",
      type: "post",
      metadata: { title: "A post on X", description: null },
      thumbnailKey: null,
      text: null,
    });
    expect(oEmbeds.fetchOEmbed).toHaveBeenCalledTimes(1);
    const endpoint = new URL(oEmbeds.fetchOEmbed.mock.calls[0]![0]);
    expect(endpoint.origin + endpoint.pathname).toBe("https://publish.twitter.com/oembed");
    expect(endpoint.searchParams.get("url")).toBe("https://x.com/someone/status/1234567890");
  });

  it.each([
    ["video", {}, "video"],
    ["photo", {}, "image"],
    ["rich", { url: "https://open.spotify.com/oembed?url=x", format: "json" as const }, "audio"],
  ] as const)("types a %s answer ahead of the page's JSON-LD", async (type, link, itemType) => {
    const page = htmlPage(
      { "og:type": "article" },
      { jsonLd: [{ "@type": "Article" }], oEmbedLinks: [{ ...DISCOVERY, ...link }] },
    );

    const { result } = run(
      "https://example.com/page",
      fetcherAnswering(page),
      oEmbedsAnswering({ type }),
    );

    await expect(result).resolves.toMatchObject({ type: itemType });
  });

  it.each([
    ["a link answer", oEmbedsAnswering({ type: "link" })],
    ["a rich answer from an unknown provider", oEmbedsAnswering({ type: "rich" })],
    ["a failed or refused call", oEmbedsFailing()],
  ])("falls through to the page's JSON-LD on %s", async (_case, oEmbeds) => {
    const page = htmlPage({}, { jsonLd: [{ "@type": "NewsArticle" }], oEmbedLinks: [DISCOVERY] });

    const { result } = run("https://example.com/page", fetcherAnswering(page), oEmbeds);

    await expect(result).resolves.toMatchObject({ outcome: "ready", type: "article" });
  });

  it("never lets a rule on the URL be overruled by oEmbed", async () => {
    const page = htmlPage({}, { oEmbedLinks: [DISCOVERY] });

    const { result } = run(
      "https://github.com/vercel/next.js",
      fetcherAnswering(page),
      oEmbedsAnswering({ type: "video" }),
    );

    await expect(result).resolves.toMatchObject({ type: "code" });
  });

  it("prefers the oEmbed title, with the page's description", async () => {
    const page = htmlPage(
      { "og:title": "OG title", "og:description": "OG description" },
      { title: "Page title", oEmbedLinks: [DISCOVERY] },
    );

    const { result } = run(
      "https://example.com/page",
      fetcherAnswering(page),
      oEmbedsAnswering({ type: "link", title: "  oEmbed   title " }),
    );

    await expect(result).resolves.toMatchObject({
      metadata: { title: "oEmbed title", description: "OG description" },
    });
  });

  it.each([
    ["has no title", oEmbedsAnswering({ type: "video", title: " " })],
    ["fails", oEmbedsFailing()],
  ])("reads the page's title when oEmbed %s", async (_case, oEmbeds) => {
    const page = htmlPage({ "og:title": "OG title" }, { oEmbedLinks: [DISCOVERY] });

    const { result } = run("https://example.com/page", fetcherAnswering(page), oEmbeds);

    await expect(result).resolves.toMatchObject({ metadata: { title: "OG title" } });
  });

  it("asks nothing when the page names no endpoint and no provider is known", async () => {
    const oEmbeds = oEmbedsAnswering({ type: "video" });

    const { result } = run("https://example.com/page", fetcherAnswering(htmlPage()), oEmbeds);

    await expect(result).resolves.toMatchObject({ type: "link" });
    expect(oEmbeds.fetchOEmbed).not.toHaveBeenCalled();
  });

  it("asks nothing about a response that isn't HTML", async () => {
    const oEmbeds = oEmbedsAnswering({ type: "video", title: "A title" });
    const page = file("application/pdf", new Uint8Array(), "https://www.youtube.com/watch?v=abc");

    const { result } = run("https://example.com/paper", fetcherAnswering(page), oEmbeds);

    await expect(result).resolves.toMatchObject({ metadata: NO_METADATA });
    expect(oEmbeds.fetchOEmbed).not.toHaveBeenCalled();
  });

  it.each([
    ["times out", new Error("Fetching https://x.com/… timed out after 10000 ms")],
    ["is rate limited", new Error("Fetching https://x.com/… answered 429")],
    ["fails", new Error("Fetching https://x.com/… answered 503")],
    [
      "is refused",
      Object.assign(new Error("x.com resolves to 10.0.0.1"), { name: "UrlRefusedError" }),
    ],
  ])("still asks a known provider, once, when the page fetch %s", async (_case, error) => {
    const oEmbeds = oEmbedsAnswering({ type: "video", title: "  A post   on X " });

    const { item, result } = run(
      "https://x.com/someone/status/1234567890",
      fetcherFailing(error),
      oEmbeds,
    );

    // The URL rule types it; oEmbed only titles it.
    const metadata = { title: "A post on X", description: null };
    await expect(result).resolves.toEqual({
      outcome: "ready",
      type: "post",
      metadata,
      thumbnailKey: null,
      text: null,
    });
    expect(item).toMatchObject({ status: "ready", type: "post", ...metadata });
    expect(oEmbeds.fetchOEmbed).toHaveBeenCalledTimes(1);
    const endpoint = new URL(oEmbeds.fetchOEmbed.mock.calls[0]![0]);
    expect(endpoint.origin + endpoint.pathname).toBe("https://publish.twitter.com/oembed");
    expect(endpoint.searchParams.get("url")).toBe("https://x.com/someone/status/1234567890");
  });

  it("marks a typed Item Ready without a title when the page fetch and oEmbed both fail", async () => {
    const { result } = run(
      "https://youtu.be/dQw4w9WgXcQ",
      fetcherFailing(new Error("offline")),
      oEmbedsFailing(),
    );

    await expect(result).resolves.toEqual({
      outcome: "ready",
      type: "video",
      metadata: NO_METADATA,
      thumbnailKey: null,
      text: null,
    });
  });

  it.each([
    ["a typed Item without a known provider", "https://github.com/vercel/next.js"],
    ["an untyped Item", "https://bit.ly/3xYz"],
  ])("asks nothing about %s when the page fetch fails", async (_case, sourceUrl) => {
    const oEmbeds = oEmbedsAnswering({ type: "video", title: "A title" });

    const { result } = run(sourceUrl, fetcherFailing(new Error("offline")), oEmbeds);

    await result.catch(() => {});
    expect(oEmbeds.fetchOEmbed).not.toHaveBeenCalled();
  });
});

describe("ProcessItemUseCase, failed fetches", () => {
  it.each([
    ["fails", new Error("Fetching https://youtu.be/dQw4w9WgXcQ answered 503")],
    [
      "is refused",
      Object.assign(new Error("youtu.be resolves to 10.0.0.1"), { name: "UrlRefusedError" }),
    ],
    ["times out", new Error("Fetching https://youtu.be/dQw4w9WgXcQ timed out after 10000 ms")],
  ])(
    "marks an Item a URL rule typed Ready without a title when the fetch %s",
    async (_case, error) => {
      const { item, repository, result } = run(
        "https://youtu.be/dQw4w9WgXcQ",
        fetcherFailing(error),
      );

      await expect(result).resolves.toEqual({
        outcome: "ready",
        type: "video",
        metadata: NO_METADATA,
        thumbnailKey: null,
        text: null,
      });
      expect(repository.markReady).toHaveBeenCalledWith(REF, {
        type: "video",
        metadata: NO_METADATA,
        thumbnailKey: null,
        text: null,
      });
      expect(item).toMatchObject({ status: "ready", type: "video", title: null });
    },
  );

  it("fails an untyped Item when the fetch fails, so the job is retried (then Failed as a Link)", async () => {
    const { item, repository, result } = run(
      "http://127.0.0.1:4000/health",
      fetcherFailing(new Error("127.0.0.1 isn't public")),
    );

    await expect(result).rejects.toThrow("127.0.0.1 isn't public");
    expect(repository.markReady).not.toHaveBeenCalled();
    expect(item).toMatchObject({ status: "processing", type: null });
  });

  it("fails when the Item can't be marked Ready, so the job is retried", async () => {
    const { repository } = itemsInMemory("https://youtu.be/dQw4w9WgXcQ");
    repository.markReady = vi.fn(async () => {
      throw new Error("Postgres is down");
    });
    const useCase = useCaseFor(repository, fetcherFailing(new Error("offline")));

    await expect(useCase.execute(REF)).rejects.toThrow("Postgres is down");
  });
});

describe("ProcessItemUseCase, missing Items", () => {
  it("does nothing for an Item that no longer exists", async () => {
    const { repository } = itemsInMemory("https://youtu.be/dQw4w9WgXcQ");
    const fetcher = fetcherAnswering(htmlPage());
    const useCase = useCaseFor(repository, fetcher);

    const result = await useCase.execute({
      itemId: "00000000-0000-4000-8000-000000000099",
      userId: USER_ID,
    });

    expect(result).toEqual({ outcome: "missing" });
    expect(fetcher.fetchPage).not.toHaveBeenCalled();
    expect(repository.markReady).not.toHaveBeenCalled();
  });

  it("never touches another User's Item", async () => {
    const { repository, item } = itemsInMemory("https://youtu.be/dQw4w9WgXcQ");
    const useCase = useCaseFor(repository, fetcherAnswering(htmlPage()));

    const result = await useCase.execute({ itemId: ITEM_ID, userId: OTHER_USER_ID });

    expect(result).toEqual({ outcome: "missing" });
    expect(item).toMatchObject({ status: "processing", type: null });
  });
});

describe("ProcessItemUseCase, Items that are already Ready", () => {
  it("leaves a Ready Item alone: no fetch, no write, no Tag Item job", async () => {
    const { repository, item } = itemsInMemory("https://example.com/page");
    item.status = "ready";
    item.type = "article";
    const fetcher = fetcherAnswering(htmlPage({ "og:title": "A new title" }));
    const queue = queueRecording();
    const useCase = useCaseFor(
      repository,
      fetcher,
      oEmbedsFailing(),
      {},
      undefined,
      undefined,
      queue,
    );

    const result = await useCase.execute(REF);

    expect(result).toEqual({ outcome: "already_ready" });
    expect(fetcher.fetchPage).not.toHaveBeenCalled();
    expect(repository.markReady).not.toHaveBeenCalled();
    expect(queue.enqueueTagItem).not.toHaveBeenCalled();
  });

  it("still runs a Failed Item to Ready", async () => {
    const { repository, item } = itemsInMemory("https://example.com/page");
    item.status = "failed";
    item.type = "link";
    const queue = queueRecording();
    const useCase = useCaseFor(
      repository,
      fetcherAnswering(htmlPage({ "og:title": "Found at last" })),
      oEmbedsFailing(),
      {},
      undefined,
      undefined,
      queue,
    );

    const result = await useCase.execute(REF);

    expect(result).toMatchObject({ outcome: "ready" });
    expect(item.status).toBe("ready");
    expect(queue.enqueueTagItem).toHaveBeenCalledOnce();
  });

  it("still runs a Processing Item to Ready", async () => {
    const { repository, item } = itemsInMemory("https://example.com/page");
    const useCase = useCaseFor(repository, fetcherAnswering(htmlPage()));

    const result = await useCase.execute(REF);

    expect(result).toMatchObject({ outcome: "ready" });
    expect(item.status).toBe("ready");
  });
});

describe("ProcessItemUseCase, Thumbnail", () => {
  const PHOTO_URL = "https://cdn.example.com/photos/sunset.png";
  const photo = () =>
    fetcherAnswering(file("image/png", new Uint8Array([0x89, 0x50, 0x4e, 0x47]), PHOTO_URL));

  it("keeps an Image Item's image, resized, as its Thumbnail, at the Item's own key", async () => {
    const images = imagesAnswering();
    const resizer = resizerAnswering();
    const { store, objects } = thumbnailsInMemory();

    const { item, repository, result } = run("https://example.com/sunset", photo(), undefined, {
      images,
      resizer,
      store,
    });

    await expect(result).resolves.toEqual({
      outcome: "ready",
      type: "image",
      metadata: NO_METADATA,
      thumbnailKey: ITEM_KEY,
      text: null,
    });
    // Downloaded from where the Source URL led, then resized, then stored.
    expect(images.fetchImage).toHaveBeenCalledWith(PHOTO_URL);
    expect(resizer.toCardThumbnail).toHaveBeenCalledWith(IMAGE);
    expect(objects).toEqual(new Map([[ITEM_KEY, CARD_THUMBNAIL]]));
    // In the same update as its type, title and description.
    expect(repository.markReady).toHaveBeenCalledTimes(1);
    expect(repository.markReady).toHaveBeenCalledWith(REF, {
      type: "image",
      metadata: NO_METADATA,
      thumbnailKey: ITEM_KEY,
      text: null,
    });
    expect(item).toMatchObject({ status: "ready", type: "image", thumbnailKey: ITEM_KEY });
  });

  it("overwrites only the Item's own Thumbnail when the same Item is processed again", async () => {
    // Another User's Item saved from the same URL, whose Thumbnail is already stored.
    const OTHER_ITEM_KEY = `${OTHER_USER_ID}/00000000-0000-4000-8000-000000000002.webp`;
    const THEIR_THUMBNAIL = new Uint8Array([2, 2, 2]);
    const { repository, item } = itemsInMemory("https://example.com/sunset");
    const { store, objects } = thumbnailsInMemory();
    objects.set(OTHER_ITEM_KEY, THEIR_THUMBNAIL);
    const useCase = useCaseFor(repository, photo(), undefined, {
      images: imagesAnswering(),
      resizer: resizerAnswering(),
      store,
    });

    await useCase.execute(REF);
    // A Ready Item is left alone, so this is an Item that is still Processing again.
    item.status = "processing";
    await useCase.execute(REF);

    expect(store.put).toHaveBeenCalledTimes(2);
    expect(store.put.mock.calls.map(([key]) => key)).toEqual([ITEM_KEY, ITEM_KEY]);
    expect(objects).toEqual(
      new Map([
        [OTHER_ITEM_KEY, THEIR_THUMBNAIL],
        [ITEM_KEY, CARD_THUMBNAIL],
      ]),
    );
  });

  it("keys the Thumbnail by the loaded Item's owner and id, not the job's", async () => {
    const { repository, item } = itemsInMemory("https://example.com/sunset");
    // A repository that loads the row whatever User the job names, as if a payload were ever off.
    vi.mocked(repository.findById).mockImplementation(async () => ({ ...item }));
    const { store, objects } = thumbnailsInMemory();
    const useCase = useCaseFor(repository, photo(), undefined, {
      images: imagesAnswering(),
      resizer: resizerAnswering(),
      store,
    });

    await useCase.execute({ itemId: ITEM_ID, userId: OTHER_USER_ID });

    expect([...objects.keys()]).toEqual([ITEM_KEY]);
  });

  it.each([
    ["a PDF", file("application/pdf", Buffer.from("%PDF-1.7"))],
    ["an unsuccessful answer", unsuccessful()],
  ])("keeps no Thumbnail for %s, which offers no image", async (_case, page) => {
    const images = imagesAnswering();

    const { result } = run("https://example.com/page", fetcherAnswering(page), undefined, {
      images,
      resizer: resizerAnswering(),
      store: thumbnailsInMemory().store,
    });

    await expect(result).resolves.toMatchObject({ outcome: "ready", thumbnailKey: null });
    expect(images.fetchImage).not.toHaveBeenCalled();
  });

  it("downloads no image for an Image Item whose fetch failed", async () => {
    const images = imagesAnswering();

    const { result } = run(
      "https://example.com/sunset.png",
      fetcherFailing(new Error("offline")),
      undefined,
      { images, resizer: resizerAnswering(), store: thumbnailsInMemory().store },
    );

    await expect(result).resolves.toMatchObject({
      outcome: "ready",
      type: "image",
      thumbnailKey: null,
    });
    expect(images.fetchImage).not.toHaveBeenCalled();
  });

  it.each([
    ["the download is refused or fails", { images: imagesFailing() }],
    ["the image can't be decoded or resized", { resizer: resizerFailing() }],
    ["the upload fails", { store: thumbnailsFailing() }],
  ])("still marks an Image Item Ready, without a Thumbnail, when %s", async (_case, failing) => {
    const { item, repository, result } = run("https://example.com/sunset", photo(), undefined, {
      images: imagesAnswering(),
      resizer: resizerAnswering(),
      store: thumbnailsInMemory().store,
      ...failing,
    });

    await expect(result).resolves.toEqual({
      outcome: "ready",
      type: "image",
      metadata: NO_METADATA,
      thumbnailKey: null,
      text: null,
    });
    expect(repository.markReady).toHaveBeenCalledWith(REF, {
      type: "image",
      metadata: NO_METADATA,
      thumbnailKey: null,
      text: null,
    });
    expect(item).toMatchObject({ status: "ready", thumbnailKey: null });
  });

  it("downloads no image without a Thumbnail store", async () => {
    const images = imagesAnswering();
    const { result } = run("https://example.com/sunset", photo(), undefined, {
      images,
      resizer: resizerAnswering(),
      store: null,
    });

    await expect(result).resolves.toMatchObject({
      outcome: "ready",
      type: "image",
      thumbnailKey: null,
    });
    expect(images.fetchImage).not.toHaveBeenCalled();
  });
});

describe("ProcessItemUseCase, a page's Thumbnail", () => {
  const OG_IMAGE = "https://cdn.example.com/cover.jpg";
  const TWITTER_IMAGE = "https://cdn.example.com/card.png";
  const thumbnails = (images: IImageFetcher) => ({
    images,
    resizer: resizerAnswering(),
    store: thumbnailsInMemory().store,
  });

  it("keeps an article's og:image as its Thumbnail", async () => {
    const images = imagesAt(OG_IMAGE);
    const page = htmlPage({ "og:type": "article", "og:image": OG_IMAGE });

    const { item, repository, result } = run(
      "https://example.com/page",
      fetcherAnswering(page),
      undefined,
      thumbnails(images),
    );

    await expect(result).resolves.toMatchObject({
      outcome: "ready",
      type: "article",
      thumbnailKey: ITEM_KEY,
    });
    expect(images.fetchImage).toHaveBeenCalledWith(OG_IMAGE);
    expect(repository.markReady).toHaveBeenCalledWith(REF, {
      type: "article",
      metadata: NO_METADATA,
      thumbnailKey: ITEM_KEY,
      text: null,
    });
    expect(item).toMatchObject({ status: "ready", thumbnailKey: ITEM_KEY });
  });

  it("keeps a page's twitter:image when it has no og:image", async () => {
    const images = imagesAt(TWITTER_IMAGE);
    const page = htmlPage({ "twitter:image": TWITTER_IMAGE });

    const { result } = run(
      "https://example.com/page",
      fetcherAnswering(page),
      undefined,
      thumbnails(images),
    );

    await expect(result).resolves.toMatchObject({ outcome: "ready", thumbnailKey: ITEM_KEY });
    expect(images.fetchImage).toHaveBeenCalledWith(TWITTER_IMAGE);
  });

  it("prefers og:image over twitter:image", async () => {
    const images = imagesAt(OG_IMAGE, TWITTER_IMAGE);
    const page = htmlPage({ "twitter:image": TWITTER_IMAGE, "og:image": OG_IMAGE });

    const { result } = run(
      "https://example.com/page",
      fetcherAnswering(page),
      undefined,
      thumbnails(images),
    );

    await expect(result).resolves.toMatchObject({ thumbnailKey: ITEM_KEY });
    expect(images.fetchImage.mock.calls).toEqual([[OG_IMAGE]]);
  });

  it("falls through to twitter:image when og:image is refused", async () => {
    const images = imagesAt(TWITTER_IMAGE);
    const page = htmlPage({ "og:image": OG_IMAGE, "twitter:image": TWITTER_IMAGE });

    const { result } = run(
      "https://example.com/page",
      fetcherAnswering(page),
      undefined,
      thumbnails(images),
    );

    await expect(result).resolves.toMatchObject({ outcome: "ready", thumbnailKey: ITEM_KEY });
    expect(images.fetchImage.mock.calls).toEqual([[OG_IMAGE], [TWITTER_IMAGE]]);
  });

  it("falls through to twitter:image when keeping og:image's Thumbnail fails", async () => {
    const images = imagesAt(OG_IMAGE, TWITTER_IMAGE);
    const store = thumbnailsFailingOnce();
    const page = htmlPage({ "og:image": OG_IMAGE, "twitter:image": TWITTER_IMAGE });

    const { item, result } = run("https://example.com/page", fetcherAnswering(page), undefined, {
      images,
      resizer: resizerAnswering(),
      store,
    });

    await expect(result).resolves.toMatchObject({ outcome: "ready", thumbnailKey: ITEM_KEY });
    expect(images.fetchImage.mock.calls).toEqual([[OG_IMAGE], [TWITTER_IMAGE]]);
    expect(store.put).toHaveBeenCalledTimes(2);
    expect(item).toMatchObject({ status: "ready", thumbnailKey: ITEM_KEY });
  });

  it("resolves a relative og:image against the URL the page was fetched from, after redirects", async () => {
    const images = imagesAt("https://www.example.org/cover.jpg");
    const page = {
      ...htmlPage({ "og:image": "/cover.jpg" }),
      finalUrl: "https://www.example.org/news/story",
    };

    const { result } = run(
      "https://bit.ly/3xYz",
      fetcherAnswering(page),
      undefined,
      thumbnails(images),
    );

    await expect(result).resolves.toMatchObject({
      thumbnailKey: ITEM_KEY,
    });
    expect(images.fetchImage).toHaveBeenCalledWith("https://www.example.org/cover.jpg");
  });

  it.each([
    ["no image tags", htmlPage({ "og:type": "article" })],
    ["only values that aren't http(s)", htmlPage({ "og:image": "data:image/png;base64,iVBO" })],
  ])("marks a page with %s Ready without a Thumbnail", async (_case, page) => {
    const images = imagesAnswering();

    const { result } = run(
      "https://example.com/page",
      fetcherAnswering(page),
      undefined,
      thumbnails(images),
    );

    await expect(result).resolves.toMatchObject({ outcome: "ready", thumbnailKey: null });
    expect(images.fetchImage).not.toHaveBeenCalled();
  });

  it("marks a page Ready without a Thumbnail when every offered image fails", async () => {
    const page = htmlPage({ "og:image": OG_IMAGE, "twitter:image": TWITTER_IMAGE });

    const { repository, result } = run(
      "https://example.com/page",
      fetcherAnswering(page),
      undefined,
      thumbnails(imagesFailing()),
    );

    await expect(result).resolves.toMatchObject({ outcome: "ready", thumbnailKey: null });
    expect(repository.markReady).toHaveBeenCalledWith(REF, {
      type: "link",
      metadata: NO_METADATA,
      thumbnailKey: null,
      text: null,
    });
  });
});

describe("ProcessItemUseCase, the oEmbed Thumbnail", () => {
  const OEMBED_IMAGE = "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg";
  const OG_IMAGE = "https://cdn.example.com/cover.jpg";
  const thumbnails = (images: IImageFetcher) => ({
    images,
    resizer: resizerAnswering(),
    store: thumbnailsInMemory().store,
  });

  it("keeps a saved YouTube video's oEmbed thumbnail as its Thumbnail", async () => {
    const images = imagesAt(OEMBED_IMAGE);
    const oEmbeds = oEmbedsAnswering({ type: "video", thumbnailUrl: OEMBED_IMAGE });

    const video = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const page = { ...htmlPage({ "og:image": OG_IMAGE }), finalUrl: video };

    const { item, result } = run(video, fetcherAnswering(page), oEmbeds, thumbnails(images));

    await expect(result).resolves.toMatchObject({
      outcome: "ready",
      type: "video",
      thumbnailKey: ITEM_KEY,
    });
    expect(images.fetchImage).toHaveBeenCalledWith(OEMBED_IMAGE);
    expect(item).toMatchObject({ status: "ready", thumbnailKey: ITEM_KEY });
    expect(oEmbeds.fetchOEmbed).toHaveBeenCalledTimes(1);
  });

  it("prefers the oEmbed thumbnail over og:image", async () => {
    const images = imagesAt(OEMBED_IMAGE, OG_IMAGE);
    const page = htmlPage({ "og:image": OG_IMAGE }, { oEmbedLinks: [DISCOVERY] });

    const { result } = run(
      "https://example.com/page",
      fetcherAnswering(page),
      oEmbedsAnswering({ type: "video", thumbnailUrl: OEMBED_IMAGE }),
      thumbnails(images),
    );

    await expect(result).resolves.toMatchObject({ thumbnailKey: ITEM_KEY });
    expect(images.fetchImage.mock.calls).toEqual([[OEMBED_IMAGE]]);
  });

  it("falls through to og:image when the oEmbed thumbnail is refused", async () => {
    const images = imagesAt(OG_IMAGE);
    const page = htmlPage({ "og:image": OG_IMAGE }, { oEmbedLinks: [DISCOVERY] });

    const { result } = run(
      "https://example.com/page",
      fetcherAnswering(page),
      oEmbedsAnswering({ type: "video", thumbnailUrl: OEMBED_IMAGE }),
      thumbnails(images),
    );

    await expect(result).resolves.toMatchObject({
      outcome: "ready",
      thumbnailKey: ITEM_KEY,
    });
    expect(images.fetchImage.mock.calls).toEqual([[OEMBED_IMAGE], [OG_IMAGE]]);
  });

  it("keeps a typed Item's oEmbed thumbnail under the Item's own key even when its page fetch fails", async () => {
    const cover = "https://i.scdn.co/image/ab67616d00001e02";
    const images = imagesAt(cover);
    const oEmbeds = oEmbedsAnswering({ type: "rich", title: "A track", thumbnailUrl: cover });
    const sourceUrl = "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC";
    const { store, objects } = thumbnailsInMemory();

    const { item, result } = run(sourceUrl, fetcherFailing(new Error("offline")), oEmbeds, {
      images,
      resizer: resizerAnswering(),
      store,
    });

    await expect(result).resolves.toEqual({
      outcome: "ready",
      type: "audio",
      metadata: { title: "A track", description: null },
      thumbnailKey: ITEM_KEY,
      text: null,
    });
    expect(images.fetchImage).toHaveBeenCalledWith(cover);
    expect(objects).toEqual(new Map([[ITEM_KEY, CARD_THUMBNAIL]]));
    expect(item).toMatchObject({ status: "ready", thumbnailKey: ITEM_KEY });
    expect(oEmbeds.fetchOEmbed).toHaveBeenCalledTimes(1);
  });
});

describe("ProcessItemUseCase, nothing shared across saves", () => {
  const OTHER_ITEM_ID = "00000000-0000-4000-8000-000000000002";
  const OTHER_REF = { itemId: OTHER_ITEM_ID, userId: OTHER_USER_ID };

  // An in-memory Item repository holding two Processing Items saved from the same URL:
  // ITEM_ID for USER_ID and OTHER_ITEM_ID for OTHER_USER_ID.
  function twoItemsInMemory(sourceUrl: string) {
    const mine = itemsInMemory(sourceUrl);
    const theirs = itemsInMemory(sourceUrl);
    Object.assign(theirs.item, { id: OTHER_ITEM_ID, userId: OTHER_USER_ID });
    const holding = (ref: ItemRef) =>
      ref.itemId === OTHER_ITEM_ID ? theirs.repository : mine.repository;
    const repository: IItemRepository = {
      ...mine.repository,
      findById: vi.fn(async (ref: ItemRef) => holding(ref).findById(ref)),
      markReady: vi.fn(async (ref: ItemRef, ready: ReadyItem) =>
        holding(ref).markReady(ref, ready),
      ),
    };
    return { repository, mine: mine.item, theirs: theirs.item };
  }

  // One use case for both saves, as one worker process runs them.
  const useCaseWith = (
    repository: IItemRepository,
    fetcher: IUrlFetcher,
    oEmbeds: IOEmbedProvider,
    { images, resizer, store }: Required<ThumbnailPorts>,
  ) =>
    new ProcessItemUseCase(
      repository,
      fetcher,
      oEmbeds,
      images,
      resizer,
      new HtmlPageParser(),
      new ReadabilityTextExtractor(),
      queueRecording(),
      store,
    );

  it("runs a second save of the same URL in full: oEmbed asked and the image downloaded again", async () => {
    const page = htmlPage(
      { "og:type": "article", "og:image": "https://cdn.example.com/a.jpg" },
      { oEmbedLinks: [{ url: "https://example.com/oembed?url=page", format: "json" }] },
    );
    const { repository, mine, theirs } = twoItemsInMemory(PAGE_URL);
    const oEmbeds = oEmbedsAnswering({ title: "From oEmbed" });
    const images = imagesAnswering();
    const { store } = thumbnailsInMemory();
    const useCase = useCaseWith(repository, fetcherAnswering(page), oEmbeds, {
      images,
      resizer: resizerAnswering(),
      store,
    });

    await useCase.execute(REF);
    await useCase.execute(OTHER_REF);

    expect(oEmbeds.fetchOEmbed).toHaveBeenCalledTimes(2);
    expect(images.fetchImage).toHaveBeenCalledTimes(2);
    expect(store.put).toHaveBeenCalledTimes(2);
    expect(mine).toMatchObject({ status: "ready", type: "article", title: "From oEmbed" });
    expect(theirs).toMatchObject({ status: "ready", type: "article", title: "From oEmbed" });
  });

  it("keeps two Users' Items saved from the same URL each at their own key, each with the picture from their own captured page", async () => {
    const OTHER_ITEM_KEY =
      "0b6a1f7e-2c3d-4e5f-8a9b-1c2d3e4f5a6b/00000000-0000-4000-8000-000000000002.webp";
    const captured = (image: string) =>
      `<!doctype html><html><head><meta property="og:image" content="${image}"></head><body></body></html>`;
    const MY_IMAGE = new Uint8Array([1, 1, 1]);
    const THEIR_IMAGE = new Uint8Array([2, 2, 2]);
    const images = {
      fetchImage: vi.fn(async (url: string) =>
        url === "https://cdn.example.com/mine.jpg" ? MY_IMAGE : THEIR_IMAGE,
      ),
    } satisfies IImageFetcher;
    // A resizer that keeps each picture as it is, so each stored object shows whose picture it is.
    const resizer = {
      toCardThumbnail: vi.fn(async (image: Uint8Array) => image),
    } satisfies IThumbnailResizer;
    const { repository, mine, theirs } = twoItemsInMemory(PAGE_URL);
    const { store, objects } = thumbnailsInMemory();
    const useCase = useCaseWith(
      repository,
      fetcherFailing(new Error("must not be called")),
      oEmbedsFailing(),
      { images, resizer, store },
    );

    await useCase.execute({ ...REF, html: captured("https://cdn.example.com/mine.jpg") });
    await useCase.execute({ ...OTHER_REF, html: captured("https://cdn.example.com/theirs.jpg") });

    expect(mine).toMatchObject({ status: "ready", thumbnailKey: ITEM_KEY });
    expect(theirs).toMatchObject({ status: "ready", thumbnailKey: OTHER_ITEM_KEY });
    expect(objects).toEqual(
      new Map([
        [ITEM_KEY, MY_IMAGE],
        [OTHER_ITEM_KEY, THEIR_IMAGE],
      ]),
    );
  });

  it("gives two Users' Items saved from the same URL each the title and description of their own captured page", async () => {
    const captured = (title: string, description: string) => `
      <!doctype html>
      <html>
        <head>
          <title>${title}</title>
          <meta name="description" content="${description}">
        </head>
        <body>Ignored.</body>
      </html>
    `;
    const { repository, mine, theirs } = twoItemsInMemory(PAGE_URL);
    const useCase = useCaseWith(
      repository,
      fetcherFailing(new Error("must not be called")),
      oEmbedsFailing(),
      {
        images: imagesFailing(),
        resizer: resizerFailing(),
        store: thumbnailsInMemory().store,
      },
    );

    await useCase.execute({ ...REF, html: captured("Inbox (3) – my subject", "My private inbox") });
    await useCase.execute({ ...OTHER_REF, html: captured("Sign in", "Sign in to continue") });

    expect(mine).toMatchObject({
      status: "ready",
      title: "Inbox (3) – my subject",
      description: "My private inbox",
    });
    expect(theirs).toMatchObject({
      status: "ready",
      title: "Sign in",
      description: "Sign in to continue",
    });
  });
});

describe("ProcessItemUseCase, supplied content", () => {
  const OG_IMAGE = "https://cdn.example.com/cover.jpg";
  const htmlContent = (
    {
      title = "Page title",
      ogTitle,
      ogDescription,
      ogImage,
    }: Record<string, string | undefined> = {
      ogTitle: "The real title",
      ogDescription: "What it's about",
      ogImage: OG_IMAGE,
    },
  ) => `
    <!doctype html>
    <html>
      <head>
        <title>${title}</title>
        <meta property="og:type" content="article">
        ${ogTitle ? `<meta property="og:title" content="${ogTitle}">` : ""}
        ${ogDescription ? `<meta property="og:description" content="${ogDescription}">` : ""}
        ${ogImage ? `<meta property="og:image" content="${ogImage}">` : ""}
      </head>
      <body>Ignored.</body>
    </html>
  `;

  it("resolves title, description and thumbnail from supplied HTML, never touching the network fetcher", async () => {
    const fetcher = fetcherAnswering(htmlPage());
    const images = imagesAt(OG_IMAGE);
    const resizer = resizerAnswering();
    const { store, objects } = thumbnailsInMemory();
    const { repository, item } = itemsInMemory("https://example.com/page");
    const useCase = useCaseFor(repository, fetcher, undefined, { images, resizer, store });

    const result = useCase.execute({ ...REF, html: htmlContent() });

    await expect(result).resolves.toMatchObject({
      outcome: "ready",
      type: "article",
      metadata: { title: "The real title", description: "What it's about" },
      thumbnailKey: ITEM_KEY,
    });
    expect(fetcher.fetchPage).not.toHaveBeenCalled();
    expect(images.fetchImage).toHaveBeenCalledWith(OG_IMAGE);
    expect(objects.size).toBe(1);
    expect(item).toMatchObject({
      status: "ready",
      title: "The real title",
      description: "What it's about",
    });
  });

  it("never calls the network fetcher at all when content is supplied", async () => {
    const fetcher = fetcherAnswering(htmlPage());
    const { repository } = itemsInMemory("https://example.com/page");
    const useCase = useCaseFor(repository, fetcher);

    await useCase.execute({ ...REF, html: htmlContent() });

    expect(fetcher.fetchPage).not.toHaveBeenCalled();
  });

  it("resolves full metadata from supplied HTML even for a URL a real fetch would 403 (issue #137)", async () => {
    const fetcher = fetcherFailing(new Error("Fetching https://medium.com/… answered 403"));
    const { repository, item } = itemsInMemory("https://medium.com/@someone/a-post");
    const useCase = useCaseFor(repository, fetcher);

    const result = useCase.execute({
      itemId: ITEM_ID,
      userId: USER_ID,
      html: htmlContent({ ogTitle: "A Medium post", ogDescription: "Behind Cloudflare" }),
    });

    await expect(result).resolves.toMatchObject({
      outcome: "ready",
      metadata: { title: "A Medium post", description: "Behind Cloudflare" },
    });
    expect(fetcher.fetchPage).not.toHaveBeenCalled();
    expect(item).toMatchObject({ status: "ready", title: "A Medium post" });
  });

  it("still types supplied content by JSON-LD, like a fetched page", async () => {
    const { repository } = itemsInMemory("https://example.com/page");
    const useCase = useCaseFor(repository, fetcherFailing(new Error("must not be called")));
    const html = `
      <!doctype html>
      <html>
        <head>
          <script type="application/ld+json">{"@type": "PodcastEpisode"}</script>
        </head>
      </html>
    `;

    const result = useCase.execute({ ...REF, html });

    await expect(result).resolves.toMatchObject({ outcome: "ready", type: "audio" });
  });

  it("behaves exactly as today when no content is supplied (no regression)", async () => {
    const { item, result } = run("https://youtu.be/dQw4w9WgXcQ", fetcherAnswering(htmlPage()));

    await expect(result).resolves.toMatchObject({ outcome: "ready", type: "video" });
    expect(item).toMatchObject({ status: "ready", type: "video" });
  });
});

describe("ProcessItemUseCase, Text", () => {
  const ARTICLE_URL = "https://example.com/blog/a-long-read";
  // Paragraphs long enough that the page reads as having main content.
  const PARAGRAPHS = [
    "The first paragraph of the article explains, at some length, why the topic matters to anyone who has ever tried to keep track of everything they read on the web across many devices.",
    "The second paragraph goes deeper, walking through the history of bookmarks, read-later services and note-taking apps, and where each of them fell short for people with large libraries.",
    "The third paragraph closes the argument, suggesting that a library which understands what each saved page is about would make finding things again far easier than folders ever did.",
  ];
  const articlePage = (paragraphs: string[] = PARAGRAPHS) => `
    <!doctype html>
    <html>
      <head>
        <title>A long read</title>
        <meta property="og:type" content="article">
        <meta property="og:title" content="A long read">
      </head>
      <body>
        <nav><a href="/">Home</a> <a href="/about">About the site navigation</a></nav>
        <aside class="sidebar">Sidebar: popular posts you might also like</aside>
        <article>
          <h1>A long read</h1>
          ${paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("\n")}
        </article>
        <footer>Footer: copyright and contact links</footer>
      </body>
    </html>
  `;

  const processCaptured = (html: string, sourceUrl = ARTICLE_URL, ports: Ports = {}) =>
    processJob({ html }, sourceUrl, ports);

  const processJob = (
    job: { html?: string; captions?: string },
    sourceUrl = ARTICLE_URL,
    ports: Ports = {},
  ) => {
    const { repository, item } = itemsInMemory(sourceUrl);
    const useCase = useCaseFor(
      repository,
      fetcherFailing(new Error("must not be called")),
      undefined,
      ports.thumbnails ?? {},
      undefined,
      ports.textExtractor,
    );
    return { item, result: useCase.execute({ ...REF, ...job }) };
  };

  it("fills an article's Text with its body, without navigation, footer or sidebar text", async () => {
    const { item, result } = processCaptured(articlePage());

    await expect(result).resolves.toMatchObject({ outcome: "ready", type: "article" });
    for (const paragraph of PARAGRAPHS) expect(item.text).toContain(paragraph);
    expect(item.text).not.toMatch(/navigation|Sidebar|Footer/);
  });

  it("keeps the article's paragraphs apart, one blank line between them", async () => {
    const { item, result } = processCaptured(articlePage());

    await result;

    expect(item.text).toContain(`${PARAGRAPHS[0]}\n\n${PARAGRAPHS[1]}\n\n${PARAGRAPHS[2]}`);
  });

  it("leaves a homepage with no main content Ready with no Text", async () => {
    const homepage = `
      <!doctype html>
      <html>
        <head><title>Example</title><meta property="og:type" content="website"></head>
        <body>
          <nav><a href="/">Home</a> <a href="/products">Products</a> <a href="/pricing">Pricing</a></nav>
          <ul>
            <li><a href="/a">Product A</a></li>
            <li><a href="/b">Product B</a></li>
          </ul>
          <footer>© Example Inc.</footer>
        </body>
      </html>
    `;

    const { item, result } = processCaptured(homepage, "https://example.com/");

    await expect(result).resolves.toMatchObject({ outcome: "ready", type: "link", text: null });
    expect(item).toMatchObject({ status: "ready", title: "Example", text: null });
  });

  it("leaves an Item Ready with its type, title, description and Thumbnail, and no Text, when the extractor throws", async () => {
    const throwing: ITextExtractor = {
      extractText: () => {
        throw new Error("linkedom choked on the page");
      },
    };
    const OG_IMAGE = "https://cdn.example.com/cover.jpg";
    const html = articlePage().replace(
      "</head>",
      `<meta property="og:description" content="Why it matters"><meta property="og:image" content="${OG_IMAGE}"></head>`,
    );
    const { store } = thumbnailsInMemory();

    const { item, result } = processCaptured(html, ARTICLE_URL, {
      textExtractor: throwing,
      thumbnails: { images: imagesAt(OG_IMAGE), resizer: resizerAnswering(), store },
    });

    await expect(result).resolves.toMatchObject({
      outcome: "ready",
      type: "article",
      metadata: { title: "A long read", description: "Why it matters" },
      thumbnailKey: ITEM_KEY,
      text: null,
    });
    expect(item).toMatchObject({ status: "ready", type: "article", text: null });
  });

  it("hands back the extractor's error, so the failure is logged rather than lost", async () => {
    const failure = new Error("linkedom choked on the page");
    const throwing: ITextExtractor = {
      extractText: () => {
        throw failure;
      },
    };

    const { result } = processCaptured(articlePage(), ARTICLE_URL, { textExtractor: throwing });

    await expect(result).resolves.toMatchObject({
      outcome: "ready",
      text: null,
      textError: failure,
    });
  });

  it("hands back no error when the extractor answers", async () => {
    const { result } = processCaptured(articlePage());

    expect(await result).not.toHaveProperty("textError");
  });

  it("hands back how long the extractor ran, whether it answered or threw", async () => {
    const throwing: ITextExtractor = {
      extractText: () => {
        throw new Error("linkedom choked on the page");
      },
    };

    const answered = await processCaptured(articlePage()).result;
    const threw = await processCaptured(articlePage(), ARTICLE_URL, { textExtractor: throwing })
      .result;

    expect(answered).toMatchObject({ textMs: expect.any(Number) });
    expect(threw).toMatchObject({ textMs: expect.any(Number) });
  });

  it("caps Text at 100,000 characters", async () => {
    const long: ITextExtractor = { extractText: () => "word ".repeat(30_000) };

    const { item, result } = processCaptured(articlePage(), ARTICLE_URL, { textExtractor: long });

    await result;

    expect(item.text).toHaveLength(100_000 - 1); // trailing space trimmed after the cut
    expect(item.text!.startsWith("word word")).toBe(true);
  });

  it("normalises whitespace, keeping paragraph breaks", async () => {
    const messy: ITextExtractor = {
      extractText: () =>
        "\n\n  First \t  line here  \nnext line\n\n\n\n\n  Second   paragraph  \n\n",
    };

    const { item, result } = processCaptured(articlePage(), ARTICLE_URL, { textExtractor: messy });

    await result;

    expect(item.text).toBe("First line here\nnext line\n\nSecond paragraph");
  });

  it("treats blank page text as no Text", async () => {
    const blank: ITextExtractor = { extractText: () => " \n\t\n " };

    const { item, result } = processCaptured(articlePage(), ARTICLE_URL, { textExtractor: blank });

    await expect(result).resolves.toMatchObject({ outcome: "ready", text: null });
    expect(item.text).toBeNull();
  });

  it("writes no Text for a job without captured content, and never asks the extractor", async () => {
    const extractor = { extractText: vi.fn(() => "should not be used") } satisfies ITextExtractor;
    const { repository, item } = itemsInMemory(ARTICLE_URL);
    const page = { ...htmlPage({ "og:type": "article" }), finalUrl: ARTICLE_URL };
    const useCase = useCaseFor(
      repository,
      fetcherAnswering(page),
      undefined,
      {},
      undefined,
      extractor,
    );

    await expect(useCase.execute(REF)).resolves.toMatchObject({
      outcome: "ready",
      type: "article",
      text: null,
    });
    expect(item).toMatchObject({ status: "ready", text: null });
    expect(extractor.extractText).not.toHaveBeenCalled();
    expect(await useCase.execute(REF)).not.toHaveProperty("textMs");
  });

  describe("a video's captions", () => {
    const VIDEO_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const CAPTIONS = "Never gonna give you up\nnever gonna let you down";

    it("fills a YouTube video's Text with its captions, even when the page has text", async () => {
      const { item, result } = processJob({ html: articlePage(), captions: CAPTIONS }, VIDEO_URL);

      await expect(result).resolves.toMatchObject({
        outcome: "ready",
        type: "video",
        text: CAPTIONS,
      });
      expect(item.text).toBe(CAPTIONS);
    });

    it("never asks the extractor when the captions answer", async () => {
      const extractor = { extractText: vi.fn(() => "page text") } satisfies ITextExtractor;

      const { item, result } = processJob({ html: articlePage(), captions: CAPTIONS }, VIDEO_URL, {
        textExtractor: extractor,
      });

      expect(await result).not.toHaveProperty("textMs");
      expect(item.text).toBe(CAPTIONS);
      expect(extractor.extractText).not.toHaveBeenCalled();
    });

    it("falls back to the page's text for a video without captions", async () => {
      const { item, result } = processJob({ html: articlePage() }, VIDEO_URL);

      await expect(result).resolves.toMatchObject({ outcome: "ready", type: "video" });
      expect(item.text).toContain(PARAGRAPHS[0]);
    });

    it("falls back to the page's text when the captions are blank", async () => {
      const { item, result } = processJob({ html: articlePage(), captions: " \n\t " }, VIDEO_URL);

      await result;

      expect(item.text).toContain(PARAGRAPHS[0]);
    });

    it("normalises the captions' whitespace and caps them like page text", async () => {
      const { item, result } = processJob(
        {
          html: articlePage(),
          captions: `  Never   gonna \t give\n\n\n\nyou up  ${"la ".repeat(40_000)}`,
        },
        VIDEO_URL,
      );

      await result;

      expect(item.text!.startsWith("Never gonna give\n\nyou up la la")).toBe(true);
      expect(item.text!.length).toBeLessThanOrEqual(100_000);
    });

    it("writes no Text for captions on a job without captured content", async () => {
      const { repository, item } = itemsInMemory(VIDEO_URL);
      const page = { ...htmlPage(), finalUrl: VIDEO_URL };
      const useCase = useCaseFor(repository, fetcherAnswering(page));

      await expect(useCase.execute({ ...REF, captions: CAPTIONS })).resolves.toMatchObject({
        outcome: "ready",
        type: "video",
        text: null,
      });
      expect(item).toMatchObject({ status: "ready", text: null });
    });

    it("writes no Text for captions when the fetch fails", async () => {
      const { repository, item } = itemsInMemory(VIDEO_URL);
      const useCase = useCaseFor(repository, fetcherFailing(new Error("ETIMEDOUT")));

      await expect(useCase.execute({ ...REF, captions: CAPTIONS })).resolves.toMatchObject({
        outcome: "ready",
        type: "video",
        text: null,
      });
      expect(item).toMatchObject({ status: "ready", text: null });
    });
  });

  it("writes no Text when the fetch fails", async () => {
    const { item, result } = run(
      "https://youtu.be/dQw4w9WgXcQ",
      fetcherFailing(new Error("ETIMEDOUT")),
    );

    await expect(result).resolves.toMatchObject({ outcome: "ready", type: "video", text: null });
    expect(item.text).toBeNull();
  });
});

interface Ports {
  thumbnails?: ThumbnailPorts;
  textExtractor?: ITextExtractor;
}

describe("ProcessItemUseCase, an X post's Text", () => {
  const POST_URL = "https://x.com/resonory/status/1856001234567890123";
  // The post's page as the extension captures it, with replies, "Who to follow" and trends loaded.
  const X_POST_PAGE = readFileSync(
    fileURLToPath(new URL("../../../../fixtures/x-post.html", import.meta.url)),
    "utf8",
  );
  const POST_TEXT = [
    "Shipping full-text search today.",
    "",
    "It reads what you saved, not just the titles 🎉",
    "",
    "Your articles, threads and videos, findable by the words inside them. #buildinpublic https://resonory.app/changelog",
  ].join("\n");

  const processCaptured = (html: string, sourceUrl = POST_URL) => {
    const { repository, item } = itemsInMemory(sourceUrl);
    const useCase = useCaseFor(repository, fetcherFailing(new Error("must not be called")));
    return { item, result: useCase.execute({ ...REF, html }) };
  };

  it("fills an X post's Text with the post's own words only", async () => {
    const { item, result } = processCaptured(X_POST_PAGE);

    await expect(result).resolves.toMatchObject({
      outcome: "ready",
      type: "post",
      text: POST_TEXT,
    });
    expect(item).toMatchObject({ status: "ready", type: "post", text: POST_TEXT });
    expect(item.text).not.toMatch(/tide pools|Markdown|Who to follow|Trending|Views/);
  });

  it("reads a reply's own words from its page, never the post it replies to", async () => {
    const replyUrl = "https://x.com/ada_reads/status/1856004444444444444";

    const { item, result } = processCaptured(X_POST_PAGE, replyUrl);

    await result;
    expect(item.text).toBe(
      "Finally. I have four hundred saved essays and could never find the one about tide pools. Does it work on paywalled pieces I read while logged in?",
    );
  });

  // Long enough that the page reads as having main content.
  const WRITE_UP =
    "A long write-up of the launch, in plain paragraphs, explaining what full-text search does, how it reads each saved page, and why the words inside an article matter more than its title.";
  const writeUpPage = `
    <!doctype html>
    <html>
      <head><title>Launch notes</title></head>
      <body>
        <nav><a href="/">Home</a></nav>
        <article><p>${WRITE_UP}</p><p>${WRITE_UP}</p><p>${WRITE_UP}</p></article>
      </body>
    </html>
  `;

  it("falls back to main-content extraction for an X page without the post's node", async () => {
    const { item, result } = processCaptured(writeUpPage);

    await result;
    expect(item.text).toContain(WRITE_UP);
  });

  it("leaves an X page without the post's node or any main content with no Text", async () => {
    const loginWall = `
      <!doctype html>
      <html>
        <head><title>X</title></head>
        <body>
          <main><h1>Something went wrong. Try reloading.</h1><a href="/login">Log in</a> <a href="/i/flow/signup">Sign up</a></main>
        </body>
      </html>
    `;

    const { item, result } = processCaptured(loginWall);

    await expect(result).resolves.toMatchObject({ outcome: "ready", type: "post", text: null });
    expect(item.text).toBeNull();
  });

  it("reads another network's post with main-content extraction, not the X post node", async () => {
    const redditUrl = "https://www.reddit.com/r/selfhosted/comments/1abcde/full_text_search/";

    const { item, result } = processCaptured(writeUpPage, redditUrl);

    await expect(result).resolves.toMatchObject({ outcome: "ready", type: "post" });
    expect(item.text).toContain(WRITE_UP);
  });

  it("never reads the X post node on another network's page, even when one is there", async () => {
    const blueskyUrl = "https://bsky.app/profile/resonory.app/post/3kxyz";

    const { item, result } = processCaptured(X_POST_PAGE, blueskyUrl);

    await result;
    expect(item.text).not.toBe(POST_TEXT);
  });
});

describe("ProcessItemUseCase, AI tagging", () => {
  const POST_URL = "https://youtu.be/dQw4w9WgXcQ";

  // Processes REF (with captured content when given) against this queue.
  const processWith = (queue: IQueueProvider, fetcher: IUrlFetcher, job = {}) => {
    const { repository, item } = itemsInMemory(POST_URL);
    const useCase = useCaseFor(
      repository,
      fetcher,
      undefined,
      undefined,
      undefined,
      undefined,
      queue,
    );
    return { item, repository, result: useCase.execute({ ...REF, ...job }) };
  };

  it("queues the Item's AI tagging once it's Ready, with only its ids", async () => {
    const queue = queueRecording();

    const { result } = processWith(queue, fetcherAnswering(htmlPage()), {
      html: "<html><head><title>A video</title></head></html>",
      captions: "Hello",
    });

    await expect(result).resolves.toMatchObject({ outcome: "ready" });
    expect(queue.enqueueTagItem).toHaveBeenCalledExactlyOnceWith(REF);
  });

  it("queues it only after the Item is marked Ready", async () => {
    const order: string[] = [];
    const queue = {
      enqueueTagItem: vi.fn(async () => {
        order.push("queued");
      }),
    } satisfies IQueueProvider;
    const { repository } = itemsInMemory(POST_URL);
    const markReady = repository.markReady;
    repository.markReady = vi.fn(async (...args: Parameters<typeof markReady>) => {
      await markReady(...args);
      order.push("ready");
    });
    const useCase = useCaseFor(
      repository,
      fetcherAnswering(htmlPage()),
      undefined,
      undefined,
      undefined,
      undefined,
      queue,
    );

    await useCase.execute(REF);

    expect(order).toEqual(["ready", "queued"]);
  });

  it("queues it for a typed Item whose fetch failed, which is still Ready", async () => {
    const queue = queueRecording();

    await processWith(queue, fetcherFailing(new Error("offline"))).result;

    expect(queue.enqueueTagItem).toHaveBeenCalledExactlyOnceWith(REF);
  });

  it("queues nothing for an Item that isn't Ready", async () => {
    const queue = queueRecording();
    const { repository } = itemsInMemory("http://127.0.0.1:4000/health");
    const useCase = useCaseFor(
      repository,
      fetcherFailing(new Error("127.0.0.1 isn't public")),
      undefined,
      undefined,
      undefined,
      undefined,
      queue,
    );

    await expect(useCase.execute(REF)).rejects.toThrow();
    await useCase.execute({ itemId: ITEM_ID, userId: OTHER_USER_ID });

    expect(queue.enqueueTagItem).not.toHaveBeenCalled();
  });

  it("keeps the Item Ready when its tagging can't be queued, handing the error back", async () => {
    const queueError = new Error("Redis answered ECONNREFUSED");
    const queue = {
      enqueueTagItem: vi.fn(async (): Promise<void> => {
        throw queueError;
      }),
    } satisfies IQueueProvider;

    const { item, result } = processWith(queue, fetcherAnswering(htmlPage()));

    await expect(result).resolves.toMatchObject({ outcome: "ready", tagQueueError: queueError });
    expect(item).toMatchObject({ status: "ready" });
  });
});
