"use client";

import { useId, useState } from "react";
import { Check, EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import { ErrorResponseSchema } from "@resonory/shared/schemas/common";
import {
  HONEYPOT_FIELD,
  INVALID_EMAIL_MESSAGE,
  SERVER_ERROR_MESSAGE,
  WaitlistEmailSchema,
} from "@/waitlist/request";

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
    const parsed = ErrorResponseSchema.safeParse(await response.json());
    if (parsed.success) return parsed.data.error.message;
  } catch {
    // Not JSON: fall through to the generic message.
  }
  return SERVER_ERROR_MESSAGE;
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
      setError(parsed.error.issues[0]?.message ?? INVALID_EMAIL_MESSAGE);
      return;
    }

    setError(null);
    setStatus("joining");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: parsed.data,
          source: currentSource(),
          [HONEYPOT_FIELD]: company,
        }),
      });
      if (!response.ok) {
        setError(await errorMessageFrom(response));
        setStatus("idle");
        return;
      }
    } catch {
      setError(SERVER_ERROR_MESSAGE);
      setStatus("idle");
      return;
    }

    setStatus("joined");
  }

  if (status === "joined") {
    return (
      <p
        role="status"
        className="flex items-center gap-3 rounded-2xl border border-hairline bg-card px-4 py-3 text-base text-pretty text-text shadow-palette"
      >
        <Check aria-hidden="true" size={16} weight="bold" className="shrink-0 text-muted" />
        You&rsquo;re on the list. We&rsquo;ll email you when your spot opens.
      </p>
    );
  }

  const joining = status === "joining";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-2">
      <label htmlFor={emailId} className="font-mono text-xs text-muted">
        Email
      </label>
      {/* The email field is a palette input: type, then press ↵. */}
      <div className="flex items-center gap-2 rounded-2xl border border-hairline bg-card p-2 shadow-palette transition-colors duration-700 ease-spring has-[input:focus-visible]:border-muted has-[input[aria-invalid]]:border-error">
        <EnvelopeSimple aria-hidden="true" size={16} className="ml-2 shrink-0 text-muted" />
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
          className="min-w-0 flex-1 bg-transparent py-2 text-base text-text caret-text outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={joining}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-text px-3 py-2 text-base font-semibold text-bg transition-all duration-700 ease-spring hover:bg-white active:scale-98 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text disabled:cursor-not-allowed disabled:opacity-60"
        >
          {joining ? "Joining…" : "Join the waitlist"}
          <kbd
            aria-hidden="true"
            className="hidden h-5 min-w-5 items-center justify-center rounded-md bg-bg/10 px-1 font-mono text-xs sm:inline-flex"
          >
            ↵
          </kbd>
        </button>
      </div>
      {/* Honeypot: hidden from people and screen readers, never focusable. */}
      <div aria-hidden="true" className="sr-only">
        <label>
          Company
          <input
            type="text"
            name={HONEYPOT_FIELD}
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
