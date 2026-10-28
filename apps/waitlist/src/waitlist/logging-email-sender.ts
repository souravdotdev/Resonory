import type { EmailSender } from "./email-sender";

/**
 * Stands in for a real provider when no API key is set (local development,
 * tests, previews): logs one line and sends nothing. The line names neither
 * the recipient nor the subject.
 */
export function createLoggingEmailSender(): EmailSender {
  return {
    async send() {
      console.info("Skipped sending the welcome email: AUTOSEND_API_KEY is not set");
      return "skipped";
    },
  };
}
