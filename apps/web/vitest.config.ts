import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mergeConfig } from "vitest/config";
import { reactConfig } from "@resonory/vitest-config/react";

// Next.js resolves `server-only` to its no-op build (`server-only/empty.js`)
// under its own "react-server" bundler condition; Vitest never sets that
// condition (and setting it globally would also switch React itself to its
// server-components build, breaking every client-component test), so this
// aliases just the one package to the same no-op build directly. The
// package's `exports` map only declares its main entry, not this subpath, so
// it's resolved from the package's own directory rather than as a subpath import.
const serverOnlyEmptyModule = path.join(
  path.dirname(createRequire(import.meta.url).resolve("server-only")),
  "empty.js",
);

export default mergeConfig(reactConfig, {
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": serverOnlyEmptyModule,
    },
  },
});
