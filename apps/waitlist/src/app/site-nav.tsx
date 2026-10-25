import Link from "next/link";
import { Wordmark } from "./wordmark";

/** The floating pill nav, detached from the top and centred. */
export function SiteNav() {
  return (
    <header className="px-4 pt-6">
      <nav
        aria-label="Main"
        className="mx-auto w-max rounded-full border border-border bg-card/80 px-6 py-2 backdrop-blur-xl"
      >
        <Link
          href="/"
          aria-current="page"
          className="block rounded-full transition-opacity duration-700 ease-spring hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <Wordmark />
        </Link>
      </nav>
    </header>
  );
}
