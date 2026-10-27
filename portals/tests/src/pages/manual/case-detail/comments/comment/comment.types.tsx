import { z } from 'zod';
import { htmlToText } from '@duncit/rich-text';
import type { Translate } from '@duncit/shell';
import { MANUAL_LIMITS } from '../../../shared/vocabulary';

/** A comment: some words (a picture alone says too little in a review thread), within bounds. */
export const commentSchema = (t: Translate) =>
  z.object({
    body: z
      .string()
      .max(MANUAL_LIMITS.commentMax, t('testsManual.validation.tooLong', { vars: { max: MANUAL_LIMITS.commentMax } }))
      .refine((html) => htmlToText(html) !== '', t('testsManual.validation.commentRequired')),
  });

export type CommentValues = z.infer<ReturnType<typeof commentSchema>>;
