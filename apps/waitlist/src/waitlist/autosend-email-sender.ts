import { z } from "zod";
import type { EmailSender } from "./email-sender";

const SEND_URL = "https://api.autosend.com/v1/mails/send";
const FROM = { email: "hello@resonory.com", name: "Resonory" };

/** AutoSend's answer to an accepted send: `{ success: true, data: { emailId, ... } }`. */
const SendResponseSchema = z.object({ success: z.boolean() });

export interface AutoSendConfig {
  apiKey: string;
  /** Sent with each email only when set, so AutoSend manages unsubscribing. */
  unsubscribeGroupId?: string;
}

/**
 * Sends through AutoSend's REST API with plain `fetch`. Throws unless AutoSend
 * answers 2xx with `success: true`. Errors never carry the key or the address.
 */
export function createAutoSendEmailSender(config: AutoSendConfig): EmailSender {
  return {
    async send(message) {
      const response = await fetch(SEND_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: { email: message.to },
          subject: message.subject,
          html: message.html,
          text: message.text,
          ...(config.unsubscribeGroupId && { unsubscribeGroupId: config.unsubscribeGroupId }),
        }),
      });

      if (!response.ok) {
        throw new Error(`AutoSend answered ${response.status}`);
      }

      const answer = SendResponseSchema.safeParse(await response.json());
      if (!answer.success || !answer.data.success) {
        throw new Error("AutoSend did not report success");
      }
      return "sent";
    },
  };
}
