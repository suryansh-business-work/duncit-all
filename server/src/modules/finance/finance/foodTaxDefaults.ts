import { GraphQLError } from 'graphql';
import {
  VENUE_FOOD_GST_PCT_MAX,
  VENUE_FOOD_TAX_DEFAULTS,
  VENUE_FOOD_TAX_MODES,
} from '@modules/venues/venue/venue.constants';
import { logs } from '@observability/log';
import type { VenueFoodTaxMode } from '@modules/venues/venue/venue.model';
import { FinanceSettingsModel, getFinanceSettings, type IFinanceSettings } from './finance.model';

/**
 * GST on venue food orders: Finance's default (Finance → Food Menu Defaults),
 * and the one rule that says which applies to a venue — its own override, or
 * that default. Placing an order, previewing a coupon and the public venue all
 * read the tax through `effectiveFoodTax`, so a client never decides it.
 */

export interface FoodTax {
  tax_mode: VenueFoodTaxMode;
  gst_pct: number;
}

/** What a venue stores beside its ordering switch. Absent on a venue saved before tax existed. */
export interface FoodTaxOverride {
  tax_override?: boolean | null;
  tax_mode?: string | null;
  gst_pct?: number | null;
}

const bad = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
};

export const isFoodTaxMode = (value: unknown): value is VenueFoodTaxMode =>
  (VENUE_FOOD_TAX_MODES as readonly unknown[]).includes(value);

/** A whole GST percent from 0 to the top slab, or a refusal naming the range. */
export function foodGstPct(raw: unknown): number {
  const pct = Number(raw);
  if (raw === null || raw === '' || !Number.isInteger(pct) || pct < 0 || pct > VENUE_FOOD_GST_PCT_MAX) {
    bad(`GST must be a whole number from 0 to ${VENUE_FOOD_GST_PCT_MAX}`);
  }
  return pct;
}

export function foodTaxMode(raw: unknown): VenueFoodTaxMode {
  if (!isFoodTaxMode(raw)) bad('Choose whether prices include GST or have it added');
  return raw as VenueFoodTaxMode;
}

/** Finance's default out of a settings document already read. One written before this existed reads the shipped default. */
export const foodTaxDefaultsOf = (doc: Pick<IFinanceSettings, 'food_tax_mode' | 'food_gst_pct'>): FoodTax => ({
  tax_mode: isFoodTaxMode(doc.food_tax_mode) ? doc.food_tax_mode : VENUE_FOOD_TAX_DEFAULTS.tax_mode,
  gst_pct: doc.food_gst_pct ?? VENUE_FOOD_TAX_DEFAULTS.gst_pct,
});

/** Finance's default, with when the settings last changed. */
export async function getFoodTaxDefaults(): Promise<FoodTax & { updated_at: string }> {
  const doc = await getFinanceSettings();
  return { ...foodTaxDefaultsOf(doc), updated_at: doc.updated_at.toISOString() };
}

/**
 * Set Finance's default. Two dotted fields, never the whole settings document,
 * and a log line carrying who changed it from what — the setting decides how
 * every venue without its own override bills its guests.
 */
export async function updateFoodTaxDefaults(input: { tax_mode: unknown; gst_pct: unknown }, actorId: string | null) {
  const next = { food_tax_mode: foodTaxMode(input.tax_mode), food_gst_pct: foodGstPct(input.gst_pct) };
  const before = await getFoodTaxDefaults();
  await FinanceSettingsModel.updateOne({ singleton_key: 'finance' }, { $set: next });
  logs.server.info('finance-settings', 'foodTaxDefaults', {
    actorId,
    before: { tax_mode: before.tax_mode, gst_pct: before.gst_pct },
    after: { tax_mode: next.food_tax_mode, gst_pct: next.food_gst_pct },
  });
  return getFoodTaxDefaults();
}

/** The tax a venue's orders are priced with: its own while it overrides, otherwise Finance's default. */
export function effectiveFoodTax(override: FoodTaxOverride | null | undefined, defaults: FoodTax): FoodTax {
  if (override?.tax_override !== true) return { tax_mode: defaults.tax_mode, gst_pct: defaults.gst_pct };
  return {
    tax_mode: isFoodTaxMode(override.tax_mode) ? override.tax_mode : defaults.tax_mode,
    gst_pct: override.gst_pct ?? defaults.gst_pct,
  };
}
