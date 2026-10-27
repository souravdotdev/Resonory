"use client";

import {
  ArrowClockwise,
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  Plus,
  Shield,
  X,
} from "@phosphor-icons/react/dist/ssr";
import { LogoSymbol } from "@/app/logo";
import { useDemoView } from "./demo-stage";
import { WALL_ANCHOR, WALL_DEMO } from "./wall/markers";

/** What the demo shows, in words, for anyone who can't see it. */
const DESCRIPTION =
  "A browser types a search by itself. When the search is complete, a related save on the wall lights up, and a notice says you saved something like this, with its title, what kind of save it is and when you saved it.";

/** The search engine's answer to a query: three results and a count, all made up. */
function resultsFor(query: string) {
  const sentence = query.charAt(0).toUpperCase() + query.slice(1);
  return {
    count: `About ${((query.length * 7919) % 900) + 100},000 results`,
    results: [
      { site: "fieldguide.io", title: sentence },
      { site: "learnwell.org", title: `${sentence}, a beginner guide` },
      { site: "askaround.net", title: `Forum thread: ${query}` },
    ],
  };
}

const FAVOURITES = ["Fieldnotes", "Buildlog", "Colorweek", "Deskdays", "Tinytools", "Peoplenotes"];
const FREQUENTLY_VISITED = ["buildlog.dev", "fieldnotes.blog", "slowcode.net", "deskdays.co"];

function TrafficLights({ className }: { className: string }) {
  return (
    <span className={`gap-[5px] lg:gap-2 ${className}`}>
      {["bg-[#ff5f57]", "bg-[#febc2e]", "bg-[#28c840]"].map((colour) => (
        <i
          key={colour}
          className={`size-[9px] rounded-full border border-black/18 lg:size-3 ${colour}`}
        />
      ))}
    </span>
  );
}

/** The browser's own new-tab page, shown while the query is still being typed. */
function StartPage() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12.5px] font-semibold text-text">Favourites</p>
      <div className="mb-2 grid grid-cols-6 gap-3">
        {FAVOURITES.map((name) => (
          <span
            key={name}
            className="flex min-w-0 flex-col items-center gap-[5px] text-[10px] text-mute"
          >
            <i className="grid size-11 place-items-center rounded-[11px] border border-line bg-card-raised text-[17px] font-semibold text-text not-italic">
              {name.charAt(0)}
            </i>
            <span className="max-w-full truncate">{name}</span>
          </span>
        ))}
      </div>
      <p className="text-[12.5px] font-semibold text-text">Frequently Visited</p>
      <div className="mb-2 grid grid-cols-4 gap-3">
        {FREQUENTLY_VISITED.map((site) => (
          <span
            key={site}
            className="flex min-w-0 flex-col gap-[5px] font-mono text-[9.5px] text-faint"
          >
            <span className="flex h-[50px] flex-col gap-[5px] rounded-lg border border-line bg-card p-2">
              <b className="block h-1 w-[55%] rounded-[2px] bg-text/30" />
              <b className="block h-1 w-[90%] rounded-[2px] bg-card-raised" />
              <b className="block h-1 w-[70%] rounded-[2px] bg-card-raised" />
            </span>
            <span className="truncate">{site}</span>
          </span>
        ))}
      </div>
      <p className="flex items-center gap-2.5 overflow-hidden rounded-[10px] border border-line bg-card px-3 py-[9px] text-[11px] whitespace-nowrap text-mute">
        <Shield size={15} className="shrink-0 text-text" />
        <span className="truncate">
          <strong className="mr-1.5 font-semibold text-text">Privacy Report</strong>
          23 trackers prevented from profiling you this week
        </span>
      </p>
    </div>
  );
}

function SearchResults({ query }: { query: string }) {
  const { count, results } = resultsFor(query);
  return (
    <>
      <div className="flex items-center gap-4 border-b border-line pb-2.5 font-mono text-[10.5px] whitespace-nowrap text-faint">
        <span className="text-text">All</span>
        <span>Images</span>
        <span>Videos</span>
        <span>News</span>
        <span className="ml-auto">{count}</span>
      </div>
      {results.map((result) => (
        <div key={result.site} className="flex min-w-0 flex-col gap-[5px]">
          <span className="flex items-center gap-[7px] font-mono text-[10px] text-faint">
            <i className="size-3.5 rounded-full border border-line-strong bg-card-raised" />
            {result.site}
          </span>
          <span className="truncate text-[13.5px] text-text">{result.title}</span>
          <span className="block h-1.5 w-[92%] rounded-[3px] bg-card-raised" />
          <span className="block h-1.5 w-[62%] rounded-[3px] bg-card-raised" />
        </div>
      ))}
    </>
  );
}

/**
 * The search demo: the visitor's own browser, searching, with Resonory's
 * notification that they already saved something like this. On desktop it's
 * a browser window with its tab, toolbar and page (the start page while the
 * query types, results once it's complete); on a phone, just the search bar.
 * It follows the demo loop, so the notification names the card lit on the
 * wall.
 *
 * To assistive technology it's one image with a text description.
 */
