import type { Control, UseFormSetValue } from 'react-hook-form';
import { z } from 'zod';
import { makeRules, type Rules } from '../../../../lib/rules';
import type { Translate } from '../../../../lib/translate';

/** What the server keeps: photos per product and per variant, variants, highlights. */
export const MAX_PHOTOS = 20;
export const MAX_VARIANT_PHOTOS = 12;
export const MAX_VARIANTS = 60;
export const MAX_HIGHLIGHTS = 12;
export const MAX_SPECS = 40;
export const MAX_FAQS = 20;

/** An HSN code on the GST invoice: 4 to 8 digits. */
const HSN = /^\d{4,8}$/;

const makeVariantSchema = (r: Rules, t: Translate) =>
  z.object({
    /** An existing variant's id — blank for one added here, so carts holding the old one stay valid. */
    id: z.string(),
    option_label: r.optionalText(60),
    sku: r.optionalText(60),
    price: r.amount(),
    mrp: r.amount(),
    stock: r.whole(),
    weight_kg: r.measure(),
    length_cm: r.measure(),
    breadth_cm: r.measure(),
    height_cm: r.measure(),
    images: z.array(z.string()).max(MAX_VARIANT_PHOTOS, t('ecommPortal.productEditor.photosMax', { vars: { max: MAX_VARIANT_PHOTOS } })),
  });

/**
 * Mirrors the server's `StoreAdminProductInput`. Only the name is required —
 * a draft saves whatever is filled in, and the server checks the rest when
 * the product is published. Numbers stay text while they are typed.
 */
export const makeProductSchema = (t: Translate) => {
  const r = makeRules(t);
  return z.object({
    product_name: r.requiredText(200),
    sku: r.optionalText(60),
    brand_id: z.string(),
    short_description: r.optionalText(500),
    description: r.optionalText(10000),
    images: z.array(z.string()).max(MAX_PHOTOS, t('ecommPortal.productEditor.photosMax', { vars: { max: MAX_PHOTOS } })),
    price: r.amount(),
    mrp: r.amount(),
    stock: r.whole(),
    low_stock_alert: r.whole(),
    variant_option: r.optionalText(40),
    variants: z
      .array(makeVariantSchema(r, t))
      .max(MAX_VARIANTS, t('ecommPortal.productEditor.variantsMax', { vars: { max: MAX_VARIANTS } })),
    warehouse_id: z.string(),
    weight_kg: r.measure(),
    length_cm: r.measure(),
    breadth_cm: r.measure(),
    height_cm: r.measure(),
    package_type: z.enum(['BOX', 'POLYBAG', 'ENVELOPE', 'OTHER']),
    /** Needed to publish — the server says so; a draft may leave it blank. */
    hsn_code: z
      .string()
      .trim()
      .refine((value) => value === '' || HSN.test(value), t('ecommPortal.productEditor.hsnRule')),
    is_fragile: z.boolean(),
    is_liquid: z.boolean(),
    shelf_life_days: r.whole(),
    title: r.optionalText(150),
    slug: r.optionalText(120),
    badge: r.optionalText(40),
    featured: z.boolean(),
    sort_rank: r.whole(),
    pet_type_ids: r.ids(),
    category_ids: r.ids(),
    /** Chosen option slugs per filter id. */
    facet_values: z.record(z.string(), z.array(z.string())),
    highlights: z
      .array(z.object({ text: r.optionalText(200) }))
      .max(MAX_HIGHLIGHTS, t('ecommPortal.listing.highlightsMax', { vars: { max: MAX_HIGHLIGHTS } })),
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
    offer_text: r.optionalText(80),
    faqs: z
      .array(z.object({ question: r.optionalText(200), answer: r.optionalText(2000) }))
      .max(MAX_FAQS, t('ecommPortal.productEditor.faqsMax', { vars: { max: MAX_FAQS } })),
  });
};

export type ProductValues = z.infer<ReturnType<typeof makeProductSchema>>;
export type VariantValues = ProductValues['variants'][number];

/** Every section of the editor takes the one form's control. */
export type ProductControl = Control<ProductValues>;

/** The shared Shipping & packaging section fills several fields at once (its presets). */
export type ProductSetValue = UseFormSetValue<ProductValues>;

export const BLANK_HIGHLIGHT = { text: '' };
export const BLANK_SPEC = { label: '', value: '' };
export const BLANK_FAQ = { question: '', answer: '' };

/** A fresh variant row — no id, so the server mints one. */
export const blankVariant = (): VariantValues => ({
  id: '',
  option_label: '',
  sku: '',
  price: '',
  mrp: '',
  stock: '',
  weight_kg: '',
  length_cm: '',
  breadth_cm: '',
  height_cm: '',
  images: [],
});
