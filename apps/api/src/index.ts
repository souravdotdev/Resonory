// Before anything that declares a decorated class.
import "reflect-metadata";
import type { Logger } from "@resonory/logger";
import { buildApp } from "@/app";
import { createContainer } from "@/di/container";
import { TOKENS } from "@/di/tokens";
import type { Env } from "@/env";

const container = createContainer();
// A pre-built instance (not Fastify's own `logger: true`/options default), so Fastify still
// mints a reqId and request-completion log line per request, through the shared logger.
const app = await buildApp(container, {
  loggerInstance: container.get<Logger>(TOKENS.Logger),
});

const { PORT, HOST } = container.get<Env>(TOKENS.Env);

app.listen({ port: PORT, host: HOST }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
