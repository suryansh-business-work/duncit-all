import { z } from 'zod';
import { FOOD_FEEDBACK_LIMITS } from '@duncit/utils';

import type { Translate } from './translate';

/**
 * What a guest says about a served food order — one schema for mWeb's order
 * page and the native one. The limits are the server's own
 * (FOOD_FEEDBACK_LIMITS), so the form refuses exactly what the server would.
 * A rating is the only thing asked for; the words and the photos are optional.
 */
export function makeFoodFeedbackSchema(t: Translate) {
  const { ratingMin, ratingMax, commentMax, imagesMax } = FOOD_FEEDBACK_LIMITS;
  return z.object({
    rating: z
      .number()
      .int(t('mweb.venueFood.feedback.ratingRequired'))
      .min(ratingMin, t('mweb.venueFood.feedback.ratingRequired'))
      .max(ratingMax, t('mweb.venueFood.feedback.ratingRequired')),
    comment: z
      .string()
      .trim()
      .max(commentMax, t('mweb.venueFood.feedback.commentTooLong', { vars: { max: String(commentMax) } })),
    images: z
      .array(z.string().trim().min(1))
      .max(imagesMax, t('mweb.venueFood.feedback.tooManyPhotos', { vars: { max: String(imagesMax) } })),
  });
}

export type FoodFeedbackValues = z.infer<ReturnType<typeof makeFoodFeedbackSchema>>;

/** Nothing chosen yet: 0 stars is below the minimum, so the blank form cannot be submitted. */
export const foodFeedbackDefaults: FoodFeedbackValues = { rating: 0, comment: '', images: [] };
