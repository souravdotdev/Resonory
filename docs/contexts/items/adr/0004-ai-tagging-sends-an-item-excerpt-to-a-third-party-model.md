# AI tagging sends an Item excerpt to a third-party model

AI tagging needs a language model, and Resonory doesn't run one, so the worker sends a narrow excerpt of each Item to a hosted model. The excerpt is the Item's title, description, Source URL, Item type, and the first ~4,000 characters of its Text, along with the names of that User's Tags so the model can reuse them. It never sends a whole Text. Each call covers one Item for one User, in line with [ADR 0003](./0003-an-items-text-is-never-shared-across-users.md): nothing is shared or cached by URL. The provider is Groq's free tier, chosen because a free key is enough to build and run v1. It sits behind a worker port with an OpenAI-compatible client, so changing provider means changing the base URL, key and model in the environment, not the code. Implementation: issue #176.

This is not the Cue signal of [ADR 0002](../../../adr/0002-cues-send-only-search-queries-and-page-titles.md). That one is about what the extension may report while the User browses. This one is about what Resonory does with an Item the User chose to save.

## Considered Options

- **Full Text**: better context on long pieces, but more cost per call, more of a User's private reading leaving Resonory, and free-tier token limits hit sooner. The opening of a piece usually says what it's about.
- **Metadata only, no Text**: the most private option, but titles alone are often vague ("Thoughts on Tuesday"), and the Tags would be shallow.
- **Gemini API free tier**: generous limits, but on the free tier Google may use prompts to improve its models and human reviewers may read them, which clashes with treating Text as private.
- **A paid provider now**: better data terms and limits, but a cost to carry before there are Users.

## Consequences

- Before real Users arrive, someone has to check Groq's data-use and retention terms. If they don't fit, switch to a paid tier or a different provider.
- Every call sends at most the User's 200 most recently used Tag names, so a User with many Tags (up to 1,000) can't push a call past Groq's free-tier token limits. A Tag beyond the 200 isn't offered to the model, which may then make a near-duplicate of it; if the model answers with its exact name, it's reused.
- Sending more than this excerpt (full Text, Thumbnails) changes what leaves Resonory. It needs a new ADR.
