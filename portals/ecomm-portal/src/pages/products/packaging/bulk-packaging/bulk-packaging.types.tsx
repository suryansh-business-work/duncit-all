import { z } from 'zod';
import { measureOrUndefined, packagingMeasure } from '../../../../lib/packaging-rules';
import { makeRules } from '../../../../lib/rules';
import type { Translate } from '../../../../lib/translate';
import type { PackagingInput } from '../packaging-queries';

const HSN = /^\d{4,8}$/;

/**
 * Mirrors `storeBulkSetPackaging`: every value optional — a blank one keeps
 * what each product has — but a filled one inside the courier's bounds.
 */
export const makeBulkPackagingSchema = (t: Translate) =>
  z.object({
    weight_kg: packagingMeasure(t, 'kg', false),
    length_cm: packagingMeasure(t, 'cm', false),
    breadth_cm: packagingMeasure(t, 'cm', false),
    height_cm: packagingMeasure(t, 'cm', false),
    package_type: z.enum(['', 'BOX', 'POLYBAG', 'ENVELOPE', 'OTHER']),
    hsn_code: z.string().trim().refine((value) => value === '' || HSN.test(value), t('ecommPortal.productEditor.hsnRule')),
    is_fragile: z.boolean(),
    is_liquid: z.boolean(),
    shelf_life_days: makeRules(t).whole(),
  });

export type BulkPackagingValues = z.infer<ReturnType<typeof makeBulkPackagingSchema>>;

export const BULK_PACKAGING_DEFAULTS: BulkPackagingValues = {
  weight_kg: '',
  length_cm: '',
  breadth_cm: '',
  height_cm: '',
  package_type: '',
  hsn_code: '',
  is_fragile: false,
  is_liquid: false,
  shelf_life_days: '',
};

/**
 * Only what was filled in. A ticked flag is set on every product; an unticked
 * one is left alone (unticking cannot mean "clear it on all of them").
 */
export const toBulkPackagingInput = (values: BulkPackagingValues): PackagingInput => ({
  weight_kg: measureOrUndefined(values.weight_kg),
  length_cm: measureOrUndefined(values.length_cm),
  breadth_cm: measureOrUndefined(values.breadth_cm),
  height_cm: measureOrUndefined(values.height_cm),
  package_type: values.package_type || undefined,
  hsn_code: values.hsn_code || undefined,
  is_fragile: values.is_fragile || undefined,
  is_liquid: values.is_liquid || undefined,
  shelf_life_days: measureOrUndefined(values.shelf_life_days),
});
