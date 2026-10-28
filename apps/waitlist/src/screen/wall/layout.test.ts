import { describe, expect, it } from "vitest";
import {
  COLUMNS_MIN_WIDTH,
  DESKTOP_MIN_WIDTH,
  footprint,
  layoutWall,
  type Box,
  type Point,
  type WallCard,
  type WallScene,
} from "./layout";
import { PROMISED_ITEMS } from "./items";

const box = (x: number, y: number, width: number, height: number): Box => ({ x, y, width, height });

/**
 * A screen as the rendered page measures it (`next build` + `next start`):
 * its size (the page's, so taller than the window where the page scrolls),
 * the demo, its extension icon's centre, and the nav, copy and footer.
 */
const screen = (
  width: number,
  height: number,
  demo: Box,
  anchor: Point,
  nav: Box,
  copy: Box,
  footer: Box,
): { name: string; scene: WallScene } => ({
  name: `${width}×${height}`,
  scene: { width, height, demo, anchor, keepClear: [nav, copy, footer] },
});

const SCREENS = [
  // Phones.
  screen(
    320,
    568,
    box(20, 390, 280, 126),
    { x: 280, y: 413 },
    box(12, 12, 296, 48),
    box(20, 72, 280, 294),
    box(69, 533, 182, 27),
  ),
  screen(
    360,
    740,
    box(20, 395, 320, 126),
    { x: 320, y: 418 },
    box(12, 12, 336, 48),
    box(20, 80, 320, 291),
    box(89, 705, 182, 27),
  ),
  screen(
    375,
    667,
    box(20, 400, 335, 126),
    { x: 335, y: 423 },
    box(12, 12, 351, 48),
    box(20, 80, 335, 296),
    box(97, 632, 182, 27),
  ),
  screen(
    375,
    812,
    box(20, 400, 335, 126),
    { x: 335, y: 423 },
    box(12, 12, 351, 48),
    box(20, 80, 335, 296),
    box(97, 777, 182, 27),
  ),
  screen(
    390,
    844,
    box(20, 401, 350, 126),
    { x: 350, y: 424 },
    box(12, 12, 366, 48),
    box(20, 81, 350, 296),
    box(104, 809, 182, 27),
  ),
  screen(
    430,
    932,
    box(20, 434, 390, 126),
    { x: 390, y: 457 },
    box(12, 12, 406, 48),
    box(20, 136, 390, 273),
    box(124, 897, 182, 27),
  ),
  // Tablets, and a phone held landscape (844×390, its page scrolling to 556).
  screen(
    640,
    900,
    box(60, 424, 520, 126),
    { x: 560, y: 447 },
    box(32, 20, 576, 50),
    box(60, 119, 520, 282),
    box(223, 856, 194, 30),
  ),
  screen(
    768,
    1024,
    box(124, 466, 520, 126),
    { x: 624, y: 489 },
    box(32, 20, 704, 50),
    box(124, 160, 520, 282),
    box(287, 980, 194, 30),
  ),
  screen(
    834,
    1194,
    box(157, 522, 520, 126),
    { x: 657, y: 545 },
    box(57, 20, 720, 50),
    box(157, 217, 520, 282),
    box(320, 1150, 194, 30),
  ),
  screen(
    936,
    1000,
    box(208, 458, 520, 126),
    { x: 708, y: 481 },
    box(108, 20, 720, 50),
    box(208, 152, 520, 282),
    box(371, 956, 194, 30),
  ),
  screen(
    844,
    556,
    box(162, 378, 520, 126),
    { x: 662, y: 401 },
    box(62, 20, 720, 50),
    box(162, 72, 520, 282),
    box(325, 512, 194, 30),
  ),
  // Desktops, from a short laptop to an ultrawide.
  screen(
    1024,
    600,
    box(504, 113, 488, 374),
    { x: 966, y: 175 },
    box(152, 20, 720, 50),
    box(57, 153, 439, 294),
    box(415, 556, 194, 30),
  ),
  screen(
    1024,
    768,
    box(504, 197, 488, 374),
    { x: 966, y: 259 },
    box(152, 20, 720, 50),
    box(57, 237, 439, 294),
    box(415, 724, 194, 30),
  ),
  screen(
    1280,
    600,
    box(719, 113, 488, 374),
    { x: 1181, y: 175 },
    box(280, 20, 720, 50),
    box(71, 149, 640, 303),
    box(543, 556, 194, 30),
  ),
  screen(
    1280,
    800,
    box(719, 213, 488, 374),
    { x: 1181, y: 275 },
    box(280, 20, 720, 50),
    box(71, 249, 640, 303),
    box(543, 756, 194, 30),
  ),
  screen(
    1440,
    900,
    box(728, 263, 488, 374),
    { x: 1190, y: 325 },
    box(360, 20, 720, 50),
    box(80, 299, 640, 303),
    box(623, 856, 194, 30),
  ),
  screen(
    1920,
    1080,
    box(968, 353, 488, 374),
    { x: 1430, y: 415 },
    box(600, 20, 720, 50),
    box(320, 389, 640, 303),
    box(863, 1036, 194, 30),
  ),
  screen(
    2560,
    1440,
    box(1288, 533, 488, 374),
    { x: 1750, y: 595 },
    box(920, 20, 720, 50),
    box(640, 569, 640, 303),
    box(1183, 1396, 194, 30),
  ),
];
const named = (name: string) => SCREENS.find((s) => s.name === name)!;
const PHONES = SCREENS.filter(({ scene }) => scene.width < COLUMNS_MIN_WIDTH);
const TABLETS = SCREENS.filter(
  ({ scene }) => scene.width >= COLUMNS_MIN_WIDTH && scene.width < DESKTOP_MIN_WIDTH,
);
const DESKTOPS = SCREENS.filter(({ scene }) => scene.width >= DESKTOP_MIN_WIDTH);
const COLUMN_WALLS = [...TABLETS, ...DESKTOPS];

