// The worker's copy of the Items domain's Tag limits (apps/api's domain/rules/tagLimits.ts);
// tests/unit/domain/tag-rules-agreement.test.ts keeps the two in step.

/** The most Tags one Item can have, whoever put them there: the AI's count too. */
export const MAX_TAGS_PER_ITEM = 20;

/** The most Tags one User can have. Both limits are abuse guards that real use won't reach. */
export const MAX_TAGS_PER_USER = 1000;
