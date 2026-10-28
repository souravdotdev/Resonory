---
name: Resonory
description: You saved it. Resonory brings it back.
colors:
  ground: "#141414"
  card: "#1f1f1f"
  card-raised: "#272727"
  border: "#313131"
  text: "#fafaf7"
  muted: "#9b9b9b"
  accent: "#d4621a"
  accent-hover: "#e0712b"
  mute: "rgb(250 250 247 / 0.66)"
  faint: "rgb(250 250 247 / 0.56)"
  line: "rgb(250 250 247 / 0.09)"
  line-strong: "rgb(250 250 247 / 0.16)"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(36px, 8.4cqi, 54px)"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.04em"
  body-lead:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14.5px"
    fontWeight: 500
    lineHeight: 1
  card-title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.38
  meta:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "10px"
    fontWeight: 400
    lineHeight: 1.2
  note:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.2
    fontFeature: '"tnum"'
rounded:
  keycap: "6px"
  tile: "8px"
  button-inset: "10px"
  card: "12px"
  panel: "14px"
  pill: "9999px"
spacing:
  inset: "6px"
  panel-gap: "8px"
  gutter-mobile: "20px"
  gutter-desktop: "clamp(32px, 5.56vw, 80px)"
components:
  button-primary:
    backgroundColor: "{colors.text}"
    textColor: "{colors.ground}"
    typography: "{typography.label}"
    rounded: "{rounded.button-inset}"
    height: "40px"
    padding: "0 8px 0 16px"
  button-pill:
    backgroundColor: "{colors.text}"
    textColor: "{colors.ground}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "36px"
    padding: "0 5px 0 15px"
  keycap:
    textColor: "{colors.ground}"
    typography: "{typography.meta}"
    rounded: "{rounded.keycap}"
    height: "22px"
    width: "22px"
  input-search:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.panel}"
    padding: "6px 6px 6px 16px"
  nav-pill:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.pill}"
    height: "50px"
    padding: "6px 6px 6px 16px"
  footer-pill:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.faint}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
  item-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    typography: "{typography.card-title}"
    rounded: "{rounded.card}"
    padding: "11px 12px"
  cue:
    backgroundColor: "{colors.card-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
    padding: "10px 12px"
---

# Design System: Resonory

## Overview

**Creative North Star: "The Pile That Answers Back"**

Resonory is drawn as a dark, quiet archive: a wall of the visitor's own saved cards, dimmed almost to nothing on a near-black ground, with the product's interface floating over it as a few frosted palettes. Nothing on the screen is loud except the one thing the product exists to do. When an Item comes back, its card lights up orange, a thread draws to it, and a small dot rises above it, exactly like the dot rising above the stacked bars of the logo. That moment is the whole visual identity; everything else is held in greys so it can land.

