"use client";

import { useId, useState } from "react";
import { Check, EnvelopeSimple, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { ErrorResponseSchema } from "@resonory/shared/schemas/common";
import {
  HONEYPOT_FIELD,
  INVALID_EMAIL_MESSAGE,
  SERVER_ERROR_MESSAGE,
  WaitlistEmailSchema,
} from "./request";
import { EMAIL_FIELD_ID } from "./email-field";

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

/**
 * The signup form, a search-style field with an ↵ keycap. `note` (the proof
 * line) sits in the message row under the field, which an error takes over.
 */
export function WaitlistForm({ note }: { note?: string }) {
  const messageId = useId();
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
      <div
        role="status"
        className="flex w-full max-w-[520px] items-start gap-3 rounded-[13px] border border-line-strong bg-card px-3.5 py-[13px] sm:rounded-[14px] sm:px-4 sm:py-[15px]"
      >
        <span className="grid size-[22px] shrink-0 place-items-center rounded-[7px] bg-text text-bg sm:size-6">
          <Check aria-hidden="true" size={16} />
        </span>
        <p>
          <strong className="block text-[14.5px] font-medium sm:text-[15px]">
            You&rsquo;re on the list.
          </strong>{" "}
          <span className="block text-[13.5px] text-mute sm:text-sm">
            We&rsquo;ll email you when your spot opens.
          </span>
        </p>
      </div>
    );
  }

  const joining = status === "joining";

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full">
      <label htmlFor={EMAIL_FIELD_ID} className="sr-only">
        Email
      </label>
      <div
        className={`flex w-full max-w-[520px] items-center gap-2 rounded-[13px] border bg-card py-[5px] pr-[5px] pl-3.5 shadow-[inset_0_1px_0_rgb(250_250_247/0.04),0_24px_48px_-28px_rgb(0_0_0/0.8)] transition-[border-color,box-shadow] duration-500 ease-spring focus-within:shadow-[0_0_0_4px_rgb(250_250_247/0.07)] sm:gap-2.5 sm:rounded-[14px] sm:py-1.5 sm:pr-1.5 sm:pl-4 ${error ? "border-text/72" : "border-line-strong hover:border-text/26 focus-within:border-text/44"}`}
      >
        <EnvelopeSimple
          aria-hidden="true"
          size={16}
          className="hidden shrink-0 text-faint sm:block"
        />
        <input
          id={EMAIL_FIELD_ID}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            // Fixing the address takes the error away; the next submit checks it again.
            setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || note ? messageId : undefined}
          className="h-10 min-w-0 flex-1 bg-transparent text-[15px] text-text caret-text outline-none placeholder:text-faint sm:text-[15.5px]"
        />
        <button
          type="submit"
          disabled={joining}
          className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-text pr-1.5 pl-3 text-sm font-medium whitespace-nowrap text-bg transition-[transform,opacity] duration-600 ease-spring hover:opacity-88 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-text active:scale-97 disabled:cursor-default disabled:px-3.5 disabled:opacity-72 disabled:active:scale-100 sm:gap-2.5 sm:pr-2 sm:pl-4 sm:text-[14.5px] sm:disabled:px-4"
        >
          {joining ? "Joining…" : "Join the waitlist"}
          {/* Under 360px wide the keycap gives its room to the address. */}
          {!joining && (
            <kbd
              aria-hidden="true"
              className="inline-flex h-5 min-w-5 items-center max-[359px]:hidden justify-center rounded-md border border-bg/18 bg-bg/7 px-[5px] font-mono text-[11px] leading-none text-bg sm:h-[22px] sm:min-w-[22px] sm:px-1.5 sm:text-[11.5px]"
            >
              ↵
            </kbd>
          )}
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
      {error ? (
        <p
          id={messageId}
          role="alert"
          className="mt-2.5 flex min-h-[18px] items-center gap-2 text-[13px] text-text sm:mt-3 sm:min-h-5 sm:text-[13.5px]"
        >
          <WarningCircle aria-hidden="true" size={16} className="shrink-0" />
          {error}
        </p>
      ) : (
        note && (
          <p
            id={messageId}
            className="mt-2.5 flex min-h-[18px] items-center font-mono text-[11.5px] text-mute tabular-nums sm:mt-3 sm:min-h-5 sm:text-[12.5px]"
          >
            {note}
          </p>
        )
      )}
    </form>
  );
}
