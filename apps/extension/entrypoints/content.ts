import { defineContentScript } from "wxt/utils/define-content-script";

// Minimal stub: matched broadly against every http/https page to prove the
// content-script entrypoint loads and runs on a real page. Real capture
// logic lands in a later ticket.
export default defineContentScript({
  matches: ["*://*/*"],
  main() {
    console.log("Resonory content script loaded");
  },
});
