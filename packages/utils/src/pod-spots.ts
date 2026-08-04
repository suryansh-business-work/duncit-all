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

/**
 * How many seats one booking may take. Mirrors the server's
 * `MAX_SEATS_PER_BOOKING` (pod.seats.ts) — the server still clamps, this just
 * stops the picker offering a number that would be rejected.
 */
export const MAX_SEATS_PER_BOOKING = 10;

/**
 * The seat-picker options for a pod: 1…(seats left), capped. `seatsAvailable`
 * of 0 on an unlimited-spots pod is not "full", so callers pass the cap there.
 */
export function seatOptions(seatsAvailable: number, max = MAX_SEATS_PER_BOOKING): number[] {
  const top = Math.max(1, Math.min(Math.floor(seatsAvailable) || 0, max));
  return Array.from({ length: top }, (_, index) => index + 1);
}
