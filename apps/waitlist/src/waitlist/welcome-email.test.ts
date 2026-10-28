import { describe, expect, it } from "vitest";
import { buildWelcomeEmail } from "./welcome-email";

const BODY_LINES = [
  "You're on the list.",
  "Thanks for joining Resonory. You'll be among the first to use it: we'll email you once more, when early access opens.",
  "Sourav Sanjay",
  "Founder, Resonory",
];

describe("buildWelcomeEmail", () => {
  it("has the subject", () => {
    expect(buildWelcomeEmail("ada@example.com").subject).toBe("You're on the Resonory waitlist");
  });

  it("carries the message and the signature in both versions", () => {
    const { html, text } = buildWelcomeEmail("ada@example.com");

    for (const line of BODY_LINES) {
      expect(text).toContain(line);
      // The HTML escapes the apostrophe, so compare the decoded text.
      expect(html.replaceAll("&#39;", "'")).toContain(line);
    }
  });

  it("has no links, images or tracking", () => {
    const { html, text } = buildWelcomeEmail("ada@example.com");

    expect(html).not.toMatch(/<a[\s>]|<img|<link|<script|href=|src=|https?:\/\//i);
    expect(text).not.toMatch(/https?:\/\//i);
  });

  it("does not ask the reader to reply to be removed", () => {
    const { html, text } = buildWelcomeEmail("ada@example.com");

    expect(`${html} ${text}`).not.toMatch(/reply/i);
  });

  it("never puts the recipient's address in the message", () => {
    const { html, text } = buildWelcomeEmail('"><img src=x onerror=alert(1)>@example.com');

    expect(html).not.toContain("<img");
    expect(html).not.toContain("@example.com");
    expect(text).not.toContain("@example.com");
  });
});
