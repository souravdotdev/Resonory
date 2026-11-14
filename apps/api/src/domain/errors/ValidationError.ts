import { AppError } from "./AppError";

/** The request is well-formed but breaks a domain rule (e.g. a Tag name that's empty once slugified). */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_FAILED");
  }
}
