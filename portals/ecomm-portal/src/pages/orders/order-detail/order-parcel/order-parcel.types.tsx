import { z } from 'zod';
import { packagingMeasure } from '../../../../lib/packaging-rules';
import type { Translate } from '../../../../lib/translate';
import type { OrderParcel, ParcelInput } from '../../shipping-queries';

/** Mirrors `storeSetParcel`: every side and the weight, inside the courier's bounds. */
export const makeOrderParcelSchema = (t: Translate) =>
  z.object({
    weight_kg: packagingMeasure(t, 'kg', true),
    length_cm: packagingMeasure(t, 'cm', true),
    breadth_cm: packagingMeasure(t, 'cm', true),
    height_cm: packagingMeasure(t, 'cm', true),
  });

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
