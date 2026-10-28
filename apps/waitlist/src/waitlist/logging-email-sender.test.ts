import { describe, expect, it, vi } from "vitest";
import { createLoggingEmailSender } from "./logging-email-sender";

describe("createLoggingEmailSender", () => {
  it("logs one line that names no one, and reports the send as skipped", async () => {
    const logged = vi.spyOn(console, "info").mockImplementation(() => {});

    const result = await createLoggingEmailSender().send({
      to: "ada@example.com",
      subject: "Hello",
      html: "<p>Hello</p>",
      text: "Hello",
    });

    expect(result).toBe("skipped");
    expect(logged).toHaveBeenCalledTimes(1);
    expect(String(logged.mock.calls[0])).not.toContain("ada@example.com");
    logged.mockRestore();
  });
});
