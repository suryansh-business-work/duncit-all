/**
 * What a guest says about a served food order — one schema for mWeb's order
 * page and the native one. Its limits are the server's (FOOD_FEEDBACK_LIMITS),
 * so every boundary here is the one the server would refuse at. Assertions on
 * messages are on KEYS: a literal sentence reappearing here is the regression.
 */
import { describe, expect, it } from 'vitest';
import { FOOD_FEEDBACK_LIMITS } from '@duncit/utils';

import { foodFeedbackDefaults, makeFoodFeedbackSchema } from '../src/schemas';

/** Records the interpolation too, so a limit message can be checked for the limit it states. */
const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;
const schema = makeFoodFeedbackSchema(t);

const VALID = { rating: 4, comment: 'Great pasta', images: ['https://ik.example/a.jpg'] };

const issuesFor = (values: Partial<typeof VALID>) => {
  const result = schema.safeParse({ ...VALID, ...values });
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}=${issue.message}`);
};

describe('makeFoodFeedbackSchema', () => {
  it('accepts a rating with words and photos, and trims the words', () => {
    expect(schema.parse({ ...VALID, comment: '  Great pasta  ' })).toEqual(VALID);
  });

  it('needs nothing but the rating', () => {
    expect(schema.parse({ rating: 5, comment: '', images: [] })).toEqual({ rating: 5, comment: '', images: [] });
  });

  it.each([FOOD_FEEDBACK_LIMITS.ratingMin, FOOD_FEEDBACK_LIMITS.ratingMax])('accepts %i stars, an end of the scale', (rating) => {
    expect(issuesFor({ rating })).toEqual([]);
  });

  it.each([0, FOOD_FEEDBACK_LIMITS.ratingMax + 1, 3.5])('refuses %d as a rating', (rating) => {
    expect(issuesFor({ rating })).toEqual(['rating=mweb.venueFood.feedback.ratingRequired']);
  });

  it('holds the words to the server limit, counted after trimming', () => {
    const atLimit = 'a'.repeat(FOOD_FEEDBACK_LIMITS.commentMax);
    expect(issuesFor({ comment: ` ${atLimit} ` })).toEqual([]);
    expect(issuesFor({ comment: `${atLimit}a` })).toEqual([
      `comment=mweb.venueFood.feedback.commentTooLong:{"max":"${FOOD_FEEDBACK_LIMITS.commentMax}"}`,
    ]);
  });

  it('holds the photos to the server limit', () => {
    const photos = (count: number) => Array.from({ length: count }, (_unused, index) => `https://ik.example/${index}.jpg`);
    expect(issuesFor({ images: photos(FOOD_FEEDBACK_LIMITS.imagesMax) })).toEqual([]);
    expect(issuesFor({ images: photos(FOOD_FEEDBACK_LIMITS.imagesMax + 1) })).toEqual([
      `images=mweb.venueFood.feedback.tooManyPhotos:{"max":"${FOOD_FEEDBACK_LIMITS.imagesMax}"}`,
    ]);
  });

  it('refuses a photo with no address', () => {
    expect(schema.safeParse({ ...VALID, images: ['   '] }).success).toBe(false);
  });

  it('starts with no rating, which cannot be submitted', () => {
    expect(foodFeedbackDefaults).toEqual({ rating: 0, comment: '', images: [] });
    expect(schema.safeParse(foodFeedbackDefaults).success).toBe(false);
  });
});
