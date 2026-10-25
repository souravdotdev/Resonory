import {
  CueIllustration,
  DigestIllustration,
  SaveIllustration,
  SearchIllustration,
} from "./showcase-illustrations";

export type Slide = {
  id: string;
  /** The tab's label. */
  label: string;
  /** The visible line under the illustration. */
  caption: string;
  /** What the illustration shows, for screen readers. */
  description: string;
  Illustration: () => React.ReactNode;
};

/** The showcase's slides, in the order it rotates through them. */
export const SLIDES: readonly Slide[] = [
  {
    id: "cue",
    label: "Cue",
    caption: "While you search, a small card says you already saved 2 things on this.",
    description:
      "A search results page for agile retrospective ideas. In the corner, a small Resonory card tagged Next says you saved 2 things on this: an article on the sailboat retro and a post with 9 retro questions.",
    Illustration: CueIllustration,
  },
  {
    id: "save",
    label: "Save",
    caption: "Paste any link. Titles, thumbnails and tags appear on their own.",
    description:
      "A link pasted into Resonory becomes a saved card with its title, Why our team stopped estimating in story points, a thumbnail, and the AI tags estimation, agile, team process and planning.",
    Illustration: SaveIllustration,
  },
  {
    id: "search",
    label: "Search",
    caption: "Search agile and find the post about coding principles too.",
    description:
      "A Resonory search for agile. Next to the keyword matches, it finds a post about the four rules of simple design, marked related by meaning and tagged coding principles.",
    Illustration: SearchIllustration,
  },
  {
    id: "digest",
    label: "Digest",
    caption: "Every week, a few forgotten saves worth a second look.",
    description:
      "A weekly email from Resonory titled 4 saves worth a second look, listing saves from months ago: reading a research paper in three passes, a weeknight sourdough schedule, and the mental model behind auto layout.",
    Illustration: DigestIllustration,
  },
];
