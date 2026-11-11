import { describe, expect, it } from "vitest";
import { DEFAULT_API_BASE_URL, resolveApiBaseUrl } from "../lib/apiBaseUrl";

describe("resolveApiBaseUrl", () => {
  it("falls back to the local API when unset", () => {
    expect(resolveApiBaseUrl(undefined)).toBe(DEFAULT_API_BASE_URL);
  });

  it("falls back to the local API when empty", () => {
    expect(resolveApiBaseUrl("")).toBe(DEFAULT_API_BASE_URL);
    expect(resolveApiBaseUrl("   ")).toBe(DEFAULT_API_BASE_URL);
  });

  it("uses a configured http(s) URL as-is", () => {
    expect(resolveApiBaseUrl("https://api.resonory.com")).toBe("https://api.resonory.com");
    expect(resolveApiBaseUrl("http://localhost:4100")).toBe("http://localhost:4100");
  });

  it("drops a trailing slash", () => {
    expect(resolveApiBaseUrl("https://api.resonory.com/")).toBe("https://api.resonory.com");
  });

  it("rejects a value that isn't a URL", () => {
    expect(() => resolveApiBaseUrl("api.resonory.com")).toThrow(/WXT_API_URL/);
  });

  it("rejects a non-http(s) URL", () => {
    expect(() => resolveApiBaseUrl("ftp://api.resonory.com")).toThrow(/WXT_API_URL/);
  });
});
