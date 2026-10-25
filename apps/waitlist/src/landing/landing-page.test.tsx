import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { WaitlistStore } from "@/waitlist/store";
import { LandingPage } from "./landing-page";

class StubIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
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

async function renderLandingPage(store = fakeStore(0)) {
  render(await LandingPage({ store }));
}

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", StubIntersectionObserver);
  stubMatchMedia(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("landing page", () => {
  it("tells the story in the approved order, between the nav and the footer", async () => {
    await renderLandingPage();

    const inOrder = [
      screen.getByRole("navigation", { name: "Main" }),
      screen.getByRole("region", { name: "You saved it. Resonory brings it back." }),
      screen.getByRole("region", { name: "You saved it for later. Later never came." }),
      screen.getByRole("region", { name: "Three steps, and you only take the first" }),
      screen.getByRole("region", { name: "Four ways a save comes back" }),
      screen.getByRole("region", {
        name: "Your library is private to you. We never sell your saves or show them to anyone.",
      }),
      screen.getByRole("region", { name: "Why I’m building Resonory" }),
      screen.getByRole("region", { name: "Questions, answered" }),
      screen.getByRole("region", { name: "Stop digging for what you saved. Let it find you." }),
      screen.getByRole("contentinfo"),
    ];

    expect(screen.getAllByRole("region")).toHaveLength(8);
    for (const [index, element] of inOrder.slice(1).entries()) {
      const previous = inOrder[index]!;
      expect(previous.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }
  });

  it("links the nav's join link to the final form", async () => {
    await renderLandingPage();

    const nav = screen.getByRole("navigation", { name: "Main" });
    const join = within(nav).getByRole("link", { name: "Join the waitlist" });
    const target = join.getAttribute("href")!.split("#")[1]!;
    expect(document.getElementById(target)).toBe(
      screen.getByRole("region", { name: "Stop digging for what you saved. Let it find you." }),
    );
  });

  describe("the two signup forms", () => {
    const fetchMock = vi.fn<typeof fetch>();
    const confirmation = "You’re on the list. We’ll email you when your spot opens.";

    beforeEach(() => {
      fetchMock.mockReset();
      fetchMock.mockResolvedValue(Response.json({ ok: true }));
      vi.stubGlobal("fetch", fetchMock);
      window.history.replaceState(null, "", "/?utm_source=hn");
    });

    afterEach(() => {
      window.history.replaceState(null, "", "/");
    });

    function hero() {
      return screen.getByRole("region", { name: "You saved it. Resonory brings it back." });
    }

    function finalCta() {
      return screen.getByRole("region", {
        name: "Stop digging for what you saved. Let it find you.",
      });
    }

    async function join(section: HTMLElement, email: string) {
      const user = userEvent.setup();
      await user.type(within(section).getByLabelText("Email"), email);
      await user.click(within(section).getByRole("button", { name: "Join the waitlist" }));
    }

    function sentBodies() {
      return fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
    }

    it("joins from the hero and leaves the final form untouched", async () => {
      await renderLandingPage();

      await join(hero(), "ada@example.com");

      expect(await within(hero()).findByText(confirmation)).toBeTruthy();
      expect(within(finalCta()).queryByText(confirmation)).toBeNull();
      expect(within(finalCta()).getByLabelText("Email")).toBeTruthy();
      expect(sentBodies()).toEqual([{ email: "ada@example.com", source: "hn", company: "" }]);
    });

    it("joins from the final form and leaves the hero form untouched", async () => {
      await renderLandingPage();

      await join(finalCta(), "grace@example.com");

      expect(await within(finalCta()).findByText(confirmation)).toBeTruthy();
      expect(within(hero()).queryByText(confirmation)).toBeNull();
      expect(within(hero()).getByLabelText("Email")).toBeTruthy();
      expect(sentBodies()).toEqual([{ email: "grace@example.com", source: "hn", company: "" }]);
    });

    it("shows the proof line under both forms", async () => {
      await renderLandingPage(fakeStore(1284));

      expect(within(hero()).getByText("1,284 people are waiting")).toBeTruthy();
      expect(within(finalCta()).getByText("1,284 people are waiting")).toBeTruthy();
    });

    it("shows the founding member price line while the list is small", async () => {
      await renderLandingPage(fakeStore(12));

      expect(
        within(hero()).getByText("Founding member price for the first people in"),
      ).toBeTruthy();
      expect(
        within(finalCta()).getByText("Founding member price for the first people in"),
      ).toBeTruthy();
    });
  });

  it("tags Reminder and Cue as Next, and only them", async () => {
    await renderLandingPage();

    const ways = screen.getByRole("region", { name: "Four ways a save comes back" });
    const tile = (name: string) =>
      within(ways).getByRole("heading", { name, level: 3 }).closest("li")!;

    expect(within(tile("Reminder")).getByText("Next")).toBeTruthy();
    expect(within(tile("Cue")).getByText("Next")).toBeTruthy();
    expect(within(tile("Related Items")).queryByText("Next")).toBeNull();
    expect(within(tile("Rediscover digest")).queryByText("Next")).toBeNull();
  });

  it("makes the exact privacy promise and links it to the privacy page", async () => {
    await renderLandingPage();

    const privacy = screen.getByRole("region", {
      name: "Your library is private to you. We never sell your saves or show them to anyone.",
    });
    expect(
      within(privacy).getByRole("link", { name: "Read the privacy policy" }).getAttribute("href"),
    ).toBe("/privacy");
  });

  it("signs the founder note", async () => {
    await renderLandingPage();

    const note = screen.getByRole("region", { name: "Why I’m building Resonory" });
    expect(within(note).getByText("Sourav Sanjay, Founder")).toBeTruthy();
  });

  it("opens and closes each FAQ answer from the keyboard", async () => {
    const user = userEvent.setup();
    await renderLandingPage();

    const faq = screen.getByRole("region", { name: "Questions, answered" });
    const questions = within(faq).getAllByRole("button");
    expect(questions.map((question) => question.textContent)).toEqual([
      "What is Resonory?",
      "What can I save?",
      "When can I use it?",
      "Is it free?",
      "Is my library private?",
      "How is it different from bookmarks?",
    ]);

    for (const question of questions) {
      const answer = document.getElementById(question.getAttribute("aria-controls")!)!;
      expect(question.getAttribute("aria-expanded")).toBe("false");
      expect(answer.hidden).toBe(true);

      act(() => question.focus());
      await user.keyboard("{Enter}");
      expect(question.getAttribute("aria-expanded")).toBe("true");
      expect(answer.hidden).toBe(false);

      await user.keyboard(" ");
      expect(question.getAttribute("aria-expanded")).toBe("false");
      expect(answer.hidden).toBe(true);
    }
  });

  it("describes the hero's picture in text", async () => {
    await renderLandingPage();

    const hero = screen.getByRole("region", { name: "You saved it. Resonory brings it back." });
    expect(within(hero).getByRole("img", { name: /search for agile retrospective/i })).toBeTruthy();
  });

  it("answers when with the waitlist email", async () => {
    const user = userEvent.setup();
    await renderLandingPage();

    await user.click(screen.getByRole("button", { name: "When can I use it?" }));

    expect(screen.getByText(/we’ll email you when your spot opens/i)).toBeTruthy();
  });
});
