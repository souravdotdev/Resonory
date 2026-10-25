"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { SLIDES } from "./showcase-slides";

/** How long each slide shows before the showcase moves on. */
const SLIDE_MS = 5000;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function prefersReducedMotion() {
  return typeof window.matchMedia === "function" && window.matchMedia(REDUCED_MOTION).matches;
}

/** Whether the visitor asked for reduced motion. Assumed not on the server. */
function useReducedMotion() {
  return useSyncExternalStore(subscribeToReducedMotion, prefersReducedMotion, () => false);
}

/**
 * The hero's feature showcase: four coded illustrations of what Resonory
 * does, switched with labelled tabs (the ARIA tablist pattern).
 *
 * It moves on every 5 seconds, pausing while it is hovered, holds focus or is
 * off screen; a pause keeps the time already spent on the slide. With reduced
 * motion it stays on the Cue and changes only when a tab is chosen.
 */
export function Showcase() {
  const baseId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const reducedMotion = useReducedMotion();
  const rotating = !reducedMotion && !hovered && !focused && onScreen;

  // Time left on the current slide, carried across pauses.
  const remaining = useRef({ slide: active, ms: SLIDE_MS });

  useEffect(() => {
    if (remaining.current.slide !== active) remaining.current = { slide: active, ms: SLIDE_MS };
    if (!rotating) return;

    const startedAt = Date.now();
    const timer = setTimeout(
      () => setActive((current) => (current + 1) % SLIDES.length),
      remaining.current.ms,
    );
    return () => {
      clearTimeout(timer);
      remaining.current.ms = Math.max(0, remaining.current.ms - (Date.now() - startedAt));
    };
  }, [active, rotating]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setOnScreen(entry.isIntersecting);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  function selectAndFocus(index: number) {
    const next = (index + SLIDES.length) % SLIDES.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, number> = {
      ArrowRight: active + 1,
      ArrowLeft: active - 1,
      Home: 0,
      End: SLIDES.length - 1,
    };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    selectAndFocus(target);
  }

  return (
    <div
      ref={rootRef}
      data-slot="showcase"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      className="flex w-full min-w-0 flex-col gap-4"
    >
      <div className="rounded-3xl border border-border bg-card p-2">
        <div className="grid min-w-0">
          {SLIDES.map((slide, index) => {
            const isActive = index === active;
            return (
              <div
                key={slide.id}
                id={`${baseId}-panel-${slide.id}`}
                role="tabpanel"
                aria-labelledby={`${baseId}-tab-${slide.id}`}
                aria-hidden={!isActive}
                inert={!isActive}
                data-active={isActive}
                className="group flex min-w-0 flex-col [grid-area:1/1] motion-safe:transition motion-safe:duration-700 motion-safe:ease-spring data-[active=false]:pointer-events-none data-[active=false]:opacity-0 motion-safe:data-[active=false]:scale-95"
              >
                <div
                  role="img"
                  aria-label={slide.description}
                  className="h-88 overflow-hidden rounded-2xl bg-bg sm:h-96"
                >
                  <slide.Illustration />
                </div>
                <p className="px-3 pt-3 pb-2 text-sm text-pretty text-muted">{slide.caption}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div
        role="tablist"
        aria-label="What Resonory does"
        onKeyDown={handleTabKeyDown}
        className="grid grid-cols-4 gap-2"
      >
        {SLIDES.map((slide, index) => {
          const isActive = index === active;
          return (
            <button
              key={slide.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${slide.id}`}
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${slide.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(index)}
              className="group/tab flex flex-col gap-2 rounded-lg px-1 py-2 text-left text-sm font-semibold text-muted transition-colors duration-700 ease-spring hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-selected:text-text"
            >
              <span
                aria-hidden="true"
                className="h-0.5 w-full overflow-hidden rounded-full bg-border"
              >
                <span className="block h-full w-full origin-left scale-x-0 rounded-full bg-accent transition-transform duration-700 ease-spring group-aria-selected/tab:scale-x-100" />
              </span>
              {slide.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
