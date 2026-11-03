# V1 capture is a browser extension, not paste-a-link

V1 was originally scoped as paste-a-link in the web app, with the browser extension explicitly deferred past V1 (see the prior `PRODUCT.md`). That held until a real bug exposed its limit: Medium sits behind a Cloudflare bot-wall, so Resonory's worker gets a 403 challenge page back from a direct fetch regardless of User-Agent or headers — a TLS/fingerprint-level block, not something request tweaking can fix. The Item still gets typed correctly (from its URL alone), but its title, description and thumbnail come back empty, silently.

Investigating comparable products (mymind, Raindrop.io, Instapaper) confirmed none of them solve this server-side either. They all capture the already-rendered page from the user's authenticated browser tab via an extension, and degrade to a bare link with no metadata when the extension isn't used. A server-side fetch, no matter how it's dressed up, has no equivalent to an authenticated, already-rendered tab — there's nothing for a login wall or a bot-wall to let through.

V1 capture becomes a Chrome/Chromium browser extension: the user clicks its toolbar button on a tab they have open, the extension sends the already-rendered page content along with its address, and the worker parses what it's given instead of fetching the page itself. There is no server-side request left for a bot-wall to challenge. Paste-a-link is removed entirely, not kept as a fallback.

## Considered Options

- **Keep paste-a-link, add a paid scraping/unlocking API as a server-side fallback** for bot-walled fetches: evaluated several providers (ScraperAPI, ScrapingBee, ScrapFly, Bright Data, Apify and others). Rejected: an ongoing per-request cost for a problem the extension solves for free once it exists, and several providers' own documentation and listings conceded they don't reliably work against sites like Medium anyway.
- **Keep paste-a-link, add a Medium-specific shortcut via its public RSS feed**: confirmed working for recently-published articles (verified live against the reported bug's own URL), but only covers one site, and only an author's most recent ~10-25 posts — not a general fix, and still leaves every other bot-walled site exactly as broken.
- **Keep both paste-a-link and the extension**: once the extension exists and actually solves the underlying problem, paste-a-link stops pulling its weight as a second capture surface to build, test and maintain. The one capability this gives up — saving a link you haven't personally opened, e.g. one someone else sent you — was judged a smaller loss than carrying two capture surfaces for V1.

## Consequences

- No capture path exists on mobile for V1 — there's no extension there. This is accepted, not an oversight.
- Saving a link without opening it (a right-click "save this link" action, or pasting one someone sent you) is out of scope for V1. Every V1 save originates from a tab the user actually has open.
- The web app keeps its library, feed, tags and search surfaces; only its paste-a-link capture UI is removed.
- The extension needs its own auth path: it runs from a `chrome-extension://` origin, which can't transparently reuse the web app's session cookie (ADR 0003's subdomain-cookie model assumes `apps/web`'s own origin, and today's CORS/trusted-origins config allows only that origin). A token-based auth mechanism, additive to the existing cookie-session auth, is required before the extension can call the API — scoped and built separately from this decision.
- `PRODUCT.md`'s "V1 capture" and "Not in V1" lines, and the Items glossary's **Source URL** definition, are updated to describe this mechanism instead of the removed paste flow.
