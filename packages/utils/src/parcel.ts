/**
 * The parcel arithmetic ShipRocket bills by, for the product forms' live
 * readout.
 *
 * A courier charges the HIGHER of the dead weight and the volumetric weight
 * (L × B × H in cm / 5000). Twin of `server/src/modules/commerce/shiprocket/
 * shiprocket.parcel.ts` — the server cannot import `@duncit/*` (rule 40), so
 * the two are kept in step by their tests.
 */
export const VOLUMETRIC_DIVISOR = 5000;

/** The bounds the server enforces on a packed unit. */
export const PACKAGING_LIMITS = {
  minWeightKg: 0.05,
  maxWeightKg: 50,
  minSideCm: 0.5,
  maxSideCm: 300,
} as const;

/** How a unit is packed for the courier. */
export type PackageType = 'BOX' | 'POLYBAG' | 'ENVELOPE' | 'OTHER';
export const PACKAGE_TYPES: readonly PackageType[] = ['BOX', 'POLYBAG', 'ENVELOPE', 'OTHER'];

/** One packed unit's dimensions. */
export interface ParcelDims {
  weight_kg: number;
  length_cm: number;
  breadth_cm: number;
  height_cm: number;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const positive = (n: unknown) => Math.max(0, Number(n) || 0);

export const volumetricWeightKg = (length: number, breadth: number, height: number): number =>
  round3((positive(length) * positive(breadth) * positive(height)) / VOLUMETRIC_DIVISOR);

export const chargeableWeightKg = (d: ParcelDims): number =>
  round3(Math.max(positive(d.weight_kg), volumetricWeightKg(d.length_cm, d.breadth_cm, d.height_cm)));

/**
 * What the courier will bill, and whether the box is the reason: `boxHeavier`
 * is true when the volumetric weight beats the packed weight — the form's
 * "Box is too big for the weight" hint.
 */
export function parcelWeights(d: ParcelDims) {
  const volumetric = volumetricWeightKg(d.length_cm, d.breadth_cm, d.height_cm);
  const chargeable = chargeableWeightKg(d);
  return { volumetric, chargeable, boxHeavier: volumetric > positive(d.weight_kg) };
}

/** The dimension fields still missing or out of bounds (0 = not entered yet). */
export function packagingGaps(d: Partial<ParcelDims>): (keyof ParcelDims)[] {
  const gaps: (keyof ParcelDims)[] = [];
  if (positive(d.weight_kg) < PACKAGING_LIMITS.minWeightKg) gaps.push('weight_kg');
  for (const side of ['length_cm', 'breadth_cm', 'height_cm'] as const) {
    if (positive(d[side]) < PACKAGING_LIMITS.minSideCm) gaps.push(side);
  }
  return gaps;
}

/** A one-click starting point for a common pet-store pack. Everything stays editable. */
export interface PackagingPreset extends ParcelDims {
  id: string;
  /** Localization key — rule 38. */
  labelKey: string;
  package_type: PackageType;
}

export const PACKAGING_PRESETS: readonly PackagingPreset[] = [
  { id: 'small-pouch', labelKey: 'packaging.preset.smallPouch', package_type: 'POLYBAG', length_cm: 20, breadth_cm: 15, height_cm: 5, weight_kg: 0.3 },
  { id: 'treat-box', labelKey: 'packaging.preset.treatBox', package_type: 'BOX', length_cm: 25, breadth_cm: 20, height_cm: 10, weight_kg: 0.8 },
  { id: 'food-bag-3', labelKey: 'packaging.preset.foodBag3', package_type: 'POLYBAG', length_cm: 40, breadth_cm: 28, height_cm: 10, weight_kg: 3.2 },
  { id: 'food-bag-10', labelKey: 'packaging.preset.foodBag10', package_type: 'POLYBAG', length_cm: 60, breadth_cm: 40, height_cm: 15, weight_kg: 10.4 },
  { id: 'toy-box', labelKey: 'packaging.preset.toyBox', package_type: 'BOX', length_cm: 30, breadth_cm: 20, height_cm: 15, weight_kg: 0.6 },
  { id: 'bed-large', labelKey: 'packaging.preset.bedLarge', package_type: 'BOX', length_cm: 70, breadth_cm: 50, height_cm: 20, weight_kg: 2.5 },
];
