import { AppError } from "./AppError";

/**
 * The caller is authenticated, but not in a way this action accepts: an API key
 * on a route that takes only a web Session.
 */
export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, "FORBIDDEN");
  }
}
