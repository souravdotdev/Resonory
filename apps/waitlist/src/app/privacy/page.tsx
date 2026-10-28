import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "../site-footer";
import { SiteNav } from "../site-nav";

export const metadata: Metadata = {
  title: "Privacy · Resonory",
  description:
    "What the Resonory waitlist stores when you join, why, and how to ask to be removed.",
  alternates: { canonical: "/privacy" },
};

const contactEmail = "hello@resonory.com";
const removalHref = `mailto:${contactEmail}?subject=${encodeURIComponent("Remove me from the waitlist")}`;

const linkClass =
  "rounded-sm text-text underline decoration-border underline-offset-4 transition-colors duration-700 ease-spring hover:decoration-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-text";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteNav />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <article className="flex flex-col gap-8">
          <header className="flex flex-col gap-3">
            <h1 className="bg-linear-to-r from-text to-muted bg-clip-text pb-1 text-4xl font-semibold tracking-tight text-balance text-transparent">
              Privacy
            </h1>
            <p className="text-sm text-muted">Last updated October 28, 2026</p>
          </header>

          <section aria-labelledby="stored" className="flex flex-col gap-3">
            <h2 id="stored" className="text-xl font-semibold text-text">
              What we store
            </h2>
            <p className="text-base text-pretty text-muted">
              When you join the waitlist, we keep three things:
            </p>
            <ul className="flex list-disc flex-col gap-2 pl-6 text-base text-pretty text-muted">
              <li>
                <span className="text-text">Your email address</span>, so we can tell you when early
                access opens.
              </li>
              <li>
                <span className="text-text">Where you came from</span>, such as the site that linked
                you here, so we know which places people hear about Resonory.
              </li>
              <li>
                <span className="text-text">When you joined</span>, as a record of when you asked to
                be on the list.
              </li>
            </ul>
            <p className="text-base text-pretty text-muted">
              That is all. We don&rsquo;t ask for your name, and we don&rsquo;t sell or share the
              list with anyone.
            </p>
          </section>

          <section aria-labelledby="email" className="flex flex-col gap-3">
            <h2 id="email" className="text-xl font-semibold text-text">
              When we email you
            </h2>
            <p className="text-base text-pretty text-muted">
              We email you twice, and nothing else: a confirmation when you join, and one when early
              access opens. Joining the waitlist is free.
            </p>
            <p className="text-base text-pretty text-muted">
              AutoSend, our email provider, sends both emails, so it handles your address to deliver
              them.
            </p>
          </section>

          <section aria-labelledby="visits" className="flex flex-col gap-3">
            <h2 id="visits" className="text-xl font-semibold text-text">
              Visits to this page
            </h2>
            <p className="text-base text-pretty text-muted">
              We count visits with Vercel Web Analytics. It sets no cookies and doesn&rsquo;t
              connect a visit to your email.
            </p>
          </section>

          <section aria-labelledby="removal" className="flex flex-col gap-3">
            <h2 id="removal" className="text-xl font-semibold text-text">
              Leaving the list
            </h2>
            <p className="text-base text-pretty text-muted">
              Email{" "}
              <a href={removalHref} className={linkClass}>
                {contactEmail}
              </a>{" "}
              from the address you signed up with, and we&rsquo;ll delete your entry and reply to
              confirm.
            </p>
          </section>

          <Link
            href="/"
            className="w-max rounded-lg border border-border bg-card px-3 py-2 text-base font-semibold text-text transition-all duration-700 ease-spring hover:bg-card-raised active:scale-98 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
          >
            Back to the main page
          </Link>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
