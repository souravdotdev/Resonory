import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PrivacyPage from "./page";

describe("privacy page", () => {
  it("tells visitors where to ask to be removed", () => {
    render(<PrivacyPage />);

    expect(screen.getByRole("link", { name: "hello@resonory.com" }).getAttribute("href")).toBe(
      "mailto:hello@resonory.com?subject=Remove%20me%20from%20the%20waitlist",
    );
  });

  it("links back to the main page", () => {
    render(<PrivacyPage />);

    expect(screen.getByRole("link", { name: "Back to the main page" }).getAttribute("href")).toBe(
      "/",
    );
    expect(screen.getByRole("main").id).toBe("main");
  });

  it("promises one email when early access opens, and that joining is free", () => {
    render(<PrivacyPage />);

    expect(
      screen.getByText(
        "We email you once, when early access opens, and nothing else. Joining the waitlist is free.",
      ),
    ).toBeTruthy();
    expect(screen.getByText(/so we can tell you when early access opens/)).toBeTruthy();
  });
});
