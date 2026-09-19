import { GraphQLError } from 'graphql';
import { withWeights, type Parcel } from '@modules/commerce/shiprocket/shiprocket.parcel';
import { PACKAGE_TYPES, type IInventoryProduct, type IProductVariant } from './inventory.model';

/**
 * Packaging rules for a product that ships through ShipRocket.
 *
 * The four dimensions are the PACKED parcel of one unit, box included, per
 * variant with the product's own values as the fallback. A product may be
 * saved half-filled (a draft is a draft), but it may not sit on the store with
 * ShipRocket delivery until every value is there — the checkout would rate it
 * wrong and the courier would dispute the weight.
 */
export const PACKAGING_LIMITS = {
  minWeightKg: 0.05,
  maxWeightKg: 50,
  minSideCm: 0.5,
  maxSideCm: 300,
  maxShelfLifeDays: 3650,
} as const;

const HSN = /^\d{4,8}$/;

const DIM_LABEL = {
  weight_kg: 'packed weight (kg)',
  length_cm: 'length (cm)',
  breadth_cm: 'breadth (cm)',
  height_cm: 'height (cm)',
} as const;
type DimKey = keyof typeof DIM_LABEL;
const DIM_KEYS = Object.keys(DIM_LABEL) as DimKey[];

type Dims = Pick<IProductVariant, DimKey>;
/** Any catalogue product — the pod shop's InventoryProduct or the pet store's StoreProduct. */
type Packable = Pick<IInventoryProduct, DimKey | 'hsn_code' | 'product_name'> & {
  variants?: readonly (Partial<Dims> & { option_label?: string; sku?: string })[] | null;
};

const bad = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
};

/** A variant's parcel, each value falling back to the product's own. */
export function effectiveDims(product: Partial<Dims>, variant?: Partial<Dims> | null): Dims {
  const pick = (key: DimKey) => {
    const own = Number(variant?.[key]) || 0;
    return own > 0 ? own : Number(product[key]) || 0;
  };
  return {
    weight_kg: pick('weight_kg'),
    length_cm: pick('length_cm'),
    breadth_cm: pick('breadth_cm'),
    height_cm: pick('height_cm'),
  };
}

const dimGaps = (d: Dims) =>
  DIM_KEYS.filter((key) =>
    key === 'weight_kg' ? d.weight_kg < PACKAGING_LIMITS.minWeightKg : d[key] < PACKAGING_LIMITS.minSideCm
  ).map((key) => DIM_LABEL[key]);

/**
 * What still stops this product shipping with ShipRocket, named the way the
 * form labels it (a variant's gaps are prefixed with its label). Empty = ready.
 */
export function packagingMissing(p: Packable): string[] {
  const missing: string[] = String(p.hsn_code ?? '').trim() ? [] : ['HSN code'];
  const variants = p.variants ?? [];
  if (variants.length === 0) return [...missing, ...dimGaps(effectiveDims(p))];
  for (const variant of variants) {
    const gaps = dimGaps(effectiveDims(p, variant as Partial<Dims>));
    if (gaps.length > 0) missing.push(`${variant.option_label || variant.sku || 'variant'}: ${gaps.join(', ')}`);
  }
  return missing;
}

/** The parcel a product (or one of its variants) ships as, with both weights. */
export const parcelOf = (product: Partial<Dims>, variant?: Partial<Dims> | null): Parcel =>
  withWeights(effectiveDims(product, variant));

function checkRange(value: unknown, min: number, max: number, message: string) {
  if (value === undefined || value === null || value === '') return;
  const n = Number(value);
  // 0 is "not entered yet" — allowed on a draft, caught by packagingMissing.
  if (n === 0) return;
  if (!Number.isFinite(n) || n < min || n > max) bad(message);
}

/** Bounds on the packaging values an operator typed. `label` names a variant. */
export function validatePackagingInput(input: Record<string, any>, label = '') {
  const of = label ? `${label}: ` : '';
  const L = PACKAGING_LIMITS;
  checkRange(input.weight_kg, L.minWeightKg, L.maxWeightKg, `${of}Packed weight must be between ${L.minWeightKg} and ${L.maxWeightKg} kg`);
  for (const key of ['length_cm', 'breadth_cm', 'height_cm'] as const) {
    checkRange(input[key], L.minSideCm, L.maxSideCm, `${of}${DIM_LABEL[key]} must be between ${L.minSideCm} and ${L.maxSideCm} cm`);
  }
  if (input.package_type != null && !PACKAGE_TYPES.includes(input.package_type)) bad('Choose a package type');
  if (input.hsn_code != null && String(input.hsn_code).trim() && !HSN.test(String(input.hsn_code).trim())) {
    bad('HSN code is 4 to 8 digits (pet food 2309, toys 9503)');
  }
  if (input.shelf_life_days != null) {
    const days = Number(input.shelf_life_days);
    if (!Number.isInteger(days) || days < 0 || days > L.maxShelfLifeDays) bad('Shelf life is a whole number of days');
  }
}

/** MRP is the price a unit is struck through from, so it can never sit below the price. 0 = no MRP. */
export function assertMrp(price: number, mrp: unknown, label = '') {
  if (mrp === undefined || mrp === null) return;
  const value = Number(mrp);
  if (value === 0) return;
  const of = label ? `${label}: ` : '';
  if (!Number.isFinite(value) || value < 0) bad(`${of}MRP cannot be negative`);
  if (value < Number(price)) bad(`${of}MRP (₹${value}) cannot be below the price (₹${Number(price)})`);
}