The system is monochrome by construction. Off-white (#FAFAF7) is the only bright neutral and is set at fixed strengths (66%, 56%, 16%, 9%) for secondary text, meta and edges, rather than introducing more greys. Surfaces separate by small tonal steps (ground, card, card-raised) and hairline borders, and depth comes from long, soft, dark drops under the floating palettes. Type is Geist throughout, with Geist Mono for everything the product "knows" about an Item: when, where from, how much was read, the keycap.

Density is calm, with air. The screen is a single viewport, the wall supplies texture and proof at once but leaves a clear ring around the copy and the demo (48px on the sides that face the wall, with a card's turn left empty now and then down each column), and motion is slow and springy: parts rise in on load, the wall drifts a few pixels over 44 seconds, and the only fast thing is the spark that runs along the orange thread.

**Key Characteristics:**

- Near-black ground with a dimmed wall of saved cards as the backdrop, never an empty field or a gradient.
- One accent, orange, reserved for resurfacing: the logo dot, the two verbs of the headline, the lit card, its thread and its rising dot.
- Primary actions are off-white fills with dark text; orange never fills a button.
- Floating palettes: pill nav, search-style field, browser window, Cue, all on tonal surfaces with hairline edges and soft drops.
- Geist for language, Geist Mono for metadata and keycaps.
- One easing curve (cubic-bezier(0.32, 0.72, 0, 1)) for every state change; every animation has a still state under reduced motion.

## Colors

A strict monochrome of near-black tonal surfaces and one off-white at set strengths, with a single warm orange that means "this came back".

### Primary

- **Resurfacing Orange** (accent): the brand accent, fixed by PRODUCT.md. On the screen it appears only where something resurfaces: the logo's rising dot, the two highlighted verbs in the headline ("saved", "brings"), the lit card's 1px edge and its 28px orange glow at 38%, the thread that draws from the demo to that card, and the small dot that rises on its corner.
- **Ember Orange** (accent-hover): the lighter step of the accent, defined for hover on an accent-coloured element. Nothing on the waitlist uses it.

### Neutral

- **Archive Black** (ground): the page ground, fixed by PRODUCT.md. Also the footer pill's fill, the inside of the browser page, the icon tile in the Cue, and the text colour on off-white buttons.
- **Card Grey** (card): the saved cards on the wall, the email field, the browser window chrome, the nav pill (at 90% with a 14px backdrop blur).
- **Raised Grey** (card-raised): one step up: the active browser tab, the toolbar, the Cue (at 94% with a 16px blur), avatars, favicons, skeleton text bars and progress tracks.
- **Border Grey** (border): an opaque edge, used for the scrollbar thumb and the secondary pages' outline button and link underlines.
- **Paper White** (text): all primary text and the logo's bars, fixed by PRODUCT.md. As a fill it is the primary button. The headline runs a left-to-right gradient from Paper White to Ash.
- **Ash** (muted): the end of the headline gradient, and body text on the secondary (privacy, 404) pages.
- **Mute** (mute, Paper White at 66%): the lead paragraph, the proof line under the field, the "We'll email you" confirmation line, the "unopened" badge.
- **Faint** (faint, Paper White at 56%): meta in mono (sites, dates, counts), placeholders, idle icons, the footer's copyright.
- **Line** (line, Paper White at 9%): the default hairline on cards, the nav and footer pills, tiles and dividers.
- **Line Strong** (line-strong, Paper White at 16%): the edge of anything the visitor acts on or should read first: the email field, the browser window, the Cue, avatar and favicon rings. The field brightens its edge on hover (26%) and focus (44%), and turns to 72% on error.

### Named Rules

**The One Signal Rule.** Orange means an Item came back, and nothing else. It is never a button fill, a link colour, a focus ring, a label or a decoration. If a new surface wants orange somewhere that is not the logo dot, a highlighted verb about saving and bringing back, or a resurfaced item, use Paper White instead.

**The One White Rule.** Secondary text and edges are the same off-white at fixed strengths (66, 56, 16, 9 percent), not new greys. A new tier of emphasis takes a new opacity of Paper White, not a new hex.

**The Error Is Not Red Rule.** Errors stay in the monochrome: the field's edge goes to Paper White at 72% and the message is Paper White text with a warning icon. Neither red nor orange signals an error.

## Typography

**Display Font:** Geist (with ui-sans-serif, system-ui)
**Body Font:** Geist (with ui-sans-serif, system-ui)
**Label/Mono Font:** Geist Mono (with ui-monospace)

**Character:** One neutral, precise grotesque at tight tracking for everything a person says, and its mono sibling for everything a machine records. The split is semantic: if it is a timestamp, a source, a count, a file state or a key, it is mono.

### Hierarchy

- **Display** (600, 36px on phones (scaled with the column under 375px), clamp(36px, 8.4cqi, 54px) from 640px, line-height 1.04, -0.04em): the one headline. Filled with a Paper White to Ash gradient; the highlighted verbs are set in orange with the italic removed, so emphasis comes from colour, not slant.
- **Body lead** (400, 15px on phones, 17px from 640px, line-height 1.5 to 1.55, Mute): two lines of plain prose: the opening sentence above the headline ("Remember that link you were sure you'd need?", in sentence case with no tracking, a sentence and not a label) and the sub under it, each capped at 30em and set with pretty wrapping.
- **Body** (400, 15 to 15.5px): the email input and general running text.
- **Label** (500, 13.5 to 14.5px): button text and the confirmation heading.
- **Card title** (400, 12 to 12.5px, line-height 1.36 to 1.38): titles on Item cards and the Cue; clamped to two or three whole lines, never cut mid-word.
- **Meta** (Geist Mono 400, 9.5 to 10px, Faint): sites, dates, read progress, durations, counts, the "now" stamp, the "unopened" badge.
- **Note** (Geist Mono 400, 11.5 to 12.5px, tabular figures, Mute): the proof line under the signup field and the footer's copyright.

### Named Rules

**The Machine Speaks Mono Rule.** Anything the product records about an Item (when, where from, how far read, how many) is Geist Mono at meta size in Faint. Human-facing sentences are set in Geist, with one exception the founder's design makes: the proof line under the form (the invitation, "Join the waitlist. Be among the first to use Resonory.", or the waiting count) is the form's status line and is set in Geist Mono at Note size in Mute, with tabular figures.

**The Colour, Not Slant Rule.** Emphasis inside the headline is an `em` coloured orange with the italic removed. Use it only for the verbs of saving and bringing back.

## Layout

The waitlist is a single screen that fills one dynamic viewport (min-height 100dvh) and only grows, so the page scrolls, when the viewport is too short for the form. The card wall is absolutely positioned behind everything and is laid out to keep clear of the nav, the copy column, the demo and the footer, with 48px of air round the copy and the demo, 20px round the nav and footer, and about a third of the cards left out so the content never sits in a crowd.

On desktop (1024px and up) the main area is a two-column grid: the copy column up to 640px and a fixed 488px demo column, vertically centred, an 8px gap, 88px top and bottom padding, 32px right padding and a left gutter of clamp(32px, 5.56vw, 80px), growing past 1440px wide to half the extra width, so the pair stays where the 1440px frame puts it, centred on a wider screen. The copy column is a size container, so the headline scales with its width (8.4cqi). Below 1024px the layout stacks in one centred column, 520px at most: 20px side gutters, 80px top padding to clear the nav (64px on a screen under 600px tall), the copy, then the demo 24px below (12px on a screen under 600px tall, where the gaps in the copy tighten too), as wide as the form and reduced to just its search bar. Room is kept under the demo for the cards it finds (264px on a phone, 220px from 640px) and given up first on a short screen; what's left is shared above the stack and below it (twice as much below from 640px).

From 640px (tablets, landscape phones) the nav, footer, form, card and type sizes are the desktop ones, the headline at clamp(36px, 8.4cqi, 54px) on one line per sentence, and the wall is the desktop's column wall, its columns centred on the screen and the promised cards in a row under the demo. Below 640px the headline is 36px (scaled down with the column under 375px), and the wall is the design's four phone cards in two columns under the demo, as wide as it; on a screen too short for them, one row of two PDF cards.

The nav pill floats at the top (12px inset on phones, 20px from 640px) centred at up to 720px; the footer pill floats 8 to 14px from the bottom, sized to its content. Base text size is 15px on phones and 16px on desktop.

Spacing is tight and concentric: elements nested inside a rounded container sit 5px (phone) or 6px (desktop) from its edge, which is why the field and nav carry 5 to 6px padding on the button side and more on the text side. Floating palettes stack 8px apart.

## Elevation & Depth

Depth is a hybrid of tonal steps and soft drops. At rest, surfaces separate by tone (ground, card, card-raised) and hairline edges. Anything that floats over the wall gets a long, low, very dark drop with a heavy negative spread, so it reads as lifted without a visible halo, often paired with a 1px black ring to cut it from the wall. Frosted backgrounds (90 to 94% fills with 14 to 16px backdrop blur) on the nav and the Cue let the wall show through faintly. The only light in the system is the orange glow of a lit card.

### Shadow Vocabulary

- **Field rest** (`box-shadow: inset 0 1px 0 rgb(250 250 247 / 0.04), 0 24px 48px -28px rgb(0 0 0 / 0.8)`): the signup field: a faint top highlight and a drop beneath.
- **Field focus** (`box-shadow: 0 0 0 4px rgb(250 250 247 / 0.07)`): replaces the drop when the field has focus; a soft off-white halo rather than a coloured ring.
- **Window** (`box-shadow: 0 0 0 1px rgb(0 0 0 / 0.45), 0 30px 60px -30px rgb(0 0 0 / 0.9)`): the browser window in the demo.
- **Cue** (`box-shadow: 0 0 0 1px rgb(0 0 0 / 0.4), 0 30px 60px -24px rgb(0 0 0 / 0.95)`): the Cue, the highest surface on the screen.
- **Palette** (`box-shadow: 0 24px 48px -16px rgb(0 0 0 / 0.6), 0 2px 8px rgb(0 0 0 / 0.35)`): the floating nav on the secondary pages.
- **Lit glow** (`box-shadow: 0 0 0 1px #d4621a, 0 0 28px rgb(212 98 26 / 0.38)`; 22px blur on phones): a resurfaced card. The only coloured light in the system.
- **Pile edges** (`box-shadow: 0 5px 0 -2px #1f1f1f, 0 5px 0 -1px rgb(250 250 247 / 0.1), 0 10px 0 -5px #1f1f1f, 0 10px 0 -4px rgb(250 250 247 / 0.08)`): a stacked card on the wall, showing two card edges peeking out below it. This depicts the pile of Items (the same stack as the logo's bars); it is not a decorative offset shadow and is only used on stacked Item cards.

### Named Rules

**The Only Light Is Orange Rule.** Shadows are dark and soft; no blurred white or coloured glows, except the orange glow on a resurfaced card and its thread. The field's focus halo is a crisp 4px off-white spread, not a glow.

## Shapes

Everything is rounded and soft-cornered, nested concentrically. Pills (fully rounded) are for things that frame the screen: the nav, the footer, the nav's join button, the nav's keycap and the browser's address bar. Panels the visitor reads or types into use a 13px radius on phones and 14px on desktop (the email field, the confirmation, the Cue, the browser window at 12 to 13px). Inside a 14px panel with a 6px inset, the button takes 10px, so the curves stay parallel. Item cards use 11px on phones and 12px on desktop. Small tiles (icon tiles, frequently visited tiles, favourites at 11px) sit at 8 to 11px, keycaps at 6px, favicons at 4px, and skeleton bars at 2 to 3px. Borders are always 1px. Imagery inside cards is a flat, seeded "sun over a ridge" placeholder in off-white at 20% and 9% on raised grey: thumbnails are stand-ins, never photographs.

## Components

### Buttons

Quiet, solid and tactile: the brightest thing on the screen that is not orange.

- **Shape:** gently rounded inside the field (10px), fully rounded in the nav (pill).
- **Primary:** Paper White fill, Archive Black text, weight 500 at 14 to 14.5px, 40px tall inside the field, 36px in the nav. Carries a trailing ↵ keycap.
- **Hover / Focus:** hover drops to 88% opacity; press scales to 0.97; both use the spring curve over 600ms. Focus is a 2px Paper White outline offset 3px.
- **Disabled / Busy:** reads "Joining…", drops the keycap, 72% opacity, no press scale.
- **On the secondary pages:** the 404's "Back to the main page" is a Primary without the keycap; the privacy page's is a Secondary: a card-grey outline button with a 1px border, lifting to raised grey on hover.

### Keycap

- **Style:** a small mono key (Geist Mono 11 to 11.5px) with a 1px border of the button's text colour at 18% and a 7% fill of the same, so it reads as a key etched into the button. 6px radius in the field, circular in the nav pill. Purely decorative (hidden from assistive tech).

### Inputs / Fields

- **Style:** the email field is styled as a search bar: Card Grey fill, 1px Line Strong edge, 13 to 14px radius, an envelope icon in Faint on desktop, the submit button docked inside on the right. Capped at 520px.
- **Focus:** the edge brightens to Paper White at 44% and a 4px off-white halo at 7% replaces the drop shadow, over 500ms on the spring curve. Hover brightens the edge to 26%.
- **Error:** the edge goes to Paper White at 72%; the message row below shows a warning icon and Paper White text. The same row otherwise carries the proof line in mono.
- **Success:** the form is replaced by a confirmation panel of the same shape: a 22 to 24px Paper White check tile, the heading in Label, the follow-up in Mute.

### Navigation

- **Style:** a single floating pill, Card Grey at 90% with a 14px backdrop blur and a Line edge, 48px tall on phones and 50px on desktop, holding the logo lockup (20 to 22px tall) on the left and the pill join button on the right. The join button moves focus straight to the email field.
- **States:** the logo link fades to 88% on hover; focus is the standard Paper White outline.
- **Secondary pages:** the same pill sits sticky at the top with the Palette shadow and a stronger blur.

### Footer

- **Style:** a small content-sized pill, Archive Black with a Line edge, floating at the bottom centre: an underlined "Privacy" link (underline at 35% brightening to full on hover) and the copyright in mono, 11.5 to 12px, Faint.

### Item Card (signature)

The unit of the wall and the brand's main material.

- **Shape:** 11 to 12px radius, Card Grey fill, 1px Line edge, 10 to 12px padding.
- **Card styles** (how a card is drawn, not its Item type: an Instagram card shows a Post): post (avatar, author, time, title, mono counts with stroked icons), video (placeholder thumbnail with duration and a watched-progress bar), article and link (favicon, domain in mono, title, reading progress), PDF (a Paper White page glyph with skeleton lines), Instagram (tall placeholder with carousel dots). Each ends in a mono meta line ("saved in March", "stopped at 6:40").
- **States:** at rest each card sits at its own low opacity on the wall. Scanned, it flickers brighter and lifts slightly. Lit, it goes fully opaque, gains the orange 1px edge and Lit glow, its "unopened" badge fades out, and an orange dot rises into its corner. All changes are opacity or transform, over 900ms on the spring curve.

### Cue (signature)

- **Style:** Raised Grey at 94% with a 16px blur, Line Strong edge, 13 to 14px radius, the Cue shadow. A 32 to 34px Archive Black tile holds the logo symbol; beside it "You saved something like this" (semibold), a mono "now" stamp, the quoted title at 82% Paper White, and a mono card-style-and-date line ("X post · saved 3 months ago").
- **Entry:** fades in with a short delay and slides in from the right on desktop (from above on phones); 500ms for opacity, 900ms for movement.

### Browser Demo

- **Style:** a stylised browser window (tab strip, toolbar, address pill, page) built entirely from the system's surfaces, Line hairlines and mono meta, with the Resonory symbol as an extension button. The traffic-light dots are the only non-system colours in the build and belong to this depiction of a browser alone.

## Do's and Don'ts

### Do:

- **Do** keep the accent (#D4621A) to resurfacing: the logo dot, the verbs "saved" and "brings", a lit card, its thread and its rising dot.
- **Do** make primary actions Paper White (#FAFAF7) fills with Archive Black (#141414) text, hover at 88% opacity, press at 0.97 scale.
- **Do** derive secondary text and edges from Paper White at 66%, 56%, 16% and 9% before reaching for a new grey.
- **Do** set every timestamp, source, count and keycap in Geist Mono at meta size.
- **Do** nest rounded elements concentrically: a 14px panel with a 6px inset holds a 10px button.
- **Do** use cubic-bezier(0.32, 0.72, 0, 1) for every transition and entrance; only the wall's drift (ease-in-out) and the thread's spark (linear) differ.
- **Do** give every animation a still final state under prefers-reduced-motion.
- **Do** focus with a 2px Paper White outline offset 3px.

### Don't:

- **Don't** fill a button, colour a link, draw a focus ring or set a label in orange.
- **Don't** signal errors in red or orange; errors stay in Paper White.
- **Don't** set human-facing sentences in mono (the proof line under the form is the one exception), or slant the headline's highlighted verbs.
- **Don't** add blurred white or coloured glows; the only light is the orange glow of a resurfaced card and its thread.
- **Don't** use photographs in Item cards; thumbnails are the seeded sun-over-ridge placeholder.
- **Don't** place a small label or kicker above a headline (uppercase, tracked or boxed). The one line above it is a plain sentence in the body lead's voice, not a label.
