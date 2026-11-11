# Content capture: server-fetched vs. extension-captured

How an Item's content gets into the system changed with the browser extension (issue #143/#145/#146), motivated by a problem no server-side fix could close (issue #137, [ADR 0007](./adr/0007-v1-capture-is-a-browser-extension-not-paste-a-link.md)). This doc is the side-by-side: what the old path did, what the new path does, and exactly where in the code they diverge and reconverge. For the processing pipeline itself (type detection, oEmbed, Thumbnails), see [Queue](./queue.md); this doc is specifically about where the _content_ comes from before that pipeline ever runs.

## The problem with the old path

**Paste-a-link** was the only way to save an Item: a User pastes a URL into the web app, and the **worker** fetches it itself, server-side, to read its title, description and picture.

A server-side fetch has no cookies, no login session, and nothing that makes it look like a real browser to a site that's actively trying to tell the two apart. A page sitting behind Cloudflare's bot-wall, or behind a login a User is signed into in their own browser but which the worker obviously isn't, answers that fetch with a challenge page or a 403 — never the real content. `SafeUrlFetcher`'s guard (see [Security](./security.md#the-workers-url-fetch)) is about **what the worker is allowed to fetch**, not about getting past this; it's a TLS/fingerprint-level block, not fixable by adjusting headers or retrying.

The Item still gets created and still gets a **type**, if a URL rule can type it from the link's shape alone (`itemTypeFromUrl` — see [Queue: URL rules](./queue.md#url-rules)) — but its title, description and Thumbnail stay empty, because nothing past the type decision had real content to read.

## Old path: the worker fetches it

```
User pastes URL (apps/web)
  → POST /items { url }
  → SaveItemUseCase: creates Item (processing), enqueues { itemId, userId }
  → [async, later] worker picks up the job
  → ProcessItemUseCase: IUrlFetcher.fetchPage(sourceUrl)   ← server-side HTTP fetch
  → SafeUrlFetcher: guarded fetch, no cookies, no session, not a real browser
  → (blocked site) → challenge/403 page, no real title/description/thumbnail
```

Relevant code: `apps/api/src/application/use-cases/items/SaveItemUseCase.ts`, `apps/worker/src/application/use-cases/items/ProcessItemUseCase.ts`, `apps/worker/src/infrastructure/http/SafeUrlFetcher.ts`.

## New path: the browser captures it

```
User is already looking at the real, rendered page, in their own browser
  → clicks the toolbar icon
  → background script: activeTab grant + chrome.scripting.executeScript
      injects capturePage() into that exact tab only
  → capturePage(): reads document.head.outerHTML + location.href
      directly off the live DOM — no network request happens here
  → POST /items { url, html }, authenticated via x-api-key (not a cookie)
  → SaveItemUseCase: creates Item (processing), enqueues { itemId, userId, html }
  → [async, later] worker picks up the job
  → ProcessItemUseCase: ref.html !== undefined → skip fetchPage entirely
  → pageFromContent(sourceUrl, html): builds the same FetchedPage shape
      a successful fetch would have produced
  → everything downstream is the literal same code (see below)
```

Relevant code: `apps/extension/lib/capturePage.ts`, `apps/extension/entrypoints/background.ts`, `apps/extension/lib/createItemRequest.ts`, `apps/api/src/application/use-cases/items/SaveItemUseCase.ts`, `apps/worker/src/application/use-cases/items/ProcessItemUseCase.ts` (`pageFromContent`).

## What's shared, and what isn't

Everything from the moment a `FetchedPage` exists onward is **one pipeline, not two**: type precedence ([Detection order](./queue.md#detection-order)), oEmbed, page metadata, Thumbnail candidate selection, the URL preview cache, marking the Item Ready. `ProcessItemUseCase` never branches on where the `FetchedPage` came from past the one `if (ref.html !== undefined)` check — there is no separate "captured content" extraction logic to keep in sync with the "fetched content" logic.

|                                                 | Old (server fetch)                                                        | New (extension capture)                                                                                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Who gets the content**                        | The worker, server-side                                                   | The user's own already-authenticated browser                                                                                                                  |
| **When**                                        | Asynchronously, at processing time                                        | Synchronously, at the moment of the click                                                                                                                     |
| **Auth to the page itself**                     | None — no cookies, no session                                             | Whatever the user's real browser session already has                                                                                                          |
| **Works behind a bot-wall/login**               | No (the original #137 bug)                                                | Yes — this is the problem it solves                                                                                                                           |
| **Auth to the API**                             | Session cookie                                                            | `x-api-key` header (see [Security: Authentication](./security.md#authentication)) — resolved through the identical `getSession()` call, no separate code path |
| **Redirect-following**                          | Yes — `finalUrl` can differ from the pasted URL, and the cache keys on it | No — there's no fetch, so `finalUrl` is always exactly `sourceUrl`                                                                                            |
| **Type/title/description/Thumbnail extraction** | `ProcessItemUseCase`'s pipeline                                           | The identical pipeline                                                                                                                                        |
| **Full-text extraction (page body)**            | Out of scope                                                              | Out of scope (deferred either way — see [Queue: Not yet built](./queue.md#not-yet-built))                                                                     |

## Why the redirect difference matters

The URL preview cache (`IUrlPreviewCache`, see [Queue](./queue.md)) is keyed on the **canonical final URL**. A server fetch can follow redirects and learn that a short link actually points somewhere else; a captured page never goes through a fetch at all, so there's no redirect to observe — its "final URL" is definitionally whatever URL the user's address bar actually showed. This isn't a limitation to fix: it's correct, since the whole point of capturing is that the user was looking at that exact URL, rendered, already past whatever a server-side fetch of it would have hit.
