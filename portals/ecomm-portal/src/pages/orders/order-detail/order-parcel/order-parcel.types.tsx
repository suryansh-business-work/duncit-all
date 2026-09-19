import { z } from 'zod';
import { PACKAGING_LIMITS } from '@duncit/utils';
import type { Translate } from '../../../../lib/translate';
import type { OrderParcel, ParcelInput } from '../../shipping-queries';

/** A typed value (text from the box) or a preset's number. */
const measure = (t: Translate, min: number, max: number, unit: 'kg' | 'cm') =>
  z
    .union([z.string(), z.number()])
    .refine((value) => {
      const n = Number(value);
      return String(value).trim() !== '' && Number.isFinite(n) && n >= min && n <= max;
    }, t('ecommPortal.shipping.parcelRange', { vars: { min, max, unit } }));

/** Mirrors `storeSetParcel`: every side and the weight, inside the courier's bounds. */
export const makeOrderParcelSchema = (t: Translate) => {
  const L = PACKAGING_LIMITS;
  return z.object({
    weight_kg: measure(t, L.minWeightKg, L.maxWeightKg, 'kg'),
    length_cm: measure(t, L.minSideCm, L.maxSideCm, 'cm'),
    breadth_cm: measure(t, L.minSideCm, L.maxSideCm, 'cm'),
    height_cm: measure(t, L.minSideCm, L.maxSideCm, 'cm'),
  });
};

export type OrderParcelValues = z.infer<ReturnType<typeof makeOrderParcelSchema>>;

/** Start from the parcel the order would send today. */
export const parcelDefaults = (parcel: OrderParcel): OrderParcelValues => ({
  weight_kg: parcel.weight_kg || '',
  length_cm: parcel.length_cm || '',
  breadth_cm: parcel.breadth_cm || '',
  height_cm: parcel.height_cm || '',
});

export const toParcelInput = (values: OrderParcelValues): ParcelInput => ({
  weight_kg: Number(values.weight_kg),
  length_cm: Number(values.length_cm),
  breadth_cm: Number(values.breadth_cm),
  height_cm: Number(values.height_cm),
});
