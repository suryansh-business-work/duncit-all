import { z } from 'zod';
import { numberText, splitLines, toNumber, toOptionalInt } from '../../../../lib/format';
import { makeRules } from '../../../../lib/rules';
import type { Translate } from '../../../../lib/translate';
import type { StoreListing } from '../../queries';

/** Mirrors the server's `StoreListingInput`; numbers and keyword lists stay text while typed. */
export const makeListingSchema = (t: Translate) => {
  const r = makeRules(t);
  return z.object({
    listed: z.boolean(),
    title: r.optionalText(150),
    slug: r.optionalText(120),
    badge: r.optionalText(40),
    featured: z.boolean(),
    sort_rank: r.whole(),
    pet_type_ids: r.ids(),
    category_ids: r.ids(),
    /** Chosen option slugs per filter id. */
    facet_values: z.record(z.string(), z.array(z.string())),
    mrp: r.amount(),
    variant_mrps: z.array(z.object({ variant_id: z.string(), mrp: r.amount() })),
    highlights: z.array(z.object({ text: r.optionalText(200) })).max(12, t('ecommPortal.listing.highlightsMax', { vars: { max: 12 } })),
    specifications: z.array(z.object({ label: r.optionalText(60), value: r.optionalText(200) })),
    ingredients: r.optionalText(4000),
    feeding_guide: z.string(),
    care_instructions: z.string(),
    ...r.seo(),
    search_keywords: r.optionalText(1000),
    video_url: r.link(),
    cod_available: z.boolean(),
    returnable: z.boolean(),
    return_window_days: r.whole(),
    max_per_order: r.whole(),
  });
};

export type ListingValues = z.infer<ReturnType<typeof makeListingSchema>>;

export const BLANK_HIGHLIGHT = { text: '' };
export const BLANK_SPEC = { label: '', value: '' };

export const toListingValues = (listing: StoreListing): ListingValues => ({
  listed: listing.listed,
  title: listing.title,
  slug: listing.slug,
  badge: listing.badge,
  featured: listing.featured,
  sort_rank: numberText(listing.sort_rank),
  pet_type_ids: listing.pet_type_ids,
  category_ids: listing.category_ids,
  facet_values: Object.fromEntries(listing.facet_values.map((facet) => [facet.facet_id, facet.values])),
  mrp: numberText(listing.mrp),
  variant_mrps: listing.variants.map((variant) => ({ variant_id: variant.id, mrp: numberText(variant.mrp) })),
  highlights: listing.highlights.map((text) => ({ text })),
  specifications: listing.specifications.map((spec) => ({ label: spec.label, value: spec.value })),
  ingredients: listing.ingredients,
  feeding_guide: listing.feeding_guide,
  care_instructions: listing.care_instructions,
  seo_title: listing.seo_title,
  seo_description: listing.seo_description,
  search_keywords: listing.search_keywords.join(', '),
  video_url: listing.video_url,
  cod_available: listing.cod_available,
  returnable: listing.returnable,
  return_window_days: numberText(listing.return_window_days),
  max_per_order: numberText(listing.max_per_order),
});

/** The server input — blank rows dropped, a blank return window sent as null (the store default). */
export const toListingInput = (values: ListingValues) => ({
  ...values,
  sort_rank: toOptionalInt(values.sort_rank) ?? 0,
  facet_values: Object.entries(values.facet_values)
    .filter(([, chosen]) => chosen.length > 0)
    .map(([facet_id, chosen]) => ({ facet_id, values: chosen })),
  mrp: toNumber(values.mrp),
  variant_mrps: values.variant_mrps.map((variant) => ({ variant_id: variant.variant_id, mrp: toNumber(variant.mrp) })),
  highlights: values.highlights.map((row) => row.text).filter(Boolean),
  specifications: values.specifications.filter((spec) => spec.label && spec.value),
  search_keywords: splitLines(values.search_keywords),
  return_window_days: toOptionalInt(values.return_window_days),
  max_per_order: toOptionalInt(values.max_per_order) ?? 0,
});
