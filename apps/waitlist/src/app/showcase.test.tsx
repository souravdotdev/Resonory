import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Showcase } from "./showcase";

class StubIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", StubIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function selectedTab() {
  return screen.getByRole("tab", { selected: true });
}

function activePanel() {
  return screen.getByRole("tabpanel");
}

describe("Showcase", () => {
  it("shows the four slides as labelled tabs, starting on the Cue", () => {
    render(<Showcase />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Cue", "Save", "Search", "Digest"]);
    expect(selectedTab().textContent).toBe("Cue");
    expect(activePanel().textContent).toContain(
      "While you search, a small card says you already saved 2 things on this.",
    );
  });

  it("switches to the slide whose tab is clicked", async () => {
    const user = userEvent.setup();
    render(<Showcase />);

    await user.click(screen.getByRole("tab", { name: "Search" }));

    expect(selectedTab().textContent).toBe("Search");
    expect(activePanel().textContent).toContain(
      "Search agile and find the post about coding principles too.",
    );
  });

  it("moves between tabs with the arrow keys, wrapping at the ends", async () => {
    const user = userEvent.setup();
    render(<Showcase />);

    await user.click(screen.getByRole("tab", { name: "Cue" }));
    await user.keyboard("{ArrowRight}");
    expect(selectedTab().textContent).toBe("Save");
    expect(document.activeElement).toBe(selectedTab());
    expect(activePanel().textContent).toContain(
      "Paste any link. Titles, thumbnails and tags appear on their own.",
    );

    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(selectedTab().textContent).toBe("Digest");
    expect(document.activeElement).toBe(selectedTab());

    await user.keyboard("{Home}");
    expect(selectedTab().textContent).toBe("Cue");
    await user.keyboard("{End}");
    expect(selectedTab().textContent).toBe("Digest");
  });

  it("gives each slide a text description for screen readers", async () => {
    const user = userEvent.setup();
    render(<Showcase />);

    expect(screen.getByRole("img", { name: /search results page/i })).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Digest" }));
    expect(screen.getByRole("img", { name: /weekly email/i })).toBeTruthy();
  });

  describe("rotation", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    function wait(ms: number) {
      act(() => {
        vi.advanceTimersByTime(ms);
      });
    }

    it("advances to the next slide about every 5 seconds, in order, and loops", () => {
      render(<Showcase />);

      wait(4900);
      expect(selectedTab().textContent).toBe("Cue");
      wait(100);
      expect(selectedTab().textContent).toBe("Save");
      wait(5000);
      expect(selectedTab().textContent).toBe("Search");
      wait(5000);
      expect(selectedTab().textContent).toBe("Digest");
      wait(5000);
      expect(selectedTab().textContent).toBe("Cue");
    });

    it("pauses while the showcase is hovered", () => {
      render(<Showcase />);
      const showcase = screen.getByRole("tablist").closest("[data-slot=showcase]")!;

      fireEvent.pointerEnter(showcase);
      wait(12000);
      expect(selectedTab().textContent).toBe("Cue");

      fireEvent.pointerLeave(showcase);
      wait(5000);
      expect(selectedTab().textContent).toBe("Save");
    });

    it("pauses while focus is inside the showcase", () => {
      render(<Showcase />);

      act(() => screen.getByRole("tab", { name: "Save" }).focus());
      fireEvent.click(screen.getByRole("tab", { name: "Save" }));
      wait(12000);
      expect(selectedTab().textContent).toBe("Save");

      act(() => screen.getByRole("tab", { name: "Save" }).blur());
      wait(5000);
      expect(selectedTab().textContent).toBe("Search");
    });

    it("pauses while the showcase is off screen", () => {
      let report: (visible: boolean) => void = () => {};
      vi.stubGlobal(
        "IntersectionObserver",
        class extends StubIntersectionObserver {
          constructor(callback: IntersectionObserverCallback) {
            super();
            report = (visible) =>
              callback(
                [{ isIntersecting: visible } as IntersectionObserverEntry],
                this as unknown as IntersectionObserver,
              );
          }
        },
      );
      render(<Showcase />);

      act(() => report(false));
      wait(12000);
      expect(selectedTab().textContent).toBe("Cue");

      act(() => report(true));
      wait(5000);
      expect(selectedTab().textContent).toBe("Save");
    });

    it("stays on the Cue with reduced motion, changing only when a tab is chosen", () => {
      vi.stubGlobal(
        "matchMedia",
        (query: string) =>
          ({
            matches: query === "(prefers-reduced-motion: reduce)",
            media: query,
            addEventListener() {},
            removeEventListener() {},
          }) as unknown as MediaQueryList,
      );
      render(<Showcase />);

      wait(20000);
      expect(selectedTab().textContent).toBe("Cue");

      fireEvent.click(screen.getByRole("tab", { name: "Digest" }));
      expect(selectedTab().textContent).toBe("Digest");
      wait(20000);
      expect(selectedTab().textContent).toBe("Digest");
    });
  });
});
