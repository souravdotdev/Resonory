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
      <SiteNav />
      <main
        id="main"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 px-4 py-12 text-center"
      >
        <h1 className="max-w-170 bg-linear-to-r from-text to-muted bg-clip-text pb-1 text-4xl font-semibold tracking-tight text-balance text-transparent">
          We could not find that page
        </h1>
        <p className="max-w-lg text-lg text-pretty text-muted">
          The link may be old or mistyped. You can still join the waitlist from the main page.
        </p>
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-[10px] bg-text px-4 text-[14.5px] font-medium text-bg transition-[transform,opacity] duration-600 ease-spring hover:opacity-88 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-text active:scale-97"
        >
          Back to the main page
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
