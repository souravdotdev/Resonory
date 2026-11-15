import { describe, expect, it, vi } from "vitest";
import type { TagSuggestionRequest } from "@/domain/providers/ITagSuggester";
import {
  type ChatClient,
  OpenAiCompatibleTagSuggester,
} from "@/infrastructure/ai/OpenAiCompatibleTagSuggester";

const REQUEST: TagSuggestionRequest = {
  title: "How Postgres row locks work",
  description: "A tour of FOR UPDATE and its weaker siblings.",
  sourceUrl: "https://example.com/postgres-locks",
  type: "article",
  text: "Row-level locks in Postgres come in four strengths.",
  tagNames: ["postgres", "cooking"],
};

// A chat client answering every completion with this message content.
function clientAnswering(content: string | null) {
  const create = vi.fn(async (_body: unknown) => ({ choices: [{ message: { content } }] }));
  return { client: { chat: { completions: { create } } } satisfies ChatClient, create };
}

const suggesterFor = (client: ChatClient) =>
  new OpenAiCompatibleTagSuggester(client, "openai/gpt-oss-20b");

// The one request body sent, and its messages' text joined, for asserting on.
function sent(create: ReturnType<typeof clientAnswering>["create"]) {
  const body = create.mock.calls[0]![0] as {
    model: string;
    response_format: unknown;
    messages: { role: string; content: string }[];
  };
  return { body, prompt: body.messages.map((message) => message.content).join("\n") };
}

describe("OpenAiCompatibleTagSuggester", () => {
  it("asks the configured model for a JSON object", async () => {
    const { client, create } = clientAnswering('{"tags":[]}');

    await suggesterFor(client).suggestTags(REQUEST);

    const { body, prompt } = sent(create);
    expect(body.model).toBe("openai/gpt-oss-20b");
    expect(body.response_format).toEqual({ type: "json_object" });
    // JSON mode needs the prompt itself to ask for JSON.
    expect(prompt).toContain("JSON");
  });

  it("sends the Item's excerpt and the User's Tag names", async () => {
    const { client, create } = clientAnswering('{"tags":[]}');

    await suggesterFor(client).suggestTags(REQUEST);

    const { body } = sent(create);
    const item = JSON.parse(body.messages.at(-1)!.content);
    expect(item).toEqual({
      title: "How Postgres row locks work",
      description: "A tour of FOR UPDATE and its weaker siblings.",
      sourceUrl: "https://example.com/postgres-locks",
      itemType: "article",
      text: "Row-level locks in Postgres come in four strengths.",
      existingTags: ["postgres", "cooking"],
    });
  });

  it("answers the names the model gave, as it wrote them", async () => {
    const { client } = clientAnswering('{"tags":["Postgres","row locks"]}');

    await expect(suggesterFor(client).suggestTags(REQUEST)).resolves.toEqual([
      "Postgres",
      "row locks",
    ]);
  });

  it("takes an empty list as an answer", async () => {
    const { client } = clientAnswering('{"tags":[]}');

    await expect(suggesterFor(client).suggestTags(REQUEST)).resolves.toEqual([]);
  });

  it.each([
    ["isn't JSON", "postgres, row-locks"],
    ["has no tags list", '{"labels":["postgres"]}'],
    ["lists something other than names", '{"tags":[1,2]}'],
    ["is empty", null],
  ])("throws, so the job is retried, when the answer %s", async (_case, content) => {
    const { client } = clientAnswering(content);

    await expect(suggesterFor(client).suggestTags(REQUEST)).rejects.toThrow(
      "AI tagging's model answered",
    );
  });

  it("lets a failed call through, so the job is retried", async () => {
    const create = vi.fn(async () => {
      throw new Error("429 Rate limit reached");
    });

    await expect(
      suggesterFor({ chat: { completions: { create } } }).suggestTags(REQUEST),
    ).rejects.toThrow("429 Rate limit reached");
  });
});
