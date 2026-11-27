---
name: Resonory
description: You saved it. Resonory brings it back.
colors:
  canvas: "#151414"
  surface-soft: "#1A1918"
  surface-card: "#201E1D"
  surface-strong: "#262422"
  hairline: "#282624"
  control-border: "#736D68"
  text-heading: "#E9D8C4"
  text-body: "#DACAB8"
  text-secondary: "#C3B5A4"
  text-muted: "#988E81"
  text-faint: "#877E74"
  accent: "#A8492B"
  accent-active: "#863A22"
  accent-disabled: "#282624"
  on-accent: "#FFFFFF"
  success: "#5DB872"
  warning: "#D4A017"
  danger: "#D36E6E"
typography:
  display-xl:
    fontFamily: "'Spectral', Georgia, 'Times New Roman', serif"
    fontSize: "clamp(36px, 8.4cqi, 56px)"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-0.02em"
  display:
    fontFamily: "'Spectral', Georgia, 'Times New Roman', serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: "38px"
    letterSpacing: "-0.01em"
  heading:
    fontFamily: "'Spectral', Georgia, 'Times New Roman', serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "26px"
  body-lead:
    fontFamily: "'Work Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: "28px"
  body:
    fontFamily: "'Work Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "24px"
  body-sm:
    fontFamily: "'Work Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "20px"
  card-title:
    fontFamily: "'Work Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
  label:
    fontFamily: "'Work Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
    letterSpacing: "0.04em"
  mono:
    fontFamily: "'JetBrains Mono', ui-monospace, 'SF Mono', 'Cascadia Code', Consolas, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "20px"
  mono-sm:
    fontFamily: "'JetBrains Mono', ui-monospace, 'SF Mono', 'Cascadia Code', Consolas, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: "16px"
  hand:
    fontFamily: "'Caveat', 'Work Sans', cursive"
    fontSize: "28px"
    fontWeight: 500
    lineHeight: 1.15
rounded:
  keycap: "6px"
  tile: "8px"
  button-inset: "10px"
  card: "12px"
  panel: "14px"
  pill: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
  "12": "48px"
  "16": "64px"
  "24": "96px"
  inset: "6px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.card-title}"
    rounded: "{rounded.button-inset}"
    height: "40px"
    padding: "0 16px"
  button-primary-active:
    backgroundColor: "{colors.accent-active}"
    textColor: "{colors.on-accent}"
    typography: "{typography.card-title}"
    rounded: "{rounded.button-inset}"
    height: "40px"
    padding: "0 16px"
  button-primary-disabled:
    backgroundColor: "{colors.accent-disabled}"
    textColor: "{colors.text-muted}"
    typography: "{typography.card-title}"
    rounded: "{rounded.button-inset}"
    height: "40px"
    padding: "0 16px"
  button-secondary:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.text-heading}"
    typography: "{typography.card-title}"
    rounded: "{rounded.button-inset}"
    height: "40px"
    padding: "0 16px"
  button-ghost:
    textColor: "{colors.text-body}"
    typography: "{typography.card-title}"
    rounded: "{rounded.button-inset}"
    height: "40px"
    padding: "0 12px"
  button-danger:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.danger}"
    typography: "{typography.card-title}"
    rounded: "{rounded.button-inset}"
    height: "40px"
    padding: "0 16px"
  button-icon:
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.button-inset}"
    size: "36px"
  keycap:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.mono-sm}"
    rounded: "{rounded.keycap}"
    height: "22px"
    padding: "0 6px"
  text-input:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-body}"
    typography: "{typography.body}"
    rounded: "{rounded.button-inset}"
    height: "40px"
    padding: "0 12px"
  input-search:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-heading}"
    typography: "{typography.body}"
    rounded: "{rounded.panel}"
    padding: "6px 6px 6px 16px"
  tag-chip:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "28px"
    padding: "0 12px"
  tag-chip-selected:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.text-heading}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "28px"
    padding: "0 12px"
  type-badge:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.text-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.keycap}"
    padding: "2px 6px"
  nav-pill:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-heading}"
    rounded: "{rounded.pill}"
    height: "50px"
    padding: "6px 6px 6px 16px"
  app-topbar:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text-heading}"
    typography: "{typography.body-sm}"
    height: "56px"
    padding: "0 24px"
  item-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-heading}"
    typography: "{typography.card-title}"
    rounded: "{rounded.card}"
    padding: "12px"
  item-card-processing:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-muted}"
    typography: "{typography.card-title}"
    rounded: "{rounded.card}"
    padding: "12px"
  cue:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.text-heading}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.panel}"
    padding: "10px 12px"
  dialog:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-body}"
    typography: "{typography.body}"
    rounded: "{rounded.panel}"
    width: "400px"
    padding: "24px"
  toast:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.text-body}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.card}"
    padding: "10px 14px"
  extension-popup:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text-body}"
    typography: "{typography.body-sm}"
    width: "360px"
    padding: "16px"
  email-container:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text-body}"
    typography: "{typography.body}"
    width: "600px"
    padding: "32px"