const right = (b: Box) => b.x + b.width;
const bottom = (b: Box) => b.y + b.height;

const intersects = (a: Box, b: Box) =>
  a.x < right(b) && right(a) > b.x && a.y < bottom(b) && bottom(a) > b.y;

const grown = (b: Box, by: number) => box(b.x - by, b.y - by, b.width + 2 * by, b.height + 2 * by);

const insideScreen = (card: WallCard, { width, height }: WallScene) => {
  const { x, y, width: w, height: h } = footprint(card);
  return x >= 0 && y >= 0 && x + w <= width && y + h <= height;
};

const onEdge = ({ x, y }: Point, b: Box) => {
  const withinX = x >= b.x && x <= right(b);
  const withinY = y >= b.y && y <= bottom(b);
  return ((x === b.x || x === right(b)) && withinY) || ((y === b.y || y === bottom(b)) && withinX);
};

/** The points a thread's path runs through: its start, its rounded corners and its end. */
const pathPoints = (path: string): Point[] => {
  const numbers = [...path.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
  const points: Point[] = [];
  for (let i = 0; i + 1 < numbers.length; i += 2)
    points.push({ x: numbers[i]!, y: numbers[i + 1]! });
  return points;
};

/** The box a straight run from `a` to `b` covers. */
const run = (a: Point, b: Point) =>
  box(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(a.x - b.x), Math.abs(a.y - b.y));

const crossesBox = (a: Point, b: Point, kept: Box) => {
  const r = run(a, b);
  return r.x < right(kept) && right(r) > kept.x && r.y < bottom(kept) && bottom(r) > kept.y;
};

describe.each(SCREENS)("the wall at $name", ({ scene }) => {
  const layout = layoutWall(scene);
  const byId = new Map(layout.cards.map((card) => [card.id, card]));
  const found = layout.sequence.map((id) => byId.get(id)!);

  it("never puts a card behind the copy, form, demo, nav or footer", () => {
    for (const card of layout.cards) {
      for (const kept of [scene.demo, ...scene.keepClear]) {
        expect(intersects(footprint(card), kept), `${card.item.title} under a kept-clear box`).toBe(
          false,
        );
      }
    }
  });

  it("keeps every card on the screen or bleeding off its edge", () => {
    const whole = box(0, 0, scene.width, scene.height);
    for (const card of layout.cards) {
      expect(intersects(footprint(card), whole), card.item.title).toBe(true);
    }
  });

  it("sequences only fully visible cards with a thread, each once", () => {
    expect(new Set(layout.sequence).size).toBe(layout.sequence.length);
    for (const card of found) {
      expect(card, "a sequenced id").toBeDefined();
      expect(insideScreen(card, scene), card.item.title).toBe(true);
      expect(card.route, card.item.title).not.toBeNull();
    }
    const titles = found.map((card) => card.item.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("starts the sequence with the demo's first match wherever it fits", () => {
    if (layout.cards.some((card) => card.item === PROMISED_ITEMS[0])) {
      expect(found[0]!.item).toBe(PROMISED_ITEMS[0]);
    }
  });

  it("ends every thread route on its card's edge", () => {
    for (const card of layout.cards) {
      if (!card.route) continue;
      expect(onEdge(card.route.end, card.box), card.item.title).toBe(true);
      expect(card.route.path.endsWith(`L${card.route.end.x} ${card.route.end.y}`)).toBe(true);
    }
  });

  it("never runs a drawn thread behind the copy, nav or footer", () => {
    for (const card of found) {
      const points = pathPoints(card.route!.path);
      for (let i = 1; i < points.length; i++) {
        for (const kept of scene.keepClear) {
          expect(crossesBox(points[i - 1]!, points[i]!, kept), card.item.title).toBe(false);
        }
      }
    }
  });

  it("dims cards toward the screen's edges", () => {
    const toEdge = (card: WallCard) => {
      const cx = card.box.x + card.box.width / 2;
      const cy = card.box.y + card.box.height / 2;
      return Math.min(cx, scene.width - cx, cy, scene.height - cy);
    };
    const sorted = [...layout.cards].sort((a, b) => toEdge(a) - toEdge(b));
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]!.opacity).toBeGreaterThanOrEqual(sorted[i - 1]!.opacity);
    }
    for (const card of layout.cards) {
      expect(card.opacity).toBeGreaterThan(0);
      expect(card.opacity).toBeLessThan(0.5);
    }
  });
});

describe.each(COLUMN_WALLS)("the column wall at $name", ({ scene }) => {
  const layout = layoutWall(scene);
  // A short screen (a landscape phone, a 600px laptop) is mostly copy and demo: no room for all four.
  const roomy = scene.height >= 700;

  it("is filled: no 200px square of the screen is empty of cards and kept-clear boxes", () => {
    const SIDE = 200;
    const taken = [
      ...layout.cards.map(footprint),
      ...[scene.demo, ...scene.keepClear].map((b) => grown(b, 24)),
    ];
    const empty: string[] = [];
    for (let y = 0; y + SIDE <= scene.height; y += 8) {
      for (let x = 0; x + SIDE <= scene.width; x += 8) {
        const square = box(x, y, SIDE, SIDE);
        if (!taken.some((b) => intersects(square, b))) empty.push(`${x},${y}`);
      }
    }
    expect(empty).toEqual([]);
  });

  it.runIf(roomy)("places all four promised Items, fully visible and in the sequence", () => {
    for (const item of PROMISED_ITEMS) {
      const card = layout.cards.find((c) => c.item === item);
      expect(card, item.title).toBeDefined();
      expect(insideScreen(card!, scene), item.title).toBe(true);
      expect(layout.sequence).toContain(card!.id);
    }
  });

  it.runIf(roomy)("keeps the promised Items near the demo", () => {
    const demoCentre = {
      x: scene.demo.x + scene.demo.width / 2,
      y: scene.demo.y + scene.demo.height / 2,
    };
    const distance = (card: WallCard) =>
      Math.hypot(
        card.box.x + card.box.width / 2 - demoCentre.x,
        card.box.y + card.box.height / 2 - demoCentre.y,
      );
    const promised = layout.cards.filter((card) => PROMISED_ITEMS.includes(card.item));
    const visible = layout.cards.filter(
      (card) => !PROMISED_ITEMS.includes(card.item) && insideScreen(card, scene),
    );
    const median = visible.map(distance).sort((a, b) => a - b)[Math.floor(visible.length / 2)]!;
    const mean = promised.reduce((sum, card) => sum + distance(card), 0) / promised.length;
    expect(mean).toBeLessThan(median);
  });
});

describe.each(DESKTOPS)("the desktop wall at $name", ({ scene }) => {
  const layout = layoutWall(scene);

  it("is a desktop layout", () => {
    expect(layout.mode).toBe("desktop");
  });

  it("starts every thread at the extension icon", () => {
    for (const card of layout.cards) {
      if (!card.route) continue;
      expect(card.route.path.startsWith(`M${scene.anchor.x} ${scene.anchor.y} `)).toBe(true);
    }
  });
});

describe.each(TABLETS)("the tablet wall at $name", ({ scene }) => {
  const layout = layoutWall(scene);
  const byId = new Map(layout.cards.map((card) => [card.id, card]));

  it("is a tablet layout", () => {
    expect(layout.mode).toBe("tablet");
  });

  it("starts every drawn thread on the demo's edge, under the Cue or beside it", () => {
    for (const id of layout.sequence) {
      const card = byId.get(id)!;
      const start = pathPoints(card.route!.path)[0]!;
      expect(
        start.y === bottom(scene.demo) || start.x === scene.demo.x || start.x === right(scene.demo),
      ).toBe(true);
      expect(onEdge(start, scene.demo), card.item.title).toBe(true);
    }
  });

  it("gives no thread to a card above the demo, over the copy", () => {
    for (const card of layout.cards) {
      if (bottom(card.box) <= scene.demo.y) expect(card.route, card.item.title).toBeNull();
    }
  });

  it("is laid out symmetrically about the screen's middle", () => {
    const xs = new Set(
      layout.cards.map((card) => card.box.x + card.box.width / 2 - scene.width / 2),
    );
    for (const offset of xs) expect(xs.has(-offset), `column at ${offset}`).toBe(true);
  });
});

describe("the desktop wall at 1440×900", () => {
  const layout = layoutWall(named("1440×900").scene);

  it("puts the promised Items where the design does", () => {
    const at = (n: number) => layout.cards.find((c) => c.item === PROMISED_ITEMS[n])!.box;
    expect(at(0)).toEqual(box(1048, 695, 184, 120));
    expect(at(1)).toEqual(box(1248, 465, 184, 124));
    expect(at(2)).toEqual(box(1248, 291, 184, 146));
    expect(at(3)).toEqual(box(848, 711, 184, 78));
  });

  it("matches every fully visible Item, promised ones spread through", () => {
    const promisedAt = layout.sequence
      .map((id, i) => [i, layout.cards.find((c) => c.id === id)!] as const)
      .filter(([, card]) => PROMISED_ITEMS.includes(card.item))
      .map(([i]) => i);
    expect(promisedAt).toHaveLength(4);
    expect(promisedAt[3]! - promisedAt[0]!).toBeGreaterThan(layout.sequence.length / 2);
  });
});

describe.each(PHONES)("the phone wall at $name", ({ scene }) => {
  const layout = layoutWall(scene);

  it("is a phone layout whose cards share the demo's width, right under it", () => {
    expect(layout.mode).toBe("mobile");
    expect(layout.sequence).toEqual(layout.cards.map((card) => card.id));
    if (layout.cards.length === 0) return;
    expect(Math.min(...layout.cards.map((card) => card.box.x))).toBe(scene.demo.x);
    expect(Math.max(...layout.cards.map((card) => right(card.box)))).toBe(right(scene.demo));
    const top = Math.min(...layout.cards.map((card) => card.box.y));
    expect(top).toBeGreaterThan(bottom(scene.demo));
    expect(top - bottom(scene.demo)).toBeLessThanOrEqual(36);
  });
});

describe("the phone wall", () => {
  it("fills the bottom of the screen with the design's four cards, in the demo's order", () => {
    for (const name of ["375×812", "390×844", "430×932"]) {
      const layout = layoutWall(named(name).scene);
      expect(
        layout.cards.map((card) => card.item),
        name,
      ).toEqual([...PROMISED_ITEMS]);
    }
  });

  it("draws the tokens PDF as a stack, as the design does", () => {
    const layout = layoutWall(named("375×812").scene);
    expect(layout.cards.find((card) => card.item === PROMISED_ITEMS[3])!.stacked).toBe(true);
  });

  it("keeps one row of two cards on a screen with room for no more", () => {
    expect(layoutWall(named("360×740").scene).cards).toHaveLength(2);
  });

  it("falls back to a row of two PDFs on a screen too short for the design's rows", () => {
    const layout = layoutWall(named("375×667").scene);
    expect(layout.cards).toHaveLength(2);
    expect(layout.cards.every((card) => card.item.style === "pdf" && !card.stacked)).toBe(true);
    expect(layout.cards[0]!.item).toBe(PROMISED_ITEMS[3]);
  });

  it("leaves the wall empty rather than put a card under the footer", () => {
    const scene = named("320×568").scene;
    expect(layoutWall(scene).cards).toEqual([]);
    const short = layoutWall({
      ...named("375×812").scene,
      height: 700,
      keepClear: [box(12, 12, 351, 48), box(20, 80, 335, 296), box(97, 665, 182, 27)],
    });
    expect(short.cards.length).toBeLessThan(4);
    for (const card of short.cards) {
      expect(intersects(footprint(card), box(97, 665, 182, 27))).toBe(false);
    }
  });
});
