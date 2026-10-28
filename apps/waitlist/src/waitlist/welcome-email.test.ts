import { describe, expect, it } from "vitest";
import { buildWelcomeEmail, EMAIL_LOGO_URL } from "./welcome-email";

const BODY_LINES = [
  "You're on the List!",
  "Thanks for joining Resonory.",
  "You'll be among the first to use it: we'll email you once more, when early access opens.",
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

  it("has no links or tracking, and its only external reference is the logo", () => {
    const { html, text } = buildWelcomeEmail("ada@example.com");

    expect(html).not.toMatch(/<a[\s>]|<link|<script|href=|<iframe/i);
    // One image, the logo, from the site itself; no tracking pixel.
    expect(html.match(/<img[^>]*>/gi)).toHaveLength(1);
    expect(html.match(/https?:\/\/[^"'\s)]+/gi)).toEqual([EMAIL_LOGO_URL]);
    expect(html).toContain('alt="Resonory"');
    expect(text).not.toMatch(/https?:\/\//i);
  });

  it("puts the second sentence on its own line, in both versions", () => {
    const { html, text } = buildWelcomeEmail("ada@example.com");

    expect(html).toContain("Thanks for joining Resonory.<br>You&#39;ll be among the first");
    expect(text).toContain("Thanks for joining Resonory.\nYou'll be among the first");
  });

  it("sets the heading and the founder's name in the brand orange", () => {
    const { html } = buildWelcomeEmail("ada@example.com");
    const orange = (text: string) =>
      new RegExp(`<p [^>]*color:#D4621A;"[^>]*>${text}</p>`, "i").test(html);

    expect(orange("You&#39;re on the List!")).toBe(true);
    expect(orange("Sourav Sanjay")).toBe(true);
    // Everything else stays off-white or muted.
    expect(html.match(/#D4621A/gi)).toHaveLength(2);
  });

  it("centres the logo and every line of text", () => {
    const { html } = buildWelcomeEmail("ada@example.com");

    expect(html).toContain('align="center"');
    expect(html).toContain("margin:0 auto");
    // The headline, message, name and role: each paragraph is centred.
    expect(html.match(/<p [^>]*text-align:center/g)).toHaveLength(4);
  });

  it("wears the page's dark look: its colours and Geist first in the font stack", () => {
    const { html } = buildWelcomeEmail("ada@example.com");

    for (const colour of ["#141414", "#1F1F1F", "#D4621A", "#AFAFAD"]) {
      expect(html.toLowerCase()).toContain(colour.toLowerCase());
    }
    expect(html).toContain("font-family:Geist,");
    expect(html).toContain('content="dark light"');
  });

  it("does not ask the reader to reply to be removed", () => {
    const { html, text } = buildWelcomeEmail("ada@example.com");

    expect(`${html} ${text}`).not.toMatch(/reply/i);
  });

  it("never puts the recipient's address in the message", () => {
    const { html, text } = buildWelcomeEmail('"><img src=x onerror=alert(1)>@example.com');

    expect(html.match(/<img/gi)).toHaveLength(1); // the logo, nothing the address could inject
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("@example.com");
    expect(text).not.toContain("@example.com");
  });
});
