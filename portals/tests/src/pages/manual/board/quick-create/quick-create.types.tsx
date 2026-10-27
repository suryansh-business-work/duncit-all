import { z } from 'zod';
import type { Translate } from '@duncit/shell';
import { titleRule } from '../../shared/caseRules';
import { CASE_TYPES } from '../../shared/vocabulary';

/** A card typed straight into a column: a title and what kind of case it is. */
export const quickCreateSchema = (t: Translate) =>
  z.object({
    title: titleRule(t),
    type: z.enum(CASE_TYPES, { error: t('testsManual.validation.typeRequired') }),
  });

export type QuickCreateValues = z.infer<ReturnType<typeof quickCreateSchema>>;

export const BLANK_QUICK_CREATE: QuickCreateValues = { title: '', type: 'TEST_CASE' };
