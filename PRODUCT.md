# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Resonory is for anyone who saves things online and never goes back to them: articles, X posts, Instagram posts, YouTube videos, PDFs and links, kept in bookmarks, "saved" tabs, screenshots and read-later lists. The behaviour is general, not tied to one profession. Heavy savers (knowledge workers, developers, students, creators) feel it most and are the natural early adopters.

Before launch, the audience is a **visitor** to the waitlist page, arriving from X, Reddit, Hacker News or a friend's link. They don't know the product yet. They decide in seconds whether to leave their email. Signing up makes them a Waitlist Entry, not a User.

## Product Purpose

Save anything you find online and forget about it. Resonory organises it for you and brings it back when you actually need it: while you're browsing, searching or working on something related.

Saving isn't the failure. Retrieval is. Every existing tool assumes you'll remember to come back and search, and you won't, because you don't know what you've forgotten.

Success is measured as the share of resurfaced Items that the User opens.

## Positioning

Resonory's core job is **Resurfacing**: bringing forgotten saves back at the right moment, without being asked. Every Item is understood by meaning (AI tags plus embeddings), so related saves are recognised even when no words overlap.

Internal shorthand (never page copy): "mymind makes you search. Resonory finds you."

## Capabilities and Constraints

- **Resurfacing forms:**
  - **Related Items** (V1): open one Item and see the similar ones.
  - **Rediscover digest** (V1): a weekly email of a few forgotten Items.
  - **Reminder** (V1.x, shown as "Next"): an Item comes back at a moment the User chose.
  - **Cue** (V1.x, shown as "Next"): while the User searches or browses, a small card says they already saved things on this topic.
- **V1 capture:** paste any link in the web app. Async processing detects the type, gets the title, description and thumbnail, and extracts the text. Items also get AI tags, which the User can add to or remove, plus manual tags, semantic search, and a grid library filtered by tag.
- **No folders, ever.** Organisation is tags only.
- **Not in V1:** the browser extension and Cues, Reminders, uploads, and mobile apps.
- **Waitlist:** email only. The promise is two emails, nothing else: a welcome email when you join and one when early access opens. A Waitlist Entry stores the email, its source and the signup time.
- **Undecided:** pricing amounts, the launch date, and the free tier's limits.

## Brand Commitments

- **Name:** Resonory.
- **Colours (fixed):**
  - `#141414`: the ground.
  - `#D4621A`: the accent.
  - `#FAFAF7`: text and the mark.
- **Logo:** an orange dot rising above stacked off-white bars, i.e. a saved thing resurfacing from the pile. Vector sources are in `assets/logo/`:
  - `resonory-horizontal_full-colour-on-dark.svg`
  - `resonory-symbol_full-colour-on-dark.svg`

  Both carry a `#141414` background rect, which is stripped for use on a page.

- **Voice:** calm, plain and slightly warm. Behaviour first ("you saved it, you forgot it"), no hype words, sentence case.
- **Quality bar** for marketing surfaces: Linear and Raycast.

## Evidence on Hand

- **No customers, testimonials, press, logos or usage numbers.** None may be invented.
- **Waitlist count:** the only live number is the real Waitlist Entry count, shown only once it reaches 100.
- **Allowed claims:**
  - **Privacy promise**, exactly: "Your library is private to you. We never sell your saves or show them to anyone."
  - **Founder note**, signed "Sourav Sanjay, Founder", with no photo.
  - **Offer:** early access only. Pricing is still undecided, and the site states none.
- **Banned claims:** naming competitors, launch dates, prices, user counts, AI-training or data-export promises.
- **Illustrative numbers** (e.g. "you saved 1,000 things, you reopened 12") must read as a familiar feeling, never as a statistic.

## Product Principles

1. **Retrieval over storage.** Every surface should show things coming back, not things being filed.
2. **Understand by meaning.** Relevance comes from what a save is about, not from keywords or folders.
3. **Never nag.** Resurfacing is rare, relevant and dismissible.
4. **Earn trust.** Libraries are private, data is minimal, and every claim is true.
5. **Effortless capture.** Saving takes one paste, and organising takes nothing.

## Accessibility & Inclusion

Every animation has a still state under `prefers-reduced-motion`. Illustrations that carry meaning have text descriptions. Everything works from the keyboard, with visible focus.
