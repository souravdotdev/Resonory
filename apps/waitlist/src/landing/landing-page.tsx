import Link from "next/link";
import { LockSimple } from "@phosphor-icons/react/dist/ssr";
import { SiteFooter } from "@/app/site-footer";
import { SiteNav } from "@/app/site-nav";
import { WaitlistForm } from "@/app/waitlist-form";
import { Reveal, WordReveal } from "@/motion/reveal";
import { readProofLine } from "@/waitlist/proof-line";
import type { WaitlistStore } from "@/waitlist/store";
import { Faq, type FaqEntry } from "./faq";
import { GlyphTile, Keycap, Meta, Palette } from "./palette";
import {
  DriftLayer,
  HeroLoop,
  ProblemIllustration,
  StepsThread,
  WayIllustration,
  type Way,
} from "./slots";

const SECTION = "px-4 py-24";
const CONTAINER = "mx-auto w-full max-w-6xl";
const HEADING = "text-3xl font-semibold tracking-tight text-balance text-text sm:text-4xl";
const LEAD = "max-w-170 text-lg text-pretty text-muted";

const STEPS = [
  {
    key: "⌘1",
    title: "Paste any link",
    body: "An article, an X post, a video, a PDF. Resonory fetches the title, the thumbnail and the text on its own.",
  },
  {
    key: "⌘2",
    title: "Resonory understands it by meaning",
    body: "Every save gets tags for what it is about, so a post on agile principles sits next to one on coding principles, even with no words in common.",
  },
  {
    key: "⌘3",
    title: "It comes back when it matters",
    body: "Open something related, or read your weekly digest, and the save you forgot is right there.",
  },
] as const;

const WAYS: { way: Way; name: string; next: boolean; body: string }[] = [
  {
    way: "related-items",
    name: "Related Items",
    next: false,
    body: "Open any save and see the ones that belong with it, even when they share no words.",
  },
  {
    way: "rediscover-digest",
    name: "Rediscover digest",
    next: false,
    body: "Once a week, an email with a few things you saved and forgot, worth a second look.",
  },
  {
    way: "reminder",
    name: "Reminder",
    next: true,
    body: "Pick a moment, and a save comes back to you right then.",
  },
  {
    way: "cue",
    name: "Cue",
    next: true,
    body: "While you search or browse, a small card says you already saved things on this topic.",
  },
];

const FAQ: readonly FaqEntry[] = [
  {
    question: "What is Resonory?",
    answer:
      "A private library for everything you save online. You paste a link, Resonory understands what it is about, and it brings it back when you need it again.",
  },
  {
    question: "What can I save?",
    answer:
      "Any link: articles, X posts, Instagram posts, YouTube videos, PDFs and pages. At first you save by pasting a link into the web app.",
  },
  {
    question: "When can I use it?",
    answer:
      "We’re letting people in from the waitlist. Join, and we’ll email you when your spot opens.",
  },
  {
    question: "Is it free?",
    answer:
      "People on the waitlist get early access and a founding member price. We’ll share the details before your spot opens.",
  },
  {
    question: "Is my library private?",
    answer: "Yes. Your library is private to you. We never sell your saves or show them to anyone.",
  },
  {
    question: "How is it different from bookmarks?",
    answer:
      "Bookmarks wait for you to remember them. Resonory understands each save by meaning and brings it back when it’s relevant, so you never have to remember what you saved. There are no folders to keep tidy, either.",
  },
];

/** The signup block both forms share: the offer, an independent form, the proof line. */
function Signup({ proofLine }: { proofLine: string }) {
  return (
    <div className="flex w-full max-w-lg flex-col gap-3">
      <p className="text-base text-pretty text-text">
        Join for early access and a founding member price.
      </p>
      <WaitlistForm />
      <p className="font-mono text-xs text-muted tabular-nums">{proofLine}</p>
    </div>
  );
}

/**
 * The waitlist landing page: the story of a save coming back, told as a
 * search palette, with a signup form at the top and again at the end.
 */