---

# Design System: Resonory

## Overview

**Creative North Star: "The Pile That Answers Back"**

Resonory is drawn as a warm, dark, quiet archive: a pile of the User's own saved Items on a near-black ground the colour of an unlit room, read by lamplight. Text is not white but a family of warm beiges, from a parchment heading down to a faint fine print, so the screen reads like paper in low light rather than a glowing display. Nothing on the screen is loud except the one thing the product exists to do. When an Item comes back, its card lights up in rust, a thread draws to it, and a small dot rises above it, exactly like the dot rising above the stacked bars of the logo. That moment, and the one button that asks the User to act, are the only places the warm rust appears; everything else is held in browns and beiges so it can land.

The system is tonal by construction. Surfaces separate by small, warm steps (canvas, surface-soft, surface-card, surface-strong) rather than by borders, and a 1px hairline is a decorative edge only, never the thing that tells a User where to click or type: interactive boundaries carry their own control border. Type is split by meaning. Spectral, a serif, carries language about what a save means (page titles, section headings, empty states, the wordmark). Work Sans carries the interface. JetBrains Mono carries everything the product records about an Item: when, where from, how much was read.

Density is calm, with air. Motion is slow and springy: one curve, a handful of durations, and a still final state for every animation under reduced motion.

**Key Characteristics:**

