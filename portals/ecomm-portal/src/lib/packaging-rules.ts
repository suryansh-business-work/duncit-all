import { z } from 'zod';
import { PACKAGING_LIMITS } from '@duncit/utils';
import type { Translate } from './translate';

/**
 * One packed measurement — a weight in kg or a side in cm — inside the courier's
 * bounds. The box holds text while it is typed and a preset writes text too,
 * so the value is text or a number; `required` decides whether blank is allowed.
 */
export function packagingMeasure(t: Translate, unit: 'kg' | 'cm', required: boolean) {
  const L = PACKAGING_LIMITS;
  const [min, max] = unit === 'kg' ? [L.minWeightKg, L.maxWeightKg] : [L.minSideCm, L.maxSideCm];
  return z.union([z.string(), z.number()]).refine((value) => {
    const text = String(value).trim();
    if (text === '') return !required;
    const n = Number(text);
    return Number.isFinite(n) && n >= min && n <= max;
  }, t('ecommPortal.shipping.parcelRange', { vars: { min, max, unit } }));
}

/** A measurement as the server takes it: a number, or undefined for "leave it as it is". */
export const measureOrUndefined = (value: string | number): number | undefined =>
  String(value).trim() === '' ? undefined : Number(value);
