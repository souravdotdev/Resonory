import { inject, injectable } from "inversify";
import { toListTagsOutput, type ListTagsOutput } from "@/application/dto/tags/ListTagsOutput";
import { TOKENS } from "@/di/tokens";
import type { ITagRepository } from "@/domain/repositories/ITagRepository";

export interface ListTagsInput {
  userId: string;
}

/**
 * Lists every one of the User's Tags for a Tag picker, most recently used first:
 * by the latest time each was put on any Item, by the AI or the User, and a Tag
 * on no Items by when it was created. Filtering as the User types is the client's job.
 */
@injectable()
export class ListTagsUseCase {
  constructor(@inject(TOKENS.TagRepository) private readonly tags: ITagRepository) {}

  async execute(input: ListTagsInput): Promise<ListTagsOutput> {
    return toListTagsOutput(await this.tags.listForUser(input.userId));
  }
}
