/**
 * Seat arithmetic for a pod — the single definition of "how full is this pod".
 *
 * Occupancy used to be `pod_attendees.length`, which was exact while every
 * booking was one person = one seat. Multi-seat booking breaks that: the buyer
 * still appears in `pod_attendees` exactly once (it is an identity list driving
 * chat access, permissions and audience fan-outs — duplicating an id there
 * would corrupt all three), so the seats they hold beyond their own live in
 * `Pod.extra_seats`.
 *
 * A leaf module on purpose: it imports nothing, so pod, podMember, finance and
 * inventory can all share it without an import cycle.
 */

interface SeatCountable {
  pod_attendees?: unknown[] | null;
  extra_seats?: number | null;
  no_of_spots?: number | null;
}

/** People in the pod (hosts included) plus every extra seat they bought. */
export function podSeatsTaken(pod: SeatCountable): number {
  return (pod.pod_attendees?.length ?? 0) + (pod.extra_seats ?? 0);
}

/**
 * Seats still bookable. `no_of_spots` of 0 means unlimited, which has no
 * meaningful maximum — callers cap the picker themselves.
 */
export function podSeatsAvailable(pod: SeatCountable): number {
  const spots = pod.no_of_spots ?? 0;
  if (spots <= 0) return 0;
  return Math.max(spots - podSeatsTaken(pod), 0);
}

/** How many seats one booking may take: what is free, capped for sanity. */
export const MAX_SEATS_PER_BOOKING = 10;

export function maxSeatsForBooking(pod: SeatCountable): number {
  const spots = pod.no_of_spots ?? 0;
  if (spots <= 0) return MAX_SEATS_PER_BOOKING;
  return Math.min(podSeatsAvailable(pod), MAX_SEATS_PER_BOOKING);
}

/** Normalise a client-supplied seat count to a whole number ≥ 1. */
export function normalizeSeats(value: unknown): number {
  const seats = Math.floor(Number(value) || 1);
  return seats < 1 ? 1 : seats;
}
