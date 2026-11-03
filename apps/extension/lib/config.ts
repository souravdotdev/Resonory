// The API's base URL the extension calls.
//
// TODO: apps/web resolves this from `NEXT_PUBLIC_API_URL` (a Next.js build-time
// env var); WXT has no equivalent wired up yet for this project (it would be
// `import.meta.env.WXT_API_URL` backed by a `.env`/`.env.production` pair, the
// closest analog to apps/web's pattern). Hardcoded to the local API's default
// port as the simplest choice for this spec's scope — a real multi-environment
// extension build needs that mechanism before this ships to anyone but a local
// dev loading the unpacked build.
export const API_BASE_URL = "http://localhost:4000";
