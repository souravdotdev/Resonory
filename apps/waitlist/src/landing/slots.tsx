/**
 * The page's visual slots. Each renders a still, simple stand in for now; the
 * hero loop, the section illustrations and the drift layer replace them in
 * place, keeping their props and their text descriptions.
 */

export { HERO_STORY, HeroLoop } from "./hero-loop";

// The story sections' illustrations live in their own files.
export { ProblemIllustration } from "./problem-pile";
export { StepsThread } from "./steps-thread";
export { WayIllustration, type Way } from "./ways";

export { DriftLayer } from "./drift-layer";
