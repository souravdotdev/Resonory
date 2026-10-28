/**
 * The wall's content: synthetic Items, as the founder's design has them. No
 * real brands or people. Every Item carries the query that finds it, so any
 * card on the wall can be a demo match.
 */

/**
 * How an Item's card is drawn: one of the founder's six card styles. A card
 * style is not an Item type (an Instagram card and an X post card both show a
 * Post); it picks the card's look and how the Cue names it.
 */
export type CardStyle = "post" | "video" | "article" | "pdf" | "instagram" | "link";

type DemoItemBase = {
  title: string;
  /** The search that finds this Item by meaning, never by its words. */
  query: string;
  /** When it was saved, as its card and the Cue say it after "saved" ("3 months ago"). */
  savedWhen: string;
  /** Drawn as a small pile of cards in the same style. */
  stacked?: boolean;
  /** Carries an "unopened" badge (never drawn on posts or PDFs). */
  unopened?: boolean;
};

/** An Item on the demo wall, with what its card style draws. */
export type DemoItem = DemoItemBase &
  (
    | {
        style: "post";
        author: string;
        initials: string;
        replies: string;
        reposts: string;
        likes: string;
      }
    | {
        style: "video";
        duration: string;
        progress: number;
        /** The card's last line when it says something other than when it was saved. */
        meta?: string;
      }
    | { style: "article"; domain: string; favicon: string; read: string; progress: number }
    | {
        style: "pdf";
        /** The card's last line when it says something other than when it was saved. */
        meta?: string;
      }
    | { style: "instagram"; author: string; initials: string }
    | { style: "link"; domain: string; favicon: string }
  );

/** How the Cue names each card style. */
export const CARD_STYLE_LABEL: Record<CardStyle, string> = {
  post: "X post",
  video: "Video",
  article: "Article",
  pdf: "PDF",
  instagram: "Instagram post",
  link: "Link",
};

/** When `item` was saved, as its card and the Cue say it ("saved 3 months ago"). */
export function savedLabel(item: DemoItem): string {
  return `saved ${item.savedWhen}`;
}

/** The four Items the demo promises to find, in the order it finds them. */
export const PROMISED_ITEMS: readonly [DemoItem, DemoItem, DemoItem, DemoItem] = [
  {
    style: "post",
    title: "Five retro formats your team won’t dread",
    author: "Dana Whitfield",
    initials: "DW",
    replies: "42",
    reposts: "318",
    likes: "2.6k",
    query: "agile retrospective ideas",
    savedWhen: "3 months ago",
  },
  {
    style: "article",
    title: "Charge more than feels comfortable",
    domain: "makerledger.blog",
    favicon: "M",
    read: "read 6%",
    progress: 6,
    query: "how to price a side project",
    savedWhen: "7 weeks ago",
  },
  {
    style: "video",
    title: "The only starter guide you need",
    duration: "14:08",
    progress: 12,
    query: "sourdough starter ratio",
    savedWhen: "last spring",
  },
  {
    style: "pdf",
    title: "Naming tokens that scale.pdf",
    query: "design system tokens",
    savedWhen: "5 months ago",
  },
];

