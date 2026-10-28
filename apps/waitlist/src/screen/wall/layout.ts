import { PROMISED_ITEMS, WALL_ITEMS, type CardStyle, type DemoItem } from "./items";

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
  item: DemoItem;
  box: Box;
  /** Drawn as a small pile, which hangs `STACK_DEPTH` below the box. */
  stacked: boolean;
  /** Dimmer toward the screen's edges. */
  opacity: number;
  /** Picks the card's thumbnail art. */
  artSeed: number;
  /** Null for a card no thread can reach without crossing the copy: the demo never finds it. */
  route: ThreadRoute | null;
};

export type WallLayout = {
  mode: "desktop" | "tablet" | "mobile";
  cards: WallCard[];
  /**
   * The cards the demo finds, in order, by id: every fully visible card with
   * a route, once per title. On desktop and tablet the four promised Items are
   * spread through it, starting with the first.
   */
  sequence: string[];
};

/** The desktop composition starts here, as the screen's `lg` breakpoint does. */
export const DESKTOP_MIN_WIDTH = 1024;

/**
 * The wall of columns starts here, as the screen's `sm` breakpoint does: from
 * 640px the stacked column (copy, form, demo) has a wall all round it. Below,
 * a phone shows the design's four cards under the demo.
 */
export const COLUMNS_MIN_WIDTH = 640;

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
  heights: {
    post: 120,
    video: 146,
    article: 124,
    pdf: 78,
    instagram: 196,
    link: 104,
  } satisfies Record<CardStyle, number>,
  /** Where each column's first card starts, so the rows never line up. */
  columnStarts: [-70, -20, -110, -40, -90, -10, -60, -30],
  /** Kept-clear boxes grow by this much before the promised Items are placed around them. */
  clearance: 8,
  /**
   * The rest of the wall keeps further off: this much air round the copy and
   * the demo, and `chromeBreathing` round the nav and footer, so the content
   * never sits in a crowd.
   */
  breathing: 48,
  chromeBreathing: 20,
  /** Between one wall card and the next down a column. */
  rowGap: 36,
  /** Every this many cards down a column, one card's turn is left empty. */
  restEvery: 3,
  /** How tall that empty turn is. */
  restHeight: 120,
  /** The demo's drop shadow, kept clear below it as well. */
  demoShadow: 24,
  fade: { distance: 240, min: 0.16, range: 0.26 },
  /**
   * Where the design puts the promised Items at 1440×900, by column (0 is the
   * first column right of the demo) and offset from the demo's top or bottom.
   */
  promisedSlots: [
    { column: -1, from: "bottom", offset: 58 },
    { column: 0, from: "top", offset: 202 },
    { column: 0, from: "top", offset: 28 },
    { column: -2, from: "bottom", offset: 74 },
  ],
} as const;

/**
 * Where the tablet wants the promised Items: in a row under the demo, by
 * column (0 is the column in the middle of the screen) and offset from the
 * demo's bottom, the tokens PDF a row lower.
 */
const TABLET_PROMISED_SLOTS = [
  { column: 0, from: "bottom", offset: 44 },
  { column: 1, from: "bottom", offset: 60 },
  { column: -1, from: "bottom", offset: 52 },
  { column: 1, from: "bottom", offset: 200 },
] as const;

type PromisedSlot = { column: number; from: "top" | "bottom"; offset: number };

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
    { item: PROMISED_ITEMS[0], column: 0, row: 0, height: 108, top: 36, stacked: false },
    { item: PROMISED_ITEMS[1], column: 1, row: 1, height: 90, top: 164, stacked: false },
    { item: PROMISED_ITEMS[2], column: 1, row: 0, height: 120, top: 32, stacked: false },
    { item: PROMISED_ITEMS[3], column: 0, row: 1, height: 66, top: 156, stacked: true },
  ],
  /**
   * For a screen too short for two of those: one row of the design's
   * shortest cards, the tokens PDF and another PDF, side by side.
   */
  shortSlots: [
    { item: PROMISED_ITEMS[3], column: 0, row: 0, height: 66, top: 28, stacked: false },
    {
      item: WALL_ITEMS.find((item) => item.style === "pdf")!,
      column: 1,
      row: 0,
      height: 66,
      top: 28,
      stacked: false,
    },
  ],
} as const;

