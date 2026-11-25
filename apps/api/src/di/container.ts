import "reflect-metadata";
import { StorageClient } from "@supabase/storage-js";
import { Container } from "inversify";
import { createLogger, type Logger } from "@resonory/logger";
import { AdmitSignInUseCase } from "@/application/use-cases/auth/AdmitSignInUseCase";
import { GetMeUseCase } from "@/application/use-cases/auth/GetMeUseCase";
import { ResolveSignedInUserUseCase } from "@/application/use-cases/auth/ResolveSignedInUserUseCase";
import { DeleteItemUseCase } from "@/application/use-cases/items/DeleteItemUseCase";
import { ListItemsUseCase } from "@/application/use-cases/items/ListItemsUseCase";
import { SaveItemUseCase } from "@/application/use-cases/items/SaveItemUseCase";
import { TagItemUseCase } from "@/application/use-cases/tags/TagItemUseCase";
import { ListTagsUseCase } from "@/application/use-cases/tags/ListTagsUseCase";
import { UntagItemUseCase } from "@/application/use-cases/tags/UntagItemUseCase";
import { TOKENS } from "@/di/tokens";
import type { IQueueProvider } from "@/domain/providers/IQueueProvider";
import type { ISessionProvider } from "@/domain/providers/ISessionProvider";
import type { IThumbnailStore } from "@/domain/providers/IThumbnailStore";
import type { IThumbnailUrlProvider } from "@/domain/providers/IThumbnailUrlProvider";
import type { IItemRepository } from "@/domain/repositories/IItemRepository";
import type { ITagRepository } from "@/domain/repositories/ITagRepository";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
import { env, type Env } from "@/env";
import {
  BetterAuthSessionProvider,
  type SessionApi,
} from "@/infrastructure/auth/BetterAuthSessionProvider";
import { createAuth, type Auth } from "@/infrastructure/auth/createAuth";
import type { Database } from "@/infrastructure/database/Database";
import { db } from "@/infrastructure/database/db";
import {
  BullMqQueueProvider,
  type ItemProcessingQueue,
} from "@/infrastructure/queue/BullMqQueueProvider";
import { itemProcessingQueue } from "@/infrastructure/queue/itemProcessingQueue";
import { DrizzleItemRepository } from "@/infrastructure/repositories/DrizzleItemRepository";
import { DrizzleTagRepository } from "@/infrastructure/repositories/DrizzleTagRepository";
import { DrizzleUserRepository } from "@/infrastructure/repositories/DrizzleUserRepository";
import { SupabaseThumbnailStore } from "@/infrastructure/storage/SupabaseThumbnailStore";
import { SupabaseThumbnailUrlProvider } from "@/infrastructure/storage/SupabaseThumbnailUrlProvider";
import type { ThumbnailStorage } from "@/infrastructure/storage/thumbnailStorage";
import { ItemsController } from "@/interface/controllers/ItemsController";
import { MeController } from "@/interface/controllers/MeController";
import { TagsController } from "@/interface/controllers/TagsController";
import { rateLimitRedis } from "@/rate-limit-redis";
import type { RateLimitRedis } from "@/rate-limit-store";

/**
 * The production container: the only place concrete classes are built and
 * bound to their tokens. Infrastructure and controllers are singletons for the
 * process's life; use cases are built fresh each time they're asked for.
 */
