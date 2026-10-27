# Deploying the waitlist page

`apps/waitlist` is the one-screen waitlist at `resonory.com`: the page and its `POST /api/waitlist` endpoint, deployed together as one Vercel project on the free tier. It is independent of `apps/web`, `apps/api` and `apps/worker`; it only uses `@resonory/db`'s schema and the shared config packages. This is the checklist for setting it up on Vercel by hand.

## Before you start

- A Supabase project, with its connection strings to hand (Project Settings → Database → Connection string). You need two of them:
  - the **transaction pooler** URI, port `6543`, for the app;
  - the **session pooler** URI (port `5432` on the pooler host) or the **direct connection** URI (port `5432`), for running migrations.
- The `resonory.com` domain, and access to its registrar's DNS settings.

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

### 3. Run the Waitlist Entry migration against Supabase first

Create the `waitlist_entries` table before the first deploy takes Waitlist Entries. From the monorepo root:

```sh
DATABASE_URL='<session pooler or direct connection URI>' pnpm --filter @resonory/db db:migrate
```

This runs `drizzle-kit migrate`, which applies every pending migration in `packages/db/migrations`, including `0007_create_waitlist_entries`. Point it at the **session pooler** or the **direct connection** (port `5432`), not the transaction pooler the app uses: migrations need a session that lasts the whole run. See [Database](./database.md) for the migration workflow.

### 4. Add `resonory.com` and `www.resonory.com`

Under **Settings → Domains**, add `resonory.com` and `www.resonory.com`. Pick one as the primary and let Vercel redirect the other to it. Vercel then shows the DNS records each domain needs (typically an `A` record for the apex and a `CNAME` for `www`); add exactly those at the registrar and wait for Vercel to mark both domains valid. Vercel issues the HTTPS certificates itself.

The page's metadata uses `https://resonory.com` as its base URL, so the Open Graph image and canonical links point there whichever domain is primary.

### 5. Enable Web Analytics

Under the project's **Analytics** tab, click **Enable**. The app already renders Vercel's `<Analytics />` component, so data starts arriving after the next deploy. It sets no cookies, so the page needs no cookie banner.

## After the first deploy

- Paste `https://resonory.com` into a link preview tool (such as [opengraph.xyz](https://www.opengraph.xyz)) and check the title, description and image.
- Share the link in a chat or on X and check the preview appears.
- Open `https://resonory.com/does-not-exist` and check it shows the branded 404 with a link back to the main page.
- Open `https://resonory.com` on a laptop and on a phone and check it fills the screen without scrolling, the search demo types and lights a card on the wall, and the notification names that card.
- Join with a real address and check the success card shows and the row appears in Supabase's `waitlist_entries` table.

## What ships with the app

- **Security headers**, set in `apps/waitlist/next.config.ts` and matching `apps/web`'s: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` denying camera, microphone and geolocation, and HSTS (see [Security](./security.md#appsweb-response-headers)).
- **Metadata**: title, description, Open Graph and Twitter tags, `robots.txt` and `sitemap.xml`; the page is indexable.
- **Generated images**: the Open Graph image (`src/app/opengraph-image.tsx`) and the favicon and home screen icon (`src/app/icon.tsx`, `src/app/apple-icon.tsx`), drawn from the logo paths in `src/brand/logo.ts` (copied from `assets/logo/` without their background). The nav and footer draw the same paths through `src/app/logo.tsx`.
