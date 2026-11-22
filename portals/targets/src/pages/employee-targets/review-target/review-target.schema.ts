import { z } from 'zod';
import { EMPLOYEE_TARGET_LIMITS as L } from '@duncit/utils';
import type { ReviewTargetFormValues, Translate } from './review-target.types';

/** The comment is optional; trimmed and held to the server's limit. */
export const reviewTargetSchema = (t: Translate) =>
  z.object({
    comment: z
      .string()
      .trim()
      .max(L.commentMax, t('employeeTargets.form.tooLong', { vars: { max: L.commentMax } })),
  }) satisfies z.ZodType<ReviewTargetFormValues, ReviewTargetFormValues>;

export const EMPTY_REVIEW_VALUES: ReviewTargetFormValues = { comment: '' };
