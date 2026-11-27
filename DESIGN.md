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
