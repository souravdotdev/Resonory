import { describe, expect, it } from "vitest";
import { TAG_ITEM_JOB, TagItemJobSchema } from "./index";

const job = {
  itemId: "3b241101-e2bb-4255-8caf-4136c566a962",
  userId: "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f",
};

describe("the AI tagging job", () => {
  it("is named tag-item", () => {
    expect(TAG_ITEM_JOB).toBe("tag-item");
  });
});

describe("TagItemJobSchema", () => {
  it("accepts the Item's id and its User's id", () => {
    expect(TagItemJobSchema.parse(job)).toEqual(job);
  });

  it.each(["itemId", "userId"] as const)("refuses a %s that isn't a UUID", (field) => {
    expect(TagItemJobSchema.safeParse({ ...job, [field]: "item-1" }).success).toBe(false);
  });

  it.each(["itemId", "userId"] as const)("refuses a job without %s", (field) => {
    const { [field]: _missing, ...rest } = job;

    expect(TagItemJobSchema.safeParse(rest).success).toBe(false);
  });

  it("drops fields the payload doesn't declare, captured content included", () => {
    expect(TagItemJobSchema.parse({ ...job, html: "<html></html>" })).toEqual(job);
  });
});
