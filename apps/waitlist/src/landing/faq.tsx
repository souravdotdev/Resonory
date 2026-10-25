"use client";

import { useId, useState } from "react";
import { CaretDown, Question } from "@phosphor-icons/react/dist/ssr";

export interface FaqEntry {
  question: string;
  answer: string;
}

/**
 * The FAQ as palette result rows. Each question is a disclosure button: Enter
 * or Space opens its answer and closes it again, and any number can be open.
 */
export function Faq({ entries }: { entries: readonly FaqEntry[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {entries.map((entry) => (
        <FaqRow key={entry.question} entry={entry} />
      ))}
    </ul>
  );
}

function FaqRow({ entry }: { entry: FaqEntry }) {
  const answerId = useId();
  const [open, setOpen] = useState(false);

  return (
    <li
      className={`rounded-lg border transition-colors duration-700 ease-spring ${
        open ? "border-hairline bg-card-raised" : "border-transparent"
      }`}
    >
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={answerId}
          onClick={() => setOpen((current) => !current)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors duration-700 ease-spring hover:bg-card-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
        >
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-hairline bg-card-raised text-muted"
          >
            <Question size={16} weight="bold" />
          </span>
          <span className="flex-1 text-base text-text">{entry.question}</span>
          <CaretDown
            aria-hidden="true"
            size={16}
            className={`shrink-0 text-muted transition-transform duration-700 ease-spring ${open ? "rotate-180" : ""}`}
          />
        </button>
      </h3>
      <div id={answerId} hidden={!open} className="pr-2 pb-4 pl-12">
        <p className="max-w-prose text-base text-pretty text-muted">{entry.answer}</p>
      </div>
    </li>
  );
}