type MobileSlot = {
  item: DemoItem;
  column: 0 | 1;
  row: 0 | 1;
  height: number;
  /** How far below the demo the card's top sits. */
  top: number;
  stacked: boolean;
};

/** How many Items past the next one the wall looks through to fill a gap. */
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
function desktopRoute(box: Box, demo: Box, anchor: Point): Point[] {
  const start = { x: anchor.x, y: anchor.y };
  const cx = Math.round(box.x + box.width / 2);
  const cy = Math.round(box.y + box.height / 2);

  if (box.x >= right(demo)) {
    const channel = box.x - GAP;
    return [start, { x: channel, y: anchor.y }, { x: channel, y: cy }, { x: box.x, y: cy }];
  }
  const above = bottom(box) <= demo.y || (box.y < bottom(demo) && cy < anchor.y);
  const edge = above ? bottom(box) : box.y;
  // A card in line with the demo gets a straight run, as near its middle as fits.
  const low = Math.max(box.x, demo.x) + GAP;
  const high = Math.min(right(box), right(demo)) - GAP;
  if (low <= high) {
    const x = Math.min(Math.max(cx, low), high);
    return [start, { x, y: anchor.y }, { x, y: edge }];
  }
  const row = above ? edge + ROW_OFFSET : edge - ROW_OFFSET;
  const exitX = Math.min(Math.max(cx, demo.x + GAP), right(demo) - GAP);
  return [
    start,
    { x: exitX, y: anchor.y },
    { x: exitX, y: row },
    { x: cx, y: row },
    { x: cx, y: edge },
  ];
}

/**
 * The tablet thread: it comes out from under the demo's edge facing the card,
 * so it never crosses the copy above. To a card beside the demo it runs
 * straight out of that side; to a card below, straight down where the two
 * line up, or else down to a row just above the card and along it. A card
 * above the demo, over the copy, gets none.
 */
function tabletRoute(box: Box, demo: Box): Point[] | null {
  const cx = Math.round(box.x + box.width / 2);
  const cy = Math.round(box.y + box.height / 2);
  const top = Math.max(box.y, demo.y) + ROW_OFFSET;
  const low = Math.min(bottom(box), bottom(demo)) - ROW_OFFSET;
  const beside = right(box) <= demo.x || box.x >= right(demo);
  if (beside && top <= low) {
    const y = Math.min(Math.max(cy, top), low);
    const onLeft = right(box) <= demo.x;
    return [
      { x: onLeft ? demo.x : right(demo), y },
      { x: onLeft ? right(box) : box.x, y },
    ];
  }
  if (box.y < bottom(demo)) return null;
  const start = bottom(demo);
  const from = Math.max(box.x, demo.x) + GAP;
  const to = Math.min(right(box), right(demo)) - GAP;
  if (from <= to) {
    const x = Math.min(Math.max(cx, from), to);
    return [
      { x, y: start },
      { x, y: box.y },
    ];
  }
  const exitX = Math.min(Math.max(cx, demo.x + GAP), right(demo) - GAP);
  const row = box.y - ROW_OFFSET;
  return [
    { x: exitX, y: start },
    { x: exitX, y: row },
    { x: cx, y: row },
    { x: cx, y: box.y },
  ];
}

/** How a column wall is set out: where its columns line up, its promised slots and its threads. */
type ColumnPlan = {
  mode: "desktop" | "tablet";
  /** The x of column 0; the others are every pitch from it. */
  firstColumn: number;
  promisedSlots: readonly PromisedSlot[];
  /** The corners of the thread to a card at `box`, or null where none can reach it. */
  route: (box: Box) => Point[] | null;
};

/** Whether the straight run from `a` to `b` passes behind `box`. */
function crosses(a: Point, b: Point, box: Box): boolean {
  return (
    Math.min(a.x, b.x) < right(box) &&
    Math.max(a.x, b.x) > box.x &&
    Math.min(a.y, b.y) < bottom(box) &&
    Math.max(a.y, b.y) > box.y
  );
}

/**
 * The design's desktop wall, generalised: columns of cards across the whole
 * screen, the four promised Items in reserved slots as near the plan's places
 * by the demo as the screen allows, and the rest of the wall filled from a
 * repeating pool around them.
 */
