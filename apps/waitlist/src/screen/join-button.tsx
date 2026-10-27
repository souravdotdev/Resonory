"use client";

import { EMAIL_FIELD_ID } from "@/app/email-field";

/**
 * The nav's "Join the waitlist" button: it moves focus straight to the email
 * field. Without JavaScript, or once the visitor has joined and the field is
 * gone, it's a plain link to the form.
 */
export function JoinButton() {
  function focusEmailField(event: React.MouseEvent<HTMLAnchorElement>) {
    const field = document.getElementById(EMAIL_FIELD_ID);
    if (!field) return;
    event.preventDefault();
    field.focus();
  }

  return (
    <a
      href={`#${EMAIL_FIELD_ID}`}
      onClick={focusEmailField}
      className="inline-flex h-9 items-center gap-2.5 rounded-full bg-text px-3.5 text-[13.5px] font-medium whitespace-nowrap text-bg transition-[transform,opacity] duration-600 ease-spring hover:opacity-88 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-text active:scale-97 lg:pr-[5px] lg:pl-[15px] lg:text-sm"
    >
      Join the waitlist
      <kbd
        aria-hidden="true"
        className="hidden size-[26px] items-center justify-center rounded-full border border-bg/18 bg-bg/7 font-mono text-[11.5px] leading-none text-bg lg:inline-flex"
      >
        ↵
      </kbd>
    </a>
  );
}
