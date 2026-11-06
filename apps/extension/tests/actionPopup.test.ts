import { describe, expect, it } from "vitest";
import { popupPathFor } from "../lib/actionPopup";

describe("popupPathFor", () => {
  it("returns the popup url when no API key is stored, so a click opens it to collect one", () => {
    expect(popupPathFor(false, "chrome-extension://abc/popup.html")).toBe(
      "chrome-extension://abc/popup.html",
    );
  });

  it("returns an empty string once an API key is stored, so a click instead fires onClicked", () => {
    expect(popupPathFor(true, "chrome-extension://abc/popup.html")).toBe("");
  });
});
