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
