/**
 * The minimum spend moved from a venue's pricing (`pricing.min_spend`, a silent
 * top-up) into its booking-offer terms (`settings.offers.min_spend`, a rule an
 * offer must meet) — one Fees & Minimum Spend section. This copies the amount
 * across for every venue that set one and has none in the new place yet, so no
 * venue loses what it configured.
 *
 * Idempotent and additive: it only matches venues without the new field, and
 * never removes `pricing.min_spend` — the previous release still reads it, so
 * a rollback keeps every venue's amount. Safe on every boot.
 */
import { VenueModel } from './venue.model';

export async function migrateVenueMinSpend(): Promise<{ venues: number }> {
  const result = await VenueModel.collection.updateMany(
    { 'pricing.min_spend': { $gt: 0 }, 'settings.offers.min_spend': { $exists: false } },
    [{ $set: { 'settings.offers.min_spend': '$pricing.min_spend' } }]
  );
  return { venues: result.modifiedCount };
}
