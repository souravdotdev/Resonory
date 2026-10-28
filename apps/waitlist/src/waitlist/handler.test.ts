import { describe, expect, it, vi } from "vitest";
import type { EmailMessage, EmailSender } from "./email-sender";
import { createJoinWaitlistHandler } from "./handler";
import type { NewWaitlistEntry, WaitlistStore } from "./store";

function inMemoryStore() {
  const entries: NewWaitlistEntry[] = [];
  const welcomeEmailed: string[] = [];
  const store: WaitlistStore = {
    async join(entry) {
      if (entries.some((existing) => existing.email === entry.email)) return { created: false };
      entries.push(entry);
      return { created: true };
    },
    async markWelcomeEmailed(email) {
      welcomeEmailed.push(email);
    },
    async count() {
      return entries.length;
    },
  };
  return { store, entries, welcomeEmailed };
}

function fakeEmailSender() {
  const sent: EmailMessage[] = [];
  const emailSender: EmailSender = {
    async send(message) {
      sent.push(message);
      return "sent";
    },
  };
  return { emailSender, sent };
}

/**
 * A handler whose deferred work starts at once, and whose call settles only
 * after that work has, so a test can see everything the after-response hook
 * would have done.
 */
function setUp(overrides: { store?: WaitlistStore; emailSender?: EmailSender } = {}) {
  const memory = inMemoryStore();
  const email = fakeEmailSender();
  const pending: Promise<void>[] = [];
  const handle = createJoinWaitlistHandler({
    store: overrides.store ?? memory.store,
    emailSender: overrides.emailSender ?? email.emailSender,
    defer: (task) => {
      pending.push(task());
    },
  });
  const handler = async (request: Request) => {
    const response = await handle(request);
    await Promise.all(pending);
    return response;
  };
  return { handler, ...memory, ...email };
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
    "rejects %j with 400 validation_failed and stores and sends nothing",
    async (body) => {
      const { handler, entries, sent } = setUp();

      const response = await handler(postJson(body));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: { code: "validation_failed", message: "Enter a valid email address" },
      });
      expect(entries).toEqual([]);
      expect(sent).toEqual([]);
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
  ])("rejects %s with 400 validation_failed and sends nothing", async (_label, request) => {
    const { handler, entries, sent } = setUp();

    const response = await handler(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("validation_failed");
    expect(entries).toEqual([]);
    expect(sent).toEqual([]);
  });

  it("stores a valid email trimmed and lowercased, with its source", async () => {
    const { handler, entries } = setUp();

    const response = await handler(postJson({ email: "  Ada@Example.COM ", source: " x.com " }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(entries).toEqual([{ email: "ada@example.com", source: "x.com" }]);
  });

  it("stores no source when none is sent", async () => {
    const { handler, entries } = setUp();

    await handler(postJson({ email: "ada@example.com" }));

    expect(entries).toEqual([{ email: "ada@example.com", source: null }]);
  });

  it("answers the same 200 for an email already on the list in another case, keeping one entry", async () => {
    const { handler, entries } = setUp();

    const first = await handler(postJson({ email: "ada@example.com" }));
    const second = await handler(postJson({ email: "ADA@example.com" }));

    expect(second.status).toBe(first.status);
    expect(await second.json()).toEqual(await first.json());
    expect(entries).toHaveLength(1);
  });

  it("caps an over long source at 100 characters", async () => {
    const { handler, entries } = setUp();

    const response = await handler(postJson({ email: "ada@example.com", source: "s".repeat(500) }));

    expect(response.status).toBe(200);
    expect(entries[0]?.source).toBe("s".repeat(100));
  });

  it("answers 200 to a filled honeypot and stores and sends nothing", async () => {
    const { handler, entries, sent } = setUp();

    const response = await handler(postJson({ email: "bot@example.com", company: "Acme" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(entries).toEqual([]);
    expect(sent).toEqual([]);
  });

  it("answers 200 to a filled honeypot even when the email is invalid", async () => {
    const { handler, entries, sent } = setUp();

    const response = await handler(postJson({ email: "nope", company: "Acme" }));

    expect(response.status).toBe(200);
    expect(entries).toEqual([]);
    expect(sent).toEqual([]);
  });

  it("answers a generic 500 that leaks nothing, and sends nothing, when the store fails", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const store: WaitlistStore = {
      join: async () => {
        throw new Error('connect ECONNREFUSED 10.0.0.1:6543 relation "waitlist_entries"');
      },
      markWelcomeEmailed: async () => {},
      count: async () => 0,
    };
    const { handler, sent } = setUp({ store });

    const response = await handler(postJson({ email: "ada@example.com" }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        code: "internal",
        message: "We could not add you right now. Please try again.",
      },
    });
    expect(sent).toEqual([]);
    logged.mockRestore();
  });

  it("accepts a JSON content type with a charset", async () => {
    const { handler, entries } = setUp();

    const response = await handler(
      postJson({ email: "ada@example.com" }, "application/json; charset=utf-8"),
    );

    expect(response.status).toBe(200);
    expect(entries).toHaveLength(1);
  });
});

describe("the welcome email", () => {
  it("sends exactly one to a new entry and records it", async () => {
    const { handler, sent, welcomeEmailed } = setUp();

    await handler(postJson({ email: "  Ada@Example.COM " }));

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      to: "ada@example.com",
      subject: "You're on the Resonory waitlist",
    });
    expect(sent[0]?.html).toContain("You&#39;re on the list.");
    expect(sent[0]?.text).toContain("You're on the list.");
    expect(welcomeEmailed).toEqual(["ada@example.com"]);
  });

  it("sends none to an email already on the list", async () => {
    const { handler, sent, welcomeEmailed } = setUp();

    await handler(postJson({ email: "ada@example.com" }));
    await handler(postJson({ email: "ADA@example.com" }));

    expect(sent).toHaveLength(1);
    expect(welcomeEmailed).toEqual(["ada@example.com"]);
  });

  it("answers a new and a duplicate signup with an identical response", async () => {
    const { handler } = setUp();

    const created = await handler(postJson({ email: "ada@example.com" }));
    const duplicate = await handler(postJson({ email: "ada@example.com" }));

    expect(duplicate.status).toBe(created.status);
    expect(await duplicate.text()).toBe(await created.text());
  });

  it("is not started before the response, only handed to defer", async () => {
    const { store } = inMemoryStore();
    const { emailSender, sent } = fakeEmailSender();
    const deferred: Array<() => Promise<void>> = [];
    const handler = createJoinWaitlistHandler({
      store,
      emailSender,
      defer: (task) => {
        deferred.push(task);
      },
    });

    const response = await handler(postJson({ email: "ada@example.com" }));

    expect(response.status).toBe(200);
    expect(sent).toEqual([]);
    expect(deferred).toHaveLength(1);
    await deferred[0]?.();
    expect(sent).toHaveLength(1);
  });

  it("still answers the same 200, logs the error and records nothing when sending throws", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("AutoSend answered 503");
    const emailSender: EmailSender = {
      send: async () => {
        throw failure;
      },
    };
    const { handler, entries, welcomeEmailed } = setUp({ emailSender });

    const response = await handler(postJson({ email: "ada@example.com" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(entries).toHaveLength(1);
    expect(welcomeEmailed).toEqual([]);
    expect(logged).toHaveBeenCalledWith(expect.any(String), failure);
    logged.mockRestore();
  });

  it("does not record a send the sender skipped", async () => {
    const { handler, welcomeEmailed } = setUp({ emailSender: { send: async () => "skipped" } });

    const response = await handler(postJson({ email: "ada@example.com" }));

    expect(response.status).toBe(200);
    expect(welcomeEmailed).toEqual([]);
  });

  it("logs and carries on when recording the send fails", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const memory = inMemoryStore();
    const store: WaitlistStore = {
      ...memory.store,
      markWelcomeEmailed: async () => {
        throw new Error("connection lost");
      },
    };
    const { handler } = setUp({ store });

    const response = await handler(postJson({ email: "ada@example.com" }));

    expect(response.status).toBe(200);
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });
});
