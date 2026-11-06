import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "Resonory",
    description: "Save pages to Resonory.",
    // No broad host_permissions (e.g. `*://*/*`) and no always-on content
    // script (#146): `activeTab` grants the background script momentary
    // access to the current tab only on a toolbar-icon click; `scripting`
    // lets it inject the capture function into that tab via
    // `chrome.scripting.executeScript`; `storage` lets the popup persist the
    // API key in `chrome.storage.local`. The create-Item API call itself
    // needs no host permission — it's a plain cross-origin `fetch` from the
    // background service worker, allowed by the API's CORS allow-list
    // (EXTENSION_ORIGIN), not by a Chrome-granted host permission.
    permissions: ["activeTab", "scripting", "storage"],
    // One source image, reused at every size Chrome asks for (16/32/48/128px
    // toolbar, puzzle-piece menu, and Web Store listing) — no auto-icons
    // module installed, so WXT won't generate these on its own from a plain
    // `public/` file.
    icons: {
      16: "/resonory-logo.png",
      32: "/resonory-logo.png",
      48: "/resonory-logo.png",
      128: "/resonory-logo.png",
    },
  },
});
