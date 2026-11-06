import { renderApiKeyForm, wireApiKeyForm } from "../../lib/apiKeyForm";

// Guarded so this module can be imported under Vitest's node environment (no
// `document` global). Once a key is stored, the background script clears the
// toolbar popup (`lib/actionPopup.ts`) so this form is only ever seen before
// one exists — changing an existing key happens via the options page instead
// (issue #154).
if (typeof document !== "undefined") {
  const root = document.getElementById("app");
  if (root) {
    renderApiKeyForm(root);
    wireApiKeyForm();
  }
}
