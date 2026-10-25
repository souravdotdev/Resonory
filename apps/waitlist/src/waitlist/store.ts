/** What the waitlist app stores for a new Waitlist Entry. */
export interface NewWaitlistEntry {
  /** Already trimmed and lowercased. */
  email: string;
  source: string | null;
}

export interface WaitlistStore {
  /**
   * Adds a Waitlist Entry, doing nothing if the email is already on the list.
   * Never reports which happened, so the list can't be probed.
   */
  join(entry: NewWaitlistEntry): Promise<void>;
  /** The number of Waitlist Entries. */
  count(): Promise<number>;
}
