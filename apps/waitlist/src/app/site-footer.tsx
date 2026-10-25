import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="px-4 py-6">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 text-sm text-muted">
        <p>&copy; {new Date().getFullYear()} Resonory</p>
        <Link
          href="/privacy"
          className="rounded-sm transition-colors duration-700 ease-spring hover:text-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          Privacy
        </Link>
      </div>
    </footer>
  );
}
