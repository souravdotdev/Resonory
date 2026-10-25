import { describe, expect, it, vi } from "vitest";
import { createJoinWaitlistHandler } from "./handler";
import type { NewWaitlistEntry, WaitlistStore } from "./store";

function inMemoryStore() {
  const entries: NewWaitlistEntry[] = [];
  const store: WaitlistStore = {
    async join(entry) {
      if (!entries.some((existing) => existing.email === entry.email)) entries.push(entry);
    },
    async count() {
      return entries.length;
    },
  };
  return { store, entries };
}

function postJson(body: unknown, contentType = "application/json") {
  return new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: { "content-type": contentType },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/waitlist", () => {
  it.each([{ email: "not an email" }, {}, { email: "" }])(
    "rejects %j with 400 validation_failed and stores nothing",
    async (body) => {
      const { store, entries } = inMemoryStore();
      const handler = createJoinWaitlistHandler(store);

      const response = await handler(postJson(body));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: { code: "validation_failed", message: "Enter a valid email address" },
      });
      expect(entries).toEqual([]);
    },
  );

  it.each([
    ["a malformed JSON body", postJson("{not json")],
    ["a JSON array", postJson([{ email: "ada@example.com" }])],
    [
      "a form-encoded body",
      postJson("email=ada%40example.com", "application/x-www-form-urlencoded"),
    ],
    ["a JSON body sent as text/plain", postJson({ email: "ada@example.com" }, "text/plain")],
  ])("rejects %s with 400 validation_failed", async (_label, request) => {
    const { store, entries } = inMemoryStore();
    const handler = createJoinWaitlistHandler(store);

    const response = await handler(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("validation_failed");
    expect(entries).toEqual([]);
  });

  it("stores a valid email trimmed and lowercased, with its source", async () => {
    const { store, entries } = inMemoryStore();
    const handler = createJoinWaitlistHandler(store);

    const response = await handler(postJson({ email: "  Ada@Example.COM ", source: " x.com " }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(entries).toEqual([{ email: "ada@example.com", source: "x.com" }]);
  });

  it("stores no source when none is sent", async () => {
    const { store, entries } = inMemoryStore();
    const handler = createJoinWaitlistHandler(store);

    await handler(postJson({ email: "ada@example.com" }));

    expect(entries).toEqual([{ email: "ada@example.com", source: null }]);
  });

  it("answers the same 200 for an email already on the list in another case, keeping one entry", async () => {
    const { store, entries } = inMemoryStore();
    const handler = createJoinWaitlistHandler(store);

    const first = await handler(postJson({ email: "ada@example.com" }));
    const second = await handler(postJson({ email: "ADA@example.com" }));

    expect(second.status).toBe(first.status);
    expect(await second.json()).toEqual(await first.json());
    expect(entries).toHaveLength(1);
  });

  it("caps an over long source at 100 characters", async () => {
    const { store, entries } = inMemoryStore();
    const handler = createJoinWaitlistHandler(store);

    const response = await handler(postJson({ email: "ada@example.com", source: "s".repeat(500) }));

    expect(response.status).toBe(200);
    expect(entries[0]?.source).toBe("s".repeat(100));
  });

  it("answers 200 to a filled honeypot and stores nothing", async () => {
    const { store, entries } = inMemoryStore();
    const handler = createJoinWaitlistHandler(store);

    const response = await handler(postJson({ email: "bot@example.com", company: "Acme" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(entries).toEqual([]);
  });

  it("answers 200 to a filled honeypot even when the email is invalid", async () => {
    const { store, entries } = inMemoryStore();
    const handler = createJoinWaitlistHandler(store);

    const response = await handler(postJson({ email: "nope", company: "Acme" }));

    expect(response.status).toBe(200);
    expect(entries).toEqual([]);
  });

  it("answers a generic 500 that leaks nothing when the store fails", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const store: WaitlistStore = {
      join: async () => {
        throw new Error('connect ECONNREFUSED 10.0.0.1:6543 relation "waitlist_entries"');
      },
      count: async () => 0,
    };
    const handler = createJoinWaitlistHandler(store);

    const response = await handler(postJson({ email: "ada@example.com" }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        code: "internal",
        message: "We could not add you right now. Please try again.",
      },
    });
    logged.mockRestore();
  });

  it("accepts a JSON content type with a charset", async () => {
    const { store, entries } = inMemoryStore();
    const handler = createJoinWaitlistHandler(store);

    const response = await handler(
      postJson({ email: "ada@example.com" }, "application/json; charset=utf-8"),
    );

    expect(response.status).toBe(200);
    expect(entries).toHaveLength(1);
  });
});
