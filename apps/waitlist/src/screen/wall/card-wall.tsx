"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDemoView, useSetDemoSequence } from "../demo-stage";
import { layoutWall, type Box, type ThreadRoute, type WallScene } from "./layout";
import { ItemCard } from "./item-card";

/**
 * `element`'s layout box inside `root`, by offsets rather than the client
 * rect: the screen's parts rise in on load, and their transforms mustn't move
 * the wall. Null when it isn't laid out inside `root`.
 */
function layoutBoxIn(root: Element, element: HTMLElement): Box | null {
  let x = element.offsetLeft;
  let y = element.offsetTop;
  let parent = element.offsetParent;
  while (parent instanceof HTMLElement && parent !== root) {
    x += parent.offsetLeft + parent.clientLeft;
    y += parent.offsetTop + parent.clientTop;
    parent = parent.offsetParent;
  }
  if (parent !== root || element.offsetWidth === 0 || element.offsetHeight === 0) return null;
  return { x, y, width: element.offsetWidth, height: element.offsetHeight };
}

/** The screen as the wall lays itself out around it, or null before it's laid out. */
function measureScene(wall: HTMLElement): WallScene | null {
  const root = wall.parentElement;
  if (!root || wall.offsetWidth === 0) return null;
  const find = (selector: string) => {
    const element = root.querySelector<HTMLElement>(selector);
    return element && layoutBoxIn(root, element);
  };
  const demo = find("[data-wall-demo]");
  const icon = find("[data-wall-anchor]");
  if (!demo || !icon) return null;
  const keepClear = [...root.querySelectorAll<HTMLElement>("[data-wall-keep-clear]")]
    .map((element) => layoutBoxIn(root, element))
    .filter((box) => box !== null);
  return {
    width: wall.offsetWidth,
    height: wall.offsetHeight,
    demo,
    anchor: { x: Math.round(icon.x + icon.width / 2), y: Math.round(icon.y + icon.height / 2) },
    keepClear,
  };
}

/** Draws in along its length (with pathLength="1") and fades out, both ways. */
const THREAD_LINE =
  "fill-none stroke-accent [stroke-dasharray:1] [stroke-linecap:round] [stroke-linejoin:round] [transition:stroke-dashoffset_1.1s_var(--ease-spring),opacity_0.5s_var(--ease-spring)]";

/**
 * The thread from the Resonory icon to the demo's card: a soft glow, the
 * line itself, a spark travelling along it, and a dot where it meets the
 * card. Drawn while the match is on; otherwise it draws back and fades.
 */
function Thread({
  route,
  width,
  height,
  drawn,
  desktop,
}: {
  route: ThreadRoute;
  width: number;
  height: number;
  drawn: boolean;
  desktop: boolean;
}) {
  const line = `${THREAD_LINE} ${drawn ? "[stroke-dashoffset:0]" : "[stroke-dashoffset:1] opacity-0"}`;
  return (
    <svg
      data-wall-thread=""
      data-drawn={drawn ? "" : undefined}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="absolute top-0 left-0 z-2 overflow-visible"
    >
      <path
        pathLength={1}
        d={route.path}
        className={`${line} stroke-6 blur-[4px] lg:stroke-7 lg:blur-[5px] ${drawn ? "opacity-60" : ""}`}
      />
      <path pathLength={1} d={route.path} className={`${line} stroke-[1.6]`} />
      {/* Held still, the spark would sit at the thread's start: reduced motion has none. */}
      <path
        pathLength={1}
        d={route.path}
        className={`fill-none stroke-text stroke-2 drop-shadow-[0_0_3px_var(--color-accent)] transition-opacity duration-400 ease-spring [stroke-dasharray:0.1_0.9] [stroke-dashoffset:1] [stroke-linecap:round] motion-reduce:hidden lg:stroke-[2.2] lg:[stroke-dasharray:0.07_0.93] ${
          drawn ? "animate-thread-spark opacity-95 lg:[animation-duration:1.5s]" : "opacity-0"
        }`}
      />
      <circle
        cx={route.end.x}
        cy={route.end.y}
        r={desktop ? 3.5 : 2.5}
        className={`fill-accent drop-shadow-[0_0_4px_var(--color-accent)] transition-opacity duration-400 ease-spring lg:drop-shadow-[0_0_5px_var(--color-accent)] ${
          drawn ? "opacity-100 delay-700" : "opacity-0"
        }`}
      />
    </svg>
  );
}

/**
 * The wall of Item cards behind the screen: dimmed, drifting, never behind
 * the copy, form, demo, nav or footer. It lays itself out once the page has
 * hydrated (measuring the screen, and again whenever a measured part
 * resizes) and fades in, so the server renders an empty layer and nothing
 * shifts.
 *
 * It follows the demo loop: it hands the loop its match sequence, flickers
 * the card being scanned, and lights the card the search finds, with the
 * thread to it from the Resonory icon. Decorative throughout: hidden from
 * assistive technology, unfocusable and ignoring the pointer.
 */
export function CardWall() {
  const view = useDemoView();
  const setSequence = useSetDemoSequence();
  const wallRef = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<WallScene | null>(null);

  useEffect(() => {
    const wall = wallRef.current;
    const root = wall?.parentElement;
    if (!wall || !root) return;
    let measured = "";
    const measure = () => {
      const next = measureScene(wall);
      const key = JSON.stringify(next);
      if (key === measured) return;
      measured = key;
      setScene(next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(wall);
    root
      .querySelectorAll("[data-wall-demo], [data-wall-anchor], [data-wall-keep-clear]")
      .forEach((element) => observer.observe(element));
    measure();
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(() => scene && layoutWall(scene), [scene]);

  useEffect(() => {
    if (!layout || layout.sequence.length === 0) return;
    const cards = new Map(layout.cards.map((card) => [card.id, card]));
    setSequence(layout.sequence.map((cardId) => ({ cardId, item: cards.get(cardId)!.item })));
  }, [layout, setSequence]);

  const found = layout?.cards.find((card) => card.id === view.cardId);

  return (
    <div
      ref={wallRef}
      aria-hidden="true"
      inert
      data-card-wall=""
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden select-none"
    >
      {scene && layout && (
        <div className="absolute inset-0 animate-wall-in">
          <div className="absolute inset-0 animate-wall-drift [--wall-drift-x:-5px] [--wall-drift-y:-4px] lg:[--wall-drift-x:-9px] lg:[--wall-drift-y:-6px]">
            {layout.cards.map((card) => (
              <ItemCard
                key={card.id}
                card={card}
                lit={view.matched && card === found}
                scanning={card.id === view.scanningCardId}
              />
            ))}
            {found && (
              <Thread
                route={found.route}
                width={scene.width}
                height={scene.height}
                drawn={view.matched}
                desktop={layout.mode === "desktop"}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
