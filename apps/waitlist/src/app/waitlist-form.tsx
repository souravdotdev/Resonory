"use client";

import { useId, useState } from "react";
import { WaitlistEmailSchema } from "@/waitlist/request";

const FALLBACK_ERROR = "We could not add you right now. Please try again.";

type Status = "idle" | "joining" | "joined";

/** Where the visitor came from: `utm_source`, or else the referring site's host. */
function currentSource(): string | undefined {
  const utmSource = new URLSearchParams(window.location.search).get("utm_source")?.trim();
  if (utmSource) return utmSource;

  if (!document.referrer) return undefined;
  try {
    const { host } = new URL(document.referrer);
    return host && host !== window.location.host ? host : undefined;
  } catch {
    return undefined;
  }
}

async function errorMessageFrom(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "object" &&
      body.error !== null &&
      "message" in body.error &&
      typeof body.error.message === "string"
    ) {
      return body.error.message;
    }
  } catch {
    // Not JSON: fall through to the generic message.
  }
  return FALLBACK_ERROR;
}

export function WaitlistForm() {
  const emailId = useId();
  const errorId = useId();
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "joining") return;

    // The same email rule the endpoint enforces, so a typo never leaves the page.
    const parsed = WaitlistEmailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email address");
      return;
    }

    setError(null);
    setStatus("joining");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: parsed.data, source: currentSource(), company }),
      });
      if (!response.ok) {
        setError(await errorMessageFrom(response));
        setStatus("idle");
        return;
      }
    } catch {
      setError(FALLBACK_ERROR);
      setStatus("idle");
      return;
    }

    setStatus("joined");
  }

  if (status === "joined") {
    return (
      <p role="status" className="text-base text-pretty text-text">
        You&rsquo;re on the list. We&rsquo;ll email you when your spot opens.
      </p>
    );
  }

  const joining = status === "joining";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-2">
      <label htmlFor={emailId} className="text-sm font-medium text-muted">
        Email
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2 text-base text-text placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
        <button
          type="submit"
          disabled={joining}
          className="rounded-lg bg-accent px-3 py-2 text-base font-semibold text-text transition-colors duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {joining ? "Joining…" : "Join the waitlist"}
        </button>
      </div>
      {/* Honeypot: hidden from people and screen readers, never focusable. */}
      <div aria-hidden="true" className="sr-only">
        <label>
          Company
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
        </label>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
    </form>
  );
}
