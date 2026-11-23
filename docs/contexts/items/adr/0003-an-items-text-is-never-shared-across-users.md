# Nothing read from a User's captured page is shared across Users

An Item's Text comes from what that User's own browser captured: the page as they saw it, signed in, past a paywall or a members-only wall. Two Users saving the same URL can see different pages, so nothing read from one User's capture is shown to, or reused for, the other: not its Text, and not its Item type, title, description or Thumbnail either. Every save is processed in full from its own page (the captured page, otherwise the fetched one), and nothing is looked up or remembered per URL. The worker extracts Text from the job's captured content once per job and writes it, with the rest of what Processing learned, in the same update that marks the Item Ready. Its Thumbnail is an object of its own, keyed by the Item ([ADR 0002](./0002-thumbnails-are-resized-by-the-worker-and-kept-in-private-supabase-storage.md)). The types say the same: the shape written to a Ready Item is that Item's preview (Item type, title, description, Thumbnail key) plus its Text, and no shape outlives the job.

## Considered Options

- **A per-URL cache of each page's preview** (shipped, then removed in #215): every User saving a URL shared its Item type, title, description and Thumbnail key for 7 days, kept in Redis under the canonical final URL, so a repeat save skipped the oEmbed call and the Thumbnail pipeline. It never held Text, but the rest leaked just the same: whoever saved a URL first set the title and picture every later User got, read from a page the later User may never have seen (a signed-in feed, a members-only post, a page that serves each visitor differently). Keeping Text out of it was the first half of this rule; removing it is the second.
- **Caching Text with the preview**: saves one extraction per repeat save of a URL, but a paywalled article's full Text would reach a User who never got past the paywall, and a signed-in view of a page (a private feed, an inbox) would leak to whoever saves the same URL next.
- **Caching per User and URL**: keeps the privacy, but extraction is a parse of HTML the job already carries, and a User rarely saves one URL twice. A cache for it isn't worth its invalidation rules.
- **Fetching the page server-side**: the same page for everyone, so sharing would be safe, but the worker's cookieless fetch is exactly what bot walls and login walls refuse (issue #137). It would also give a User who read the full article only its teaser.

## Consequences

- Every save costs one oEmbed call and one Thumbnail download, resize and upload, even for a URL another User saved a minute earlier. That cost is accepted in exchange for no cross-User state.
- Text is computed on every save. Its cost is one Readability parse of the captured HTML per job.
- A job without captured content (the legacy server-fetch path) gets no Text.
- X post Text comes from the captured page's post node, the User's own capture, not the oEmbed answer.
- Anything later built on what Processing reads (embeddings, AI tags, summaries) is per Item, never per URL. A per-URL optimisation is safe only for something no User's page can change, such as an oEmbed answer cached by endpoint.
