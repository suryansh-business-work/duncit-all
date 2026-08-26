/**
 * Pod spot economics — one copy of the "the host's spot is free" rule.
 *
 * A pod's host is added to `pod_attendees` when the pod is created and never
 * pays, so a 30-spot pod can only ever sell 29 seats. EVERY money figure derived
 * from a spot count (projected collection, host income, per-spot product share)
 * must bill this number, never the raw capacity — otherwise Create-a-Pod, the
 * finance calculator and the real settlement disagree by one ticket.
 *
 * Mirrored server-side by `payableSpots` in
 * server/src/modules/finance/finance/breakdown.math.ts.
 */

/** Copy shown next to any spots-driven money figure. */
export const HOST_FREE_SPOT_NOTE =
  'Your spot is free — the calculation is based on total spots − 1.';

/**
 * Spots that can actually be sold: total − 1, because the host occupies one for
 * free. `0` (unlimited/unset) and `1` (host-only) both bill nothing, so this
 * never returns a negative.
 */
export function payableSpots(totalSpots: number): number {
  if (!Number.isFinite(totalSpots) || totalSpots <= 0) return 0;
  return Math.floor(totalSpots) - 1;
}

export interface SpotsBounds {
  min: number;
  max: number;
  /** True when the host has a real range to choose from, so a slider is useful. */
  slidable: boolean;
}

/** Hard ceiling for a pod with no venue to cap it (mirrors the schema's max). */
export const SPOTS_HARD_MAX = 10000;

/**
 * The range a host may size a pod within: never below the sub-category's
 * minimum (an admin says a doubles game needs 4), never above the capacity of
 * the venue space they booked.
 *
 * A virtual pod has no venue, so it is only floored, not capped. When the venue
 * capacity is at or below the minimum there is nothing to choose — `slidable`
 * is false and the caller shows a fixed number instead of a dead slider.
 *
 * Shared so mWeb, native and the portal pod-form agree on the bounds even
 * though their controls are different components (rules 27 + 40).
 */
export function spotsBounds(input: {
  minPax?: number | null;
  venueCapacity?: number | null;
}): SpotsBounds {
  const min = Math.max(0, Math.floor(Number(input.minPax) || 0));
  const capacity = Math.floor(Number(input.venueCapacity) || 0);
  const hasCapacity = capacity > 0;
  const max = Math.max(min, hasCapacity ? capacity : SPOTS_HARD_MAX);
  // A slider needs BOTH ends to be real. With no venue the ceiling is the
  // schema's 10,000, and dragging across that range is useless — those pods keep
  // the numeric stepper, still floored by the minimum.
  return { min, max, slidable: hasCapacity && max > min };
}

/**
 * The range a pod that ALREADY EXISTS may be resized within, as the server's
 * `podSpotLimits` answers it.
 *
 * A new pod's ceiling comes from the slot its author is picking, which
 * `spotsBounds` above derives on the client. A live pod's slot is BOOKED, so
 * nothing the client can read still carries the capacity — and the seats
 * already sold, which set the floor, were never on the client at all. The
 * server answers both, and guards the write with the same rules.
 *
 * The shape lives here so mWeb, the portals' pod form and the native app read
 * one definition rather than three (rule 40); each surface still writes its own
 * literal GraphQL document, because native's codegen refuses an interpolated one.
 */
export interface PodSpotLimits {
  /** Spots the pod declares today. */
  current: number;
  /** Lowest capacity this viewer may set. */
  min: number;
  /** Highest capacity — the booked space's own capacity, when it has one. */
  max: number;
  /** Seats already held: attendees plus every extra seat a booking bought. */
  seats_taken: number;
  /** The booked space's capacity (0 = the pod books no capped space). */
  venue_capacity: number;
  /** The activity's own floor, from the club's sub-category (0 = none). */
  min_pax: number;
  /** True when there is a real range to drag across rather than a fixed number. */
  slidable: boolean;
  /** False for a host — they may only ever raise a live pod's capacity. */
  can_decrease: boolean;
}

/**
 * Attendees who actually PAID. Hosts are written into `pod_attendees` when the
 * pod is created but never pay, so any earning derived from the head count must
 * drop them first or it over-states income by one ticket per host.
 */
export function payingAttendees(
  attendeeIds: readonly string[] | null | undefined,
  hostIds: readonly string[] | null | undefined,
): number {
  const attendees = attendeeIds ?? [];
  if (attendees.length === 0) return 0;
  const hosts = new Set(hostIds ?? []);
  return attendees.filter((id) => !hosts.has(id)).length;
}

/** The seat fields every pod carries, whichever query fetched it. */
export interface PodSeatCounts {
  pod_attendees?: readonly unknown[] | null;
  seats_taken?: number | null;
  no_of_spots?: number | null;
  seats_available?: number | null;
}

/**
 * How full a pod is — the ONE client answer.
 *
 * The server counts `pod_attendees.length + extra_seats`, because a person who
 * books four seats appears in the identity list once. Every screen that counted
 * the list itself under-reported that booking by three, and the same arithmetic
 * was copy-pasted across nine files in the two apps. `seats_taken` is what the
 * server computes; the attendee list is the fallback for a query that has not
 * been taught to select it yet.
 */
export function podSeatsTaken(pod: PodSeatCounts | null | undefined): number {
  if (!pod) return 0;
  const taken = Number(pod.seats_taken);
  if (Number.isFinite(taken) && taken > 0) return Math.floor(taken);
  return pod.pod_attendees?.length ?? 0;
}

/**
 * Seats still bookable. `no_of_spots` of 0 means unlimited, which has no
 * meaningful "left" — callers show nothing there rather than a zero.
 */
export function podSpotsLeft(pod: PodSeatCounts | null | undefined): number {
  if (!pod) return 0;
  const available = Number(pod.seats_available);
  if (Number.isFinite(available) && available > 0) return Math.floor(available);
  const total = Math.floor(Number(pod.no_of_spots) || 0);
  if (total <= 0) return 0;
  return Math.max(total - podSeatsTaken(pod), 0);
}

/**
 * Seats a rendered attendee list holds.
 *
 * A booking for four is ONE row — the rest of the party rides along as a
 * "+3 other members" label rather than three more faces — so a heading titled
 * with the row count under-reports that booking by three. This is the same
 * off-by-N `podSeatsTaken` fixes on the pod, applied to the list a screen
 * actually draws. A row with no `seats` is a booking for one, which is what
 * every booking was before multi-seat.
 */
export function attendeeSeatCount(
  people: readonly { seats?: number | null }[] | null | undefined,
): number {
  return (people ?? []).reduce((sum, person) => {
    const seats = Math.floor(Number(person.seats));
    return sum + (seats > 0 ? seats : 1);
  }, 0);
}
