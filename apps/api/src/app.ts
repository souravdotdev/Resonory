import type { Container } from "inversify";
import Fastify, { type FastifyServerOptions } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { TOKENS } from "@/di/tokens";
import type { Env } from "@/env";
import { registerErrorMiddleware } from "@/interface/middleware/error.middleware";
import { authRoutes } from "@/interface/routes/auth.routes";
import { itemsRoutes } from "@/interface/routes/items.routes";
import { meRoutes } from "@/interface/routes/me.routes";
import type { RateLimitRedis } from "@/rate-limit-store";

/**
 * Builds the API from a container: plugins, the error envelope and routes.
 * Production passes `createContainer()`; tests pass a container with fakes.
 */
export async function buildApp(container: Container, options: FastifyServerOptions = {}) {
  const env = container.get<Env>(TOKENS.Env);
  // `TRUST_PROXY` decides whose IP `request.ip` is, and so what every per-IP rate limit counts.
  const app = Fastify({
    trustProxy: env.TRUST_PROXY ?? false,
    ...options,
  }).withTypeProvider<ZodTypeProvider>();

  // Routes validate their request and serialize their response through the shared zod
  // schemas they declare (undeclared response fields are stripped).
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  // Before plugins and routes, so they inherit the error and not-found handlers.
  registerErrorMiddleware(app);

  // An allow-list, not a wildcard (ADR 0003): the web app's origin and the
  // extension's `chrome-extension://` origin, nothing else. Credentials, so the
  // browser sends and accepts the Session cookie (or an API key header) cross-origin.
  const allowedOrigins = [env.WEB_ORIGIN, env.EXTENSION_ORIGIN];
  await app.register(cors, { origin: allowedOrigins, credentials: true });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    // Required: production binds the shared Redis; only a container that explicitly
    // binds IN_MEMORY_RATE_LIMITS (tests) counts in memory.
    redis: container.get<RateLimitRedis>(TOKENS.RateLimitRedis) ?? undefined,
    nameSpace: "resonory-api-rate-limit-",
  });

  // Before every other route, and stricter than the global limit above.
  await app.register(authRoutes, { container });

  app.get("/health", async () => ({ status: "ok" }));
  // Protected routes: each one runs authMiddleware before its handler.
  await app.register(meRoutes, { container });
  await app.register(itemsRoutes, { container });

  return app;
}
