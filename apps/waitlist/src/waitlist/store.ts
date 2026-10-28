/** What the waitlist app stores for a new Waitlist Entry. */
export interface NewWaitlistEntry {
  /** Already trimmed and lowercased. */
  email: string;
  source: string | null;
}

export interface WaitlistStore {
  /**
   * Adds a Waitlist Entry, doing nothing if the email is already on the list,
   * and says which happened. For the server only: it decides who gets the
   * Welcome email. It must never reach the HTTP response, so the list can't be
   * probed.
   */
  join(entry: NewWaitlistEntry): Promise<{ created: boolean }>;
  /**
   * Records that the provider accepted the Welcome email for this address.
   * Keeps the first time if one is already recorded.
   */
  markWelcomeEmailed(email: string): Promise<void>;
  /** The number of Waitlist Entries. */
  count(): Promise<number>;
}
