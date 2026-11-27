import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const designMd = readFileSync(new URL("../../../DESIGN.md", import.meta.url), "utf8");
const sidecar = JSON.parse(
  readFileSync(new URL("../../../.impeccable/design.json", import.meta.url), "utf8"),
) as {
  extensions?: { colorMeta?: Record<string, { canonical?: string }> };
  components?: unknown;
  narrative?: Narrative;
};

// DESIGN.md split once: its YAML frontmatter (the tokens) and the prose body after it.
function split(markdown: string): { tokens: Record<string, unknown>; body: string } {
  const match = /^---\n(?<yaml>[\s\S]*?)\n---\n(?<body>[\s\S]*)$/.exec(markdown);
  if (match?.groups?.yaml === undefined) throw new Error("DESIGN.md has no YAML frontmatter");
  return {
    tokens: parse(match.groups.yaml) as Record<string, unknown>,
    body: match.groups.body ?? "",
  };
}

const { tokens, body: designBody } = split(designMd);

function lookup(path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        node !== null && typeof node === "object"
          ? (node as Record<string, unknown>)[key]
          : undefined,
      tokens,
    );
}

function references(node: unknown): string[] {
  if (typeof node === "string") return [...node.matchAll(/\{([^}]+)\}/g)].map((m) => m[1] ?? "");
  if (node !== null && typeof node === "object") return Object.values(node).flatMap(references);
  return [];
}

// In the prose a reference is a dotted path in braces ({colors.accent}); braces
// around anything else, such as a CSS rule, are not one.
function proseReferences(body: string): string[] {
  return [...body.matchAll(/\{([a-z][\w-]*(?:\.[\w-]+)+)\}/g)].map((m) => m[1] ?? "");
}

// DESIGN.md's frontmatter colour names, so a typo in a pair below fails type-checking.
type ColorName =
  | "canvas"
  | "surface-soft"
  | "surface-card"
  | "surface-strong"
  | "hairline"
  | "control-border"
  | "text-heading"
  | "text-body"
  | "text-secondary"
  | "text-muted"
  | "text-faint"
  | "accent"
  | "accent-active"
  | "accent-disabled"
  | "on-accent"
  | "success"
  | "warning"
  | "danger";

function color(name: ColorName): string {
  const value = lookup(`colors.${name}`);
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) {
    throw new Error(`colors.${name} is not a #rrggbb colour (got ${String(value)})`);
  }
  return value;
}

// WCAG 2.x relative luminance and contrast ratio.
// The sRGB channel at `offset` in a #rrggbb colour, converted to linear light.
function srgbChannelToLinear(hex: string, offset: number): number {
  const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  return (
    0.2126 * srgbChannelToLinear(hex, 1) +
    0.7152 * srgbChannelToLinear(hex, 3) +
    0.0722 * srgbChannelToLinear(hex, 5)
  );
}

function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

type Pair = { foreground: ColorName; background: ColorName; minimum: number; role: string };

const SURFACES: ColorName[] = ["canvas", "surface-soft", "surface-card", "surface-strong"];
const TEXT_ON_EVERY_SURFACE: ColorName[] = [
  "text-heading",
  "text-body",
  "text-secondary",
  "text-muted",
];

const onEverySurface = (foreground: ColorName, minimum: number, role: string): Pair[] =>
  SURFACES.map((background) => ({ foreground, background, minimum, role }));

// The contract: every colour pair DESIGN.md allows. Forbidden pairs (text-faint
// on cards, accent as small text, accent as a focus ring) are left out on purpose.
const ALLOWED_PAIRS: Pair[] = [
  ...TEXT_ON_EVERY_SURFACE.flatMap((text) => onEverySurface(text, 4.5, "text")),
  { foreground: "text-faint", background: "canvas", minimum: 4.5, role: "fine print" },
  { foreground: "accent", background: "canvas", minimum: 3, role: "display-size text" },
  { foreground: "on-accent", background: "accent", minimum: 4.5, role: "text on accent" },
  { foreground: "on-accent", background: "accent-active", minimum: 4.5, role: "text on accent" },
  ...onEverySurface("control-border", 3, "control boundary"),
  ...onEverySurface("text-heading", 3, "focus ring"),
  ...onEverySurface("danger", 4.5, "error text"),
  ...onEverySurface("success", 4.5, "confirmation text"),
  ...onEverySurface("warning", 4.5, "caution text and icon"),
  { foreground: "text-muted", background: "accent-disabled", minimum: 4.5, role: "disabled label" },
  { foreground: "canvas", background: "success", minimum: 4.5, role: "toolbar badge" },
  { foreground: "canvas", background: "danger", minimum: 4.5, role: "toolbar badge" },
];

type Rule = { name: string; body: string };
type Narrative = { northStar?: string; rules?: Rule[]; dos?: string[]; donts?: string[] };

