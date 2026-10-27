/**
 * The wall's content: synthetic saves, as the founder's design has them. No
 * real brands or people. Every save carries the query that finds it, so any
 * card on the wall can be a demo match.
 */

/** What a save is, as its card is drawn. */
export type SaveKind = "post" | "video" | "article" | "pdf" | "insta" | "link";

type SaveBase = {
  title: string;
  /** The search that finds this save by meaning, never by its words. */
  query: string;
  /** When it was saved, as the notification says it ("saved 3 months ago"). */
  saved: string;
  /** Drawn as a small pile of the same kind. */
  stacked?: boolean;
  /** Carries an "unopened" badge (never drawn on posts or PDFs). */
  unopened?: boolean;
};

export type Save = SaveBase &
  (
    | {
        kind: "post";
        author: string;
        initials: string;
        when: string;
        replies: string;
        reposts: string;
        likes: string;
      }
    | { kind: "video"; duration: string; progress: number; meta: string }
    | {
        kind: "article";
        domain: string;
        favicon: string;
        read: string;
        progress: number;
        meta: string;
      }
    | { kind: "pdf"; meta: string }
    | { kind: "insta"; author: string; initials: string; meta: string }
    | { kind: "link"; domain: string; favicon: string; meta: string }
  );

/** How the notification names each kind of save. */
export const KIND_LABEL: Record<SaveKind, string> = {
  post: "X post",
  video: "Video",
  article: "Article",
  pdf: "PDF",
  insta: "Instagram post",
  link: "Link",
};

/** The four saves the demo promises to find, in the order it finds them. */
export const PROMISED_SAVES: readonly [Save, Save, Save, Save] = [
  {
    kind: "post",
    title: "Five retro formats your team won’t dread",
    author: "Dana Whitfield",
    initials: "DW",
    when: "3 months ago",
    replies: "42",
    reposts: "318",
    likes: "2.6k",
    query: "agile retrospective ideas",
    saved: "saved 3 months ago",
  },
  {
    kind: "article",
    title: "Charge more than feels comfortable",
    domain: "makerledger.blog",
    favicon: "M",
    read: "read 6%",
    progress: 6,
    meta: "saved 7 weeks ago",
    query: "how to price a side project",
    saved: "saved 7 weeks ago",
  },
  {
    kind: "video",
    title: "The only starter guide you need",
    duration: "14:08",
    progress: 12,
    meta: "saved last spring",
    query: "sourdough starter ratio",
    saved: "saved last spring",
  },
  {
    kind: "pdf",
    title: "Naming tokens that scale.pdf",
    meta: "saved 5 months ago",
    query: "design system tokens",
    saved: "saved 5 months ago",
  },
];

