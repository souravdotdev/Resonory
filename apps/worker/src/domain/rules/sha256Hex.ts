import { createHash } from "node:crypto";

/** The hex SHA-256 digest of a string: a fixed-length, URL-safe key from an arbitrary one. */
export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
