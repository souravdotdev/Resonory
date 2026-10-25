import { ArrowUpRight, LinkSimple, MagnifyingGlass, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { brandColors } from "@/brand/colors";

/*
 * The four coded illustrations in the hero showcase. Each one is decorative
 * markup: the showcase wraps it in an element with a text description, so
 * nothing here needs to be read out.
 *
 * Internal motion keys off the slide's `data-active` attribute (set by the
 * showcase on a `group` ancestor), so a detail slides in each time its slide
 * comes round. It is wrapped in `motion-safe:`: with reduced motion every
 * detail simply sits in its final place.
 */

/** Hidden until the slide is active, then eases up into place. */
const RISE =
  "motion-safe:transition motion-safe:duration-700 motion-safe:ease-spring motion-safe:group-data-[active=false]:translate-y-4 motion-safe:group-data-[active=false]:opacity-0";

/** Delays that only apply on the way in, so leaving a slide is never held up. */
const DELAY = {
  1: "group-data-[active=true]:delay-150",
  2: "group-data-[active=true]:delay-300",
  3: "group-data-[active=true]:delay-500",
  4: "group-data-[active=true]:delay-700",
  5: "group-data-[active=true]:delay-1000",
} as const;

/* ------------------------------------------------------------------------ */
/* Thumbnails: small abstract artworks standing in for page images.          */
/* ------------------------------------------------------------------------ */

type ThumbKind = "sail" | "thread" | "board" | "paper" | "bread" | "layout" | "rules";

/** `contain` keeps the whole artwork in view in a frame of another shape; give the frame a matching background. */
function Thumb({
  kind,
  fit = "cover",
  className = "",
}: {
  kind: ThumbKind;
  fit?: "cover" | "contain";
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      preserveAspectRatio={fit === "cover" ? "xMidYMid slice" : "xMidYMid meet"}
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      {kind === "sail" && (
        <>
          <rect width="64" height="64" fill={brandColors.cardRaised} />
          <path d="M33 12 L33 44 L14 44 Z" fill={brandColors.accent} />
          <path d="M36 18 L36 44 L50 44 Z" fill={brandColors.text} fillOpacity="0.85" />
          <path d="M10 47 L54 47 L48 53 L16 53 Z" fill={brandColors.border} />
          <path
            d="M0 57 Q8 54 16 57 T32 57 T48 57 T64 57"
            stroke={brandColors.muted}
            strokeOpacity="0.5"
            strokeWidth="2"
            fill="none"
          />
        </>
      )}
      {kind === "thread" && (
        <>
          <rect width="64" height="64" fill={brandColors.cardRaised} />
          <rect x="8" y="12" width="36" height="12" rx="6" fill={brandColors.border} />
          <rect x="20" y="28" width="36" height="12" rx="6" fill={brandColors.accent} />
          <rect x="8" y="44" width="28" height="12" rx="6" fill={brandColors.border} />
          <circle cx="14" cy="18" r="2" fill={brandColors.muted} />
          <circle cx="20" cy="18" r="2" fill={brandColors.muted} />
          <circle cx="26" cy="18" r="2" fill={brandColors.muted} />
        </>
      )}
      {kind === "board" && (
        <>
          <rect width="64" height="64" fill={brandColors.card} />
          <rect x="6" y="10" width="15" height="46" rx="3" fill={brandColors.cardRaised} />
          <rect x="24.5" y="10" width="15" height="46" rx="3" fill={brandColors.cardRaised} />
          <rect x="43" y="10" width="15" height="46" rx="3" fill={brandColors.cardRaised} />
          <rect
            x="8.5"
            y="13"
            width="10"
            height="7"
            rx="1.5"
            fill={brandColors.text}
            fillOpacity="0.8"
          />
          <rect x="8.5" y="22" width="10" height="7" rx="1.5" fill={brandColors.border} />
          <rect x="8.5" y="31" width="10" height="7" rx="1.5" fill={brandColors.border} />
          <rect x="27" y="13" width="10" height="7" rx="1.5" fill={brandColors.accent} />
          <rect x="27" y="22" width="10" height="7" rx="1.5" fill={brandColors.border} />
          <rect x="45.5" y="13" width="10" height="7" rx="1.5" fill={brandColors.border} />
          <rect x="45.5" y="22" width="10" height="7" rx="1.5" fill={brandColors.border} />
          <rect x="45.5" y="31" width="10" height="7" rx="1.5" fill={brandColors.border} />
          <rect x="45.5" y="40" width="10" height="7" rx="1.5" fill={brandColors.border} />
        </>
      )}
      {kind === "paper" && (
        <>
          <rect width="64" height="64" fill={brandColors.cardRaised} />
          <rect
            x="14"
            y="8"
            width="36"
            height="48"
            rx="3"
            fill={brandColors.text}
            fillOpacity="0.9"
          />
          <rect x="19" y="14" width="20" height="3" rx="1.5" fill={brandColors.bg} />
          <rect x="19" y="22" width="26" height="2" rx="1" fill={brandColors.muted} />
          <rect x="19" y="27" width="26" height="2" rx="1" fill={brandColors.muted} />
          <rect
            x="18"
            y="31"
            width="28"
            height="5"
            rx="1"
            fill={brandColors.accent}
            fillOpacity="0.7"
          />
          <rect x="19" y="39" width="22" height="2" rx="1" fill={brandColors.muted} />
          <rect x="19" y="44" width="26" height="2" rx="1" fill={brandColors.muted} />
        </>
      )}
      {kind === "bread" && (
        <>
          <rect width="64" height="64" fill={brandColors.cardRaised} />
          <ellipse cx="32" cy="38" rx="22" ry="14" fill={brandColors.accent} />
          <ellipse cx="32" cy="34" rx="20" ry="11" fill={brandColors.accentHover} />
          <path
            d="M20 30 Q26 26 30 32 M30 27 Q36 23 40 29 M38 33 Q42 30 46 34"
            stroke={brandColors.text}
            strokeOpacity="0.75"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <rect x="6" y="52" width="52" height="3" rx="1.5" fill={brandColors.border} />
        </>
      )}
      {kind === "layout" && (
        <>
          <rect width="64" height="64" fill={brandColors.cardRaised} />
          <rect
            x="10"
            y="10"
            width="44"
            height="44"
            rx="4"
            fill="none"
            stroke={brandColors.accent}
            strokeWidth="1.5"
            strokeDasharray="3 2"
          />
          <rect
            x="15"
            y="15"
            width="34"
            height="9"
            rx="2"
            fill={brandColors.text}
            fillOpacity="0.85"
          />
          <rect x="15" y="27" width="16" height="22" rx="2" fill={brandColors.border} />
          <rect x="33" y="27" width="16" height="22" rx="2" fill={brandColors.border} />
          <rect x="31" y="27" width="2" height="22" fill={brandColors.accent} fillOpacity="0.6" />
        </>
      )}
      {kind === "rules" && (
        <>
          <rect width="64" height="64" fill={brandColors.cardRaised} />
          <rect x="10" y="12" width="20" height="18" rx="3" fill={brandColors.accent} />
          <rect x="34" y="12" width="20" height="18" rx="3" fill={brandColors.border} />
          <rect x="10" y="34" width="20" height="18" rx="3" fill={brandColors.border} />
          <rect x="34" y="34" width="20" height="18" rx="3" fill={brandColors.border} />
          <path
            d="M15 21 L19 25 L26 17"
            stroke={brandColors.text}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M39 21 L43 21 M47 21 L49 21 M15 43 L25 43 M39 43 L49 43"
            stroke={brandColors.muted}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

/** A small Resonory mark for the illustrations: an orange ring around a dot. */
function Mark() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" fill="none" stroke={brandColors.accent} strokeWidth="1.5" />
      <circle cx="8" cy="8" r="2.5" fill={brandColors.accent} />
    </svg>
  );
}

function WindowDots() {
  return (
    <div className="flex shrink-0 gap-1">
      <span className="size-2 rounded-full bg-border" />
      <span className="size-2 rounded-full bg-border" />
      <span className="size-2 rounded-full bg-border" />
    </div>
  );
}

function Tag({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`rounded-full border border-border bg-card-raised px-2 py-0.5 text-xs whitespace-nowrap text-text ${className}`}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------------ */
/* 1. Cue: a search results page with a Resonory card in the corner.         */
/* ------------------------------------------------------------------------ */

const SEARCH_RESULTS = [
  {
    site: "fieldguide.dev",
    initial: "F",
    title: "How to run an agile retrospective in 45 minutes",
    snippet: "A timed agenda, the questions to ask, and what to do with the action items.",
  },
  {
    site: "plainteams.co",
    initial: "P",
    title: "Retrospective ideas: 14 formats for tired teams",
    snippet: "Swap start, stop, continue for formats that get the quieter people talking.",
  },
  {
    site: "standup.fm",
    initial: "S",
    title: "Episode 62: why retros go stale, and how to fix them",
    snippet: "Two engineering managers on keeping retrospectives honest after year one.",
  },
];

export function CueIllustration() {
  return (
    <div className="relative h-full p-4 sm:p-6">
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-3 py-2">
          <WindowDots />
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-bg px-3 py-1 text-xs text-text">
            <MagnifyingGlass className="size-3 shrink-0 text-muted" weight="bold" />
            <span className="truncate">agile retrospective ideas</span>
          </div>
        </div>
        <ul className="flex flex-col gap-4 px-4 py-4">
          {SEARCH_RESULTS.map((result) => (
            <li key={result.site} className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="grid size-4 place-items-center rounded-full bg-card-raised text-xs leading-none text-text">
                  {result.initial}
                </span>
                {result.site}
              </div>
              <p className="truncate text-sm font-medium text-text">{result.title}</p>
              <p className="truncate text-xs text-muted">{result.snippet}</p>
            </li>
          ))}
        </ul>
      </div>

      <div
        className={`absolute right-2 bottom-2 w-64 rounded-2xl border border-border bg-card-raised p-3 shadow-2xl shadow-black/60 sm:right-3 sm:bottom-3 sm:w-72 motion-safe:transition motion-safe:duration-1000 motion-safe:ease-spring motion-safe:group-data-[active=false]:translate-x-8 motion-safe:group-data-[active=false]:opacity-0 ${DELAY[3]}`}
      >
        <div className="flex items-center gap-2">
          <Mark />
          <span className="text-xs font-semibold text-text">Resonory</span>
          <span className="ml-auto rounded-full border border-accent/60 bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
            Next
          </span>
        </div>
        <p className="pt-2 text-sm font-semibold text-text">You saved 2 things on this</p>
        <ul className="flex flex-col gap-2 pt-3">
          <li className="flex items-center gap-2 rounded-lg bg-card p-1">
            <Thumb kind="sail" className="size-8 rounded-md" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-text">
                The sailboat retro, step by step
              </p>
              <p className="truncate text-xs text-muted">Article · saved in March</p>
            </div>
          </li>
          <li className="flex items-center gap-2 rounded-lg bg-card p-1">
            <Thumb kind="thread" className="size-8 rounded-md" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-text">
                9 retro questions that get honest answers
              </p>
              <p className="truncate text-xs text-muted">Post · saved 7 weeks ago</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* 2. Save: a pasted link fills in its own title, thumbnail and AI tags.     */
/* ------------------------------------------------------------------------ */

const AI_TAGS = ["estimation", "agile", "team process", "planning"];

export function SaveIllustration() {
  return (
    <div className="flex h-full flex-col justify-center gap-3 p-4 sm:gap-4 sm:p-6">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card py-1 pr-1 pl-3">
        <LinkSimple className="size-4 shrink-0 text-muted" weight="bold" />
        <span className="min-w-0 flex-1 truncate text-xs text-text">
          ninetydays.blog/posts/we-stopped-estimating
        </span>
        <span className="shrink-0 rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-text">
          Save
        </span>
      </div>

      <article
        className={`flex overflow-hidden rounded-2xl border border-border bg-card ${RISE} ${DELAY[1]}`}
      >
        <Thumb kind="board" fit="contain" className="w-1/3 self-stretch bg-card sm:w-2/5" />
        <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:p-4">
          <p className="truncate text-xs text-muted">ninetydays.blog · 8 min read</p>
          <p className="text-sm font-semibold text-pretty text-text">
            Why our team stopped estimating in story points
          </p>
          <div className="flex items-center gap-1 pt-1 text-xs font-medium text-accent">
            <Sparkle className="size-3" weight="fill" />
            AI tags
          </div>
          <div className="flex flex-wrap gap-1">
            {AI_TAGS.map((tag, index) => (
              <Tag key={tag} className={`${RISE} ${DELAY[(index + 2) as 2 | 3 | 4 | 5]}`}>
                {tag}
              </Tag>
            ))}
          </div>
        </div>
      </article>

      <div className="hidden grid-cols-2 gap-3 sm:grid">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 opacity-60">
          <Thumb kind="paper" className="size-8 rounded-md" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-text">
              Writing a design doc people read
            </p>
            <p className="truncate text-xs text-muted">Saved yesterday</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 opacity-60">
          <Thumb kind="layout" className="size-8 rounded-md" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-text">Spacing systems in practice</p>
            <p className="truncate text-xs text-muted">Saved 3 days ago</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* 3. Search: "agile" also finds a post about coding principles.             */
/* ------------------------------------------------------------------------ */

export function SearchIllustration() {
  return (
    <div className="flex h-full flex-col justify-center gap-3 p-4 sm:gap-4 sm:p-6">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
        <MagnifyingGlass className="size-4 shrink-0 text-muted" weight="bold" />
        <span className="text-sm text-text">agile</span>
        <span className="h-4 w-0.5 rounded-full bg-accent motion-safe:animate-pulse" />
        <span className="ml-auto text-xs text-muted">3 saves</span>
      </div>

      <ul className="flex flex-col gap-2">
        <li className="flex items-center gap-3 rounded-xl border border-border bg-card p-2">
          <Thumb kind="sail" className="size-10 rounded-lg" />
          <div className="min-w-0">
            <p className="truncate text-sm text-text">
              <span className="rounded-sm bg-accent/20 px-0.5 text-accent">Agile</span>{" "}
              retrospectives that change something
            </p>
            <p className="truncate text-xs text-muted">fieldguide.dev · Article</p>
          </div>
        </li>

        <li
          className={`flex flex-col gap-2 rounded-xl border border-accent/60 bg-card-raised p-2 shadow-lg shadow-accent/10 ${RISE} ${DELAY[2]}`}
        >
          <div className="flex items-center gap-3">
            <Thumb kind="rules" className="size-10 rounded-lg" />
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm text-pretty text-text sm:truncate">
                The four rules of simple design changed how I review code
              </p>
              <p className="truncate text-xs text-muted">Post by Mira Okafor · saved in June</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1 pl-12">
            <span className="flex items-center gap-1 pr-1 text-xs font-medium text-accent">
              <Sparkle className="size-3" weight="fill" />
              Related by meaning
            </span>
            <Tag>coding principles</Tag>
            <Tag className="hidden sm:inline">refactoring</Tag>
          </div>
        </li>

        <li
          className={`flex items-center gap-3 rounded-xl border border-border bg-card p-2 ${RISE} ${DELAY[3]}`}
        >
          <Thumb kind="board" className="size-10 rounded-lg" />
          <div className="min-w-0">
            <p className="truncate text-sm text-text">
              Scrum or kanban for a team of five?{" "}
              <span className="rounded-sm bg-accent/20 px-0.5 text-accent">Agile</span> basics
            </p>
            <p className="truncate text-xs text-muted">Video · 18 min</p>
          </div>
        </li>
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* 4. Digest: the weekly Rediscover email.                                   */
/* ------------------------------------------------------------------------ */

const DIGEST_ITEMS: { kind: ThumbKind; title: string; saved: string }[] = [
  { kind: "paper", title: "How to read a research paper in three passes", saved: "7 months ago" },
  {
    kind: "bread",
    title: "A weeknight sourdough schedule that fits a 9 to 5",
    saved: "4 months ago",
  },
  {
    kind: "layout",
    title: "Auto layout, the mental model that finally clicked",
    saved: "11 weeks ago",
  },
];

export function DigestIllustration() {
  return (
    <div className="h-full p-4 sm:p-6">
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-text">
            R
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text">4 saves worth a second look</p>
            <p className="truncate text-xs text-muted">Resonory · Rediscover digest</p>
          </div>
          <span className="hidden shrink-0 text-xs text-muted sm:inline">Sun 08:30</span>
        </div>
        <div className="flex flex-col gap-3 px-4 py-3">
          <p className="hidden text-xs text-pretty text-muted sm:block">
            You saved these a while ago and haven&rsquo;t opened them since.
          </p>
          <ul className="flex flex-col gap-2">
            {DIGEST_ITEMS.map((item, index) => (
              <li
                key={item.title}
                className={`flex items-center gap-3 rounded-lg bg-card-raised p-2 ${RISE} ${DELAY[(index + 1) as 1 | 2 | 3]}`}
              >
                <Thumb kind={item.kind} className="size-10 rounded-md" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm text-text sm:truncate">{item.title}</p>
                  <p className="truncate text-xs text-muted">Saved {item.saved}</p>
                </div>
                <ArrowUpRight className="size-4 shrink-0 text-muted" weight="bold" />
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">And 1 more in this week&rsquo;s digest</p>
        </div>
      </div>
    </div>
  );
}
