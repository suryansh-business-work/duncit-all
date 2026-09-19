import { z } from 'zod';
import type { Translate } from '@duncit/forms/schemas';
import type { LiteAdminCategory, LiteCategoryInput } from '../../../graphql/catalogue';

export interface CategoryFormValues {
  name: string;
  slug: string;
  icon: string;
  /** Kept as text in the form; parsed on submit. */
  sort_order: string;
  is_active: boolean;
}

const ICON_NAME = /^[A-Za-z0-9]*$/;
const DIGITS = /^\d*$/;

export const emptyCategoryValues = (): CategoryFormValues => ({ name: '', slug: '', icon: '', sort_order: '0', is_active: true });

export const categoryValuesFrom = (category: LiteAdminCategory): CategoryFormValues => ({
  name: category.name,
  slug: category.slug,
  icon: category.icon ?? '',
  sort_order: String(category.sort_order),
  is_active: category.is_active,
});

export const toCategoryInput = (values: CategoryFormValues): LiteCategoryInput => ({
  name: values.name,
  slug: values.slug || null,
  icon: values.icon || null,
  sort_order: values.sort_order === '' ? 0 : Number(values.sort_order),
  is_active: values.is_active,
});

export const makeCategorySchema = (t: Translate) => {
  const name = t('litePortal.common.name');
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t('litePortal.validation.required', { vars: { field: name } }))
      .max(60, t('litePortal.validation.max', { vars: { field: name, max: 60 } })),
    slug: z.string().trim().max(80, t('litePortal.validation.max', { vars: { field: t('litePortal.common.slug'), max: 80 } })),
    icon: z.string().trim().regex(ICON_NAME, t('litePortal.validation.iconName')),
    sort_order: z.string().trim().regex(DIGITS, t('litePortal.validation.integer', { vars: { field: t('litePortal.common.sortOrder') } })),
    is_active: z.boolean(),
  });
};
