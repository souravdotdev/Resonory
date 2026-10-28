import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "./not-found";

describe("not found page", () => {
  it("says the page is missing and links back to the main page", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "We could not find that page",
    );
    expect(screen.getByRole("link", { name: "Back to the main page" }).getAttribute("href")).toBe(
      "/",
    );
    expect(screen.getByRole("main").id).toBe("main");
  });
});
