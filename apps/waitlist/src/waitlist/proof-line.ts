import { describeError } from "@resonory/logger";
import { logger } from "@/logger";
import type { WaitlistStore } from "./store";

/** Below this many Waitlist Entries the count is hidden, so a tiny number never puts people off. */
export const PROOF_COUNT_THRESHOLD = 100;

/** The proof line while the count is hidden: the invitation to join. */
export const OFFER_LINE = "Join the waitlist. Be among the first to use Resonory.";

const countFormat = new Intl.NumberFormat("en-US");

/**
 * The proof line under the form: how many are waiting once that number is
 * meaningful, and the invitation to join otherwise. Never throws: if the
 * count can't be read, the page still renders with the invitation.
 */
export async function readProofLine(store: WaitlistStore): Promise<string> {
  let count: number;
  try {
    count = await store.count();
  } catch (error) {
    // `err` holds `describeError`'s safe string, never the raw Error: Pino's
    // own `err` serializer calls `.message`/`.stack`, which is exactly the
    // leak `describeError` exists to prevent. Do not "simplify" this to
    // `err: error`.
    logger.error({ err: describeError(error) }, "Could not read the Waitlist Entry count");
    return OFFER_LINE;
  }
  if (count < PROOF_COUNT_THRESHOLD) return OFFER_LINE;
  return `${countFormat.format(count)} people are waiting · be among the first`;
}
