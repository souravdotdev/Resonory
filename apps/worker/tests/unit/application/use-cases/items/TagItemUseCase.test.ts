import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { TagItemUseCase } from "@/application/use-cases/items/TagItemUseCase";
import type { ItemRef, TaggableItem } from "@/domain/entities/Item";
import type { ITagSuggester, TagSuggestionRequest } from "@/domain/providers/ITagSuggester";
import type { IItemRepository } from "@/domain/repositories/IItemRepository";
import type { ITagRepository } from "@/domain/repositories/ITagRepository";

const USER_ID = "7f1c2b9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
const OTHER_USER_ID = "0b6a1f7e-2c3d-4e5f-8a9b-1c2d3e4f5a6b";
const ITEM_ID = "00000000-0000-4000-8000-000000000001";
const REF = { itemId: ITEM_ID, userId: USER_ID };

const ARTICLE: TaggableItem = {
  title: "How Postgres row locks work",
  description: "A tour of FOR UPDATE and its weaker siblings.",
  sourceUrl: "https://example.com/postgres-locks",
  type: "article",
  text: "Row-level locks in Postgres come in four strengths.",
};

// An Item repository holding one Ready Item for USER_ID, as AI tagging reads it.
function itemsHolding(item: TaggableItem | null = ARTICLE) {
  const owns = ({ itemId, userId }: ItemRef) => itemId === ITEM_ID && userId === USER_ID;
  return {
    findById: vi.fn(async () => null),
    findTaggable: vi.fn(async (ref: ItemRef) => (item && owns(ref) ? { ...item } : null)),
    markReady: vi.fn(async () => {}),
    markFailed: vi.fn(async () => {}),
  } satisfies IItemRepository;
}

// The User's Tags and this Item's Rejected tags, held as plain names; applyAsAi
// puts every name it's given on the Item (the real limits and locks are the
// adapter's, covered by its integration tests). `unused` are Tags only the AI
// used that are on no Items: listNames leaves them out, as applyAsAi deletes
// them before counting the User's Tags.
function tagsHolding({
  names = [] as string[],
  unused = [] as string[],
  rejected = [] as string[],
  itemGone = false,
} = {}) {
  const applied: string[] = [];
  const left = new Set(unused);
  const repository = {
    listNames: vi.fn(async (userId: string) =>
      userId === USER_ID ? names.filter((name) => !left.has(name)) : [],
    ),
    listRejectedNames: vi.fn(async (_ref: ItemRef) => [...rejected]),
    applyAsAi: vi.fn(async (_ref: ItemRef, toApply: string[]) => {
      if (itemGone) return null;
      applied.push(...toApply);
      return toApply;
    }),
  } satisfies ITagRepository;
  return { repository, applied };
}

// A model answering every request with these names.
function suggesterAnswering(...names: string[]) {
  return {
    suggestTags: vi.fn(async (_request: TagSuggestionRequest) => names),
  } satisfies ITagSuggester;
}

