import { createLogger } from "@resonory/logger";

// Server-only: Pino needs Node APIs the browser bundle doesn't have. Never
// import this from a "use client" file or any other code that can end up in
// the client bundle.
export const logger = createLogger({ name: "web" });
