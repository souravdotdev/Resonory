"use client";

import { Fragment, useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { prefersReducedMotion, watchViewport } from "./viewport";

/**
 * Holds the element behind `ref` back (`data-<name>="waiting"`) until the
 * shared observer sees it enter the viewport, then marks it `shown` for good.
 * `globals.css` draws both states for `reveal` and `words`; a `play` element
 * draws its own, with `group-data-[play=waiting]` variants.
 *
 * Only elements that start below the fold are held back: what is on screen at
 * load, everything under reduced motion, and everything without JavaScript
 * stays visible from the start.
 */
export function useRevealOnEnter(
  ref: RefObject<HTMLElement | null>,
  name: "reveal" | "words" | "play",
) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || prefersReducedMotion()) return;
    if (element.getBoundingClientRect().top < window.innerHeight) return;

    element.dataset[name] = "waiting";
    const stop = watchViewport(element, (inView) => {
      if (!inView) return;
      element.dataset[name] = "shown";
      stop();
    });
    return stop;
  }, [ref, name]);
}

/** A block that rises into place the first time it scrolls into view. */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useRevealOnEnter(ref, "reveal");
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/**
 * A heading whose words light up one after another, in reading order, the
 * first time it scrolls into view. Each line is one string; lines break where
 * the thought breaks.
 */
export function WordReveal({
  id,
  lines,
  className,
}: {
  id: string;
  lines: readonly string[];
  className?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  useRevealOnEnter(ref, "words");

  let position = 0;
  return (
    <h2 id={id} ref={ref} className={className}>
      {lines.map((line, lineIndex) => (
        // Spaces and line breaks sit between the word spans, so the heading
        // still reads as one sentence.
        <Fragment key={lineIndex}>
          {lineIndex > 0 && (
            <>
              {" "}
              <br />
            </>
          )}
          {line.split(" ").map((word, wordIndex) => {
            const delay = position++ * 90;
            return (
              <Fragment key={wordIndex}>
                {wordIndex > 0 && " "}
                <span data-word style={{ transitionDelay: `${delay}ms` }}>
                  {word}
                </span>
              </Fragment>
            );
          })}
        </Fragment>
      ))}
    </h2>
  );
}
