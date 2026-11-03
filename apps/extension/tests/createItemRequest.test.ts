import { describe, expect, it } from "vitest";
import { buildCreateItemRequest } from "../lib/createItemRequest";

describe("buildCreateItemRequest", () => {
  it("assembles a POST request carrying the captured url and html as JSON", () => {
    const request = buildCreateItemRequest(
      { url: "https://example.com/article", html: "<html><body>hi</body></html>" },
      "key_abc123",
    );

    expect(request.method).toBe("POST");
    expect(JSON.parse(request.body)).toEqual({
      url: "https://example.com/article",
      html: "<html><body>hi</body></html>",
    });
  });

  it("sends the stored API key as the x-api-key header", () => {
    const request = buildCreateItemRequest(
      { url: "https://example.com", html: "<html></html>" },
      "key_abc123",
    );

    expect(request.headers["x-api-key"]).toBe("key_abc123");
  });

  it("declares a JSON content type", () => {
    const request = buildCreateItemRequest(
      { url: "https://example.com", html: "<html></html>" },
      "key_abc123",
    );

    expect(request.headers["Content-Type"]).toBe("application/json");
  });

  it("is a pure function: independent of any chrome.* API, deterministic for the same input", () => {
    const capture = { url: "https://example.com", html: "<html></html>" };

    const first = buildCreateItemRequest(capture, "key_abc123");
    const second = buildCreateItemRequest(capture, "key_abc123");

    expect(first).toEqual(second);
  });
});
