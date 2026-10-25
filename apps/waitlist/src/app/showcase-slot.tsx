/**
 * SHOWCASE SLOT: the space beside the hero copy reserved for the feature
 * showcase. For now it is an empty, decorative panel that holds the layout.
 * Ticket #98 replaces this component with the rotating illustration; the page
 * only renders `<ShowcaseSlot />`, so swapping it touches nothing else.
 */
export function ShowcaseSlot() {
  return (
    <div
      aria-hidden="true"
      data-slot="showcase"
      className="aspect-4/3 w-full rounded-3xl border border-border bg-card"
    />
  );
}
