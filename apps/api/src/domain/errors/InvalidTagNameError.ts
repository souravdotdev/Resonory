import type { SlugifyTagNameResult } from "@/domain/rules/tagName";
import { AppError } from "./AppError";

/** A Tag name that breaks the Tag name rule once slugified: empty, or over `MAX_TAG_NAME_LENGTH`. */
export class InvalidTagNameError extends AppError {
  constructor(readonly reason: Extract<SlugifyTagNameResult, { ok: false }>["reason"]) {
    super(
      `The Tag name is ${reason === "empty" ? "empty" : "too long"} once slugified`,
      "INVALID_TAG_NAME",
    );
  }
}
