import { VenueFoodOrderModel } from './venueFoodOrder.model';
import { objectId } from './venueFoodOrder.shared';

/**
 * What guests think of a venue's food: the average of every rated order and
 * how many rated it. A guest rates the ORDER, not each dish (the feedback is
 * one rating per order), so this is the venue's food rating — the same number
 * the menu header and every dish's page show.
 *
 * One aggregation over the partial `venue_id, feedback.rating` index, which
 * holds only rated orders. Public, takes no caller, and its answer depends on
 * the venue id alone — so the Redis response cache holds it for its TTL.
 */
export async function venueFoodRating(venueId: string) {
  const id = objectId(venueId, 'Invalid venue id');
  const [row] = await VenueFoodOrderModel.aggregate<{ count: number; average: number }>([
    { $match: { venue_id: id, 'feedback.rating': { $exists: true } } },
    { $group: { _id: null, count: { $sum: 1 }, average: { $avg: '$feedback.rating' } } },
  ]);
  const count = row?.count ?? 0;
  return {
    venue_id: id.toHexString(),
    // One decimal, as the stars beside it read; 0 when nobody has rated yet.
    average: count > 0 ? Math.round((row?.average ?? 0) * 10) / 10 : 0,
    count,
  };
}
