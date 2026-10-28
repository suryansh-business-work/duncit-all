import { z } from 'zod';
import type { Translate } from '@duncit/shell';
import { MANUAL_LIMITS } from '../../shared/vocabulary';

/** The four rich-text sections of a case. */
export type RichField = 'description' | 'preconditions' | 'expected_result' | 'actual_result';

/** Where pictures dropped into a case's text are uploaded. */
export const CASE_IMAGE_FOLDER = '/tests/manual';

/** One section's HTML; empty is allowed (it clears the section). */
export const richSectionSchema = (t: Translate) =>
  z.object({
    html: z
      .string()
      .max(MANUAL_LIMITS.richTextMax, t('testsManual.validation.tooLong', { vars: { max: MANUAL_LIMITS.richTextMax } })),
  });

export type RichSectionValues = z.infer<ReturnType<typeof richSectionSchema>>;
