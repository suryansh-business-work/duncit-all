import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { ClubModel } from '@modules/clubs/club/club.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { podSeatsTaken } from './pod.seats';

/**
 * How big a pod that ALREADY EXISTS may be resized to.
 *
 * Create-a-Pod answers this from the slot the host is about to book, which the
 * picker still has in hand. A live pod has none of that on the client: its slot
 * is BOOKED, so `venueAvailableSlots` no longer returns it, and the sub-category
 * minimum lives two documents away. Every surface that resizes a live pod — the
 * host's Edit Pod sheet on mWeb and native, the Club Admin console and Admin >
 * Pod Management — therefore asks the SERVER for the range, and the same
 * function guards the write. One answer, so a client can never offer a seat the
 * write would refuse (or refuse one it would accept).
 */

/** Ceiling for a pod with no venue slot to cap it (mirrors the schema's max). */
export const SPOTS_HARD_MAX = 10000;

export interface PodSpotLimits {
  /** Spots the pod declares today. */
  current: number;
  /** Lowest capacity this viewer may set. */
  min: number;
  /** Highest capacity — the booked space's own capacity, when it has one. */
  max: number;
  /** Seats already held: attendees plus every extra seat a booking bought. */
  seats_taken: number;
  /** The booked space's capacity, or 0 when the pod books no capped space. */
  venue_capacity: number;
  /** The activity's own floor, from the club's sub-category (0 = none). */
  min_pax: number;
  /** True when there is a real range to drag across rather than a fixed number. */
  slidable: boolean;
  /** False for a host: they may only ever raise a live pod's capacity. */
  can_decrease: boolean;
}

/** The venue space's capacity, or 0 when the pod books nothing capped. */
async function venueCapacityOf(pod: any): Promise<number> {
  if (!pod?.venue_slot_id) return 0;
  const slot = await VenueSlotModel.findById(pod.venue_slot_id).select('capacity').lean();
  return Math.max(0, Math.floor(Number(slot?.capacity) || 0));
}

/** The fewest people the pod's activity needs, from its club's sub-category. */
async function minPaxOf(pod: any): Promise<number> {
  if (!pod?.club_id || !Types.ObjectId.isValid(String(pod.club_id))) return 0;
  const club = await ClubModel.findById(String(pod.club_id)).select('category_id').lean();
  const subId = club?.category_id ? String(club.category_id) : '';
  if (!subId) return 0;
  const sub = await CategoryModel.findById(subId).select('min_pax').lean();
  return Math.max(0, Math.floor(Number(sub?.min_pax) || 0));
}

/**
 * The range for one pod and one kind of viewer.
 *
 * A HOST may only grow a live pod: people have already bought into the size
 * they were shown, and shrinking is a decision with refunds behind it. An
 * ADMIN or CLUB ADMIN may also shrink, but never below the seats already sold —
 * that would strand a paid booking outside its own pod.
 */
export async function resolveSpotLimits(
  pod: any,
  options: Readonly<{ canDecrease: boolean }>
): Promise<PodSpotLimits> {
  const current = Math.max(0, Math.floor(Number(pod?.no_of_spots) || 0));
  const seatsTaken = podSeatsTaken(pod);
  // A completed pod is already settled — its payout was split across exactly
  // the seats it had — and a cancelled one never happened. Neither has a range
  // left to pick inside, so both report their size as fixed rather than
  // offering a control the write below would refuse.
  if (pod?.completed_at || pod?.deleted_at) {
    return {
      current,
      min: current,
      max: current,
      seats_taken: seatsTaken,
      venue_capacity: 0,
      min_pax: 0,
      slidable: false,
      can_decrease: false,
    };
  }
  const [venueCapacity, minPax] = await Promise.all([venueCapacityOf(pod), minPaxOf(pod)]);
  const floor = options.canDecrease ? Math.max(minPax, seatsTaken) : Math.max(minPax, seatsTaken, current);
  const ceiling = venueCapacity > 0 ? venueCapacity : SPOTS_HARD_MAX;
  // A pod already sized past its space's capacity (the space was shrunk after
  // the booking) keeps its size rather than reporting an impossible range.
  const max = Math.max(floor, ceiling, current);
  return {
    current,
    min: floor,
    max,
    seats_taken: seatsTaken,
    venue_capacity: venueCapacity,
    min_pax: minPax,
    // Dragging across 0 – 10,000 is useless, so a pod with no capped space
    // keeps the plain number field — exactly as Create-a-Pod does.
    slidable: venueCapacity > 0 && max > floor,
    can_decrease: options.canDecrease,
  };
}

/**
 * Refuses a capacity the range above does not allow.
 *
 * Called on EVERY write that can change `no_of_spots` on an existing pod, so a
 * direct API call cannot do what the sliders will not.
 */
export async function assertSpotsWithinLimits(
  pod: any,
  nextSpots: number,
  options: Readonly<{ canDecrease: boolean }>
): Promise<void> {
  const spots = Math.floor(Number(nextSpots) || 0);
  const limits = await resolveSpotLimits(pod, options);
  if (spots === limits.current) return;
  if (pod?.completed_at || pod?.deleted_at) {
    throw new GraphQLError('This pod is closed — its spots can no longer be changed', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (spots < limits.current && !options.canDecrease) {
    throw new GraphQLError(
      'A live pod’s spots can only be increased — ask your Club Admin to reduce them',
      { extensions: { code: 'BAD_USER_INPUT' } }
    );
  }
  if (spots < limits.seats_taken) {
    throw new GraphQLError(
      `${limits.seats_taken} seats are already booked — the pod cannot hold fewer than that`,
      { extensions: { code: 'BAD_USER_INPUT' } }
    );
  }
  if (limits.venue_capacity > 0 && spots > limits.venue_capacity) {
    throw new GraphQLError(
      `The booked space holds ${limits.venue_capacity} people — the pod cannot have more spots than that`,
      { extensions: { code: 'BAD_USER_INPUT' } }
    );
  }
  if (spots > SPOTS_HARD_MAX) {
    throw new GraphQLError(`A pod cannot have more than ${SPOTS_HARD_MAX} spots`, {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}
