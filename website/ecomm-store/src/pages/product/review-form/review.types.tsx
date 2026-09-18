import { z } from 'zod';

import { optionalRule } from '../../../lib/validation';

type Translate = (key: string) => string;

export const makeReviewSchema = (t: Translate) =>
  z.object({
    rating: z.number().int().min(1, t('ecommStore.reviews.ratingRequired')).max(5),
    comment: optionalRule(t, 2000),
  });

export type ReviewValues = z.infer<ReturnType<typeof makeReviewSchema>>;
