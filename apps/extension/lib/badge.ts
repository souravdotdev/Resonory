import { browser } from "wxt/browser";

const SUCCESS_COLOR = "#16a34a"; // green
const FAILURE_COLOR = "#dc2626"; // red
const SUCCESS_BADGE_DURATION_MS = 3000;

/** A missing/invalid/rejected API key (or any other save failure) stays visible until the next click. */
export async function showFailureBadge(): Promise<void> {
  await browser.action.setBadgeBackgroundColor({ color: FAILURE_COLOR });
  await browser.action.setBadgeText({ text: "!" });
}

/** A successful save flashes green, then clears itself so the icon returns to its resting state. */
export async function showSuccessBadge(): Promise<void> {
  await browser.action.setBadgeBackgroundColor({ color: SUCCESS_COLOR });
  await browser.action.setBadgeText({ text: "✓" });
  setTimeout(() => {
    void browser.action.setBadgeText({ text: "" });
  }, SUCCESS_BADGE_DURATION_MS);
}

export async function clearBadge(): Promise<void> {
  await browser.action.setBadgeText({ text: "" });
}
