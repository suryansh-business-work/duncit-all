import { Types } from 'mongoose';
import { PartnerIntegrationModel } from '@modules/venues/ecommBrand/partnerIntegration.model';
import { buildVenueFoodPatch, type VenueFoodState } from '../../venue.food';
import type { IVenueFoodItem } from '../../venue.model';

/**
 * Linking the Razorpay account a venue's food orders are charged on, against
 * the in-memory database. Guests pay the venue's OWN account, so the only
 * account a venue may link is one its owner saved and that passed its
 * connection check.
 */

const owner = new Types.ObjectId();

const servingVenue = (): VenueFoodState => ({
  owner_user_id: owner,
  offers_food: true,
  food_menu: [{ _id: new Types.ObjectId(), name: 'Paneer Tikka', price: 240, is_available: true } as unknown as IVenueFoodItem],
});

async function connection(over: { owner?: Types.ObjectId; provider?: 'RAZORPAY' | 'SHIPROCKET'; connected?: boolean } = {}) {
  const account = await PartnerIntegrationModel.create({
    owner_user_id: over.owner ?? owner,
    provider: over.provider ?? 'RAZORPAY',
    integrations: { razorpay: { key_id: 'rzp_test_venue', key_secret: 'venue-secret', connected: over.connected ?? true } },
  });
  return account._id.toHexString();
}

const link = (razorpay_integration_id: string) =>
  buildVenueFoodPatch({ food_ordering: { enabled: true, razorpay_integration_id } }, servingVenue());

describe('linking the Razorpay account food orders are paid into', () => {
  it("links the owner's own working account and lets ordering switch on", async () => {
    const id = await connection();
    const result = await link(id);
    if (!('food_ordering' in result)) throw new Error('expected a food patch');
    expect(result.food_ordering.enabled).toBe(true);
    expect(result.food_ordering.razorpay_integration_id?.toHexString()).toBe(id);
  });

  it("refuses another owner's account, and the owner's account of another kind", async () => {
    const theirs = await connection({ owner: new Types.ObjectId() });
    const shipping = await connection({ provider: 'SHIPROCKET' });
    for (const id of [theirs, shipping]) {
      await expect(link(id)).rejects.toThrow('That Razorpay account does not belong to the owner of this venue');
    }
  });

  it('refuses an account that does not exist', async () => {
    await expect(link(new Types.ObjectId().toHexString())).rejects.toThrow(
      'That Razorpay account does not belong to the owner of this venue'
    );
  });

  it('refuses an account that has not passed its connection check', async () => {
    const pending = await connection({ connected: false });
    await expect(link(pending)).rejects.toMatchObject({
      message: 'That Razorpay account has not passed its connection check yet',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });
});
