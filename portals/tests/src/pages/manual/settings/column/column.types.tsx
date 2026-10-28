import { z } from 'zod';
import type { ManualTestColumnInput } from '@duncit/gql-types';
import type { Translate } from '@duncit/shell';
import { numberOrNull, wholeNumberRule } from '../../shared/caseRules';
import { CATEGORIES, MANUAL_LIMITS } from '../../shared/vocabulary';
import type { ManualColumn } from '../../shared/types';

/** A board column: its name, what it means, and an optional WIP limit (typed text; empty for none). */
export const columnSchema = (t: Translate) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t('testsManual.validation.columnNameRequired'))
      .max(
        MANUAL_LIMITS.columnNameMax,
        t('testsManual.validation.tooLong', { vars: { max: MANUAL_LIMITS.columnNameMax } })
      ),
    category: z.enum(CATEGORIES),
    wip_limit: wholeNumberRule(1, MANUAL_LIMITS.wipMax, t('testsManual.validation.wipLimit', { vars: { max: MANUAL_LIMITS.wipMax } })),
  });

export type ColumnValues = z.infer<ReturnType<typeof columnSchema>>;

export const BLANK_COLUMN: ColumnValues = { name: '', category: 'TODO', wip_limit: '' };

export const columnValuesOf = (column: ManualColumn): ColumnValues => ({
  name: column.name,
  category: column.category,
  wip_limit: typeof column.wip_limit === 'number' ? String(column.wip_limit) : '',
});

export const toColumnInput = (values: ColumnValues): ManualTestColumnInput => ({
  name: values.name,
  category: values.category,
  wip_limit: numberOrNull(values.wip_limit),
});
