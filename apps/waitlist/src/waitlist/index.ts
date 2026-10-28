import { getDb } from "@/db";
import { getEnv } from "@/env";
import { createAutoSendEmailSender } from "./autosend-email-sender";
import { createDrizzleWaitlistStore } from "./drizzle-store";
import type { EmailSender } from "./email-sender";
import { createLoggingEmailSender } from "./logging-email-sender";

export { createJoinWaitlistHandler } from "./handler";
export { readProofLine } from "./proof-line";
export type { EmailMessage, EmailSender } from "./email-sender";
export type { NewWaitlistEntry, WaitlistStore } from "./store";

/** The app's Waitlist store, backed by its own lazily opened Postgres connection. */
export const waitlistStore = createDrizzleWaitlistStore(getDb);

/**
 * AutoSend when `AUTOSEND_API_KEY` is set, otherwise a sender that only logs.
 * The environment is read on each send, so a build never needs the key.
 */
export const emailSender: EmailSender = {
  send(message) {
    const { AUTOSEND_API_KEY, AUTOSEND_UNSUBSCRIBE_GROUP_ID } = getEnv();
    const sender = AUTOSEND_API_KEY
      ? createAutoSendEmailSender({
          apiKey: AUTOSEND_API_KEY,
          unsubscribeGroupId: AUTOSEND_UNSUBSCRIBE_GROUP_ID,
        })
      : createLoggingEmailSender();
    return sender.send(message);
  },
};
