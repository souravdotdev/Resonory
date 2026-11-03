import { config } from "@resonory/eslint-config/base";
import globals from "globals";

// Extension code runs in the browser (content script/popup) and in an MV3
// service worker (background) — never under Node — so the shared base
// config's Node globals are swapped for browser + service-worker ones.
export default [
  ...config,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
      },
    },
  },
  {
    ignores: [".output/**", ".wxt/**"],
  },
];