export async function LandingPage({ store }: { store: WaitlistStore }) {
  const proofLine = await readProofLine(store);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteNav />
      <main id="main" className="relative isolate flex-1">
        <DriftLayer />

        <section aria-labelledby="hero-heading" className="px-4 pt-16 pb-24 lg:pt-24">
          <div className={`${CONTAINER} grid items-center gap-12 lg:grid-cols-12`}>
            <div className="flex flex-col gap-6 lg:col-span-5">
              <h1
                id="hero-heading"
                className="max-w-170 bg-linear-to-r from-white to-muted bg-clip-text pb-1 text-4xl font-semibold tracking-tight text-balance text-transparent xl:text-5xl"
              >
                You saved it. <br />
                Resonory brings <span className="whitespace-nowrap">it back.</span>
              </h1>
              <p className={LEAD}>
                Save any link in one paste. When you&rsquo;re searching or working on that topic
                again, Resonory shows you what you already saved.
              </p>
              <div className="pt-2">
                <Signup proofLine={proofLine} />
              </div>
            </div>
            <div className="min-w-0 lg:col-span-7">
              <HeroLoop />
            </div>
          </div>
        </section>

        <section aria-labelledby="problem-heading" className={SECTION}>
          <Reveal className={`${CONTAINER} grid items-center gap-12 lg:grid-cols-2`}>
            <div className="flex flex-col gap-6">
              <h2 id="problem-heading" className={HEADING}>
                You saved it for later. <br />
                Later never came.
              </h2>
              <p className={LEAD}>
                Articles, X posts, videos, PDFs and links, kept in bookmarks, saved tabs,
                screenshots and read later lists. Then they sink out of sight.
              </p>
              <p className={LEAD}>
                You know the feeling: something like a thousand things saved, and maybe a dozen ever
                opened again. Saving was never the hard part. Finding it again is, because you
                can&rsquo;t search for what you&rsquo;ve forgotten.
              </p>
            </div>
            <ProblemIllustration />
          </Reveal>
        </section>

        <section aria-labelledby="how-heading" className={SECTION}>
          <Reveal className={`${CONTAINER} flex flex-col gap-12`}>
            <div className="flex flex-col gap-4">
              <h2 id="how-heading" className={HEADING}>
                Three steps, and you only take the first
              </h2>
              <p className={LEAD}>
                No folders to set up and nothing to file. You paste, Resonory does the rest.
              </p>
            </div>
            <Palette className="relative max-w-3xl p-2">
              <StepsThread />
              <ol className="relative flex flex-col">
                {STEPS.map((step) => (
                  <li key={step.key} className="flex gap-4 rounded-lg px-2 py-4">
                    <span className="flex w-8 shrink-0 justify-center pt-1">
                      <Keycap>{step.key}</Keycap>
                    </span>
                    <span className="flex flex-col gap-1">
                      <h3 className="text-lg font-semibold text-text">{step.title}</h3>
                      <p className="max-w-prose text-base text-pretty text-muted">{step.body}</p>
                    </span>
                  </li>
                ))}
              </ol>
            </Palette>
          </Reveal>
        </section>

        <section aria-labelledby="ways-heading" className={SECTION}>
          <Reveal className={`${CONTAINER} flex flex-col gap-12`}>
            <div className="flex flex-col gap-4">
              <h2 id="ways-heading" className={HEADING}>
                Four ways a save comes back
              </h2>
              <p className={LEAD}>
                Related Items and the Rediscover digest come first. Reminders and Cues come next.
              </p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {WAYS.map((way) => (
                <li key={way.way}>
                  <Palette className="flex h-full flex-col gap-4 p-2">
                    <WayIllustration way={way.way} />
                    <div className="flex flex-col gap-2 px-2 pb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-text">{way.name}</h3>
                        {way.next && (
                          <span className="rounded-md border border-hairline px-1 py-0.5 font-mono text-xs text-muted">
                            Next
                          </span>
                        )}
                      </div>
                      <p className="text-base text-pretty text-muted">{way.body}</p>
                    </div>
                  </Palette>
                </li>
              ))}
            </ul>
          </Reveal>
        </section>

        <section aria-labelledby="privacy-heading" className={SECTION}>
          <Reveal className={CONTAINER}>
            <Palette className="flex flex-col gap-6 p-8 sm:p-12">
              <GlyphTile icon={LockSimple} />
              <h2
                id="privacy-heading"
                className="max-w-4xl text-3xl font-semibold tracking-tight text-balance text-text sm:text-4xl"
              >
                Your library is private to you. <br />
                <span className="text-muted">
                  We never sell your saves or show them{" "}
                  <span className="whitespace-nowrap">to anyone.</span>
                </span>
              </h2>
              <Link
                href="/privacy"
                className="w-max rounded-sm text-base text-text underline decoration-muted underline-offset-4 transition-colors duration-700 ease-spring hover:decoration-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-text"
              >
                Read the privacy policy
              </Link>
            </Palette>
          </Reveal>
        </section>

        <section aria-labelledby="founder-heading" className={SECTION}>
          <Reveal className={CONTAINER}>
            <div className="flex max-w-2xl flex-col gap-6">
              <h2 id="founder-heading" className={HEADING}>
                Why I&rsquo;m building Resonory
              </h2>
              <p className="text-lg text-pretty text-text">
                I save things all day: posts, articles, talks I mean to watch. A week later
                I&rsquo;m searching for something I already saved, and nothing tells me it&rsquo;s
                there. Saving was never my problem. Finding it again was, because I can&rsquo;t
                search for what I&rsquo;ve forgotten I have. So I&rsquo;m building Resonory to do
                the remembering for me, and for you: save it once, and it comes back when
                you&rsquo;re working on something it belongs to. Thanks for being early.
              </p>
              <Meta className="text-sm">Sourav Sanjay, Founder</Meta>
            </div>
          </Reveal>
        </section>

        <section aria-labelledby="faq-heading" className={SECTION}>
          <Reveal className={`${CONTAINER} grid gap-12 lg:grid-cols-12`}>
            <div className="flex flex-col gap-4 lg:col-span-4">
              <h2 id="faq-heading" className={HEADING}>
                Questions, answered
              </h2>
            </div>
            <Palette className="p-2 lg:col-span-8">
              <Faq entries={FAQ} />
            </Palette>
          </Reveal>
        </section>

        <section id="join" aria-labelledby="join-heading" className={SECTION}>
          <div className={`${CONTAINER} flex flex-col gap-12`}>
            <WordReveal
              id="join-heading"
              lines={["Stop digging for what you saved.", "Let it find you."]}
              className="max-w-170 text-4xl font-semibold tracking-tight text-balance text-text sm:text-6xl"
            />
            <Signup proofLine={proofLine} />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
