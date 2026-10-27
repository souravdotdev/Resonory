import Link from "next/link";
import { LogoLockup } from "@/brand/logo-svg";
import { WaitlistForm } from "@/waitlist/waitlist-form";
import { readProofLine } from "@/waitlist/proof-line";
import type { WaitlistStore } from "@/waitlist/store";
import { DemoStage } from "./demo-stage";
import { JoinButton } from "./join-button";
import { SearchDemo } from "./search-demo";
import { CardWall } from "./wall/card-wall";
import { KEEP_CLEAR } from "./wall/markers";

const HIGHLIGHT = "text-accent not-italic [-webkit-text-fill-color:var(--color-accent)]";

/**
 * The waitlist home page, one screen: the pill nav, the headline and the
 * signup form beside a search demo, and the footer pill, over a wall of
 * Item cards. On desktop the copy sits left of the demo; below 1024px the
 * demo follows the form. The demo and the wall share one demo loop, so the
 * card lit on the wall is always the one the Cue names.
 *
 * It fills one dynamic viewport and grows (so the page scrolls) only when the
 * screen is too short for the form.
 */
export async function WaitlistScreen({ store }: { store: WaitlistStore }) {
  const proofLine = await readProofLine(store);

  return (
    <DemoStage>
      <div className="relative isolate min-h-dvh overflow-clip text-[15px] lg:text-base">
        <CardWall />

        <header
          {...KEEP_CLEAR}
          className="absolute inset-x-3 top-3 z-10 mx-auto max-w-[720px] animate-fade-up lg:inset-x-8 lg:top-5"
        >
          <nav
            aria-label="Main"
            className="flex h-12 items-center justify-between rounded-full border border-line bg-card/90 py-[5px] pr-[5px] pl-3.5 backdrop-blur-[14px] lg:h-[50px] lg:py-1.5 lg:pr-1.5 lg:pl-4"
          >
            <Link
              href="/"
              aria-current="page"
              className="rounded-lg transition-opacity duration-300 ease-spring hover:opacity-88 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-text"
            >
              <LogoLockup className="h-5 w-auto lg:h-[22px]" />
            </Link>
            <JoinButton />
          </nav>
        </header>

        <main
          id="main"
          className="flex min-h-dvh flex-col px-5 pt-20 pb-[52px] lg:grid lg:grid-cols-[minmax(0,640px)_488px] lg:items-center lg:gap-2 lg:py-[88px] lg:pr-8 lg:pl-[clamp(32px,5.56vw,80px)]"
        >
          <div {...KEEP_CLEAR} className="@container w-full max-w-[560px] lg:max-w-none">
            <h1 className="animate-fade-up bg-linear-to-r from-text to-muted bg-clip-text text-[36px] leading-[1.04] font-semibold tracking-[-0.04em] text-transparent [animation-delay:100ms] lg:text-[clamp(36px,8.4cqi,54px)]">
              <span className="block">
                You <em className={HIGHLIGHT}>saved</em> it.
              </span>{" "}
              <span className="block">
                Resonory <em className={HIGHLIGHT}>brings</em>
                <br className="lg:hidden" /> it back.
              </span>
            </h1>
            <p className="mt-3.5 max-w-[30em] animate-fade-up text-[15px] leading-normal text-pretty text-mute [animation-delay:180ms] lg:mt-5 lg:text-[17px] lg:leading-[1.55]">
              You saved it because it mattered to you. Resonory makes sure you see it again, right
              when you&rsquo;re looking for it.
            </p>
            <div className="mt-[22px] animate-fade-up [animation-delay:260ms] lg:mt-8">
              <WaitlistForm note={proofLine} />
            </div>
          </div>

          <div className="mt-6 lg:mt-0">
            <SearchDemo />
          </div>
        </main>

        <footer
          {...KEEP_CLEAR}
          className="absolute inset-x-0 bottom-2 z-10 mx-auto flex w-fit items-center gap-3.5 rounded-full border border-line bg-bg px-3 py-1 text-[11.5px] whitespace-nowrap text-faint lg:bottom-3.5 lg:gap-4 lg:px-3.5 lg:py-1.5 lg:text-xs"
        >
          <Link
            href="/privacy"
            className="rounded-lg text-text underline decoration-text/35 underline-offset-3 transition-[text-decoration-color,opacity] duration-300 ease-spring hover:decoration-text focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-text active:opacity-70"
          >
            Privacy
          </Link>
          <span className="font-mono">&copy; {new Date().getFullYear()} Resonory</span>
        </footer>
      </div>
    </DemoStage>
  );
}
