import { resolveApiBaseUrl } from "./apiBaseUrl";

// The API's base URL the extension calls, from `WXT_API_URL` (see
// `.env.example`). WXT loads it from `.env`, `.env.development` (`pnpm dev`)
// or `.env.production` (`pnpm build`) and inlines it at build time, so changing
// it means restarting `pnpm dev` or rebuilding. It must be read as this literal
// `import.meta.env.WXT_API_URL` expression for that inlining to happen.
export const API_BASE_URL = resolveApiBaseUrl(import.meta.env.WXT_API_URL);
