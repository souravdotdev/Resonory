import { PROMISED_SAVES, WALL_SAVES, type Save, type SaveKind } from "./saves";

/** A rectangle on the screen, in CSS pixels from its top left corner. */
export type Box = { x: number; y: number; width: number; height: number };
export type Point = { x: number; y: number };

/** What the wall is laid out around, measured from the rendered screen. */
export type WallScene = {
  width: number;
  height: number;
  /** The search demo. Threads run behind it and come out of its edges. */
  demo: Box;
  /** The centre of the demo's Resonory extension icon, where a thread starts on desktop. */
  anchor: Point;
  /** Everything else the wall never sits behind: the copy and form, the nav and the footer. */
  keepClear: readonly Box[];
};

/** The thread from the Resonory icon to a card: an SVG path ending on the card's edge. */
export type ThreadRoute = { path: string; end: Point };

export type WallCard = {
  id: string;
  save: Save;
  box: Box;
  /** Drawn as a small pile, which hangs `STACK_DEPTH` below the box. */
  stacked: boolean;
  /** Dimmer toward the screen's edges. */
  opacity: number;
  /** Picks the card's thumbnail art. */
  artSeed: number;
  route: ThreadRoute;
};

export type WallLayout = {
  mode: "desktop" | "mobile";
  cards: WallCard[];
  /**
   * The cards the demo finds, in order, by id: every fully visible card, once
   * per title. On desktop the four promised saves are spread through it,
   * starting with the first.
   */
  sequence: string[];
};

/** The desktop composition starts here, as the screen's `lg` breakpoint does. */
export const DESKTOP_MIN_WIDTH = 1024;

/** How far a stacked card's pile hangs below it. */
export const STACK_DEPTH = 10;

/** A card counts as fully visible only this far inside the screen's edges. */
const SCREEN_INSET = 8;

/** Cards keep this far apart, and half of it from every kept-clear box. */
const GAP = 16;

const DESKTOP = {
  cardWidth: 184,
  /** Column to column: the card width plus the gap. */
  pitch: 200,
  heights: { post: 120, video: 146, article: 124, pdf: 78, insta: 196, link: 104 } satisfies Record<
    SaveKind,
    number
  >,
  /** Where each column's first card starts, so the rows never line up. */
  columnStarts: [-70, -20, -110, -40, -90, -10, -60, -30],
  /** Kept-clear boxes grow by this much before cards are placed around them. */
  clearance: 8,
  /** The demo's drop shadow, kept clear below it as well. */
  demoShadow: 24,
  fade: { distance: 240, min: 0.16, range: 0.26 },
  /**
   * Where the design puts the promised saves at 1440×900, by column (0 is the
   * first column right of the demo) and offset from the demo's top or bottom.
   */
  promisedSlots: [
    { column: -1, from: "bottom", offset: 58 },
    { column: 0, from: "top", offset: 202 },
    { column: 0, from: "top", offset: 28 },
    { column: -2, from: "bottom", offset: 74 },
  ],
} as const;

const MOBILE = {
  /** Between the two columns of cards under the demo. */
  gutter: 17,
  clearance: 4,
  /** The cards rise toward the demo, up to this close, when the screen is short. */
  minTop: 16,
  fade: { distance: 110, min: 0.2, range: 0.2 },
  /**
   * The design's four cards in two rows under the demo, in the order the demo
   * finds them, each `top` below the demo (the rows 12px apart).
   */
  slots: [
    { save: PROMISED_SAVES[0], column: 0, row: 0, height: 108, top: 36, stacked: false },
    { save: PROMISED_SAVES[1], column: 1, row: 1, height: 90, top: 164, stacked: false },
    { save: PROMISED_SAVES[2], column: 1, row: 0, height: 120, top: 32, stacked: false },
    { save: PROMISED_SAVES[3], column: 0, row: 1, height: 66, top: 156, stacked: true },
  ],
} as const;

/** How many saves past the next one the wall looks through to fill a gap. */
const GAP_FILLERS = 5;

/** Thread corners are rounded up to this radius. */
const CORNER_RADIUS = 10;

/** A thread's last turn comes this far off the card's edge. */
const ROW_OFFSET = 8;

const mod = (n: number, m: number) => ((n % m) + m) % m;
const right = (box: Box) => box.x + box.width;
const bottom = (box: Box) => box.y + box.height;