describe("TagItemUseCase", () => {
  it("skips tagging, asking no model and reading nothing, when no model is configured", async () => {
    const items = itemsHolding();
    const { repository: tags } = tagsHolding();

    const result = await new TagItemUseCase(items, tags).execute(REF);

    expect(result).toEqual({ outcome: "unconfigured" });
    expect(items.findTaggable).not.toHaveBeenCalled();
    expect(tags.applyAsAi).not.toHaveBeenCalled();
  });

  it("tells the model the Item's excerpt and every one of the User's Tag names, and nothing else", async () => {
    const suggester = suggesterAnswering();
    const { repository: tags } = tagsHolding({ names: ["postgres", "databases", "cooking"] });

    await new TagItemUseCase(itemsHolding(), tags, suggester).execute(REF);

    expect(suggester.suggestTags).toHaveBeenCalledExactlyOnceWith({
      title: "How Postgres row locks work",
      description: "A tour of FOR UPDATE and its weaker siblings.",
      sourceUrl: "https://example.com/postgres-locks",
      type: "article",
      text: "Row-level locks in Postgres come in four strengths.",
      tagNames: ["postgres", "databases", "cooking"],
    });
  });

  it("still asks the model about an Item without Text, from the rest", async () => {
    const suggester = suggesterAnswering("photography");
    const { repository: tags, applied } = tagsHolding();
    const image: TaggableItem = { ...ARTICLE, type: "image", text: null };

    const result = await new TagItemUseCase(itemsHolding(image), tags, suggester).execute(REF);

    expect(suggester.suggestTags).toHaveBeenCalledWith(expect.objectContaining({ text: null }));
    expect(result).toEqual({
      outcome: "tagged",
      suggested: ["photography"],
      applied: ["photography"],
    });
    expect(applied).toEqual(["photography"]);
  });

  it("puts the model's Tags on the Item, reusing the User's names as the model gave them", async () => {
    const { repository: tags, applied } = tagsHolding({ names: ["postgres"] });

    await new TagItemUseCase(
      itemsHolding(),
      tags,
      suggesterAnswering("postgres", "row-locks"),
    ).execute(REF);

    expect(tags.applyAsAi).toHaveBeenCalledExactlyOnceWith(REF, ["postgres", "row-locks"]);
    expect(applied).toEqual(["postgres", "row-locks"]);
  });

  it("puts each name through the Tag name rule, dropping the ones it refuses", async () => {
    const { repository: tags, applied } = tagsHolding();

    const result = await new TagItemUseCase(
      itemsHolding(),
      tags,
      suggesterAnswering("Row Locks", "!!!", "", "x".repeat(51), "  Postgres  "),
    ).execute(REF);

    expect(applied).toEqual(["row-locks", "postgres"]);
    // The raw answer is kept for the log, as the model wrote it.
    expect(result).toMatchObject({
      suggested: ["Row Locks", "!!!", "", "x".repeat(51), "  Postgres  "],
    });
  });

  it("puts a name on once, however many spellings of it the model gives", async () => {
    const { repository: tags, applied } = tagsHolding();

    await new TagItemUseCase(
      itemsHolding(),
      tags,
      suggesterAnswering("Machine Learning", "machine-learning", "machine_learning", "postgres"),
    ).execute(REF);

    expect(applied).toEqual(["machine-learning", "postgres"]);
  });

  it("keeps at most the model's first 3 Tags", async () => {
    const { repository: tags, applied } = tagsHolding();

    await new TagItemUseCase(
      itemsHolding(),
      tags,
      suggesterAnswering("postgres", "locks", "databases", "concurrency", "sql"),
    ).execute(REF);

    expect(applied).toEqual(["postgres", "locks", "databases"]);
  });

  it("counts only valid, distinct names towards the 3", async () => {
    const { repository: tags, applied } = tagsHolding();

    await new TagItemUseCase(
      itemsHolding(),
      tags,
      suggesterAnswering("Postgres", "???", "postgres", "locks", "databases", "sql"),
    ).execute(REF);

    expect(applied).toEqual(["postgres", "locks", "databases"]);
  });

  it("takes zero Tags as an answer, putting nothing on the Item", async () => {
    const { repository: tags, applied } = tagsHolding();

    const result = await new TagItemUseCase(itemsHolding(), tags, suggesterAnswering()).execute(
      REF,
    );

    expect(result).toEqual({ outcome: "tagged", suggested: [], applied: [] });
    expect(applied).toEqual([]);
  });

  it("never puts back a name the User took off the Item, however the model spells it", async () => {
    const { repository: tags, applied } = tagsHolding({
      names: ["postgres"],
      rejected: ["postgres", "databases"],
    });

    await new TagItemUseCase(
      itemsHolding(),
      tags,
      suggesterAnswering("Postgres", "databases", "locks"),
    ).execute(REF);

    expect(tags.listRejectedNames).toHaveBeenCalledWith(REF);
    expect(applied).toEqual(["locks"]);
  });

  it("doesn't let a rejected name take one of the 3 places", async () => {
    const { repository: tags, applied } = tagsHolding({ rejected: ["postgres"] });

    await new TagItemUseCase(
      itemsHolding(),
      tags,
      suggesterAnswering("postgres", "locks", "databases", "sql"),
    ).execute(REF);

    expect(applied).toEqual(["locks", "databases", "sql"]);
  });

  it("only reuses the User's Tags once they have 1,000", async () => {
    const names = Array.from({ length: 1000 }, (_, index) => `tag-${index}`);
    const { repository: tags, applied } = tagsHolding({ names });

    await new TagItemUseCase(
      itemsHolding(),
      tags,
      suggesterAnswering("brand-new", "tag-7", "another-new", "tag-999"),
    ).execute(REF);

    expect(applied).toEqual(["tag-7", "tag-999"]);
  });

  it("tells the model the Source URL without its query string, fragment or credentials", async () => {
    const items = itemsHolding({
      ...ARTICLE,
      sourceUrl: "https://user:pass@example.com/doc?token=abc123#top",
    });
    const { repository: tags } = tagsHolding();
    const suggester = suggesterAnswering("postgres");

    await new TagItemUseCase(items, tags, suggester).execute(REF);

    expect(suggester.suggestTags.mock.calls[0]![0].sourceUrl).toBe("https://example.com/doc");
  });

  it("tells the model only the User's 200 most recently used Tag names", async () => {
    // listNames answers most recently used first.
    const names = Array.from({ length: 300 }, (_, index) => `tag-${index}`);
    const { repository: tags } = tagsHolding({ names });
    const suggester = suggesterAnswering("postgres");

    await new TagItemUseCase(itemsHolding(), tags, suggester).execute(REF);

    expect(suggester.suggestTags.mock.calls[0]![0].tagNames).toEqual(names.slice(0, 200));
  });

  it("still reuses one of the User's Tags the model wasn't told about", async () => {
    const names = Array.from({ length: 300 }, (_, index) => `tag-${index}`);
    const { repository: tags, applied } = tagsHolding({ names });

    await new TagItemUseCase(itemsHolding(), tags, suggesterAnswering("tag-250")).execute(REF);

    expect(applied).toEqual(["tag-250"]);
  });

  it("creates Tags as usual for a User one short of 1,000", async () => {
    const names = Array.from({ length: 999 }, (_, index) => `tag-${index}`);
    const { repository: tags, applied } = tagsHolding({ names });

    await new TagItemUseCase(
      itemsHolding(),
      tags,
      suggesterAnswering("brand-new", "tag-7"),
    ).execute(REF);

    expect(applied).toEqual(["brand-new", "tag-7"]);
  });

  it("doesn't count a Tag only the AI used that's on no Items towards the 1,000", async () => {
    const names = Array.from({ length: 1000 }, (_, index) => `tag-${index}`);
    const { repository: tags, applied } = tagsHolding({ names, unused: ["tag-0"] });

    await new TagItemUseCase(
      itemsHolding(),
      tags,
      suggesterAnswering("brand-new", "tag-7"),
    ).execute(REF);

    expect(applied).toEqual(["brand-new", "tag-7"]);
  });

  it.each([
    ["deleted", { itemId: ITEM_ID, userId: USER_ID }, null],
    ["another User's", { itemId: ITEM_ID, userId: OTHER_USER_ID }, ARTICLE],
  ] as const)("skips an Item that's %s quietly, asking no model", async (_, ref, item) => {
    const suggester = suggesterAnswering("postgres");
    const { repository: tags } = tagsHolding();

    const result = await new TagItemUseCase(itemsHolding(item), tags, suggester).execute(ref);

    expect(result).toEqual({ outcome: "missing" });
    expect(suggester.suggestTags).not.toHaveBeenCalled();
    expect(tags.applyAsAi).not.toHaveBeenCalled();
  });

  it("skips quietly an Item deleted while the model was answering", async () => {
    const { repository: tags } = tagsHolding({ itemGone: true });

    const result = await new TagItemUseCase(
      itemsHolding(),
      tags,
      suggesterAnswering("postgres"),
    ).execute(REF);

    expect(result).toEqual({ outcome: "missing" });
  });

  it("lets a model error through, so the job is retried, putting nothing on the Item", async () => {
    const { repository: tags } = tagsHolding();
    const suggester = {
      suggestTags: vi.fn(async (): Promise<string[]> => {
        throw new Error("429 Rate limit reached");
      }),
    } satisfies ITagSuggester;

    await expect(new TagItemUseCase(itemsHolding(), tags, suggester).execute(REF)).rejects.toThrow(
      "429 Rate limit reached",
    );
    expect(tags.applyAsAi).not.toHaveBeenCalled();
  });
});
