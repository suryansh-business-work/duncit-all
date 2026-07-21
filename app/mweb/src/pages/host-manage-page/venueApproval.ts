/** Host-facing copy + chip meta for a pod's venue-approval state. Mirrors the
 * mobile app's utils/venue-approval.ts (rule 27 parity). */

export const VENUE_REJECTED_NOTE =
  'Venue rejected your slot request. Please select a different venue or choose a different time slot and submit your request again.';

export interface VenueApprovalChip {
  label: string;
  color: 'error' | 'warning';
}

/** Chip for the pod card — only the in-flight approval states are surfaced. */
export function venueApprovalChip(status?: string | null): VenueApprovalChip | null {
  if (status === 'DECLINED') return { label: 'Venue Rejected', color: 'error' };
  if (status === 'PENDING') return { label: 'Venue Approval Pending', color: 'warning' };
  return null;
}

/** A venue-rejected pod is fully editable + resubmittable by its host. */
export const isVenueRejected = (status?: string | null): boolean => status === 'DECLINED';
