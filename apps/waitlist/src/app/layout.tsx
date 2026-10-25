import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

const title = "Resonory · You saved it. Resonory brings it back.";
const description =
  "Save any link in one paste. When you search or work on that topic again, Resonory shows you what you already saved. Join the waitlist for early access and a founding member price.";

export const metadata: Metadata = {
  metadataBase: new URL("https://resonory.com"),
  title,
  description,
  robots: { index: true, follow: true },
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "Resonory",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh bg-bg font-sans text-text antialiased">
        <a
          href="#main"
          className="sr-only rounded-full bg-text px-3 py-2 text-sm font-semibold text-bg focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-text"
        >
          Skip to content
        </a>
        {children}
        {/* Vercel Web Analytics is cookieless, so there is no cookie banner. */}
        <Analytics />
      </body>
    </html>
  );
}
