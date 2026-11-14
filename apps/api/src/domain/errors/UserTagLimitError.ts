import { MAX_TAGS_PER_USER } from "@/domain/rules/tagLimits";
import { AppError } from "./AppError";

/** Creating another Tag would take its User past `MAX_TAGS_PER_USER`. */
export class UserTagLimitError extends AppError {
  constructor(readonly userId: string) {
    super(`User ${userId} already has ${MAX_TAGS_PER_USER} Tags`, "USER_TAG_LIMIT");
  }
}
