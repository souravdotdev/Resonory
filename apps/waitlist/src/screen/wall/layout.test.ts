import { describe, expect, it } from "vitest";
import { footprint, layoutWall, type Box, type WallCard, type WallScene } from "./layout";
import { PROMISED_SAVES } from "./saves";

const box = (x: number, y: number, width: number, height: number): Box => ({ x, y, width, height });

/**
 * The screen at each size the ticket names, as the rendered page measures it:
 * the demo, its extension icon's centre, and the nav, copy and footer.
 */
const SCREENS: { name: string; scene: WallScene }[] = [
  {
    name: "1440×900",
    scene: {
      width: 1440,
      height: 900,
      demo: box(728, 263, 488, 374),
      anchor: { x: 1190, y: 325 },
      keepClear: [box(360, 20, 720, 50), box(80, 299, 640, 303), box(623, 856, 194, 30)],
    },
  },
  {
    name: "1280×800",
    scene: {
      width: 1280,
      height: 800,
      demo: box(719, 213, 488, 374),
      anchor: { x: 1181, y: 275 },
      keepClear: [box(280, 20, 720, 50), box(71, 249, 640, 303), box(543, 756, 194, 30)],
    },
  },
  {
    name: "1024×768",
    scene: {
      width: 1024,
      height: 768,
      demo: box(504, 197, 488, 374),
      anchor: { x: 966, y: 259 },
      keepClear: [box(152, 20, 720, 50), box(57, 237, 439, 294), box(415, 724, 194, 30)],
    },
  },
  {
    name: "375×812",
    scene: {
      width: 375,
      height: 812,
      demo: box(20, 400, 335, 126),
      anchor: { x: 335, y: 423 },
      keepClear: [box(12, 12, 351, 48), box(20, 80, 335, 296), box(97, 777, 182, 27)],
    },
  },
];
const DESKTOP_SCREENS = SCREENS.filter(({ scene }) => scene.width >= 1024);

const intersects = (a: Box, b: Box) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

const insideScreen = (card: WallCard, { width, height }: WallScene) => {
  const { x, y, width: w, height: h } = footprint(card);
  return x >= 0 && y >= 0 && x + w <= width && y + h <= height;
};

const onEdge = ({ x, y }: { x: number; y: number }, b: Box) => {
  const withinX = x >= b.x && x <= b.x + b.width;
  const withinY = y >= b.y && y <= b.y + b.height;
  return (
    ((x === b.x || x === b.x + b.width) && withinY) ||
    ((y === b.y || y === b.y + b.height) && withinX)
  );
};

