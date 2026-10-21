import { Types } from 'mongoose';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { venuePricingService } from '../../venuePricing.service';

/**
 * `venuePricing` is non-nullable field by field (base_rate, min_pax, …), so what
 * pricingFor answers must carry every field as a plain value — for a venue
 * created before pricing existed as much as for one that has saved it.
 */
describe('venuePricingService.pricingFor', () => {
  it('answers the defaults, unconfigured, for a venue stored before pricing existed', async () => {
    const _id = new Types.ObjectId();
    // A legacy document: no `pricing` key at all, exactly as older venues are stored.
    await VenueModel.collection.insertOne({ _id, owner_user_id: new Types.ObjectId(), venue_name: 'Dek Cafe', status: 'APPROVED', is_active: true } as never);

    const pricing = await venuePricingService.pricingFor(String(_id));

    expect(pricing).toMatchObject({
      model: null,
      base_rate: 0,
      min_pax: 0,
      booking_increment_minutes: 60,
      price_rules: [],
      blocked_dates: [],
      gst_enabled: false,
      configured: false,
    });
  });

  it('fills fields stored as an explicit null with their defaults', async () => {
    const _id = new Types.ObjectId();
    // A partial write left nulls behind; Mongoose defaults never replace a stored null.
    await VenueModel.collection.insertOne({
      _id,
      owner_user_id: new Types.ObjectId(),
      venue_name: 'Half Set Cafe',
      pricing: { model: 'PER_HOUR', base_rate: null, min_pax: null, price_rules: null, gst_enabled: null },
    } as never);

    const pricing = await venuePricingService.pricingFor(String(_id));

    expect(pricing).toMatchObject({
      model: 'PER_HOUR',
      base_rate: 0,
      min_pax: 0,
      price_rules: [],
      gst_enabled: false,
      booking_increment_minutes: 60,
    });
    // A rate of 0 is not a usable price, so the venue still reads as not set up.
    expect(pricing.configured).toBe(false);
  });

  it('answers the saved pricing as plain values', async () => {
    const venue = await VenueModel.create({ owner_user_id: new Types.ObjectId(), venue_name: 'Priced Cafe' });
    await VenueModel.updateOne({ _id: venue._id }, { $set: { 'pricing.model': 'PER_HOUR', 'pricing.base_rate': 800, 'pricing.min_hours': 2 } });

    const pricing = await venuePricingService.pricingFor(String(venue._id));

    expect(pricing).toMatchObject({ model: 'PER_HOUR', base_rate: 800, min_hours: 2 });
    expect(Object.keys(pricing)).toEqual(expect.arrayContaining(['base_rate', 'min_pax', 'deposit', 'configured']));
  });
});