function grow(box: Box, by: number, extraBelow = 0): Box {
  return {
    x: box.x - by,
    y: box.y - by,
    width: box.width + 2 * by,
    height: box.height + 2 * by + extraBelow,
  };
}

/** Whether `a` comes within `margin` of `b`. */
function overlaps(a: Box, b: Box, margin: number): boolean {
  return (
    a.x < right(b) + margin &&
    right(a) > b.x - margin &&
    a.y < bottom(b) + margin &&
    bottom(a) > b.y - margin
  );
}

/** The space a card takes, its pile included. */
export function footprint(card: { box: Box; stacked: boolean }): Box {
  return card.stacked ? { ...card.box, height: card.box.height + STACK_DEPTH } : card.box;
}

function isFullyVisible(box: Box, width: number, height: number): boolean {
  return (
    box.x >= SCREEN_INSET &&
    right(box) <= width - SCREEN_INSET &&
    box.y >= SCREEN_INSET &&
    bottom(box) <= height - SCREEN_INSET
  );
}

function edgeOpacity(
  box: Box,
  width: number,
  height: number,
  fade: { distance: number; min: number; range: number },
): number {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const toEdge = Math.min(cx, width - cx, cy, height - cy);
  const closeness = Math.max(0, Math.min(1, toEdge / fade.distance));
  return Math.round((fade.min + fade.range * closeness) * 100) / 100;
}

/** `points` without repeats, or middle points of a straight run. */
function corners(points: readonly Point[]): Point[] {
  const distinct = points.filter(
    (pt, i) => i === 0 || pt.x !== points[i - 1]!.x || pt.y !== points[i - 1]!.y,
  );
  return distinct.filter((b, i) => {
    const a = distinct[i - 1];
    const c = distinct[i + 1];
    return !a || !c || !((a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y));
  });
}

/** A polyline through `points` with its corners rounded. */
function roundedPath(points: readonly Point[]): string {
  const p = corners(points);
  const first = p[0]!;
  let d = `M${first.x} ${first.y}`;
  for (let i = 1; i < p.length - 1; i++) {
    const a = p[i - 1]!;
    const b = p[i]!;
    const c = p[i + 1]!;
    const toA = Math.hypot(b.x - a.x, b.y - a.y);
    const toC = Math.hypot(c.x - b.x, c.y - b.y);
    const r = Math.min(CORNER_RADIUS, toA / 2, toC / 2);
    const inX = b.x - ((b.x - a.x) / toA) * r;
    const inY = b.y - ((b.y - a.y) / toA) * r;
    const outX = b.x + ((c.x - b.x) / toC) * r;
    const outY = b.y + ((c.y - b.y) / toC) * r;
    d += ` L${inX.toFixed(1)} ${inY.toFixed(1)} Q${b.x} ${b.y} ${outX.toFixed(1)} ${outY.toFixed(1)}`;
  }
  const last = p[p.length - 1]!;
  return `${d} L${last.x} ${last.y}`;
}

function routeThrough(points: Point[]): ThreadRoute {
  return { path: roundedPath(points), end: points[points.length - 1]! };
}

/**
 * The desktop thread: out of the extension icon and hidden behind the demo
 * until it leaves the side facing the card. To a card right of the demo it
 * turns down a channel beside the card; to any other card it leaves through
 * the demo's top or bottom (or, for a card left of it, its left side) and
 * runs along a row just off the card's edge.
 */
function desktopRoute(box: Box, demo: Box, anchor: Point): ThreadRoute {
  const start = { x: anchor.x, y: anchor.y };
  const cx = Math.round(box.x + box.width / 2);
  const cy = Math.round(box.y + box.height / 2);

  if (box.x >= right(demo)) {
    const channel = box.x - GAP;
    return routeThrough([
      start,
      { x: channel, y: anchor.y },
      { x: channel, y: cy },
      { x: box.x, y: cy },
    ]);
  }
  const above = bottom(box) <= demo.y || (box.y < bottom(demo) && cy < anchor.y);
  const edge = above ? bottom(box) : box.y;
  // A card in line with the demo gets a straight run, as near its middle as fits.
  const low = Math.max(box.x, demo.x) + GAP;
  const high = Math.min(right(box), right(demo)) - GAP;
  if (low <= high) {
    const x = Math.min(Math.max(cx, low), high);
    return routeThrough([start, { x, y: anchor.y }, { x, y: edge }]);
  }
  const row = above ? edge + ROW_OFFSET : edge - ROW_OFFSET;
  const exitX = Math.min(Math.max(cx, demo.x + GAP), right(demo) - GAP);
  return routeThrough([
    start,
    { x: exitX, y: anchor.y },
    { x: exitX, y: row },
    { x: cx, y: row },
    { x: cx, y: edge },
  ]);
}