function layoutColumns(scene: WallScene, plan: ColumnPlan): WallLayout {
  const { width, height, demo } = scene;
  const w = DESKTOP.cardWidth;
  const zones = [
    grow(demo, DESKTOP.clearance, DESKTOP.demoShadow),
    ...scene.keepClear.map((box) => grow(box, DESKTOP.clearance)),
  ];

  // A thread never runs behind the copy, nav or footer: a card it can't reach that way isn't found.
  const threadTo = (box: Box): ThreadRoute | null => {
    const points = plan.route(box);
    if (!points) return null;
    const blocked = points.some(
      (pt, i) => i > 0 && scene.keepClear.some((kept) => crosses(points[i - 1]!, pt, kept)),
    );
    return blocked ? null : routeThrough(points);
  };

  const { firstColumn } = plan;
  const columns: { x: number; index: number }[] = [];
  const lowest = Math.ceil((-w - firstColumn) / DESKTOP.pitch);
  for (let index = lowest; firstColumn + index * DESKTOP.pitch < width; index++) {
    columns.push({ x: firstColumn + index * DESKTOP.pitch, index });
  }

  const placed: { box: Box; stacked: boolean; item: DemoItem; artSeed: number }[] = [];

  // The promised Items: each in the free, fully visible spot nearest its slot.
  const promised: typeof placed = [];
  PROMISED_ITEMS.forEach((item, n) => {
    const slot = plan.promisedSlots[n]!;
    const want = {
      x: firstColumn + slot.column * DESKTOP.pitch,
      y: slot.from === "top" ? demo.y + slot.offset : bottom(demo) + slot.offset,
    };
    const h = DESKTOP.heights[item.style];
    const stacked = item.stacked ?? false;
    let best: { box: Box; score: number } | null = null;
    for (const column of columns) {
      for (let y = SCREEN_INSET; y + h <= height; y++) {
        const box = { x: column.x, y, width: w, height: h };
        const space = footprint({ box, stacked });
        if (!isFullyVisible(space, width, height)) continue;
        if (zones.some((zone) => overlaps(space, zone, GAP / 2))) continue;
        if (promised.some((other) => overlaps(space, footprint(other), GAP))) continue;
        if (threadTo(box) === null) continue;
        const score = (box.x - want.x) ** 2 + (box.y - want.y) ** 2;
        if (!best || score < best.score) best = { box, score };
      }
    }
    if (best) promised.push({ box: best.box, stacked, item, artSeed: 50 + n });
  });

  // The rest of the wall: down each column, from a repeating pool of Items.
  // Where the next Item won't fit before something kept clear, one of the
  // few after it may fill the gap; failing that the column steps past.
  // The copy is the biggest kept-clear box; the nav and footer are slim strips.
  const area = (box: Box) => box.width * box.height;
  const copy = scene.keepClear.reduce<Box | null>(
    (biggest, box) => (!biggest || area(box) > area(biggest) ? box : biggest),
    null,
  );
  const obstacles = [
    grow(demo, DESKTOP.breathing, DESKTOP.demoShadow),
    ...scene.keepClear.map((box) =>
      grow(box, box === copy ? DESKTOP.breathing : DESKTOP.chromeBreathing),
    ),
    ...promised.map(footprint),
  ];
  const upcoming: DemoItem[] = [];
  let fed = 0;
  const peek = (k: number) => {
    while (upcoming.length <= k) upcoming.push(WALL_ITEMS[fed++ % WALL_ITEMS.length]!);
    return upcoming[k]!;
  };
  let drawn = 0;
  for (const column of columns) {
    let y = DESKTOP.columnStarts[mod(column.index - 1, DESKTOP.columnStarts.length)]!;
    // Staggered by column, so the empty turns never line up into a row.
    let turn = mod(column.index, DESKTOP.restEvery);
    for (let guard = 0; y < height && guard < 80; guard++) {
      if (++turn % DESKTOP.restEvery === 0) {
        y += DESKTOP.restHeight;
        continue;
      }
      const fitting = (k: number) => {
        const item = peek(k);
        const stacked = item.stacked ?? false;
        const box = { x: column.x, y, width: w, height: DESKTOP.heights[item.style] };
        const space = footprint({ box, stacked });
        return {
          item,
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
          y = bottom(card.hit) + DESKTOP.rowGap;
          continue;
        }
        card = filler;
      }
      upcoming.splice(upcoming.indexOf(card.item), 1);
      drawn++;
      // A card wholly above the screen still takes its turn from the pool, as in the design.
      if (bottom(card.space) > 0) {
        placed.push({ box: card.box, stacked: card.stacked, item: card.item, artSeed: drawn });
      }
      y = bottom(card.space) + DESKTOP.rowGap;
    }
  }
  placed.push(...promised);

  const cards = placed.map((card, i) => ({
    ...card,
    id: `card-${i}`,
    opacity: edgeOpacity(card.box, width, height, DESKTOP.fade),
    route: threadTo(card.box),
  }));

  // Every fully visible card with a thread, once per title, with the promised ones spread through.
  const seen = new Set<string>();
  const promisedIds: string[] = [];
  const rest: WallCard[] = [];
  for (const card of cards) {
    if (!card.route || !isFullyVisible(footprint(card), width, height)) continue;
    if (seen.has(card.item.title)) continue;
    seen.add(card.item.title);
    if (PROMISED_ITEMS.includes(card.item)) promisedIds.push(card.id);
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

  return { mode: plan.mode, cards, sequence };
}

/**
 * The design's phone wall: its four cards in two columns under the demo,
 * risen toward the demo on a short screen and left out where even that
 * doesn't clear the footer. Where fewer than two of them fit, one row of
 * the shortest cards takes their place. Threads come out from under the Cue.
 */
function layoutMobile(scene: WallScene): WallLayout {
  const { width, height, demo } = scene;
  const zones = [demo, ...scene.keepClear].map((box) => grow(box, MOBILE.clearance));
  const w = Math.floor((demo.width - MOBILE.gutter) / 2);
  const gutterX = Math.round(demo.x + demo.width / 2);

  const isClear = (box: Box, stacked: boolean) => {
    const space = footprint({ box, stacked });
    return (
      isFullyVisible(space, width, height) && !zones.some((zone) => overlaps(space, zone, GAP / 2))
    );
  };

  /** The slots' cards, risen as little as possible; if nothing clears every card, keeping the most. */
  const place = (slots: readonly MobileSlot[]): WallCard[] => {
    const boxesAt = (lift: number): Box[] =>
      slots.map((slot) => ({
        x: slot.column === 0 ? demo.x : right(demo) - w,
        y: bottom(demo) + slot.top - lift,
        width: w,
        height: slot.height,
      }));
    const clearCount = (boxes: Box[]) =>
      boxes.filter((box, i) => isClear(box, slots[i]!.stacked)).length;
    const maxLift = Math.min(...slots.map((slot) => slot.top)) - MOBILE.minTop;
    let lift = 0;
    for (let l = 0; l <= maxLift; l++) {
      if (clearCount(boxesAt(l)) > clearCount(boxesAt(lift))) lift = l;
      if (clearCount(boxesAt(l)) === slots.length) break;
    }

    const cards: WallCard[] = [];
    boxesAt(lift).forEach((box, i) => {
      const slot = slots[i]!;
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
        item: slot.item,
        box,
        stacked: slot.stacked,
        opacity: edgeOpacity(box, width, height, MOBILE.fade),
        artSeed: i + 3,
        route,
      });
    });
    return cards;
  };

  let cards = place(MOBILE.slots);
  if (cards.length < 2) {
    const short = place(MOBILE.shortSlots);
    if (short.length > cards.length) cards = short;
  }
  return { mode: "mobile", cards, sequence: cards.map((card) => card.id) };
}

/**
 * Lays the wall of Item cards out around the screen's content: positioned
 * cards that never sit behind a kept-clear box, each dimmer toward the edges
 * and with its thread route, and the order the demo finds them in.
 */
export function layoutWall(scene: WallScene): WallLayout {
  const { width, demo, anchor } = scene;
  if (width >= DESKTOP_MIN_WIDTH) {
    // Columns line up on the demo's right edge, as in the design.
    return layoutColumns(scene, {
      mode: "desktop",
      firstColumn: right(demo) + 2 * GAP,
      promisedSlots: DESKTOP.promisedSlots,
      route: (box) => desktopRoute(box, demo, anchor),
    });
  }
  if (width >= COLUMNS_MIN_WIDTH) {
    // Columns centred on the screen, as the stacked column is, so the two sides match.
    return layoutColumns(scene, {
      mode: "tablet",
      firstColumn: Math.round(width / 2 - DESKTOP.cardWidth / 2),
      promisedSlots: TABLET_PROMISED_SLOTS,
      route: (box) => tabletRoute(box, demo),
    });
  }
  return layoutMobile(scene);
}
