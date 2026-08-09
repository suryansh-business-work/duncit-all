/**
 * The Step-4 pricing copy, resolved against the app's bundled English.
 *
 * The text itself lives in the shared catalogue (`mweb.createPod.*`) and every
 * component reads it through `t()`, so this file holds no copy of its own — it
 * only gives callers that run outside React (the schema's module-level export,
 * and the pricing tests) the same English the panel renders.
 */
import { fallbackT } from '@/i18n/fallback';

/**
 * One description per suggested tier, in ladder order (cheapest first). The
 * server returns at most 5 rows, so index i always has a description.
 */
export const SUGGESTED_PRICE_TIER_KEYS = [
  'mweb.createPod.priceTier1',
  'mweb.createPod.priceTier2',
  'mweb.createPod.priceTier3',
  'mweb.createPod.priceTier4',
  'mweb.createPod.priceTier5',
];

export const SUGGESTED_PRICE_TIERS = SUGGESTED_PRICE_TIER_KEYS.map((key) => fallbackT(key));

/** The tier line for a ladder row, in the bundled English. The server caps the
 * ladder at 5 rows, so a higher index only happens if that cap ever moves — it
 * degrades to no line. */
export function tierDescription(index: number): string {
  return SUGGESTED_PRICE_TIERS[index] ?? '';
}
