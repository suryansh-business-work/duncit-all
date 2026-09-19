import { z } from 'zod';
import type { Translate } from '@duncit/forms/schemas';
import type { LiteLocale, LiteLocaleInput } from '../../../graphql/localization';

export interface LocaleFormValues {
  code: string;
  label: string;
  english_label: string;
  is_rtl: boolean;
  is_default: boolean;
  /** Kept as text in the form; parsed on submit. */
  sort_order: string;
  is_active: boolean;
}

/** A BCP-47 tag: a 2–3 letter language, then optional subtags (en, en-IN, zh-Hant-TW). */
const LOCALE_CODE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
const DIGITS = /^\d*$/;

export const emptyLocaleValues = (): LocaleFormValues => ({ code: '', label: '', english_label: '', is_rtl: false, is_default: false, sort_order: '0', is_active: true });

export const localeValuesFrom = (locale: LiteLocale): LocaleFormValues => ({
  code: locale.code,
  label: locale.label,
  english_label: locale.english_label,
  is_rtl: locale.is_rtl,
  is_default: locale.is_default,
  sort_order: String(locale.sort_order),
  is_active: locale.is_active,
});

export const toLocaleInput = (values: LocaleFormValues): LiteLocaleInput => ({
  code: values.code,
  label: values.label,
  english_label: values.english_label,
  is_rtl: values.is_rtl,
  is_default: values.is_default,
  sort_order: values.sort_order === '' ? 0 : Number(values.sort_order),
  is_active: values.is_active,
});

export const makeLocaleSchema = (t: Translate) => {
  const required = (field: string) => t('litePortal.validation.required', { vars: { field } });
  const max = (field: string, limit: number) => t('litePortal.validation.max', { vars: { field, max: limit } });
  const label = t('litePortal.localization.label');
  const english = t('litePortal.localization.englishLabel');
  return z.object({
    code: z.string().trim().min(1, required(t('litePortal.localization.code'))).regex(LOCALE_CODE, t('litePortal.validation.localeCode')),
    label: z.string().trim().min(1, required(label)).max(60, max(label, 60)),
    english_label: z.string().trim().min(1, required(english)).max(60, max(english, 60)),
    is_rtl: z.boolean(),
    is_default: z.boolean(),
    sort_order: z.string().trim().regex(DIGITS, t('litePortal.validation.integer', { vars: { field: t('litePortal.common.sortOrder') } })),
    is_active: z.boolean(),
  });
};
