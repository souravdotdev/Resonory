/** One message to one recipient. The sender's name and address belong to the adapter. */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** The app's only view of an email provider. */
export interface EmailSender {
  /**
   * Resolves "sent" once the provider has accepted the message, or "skipped"
   * when nothing was sent on purpose (no provider configured). Throws if the
   * provider refused or couldn't be reached.
   */
  send(message: EmailMessage): Promise<"sent" | "skipped">;
}
