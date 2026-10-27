"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useReducedMotion } from "@/motion/viewport";
import { advance, holdFor, LOOP_START, stillFrame, type LoopState } from "./demo-loop";

function subscribeToVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

const tabIsVisible = () => document.visibilityState !== "hidden";

/**
 * The demo loop over `queries` (the wall's match sequence), running: it
 * advances on a timer, one beat at a time, and pauses while the tab is
 * hidden (the beat starts over when it's back). Under reduced motion it
 * holds the still frame and sets no timer.
 *
 * `random` spaces the keystrokes; tests pass their own.
 */
export function useDemoLoop(
  queries: readonly string[],
  random: () => number = Math.random,
): LoopState {
  const still = useReducedMotion();
  const visible = useSyncExternalStore(subscribeToVisibility, tabIsVisible, () => true);
  const [state, setState] = useState(LOOP_START);

  useEffect(() => {
    if (still || !visible) return;
    const timer = setTimeout(
      () => setState(advance(state, queries)),
      holdFor(state, queries, random),
    );
    return () => clearTimeout(timer);
  }, [state, queries, random, still, visible]);

  return still ? stillFrame(queries) : state;
}
