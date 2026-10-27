"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DemoMatch } from "../demo-match";
import { layoutWall, type Box, type ThreadRoute, type WallScene } from "./layout";
import { SaveCard } from "./save-card";

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

const THREAD_PATH =
  "animate-thread-draw fill-none stroke-accent [stroke-dasharray:1] [stroke-linecap:round] [stroke-linejoin:round]";

/** The lit card's thread: a soft glow, the line itself, and a dot where it meets the card. */
function Thread({
  route,
  width,
  height,
  desktop,
}: {
  route: ThreadRoute;
  width: number;
  height: number;
  desktop: boolean;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="absolute top-0 left-0 z-2 overflow-visible"
    >
      <path
        pathLength={1}
        d={route.path}
        className={`${THREAD_PATH} stroke-6 opacity-60 blur-[4px] lg:stroke-7 lg:blur-[5px]`}
      />
      <path pathLength={1} d={route.path} className={`${THREAD_PATH} stroke-[1.6]`} />
      <circle
        cx={route.end.x}
        cy={route.end.y}
        r={desktop ? 3.5 : 2.5}
        className="animate-thread-dot fill-accent drop-shadow-[0_0_4px_var(--color-accent)] lg:drop-shadow-[0_0_5px_var(--color-accent)]"
      />
    </svg>
  );
}

/**
 * The wall of saved cards behind the screen: dimmed, drifting, never behind
 * the copy, form, demo, nav or footer. It lays itself out once the page has
 * hydrated (measuring the screen, and again whenever a measured part
 * resizes) and fades in, so the server renders an empty layer and nothing
 * shifts.
 *
 * `match` is the demo's current match: its card is lit, with the thread to it
 * from the Resonory icon. Decorative throughout: hidden from assistive
 * technology, unfocusable and ignoring the pointer.
 */
export function CardWall({ match }: { match: DemoMatch | null }) {
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
  const lit =
    layout && match
      ? layout.cards.find(
          (card) => card.save.title === match.title && layout.sequence.includes(card.id),
        )
      : undefined;

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
              <SaveCard key={card.id} card={card} lit={card === lit} />
            ))}
            {lit && (
              <Thread
                key={lit.id}
                route={lit.route}
                width={scene.width}
                height={scene.height}
                desktop={layout.mode === "desktop"}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
