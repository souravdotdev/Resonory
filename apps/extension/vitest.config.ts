import { defineConfig, mergeConfig } from "vitest/config";
import { nodeConfig } from "@resonory/vitest-config/node";

export default mergeConfig(nodeConfig, defineConfig({}));
