/**
 * How many stuck Items the sweep ended (marked Failed), and the Items it
 * couldn't end with the error each one hit, for the caller to log: the use case
 * itself never logs. An Item that finished or was deleted in the meantime is
 * neither ended nor an error.
 */
export interface SweepStuckItemsResult {
  ended: number;
  errors: { itemId: string; error: unknown }[];
}