/** Every other Item on the wall, repeated as often as the screen needs. */
export const WALL_ITEMS: readonly DemoItem[] = [
  {
    style: "article",
    title: "How we cut our deploy time in half",
    domain: "buildlog.dev",
    favicon: "B",
    read: "read 18%",
    progress: 18,
    query: "speed up ci pipeline",
    savedWhen: "8 months ago",
  },
  {
    style: "video",
    title: "Lighting a small room for video calls",
    duration: "12:40",
    progress: 22,
    meta: "stopped at 2:47",
    query: "look better on webcam",
    savedWhen: "in June",
  },
  {
    style: "post",
    title: "Nobody reads the doc you wrote. Here is what works instead",
    author: "Ines Okafor",
    initials: "IO",
    replies: "24",
    reposts: "180",
    likes: "1.2k",
    query: "technical writing tips",
    savedWhen: "in April",
  },
  {
    style: "pdf",
    title: "Lease checklist for renters.pdf",
    meta: "page 1 of 12",
    stacked: true,
    query: "first apartment rental tips",
    savedWhen: "last year",
  },
  {
    style: "instagram",
    title: "Balcony herb garden, month three",
    author: "Tara Mehta",
    initials: "TM",
    query: "growing basil indoors",
    savedWhen: "in May",
  },
  {
    style: "link",
    title: "The quiet power of checklists",
    domain: "fieldnotes.blog",
    favicon: "F",
    unopened: true,
    query: "reduce mistakes at work",
    savedWhen: "7 months ago",
  },
  {
    style: "post",
    title: "Seven questions that make 1:1s useful",
    author: "Leo Brandt",
    initials: "LB",
    replies: "12",
    reposts: "96",
    likes: "640",
    query: "manager meeting agenda",
    savedWhen: "in July",
  },
  {
    style: "article",
    title: "The case for boring technology choices",
    domain: "slowcode.net",
    favicon: "S",
    read: "unread",
    progress: 0,
    unopened: true,
    stacked: true,
    query: "choosing a tech stack",
    savedWhen: "4 months ago",
  },
  {
    style: "video",
    title: "How film editors cut a scene",
    duration: "18:02",
    progress: 8,
    meta: "stopped at 1:26",
    query: "video editing rhythm",
    savedWhen: "in January",
  },
  {
    style: "instagram",
    title: "Studio desk setup, small apartment",
    author: "Kai Ren",
    initials: "KR",
    query: "minimal workspace ideas",
    savedWhen: "in March",
  },
  {
    style: "pdf",
    title: "Quarterly planning template.pdf",
    meta: "page 2 of 9",
    query: "okr template for teams",
    savedWhen: "in April",
  },
  {
    style: "post",
    title: "Write the README before the code. You will thank yourself later.",
    author: "Asha Varma",
    initials: "AV",
    replies: "31",
    reposts: "402",
    likes: "3.1k",
    query: "documenting a new project",
    savedWhen: "2 weeks ago",
  },
  {
    style: "link",
    title: "Palettes for dark interfaces",
    domain: "colorweek.dev",
    favicon: "C",
    stacked: true,
    query: "dark mode colours",
    savedWhen: "in August",
  },
  {
    style: "article",
    title: "Onboarding that new hires remember",
    domain: "peoplenotes.co",
    favicon: "P",
    read: "read 40%",
    progress: 40,
    query: "first week for new employees",
    savedWhen: "in May",
  },
  {
    style: "video",
    title: "Weeknight noodles in 15 minutes",
    duration: "9:15",
    progress: 0,
    meta: "never watched",
    unopened: true,
    query: "quick dinner recipes",
    savedWhen: "last month",
  },
  {
    style: "post",
    title: "Every keyboard shortcut I use daily, in one thread",
    author: "Jon Ellis",
    initials: "JE",
    replies: "58",
    reposts: "1.1k",
    likes: "8.4k",
    query: "work faster on a laptop",
    savedWhen: "in June",
  },
  {
    style: "instagram",
    title: "Film photos from the coast",
    author: "Noor Haddad",
    initials: "NH",
    query: "35mm beach photography",
    savedWhen: "last year",
  },
  {
    style: "pdf",
    title: "Interview rubric v2.pdf",
    meta: "page 4 of 6",
    query: "how to evaluate candidates",
    savedWhen: "in September",
  },
  {
    style: "article",
    title: "What I learned shipping alone for a year",
    domain: "soloship.blog",
    favicon: "S",
    read: "read 9%",
    progress: 9,
    stacked: true,
    query: "indie hacker lessons",
    savedWhen: "in March",
  },
  {
    style: "link",
    title: "Ten small apps worth keeping",
    domain: "tinytools.page",
    favicon: "T",
    unopened: true,
    query: "best utility apps for mac",
    savedWhen: "in July",
  },
  {
    style: "video",
    title: "A beginner guide to bouldering",
    duration: "21:47",
    progress: 31,
    meta: "stopped at 6:40",
    query: "indoor climbing for beginners",
    savedWhen: "in May",
  },
  {
    style: "post",
    title: "The best career advice I got this year was boring",
    author: "Mira Kapoor",
    initials: "MK",
    replies: "9",
    reposts: "77",
    likes: "512",
    query: "how to grow in my career",
    savedWhen: "in January",
  },
  {
    style: "instagram",
    title: "Weeknight dal, three ways",
    author: "Ravi Iyer",
    initials: "RI",
    query: "easy lentil curry",
    savedWhen: "in May",
  },
  {
    style: "article",
    title: "A calmer way to plan your week",
    domain: "deskdays.co",
    favicon: "D",
    read: "unread",
    progress: 0,
    unopened: true,
    query: "sunday planning routine",
    savedWhen: "in August",
  },
];
