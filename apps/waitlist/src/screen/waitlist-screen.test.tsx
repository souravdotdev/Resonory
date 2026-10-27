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
});