- A warm near-black canvas (#151414) with tonal surface steps; dark only, emails included. There is no light theme.
- One beige family for text (#E9D8C4 down to #877E74), every tier at 4.5:1 or better where it is allowed.
- One accent, rust (#A8492B), with two meanings only: the primary action's fill, and an Item coming back.
- Spectral for meaning, Work Sans for interface, JetBrains Mono for what the machine records, and one handwritten Caveat line above the waitlist headline.
- Focus is always a 2px text-heading outline, never rust.
- One easing curve (cubic-bezier(0.32, 0.72, 0, 1)) for every state change.

## Colors

A warm dark ground, a single beige family for text, and one rust accent that means "act" or "this came back". Every pair below that sets text or marks a boundary is bounded by WCAG contrast, and the pairs not listed as allowed are forbidden.

### Surfaces

- **Unlit Room** (canvas, #151414): the page ground on every surface: the web app, the waitlist, the extension popup and the emails. The only surface `text-faint` may sit on.
- **Soft Band** (surface-soft, #1A1918): a barely lifted band: dividers, tag chips at rest, quiet table stripes.
- **Card Brown** (surface-card, #201E1D): the default card and panel: Item cards, inputs, dialogs, the nav pill.
- **Strong Brown** (surface-strong, #262422): emphasised cards, selected tabs and chips, the Cue, toasts, secondary and danger buttons.
- **Hairline** (hairline, #282624): decorative 1px edges only. At 1.03 to 1.22:1 it reads as one more elevation step, not as a line a User can find, so it never marks something interactive.
- **Control Edge** (control-border, #736D68): the boundary of anything a User types into or ticks: inputs, checkboxes, radio buttons, fields. 3.03:1 on surface-strong up to 3.6:1 on canvas, so it clears the 3:1 non-text minimum on every surface. It is used only on interactive boundaries.

### Text

- **Parchment** (text-heading, #E9D8C4): headlines, primary text, Item titles and the focus ring. 11.1 to 13.2:1.
- **Linen** (text-body, #DACAB8): running text. 9.7 to 11.5:1.
- **Sand** (text-secondary, #C3B5A4): sub-headings and supporting copy. 7.7 to 9.2:1.
- **Taupe** (text-muted, #988E81): captions, labels and the meta line on cards, and the label of a disabled accent control. 4.8 to 5.7:1, so it is the smallest tier allowed on a card.
- **Dust** (text-faint, #877E74): fine print and timestamps, **on canvas only** (4.61:1). On any card it drops below 4.5:1 (3.9 to 4.4:1), so meta on cards uses Taupe instead.

### Accent

- **Rust** (accent, #A8492B): the primary action's fill and the resurfacing signal: the logo's rising dot, the lit card's 1px edge and glow, the thread that draws to it, the dot that rises on its corner. As text it is allowed only at display sizes (24px and up) on canvas, where its 3.2:1 passes the large-text rule; on cards it is 2.69 to 3.05:1, so it is never a link, a focus ring, a label or small text.
- **Fired Rust** (accent-active, #863A22): hover and press on a filled accent control.
- **Unlit Rust** (accent-disabled, #282624): a disabled accent control's fill, the same value as the hairline, with its label in Taupe.
- **On Rust** (on-accent, #FFFFFF): text and icons on Rust (5.75:1) and Fired Rust (7.95:1).

### Status

- **Saved Green** (success, #5DB872): confirmations and successful saves.
- **Amber** (warning, #D4A017): caution. Rare.
- **Error Red** (danger, #D36E6E): error text, error borders and destructive actions. 4.58:1 on surface-strong up to 5.45:1 on canvas, so error text is readable on every surface.

### Allowed pairs

These are the pairs the token-contract test (`packages/ui/src/design-tokens.test.ts`) holds DESIGN.md to. A pair not on this list is not allowed.

- Parchment, Linen, Sand and Taupe on every surface (canvas, surface-soft, surface-card, surface-strong): 4.5:1.
- Dust on canvas: 4.5:1. Never on a card.
- Rust text on canvas: 3:1, display sizes (24px and up) only.
- On Rust on Rust and on Fired Rust: 4.5:1.
- Control Edge on every surface: 3:1.
- The Parchment focus ring on every surface: 3:1.
- Error Red on every surface: 4.5:1.
- Saved Green on every surface: 4.5:1.
- Taupe on Unlit Rust (a disabled accent control's label): 4.5:1.
- Unlit Room on Saved Green and on Error Red (the extension's toolbar badge): 4.5:1.

### Named Rules

**The Rust Means Back or Act Rule.** Rust has two meanings: the primary action (one filled button per view) and an Item coming back. It is never a link colour, a focus ring, a label, an icon colour or small text. If a new surface wants rust anywhere else, use Parchment instead. Links are Parchment with an underline.

**The One Beige Family Rule.** Text comes in five warm tiers, Parchment to Dust, and nothing else. A new level of emphasis picks one of the five; it does not introduce a new grey or an opacity of white.

**The Errors Are Red Rule.** Errors and destructive actions are Error Red, and red means nothing else. It never competes with Rust, which still means "act" or "came back".

**The Borders Are Steps Rule.** Surfaces separate by tonal steps first. The hairline is decoration; anything a User acts on carries the Control Edge, and anything focused carries the Parchment ring.

## Typography

**Serif:** Spectral (with Georgia, 'Times New Roman', serif)
**Sans:** Work Sans (with ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif)
**Mono:** JetBrains Mono (with ui-monospace, 'SF Mono', 'Cascadia Code', Consolas, monospace)
**Hand:** Caveat, one line only

**Character:** The family is chosen by what the words are. Spectral sets language about meaning: what a save is, what came back, what an empty library is waiting for. Work Sans sets the interface: buttons, fields, running text, card titles. JetBrains Mono sets what the product records about an Item: its source domain, its URL, when it was saved, how far it was read. If it is a timestamp, a domain, a count or a key, it is mono.

### Hierarchy

- **Display XL** (display-xl, Spectral 600, clamp(36px, 8.4cqi, 56px), line-height 1.06, -0.02em): the waitlist and marketing hero headline only. Never in the app.
- **Display** (display, Spectral 600, 32/38, -0.01em): page titles, empty states and the wordmark.
- **Heading** (heading, Spectral 600, 20/26): section headings and panel titles.
- **Body lead** (body-lead, Work Sans 400, 17/28): the paragraph under a hero headline, capped at about 30em.
- **Body** (body, Work Sans 400, 15/24): running text, field text and dialog copy.
- **Body small** (body-sm, Work Sans 400, 13/20): supporting copy, toasts, the Cue, the extension popup.
- **Card title** (card-title, Work Sans 500, 14/20): Item titles on cards (clamped to whole lines, never cut mid-word) and button labels.
- **Label** (label, Work Sans 500, 12/16, 0.04em, uppercase): tags, Item type badges, form labels and table headers. Nothing else.
- **Mono** (mono, JetBrains Mono 400, 13/20): source domains, URLs and timestamps in running layouts.
- **Mono small** (mono-sm, JetBrains Mono 400, 11/16): the meta line on cards ("example.com · saved in March").
- **Hand** (hand, Caveat 500, 22px on phones up to 28px from 640px, line-height 1.15): the one handwritten sentence above the waitlist headline. Upright, never italic.

### Named Rules

**The Machine Speaks Mono Rule.** Anything the product records about an Item (when, where from, how far read, how many) is JetBrains Mono, at mono-sm on cards and mono elsewhere. Sentences a person reads are never mono.

**The Colour, Not Slant Rule.** Emphasis inside a headline is colour, not italic: an `em` set upright in Rust, and only inside a display-size headline about saving and bringing back, where Rust text passes the large-text rule.

**The Label Is Not an Eyebrow Rule.** The uppercase label style is for tags, Item type badges, form labels and table headers only. It is never placed above a headline as a kicker or eyebrow; headings stand unboxed.

**The Caveat Once Rule.** Caveat appears exactly once, in the sentence above the waitlist headline. Nowhere else, in no other surface.

## Layout

Every surface sits on the 4px spacing scale (4, 8, 12, 16, 24, 32, 48, 64, 96) and nothing else; the one off-scale value is the 6px `inset` that keeps a button concentric inside its panel. Layout is calm and spacious: content groups breathe at 24 to 48px, related controls sit 8px apart, and floating palettes stack 8px apart.

### Breakpoints

- **Below 640px:** phones. One column, 16px side gutters (20px on the waitlist).
- **640px (`sm`):** tablets and landscape phones. Desktop component and type sizes switch on here.
- **1024px (`lg`):** desktop. Side-by-side layouts (the waitlist's two columns, the library's detail panel beside the grid) start here.
- **1440px:** the widest frame. Content stops growing and centres; extra width becomes margin.

Base text is 15px on phones and 16px from 640px on the marketing pages; the app keeps the 15px body everywhere.

### Waitlist and marketing pages

The waitlist is a single screen that fills one dynamic viewport (`min-height: 100dvh`) and only grows, so the page scrolls, when the viewport is too short for the form. The card wall is absolutely positioned behind everything and laid out to keep clear of the nav, the copy column, the demo and the footer: 48px of air round the copy and the demo, 20px round the nav and footer, and about a third of the cards left out so the content never sits in a crowd. The copy therefore always sits on the canvas, never over a card, which is what lets the headline's Rust words pass.

From 1024px the main area is a two-column grid: the copy column up to 640px and a fixed 488px demo column, vertically centred, an 8px gap, 88px top and bottom padding, 32px right padding and a left gutter of clamp(32px, 5.56vw, 80px), growing past 1440px to half the extra width, so the pair stays where the 1440px frame puts it. The copy column is a size container, so the `display-xl` headline scales with its width (8.4cqi). Below 1024px the layout stacks in one centred column, 520px at most: 20px side gutters, 80px top padding to clear the nav (64px on a screen under 600px tall), the copy, then the demo 24px below, as wide as the form and reduced to its search bar. Room is kept under the demo for the cards it finds (264px on a phone, 220px from 640px) and given up first on a short screen.

From 640px the wall is a wall of columns centred on the screen, with the promised cards in a row under the demo; below 640px it is four phone cards in two columns under the demo, as wide as it. The nav pill floats at the top (12px inset on phones, 20px from 640px), centred at up to 720px; the footer pill floats 8 to 14px from the bottom, sized to its content. The secondary pages (privacy, 404) are a single 640px reading column under a sticky nav pill.

### Web app: the Library

The app shell is a sticky top bar over a scrolling Library, all on the canvas.

- **Top bar** (`app-topbar`): 56px tall, 24px side padding (16px below 640px). The logo lockup (22px tall) on the left; the search field in the middle (`text-input` with a leading 20px magnifier, up to 480px wide, collapsing to an icon button below 640px); on the right the Save button (the view's one `button-primary`) and the account `button-icon`. It separates from the Library by a 1px hairline only once the page has scrolled.
- **Tag filter row:** directly under the top bar, a single row of `tag-chip`s 8px apart, "All" first, 16px of vertical padding. It scrolls sideways on overflow (no visible scrollbar, a 24px fade at the clipped edge) rather than wrapping.
- **Item grid:** `grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))` with a 16px gap, 24px side padding (16px below 640px), capped at 1440px wide and centred. Items are newest first. Below 640px the 240px minimum gives one column on most phones.
- **Item detail panel:** opening an Item shows its detail beside the grid from 1024px, as a 400px panel docked to the right edge under the top bar (`surface-card`, a hairline left edge, its own scroll), and the grid reflows into the remaining width. Below 1024px it is a full-screen sheet over the Library with a back icon button. Inside, 24px padding and 24px between groups: the Thumbnail, the title in `heading`, the source domain and saved date in `mono`, the description in `body`, the Item's tags, the actions (secondary "Open", danger "Delete") and then Related Items.

### Chrome extension popup

The popup (`extension-popup`) is 360px wide, its height set by its content, on the canvas with 16px padding: the logo lockup (20px tall) at the top, 16px above the state's content, and any actions in a row 8px apart at the bottom. The options page uses the same content centred in a 480px column on a full tab.

### Emails

Every email (the Welcome email, the early-access email, the Rediscover digest) is a single 600px column (`email-container`), centred on a full-width canvas table, 32px padding (16px when the screen is narrower than the column). Content stacks top to bottom, centred: the logo lockup, the heading 32px below it, the body 12px below that, then the button or the Items, then the founder's signature 32px below. There are no side-by-side columns; mail apps break them.

## Elevation & Depth

Depth is tonal first. At rest, a surface sits one step above whatever it is on: canvas, then surface-soft, then surface-card, then surface-strong, each a few points lighter and warmer. Most of the system needs nothing more. A 1px hairline may sharpen an edge, but it reads as one more step, not as a line.

Only things that float get a shadow: the floating palettes (the nav pill, the toast, menus), the Cue, and dialogs. Their shadows are long, low and black, with a heavy negative spread, so the surface reads as lifted without a visible halo, often with a 1px black ring to cut it from the wall behind. Palettes that float over the card wall are frosted: a 90 to 94% fill of their surface with a 14 to 16px backdrop blur, so the wall shows through faintly. Nothing else is translucent.

### Shadow vocabulary

- **Field rest** (`box-shadow: inset 0 1px 0 rgb(233 216 196 / 0.04), 0 24px 48px -28px rgb(0 0 0 / 0.8)`): the waitlist's email field (`input-search`): a faint Parchment top highlight and a drop beneath.
- **Palette** (`box-shadow: 0 24px 48px -16px rgb(0 0 0 / 0.6), 0 2px 8px rgb(0 0 0 / 0.35)`): floating palettes: the sticky nav pill on the secondary pages, the toast, menus.
- **Window** (`box-shadow: 0 0 0 1px rgb(0 0 0 / 0.45), 0 30px 60px -30px rgb(0 0 0 / 0.9)`): the browser window in the waitlist demo.
- **Cue** (`box-shadow: 0 0 0 1px rgb(0 0 0 / 0.4), 0 30px 60px -24px rgb(0 0 0 / 0.95)`): the Cue, the highest surface on its screen.
- **Dialog** (`box-shadow: 0 0 0 1px rgb(0 0 0 / 0.4), 0 40px 80px -24px rgb(0 0 0 / 0.9)`): dialogs, always over the scrim.
- **Scrim** (`background: rgb(0 0 0 / 0.6)`): the full-screen layer under a dialog or the detail sheet below 1024px. Flat black, no blur.
- **Lit glow** (`box-shadow: 0 0 0 1px #A8492B, 0 0 28px rgb(168 73 43 / 0.45)`; a 22px blur on phones): an Item that has come back. The only coloured light in the system.
- **Pile edges** (`box-shadow: 0 5px 0 -2px #201E1D, 0 5px 0 -1px rgb(233 216 196 / 0.1), 0 10px 0 -5px #201E1D, 0 10px 0 -4px rgb(233 216 196 / 0.08)`): a stacked card on the waitlist wall, two card edges peeking out below it. It depicts the pile of Items (the same stack as the logo's bars) and is used only on stacked Item cards.

### Named Rules

**The Only Light Is Rust Rule.** Shadows are black and soft. There are no white glows and no coloured light anywhere except the Rust lit glow on an Item that has come back, and its thread. Focus is an outline, never a glow.

### Motion

Movement is how depth changes, so it lives here. Everything moves on one curve, the spring: `cubic-bezier(0.32, 0.72, 0, 1)`, a quick start that settles slowly. Only opacity and transform animate (plus colour, border and shadow on hover), never layout.

- **150ms:** hover and colour changes: a button's fill, a chip's text, an edge brightening.
- **300ms:** small state changes: the 0.97 press scale and its release, a chip being selected, a toast or a dialog fading and scaling in from 0.98.
- **600ms:** surfaces arriving: the detail panel sliding in from the right (from below as a sheet), the Cue's fade, the joined card replacing the waitlist form.
- **900ms:** Resurfacing: a card lighting up, its thread drawing in, its dot rising, the Cue moving into place, the wall fading in, and the staggered rise of the waitlist's parts on load. Rest is slow on purpose; this is the moment the product exists for.

Two motions run on their own timing, and they are the only exceptions to the spring: the card wall's drift (44s, `ease-in-out`, alternating, a few pixels to and fro) and the spark that runs along a drawn thread (1.4s, `linear`, repeating). A looping skeleton pulse on a Processing card uses the spring at 900ms, alternating.

**Reduced motion.** Under `prefers-reduced-motion: reduce` nothing animates or transitions, and every part shows in its final, still state: the wall in place without drift, a lit card already lit with its thread drawn (no spark) and its dot risen, the Cue in place, skeleton bars at full opacity, panels and dialogs present without a slide or fade. State still changes; it just changes at once. Nothing that carries meaning is conveyed by motion alone.

## Shapes

Everything is soft-cornered and nested concentrically: an element inside a rounded container takes the container's radius minus the inset between them, so the curves stay parallel. A 14px panel with a 6px inset holds a 10px button; that is the canonical pairing, and it is why the waitlist field and the nav pill pad 6px on their button side and more on their text side.

- **Pill** (`rounded.pill`, 9999px): things that frame the screen or toggle a filter: the nav pill, the footer pill, buttons inside a pill, tag chips, the browser demo's address bar.
- **Panel** (`rounded.panel`, 14px): surfaces a User reads or types into at length: the waitlist email field and its joined card, the Cue, dialogs and the Library's detail panel as a sheet.
- **Card** (`rounded.card`, 12px): Item cards, the browser demo's window, toasts.
- **Button inset** (`rounded.button-inset`, 10px): buttons, text inputs and icon buttons.
- **Tile** (`rounded.tile`, 8px): small tiles: a Thumbnail inset inside a card, the Related Items thumbnail, the Cue's logo tile, icon tiles.
- **Keycap** (`rounded.keycap`, 6px): keycaps and Item type badges. Favicons take 4px and skeleton bars 2 to 3px.

The same radius holds at every breakpoint.

**Borders are 1px**, always: a hairline where the edge is decoration, a control-border where it marks something a User types into or ticks, Error Red on a field in error. Nothing is drawn with a 2px border; the 2px line in the system is the focus outline.

### Imagery

- **On the waitlist wall,** Item cards never carry photographs. Their picture is a flat, seeded "sun over a ridge" placeholder: a sun disc in Parchment at 20% and a ridge in Parchment at 9% over surface-strong, with the ground below the ridge in canvas at 45%. It is a stand-in that says "a picture was here" without a real one.
- **In the Library,** Item cards show the Item's real Thumbnail, cropped with `object-fit: cover` to a 16:9 frame that runs edge to edge across the top of the card and shares its 12px top corners. An Item without a Thumbnail shows no picture area and no placeholder: its card is text only, and the grid's rows absorb the difference. Thumbnails are never overlaid with text or badges.

## Components

Every component below is built from the frontmatter tokens; the token names in brackets are its frontmatter entries. Every interactive component shares one focus treatment: on `:focus-visible`, a 2px solid Parchment (`text-heading`) outline at a 2px offset, following the component's radius. It appears at once, without a transition, and it is never Rust.

### Buttons

Quiet, solid and tactile. Every button is 40px tall (36px inside a pill), labelled in `card-title` (Work Sans 500, 14/20), with a 10px radius (a pill inside a pill), and a 20px icon where it has one, 8px from the label.

- **Primary** (`button-primary`): Rust fill, On Rust label. The one filled Rust button per view: the action the view exists for (Save in the Library, Join on the waitlist form, the email's call to action). It may carry a trailing ↵ keycap.
- **Primary, hover and press** (`button-primary-active`): the fill steps to Fired Rust on hover (150ms) and stays there while pressed.
- **Primary, disabled** (`button-primary-disabled`): Unlit Rust fill, Taupe label, no hover, no press scale, a default cursor. A busy button ("Saving…", "Joining…") takes the disabled look, swaps its label and drops its keycap.
- **Secondary** (`button-secondary`): Strong Brown fill, Parchment label, a 1px Control Edge. Hover brightens the edge to Taupe. Used for every action that is not the view's primary, including the waitlist nav's "Join the waitlist" pill, so the form's submit stays the page's one Rust fill.
- **Ghost** (`button-ghost`): no fill, no edge, Linen label, 12px side padding. Hover fills it one tonal step above the surface it sits on and lifts the label to Parchment. For low-weight actions: Cancel, "Open Library", inline actions in a toast.
- **Danger** (`button-danger`): Strong Brown fill, Error Red label and a 1px Error Red edge, so it reads as destructive on any surface. Hover steps the fill down to Card Brown, where Error Red still holds 4.9:1; the label and edge stay Error Red. Used only to confirm a destructive action (Delete in the delete-confirm dialog), never for the action that opens that dialog, which is a ghost or icon button.
- **Icon** (`button-icon`): a 36px square, 10px radius, no fill, a 20px icon in Sand. Hover fills it Strong Brown and lifts the icon to Parchment. It always has an `aria-label`, and a tooltip on hover from 640px.

**States, for every button:** hover changes colour over 150ms on the spring; press scales to 0.97 over 300ms and springs back on release; focus is the shared Parchment outline; disabled removes hover and press and sets the label in Taupe. A disabled button stays in the tab order only when its reason is explained nearby.

### Keycap (signature)

A small key etched into the interface, purely decorative (`aria-hidden`), set in `mono-sm` (JetBrains Mono 11/16).

- **Standalone** (`keycap`): Strong Brown fill, Sand glyph, a 1px hairline edge, 6px radius, 22px tall with a 22px minimum width and 6px side padding. For keyboard hints beside text ("↵ to save").
- **Inside a button:** the keycap takes the button's label colour (On Rust on a primary): its edge is that colour at 18% and its fill that colour at 7%, so it reads as a key pressed into the button. 6px radius in a 10px button, a 26px circle in a pill button, 8px from the label and 6px from the button's trailing edge. It hides below 360px wide.

### Inputs and fields

- **Text input** (`text-input`): Card Brown fill, a 1px Control Edge, 10px radius, 40px tall, 12px side padding, `body` text in Linen, placeholder in Taupe. Its label sits 8px above it in `label` style, Sand; help text sits 8px below in `body-sm`, Taupe.
- **Search field, the waitlist email field** (`input-search`): Card Brown fill, a 1px Control Edge, 14px radius, the Field rest shadow, `body` text in Parchment, padding 6px on the button's side and 16px on the text's. A 20px envelope icon in Taupe leads from 640px; the primary button docks inside on the right with a 10px radius. Capped at 520px.
- **Hover:** the edge brightens to Taupe (150ms).
- **Focus:** the shared Parchment outline, 2px at a 2px offset, round the whole field (`:focus-within` for the search field, whose drop shadow stays). The edge does not turn Rust or glow.
- **Error:** the edge turns Error Red and a message row below (8px gap) shows a 16px warning icon and the message in `body-sm`, both Error Red. The field gets `aria-invalid` and is described by the message. The error clears on the next edit.
- **Disabled:** Soft Band fill, hairline edge, Taupe text, no hover.
- **Success, the waitlist's joined card:** the form is replaced (600ms) by a panel of the same shape on Card Brown: a 24px Saved Green check, the confirmation in `card-title` Parchment and the follow-up in `body-sm` Sand, while the logo's Rust dot rises out of its stack once. The proof line under the form (how many have joined) is `mono` in Taupe.
