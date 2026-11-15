import {
  itemStatusEnum,
  itemTypeEnum,
  tagNameRule,
  tagOriginEnum,
  tagSourceEnum,
} from "@resonory/db/schema";
import { describe, expect, it } from "vitest";
import { ITEM_STATUSES, ITEM_TYPES } from "@/domain/entities/Item";
import { TAG_ORIGINS, TAG_SOURCES } from "@/domain/entities/Tag";
import { MAX_TAG_NAME_LENGTH, TAG_NAME_PATTERN } from "@/domain/rules/tagName";

// The database package owns the tables, so it can't import these rules from the
// Items domain; this keeps the two copies from drifting apart.
describe("Items tables agree with the Items domain", () => {
  it("stores exactly the domain's Item types, Item statuses, Tag sources and Tag origins", () => {
    expect(itemTypeEnum.enumValues).toEqual(ITEM_TYPES);
    expect(itemStatusEnum.enumValues).toEqual(ITEM_STATUSES);
    expect(tagSourceEnum.enumValues).toEqual(TAG_SOURCES);
    expect(tagOriginEnum.enumValues).toEqual(TAG_ORIGINS);
  });

  it("checks Tag names with the domain's slug pattern and length limit", () => {
    expect(tagNameRule).toEqual({ pattern: TAG_NAME_PATTERN, maxLength: MAX_TAG_NAME_LENGTH });
  });
});
