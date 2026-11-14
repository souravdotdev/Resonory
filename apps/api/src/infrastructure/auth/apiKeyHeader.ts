/**
 * The one header an API key (the extension's) is sent in. createAuth configures
 * Better Auth's api-key plugin to read keys from it, and sessionOnlyAuthMiddleware
 * refuses requests carrying it, so the two can't drift apart. Lowercase, as
 * Fastify and `Headers` give header names.
 */
export const API_KEY_HEADER = "x-api-key";