export function createContainer(): Container {
  const container = new Container({ defaultScope: "Singleton" });

  container.bind<Env>(TOKENS.Env).toConstantValue(env);
  container.bind<Database>(TOKENS.Database).toConstantValue(db);
  container.bind<Logger>(TOKENS.Logger).toConstantValue(createLogger({ name: "api" }));
  container.bind<RateLimitRedis>(TOKENS.RateLimitRedis).toConstantValue(rateLimitRedis);
  container
    .bind<ItemProcessingQueue>(TOKENS.ItemProcessingQueue)
    .toConstantValue(itemProcessingQueue);

  container
    .bind<IUserRepository>(TOKENS.UserRepository)
    .to(DrizzleUserRepository)
    .inSingletonScope();
  container
    .bind<IItemRepository>(TOKENS.ItemRepository)
    .to(DrizzleItemRepository)
    .inSingletonScope();
  container.bind<ITagRepository>(TOKENS.TagRepository).to(DrizzleTagRepository).inSingletonScope();
  container.bind<IQueueProvider>(TOKENS.QueueProvider).to(BullMqQueueProvider).inSingletonScope();

  // Without Supabase Storage there's no Thumbnail provider, and Item cards carry no Thumbnail;
  // nor a Thumbnail store, and Item deletion skips the Thumbnail object.
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabaseUrl = env.SUPABASE_URL;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
    container
      .bind<ThumbnailStorage>(TOKENS.ThumbnailStorage)
      .toDynamicValue(
        // Just the Storage part of the Supabase client (supabase-js also starts Realtime, which
        // needs a native WebSocket). It sends the service role key the way supabase-js does.
        () =>
          new StorageClient(new URL("storage/v1", supabaseUrl).href, {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          }) satisfies ThumbnailStorage,
      )
      .inSingletonScope();
    container
      .bind<IThumbnailUrlProvider>(TOKENS.ThumbnailUrlProvider)
      .to(SupabaseThumbnailUrlProvider)
      .inSingletonScope();
    container
      .bind<IThumbnailStore>(TOKENS.ThumbnailStore)
      .to(SupabaseThumbnailStore)
      .inSingletonScope();
  }

  container
    .bind<Auth>(TOKENS.Auth)
    .toDynamicValue((context) => {
      const config = context.get<Env>(TOKENS.Env);
      return createAuth(
        context.get<Database>(TOKENS.Database),
        {
          secret: config.BETTER_AUTH_SECRET,
          baseURL: config.BETTER_AUTH_URL,
          webOrigin: config.WEB_ORIGIN,
          google: { clientId: config.GOOGLE_CLIENT_ID, clientSecret: config.GOOGLE_CLIENT_SECRET },
          cookieDomain: config.AUTH_COOKIE_DOMAIN,
        },
        {
          // The session-create hook runs a fresh AdmitSignInUseCase for every sign-in.
          admitSignIn: {
            execute: (input) =>
              container.get<AdmitSignInUseCase>(TOKENS.AdmitSignInUseCase).execute(input),
          },
        },
        // BetterAuthSessionProvider takes this instance for its get-session.
      ) satisfies { api: SessionApi };
    })
    .inSingletonScope();

  container
    .bind<ISessionProvider>(TOKENS.SessionProvider)
    .to(BetterAuthSessionProvider)
    .inSingletonScope();

  container.bind(TOKENS.AdmitSignInUseCase).to(AdmitSignInUseCase).inTransientScope();
  container
    .bind(TOKENS.ResolveSignedInUserUseCase)
    .to(ResolveSignedInUserUseCase)
    .inTransientScope();
  container.bind(TOKENS.GetMeUseCase).to(GetMeUseCase).inTransientScope();
  container.bind(TOKENS.SaveItemUseCase).to(SaveItemUseCase).inTransientScope();
  container.bind(TOKENS.ListItemsUseCase).to(ListItemsUseCase).inTransientScope();
  container.bind(TOKENS.DeleteItemUseCase).to(DeleteItemUseCase).inTransientScope();
  container.bind(TOKENS.TagItemUseCase).to(TagItemUseCase).inTransientScope();
  container.bind(TOKENS.UntagItemUseCase).to(UntagItemUseCase).inTransientScope();
  container.bind(TOKENS.ListTagsUseCase).to(ListTagsUseCase).inTransientScope();

  container.bind(TOKENS.MeController).to(MeController).inSingletonScope();
  container.bind(TOKENS.ItemsController).to(ItemsController).inSingletonScope();
  container.bind(TOKENS.TagsController).to(TagsController).inSingletonScope();

  return container;
}
