import { defineConfig, mergeConfig } from "vitest/config";
import { nodeConfig } from "@resonory/vitest-config/node";
import { reactConfig } from "@resonory/vitest-config/react";

// Two projects: the components run under the jsdom + React preset, and the
// token-contract test (which only reads DESIGN.md from disk) under plain Node.
export default defineConfig({
  test: {
    projects: [
      mergeConfig(reactConfig, { test: { name: "components", include: ["src/**/*.test.tsx"] } }),
      mergeConfig(nodeConfig, { test: { name: "tokens", include: ["src/**/*.test.ts"] } }),
    ],
  },
});
