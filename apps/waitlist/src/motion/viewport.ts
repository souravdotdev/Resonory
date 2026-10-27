"use client";

import { useSyncExternalStore } from "react";

/**
 * What the visitor's screen asks of motion. The demo loop reads it to show
 * one still frame instead of animating.
 */
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
