import { z } from 'zod';
import { makeRules } from '../../../lib/rules';
import type { Translate } from '../../../lib/translate';
import type { StoreCategory } from '../../../queries/taxonomy';

/** Stands for "no parent" in the select, so top level is an answer rather than a blank. */
export const ROOT_PARENT = 'ROOT';

/**
 * Mirrors the server's `StoreCategoryInput`, strictly: a category cannot be
 * saved without its place in the tree, a pet type, both pictures and its SEO.
 */
export const makeCategorySchema = (t: Translate) => {
  const rules = makeRules(t);
  const requiredText = (max: number, message: string) => rules.optionalText(max).refine((value) => value !== '', message);
  const requiredLink = (message: string) => rules.link().refine((value) => value !== '', message);
  return z.object({
    ...rules.identity(),
    seo_title: requiredText(120, t('ecommPortal.categories.seoTitleRequired')),
    seo_description: requiredText(320, t('ecommPortal.categories.seoDescriptionRequired')),
    parent_id: z.string().min(1, t('ecommPortal.categories.parentRequired')),
    pet_type_ids: z.array(z.string()).min(1, t('ecommPortal.categories.petTypesRequired')),
    image_url: requiredLink(t('ecommPortal.categories.imageRequired')),
    banner_url: requiredLink(t('ecommPortal.categories.bannerRequired')),
    is_active: z.boolean(),
    show_in_menu: z.boolean(),
  });
};

export type CategoryValues = z.infer<ReturnType<typeof makeCategorySchema>>;

/** A saved category answers its parent (top level as the sentinel); a new one has not been asked yet. */
const parentValue = (category: StoreCategory | null): string => {
  if (!category) return '';
  return category.parent_id || ROOT_PARENT;
};

export const toCategoryValues = (category: StoreCategory | null): CategoryValues => ({
  name: category?.name ?? '',
  slug: category?.slug ?? '',
  description: category?.description ?? '',
  seo_title: category?.seo_title ?? '',
  seo_description: category?.seo_description ?? '',
  parent_id: parentValue(category),
  pet_type_ids: category?.pet_type_ids ?? [],
  image_url: category?.image_url ?? '',
  banner_url: category?.banner_url ?? '',
  is_active: category?.is_active ?? true,
  show_in_menu: category?.show_in_menu ?? true,
});

/** The server input — the sentinel becomes a null parent, which is top level. */
export const toCategoryInput = (values: CategoryValues) => ({
  ...values,
  parent_id: values.parent_id === ROOT_PARENT ? null : values.parent_id,
});
