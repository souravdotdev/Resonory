import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import { nodeConfig } from "@resonory/vitest-config/node";

export default mergeConfig(
  nodeConfig,
  defineConfig({
    // The `@/` alias from tsconfig.json.
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    // `pnpm test` needs no database: the Postgres-backed tests in tests/integration/
    // run only through `test:integration` (vitest.integration.config.ts).
    test: { include: ["tests/unit/**/*.test.ts"] },
  }),
);
