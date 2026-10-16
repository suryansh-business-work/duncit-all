import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { VenueModel } from '@modules/venues/venue/venue.model';

/**
 * Whether a venue's refundable rental deposits are taxed with the rent — a tax
 * decision the Venues console makes per venue (default on, as every deposit
 * was taxed before the switch existed). A checkout freezes the answer on its
 * payment, so changing it never re-prices a booking already paid.
 */
export async function setVenueRentalDepositGst(actorId: string, venueId: string, chargeGst: boolean) {
  if (!Types.ObjectId.isValid(venueId)) {
    throw new GraphQLError('Venue not found', { extensions: { code: 'NOT_FOUND' } });
  }
  // A plain update: the venue change log records it through its model hook.
  const venue = await VenueModel.findByIdAndUpdate(
    venueId,
    { $set: { rental_deposit_gst: chargeGst } },
    { new: true }
  )
    .select('rental_deposit_gst')
    .lean();
  if (!venue) throw new GraphQLError('Venue not found', { extensions: { code: 'NOT_FOUND' } });
  logs.server.info('rentalVenueSettings', 'setVenueRentalDepositGst', {
    actor_user_id: actorId,
    venue_id: venueId,
    charge_gst: chargeGst,
  });
  return { venue_id: venueId, rental_deposit_gst: venue.rental_deposit_gst !== false };
}
