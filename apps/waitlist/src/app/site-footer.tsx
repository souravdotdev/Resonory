import Link from "next/link";
import { LogoLockup } from "./logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline px-4 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 text-sm text-muted">
        <LogoLockup className="h-5 w-auto" />
        <div className="flex items-center gap-6">
          <Link
            href="/privacy"
            className="rounded-sm transition-colors duration-700 ease-spring hover:text-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-text"
          >
            Privacy
          </Link>
          <p className="font-mono text-xs">&copy; {new Date().getFullYear()} Resonory</p>
        </div>
      </div>
    </footer>
  );
}
