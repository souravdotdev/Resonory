import { describe, expect, it } from "vitest";
import { redactSensitiveFields } from "./redact";

describe("redactSensitiveFields", () => {
  it.each(["email", "token", "apiKey", "password", "serviceRoleKey", "service_role_key", "secret"])(
    "masks a top-level %s field",
    (field) => {
      const result = redactSensitiveFields({ [field]: "sensitive-value", keep: "fine" }) as Record<
        string,
        unknown
      >;

      expect(result[field]).toBe("[Redacted]");
      expect(result.keep).toBe("fine");
    },
  );

  it("masks a sensitive field no matter how deeply nested", () => {
    const result = redactSensitiveFields({
      user: { profile: { contact: { email: "ada@example.com" } } },
    }) as { user: { profile: { contact: { email: string } } } };

    expect(result.user.profile.contact.email).toBe("[Redacted]");
  });

  it("masks sensitive fields inside arrays", () => {
    const result = redactSensitiveFields({
      users: [{ email: "ada@example.com" }, { email: "bob@example.com" }],
    }) as { users: { email: string }[] };

    expect(result.users[0]?.email).toBe("[Redacted]");
    expect(result.users[1]?.email).toBe("[Redacted]");
  });

  it("leaves everything else untouched", () => {
    const result = redactSensitiveFields({ name: "Ada", nested: { id: 1 } });

    expect(result).toEqual({ name: "Ada", nested: { id: 1 } });
  });

  it("does not mutate the original object", () => {
    const original = { email: "ada@example.com" };

    redactSensitiveFields(original);

    expect(original.email).toBe("ada@example.com");
  });

  it("copes with cycles without looping forever", () => {
    const cyclic: Record<string, unknown> = { email: "ada@example.com" };
    cyclic.self = cyclic;

    const result = redactSensitiveFields(cyclic) as Record<string, unknown>;

    expect(result.email).toBe("[Redacted]");
  });
});