/**
 * The design's desktop wall, generalised: columns of cards lined up on the
 * demo's right edge, the four promised saves in reserved slots as near the
 * design's places beside and below the demo as the screen allows, and the
 * rest of the wall filled from a repeating pool around them.
 */
function layoutDesktop(scene: WallScene): WallLayout {
  const { width, height, demo, anchor } = scene;
  const w = DESKTOP.cardWidth;
  const zones = [
    grow(demo, DESKTOP.clearance, DESKTOP.demoShadow),
    ...scene.keepClear.map((box) => grow(box, DESKTOP.clearance)),
  ];

  // Columns: number 0 starts just right of the demo, the others every pitch from it.
  const firstColumn = right(demo) + 2 * GAP;
  const columns: { x: number; index: number }[] = [];
  const lowest = Math.ceil((-w - firstColumn) / DESKTOP.pitch);
  for (let index = lowest; firstColumn + index * DESKTOP.pitch < width; index++) {
    columns.push({ x: firstColumn + index * DESKTOP.pitch, index });
  }

  const placed: { box: Box; stacked: boolean; save: Save; artSeed: number }[] = [];

  // The promised saves: each in the free, fully visible spot nearest its design slot.
  const promised: typeof placed = [];
  PROMISED_SAVES.forEach((save, n) => {
    const slot = DESKTOP.promisedSlots[n]!;
    const want = {
      x: firstColumn + slot.column * DESKTOP.pitch,
      y: slot.from === "top" ? demo.y + slot.offset : bottom(demo) + slot.offset,
    };
    const h = DESKTOP.heights[save.kind];
    const stacked = save.stacked ?? false;
    let best: { box: Box; score: number } | null = null;
    for (const column of columns) {
      for (let y = SCREEN_INSET; y + h <= height; y++) {
        const box = { x: column.x, y, width: w, height: h };
        const space = footprint({ box, stacked });
        if (!isFullyVisible(space, width, height)) continue;
        if (zones.some((zone) => overlaps(space, zone, GAP / 2))) continue;
        if (promised.some((other) => overlaps(space, footprint(other), GAP))) continue;
        const score = (box.x - want.x) ** 2 + (box.y - want.y) ** 2;
        if (!best || score < best.score) best = { box, score };
      }
    }
    if (best) promised.push({ box: best.box, stacked, save, artSeed: 50 + n });
  });

  // The rest of the wall: down each column, from a repeating pool of saves.
  // Where the next save won't fit before something kept clear, one of the
  // few after it may fill the gap; failing that the column steps past.
  const obstacles = [...zones, ...promised.map(footprint)];
  const upcoming: Save[] = [];
  let fed = 0;
  const peek = (k: number) => {
    while (upcoming.length <= k) upcoming.push(WALL_SAVES[fed++ % WALL_SAVES.length]!);
    return upcoming[k]!;
  };
  let drawn = 0;
  for (const column of columns) {
    let y = DESKTOP.columnStarts[mod(column.index - 1, DESKTOP.columnStarts.length)]!;
    for (let guard = 0; y < height && guard < 80; guard++) {
      const fitting = (k: number) => {
        const save = peek(k);
        const stacked = save.stacked ?? false;
        const box = { x: column.x, y, width: w, height: DESKTOP.heights[save.kind] };
        const space = footprint({ box, stacked });
        return {
          save,
          stacked,
          box,
          space,
          hit: obstacles.find((o) => overlaps(space, o, GAP / 2)),
        };
      };
      let card = fitting(0);
      if (card.hit) {
        const filler = Array.from({ length: GAP_FILLERS }, (_, k) => fitting(k + 1)).find(
          (option) => !option.hit,
        );
        if (!filler) {
          y = bottom(card.hit) + GAP;
          continue;
        }
        card = filler;
      }
      upcoming.splice(upcoming.indexOf(card.save), 1);
      drawn++;
      // A card wholly above the screen still takes its turn from the pool, as in the design.
      if (bottom(card.space) > 0) {
        placed.push({ box: card.box, stacked: card.stacked, save: card.save, artSeed: drawn });
      }
      y = bottom(card.space) + GAP;
    }
  }
  placed.push(...promised);

  const cards = placed.map((card, i) => ({
    ...card,
    id: `card-${i}`,
    opacity: edgeOpacity(card.box, width, height, DESKTOP.fade),
    route: desktopRoute(card.box, demo, anchor),
  }));

  // Every fully visible card, once per title, with the promised ones spread through.
  const seen = new Set<string>();
  const promisedIds: string[] = [];
  const rest: WallCard[] = [];
  for (const card of cards) {
    if (!isFullyVisible(footprint(card), width, height) || seen.has(card.save.title)) continue;
    seen.add(card.save.title);
    if (PROMISED_SAVES.includes(card.save)) promisedIds.push(card.id);
    else rest.push(card);
  }
  // A scattered order, so one match and the next sit apart on the wall.
  const scatter = (card: WallCard) => (card.box.x * 7 + card.box.y * 3) % 997;
  rest.sort((a, b) => scatter(a) - scatter(b));
  const every = Math.max(1, Math.round(rest.length / Math.max(1, promisedIds.length)));
  const sequence: string[] = [];
  let p = 0;
  rest.forEach((card, k) => {
    if (k % every === 0 && p < promisedIds.length) sequence.push(promisedIds[p++]!);
    sequence.push(card.id);
  });
  sequence.push(...promisedIds.slice(p));

  return { mode: "desktop", cards, sequence };
}

