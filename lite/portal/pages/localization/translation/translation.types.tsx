import { z } from 'zod';
import type { Translate } from '@duncit/forms/schemas';

export interface TranslationFormValues {
  key: string;
  value: string;
}

const KEY_MAX = 200;
const VALUE_MAX = 2000;

export const emptyTranslationValues = (): TranslationFormValues => ({ key: '', value: '' });

/** The value may legitimately be empty text is not allowed: an empty row hides the fallback for nothing. */
export const makeTranslationSchema = (t: Translate) => {
  const key = t('litePortal.localization.key');
  const value = t('litePortal.localization.value');
  return z.object({
    key: z
      .string()
      .trim()
      .min(1, t('litePortal.validation.required', { vars: { field: key } }))
      .max(KEY_MAX, t('litePortal.validation.max', { vars: { field: key, max: KEY_MAX } })),
    value: z
      .string()
      .trim()
      .min(1, t('litePortal.validation.required', { vars: { field: value } }))
      .max(VALUE_MAX, t('litePortal.validation.max', { vars: { field: value, max: VALUE_MAX } })),
  });
};
