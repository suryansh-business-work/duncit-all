import { numberText, splitLines, toNumber, toOptionalInt } from '../../../../lib/format';
import type { StoreProduct, StoreProductVariant } from '../../queries';
import type { ProductValues, VariantValues } from './product.types';

/** A zero the server stores for "not set yet" reads as a blank box. */
const blankZero = (value: number): string => (value ? numberText(value) : '');
const intOrZero = (value: string): number => toOptionalInt(value) ?? 0;
/** A blank select sends null — "none picked". */
const idOrNull = (value: string): string | null => value || null;

const hasChoices = ([, chosen]: [string, string[]]) => chosen.length > 0;
const toFacetValue = ([facet_id, values]: [string, string[]]) => ({ facet_id, values });
const isFullSpec = (spec: { label: string; value: string }) => spec.label !== '' && spec.value !== '';
/** A variant row added and left empty is dropped rather than saved blank. */
const isFilledVariant = (v: VariantValues) => [v.option_label, v.sku, v.price, v.stock].some(Boolean);

const toVariantValues = (v: StoreProductVariant): VariantValues => ({
  id: v.id,
  option_label: v.option_label,
  sku: v.sku,
  price: blankZero(v.price),
  mrp: blankZero(v.mrp),
  stock: numberText(v.stock),
  weight_kg: blankZero(v.weight_kg),
  length_cm: blankZero(v.length_cm),
  breadth_cm: blankZero(v.breadth_cm),
  height_cm: blankZero(v.height_cm),
  images: v.images,
});

const toVariantInput = (v: VariantValues) => ({
  id: idOrNull(v.id),
  option_label: v.option_label,
  sku: v.sku,
  price: toNumber(v.price),
  mrp: toNumber(v.mrp),
  stock: intOrZero(v.stock),
  weight_kg: toNumber(v.weight_kg),
  length_cm: toNumber(v.length_cm),
  breadth_cm: toNumber(v.breadth_cm),
  height_cm: toNumber(v.height_cm),
  images: v.images,
});

/** The editor's starting values for a product not saved yet: new products take cash on delivery and returns. */
const blankProduct = (): ProductValues => ({
  product_name: '',
  sku: '',
  brand_id: '',
  short_description: '',
  description: '',
  images: [],
  price: '',
  mrp: '',
  stock: '',
  low_stock_alert: '',
  variant_option: '',
  variants: [],
  warehouse_id: '',
  weight_kg: '',
  length_cm: '',
  breadth_cm: '',
  height_cm: '',
  package_type: 'BOX',
  hsn_code: '',
  is_fragile: false,
  is_liquid: false,
  shelf_life_days: '',
  title: '',
  slug: '',
  badge: '',
  featured: false,
  sort_rank: '',
  pet_type_ids: [],
  category_ids: [],
  facet_values: {},
  highlights: [],
  specifications: [],
  ingredients: '',
  feeding_guide: '',
  care_instructions: '',
  seo_title: '',
  seo_description: '',
  search_keywords: '',
  video_url: '',
  cod_available: true,
  returnable: true,
  return_window_days: '',
  max_per_order: '',
});

const fromProduct = (p: StoreProduct): ProductValues => ({
  product_name: p.product_name,
  sku: p.sku,
  brand_id: p.brand_id ?? '',
  short_description: p.short_description,
  description: p.description,
  images: p.images,
  price: blankZero(p.price),
  mrp: blankZero(p.mrp),
  stock: numberText(p.stock),
  low_stock_alert: blankZero(p.low_stock_alert),
  variant_option: p.variant_option,
  variants: p.variants.map(toVariantValues),
  warehouse_id: p.warehouse_id ?? '',
  weight_kg: blankZero(p.weight_kg),
  length_cm: blankZero(p.length_cm),
  breadth_cm: blankZero(p.breadth_cm),
  height_cm: blankZero(p.height_cm),
  package_type: p.package_type,
  hsn_code: p.hsn_code,
  is_fragile: p.is_fragile,
  is_liquid: p.is_liquid,
  shelf_life_days: p.shelf_life_days === null ? '' : numberText(p.shelf_life_days),
  title: p.title,
  slug: p.slug,
  badge: p.badge,
  featured: p.featured,
  sort_rank: blankZero(p.sort_rank),
  pet_type_ids: p.pet_type_ids,
  category_ids: p.category_ids,
  facet_values: Object.fromEntries(p.facet_values.map((facet) => [facet.facet_id, facet.values])),
  highlights: p.highlights.map((text) => ({ text })),
  specifications: p.specifications.map((spec) => ({ label: spec.label, value: spec.value })),
  ingredients: p.ingredients,
  feeding_guide: p.feeding_guide,
  care_instructions: p.care_instructions,
  seo_title: p.seo_title,
  seo_description: p.seo_description,
  search_keywords: p.search_keywords.join(', '),
  video_url: p.video_url,
  cod_available: p.cod_available,
  returnable: p.returnable,
  return_window_days: numberText(p.return_window_days),
  max_per_order: blankZero(p.max_per_order),
});

/** The form's values for a saved product, or blank ones for a new product. */
export const toProductValues = (product: StoreProduct | null): ProductValues => (product ? fromProduct(product) : blankProduct());

/** The server input — numbers converted, blank rows dropped, a blank return window sent as null (the store default). */
export const toProductInput = (values: ProductValues) => ({
  ...values,
  brand_id: idOrNull(values.brand_id),
  warehouse_id: idOrNull(values.warehouse_id),
  price: toNumber(values.price),
  mrp: toNumber(values.mrp),
  stock: intOrZero(values.stock),
  low_stock_alert: intOrZero(values.low_stock_alert),
  variants: values.variants.filter(isFilledVariant).map(toVariantInput),
  weight_kg: toNumber(values.weight_kg),
  length_cm: toNumber(values.length_cm),
  breadth_cm: toNumber(values.breadth_cm),
  height_cm: toNumber(values.height_cm),
  shelf_life_days: toOptionalInt(values.shelf_life_days),
  sort_rank: intOrZero(values.sort_rank),
  facet_values: Object.entries(values.facet_values).filter(hasChoices).map(toFacetValue),
  highlights: values.highlights.map((row) => row.text).filter(Boolean),
  specifications: values.specifications.filter(isFullSpec),
  search_keywords: splitLines(values.search_keywords),
  return_window_days: toOptionalInt(values.return_window_days),
  max_per_order: intOrZero(values.max_per_order),
});

export type ProductInput = ReturnType<typeof toProductInput>;
