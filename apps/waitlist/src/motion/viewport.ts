"use client";

import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

/**
 * The page's one viewport observer. Everything that moves when it enters or
 * leaves the screen (section reveals, the hero loop, the drift layer)
 * subscribes here instead of creating its own observer or listening to
 * scroll events.
 *
 * The bottom tenth of the screen is left out, so things start moving once
 * they are properly in view rather than at the very edge.
 */
type ViewportListener = (inView: boolean) => void;

const listeners = new Map<Element, Set<ViewportListener>>();
let observer: IntersectionObserver | null = null;

function sharedObserver(): IntersectionObserver | null {
  if (observer) return observer;
  if (typeof IntersectionObserver === "undefined") return null;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        listeners.get(entry.target)?.forEach((listener) => listener(entry.isIntersecting));
      }
    },
    { rootMargin: "0px 0px -10% 0px" },
  );
  return observer;
}

/**
 * Calls `listener` each time `element` enters (`true`) or leaves (`false`)
 * the viewport. Returns the function that stops watching. Without
 * IntersectionObserver support nothing is ever reported.
 */
export function watchViewport(element: Element, listener: ViewportListener): () => void {
  const shared = sharedObserver();
  if (!shared) return () => {};

  let forElement = listeners.get(element);
  if (!forElement) {
    forElement = new Set();
    listeners.set(element, forElement);
    shared.observe(element);
  }
  forElement.add(listener);

  return () => {
    const current = listeners.get(element);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) {
      listeners.delete(element);
      shared.unobserve(element);
    }
    // Nothing left to watch: let the observer go, so a later subscriber gets a fresh one.
    if (listeners.size === 0) {
      shared.disconnect();
      observer = null;
    }
  };
}

/**
 * Whether the element behind `ref` is on screen, kept up to date by the
 * shared observer. Starts `true`, so anything paused off screen still renders
 * and plays when observation isn't available.
 */
export function useInViewport(ref: RefObject<Element | null>): boolean {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    return watchViewport(element, setInView);
  }, [ref]);
  return inView;
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Whether the visitor asked for reduced motion, read once, outside React. */
export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(REDUCED_MOTION).matches;
}

/** Whether the visitor asked for reduced motion, kept up to date. Assumed not on the server. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeToReducedMotion, prefersReducedMotion, () => false);
}
