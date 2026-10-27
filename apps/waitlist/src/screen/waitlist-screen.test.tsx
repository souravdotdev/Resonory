import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { WaitlistStore } from "@/waitlist/store";
import { WaitlistScreen } from "./waitlist-screen";

class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function stubMatchMedia(reducedMotion: boolean) {
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: reducedMotion && query === "(prefers-reduced-motion: reduce)",
        media: query,
        addEventListener() {},
        removeEventListener() {},
      }) as unknown as MediaQueryList,
  );
}

/** An in-memory Waitlist store holding `count` Waitlist Entries. */
function fakeStore(count: number): WaitlistStore {
  return {
    async join() {},
    async count() {
      return count;
    },
  };
}

async function renderScreen(store = fakeStore(0)) {
  render(await WaitlistScreen({ store }));
}

const LAYOUT_PROPERTIES = [
  "offsetParent",
  "offsetLeft",
  "offsetTop",
  "offsetWidth",
  "offsetHeight",
];

/**
 * jsdom does no layout, so the card wall would never lay itself out. This
 * gives every element a box: the wall a 1440×900 screen, the parts it keeps
 * clear of small boxes in its top left corner.
 */
function layOutAsDesktop() {
  const saved = LAYOUT_PROPERTIES.map(
    (name) => [name, Object.getOwnPropertyDescriptor(HTMLElement.prototype, name)!] as const,
  );
  const size = (element: HTMLElement, wall: number, other: number) =>
    element.hasAttribute("data-card-wall") ? wall : other;
  Object.defineProperties(HTMLElement.prototype, {
    offsetParent: {
      configurable: true,
      get(this: HTMLElement) {
        return this.parentElement;
      },
    },
    offsetLeft: { configurable: true, get: () => 0 },
    offsetTop: { configurable: true, get: () => 0 },
    offsetWidth: {
      configurable: true,
      get(this: HTMLElement) {
        return size(this, 1440, 100);
      },
    },
    offsetHeight: {
      configurable: true,
      get(this: HTMLElement) {
        return size(this, 900, 40);
      },
    },
  });
  return () => {
    for (const [name, descriptor] of saved) {
      Object.defineProperty(HTMLElement.prototype, name, descriptor);
    }
  };
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", StubResizeObserver);
  stubMatchMedia(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("waitlist screen", () => {
  it("leads with the headline, its two highlighted verbs, and the personal sub line", async () => {
    await renderScreen();

    const headline = screen.getByRole("heading", {
      level: 1,
      name: "You saved it. Resonory brings it back.",
    });
    expect(
      within(headline)
        .getAllByRole("emphasis")
        .map((word) => word.textContent),
    ).toEqual(["saved", "brings"]);
    expect(
      screen.getByText(
        "You saved it because it mattered to you. Resonory makes sure you see it again, right when you’re looking for it.",
      ),
    ).toBeTruthy();
  });

  it("offers the signup form inside the main content", async () => {
    await renderScreen();

    const main = screen.getByRole("main");
    expect(main.id).toBe("main");
    expect(within(main).getByLabelText("Email")).toBeTruthy();
    expect(within(main).getByRole("button", { name: "Join the waitlist" })).toBeTruthy();
  });

  it("promises early access under the form while fewer than 100 are waiting", async () => {
    await renderScreen(fakeStore(99));

    expect(screen.getByText("Early access and a founding member price.")).toBeTruthy();
  });

  it("shows how many people are waiting from 100 up", async () => {
    await renderScreen(fakeStore(100));

    expect(screen.getByText("100 people are waiting · founding member price")).toBeTruthy();
  });

  it("moves focus to the email field from the nav's join button", async () => {
    const user = userEvent.setup();
    await renderScreen();

    const nav = screen.getByRole("navigation", { name: "Main" });
    const join = within(nav).getByRole("link", { name: "Join the waitlist" });
    const email = screen.getByLabelText("Email");
    expect(join.getAttribute("href")).toBe(`#${email.id}`);

    await user.click(join);

    expect(document.activeElement).toBe(email);
  });

  it("links to the privacy policy from the footer", async () => {
    await renderScreen();

    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByRole("link", { name: "Privacy" }).getAttribute("href")).toBe(
      "/privacy",
    );
    expect(within(footer).getByText(/^© \d{4} Resonory$/)).toBeTruthy();
  });

  it("describes the search demo in words and shows its finished search", async () => {
    await renderScreen();

    const demo = screen.getByRole("img", { name: /agile retrospective ideas/ });
    expect(demo.getAttribute("aria-label")).toBe(
      "A browser search for agile retrospective ideas. A notice says you saved something like this: “Five retro formats your team won’t dread”, X post, saved 3 months ago.",
    );
  });

  it("shows the notification for the first example's match", async () => {
    await renderScreen();

    const demo = screen.getByRole("img", { name: /agile retrospective ideas/ });
    expect(within(demo).getByText("You saved something like this")).toBeTruthy();
    expect(within(demo).getByText("“Five retro formats your team won’t dread”")).toBeTruthy();
    expect(within(demo).getByText("X post · saved 3 months ago")).toBeTruthy();
  });

  describe("over the wall of saved cards", () => {
    let restoreLayout: () => void;

    beforeEach(() => {
      restoreLayout = layOutAsDesktop();
    });

    afterEach(() => {
      restoreLayout();
    });

    it("keeps the wall out of the accessibility tree", async () => {
      await renderScreen();

      const wallCards = screen.getAllByText("How we cut our deploy time in half");
      for (const card of wallCards) {
        expect(card.closest('[aria-hidden="true"]')).not.toBeNull();
        expect(card.closest("[inert]")).not.toBeNull();
      }
    });

    it("never moves keyboard focus onto the wall", async () => {
      const user = userEvent.setup();
      await renderScreen();
      const wall = screen
        .getAllByText("How we cut our deploy time in half")[0]!
        .closest("[inert]")!;

      const reached = new Set<Element>();
      for (
        let i = 0;
        i < 20 && document.activeElement && !reached.has(document.activeElement);
        i++
      ) {
        if (document.activeElement !== document.body) reached.add(document.activeElement);
        await user.tab();
      }

      expect(reached.size).toBeGreaterThan(0);
      for (const element of reached) expect(wall.contains(element)).toBe(false);
      expect(wall.querySelectorAll("a, button, input, select, textarea, [tabindex]")).toHaveLength(
        0,
      );
    });

    it("lights the demo's match on the wall", async () => {
      await renderScreen();

      const lit = screen
        .getAllByText("Five retro formats your team won’t dread")
        .map((title) => title.closest("[data-lit]"))
        .filter((card) => card !== null);
      expect(lit).toHaveLength(1);
      expect(lit[0]!.closest('[aria-hidden="true"]')).not.toBeNull();
    });
  });
});
