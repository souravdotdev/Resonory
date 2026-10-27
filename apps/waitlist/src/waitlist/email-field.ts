/**
 * The signup form's email field id, so links and buttons elsewhere (the navs)
 * can point at it and move focus to it. The page has one signup form.
 *
 * Kept outside `waitlist-form.tsx`, a client module, so server components can
 * read the value itself.
 */
export const EMAIL_FIELD_ID = "email";

/** Where every "Join the waitlist" link points: the email field on the main page. */
export const JOIN_WAITLIST_HREF = `/#${EMAIL_FIELD_ID}`;
