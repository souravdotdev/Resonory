import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import { nodeConfig } from "@resonory/vitest-config/node";

// The Postgres-backed tests in tests/integration/, run by `pnpm test:integration`.
// Each file creates and drops its own database (tests/integration/support/testDatabase.ts).
export default mergeConfig(
  nodeConfig,
  defineConfig({
    // The `@/` alias from tsconfig.json.
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    test: {
      include: ["tests/integration/**/*.test.ts"],
      // Creating a database and running every migration takes longer than a unit test's 5s.
      hookTimeout: 60_000,
      testTimeout: 30_000,
    },
  }),
);
