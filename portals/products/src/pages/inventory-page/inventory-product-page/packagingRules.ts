import type { z } from 'zod';
import { PACKAGING_LIMITS, type ParcelDims } from '@duncit/utils';

/** The portal's `t` (rule 38) — every message below is a catalogue key. */
export type Translate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

/** GST HSN code: 4 to 8 digits (pet food 2309, toys 9503). Mirrors the server's check. */
const HSN_PATTERN = /^\d{4,8}$/;

interface DimRule {
  key: keyof ParcelDims;
  min: number;
  max: number;
  /** Names the missing field — "Enter the packed weight…", never a bare "Required". */
  required: string;
  range: string;
}

const L = PACKAGING_LIMITS;
const DIM_RULES: readonly DimRule[] = [
  { key: 'weight_kg', min: L.minWeightKg, max: L.maxWeightKg, required: 'products.validation.weightRequired', range: 'products.validation.weightRange' },
  { key: 'length_cm', min: L.minSideCm, max: L.maxSideCm, required: 'products.validation.lengthRequired', range: 'products.validation.sideRange' },
  { key: 'breadth_cm', min: L.minSideCm, max: L.maxSideCm, required: 'products.validation.breadthRequired', range: 'products.validation.sideRange' },
  { key: 'height_cm', min: L.minSideCm, max: L.maxSideCm, required: 'products.validation.heightRequired', range: 'products.validation.sideRange' },
];

/** The values the rules read — the product form's own fields. */
export interface CatalogueRuleValues extends ParcelDims {
  brand_name: string;
  delivery_target: string;
  hsn_code: string;
  shelf_life_days: number | null;
  mrp: number;
  unit_cost: number;
}

/** One packed dimension's message, or null. Blank (0) is only an error when ShipRocket rates the parcel. */
function dimMessage(rule: DimRule, raw: unknown, required: boolean, t: Translate): string | null {
  const value = Number(raw) || 0;
  if (value === 0) return required ? t(rule.required) : null;
  if (value < rule.min || value > rule.max) return t(rule.range, { vars: { min: rule.min, max: rule.max } });
  return null;
}

function hsnMessage(raw: string, required: boolean, t: Translate): string | null {
  const code = raw.trim();
  if (!code) return required ? t('products.validation.hsnRequired') : null;
  return HSN_PATTERN.test(code) ? null : t('products.validation.hsnFormat');
}

const isShelfLife = (days: unknown) => days === null || (Number.isInteger(days) && Number(days) >= 0);

/**
 * The catalogue rules the server enforces on save, run in the form so the
 * operator sees them on the field: a brand, a packed parcel (weight + L × B × H)
 * and an HSN code whenever the product ships through ShipRocket, a whole-day
 * shelf life, and an MRP (the store's struck-through price) never below the
 * price. The store sells at `unit_cost`, so that is the price MRP is held to.
 */
export function catalogueRules(t: Translate) {
  return (values: CatalogueRuleValues, ctx: z.RefinementCtx<CatalogueRuleValues>) => {
    const add = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
    const shiprocket = values.delivery_target === 'SHIPROCKET';
    if (!values.brand_name.trim()) add('brand_name', t('products.validation.brandRequired'));
    for (const rule of DIM_RULES) {
      const message = dimMessage(rule, values[rule.key], shiprocket, t);
      if (message) add(rule.key, message);
    }
    const hsn = hsnMessage(values.hsn_code, shiprocket, t);
    if (hsn) add('hsn_code', hsn);
    if (!isShelfLife(values.shelf_life_days)) add('shelf_life_days', t('products.validation.shelfLife'));
    const mrp = Number(values.mrp) || 0;
    if (mrp !== 0 && mrp < (Number(values.unit_cost) || 0)) add('mrp', t('products.validation.mrpBelowPrice'));
  };
}
