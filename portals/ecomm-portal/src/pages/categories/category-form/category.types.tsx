import { z } from 'zod';
import { makeRules } from '../../../lib/rules';
import type { Translate } from '../../../lib/translate';
import type { StoreCategory } from '../../../queries/taxonomy';

/** Mirrors the server's `StoreCategoryInput`. `parent_id` is `''` for a top-level category. */
export const makeCategorySchema = (t: Translate) => {
  const rules = makeRules(t);
  return z.object({
    ...rules.identity(),
    ...rules.seo(),
    parent_id: z.string(),
    pet_type_ids: rules.ids(),
    image_url: rules.link(),
    banner_url: rules.link(),
    is_active: z.boolean(),
    show_in_menu: z.boolean(),
  });
};

export type CategoryValues = z.infer<ReturnType<typeof makeCategorySchema>>;

export const toCategoryValues = (category: StoreCategory | null): CategoryValues => ({
  name: category?.name ?? '',
  slug: category?.slug ?? '',
  description: category?.description ?? '',
  seo_title: category?.seo_title ?? '',
  seo_description: category?.seo_description ?? '',
  parent_id: category?.parent_id ?? '',
  pet_type_ids: category?.pet_type_ids ?? [],
  image_url: category?.image_url ?? '',
  banner_url: category?.banner_url ?? '',
  is_active: category?.is_active ?? true,
  show_in_menu: category?.show_in_menu ?? true,
});

/** The server input — a blank parent means top level. */
export const toCategoryInput = (values: CategoryValues) => ({ ...values, parent_id: values.parent_id || null });
