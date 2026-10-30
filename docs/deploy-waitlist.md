# Deploying the waitlist page

`apps/waitlist` is the one-screen waitlist at `resonory.com`: the page and its `POST /api/waitlist` endpoint, deployed together as one Vercel project on the free tier. It is independent of `apps/web`, `apps/api` and `apps/worker`; it only uses `@resonory/db`'s schema and the shared config packages. It also emails each new signup a Welcome email through AutoSend. This is the checklist for setting it up on Vercel by hand.

## Before you start

- A Supabase project, with its connection strings to hand (Project Settings → Database → Connection string). You need two of them:
  - the **transaction pooler** URI, port `6543`, for the app;
  - the **session pooler** URI (port `5432` on the pooler host) or the **direct connection** URI (port `5432`), for running migrations.
- The `resonory.com` domain, and access to its registrar's DNS settings.
- An [AutoSend](https://autosend.com) account, for the Welcome email.

Never run these steps with the main checkout's `.env` files unless you mean to: they point at production.

## Checklist

### 1. Import the repo with `apps/waitlist` as the Root Directory

In Vercel, **Add New → Project**, import `souravdotdev/Resonory`, and set **Root Directory** to `apps/waitlist`. Vercel detects Next.js and the pnpm workspace:

- Leave **Include files outside the root directory in the Build Step** on (Vercel turns it on by default for monorepos). The app imports `@resonory/db` and the shared configs from outside its folder.
- Leave the install and build commands at their defaults. Vercel runs `pnpm install` from the monorepo root (it finds `pnpm-lock.yaml` and `pnpm-workspace.yaml` there) and then `next build` in `apps/waitlist`.

The build needs no database: the connection opens on first use, so `next build` passes with `DATABASE_URL` unset.

### 2. Set `DATABASE_URL` for Production and Preview

Under **Settings → Environment Variables**, add `DATABASE_URL` with the Supabase **transaction pooler** URI (port `6543`), for both **Production** and **Preview**. It is server only: never put it behind a `NEXT_PUBLIC_` prefix.

The app runs as short lived serverless functions, so it uses the transaction pooler, with prepared statements off and a pool of one (see [Environment Variables](./environment-variables.md#appswaitlistenv)).

### 3. Run the Waitlist Entry migrations against Supabase first

Create the `waitlist_entries` table, with its `welcome_emailed_at` column, before the first deploy takes Waitlist Entries. Run this before the code that uses the column is live: the signup inserts into the table, and recording a sent email updates that column. From the monorepo root:

```sh
DATABASE_URL='<session pooler or direct connection URI>' pnpm --filter @resonory/db db:migrate
```

This runs `drizzle-kit migrate`, which applies every pending migration in `packages/db/migrations`, including `0007_create_waitlist_entries` and `0008_add_welcome_emailed_at_to_waitlist_entries`. Point it at the **session pooler** or the **direct connection** (port `5432`), not the transaction pooler the app uses: migrations need a session that lasts the whole run. See [Database](./database.md) for the migration workflow.

### 4. Add `resonory.com` and `www.resonory.com`

Under **Settings → Domains**, add `resonory.com` and `www.resonory.com`. Pick one as the primary and let Vercel redirect the other to it. Vercel then shows the DNS records each domain needs (typically an `A` record for the apex and a `CNAME` for `www`); add exactly those at the registrar and wait for Vercel to mark both domains valid. Vercel issues the HTTPS certificates itself.

The page's metadata uses `https://resonory.com` as its base URL, so the Open Graph image and canonical links point there whichever domain is primary.

### 5. Enable Web Analytics

Under the project's **Analytics** tab, click **Enable**. The app already renders Vercel's `<Analytics />` component, so data starts arriving after the next deploy. It sets no cookies, so the page needs no cookie banner.

### 6. Verify `resonory.com` in AutoSend

In AutoSend, open **Settings > Domains**, add `resonory.com` (no `http://`) and pick a region. AutoSend then shows the DNS records to add at the registrar: an ownership record, the DKIM records, a Mail-From (SPF) record and a DMARC record. Add all of them exactly as shown, then wait until AutoSend marks the domain verified. Propagation is usually 5 to 30 minutes, and rarely up to 48 hours. The Welcome email is sent from `hello@resonory.com`, so nothing sends until this is done (see [AutoSend notes](#autosend-notes)).

### 7. Create an API key

In AutoSend, create an API key for sending. Copy it straight into Vercel in the next step. Never paste it into a chat, an issue, a file in the repo or a `.env` file that could be committed.

### 8. Optionally create an unsubscribe group

In AutoSend, create an unsubscribe group and copy its id. With it set, each email carries the group, so AutoSend manages unsubscribing. Skip this if you don't want it: the email is sent without a group.

### 9. Set the AutoSend variables for Production only

Under **Settings > Environment Variables**, add `AUTOSEND_API_KEY` and, if you made a group, `AUTOSEND_UNSUBSCRIBE_GROUP_ID`, with only **Production** ticked. Leave **Preview** and **Development** unticked: an environment with the key set sends real mail, and without it the app only logs a skipped send, so previews email no one. Mark the key as sensitive. Redeploy so the running build picks the values up. See [Environment Variables](./environment-variables.md#appswaitlistenv).

### 10. Before a launch, ask AutoSend to raise the daily limit

A new sending domain starts at 300 emails a day (see [AutoSend notes](#autosend-notes)). If you expect more signups than that in a day, ask AutoSend support to raise the limit before you share the link, rather than after the extra signups already went without an email.

## After the first deploy

- Paste `https://resonory.com` into a link preview tool (such as [opengraph.xyz](https://www.opengraph.xyz)) and check the title, description and image.
- Share the link in a chat or on X and check the preview appears.
- Open `https://resonory.com/does-not-exist` and check it shows the branded 404 with a link back to the main page.
- Open `https://resonory.com` on a laptop and on a phone and check it fills the screen without scrolling, the search demo types and lights a card on the wall, and the Cue names that card.
- Join with a real address and check the success card shows and the row appears in Supabase's `waitlist_entries` table.
- **Send check (do this last, by hand, with your own address).** Needs steps 6 to 9 done and the domain verified. Join at `https://resonory.com` with an address you own and can read, then check:
  - the email arrives from `hello@resonory.com` with the subject "You're on the Resonory waitlist";
  - it lands in the inbox, not spam (check the spam folder if it isn't there);
  - it reads as specified: "You're on the List!" / "Thanks for joining Resonory." then, on its own line, "You'll be among the first to use it: we'll email you once more, when early access opens." / "Sourav Sanjay, Founder, Resonory", in the page's dark look with the Resonory logo at the top and no links. The logo is served from `https://resonory.com/brand/email-logo.png`, so deploy the site before the first real send, or the logo shows as its alt text "Resonory";
  - the row's `welcome_emailed_at` in Supabase is set (it stays null if the send failed or no key is set; check the function logs for "Could not send the welcome email");
  - joining again with the same address sends nothing new.

  Record the result on [issue #118](https://github.com/souravdotdev/Resonory/issues/118). Then delete the test row.

## What ships with the app

- **Security headers**, set in `apps/waitlist/next.config.ts` and matching `apps/web`'s: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` denying camera, microphone and geolocation, and HSTS (see [Security](./security.md#appsweb-response-headers)).
- **Metadata**: title, description, Open Graph and Twitter tags, `robots.txt` and `sitemap.xml`; the page is indexable.
- **Generated images**: the Open Graph image (`src/app/opengraph-image.tsx`) and the favicon and home screen icon (`src/app/icon.tsx`, `src/app/apple-icon.tsx`), drawn from the logo paths in `src/brand/logo.ts` (copied from `assets/Resonory-Logo/` without their background). The nav and footer draw the same paths through `src/brand/logo-svg.tsx`.

## AutoSend notes

What AutoSend's own docs say about sending the Welcome email (read on 2026-10-28; confirm against the pages before relying on a number):

- **Domain verification** ([Add a sending domain](https://docs.autosend.com/domain.md)). The docs say a sending domain must be verified before you can send through AutoSend. Add it under Settings > Domains (no `http://`), pick a region, then add the DNS records AutoSend shows: an ownership record, DKIM records, a Mail-From (SPF) record and a DMARC record. All DKIM and SPF records must be present. Propagation is typically 5 to 30 minutes, sometimes up to 2 hours, rarely up to 48 hours. The docs don't say what an API send from an unverified domain returns.
- **Daily limit** ([Daily sending limit](https://docs.autosend.com/wiki/daily-sending-limit.md)). A new sending domain starts at 300 emails a day, shared by transactional and marketing mail. It rises automatically as the domain builds a healthy record (most domains reach full capacity within 2 to 4 weeks), or can be raised early by asking AutoSend support. Once it is hit, sending stops for the rest of the day, so a launch day above 300 signups would leave the extra Welcome emails unsent (their `welcome_emailed_at` stays null, so they can be re-sent later). Ask support to raise it before a launch.
- **Rate limit** ([Rate Limit](https://docs.autosend.com/api-reference/rate-limit.md)). 2 requests per second per API key by default, raisable on request. Over it the API answers `429` with a `retryAfter` in seconds, and every response carries `X-RateLimit-*` headers. The app sends one email per new signup and does not retry; a `429` is logged like any other failure.
- **Idempotency** ([Send Email](https://docs.autosend.com/api-reference/mails/send.md) and [Best Practices](https://docs.autosend.com/api-reference/best-practices.md)). Neither page documents an idempotency key or header. Duplicate protection is therefore ours: only a newly created Waitlist Entry is emailed, and `welcome_emailed_at` records the send.
- **Request and response** (Send Email). `POST https://api.autosend.com/v1/mails/send` takes `from`, `to`, `subject`, `html`, `text` and an optional `unsubscribeGroupId`. A queued email answers `{ "success": true, "data": { "emailId": "...", ... } }`. The page documents no error body.
