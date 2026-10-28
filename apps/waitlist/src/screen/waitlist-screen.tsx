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
 * The waitlist home page, one screen: the pill nav, an opening line, the
 * headline and the signup form with a search demo, and the footer pill, over a wall of Item
 * cards. On desktop (from 1024px) the copy sits left of the demo, the pair
 * centred on a wide screen as the design's 1440px frame. Below that the copy,
 * form and demo stack in one column, centred and 520px at most from 640px,
 * and the stack sits in the middle of the screen with room kept under the
 * demo for the cards it finds. The demo and the wall share one demo loop, so
 * the card lit on the wall is always the one the Cue names.
 *
 * It fills one dynamic viewport and grows (so the page scrolls) only when the
 * screen is too short for the form.
 */
export async function WaitlistScreen({ store }: { store: WaitlistStore }) {
  const proofLine = await readProofLine(store);

  return (
    <DemoStage>
      <div className="relative isolate min-h-dvh overflow-clip text-[15px] sm:text-base">
        <CardWall />

        <header
          {...KEEP_CLEAR}
          className="absolute inset-x-3 top-3 z-10 mx-auto max-w-[720px] animate-fade-up sm:inset-x-8 sm:top-5"
        >
          <nav
            aria-label="Main"
            className="flex h-12 items-center justify-between rounded-full border border-line bg-card/90 py-[5px] pr-[5px] pl-3.5 backdrop-blur-[14px] sm:h-[50px] sm:py-1.5 sm:pr-1.5 sm:pl-4"
          >
            <Link
              href="/"
              aria-current="page"
              className="rounded-lg transition-opacity duration-300 ease-spring hover:opacity-88 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-text"
            >
              <LogoLockup className="h-5 w-auto sm:h-[22px]" />
            </Link>
            <JoinButton />
          </nav>
        </header>

        <main
          id="main"
          className="flex min-h-dvh flex-col items-center px-5 pt-[72px] pb-[52px] sm:pt-20 max-lg:short:pt-16 max-lg:short:pb-9 lg:grid lg:grid-cols-[minmax(0,640px)_488px] lg:items-center lg:gap-2 lg:py-[88px] lg:pr-8 lg:pl-[max(clamp(32px,5.56vw,80px),calc(50vw-640px))]"
        >
          {/*
           * Below 1024px the stack sits in what's left of the screen: room is
           * kept under the demo for the cards it finds, then the rest is shared
           * above and below (on a tablet, more below, where the wall has room).
           */}
          <div className="grow lg:hidden" />
          <div {...KEEP_CLEAR} className="@container w-full max-w-[520px] lg:max-w-none">
            <p className="mb-1.5 max-w-[30em] animate-fade-up font-hand text-[22px] max-lg:short:text-[20px] leading-[1.15] font-medium text-pretty text-mute [animation-delay:60ms] sm:mb-3 sm:text-[28px]">
              Remember that link you were sure you&rsquo;d need?
            </p>
            <h1 className="animate-fade-up bg-linear-to-r from-text to-muted bg-clip-text leading-[1.04] font-semibold tracking-[-0.04em] text-transparent [animation-delay:160ms] max-sm:text-[min(36px,10.75cqi)] sm:text-[clamp(36px,8.4cqi,54px)]">
              <span className="block">
                You <em className={HIGHLIGHT}>saved</em> it.
              </span>{" "}
              <span className="block">
                Resonory <em className={HIGHLIGHT}>brings</em>
                <br className="sm:hidden" /> it back.
              </span>
            </h1>
            <p className="mt-2.5 max-w-[30em] animate-fade-up text-[15px] leading-normal max-lg:short:leading-snug text-pretty text-mute [animation-delay:240ms] sm:mt-5 sm:text-[17px] sm:leading-[1.55]">
              You saved it because it mattered to you. Resonory makes sure you see it again, right
              when you&rsquo;re looking for it.
            </p>
            <div className="mt-4 animate-fade-up max-lg:short:mt-3 [animation-delay:320ms] sm:mt-8">
              <WaitlistForm note={proofLine} />
            </div>
          </div>

          <div className="mt-4 w-full max-w-[520px] max-lg:short:mt-3 sm:mt-6 lg:mt-0 lg:max-w-none">
            <SearchDemo />
          </div>
          {/* The room kept for the cards the demo finds, given up first on a short screen. */}
          <div className="max-h-[264px] grow-[1000] sm:max-h-[220px] lg:hidden" />
          <div className="grow sm:grow-[2] lg:hidden" />
        </main>

        <footer
          {...KEEP_CLEAR}
          className="absolute inset-x-0 bottom-2 z-10 mx-auto flex w-fit items-center gap-3.5 rounded-full border border-line bg-bg px-3 py-1 text-[11.5px] whitespace-nowrap text-faint sm:bottom-3.5 sm:gap-4 sm:px-3.5 sm:py-1.5 sm:text-xs"
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
