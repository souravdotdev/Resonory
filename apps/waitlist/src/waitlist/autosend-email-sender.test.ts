import { afterEach, describe, expect, it, vi } from "vitest";
import { createAutoSendEmailSender } from "./autosend-email-sender";

const MESSAGE = {
  to: "ada@example.com",
  subject: "Hello",
  html: "<p>Hello</p>",
  text: "Hello",
};

const ACCEPTED = { success: true, data: { emailId: "email_1", totalRecipients: 1 } };

function stubFetch(response: Response) {
  const fetchStub = vi.fn<typeof fetch>(async () => response);
  vi.stubGlobal("fetch", fetchStub);
  return fetchStub;
}

function sentRequest(fetchStub: ReturnType<typeof stubFetch>) {
  const [url, init] = fetchStub.mock.calls[0] ?? [];
  return {
    url,
    init,
    body: JSON.parse(String(init?.body)) as Record<string, unknown>,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createAutoSendEmailSender", () => {
  it("POSTs to AutoSend's send endpoint with a Bearer key and a JSON body", async () => {
    const fetchStub = stubFetch(Response.json(ACCEPTED));

    const result = await createAutoSendEmailSender({ apiKey: "test-key" }).send(MESSAGE);

    expect(result).toBe("sent");
    const { url, init, body } = sentRequest(fetchStub);
    expect(url).toBe("https://api.autosend.com/v1/mails/send");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-key");
    expect(new Headers(init?.headers).get("content-type")).toBe("application/json");
    expect(body).toEqual({
      from: { email: "hello@resonory.com", name: "Resonory" },
      to: { email: "ada@example.com" },
      subject: "Hello",
      html: "<p>Hello</p>",
      text: "Hello",
    });
  });

  it("adds the unsubscribe group only when one is configured", async () => {
    const fetchStub = stubFetch(Response.json(ACCEPTED));

    await createAutoSendEmailSender({ apiKey: "test-key", unsubscribeGroupId: "unsub_1" }).send(
      MESSAGE,
    );

    expect(sentRequest(fetchStub).body.unsubscribeGroupId).toBe("unsub_1");
  });

  it("sends no reply-to", async () => {
    const fetchStub = stubFetch(Response.json(ACCEPTED));

    await createAutoSendEmailSender({ apiKey: "test-key" }).send(MESSAGE);

    expect(sentRequest(fetchStub).body).not.toHaveProperty("replyTo");
  });

  it("throws on a non-2xx response, without leaking the key", async () => {
    stubFetch(Response.json({ success: false }, { status: 401 }));

    const failure = createAutoSendEmailSender({ apiKey: "test-key" }).send(MESSAGE);

    await expect(failure).rejects.toThrow(/401/);
    await expect(failure).rejects.not.toThrow(/test-key/);
  });

  it("throws when the response says success is false", async () => {
    stubFetch(Response.json({ success: false }));

    await expect(createAutoSendEmailSender({ apiKey: "test-key" }).send(MESSAGE)).rejects.toThrow(
      /success/i,
    );
  });

  it("throws when the response is not JSON", async () => {
    stubFetch(new Response("<html>bad gateway</html>"));

    await expect(createAutoSendEmailSender({ apiKey: "test-key" }).send(MESSAGE)).rejects.toThrow();
  });

  it("lets a network failure through", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    await expect(createAutoSendEmailSender({ apiKey: "test-key" }).send(MESSAGE)).rejects.toThrow(
      "fetch failed",
    );
  });
});
