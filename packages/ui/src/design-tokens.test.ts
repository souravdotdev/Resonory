import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const designMd = readFileSync(new URL("../../../DESIGN.md", import.meta.url), "utf8");

function frontmatter(markdown: string): Record<string, unknown> {
  const match = /^---\n(?<yaml>[\s\S]*?)\n---\n/.exec(markdown);
  if (match?.groups?.yaml === undefined) throw new Error("DESIGN.md has no YAML frontmatter");
  return parse(match.groups.yaml) as Record<string, unknown>;
}

const tokens = frontmatter(designMd);

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

function color(name: string): string {
  const value = lookup(`colors.${name}`);
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) {
    throw new Error(`colors.${name} is not a #rrggbb colour (got ${String(value)})`);
  }
  return value;
}

// WCAG 2.x relative luminance and contrast ratio.
function linear(hex: string, offset: number): number {
  const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  return 0.2126 * linear(hex, 1) + 0.7152 * linear(hex, 3) + 0.0722 * linear(hex, 5);
}

function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

type Pair = { foreground: string; background: string; minimum: number; role: string };

const SURFACES = ["canvas", "surface-soft", "surface-card", "surface-strong"];
const TEXT_ON_EVERY_SURFACE = ["text-heading", "text-body", "text-secondary", "text-muted"];

const onEverySurface = (foreground: string, minimum: number, role: string): Pair[] =>
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
  { foreground: "text-muted", background: "accent-disabled", minimum: 4.5, role: "disabled label" },
  { foreground: "canvas", background: "success", minimum: 4.5, role: "toolbar badge" },
  { foreground: "canvas", background: "danger", minimum: 4.5, role: "toolbar badge" },
];

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
});
