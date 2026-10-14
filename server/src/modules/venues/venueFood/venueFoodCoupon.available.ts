import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueFoodCouponModel } from './venueFoodCoupon.model';
import { iso, objectId, rupees } from './venueFoodOrder.shared';

/**
 * The coupons a guest can pick from at a venue's food checkout — PUBLIC, so it
 * names only what the guest needs to choose: the code, what it gives, what it
 * needs and until when. Usage counts and per-person limits stay private; the
 * per-person limit is still checked when the code is applied (the preview) and
 * when the order is placed.
 *
 * A code the guest is shown here can still be refused at Pay — the cart may be
 * under its minimum, or its last use may have just gone — which is why the
 * preview and the placement remain the only places a coupon is ever accepted.
 */

/** A checkout lists a handful, best first; a venue with more keeps the rest for codes it hands out itself. */
const MAX_SHOWN = 10;

export async function availableFoodCoupons(venueId: string) {
  const id = objectId(venueId, 'Invalid venue id');
  const venue = await VenueModel.findById(id).select('status is_active offers_food food_ordering.enabled').lean();
  // A venue nobody can order from has nothing to offer at its checkout.
  if (venue?.status !== 'APPROVED' || venue.is_active === false || !venue.offers_food || !venue.food_ordering?.enabled) {
    return [];
  }
  const now = new Date();
  const coupons = await VenueFoodCouponModel.find({
    venue_id: id,
    is_active: true,
    $and: [
      { $or: [{ valid_from: null }, { valid_from: { $lte: now } }] },
      { $or: [{ valid_until: null }, { valid_until: { $gte: now } }] },
      { $or: [{ max_uses: null }, { $expr: { $lt: ['$used_count', '$max_uses'] } }] },
    ],
  })
    .select('code description discount_pct min_order_paise valid_until')
    .sort({ discount_pct: -1, min_order_paise: 1, code: 1 })
    .limit(MAX_SHOWN)
    .lean();
  return coupons.map((coupon) => ({
    code: coupon.code,
    description: coupon.description ?? '',
    discount_pct: coupon.discount_pct,
    min_order_amount: rupees(coupon.min_order_paise ?? 0),
    valid_until: iso(coupon.valid_until),
  }));
}
