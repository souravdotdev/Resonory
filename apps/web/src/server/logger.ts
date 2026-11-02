import "server-only";
import { createLogger } from "@resonory/logger";

// Server-only: Pino needs Node APIs the browser bundle doesn't have. The
// `server-only` import above enforces this for real — it throws a build
// error if this module is ever pulled into a client bundle — never rely on
// this comment alone. Never import this from a "use client" file or any
// other code that can end up in the client bundle.
export const logger = createLogger({ name: "web" });
