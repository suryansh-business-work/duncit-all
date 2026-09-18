import { z } from 'zod';
import { numberText } from '../../../lib/format';
import { makeRules } from '../../../lib/rules';
import type { Translate } from '../../../lib/translate';
import type { StoreSection } from '../queries';
import { PRODUCT_SOURCES, SECTION_KINDS } from '../section-kinds';
import { DEFAULT_PRODUCTS, findIssues, MAX_PRODUCTS, TIER_MAX, TIER_MIN, validTiers } from './home-section.rules';

export { toHomeSectionInput } from './home-section.input';
export { MAX_PRODUCTS, TIER_MAX, TIER_MIN };

/** Mirrors the server's `StoreSectionInput`. Dates are ISO text, `''` for "no limit". */
export const makeHomeSectionSchema = (t: Translate) => {
  const r = makeRules(t);
  return z
    .object({
      kind: z.enum(SECTION_KINDS),
      title: r.optionalText(120),
      subtitle: r.optionalText(240),
      is_active: z.boolean(),
      starts_at: z.string(),
      ends_at: z.string(),
      items: z.array(
        z.object({
          title: r.optionalText(120),
          subtitle: r.optionalText(240),
          image_url: r.link(),
          mobile_image_url: r.link(),
          cta_label: r.optionalText(40),
          link: r.link(),
        }),
      ),
      collection_id: z.string(),
      category_ids: r.ids(),
      /** A category slider's one category. */
      slider_category_id: z.string(),
      product_source: z.enum(PRODUCT_SOURCES),
      product_ids: r.ids(),
      product_limit: r
        .whole()
        .refine(
          (value) => value === '' || (Number(value) >= 1 && Number(value) <= MAX_PRODUCTS),
          t('ecommPortal.homePage.productLimitRange', { vars: { max: MAX_PRODUCTS } }),
        ),
      discount_tiers: z
        .string()
        .trim()
        .refine(validTiers, t('ecommPortal.homePage.tiersRange', { vars: { min: TIER_MIN, max: TIER_MAX } })),
    })
    .superRefine((values, ctx) => {
      for (const issue of findIssues(values)) {
        ctx.addIssue({ code: 'custom', path: [issue.path], message: t(issue.key) });
      }
    });
};

export type HomeSectionValues = z.infer<ReturnType<typeof makeHomeSectionSchema>>;

export const BLANK_SECTION_ITEM = { title: '', subtitle: '', image_url: '', mobile_image_url: '', cta_label: '', link: '' };

export const toHomeSectionValues = (section: StoreSection | null): HomeSectionValues => ({
  kind: section?.kind ?? 'HERO_SLIDER',
  title: section?.title ?? '',
  subtitle: section?.subtitle ?? '',
  is_active: section?.is_active ?? true,
  starts_at: section?.starts_at ?? '',
  ends_at: section?.ends_at ?? '',
  items: (section?.items ?? []).map((item) => ({
    title: item.title,
    subtitle: item.subtitle,
    image_url: item.image_url,
    mobile_image_url: item.mobile_image_url,
    cta_label: item.cta_label,
    link: item.link,
  })),
  collection_id: section?.collection_id ?? '',
  category_ids: section?.category_ids ?? [],
  slider_category_id: section?.category_ids[0] ?? '',
  product_source: section?.product_source ?? 'MANUAL',
  product_ids: section?.product_ids ?? [],
  product_limit: numberText(section?.product_limit ?? DEFAULT_PRODUCTS),
  discount_tiers: (section?.discount_tiers ?? []).join(', '),
});
