import { describe, expect, it } from "vitest";
import { renderPopup } from "../entrypoints/popup/main";

describe("popup entrypoint", () => {
  it("renders placeholder markup into the given root", () => {
    const root = { innerHTML: "" };

    renderPopup(root);

    expect(root.innerHTML).toContain("Resonory");
  });
});
