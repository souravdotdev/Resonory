import { describe, expect, it } from "vitest";
import { isJsonLdType } from "./index";

describe("isJsonLdType", () => {
  it.each([
    "application/ld+json",
    "Application/LD+JSON",
    "application/ld+json; charset=utf-8",
    "  application/ld+json  ",
  ])("accepts %j", (type) => {
    expect(isJsonLdType(type)).toBe(true);
  });

  it.each([
    "application/json",
    "text/javascript",
    "module",
    "",
    "application/ld+json+extra",
    null,
    undefined,
  ])("refuses %j", (type) => {
    expect(isJsonLdType(type)).toBe(false);
  });
});
