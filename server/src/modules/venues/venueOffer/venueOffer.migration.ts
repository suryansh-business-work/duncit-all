/**
 * "For the slot" is no longer a way to pay a venue: it priced exactly as a
 * flat price for the picked window (the calculator always read it as FLAT), so
 * every offer stored with it is the same money as FLAT. This rewrites those
 * rows — the booking's offer, the venue's counter, each history step, the
 * agreed basis and every chat line's frozen terms — so nothing on record names
 * a model the API no longer carries.
 *
 * Idempotent (it only matches PER_SLOT) and safe in both directions: FLAT is a
 * value the previous release reads too, so it runs on every boot like the other
 * repairs.
 */
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { VenueChatMessageModel } from '@microservices/chat/venue/venueChat.model';

const RETIRED = 'PER_SLOT';
const FLAT = 'FLAT';

export type PerSlotMigrationResult = {
  offers: number;
  counters: number;
  history: number;
  bases: number;
  chat_lines: number;
};

export async function migratePerSlotOffers(): Promise<PerSlotMigrationResult> {
  const [offers, counters, history, bases, chat] = await Promise.all([
    VenueSlotModel.updateMany({ 'offer.model': RETIRED }, { $set: { 'offer.model': FLAT } }),
    VenueSlotModel.updateMany({ 'offer.counter.model': RETIRED }, { $set: { 'offer.counter.model': FLAT } }),
    VenueSlotModel.updateMany(
      { 'offer.history.model': RETIRED },
      { $set: { 'offer.history.$[step].model': FLAT } },
      { arrayFilters: [{ 'step.model': RETIRED }] }
    ),
    VenueSlotModel.updateMany({ 'price_basis.model': RETIRED }, { $set: { 'price_basis.model': FLAT } }),
    VenueChatMessageModel.updateMany({ 'offer.model': RETIRED }, { $set: { 'offer.model': FLAT } }),
  ]);
  return {
    offers: offers.modifiedCount,
    counters: counters.modifiedCount,
    history: history.modifiedCount,
    bases: bases.modifiedCount,
    chat_lines: chat.modifiedCount,
  };
}

