/**
 * The minimum spend moves from a venue's pricing into its Fees & Minimum Spend
 * terms: copied once for each venue that set one, never over an amount already
 * set in the new place, and never removed from pricing (a rollback reads it).
 */
import { Types } from 'mongoose';
import { VenueModel } from '../../venue.model';
import { migrateVenueMinSpend } from '../../venue.minSpend.migration';

const seed = (doc: Record<string, unknown>) =>
  VenueModel.collection.insertOne({ owner_user_id: new Types.ObjectId(), venue_name: 'Loft', ...doc });

const offersOf = async (id: Types.ObjectId) => (await VenueModel.collection.findOne({ _id: id }))?.settings?.offers;

describe('migrateVenueMinSpend', () => {
  it("copies a venue's pricing minimum spend into its offer terms, keeping the old field", async () => {
    const { insertedId } = await seed({ pricing: { model: 'FLAT', min_spend: 5000 }, settings: { offers: { min_guests: 6 } } });
    await expect(migrateVenueMinSpend()).resolves.toEqual({ venues: 1 });
    expect(await offersOf(insertedId)).toEqual({ min_guests: 6, min_spend: 5000 });
    expect((await VenueModel.collection.findOne({ _id: insertedId }))?.pricing?.min_spend).toBe(5000);
  });

  it('leaves a venue that already has one in the new place, or never set one', async () => {
    const set = await seed({ pricing: { min_spend: 5000 }, settings: { offers: { min_spend: 0 } } });
    const none = await seed({ pricing: { min_spend: 0 }, settings: { offers: {} } });
    const bare = await seed({});
    await expect(migrateVenueMinSpend()).resolves.toEqual({ venues: 0 });
    expect(await offersOf(set.insertedId)).toEqual({ min_spend: 0 });
    expect(await offersOf(none.insertedId)).toEqual({});
    expect(await offersOf(bare.insertedId)).toBeUndefined();
  });

  it('is idempotent: a second boot changes nothing', async () => {
    await seed({ pricing: { min_spend: 1200 }, settings: { offers: {} } });
    await expect(migrateVenueMinSpend()).resolves.toEqual({ venues: 1 });
    await expect(migrateVenueMinSpend()).resolves.toEqual({ venues: 0 });
  });
});
