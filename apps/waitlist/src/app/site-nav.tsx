import Link from "next/link";
import { LogoLockup } from "./logo";
import { EMAIL_FIELD_ID } from "./email-field";

/**
 * The floating pill nav of the pages other than the waitlist screen (privacy,
 * 404): a small palette that stays at the top while the page scrolls, with the
 * logo and a link to the signup form on the main page.
 */
export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 px-4 pt-6">
      <nav
        aria-label="Main"
        className="mx-auto flex w-max items-center gap-6 rounded-full border border-hairline bg-card/80 py-2 pr-2 pl-6 shadow-palette backdrop-blur-xl"
      >
        <Link
          href="/"
          className="block rounded-sm transition-opacity duration-700 ease-spring hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-text"
        >
          <LogoLockup className="h-5 w-auto" />
        </Link>
        <a
          href={`/#${EMAIL_FIELD_ID}`}
          className="rounded-full bg-text px-4 py-2 text-sm font-semibold text-bg transition-all duration-700 ease-spring hover:bg-white active:scale-98 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
        >
          Join the waitlist
        </a>
      </nav>
    </header>
  );
}
