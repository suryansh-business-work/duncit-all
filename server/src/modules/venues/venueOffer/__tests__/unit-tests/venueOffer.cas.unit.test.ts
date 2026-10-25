/**
 * One move at a time: every move is written against the offer exactly as the
 * mover read it, and a page left open on an older round is refused before
 * anything is written.
 */
import { Types } from 'mongoose';
import type { GraphQLError } from 'graphql';
import { asRead, assertRound, nextMove, staleOffer } from '../../venueOffer.cas';
import type { IVenueSlot } from '../../../venueSlot/venueSlot.model';
import type { VenueOffer } from '../../venueOffer.types';

const id = new Types.ObjectId();
const podId = new Types.ObjectId();
const slotWith = (offer: Partial<VenueOffer> | null, pod: Types.ObjectId | null = podId) =>
  ({ _id: id, booked_by_pod_id: pod, offer }) as unknown as Pick<IVenueSlot, '_id' | 'booked_by_pod_id' | 'offer'>;

describe('asRead', () => {
  it('matches a pending booking still held for its pod, at the move counter the mover read', () => {
    expect(asRead(slotWith({ move: 3 }))).toEqual({ _id: id, status: 'PENDING', booked_by_pod_id: podId, 'offer.move': 3 });
  });

  it('matches an offer written before moves were counted as move 0', () => {
    expect(asRead(slotWith({ move: 0 }))).toEqual({
      _id: id,
      status: 'PENDING',
      booked_by_pod_id: podId,
      'offer.move': { $in: [0, null] },
    });
    expect(asRead(slotWith({}))['offer.move']).toEqual({ $in: [0, null] });
  });

  it('guards a booking without an offer, or without a pod, on what it does have', () => {
    expect(asRead(slotWith(null))).toEqual({ _id: id, status: 'PENDING', booked_by_pod_id: podId });
    expect(asRead(slotWith(null, null))).toEqual({ _id: id, status: 'PENDING' });
  });
});

describe('nextMove', () => {
  it('counts up from what was read, an uncounted offer starting at 1', () => {
    expect(nextMove({ move: 4 })).toBe(5);
    expect(nextMove({} as Pick<VenueOffer, 'move'>)).toBe(1);
  });
});

describe('assertRound', () => {
  it('lets a mover through on the round on the table, or when they sent none (an older app build)', () => {
    expect(() => assertRound({ round: 3 }, 3)).not.toThrow();
    expect(() => assertRound({ round: 3 }, undefined)).not.toThrow();
    expect(() => assertRound({ round: 3 }, null)).not.toThrow();
  });

  it('refuses a mover who read an older round', () => {
    let error: GraphQLError | null = null;
    try {
      assertRound({ round: 3 }, 2);
    } catch (e) {
      error = e as GraphQLError;
    }
    expect(error?.message).toBe('This offer was just answered or changed — refresh to see where it stands');
    expect(error?.extensions).toEqual({ code: 'CONFLICT', reason: 'OFFER_CHANGED' });
  });
});

describe('staleOffer', () => {
  it('names the conflict so a sweep can tell it from a real failure', () => {
    expect(staleOffer().extensions).toEqual({ code: 'CONFLICT', reason: 'OFFER_CHANGED' });
  });
});
