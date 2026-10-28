import { brandColors } from "@/brand/colors";
import type { EmailMessage } from "./email-sender";

const SUBJECT = "You're on the Resonory waitlist";
const HEADLINE = "You're on the List!";
/** The message is two sentences, the second on its own line. */
const BODY_LINES = [
  "Thanks for joining Resonory.",
  "You'll be among the first to use it: we'll email you once more, when early access opens.",
] as const;
const SIGNATURE_NAME = "Sourav Sanjay";
const SIGNATURE_ROLE = "Founder, Resonory";
/** Shown by mail apps beside the subject in the inbox list; hidden in the message. */
const PREHEADER = "You'll be among the first to use Resonory.";

/**
 * The logo lockup the email shows, served from the app's public folder. It is
 * the email's only external reference: no links, no tracking.
 */
export const EMAIL_LOGO_URL = "https://resonory.com/brand/email-logo.png";

/*
 * The page's look, in what mail apps can render: tables and inline styles, the
 * page's colours, and Geist first in the font stack (Gmail and Outlook don't
 * load web fonts, so they fall back to the system sans). The muted text is the
 * page's 66% off-white worked out on the card's colour, since mail apps ignore
 * alpha in some places.
 */
const SANS = "Geist,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "'Geist Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
const MUTED = "#afafad";
const LINE = "#3a3a38";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * The Welcome email for a new Waitlist Entry, in the waitlist page's dark look:
 * the logo, a card on the page's ground, plain words, all centred, with the
 * heading and the founder's name in the brand orange. No links and no tracking.
 * The address only says who it is sent to; it never appears in the message, so
 * there is nothing to escape in the HTML.
 */
export function buildWelcomeEmail(recipient: string): EmailMessage {
  const text = [HEADLINE, "", ...BODY_LINES, "", SIGNATURE_NAME, SIGNATURE_ROLE, ""].join("\n");

  const html = [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="color-scheme" content="dark light">',
    '<meta name="supported-color-schemes" content="dark light">',
    `<title>${escapeHtml(SUBJECT)}</title>`,
    "</head>",
    `<body style="margin:0;padding:0;background:${brandColors.bg};">`,
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${brandColors.bg};">${escapeHtml(PREHEADER)}</div>`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${brandColors.bg}" style="background:${brandColors.bg};">`,
    '<tr><td align="center" style="padding:32px 16px;">',
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${brandColors.card}" style="max-width:520px;background:${brandColors.card};border:1px solid ${LINE};border-radius:14px;">`,
    '<tr><td align="center" style="padding:32px 28px;text-align:center;">',
    `<img src="${EMAIL_LOGO_URL}" width="152" height="29" alt="Resonory" style="display:block;margin:0 auto;border:0;outline:none;height:29px;width:152px;">`,
    `<p style="margin:28px 0 0;text-align:center;font-family:${SANS};font-size:24px;line-height:1.2;font-weight:600;letter-spacing:-0.02em;color:${brandColors.accent};">${escapeHtml(HEADLINE)}</p>`,
    `<p style="margin:12px 0 0;text-align:center;font-family:${SANS};font-size:15px;line-height:1.6;color:${MUTED};">${BODY_LINES.map(escapeHtml).join("<br>")}</p>`,
    `<p style="margin:28px 0 0;text-align:center;font-family:${SANS};font-size:15px;line-height:1.4;font-weight:600;color:${brandColors.accent};">${escapeHtml(SIGNATURE_NAME)}</p>`,
    `<p style="margin:2px 0 0;text-align:center;font-family:${MONO};font-size:12px;line-height:1.4;color:${MUTED};">${escapeHtml(SIGNATURE_ROLE)}</p>`,
    "</td></tr>",
    "</table>",
    "</td></tr>",
    "</table>",
    "</body>",
    "</html>",
  ].join("\n");

  return { to: recipient, subject: SUBJECT, html, text };
}
