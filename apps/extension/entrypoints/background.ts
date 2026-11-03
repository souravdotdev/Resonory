import { defineBackground } from "wxt/utils/define-background";

// Minimal stub: proves the background service-worker entrypoint and the
// monorepo's dev/build toolchain work end-to-end. Real capture/API/token
// logic lands in a later ticket.
export default defineBackground(() => {
  console.log("Resonory background service worker loaded");
});