export function SearchDemo() {
  const { match, typed, searched, matched } = useDemoView();

  return (
    <div
      {...WALL_DEMO}
      role="img"
      aria-label={DESCRIPTION}
      className="relative w-full max-w-[343px] animate-fade-up [animation-delay:340ms] lg:w-[488px] lg:max-w-none"
    >
      <div className="overflow-hidden rounded-[13px] border border-line-strong bg-card shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9)] lg:rounded-xl lg:shadow-[0_0_0_1px_rgb(0_0_0/0.45),0_30px_60px_-30px_rgb(0_0_0/0.9)]">
        <div className="hidden h-[38px] items-end gap-1.5 pr-2.5 pl-3.5 lg:flex">
          <TrafficLights className="mr-3.5 flex self-center" />
          <span className="flex h-[30px] w-[220px] items-center gap-2 rounded-t-[9px] bg-card-raised pr-2.5 pl-3 text-xs text-text">
            <MagnifyingGlass size={12} className="shrink-0 text-mute" />
            <span className="min-w-0 flex-1 truncate">{typed || "Start Page"}</span>
            <X size={12} className="shrink-0 text-mute" />
          </span>
          <Plus size={14} className="ml-1 shrink-0 self-center text-faint" />
        </div>

        <div className="flex h-11 items-center gap-2 px-[5px] lg:h-[46px] lg:gap-3 lg:bg-card-raised lg:pr-2.5 lg:pl-3.5">
          <TrafficLights className="flex shrink-0 pr-[3px] pl-[7px] lg:hidden" />
          <span className="hidden gap-1.5 text-faint lg:flex">
            <CaretLeft size={14} />
            <CaretRight size={14} />
            <ArrowClockwise size={14} />
          </span>
          <span className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-full bg-card-raised px-3 lg:gap-2.5 lg:bg-card lg:px-3.5">
            <MagnifyingGlass size={15} className="size-3.5 shrink-0 text-mute lg:size-[15px]" />
            <span className="flex h-5 min-w-0 flex-1 items-center overflow-hidden text-[13.5px] whitespace-nowrap lg:h-[22px] lg:text-[14.5px]">
              <span className="truncate">{typed}</span>
              <span className="ml-px inline-block h-4 w-[1.5px] shrink-0 animate-blink bg-text lg:h-[17px]" />
              {typed === "" && (
                <span className="ml-1 hidden truncate text-faint lg:inline">
                  Search or enter website name
                </span>
              )}
            </span>
          </span>
          <span
            {...WALL_ANCHOR}
            className="grid size-7 shrink-0 place-items-center rounded-lg border border-line bg-card lg:size-[30px]"
          >
            <LogoSymbol className="h-[13px] w-auto lg:h-[15px]" />
          </span>
        </div>

        <div className="hidden h-[288px] flex-col gap-3.5 overflow-hidden border-t border-line bg-bg px-[22px] py-4 lg:flex">
          {searched ? <SearchResults query={match.query} /> : <StartPage />}
        </div>
      </div>

      <div
        className={`mt-2 flex h-[72px] items-center gap-2.5 rounded-[13px] border border-line-strong bg-card-raised/94 px-3 py-[9px] shadow-[0_0_0_1px_rgb(0_0_0/0.4),0_30px_60px_-24px_rgb(0_0_0/0.95)] backdrop-blur-[16px] transition-[opacity,transform] ease-spring [transition-duration:500ms,900ms] lg:absolute lg:top-[100px] lg:left-[144px] lg:mt-0 lg:h-auto lg:min-h-[76px] lg:w-[344px] lg:gap-[11px] lg:rounded-[14px] lg:py-2.5 ${
          matched
            ? "opacity-100 delay-200"
            : "-translate-y-2 scale-[0.985] opacity-0 lg:translate-x-[18px] lg:translate-y-0 lg:scale-100"
        }`}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-line-strong bg-bg lg:size-[34px] lg:rounded-[9px]">
          <LogoSymbol className="h-[15px] w-auto lg:h-[17px]" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 text-xs font-semibold whitespace-nowrap text-text lg:text-[12.5px]">
            <span>You saved something like this</span>
            <span className="ml-auto font-mono text-[9.5px] font-normal text-faint lg:text-[10px]">
              now
            </span>
          </div>
          {/* A long title takes a second line on desktop, where the notice floats over the page. */}
          <p className="truncate text-xs leading-[1.4] text-text/82 lg:line-clamp-2 lg:text-[12.5px] lg:whitespace-normal">
            “{match.title}”
          </p>
          <p className="mt-px truncate font-mono text-[9.5px] text-faint lg:text-[10px]">
            {match.kind} · {match.saved}
          </p>
        </div>
      </div>
    </div>
  );
}
