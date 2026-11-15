import { tagNameRule } from "@resonory/db/schema";
import { beforeAll, describe, expect, it } from "vitest";
import { MAX_TAGS_PER_ITEM, MAX_TAGS_PER_USER } from "@/domain/rules/tagLimits";
import { MAX_TAG_NAME_LENGTH, slugifyTagName, TAG_NAME_PATTERN } from "@/domain/rules/tagName";

type TagNameModule = typeof import("@/domain/rules/tagName");
type TagLimitsModule = typeof import("@/domain/rules/tagLimits");

// The API's own rules, read straight from its source at run time: both files
// are plain constants and functions with no imports, so nothing else of the API
// comes along. A computed URL, so tsc doesn't pull the API into the worker's build.
const apiRule = (file: string) =>
  new URL(`../../../../api/src/domain/rules/${file}`, import.meta.url).href;
let api: TagNameModule;
let apiLimits: TagLimitsModule;

beforeAll(async () => {
  api = (await import(/* @vite-ignore */ apiRule("tagName.ts"))) as TagNameModule;
  apiLimits = (await import(/* @vite-ignore */ apiRule("tagLimits.ts"))) as TagLimitsModule;
});

// The worker can't import the API, so AI tagging keeps its own copy of the Tag
// name rule and the Tag limits; this keeps the copies from drifting.
describe("the worker's Tag rules agree with the API's and the database's", () => {
  it("uses the tags table's slug pattern and length limit", () => {
    expect(TAG_NAME_PATTERN).toBe(tagNameRule.pattern);
    expect(MAX_TAG_NAME_LENGTH).toBe(tagNameRule.maxLength);
    expect(TAG_NAME_PATTERN).toBe(api.TAG_NAME_PATTERN);
    expect(MAX_TAG_NAME_LENGTH).toBe(api.MAX_TAG_NAME_LENGTH);
  });

  it.each([
    "Machine Learning",
    "machine_learning",
    "  --C++ & C#--  ",
    "Node.js",
    "über-cool",
    "!!!",
    "",
    "a".repeat(50),
    "a".repeat(51),
  ])("slugifies %j exactly as the API does", (name) => {
    expect(slugifyTagName(name)).toEqual(api.slugifyTagName(name));
  });

  it("caps an Item's and a User's Tags as the API does", () => {
    expect(MAX_TAGS_PER_ITEM).toBe(apiLimits.MAX_TAGS_PER_ITEM);
    expect(MAX_TAGS_PER_USER).toBe(apiLimits.MAX_TAGS_PER_USER);
  });
});