/**
 * The design's phone wall: its four cards in two columns under the demo,
 * risen toward the demo on a short screen and left out where even that
 * doesn't clear the footer. Threads come out from under the notification.
 */
function layoutMobile(scene: WallScene): WallLayout {
  const { width, height, demo } = scene;
  const zones = [demo, ...scene.keepClear].map((box) => grow(box, MOBILE.clearance));
  const w = Math.floor((demo.width - MOBILE.gutter) / 2);
  const gutterX = Math.round(demo.x + demo.width / 2);

  const boxesAt = (lift: number): Box[] =>
    MOBILE.slots.map((slot) => ({
      x: slot.column === 0 ? demo.x : right(demo) - w,
      y: bottom(demo) + slot.top - lift,
      width: w,
      height: slot.height,
    }));
  const isClear = (box: Box, stacked: boolean) => {
    const space = footprint({ box, stacked });
    return (
      isFullyVisible(space, width, height) && !zones.some((zone) => overlaps(space, zone, GAP / 2))
    );
  };
  const clearCount = (boxes: Box[]) =>
    boxes.filter((box, i) => isClear(box, MOBILE.slots[i]!.stacked)).length;

  // Rise as little as possible; if nothing clears every card, keep the most.
  const maxLift = Math.min(...MOBILE.slots.map((slot) => slot.top)) - MOBILE.minTop;
  let lift = 0;
  for (let l = 0; l <= maxLift; l++) {
    if (clearCount(boxesAt(l)) > clearCount(boxesAt(lift))) lift = l;
    if (clearCount(boxesAt(l)) === MOBILE.slots.length) break;
  }

  const cards: WallCard[] = [];
  boxesAt(lift).forEach((box, i) => {
    const slot = MOBILE.slots[i]!;
    if (!isClear(box, slot.stacked)) return;
    const cx = Math.round(box.x + box.width / 2);
    const cy = Math.round(box.y + box.height / 2);
    const route =
      slot.row === 0
        ? routeThrough([
            { x: cx, y: bottom(demo) },
            { x: cx, y: box.y },
          ])
        : routeThrough([
            { x: gutterX, y: bottom(demo) },
            { x: gutterX, y: cy },
            { x: slot.column === 0 ? right(box) : box.x, y: cy },
          ]);
    cards.push({
      id: `card-${i}`,
      save: slot.save,
      box,
      stacked: slot.stacked,
      opacity: edgeOpacity(box, width, height, MOBILE.fade),
      artSeed: i + 3,
      route,
    });
  });

  return { mode: "mobile", cards, sequence: cards.map((card) => card.id) };
}

/**
 * Lays the wall of saved cards out around the screen's content: positioned
 * cards that never sit behind a kept-clear box, each dimmer toward the edges
 * and with its thread route, and the order the demo finds them in.
 */
export function layoutWall(scene: WallScene): WallLayout {
  return scene.width >= DESKTOP_MIN_WIDTH ? layoutDesktop(scene) : layoutMobile(scene);
}
