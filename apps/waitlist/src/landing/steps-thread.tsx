"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { prefersReducedMotion, watchViewport } from "@/motion/viewport";

/**
 * The memory thread joining the three how it works steps. It runs through
 * their keycaps, and each stretch draws down to the next step as that step
 * scrolls into view, through the shared viewport observer. When the thread
 * reaches the last step, "it comes back", the logo's orange dot appears above
 * that step's keycap, like the dot above the stack.
 *
 * It sits inside the steps' palette and finds the steps there, so the section
 * keeps its markup. Decorative: the steps say the same in words.
 */

type Geometry = { x: number; ys: number[] };

/** Where the keycaps' centres sit, relative to the palette holding the thread. */
function measure(container: HTMLElement): Geometry | null {
  const keycaps = [...container.querySelectorAll<HTMLElement>("ol > li kbd")];
  if (keycaps.length < 2) return null;
  const origin = container.getBoundingClientRect();
  const centres = keycaps.map((keycap) => {
    const box = keycap.getBoundingClientRect();
    return { x: box.left + box.width / 2 - origin.left, y: box.top + box.height / 2 - origin.top };
  });
  return { x: centres[0]!.x, ys: centres.map((centre) => centre.y) };
}

export function StepsThread() {
  const ref = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  // drawn[i] is the stretch leading into step i + 1. Drawn unless it's held back for a scroll in.
  const [drawn, setDrawn] = useState<boolean[]>([true, true]);

  useLayoutEffect(() => {
    const container = ref.current?.parentElement;
    if (!container) return;

    const update = () => setGeometry(measure(container));
    update();
    if (typeof ResizeObserver === "undefined") return;
    const resize = new ResizeObserver(update);
    resize.observe(container);
    return () => resize.disconnect();
  }, []);

  useLayoutEffect(() => {
    const container = ref.current?.parentElement;
    if (!container || prefersReducedMotion()) return;

    const steps = [...container.querySelectorAll<HTMLElement>("ol > li")].slice(1);
    const stops = steps.map((step, index) => {
      if (step.getBoundingClientRect().top < window.innerHeight) return () => {};
      setDrawn((current) => current.map((value, i) => (i === index ? false : value)));
      const stop = watchViewport(step, (inView) => {
        if (!inView) return;
        setDrawn((current) => current.map((value, i) => (i === index ? true : value)));
        stop();
      });
      return stop;
    });
    return () => stops.forEach((stop) => stop());
  }, []);

  const last = drawn.length - 1;

  return (
    <div ref={ref} data-slot="steps-thread" aria-hidden="true" className="pointer-events-none">
      {geometry &&
        geometry.ys.slice(1).map((y, index) => {
          const top = geometry.ys[index]!;
          return (
            <span
              key={index}
              className={`absolute w-px origin-top bg-muted/40 transition-[scale] duration-[1200ms] ease-spring motion-reduce:transition-none ${
                drawn[index] ? "scale-y-100" : "scale-y-0"
              }`}
              style={{ left: geometry.x - 0.5, top, height: y - top, transitionDelay: "300ms" }}
            />
          );
        })}
      {geometry && (
        <span
          className={`absolute size-1.5 rounded-full bg-accent transition-[opacity,scale] duration-700 ease-spring motion-reduce:transition-none ${
            drawn[last] ? "scale-100 opacity-100" : "scale-0 opacity-0"
          }`}
          style={{
            left: geometry.x - 3,
            top: geometry.ys[geometry.ys.length - 1]! - 20,
            transitionDelay: "1300ms",
          }}
        />
      )}
    </div>
  );
}
