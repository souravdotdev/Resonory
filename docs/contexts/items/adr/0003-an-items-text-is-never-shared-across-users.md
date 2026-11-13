# An Item's Text is never shared across Users

An Item's Text comes from what that User's own browser captured: the page as they saw it, signed in, past a paywall or a members-only wall. Two Users saving the same URL can see different pages, so the Text of one is never shown to, or reused for, the other. The URL preview cache, which every User saving a URL shares (its Item type, title, description and Thumbnail key), therefore never holds Text. The worker extracts Text from the job's captured content once per job, before it looks the cache up, so a cache hit and a cache miss both write it, and writes it in the same update that marks the Item Ready. The types enforce this: the shape written to a Ready Item is the cached preview plus Text, so a cached preview has no field to carry it.

## Considered Options

- **Caching Text with the preview**: saves one extraction per repeat save of a URL, but a paywalled article's full Text would reach a User who never got past the paywall, and a signed-in view of a page (a private feed, an inbox) would leak to whoever saves the same URL next.
- **Caching Text per User and URL**: keeps the privacy, but extraction is a parse of HTML the job already carries, cheap next to the oEmbed call and the Thumbnail pipeline the cache exists to skip. A second cache for it isn't worth its invalidation rules.
- **Fetching the page server-side for Text**: the same Text for everyone, so sharing would be safe, but the worker's cookieless fetch is exactly what bot walls and login walls refuse (issue #137). It would also give a User who read the full article only its teaser.

## Consequences

- Text is computed on every save, even a cache hit. Its cost is one Readability parse of the captured HTML per job.
- A job without captured content (the legacy server-fetch path) gets no Text.
- X post Text comes from the captured page's post node, not the oEmbed answer: a cache hit skips the oEmbed call, so oEmbed-sourced Text would vanish on every save after the first.
- Anything later built on Text (embeddings, AI tags, summaries) is per Item, never per URL.
