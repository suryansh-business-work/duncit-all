/**
 * One move at a time. Both sides answer an offer from a page that may be
 * minutes old, and a venue accepting while the host counters must not end with
 * both landing — the venue would have accepted terms that were no longer on the
 * table. Every move is therefore written against the offer exactly as the mover
 * read it: still PENDING, still at the move counter they saw. The first write
 * wins; the other matches nothing and is told to look again.
 */
import { GraphQLError } from 'graphql';
import type { IVenueSlot } from '@modules/venues/venueSlot/venueSlot.model';
import type { VenueOffer } from './venueOffer.types';

/** The filter that matches this booking only as it was read. */
export function asRead(slot: Pick<IVenueSlot, '_id' | 'booked_by_pod_id' | 'offer'>): Record<string, unknown> {
  const filter: Record<string, unknown> = { _id: slot._id, status: 'PENDING' };
  if (slot.booked_by_pod_id) filter.booked_by_pod_id = slot.booked_by_pod_id;
  if (slot.offer) {
    const move = slot.offer.move ?? 0;
    // An offer written before moves were counted has no field: it reads as 0.
    filter['offer.move'] = move === 0 ? { $in: [0, null] } : move;
  }
  return filter;
}

/** The next move number, written in the same update as the move itself. */
export const nextMove = (offer: Pick<VenueOffer, 'move'>) => (offer.move ?? 0) + 1;

export const staleOffer = () =>
  new GraphQLError('This offer was just answered or changed — refresh to see where it stands', {
    extensions: { code: 'CONFLICT', reason: 'OFFER_CHANGED' },
  });

/**
 * The round the mover saw, checked before anything is written: a page left open
 * on round 2 cannot accept round 3's terms. Omitted by app builds from before
 * rounds were sent — their move is still guarded by `asRead`.
 */
export function assertRound(offer: Pick<VenueOffer, 'round'>, round?: number | null) {
  if (round !== undefined && round !== null && Number(round) !== offer.round) throw staleOffer();
}