// The narrative DESIGN.md's prose states: its North Star line, every
// "**The [Name] Rule.** [body]" paragraph, and its Do and Don't bullets.
function prose(body: string): Required<Narrative> {
  const northStar = /\*\*Creative North Star: "(?<name>[^"]+)"\*\*/.exec(body)?.groups?.name ?? "";
  const rules = [...body.matchAll(/^\*\*(?<name>The [^*]+? Rule)\.\*\* (?<text>.+)$/gm)].map(
    (m) => ({ name: m.groups?.name ?? "", body: m.groups?.text ?? "" }),
  );
  const bullets = (lead: string) =>
    [...body.matchAll(new RegExp(`^- (\\*\\*${lead}\\*\\* .+)$`, "gm"))].map((m) => m[1] ?? "");
  return { northStar, rules, dos: bullets("Do"), donts: bullets("Don't") };
}

const byName = (rules: Rule[]) =>
  rules.map(({ name, body }) => ({ name, body })).sort((a, b) => a.name.localeCompare(b.name));
const sorted = (lines: string[]) => [...lines].sort();

const upper = (hex: string) => hex.toUpperCase();

// Shadows and the scrim are drawn in plain black at an opacity; it is the one
// colour the sidecar may use that is not a DESIGN.md token.
const SHADOW_BLACK = "#000000";

const toHex = (channels: string[]) =>
  `#${channels.map((c) => Number(c).toString(16).padStart(2, "0")).join("")}`.toUpperCase();

// Every colour the sidecar renders, as #RRGGBB: hex (an #rrggbbaa's alpha is
// dropped) and rgb()/rgba() in either space- or comma-separated form. A colour
// written any other way, such as #rgb, comes back as written so the check fails on it.
function renderedColours(text: string): string[] {
  const hexes = [...text.matchAll(/#[0-9a-f]+/gi)].map(([hex]) =>
    hex.length === 7 || hex.length === 9 ? upper(hex.slice(0, 7)) : hex,
  );
  const rgbs = [...text.matchAll(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/gi)].map((m) =>
    toHex(m.slice(1, 4)),
  );
  return [...hexes, ...rgbs];
}

describe("Impeccable sidecar palette", () => {
  const palette = Object.fromEntries(
    Object.entries(tokens.colors as Record<string, string>).map(([name, hex]) => [
      name,
      upper(hex),
    ]),
  );

  it("gives every DESIGN.md colour, and only those, its frontmatter hex", () => {
    const colorMeta = sidecar.extensions?.colorMeta ?? {};
    const canonical = Object.fromEntries(
      Object.entries(colorMeta).map(([name, meta]) => [name, upper(meta.canonical ?? "")]),
    );

    expect(Object.keys(palette).length).toBeGreaterThan(0);
    expect(canonical).toEqual(palette);
  });

  it("uses only DESIGN.md colours in its shadows and component snippets", () => {
    const colours = renderedColours(JSON.stringify([sidecar.extensions, sidecar.components]));
    const known = new Set([...Object.values(palette), SHADOW_BLACK]);

    expect(colours.length).toBeGreaterThan(0);
    expect([...new Set(colours.filter((colour) => !known.has(colour)))]).toEqual([]);
  });
});

describe("Impeccable sidecar narrative", () => {
  const documented = prose(designBody);
  const narrative = sidecar.narrative ?? {};

  it("carries DESIGN.md's North Star", () => {
    expect(documented.northStar).not.toBe("");
    expect(narrative.northStar).toBe(documented.northStar);
  });

  it("carries every named rule word for word", () => {
    expect(documented.rules.length).toBeGreaterThan(0);
    expect(byName(narrative.rules ?? [])).toEqual(byName(documented.rules));
  });

  it("carries every Do and Don't word for word", () => {
    expect(documented.dos.length).toBeGreaterThan(0);
    expect(documented.donts.length).toBeGreaterThan(0);
    expect(sorted(narrative.dos ?? [])).toEqual(sorted(documented.dos));
    expect(sorted(narrative.donts ?? [])).toEqual(sorted(documented.donts));
  });
});

describe("DESIGN.md token contract", () => {
  it.each(ALLOWED_PAIRS)(
    "$foreground on $background meets $minimum:1 ($role)",
    ({ foreground, background, minimum }) => {
      expect(contrast(color(foreground), color(background))).toBeGreaterThanOrEqual(minimum);
    },
  );

  it("resolves every {path.to.token} reference to a defined token", () => {
    const refs = references(tokens);
    const dangling = refs.filter((ref) => lookup(ref) === undefined);

    expect(refs.length).toBeGreaterThan(0);
    expect(dangling).toEqual([]);
  });

  it("resolves every {path.to.token} reference in the prose to a defined token", () => {
    const dangling = proseReferences(designBody).filter((ref) => lookup(ref) === undefined);

    expect(dangling).toEqual([]);
  });
});
