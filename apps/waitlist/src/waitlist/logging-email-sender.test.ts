import { describe, expect, it, vi } from "vitest";
import { logger } from "@/logger";
import { createLoggingEmailSender } from "./logging-email-sender";

describe("createLoggingEmailSender", () => {
  it("logs one line that names no one, and reports the send as skipped", async () => {
    const logged = vi.spyOn(logger, "info").mockImplementation(() => undefined as never);

    const result = await createLoggingEmailSender().send({
      to: "ada@example.com",
      subject: "Hello",
      html: "<p>Hello</p>",
      text: "Hello",
    });

    expect(result).toBe("skipped");
    expect(logged).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(logged.mock.calls)).not.toContain("ada@example.com");
    logged.mockRestore();
  });
});
