import { z } from "zod";

// An optional setting whose empty value (`ITEM_TAGGING_CONCURRENCY=` in a .env file) counts as unset.
export const unsetWhenEmpty = <T extends z.ZodType>(value: T) =>
  z.preprocess((raw) => (raw === "" ? undefined : raw), value.optional());

// A positive whole number in plain digits ("1.5", "10s", "0x10" and " " are mistakes).
export const positiveInteger = z
  .string()
  .regex(/^\d+$/, "must be a positive whole number")
  .transform(Number)
  .refine((value) => Number.isSafeInteger(value) && value > 0, "must be a positive whole number");

/** `env` parsed by `schema`, or one error naming every variable that is wrong. */
export function parseWorkerEnv<T extends z.ZodType>(
  schema: T,
  env: NodeJS.ProcessEnv,
): z.output<T> {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables in the worker:\n${issues}`);
  }
  return parsed.data;
}
