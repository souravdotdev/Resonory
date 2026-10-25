import type { WaitlistStore } from "./store";

/** Below this many Waitlist Entries the count is hidden, so a tiny number never puts people off. */
export const PROOF_COUNT_THRESHOLD = 100;

export const FOUNDING_PRICE_LINE = "Founding member price for the first people in";

const countFormat = new Intl.NumberFormat("en-US");

/**
 * The proof line under the form: how many are waiting once that number is
 * meaningful, and the founding member price otherwise. Never throws: if the
 * count can't be read, the page still renders with the founding price line.
 */
export async function readProofLine(store: WaitlistStore): Promise<string> {
  let count: number;
  try {
    count = await store.count();
  } catch (error) {
    console.error("Could not read the Waitlist Entry count", error);
    return FOUNDING_PRICE_LINE;
  }
  if (count < PROOF_COUNT_THRESHOLD) return FOUNDING_PRICE_LINE;
  return `${countFormat.format(count)} people are waiting`;
}