describe.each(SCREENS)("the wall at $name", ({ scene }) => {
  const layout = layoutWall(scene);
  const byId = new Map(layout.cards.map((card) => [card.id, card]));

  it("puts cards on the wall", () => {
    expect(layout.cards.length).toBeGreaterThanOrEqual(4);
  });

  it("never puts a card behind the copy, form, demo, nav or footer", () => {
    for (const card of layout.cards) {
      for (const kept of [scene.demo, ...scene.keepClear]) {
        expect(intersects(footprint(card), kept), `${card.save.title} under a kept-clear box`).toBe(
          false,
        );
      }
    }
  });

  it("keeps every card on the screen or bleeding off its edge", () => {
    const screen = box(0, 0, scene.width, scene.height);
    for (const card of layout.cards) {
      expect(intersects(footprint(card), screen), card.save.title).toBe(true);
    }
  });

  it("sequences only fully visible cards, each once", () => {
    expect(layout.sequence.length).toBeGreaterThan(0);
    expect(new Set(layout.sequence).size).toBe(layout.sequence.length);
    for (const id of layout.sequence) {
      const card = byId.get(id);
      expect(card, id).toBeDefined();
      expect(insideScreen(card!, scene), card!.save.title).toBe(true);
    }
    const titles = layout.sequence.map((id) => byId.get(id)!.save.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("starts the sequence with the demo's first match", () => {
    expect(byId.get(layout.sequence[0]!)!.save).toBe(PROMISED_SAVES[0]);
  });

  it("ends every thread route on its card's edge", () => {
    for (const card of layout.cards) {
      expect(onEdge(card.route.end, card.box), card.save.title).toBe(true);
      expect(card.route.path.endsWith(`L${card.route.end.x} ${card.route.end.y}`)).toBe(true);
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

describe.each(DESKTOP_SCREENS)("the desktop wall at $name", ({ scene }) => {
  const layout = layoutWall(scene);

  it("places all four promised saves, fully visible and in the sequence", () => {
    for (const save of PROMISED_SAVES) {
      const card = layout.cards.find((c) => c.save === save);
      expect(card, save.title).toBeDefined();
      expect(insideScreen(card!, scene), save.title).toBe(true);
      expect(layout.sequence).toContain(card!.id);
    }
  });

  it("keeps the promised saves near the demo", () => {
    const demoCentre = {
      x: scene.demo.x + scene.demo.width / 2,
      y: scene.demo.y + scene.demo.height / 2,
    };
    const distance = (card: WallCard) =>
      Math.hypot(
        card.box.x + card.box.width / 2 - demoCentre.x,
        card.box.y + card.box.height / 2 - demoCentre.y,
      );
    const promised = layout.cards.filter((card) => PROMISED_SAVES.includes(card.save));
    const visible = layout.cards.filter(
      (card) => !PROMISED_SAVES.includes(card.save) && insideScreen(card, scene),
    );
    const median = visible.map(distance).sort((a, b) => a - b)[Math.floor(visible.length / 2)]!;
    const mean = promised.reduce((sum, card) => sum + distance(card), 0) / promised.length;
    expect(mean).toBeLessThan(median);
  });

  it("starts every thread at the extension icon", () => {
    for (const card of layout.cards) {
      expect(card.route.path.startsWith(`M${scene.anchor.x} ${scene.anchor.y} `)).toBe(true);
    }
  });

  it("is a desktop layout", () => {
    expect(layout.mode).toBe("desktop");
  });
});

describe("the desktop wall at 1440×900", () => {
  const layout = layoutWall(SCREENS[0]!.scene);

  it("puts the promised saves where the design does", () => {
    const at = (n: number) => layout.cards.find((c) => c.save === PROMISED_SAVES[n])!.box;
    expect(at(0)).toEqual(box(1048, 695, 184, 120));
    expect(at(1)).toEqual(box(1248, 465, 184, 124));
    expect(at(2)).toEqual(box(1248, 291, 184, 146));
    expect(at(3)).toEqual(box(848, 711, 184, 78));
  });

  it("matches every fully visible save, promised ones spread through", () => {
    const promisedAt = layout.sequence
      .map((id, i) => [i, layout.cards.find((c) => c.id === id)!] as const)
      .filter(([, card]) => PROMISED_SAVES.includes(card.save))
      .map(([i]) => i);
    expect(promisedAt).toHaveLength(4);
    expect(promisedAt[3]! - promisedAt[0]!).toBeGreaterThan(layout.sequence.length / 2);
  });
});

describe("the phone wall at 375×812", () => {
  const scene = SCREENS[3]!.scene;
  const layout = layoutWall(scene);

  it("fills the bottom of the screen with the design's four cards, in the demo's order", () => {
    expect(layout.mode).toBe("mobile");
    expect(layout.cards.map((card) => card.save)).toEqual([...PROMISED_SAVES]);
    expect(layout.sequence).toEqual(layout.cards.map((card) => card.id));
    for (const card of layout.cards) {
      expect(card.box.y).toBeGreaterThan(scene.demo.y + scene.demo.height);
    }
  });

  it("draws the tokens PDF as a stack, as the design does", () => {
    expect(layout.cards.find((card) => card.save === PROMISED_SAVES[3])!.stacked).toBe(true);
  });

  it("leaves out a card that can't clear the footer on a short screen", () => {
    const short = layoutWall({
      ...scene,
      height: 700,
      keepClear: [box(12, 12, 351, 48), box(20, 80, 335, 296), box(97, 665, 182, 27)],
    });
    expect(short.cards.length).toBeLessThan(4);
    for (const card of short.cards) {
      expect(intersects(footprint(card), box(97, 665, 182, 27))).toBe(false);
    }
  });
});
