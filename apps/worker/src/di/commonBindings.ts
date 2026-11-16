import "reflect-metadata";
import type { Redis } from "ioredis";
import type { Container } from "inversify";
import { redisConnection } from "@resonory/db/redis";
import { createLogger, type Logger } from "@resonory/logger";
import { WORKER_TOKENS } from "@/di/tokens";
import type { IItemRepository } from "@/domain/repositories/IItemRepository";
import type { ITagRepository } from "@/domain/repositories/ITagRepository";
import type { Database } from "@/infrastructure/database/Database";
import { db } from "@/infrastructure/database/db";
import { DrizzleItemRepository } from "@/infrastructure/repositories/DrizzleItemRepository";
import { DrizzleTagRepository } from "@/infrastructure/repositories/DrizzleTagRepository";

/**
 * The bindings both workers' containers share: the logger, the Redis connection,
 * the database and its repositories. Each worker's own container adds what only
 * it uses. Returns the logger, built first so the caller can hand it to its own
 * factories.
 */
export function bindCommon(container: Container, name: string): Logger {
  const logger = createLogger({ name });
  container.bind<Logger>(WORKER_TOKENS.Logger).toConstantValue(logger);

  container.bind<Database>(WORKER_TOKENS.Database).toConstantValue(db);
  container.bind<Redis>(WORKER_TOKENS.RedisConnection).toConstantValue(redisConnection);
  container
    .bind<IItemRepository>(WORKER_TOKENS.ItemRepository)
    .to(DrizzleItemRepository)
    .inSingletonScope();
  container
    .bind<ITagRepository>(WORKER_TOKENS.TagRepository)
    .to(DrizzleTagRepository)
    .inSingletonScope();
  return logger;
}
