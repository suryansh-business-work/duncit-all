import { z } from 'zod';
import { numberText, splitLines, toNumber } from '../../../../lib/format';
import { makeRules } from '../../../../lib/rules';
import type { Translate } from '../../../../lib/translate';
import type { StoreCollection } from '../../queries';

/** Mirrors the server's `StoreCollectionInput`; numbers and tags stay text while typed. */
export const makeCollectionSchema = (t: Translate) => {
  const r = makeRules(t);
  return z.object({
    ...r.identity(),
    ...r.seo(),
    image_url: r.link(),
    banner_url: r.link(),
    is_active: z.boolean(),
    mode: z.enum(['MANUAL', 'SMART']),
    product_ids: r.ids(),
    rules: z.object({
      pet_type_ids: r.ids(),
      category_ids: r.ids(),
      brand_ids: r.ids(),
      tags: r.optionalText(600),
      min_discount_pct: r.percent(100),
      max_price: r.amount(),
      featured_only: z.boolean(),
      in_stock_only: z.boolean(),
    }),
  });
};

export type CollectionValues = z.infer<ReturnType<typeof makeCollectionSchema>>;

/** A zero limit on the server means "no limit" — the form shows it as blank. */
const limitText = (value: number | undefined) => (value ? numberText(value) : '');

export const toCollectionValues = (collection: StoreCollection | null): CollectionValues => ({
  name: collection?.name ?? '',
  slug: collection?.slug ?? '',
  description: collection?.description ?? '',
  seo_title: collection?.seo_title ?? '',
  seo_description: collection?.seo_description ?? '',
  image_url: collection?.image_url ?? '',
  banner_url: collection?.banner_url ?? '',
  is_active: collection?.is_active ?? true,
  mode: collection?.mode ?? 'MANUAL',
  product_ids: collection?.product_ids ?? [],
  rules: {
    pet_type_ids: collection?.rules.pet_type_ids ?? [],
    category_ids: collection?.rules.category_ids ?? [],
    brand_ids: collection?.rules.brand_ids ?? [],
    tags: collection?.rules.tags.join(', ') ?? '',
    min_discount_pct: limitText(collection?.rules.min_discount_pct),
    max_price: limitText(collection?.rules.max_price),
    featured_only: collection?.rules.featured_only ?? false,
    in_stock_only: collection?.rules.in_stock_only ?? false,
  },
});

/** The server input: tags split, limits as numbers (blank = none). */
export const toCollectionInput = (values: CollectionValues) => ({
  ...values,
  rules: {
    ...values.rules,
    tags: splitLines(values.rules.tags),
    min_discount_pct: toNumber(values.rules.min_discount_pct),
    max_price: toNumber(values.rules.max_price),
  },
});
