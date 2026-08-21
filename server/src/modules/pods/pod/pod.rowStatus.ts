/**
 * The status a pod ROW shows in a portal table — expressed as a MONGO PREDICATE.
 *
 * This is a different question from `pod.lifecycle`. That one asks where a pod
 * sits in TIME (upcoming / ongoing / completed / cancelled); this one asks what
 * the Status chip in the Club Admin's pods table says, which is a mix of the
 * booking cycle and the pod's own flags:
 *
 *   CANCELLED       soft-deleted
 *   COMPLETED       settled by finance
 *   AWAITING_VENUE  the venue owner has not answered the slot request
 *   VENUE_REJECTED  the venue owner declined it
 *   ACTIVE          live and published
 *   DRAFT           live but not published
 *
 * The order above is the PRECEDENCE the chip uses, and each predicate below
 * excludes the states that outrank it — so the six buckets partition the table
 * exactly, and no pod can be reached by two of them.
 *
 * Derived from four fields rather than stored in one, so it cannot ride the
 * table engine's field allowlist. It joins the club scope in the baseFilter
 * instead, where a client filter can never widen it — the same route
 * `podLifecycleFilter` takes for the Admin console's All Pods bucket.
 */
export type PodRowStatus =
  | 'ACTIVE'
  | 'DRAFT'
  | 'AWAITING_VENUE'
  | 'VENUE_REJECTED'
  | 'COMPLETED'
  | 'CANCELLED';

/** The approval states that speak for the row on their own — a pod in either
 * one is never reported as Active or Draft. */
const APPROVAL_STATES = ['PENDING', 'DECLINED'];

/**
 * Mongo filter fragment for one status.
 *
 * CANCELLED reads soft-deleted rows, so the caller must ALSO opt into
 * `includeDeleted`; every other status pins `deleted_at: null` itself rather
 * than trusting the model's pre-find hook, because a caller that opted in has
 * already stood that hook down.
 */
export function podRowStatusFilter(status: PodRowStatus): Record<string, unknown> {
  if (status === 'CANCELLED') return { deleted_at: { $ne: null } };
  if (status === 'COMPLETED') return { deleted_at: null, completed_at: { $ne: null } };
  const live = { deleted_at: null, completed_at: null };
  if (status === 'AWAITING_VENUE') return { ...live, venue_approval_status: 'PENDING' };
  if (status === 'VENUE_REJECTED') return { ...live, venue_approval_status: 'DECLINED' };
  return {
    ...live,
    venue_approval_status: { $nin: APPROVAL_STATES },
    is_active: status === 'ACTIVE',
  };
}
