import { readProofLine, waitlistStore } from "@/waitlist";
import { ShowcaseSlot } from "./showcase-slot";
import { SiteFooter } from "./site-footer";
import { SiteNav } from "./site-nav";
import { WaitlistForm } from "./waitlist-form";

// The proof line's count is read on the server at most about once a minute,
// never per visit.
export const revalidate = 60;

export default async function WaitlistPage() {
  const proofLine = await readProofLine(waitlistStore);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteNav />
      <main
        id="main"
        className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-4 py-12 lg:grid-cols-2 lg:gap-16"
      >
        <section
          aria-labelledby="hero-heading"
          className="flex flex-col gap-6 motion-safe:animate-rise"
        >
          <h1
            id="hero-heading"
            className="max-w-170 bg-linear-to-r from-white to-muted bg-clip-text pb-1 text-4xl font-semibold tracking-tight text-balance text-transparent xl:text-5xl"
          >
            <span className="block">You saved it.</span>
            <span className="block">Resonory brings it back.</span>
          </h1>
          <p className="max-w-170 text-lg text-pretty text-muted">
            Save any link in one paste. When you&rsquo;re searching or working on that topic again,
            Resonory shows you what you already saved.
          </p>
          <div className="flex max-w-lg flex-col gap-3 pt-2">
            <p className="text-base text-pretty text-text">
              Join for early access and a founding member price.
            </p>
            <WaitlistForm />
            <p className="text-sm text-muted">{proofLine}</p>
          </div>
        </section>
        <div className="motion-safe:animate-rise motion-safe:[animation-delay:150ms]">
          <ShowcaseSlot />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
