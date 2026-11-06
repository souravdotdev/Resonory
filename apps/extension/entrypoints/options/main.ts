import { renderApiKeyForm, wireApiKeyForm } from "../../lib/apiKeyForm";

// Guarded so this module can be imported under Vitest's node environment (no
// `document` global). Reachable via the extension's standard Chrome-provided
// Options entry (the icon's right-click menu, or its Details screen) — no
// custom permission needed. Shows the same form the popup shows on first
// run, pre-filled with whatever key is already stored, for a User who
// already has one and wants to replace it (issue #154). The popup's own
// first-run behavior and toolbar-click save are untouched by this.
if (typeof document !== "undefined") {
  const root = document.getElementById("app");
  if (root) {
    renderApiKeyForm(root);
    wireApiKeyForm();
  }
}
