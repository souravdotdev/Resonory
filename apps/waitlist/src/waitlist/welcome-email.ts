import type { EmailMessage } from "./email-sender";

const SUBJECT = "You're on the Resonory waitlist";
const HEADLINE = "You're on the list.";
const BODY =
  "Thanks for joining Resonory. You'll be among the first to use it: we'll email you once more, when early access opens.";
const SIGNATURE_NAME = "Sourav Sanjay";
const SIGNATURE_ROLE = "Founder, Resonory";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * The Welcome email for a new Waitlist Entry: plain words, no links, images or
 * tracking. The address only says who it is sent to; it never appears in the
 * message, so there is nothing to escape in the HTML.
 */
export function buildWelcomeEmail(recipient: string): EmailMessage {
  const text = [HEADLINE, "", BODY, "", SIGNATURE_NAME, SIGNATURE_ROLE, ""].join("\n");

  const html = [
    "<!doctype html>",
    '<html lang="en">',
    "<body>",
    "<div style=\"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#111\">",
    `<p style="font-size:20px;font-weight:600;margin:0 0 16px">${escapeHtml(HEADLINE)}</p>`,
    `<p style="margin:0 0 24px">${escapeHtml(BODY)}</p>`,
    `<p style="margin:0">${escapeHtml(SIGNATURE_NAME)}<br>${escapeHtml(SIGNATURE_ROLE)}</p>`,
    "</div>",
    "</body>",
    "</html>",
  ].join("\n");

  return { to: recipient, subject: SUBJECT, html, text };
}
