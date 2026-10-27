import {
  ArrowClockwise,
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  Plus,
  X,
} from "@phosphor-icons/react/dist/ssr";
import { LogoSymbol } from "@/app/logo";
import type { DemoMatch } from "./demo-match";
import { WALL_ANCHOR, WALL_DEMO } from "./wall/markers";

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

/** What the demo shows, in words, for anyone who can't see it. */
function describeDemo(match: DemoMatch): string {
  return `A browser search for ${match.query}. A notice says you saved something like this: “${match.title}”, ${match.kind}, ${match.saved}.`;
}

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

/**
 * The search demo: the visitor's own browser, searching, with Resonory's
 * notification that they already saved something like this. On desktop it's
 * a browser window with its tab, toolbar and results page; on a phone, just
 * the search bar. It shows `match` fully searched and found.
 *
 * To assistive technology it's one image with a text description.
 */
export function SearchDemo({ match }: { match: DemoMatch }) {
  const { count, results } = resultsFor(match.query);

  return (
    <div
      {...WALL_DEMO}
      role="img"
      aria-label={describeDemo(match)}
      className="relative w-full max-w-[343px] animate-fade-up [animation-delay:340ms] lg:w-[488px] lg:max-w-none"
    >
      <div className="overflow-hidden rounded-[13px] border border-line-strong bg-card shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9)] lg:rounded-xl lg:shadow-[0_0_0_1px_rgb(0_0_0/0.45),0_30px_60px_-30px_rgb(0_0_0/0.9)]">
        <div className="hidden h-[38px] items-end gap-1.5 pr-2.5 pl-3.5 lg:flex">
          <TrafficLights className="mr-3.5 flex self-center" />
          <span className="flex h-[30px] w-[220px] items-center gap-2 rounded-t-[9px] bg-card-raised pr-2.5 pl-3 text-xs text-text">
            <MagnifyingGlass size={12} className="shrink-0 text-mute" />
            <span className="min-w-0 flex-1 truncate">{match.query}</span>
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
              <span className="truncate">{match.query}</span>
              <span className="ml-px inline-block h-4 w-[1.5px] shrink-0 animate-blink bg-text lg:h-[17px]" />
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
        </div>
      </div>

      <div className="mt-2 flex h-[72px] items-center gap-2.5 rounded-[13px] border border-line-strong bg-card-raised/94 px-3 py-[9px] shadow-[0_0_0_1px_rgb(0_0_0/0.4),0_30px_60px_-24px_rgb(0_0_0/0.95)] backdrop-blur-[16px] lg:absolute lg:top-[100px] lg:left-[144px] lg:mt-0 lg:h-[76px] lg:w-[344px] lg:gap-[11px] lg:rounded-[14px] lg:py-2.5">
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
          <p className="truncate text-xs leading-[1.4] text-text/82 lg:text-[12.5px]">
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
