import { z } from 'zod';
import { fallbackT, type Translate } from '@duncit/shell';
import type { ExpenseOptionRow } from '../../expense-config';
import type { ExpenseOptionFormValues } from './expense-option.types';

/**
 * Validation for one configured dropdown row.
 *
 * The KEY is what every expense filed under this option stores, so it is
 * checked here rather than left to the server's normaliser: a person typing
 * "Food & Beverage" into the key box should be told it becomes
 * FOOD_AND_BEVERAGE while they can still change their mind, not discover it
 * afterwards on the settings table.
 */
export const expenseOptionSchema = (t: Translate = fallbackT) =>
  z.object({
    key: z
      .string()
      .trim()
      .min(1, t('finance.expenseConfig.keyRequired'))
      .max(60, t('finance.expenseConfig.tooLong')),
    label: z
      .string()
      .trim()
      .min(1, t('finance.expenseConfig.labelRequired'))
      .max(120, t('finance.expenseConfig.tooLong')),
    entity_source: z.string().trim().default(''),
    is_active: z.boolean().default(true),
  });

/** The shape the server stores a key in — shown live under the key field. */
export const toOptionKey = (raw: string) =>
  raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const BLANK: ExpenseOptionFormValues = {
  key: '',
  label: '',
  entity_source: '',
  is_active: true,
};

export function toFormValues(option: ExpenseOptionRow | null): ExpenseOptionFormValues {
  if (!option) return { ...BLANK };
  return {
    key: option.key,
    label: option.label,
    entity_source: option.entity_source,
    is_active: option.is_active,
  };
}
