import type { z } from 'zod';
import { PACKAGING_LIMITS, type ParcelDims } from '@duncit/utils';

/** The portal's `t` (rule 38) — every message below is a catalogue key. */
export type ListingTranslate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

/** GST HSN code: 4 to 8 digits (pet food 2309, toys 9503). Mirrors the server's check. */
const HSN_PATTERN = /^\d{4,8}$/;

type DimKey = keyof ParcelDims;
type Parcel = Record<DimKey, unknown>;
type IssuePath = (string | number)[];

const L = PACKAGING_LIMITS;
/** Each packed dimension's bounds, and the message naming it when it is missing. */
const PARCEL_RULES: Record<DimKey, { min: number; max: number; missing: string; range: string }> = {
  weight_kg: {
    min: L.minWeightKg,
    max: L.maxWeightKg,
    missing: 'partners.listProductsPage.weightRequired',
    range: 'partners.listProductsPage.weightRange',
  },
  length_cm: { min: L.minSideCm, max: L.maxSideCm, missing: 'partners.listProductsPage.lengthRequired', range: 'partners.listProductsPage.sideRange' },
  breadth_cm: { min: L.minSideCm, max: L.maxSideCm, missing: 'partners.listProductsPage.breadthRequired', range: 'partners.listProductsPage.sideRange' },
  height_cm: { min: L.minSideCm, max: L.maxSideCm, missing: 'partners.listProductsPage.heightRequired', range: 'partners.listProductsPage.sideRange' },
};
const DIM_KEYS = Object.keys(PARCEL_RULES) as DimKey[];

/** The values the rules read — the listing form's own fields. */
export interface ListingRuleValues extends Parcel {
  delivery_target: string;
  hsn_code: string;
  shelf_life_days: number | null;
  variants: (Parcel & { unit_cost: unknown; mrp: unknown })[];
}

type AddIssue = (path: IssuePath, message: string) => void;

/** One parcel's dimensions: blank (0) is an error only when `required`; a filled one is always bounded. */
function checkParcel(parcel: Parcel, at: IssuePath, required: boolean, t: ListingTranslate, add: AddIssue) {
  for (const key of DIM_KEYS) {
    const rule = PARCEL_RULES[key];
    const value = Number(parcel[key]) || 0;
    if (value === 0 && required) add([...at, key], t(rule.missing));
    if (value !== 0 && (value < rule.min || value > rule.max)) {
      add([...at, key], t(rule.range, { vars: { min: rule.min, max: rule.max } }));
    }
  }
}

function checkHsn(raw: string, required: boolean, t: ListingTranslate, add: AddIssue) {
  const code = raw.trim();
  if (code && !HSN_PATTERN.test(code)) add(['hsn_code'], t('partners.listProductsPage.hsnFormat'));
  if (!code && required) add(['hsn_code'], t('partners.listProductsPage.hsnRequired'));
}

/**
 * The packaging and MRP rules the server enforces on a listing, run in the form
 * so the partner sees them on the field. The product's parcel is what every
 * variant falls back to, so it (and the HSN code) is required once the listing
 * ships through ShipRocket; a variant's own parcel is optional but bounded.
 * MRP — the store's struck-through price — may never sit below the price.
 */
export function listingRules(t: ListingTranslate) {
  return (values: ListingRuleValues, ctx: z.RefinementCtx<ListingRuleValues>) => {
    const add: AddIssue = (path, message) => ctx.addIssue({ code: 'custom', path, message });
    const shiprocket = values.delivery_target === 'SHIPROCKET';
    checkParcel(values, [], shiprocket, t, add);
    checkHsn(values.hsn_code, shiprocket, t, add);
    const days = values.shelf_life_days;
    if (days !== null && !(Number.isInteger(days) && days >= 0)) {
      add(['shelf_life_days'], t('partners.listProductsPage.shelfLife'));
    }
    values.variants.forEach((variant, index) => {
      checkParcel(variant, ['variants', index], false, t, add);
      const mrp = Number(variant.mrp) || 0;
      if (mrp !== 0 && mrp < (Number(variant.unit_cost) || 0)) {
        add(['variants', index, 'mrp'], t('partners.listProductsPage.mrpBelowPrice'));
      }
    });
  };
}