/** Everything else on the wall, repeated as often as the screen needs. */
export const WALL_SAVES: readonly Save[] = [
  {
    kind: "article",
    title: "How we cut our deploy time in half",
    domain: "buildlog.dev",
    favicon: "B",
    read: "read 18%",
    progress: 18,
    meta: "saved in February",
    query: "speed up ci pipeline",
    saved: "saved 8 months ago",
  },
  {
    kind: "video",
    title: "Lighting a small room for video calls",
    duration: "12:40",
    progress: 22,
    meta: "stopped at 2:47",
    query: "look better on webcam",
    saved: "saved in June",
  },
  {
    kind: "post",
    title: "Nobody reads the doc you wrote. Here is what works instead",
    author: "Ines Okafor",
    initials: "IO",
    when: "in April",
    replies: "24",
    reposts: "180",
    likes: "1.2k",
    query: "technical writing tips",
    saved: "saved in April",
  },
  {
    kind: "pdf",
    title: "Lease checklist for renters.pdf",
    meta: "page 1 of 12",
    stacked: true,
    query: "first apartment rental tips",
    saved: "saved last year",
  },
  {
    kind: "insta",
    title: "Balcony herb garden, month three",
    author: "Tara Mehta",
    initials: "TM",
    meta: "saved in May",
    query: "growing basil indoors",
    saved: "saved in May",
  },
  {
    kind: "link",
    title: "The quiet power of checklists",
    domain: "fieldnotes.blog",
    favicon: "F",
    meta: "saved in March",
    unopened: true,
    query: "reduce mistakes at work",
    saved: "saved 7 months ago",
  },
  {
    kind: "post",
    title: "Seven questions that make 1:1s useful",
    author: "Leo Brandt",
    initials: "LB",
    when: "in July",
    replies: "12",
    reposts: "96",
    likes: "640",
    query: "manager meeting agenda",
    saved: "saved in July",
  },
  {
    kind: "article",
    title: "The case for boring technology choices",
    domain: "slowcode.net",
    favicon: "S",
    read: "unread",
    progress: 0,
    meta: "saved 4 months ago",
    unopened: true,
    stacked: true,
    query: "choosing a tech stack",
    saved: "saved 4 months ago",
  },
  {
    kind: "video",
    title: "How film editors cut a scene",
    duration: "18:02",
    progress: 8,
    meta: "stopped at 1:26",
    query: "video editing rhythm",
    saved: "saved in January",
  },
  {
    kind: "insta",
    title: "Studio desk setup, small apartment",
    author: "Kai Ren",
    initials: "KR",
    meta: "saved in March",
    query: "minimal workspace ideas",
    saved: "saved in March",
  },
  {
    kind: "pdf",
    title: "Quarterly planning template.pdf",
    meta: "page 2 of 9",
    query: "okr template for teams",
    saved: "saved in April",
  },
  {
    kind: "post",
    title: "Write the README before the code. You will thank yourself later.",
    author: "Asha Varma",
    initials: "AV",
    when: "2 weeks ago",
    replies: "31",
    reposts: "402",
    likes: "3.1k",
    query: "documenting a new project",
    saved: "saved 2 weeks ago",
  },
  {
    kind: "link",
    title: "Palettes for dark interfaces",
    domain: "colorweek.dev",
    favicon: "C",
    meta: "saved in August",
    stacked: true,
    query: "dark mode colours",
    saved: "saved in August",
  },
  {
    kind: "article",
    title: "Onboarding that new hires remember",
    domain: "peoplenotes.co",
    favicon: "P",
    read: "read 40%",
    progress: 40,
    meta: "saved in May",
    query: "first week for new employees",
    saved: "saved in May",
  },
  {
    kind: "video",
    title: "Weeknight noodles in 15 minutes",
    duration: "9:15",
    progress: 0,
    meta: "never watched",
    unopened: true,
    query: "quick dinner recipes",
    saved: "saved last month",
  },
  {
    kind: "post",
    title: "Every keyboard shortcut I use daily, in one thread",
    author: "Jon Ellis",
    initials: "JE",
    when: "in June",
    replies: "58",
    reposts: "1.1k",
    likes: "8.4k",
    query: "work faster on a laptop",
    saved: "saved in June",
  },
  {
    kind: "insta",
    title: "Film photos from the coast",
    author: "Noor Haddad",
    initials: "NH",
    meta: "saved last year",
    query: "35mm beach photography",
    saved: "saved last year",
  },
  {
    kind: "pdf",
    title: "Interview rubric v2.pdf",
    meta: "page 4 of 6",
    query: "how to evaluate candidates",
    saved: "saved in September",
  },
  {
    kind: "article",
    title: "What I learned shipping alone for a year",
    domain: "soloship.blog",
    favicon: "S",
    read: "read 9%",
    progress: 9,
    meta: "saved in March",
    stacked: true,
    query: "indie hacker lessons",
    saved: "saved in March",
  },
  {
    kind: "link",
    title: "Ten small apps worth keeping",
    domain: "tinytools.page",
    favicon: "T",
    meta: "saved in July",
    unopened: true,
    query: "best utility apps for mac",
    saved: "saved in July",
  },
  {
    kind: "video",
    title: "A beginner guide to bouldering",
    duration: "21:47",
    progress: 31,
    meta: "stopped at 6:40",
    query: "indoor climbing for beginners",
    saved: "saved in May",
  },
  {
    kind: "post",
    title: "The best career advice I got this year was boring",
    author: "Mira Kapoor",
    initials: "MK",
    when: "in January",
    replies: "9",
    reposts: "77",
    likes: "512",
    query: "how to grow in my career",
    saved: "saved in January",
  },
  {
    kind: "insta",
    title: "Weeknight dal, three ways",
    author: "Ravi Iyer",
    initials: "RI",
    meta: "saved in May",
    query: "easy lentil curry",
    saved: "saved in May",
  },
  {
    kind: "article",
    title: "A calmer way to plan your week",
    domain: "deskdays.co",
    favicon: "D",
    read: "unread",
    progress: 0,
    meta: "saved in August",
    unopened: true,
    query: "sunday planning routine",
    saved: "saved in August",
  },
];
