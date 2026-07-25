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
