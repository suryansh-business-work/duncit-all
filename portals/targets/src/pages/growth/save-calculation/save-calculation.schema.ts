import { z } from 'zod';
import { GROWTH_DESCRIPTION_MAX, GROWTH_TITLE_MAX } from '../../../lib/growth-calculator';
import type { SaveCalculationFormValues, Translate } from './save-calculation.types';

/** A title is required; the description is optional. Both trimmed, both within the server's limits. */
export const saveCalculationSchema = (t: Translate) =>
  z.object({
    title: z
      .string()
      .trim()
      .min(1, t('targets.growth.save.titleRequired'))
      .max(GROWTH_TITLE_MAX, t('targets.growth.save.tooLong', { vars: { max: GROWTH_TITLE_MAX } })),
    description: z
      .string()
      .trim()
      .max(GROWTH_DESCRIPTION_MAX, t('targets.growth.save.tooLong', { vars: { max: GROWTH_DESCRIPTION_MAX } })),
  }) satisfies z.ZodType<SaveCalculationFormValues, SaveCalculationFormValues>;

export const EMPTY_SAVE_VALUES: SaveCalculationFormValues = { title: '', description: '' };
