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

/**
 * Seats one booking may take on a pod that declares no capacity of its own
 * (`no_of_spots` 0 = unlimited). There is nothing to derive an answer from
 * there, so the picker gets a small finite range rather than an endless one.
 */
export const UNLIMITED_POD_MAX_SEATS = 10;

/**
 * How many seats one booking may take: everything still free.
 *
 * This used to be clamped to 10 on every pod. A booking is ONE membership and
 * topping up an existing one is refused outright, so that ceiling meant a pod
 * with 11 seats left could not be taken in full by anybody — there was no
 * second booking available to make up the difference. The pod's own remaining
 * capacity is the only real limit, and `podSeatsAvailable` already excludes the
 * host's own seat.
 */
export function maxSeatsForBooking(pod: SeatCountable): number {
  const spots = pod.no_of_spots ?? 0;
  if (spots <= 0) return UNLIMITED_POD_MAX_SEATS;
  return podSeatsAvailable(pod);
}

/** Normalise a client-supplied seat count to a whole number ≥ 1. */
export function normalizeSeats(value: unknown): number {
  const seats = Math.floor(Number(value) || 1);
  return Math.max(1, seats);
}
