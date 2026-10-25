import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "./site-footer";
import { SiteNav } from "./site-nav";

export const metadata: Metadata = {
  title: "Page not found · Resonory",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteNav onHome={false} />
      <main
        id="main"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 px-4 py-12 text-center"
      >
        <p className="text-sm font-semibold text-accent">404</p>
        <h1 className="max-w-170 bg-linear-to-r from-white to-muted bg-clip-text pb-1 text-4xl font-semibold tracking-tight text-balance text-transparent">
          We could not find that page
        </h1>
        <p className="max-w-lg text-lg text-pretty text-muted">
          The link may be old or mistyped. You can still join the waitlist from the main page.
        </p>
        <Link
          href="/"
          className="rounded-lg bg-accent px-3 py-2 text-base font-semibold text-text transition-all duration-700 ease-spring hover:bg-accent-hover active:scale-98 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Back to the main page
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
