// Minimal stub: renders placeholder markup to prove the popup entrypoint
// loads and runs when the toolbar icon is clicked. Real token-setup/save
// UI lands in a later ticket.
//
// `renderPopup` takes a duck-typed root (anything with an assignable
// `innerHTML`) rather than reaching for `document` directly, so this pure
// rendering logic can be unit-tested without a DOM environment.
export function renderPopup(root: { innerHTML: string }): void {
  root.innerHTML = `
    <main>
      <h1>Resonory</h1>
      <p>Placeholder popup content.</p>
    </main>
  `;
}

// Guarded so this module can be imported under Vitest's node environment
// (no `document` global) to unit-test `renderPopup` in isolation.
if (typeof document !== "undefined") {
  const root = document.getElementById("app");
  if (root) {
    renderPopup(root);
  }
}
