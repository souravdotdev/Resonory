import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { action } = vi.hoisted(() => ({
  action: {
    setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
    setBadgeText: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("wxt/browser", () => ({
  browser: { action },
}));

import { clearBadge, showFailureBadge, showSuccessBadge } from "../lib/badge";

describe("badge", () => {
  beforeEach(() => {
    action.setBadgeBackgroundColor.mockClear();
    action.setBadgeText.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a red badge on failure", async () => {
    await showFailureBadge();

    expect(action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: "#dc2626" });
    expect(action.setBadgeText).toHaveBeenCalledWith({ text: "!" });
  });

  it("shows a green badge on success, then clears it", async () => {
    await showSuccessBadge();

    expect(action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: "#16a34a" });
    expect(action.setBadgeText).toHaveBeenCalledWith({ text: "✓" });

    action.setBadgeText.mockClear();
    await vi.runAllTimersAsync();

    expect(action.setBadgeText).toHaveBeenCalledWith({ text: "" });
  });

  it("clears the badge", async () => {
    await clearBadge();

    expect(action.setBadgeText).toHaveBeenCalledWith({ text: "" });
  });
});
