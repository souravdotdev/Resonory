import type { WaitlistStore } from "./store";

/** Below this many Waitlist Entries the count is hidden, so a tiny number never puts people off. */
export const PROOF_COUNT_THRESHOLD = 100;

/** The proof line while the count is hidden: the offer itself. */
export const OFFER_LINE = "Early access and a founding member price.";

const countFormat = new Intl.NumberFormat("en-US");

/**
 * The proof line under the form: how many are waiting once that number is
 * meaningful, and the offer (early access, a founding member price)
 * otherwise. Never throws: if the count can't be read, the page still
 * renders with the offer line.
 */
export async function readProofLine(store: WaitlistStore): Promise<string> {
  let count: number;
  try {
    count = await store.count();
  } catch (error) {
    console.error("Could not read the Waitlist Entry count", error);
    return OFFER_LINE;
  }
  if (count < PROOF_COUNT_THRESHOLD) return OFFER_LINE;
  return `${countFormat.format(count)} people are waiting · founding member price`;
}
