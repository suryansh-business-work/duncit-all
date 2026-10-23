/** Host-facing copy + chip meta for a pod's venue-approval state. Mirrors
 * @duncit/host-pod-actions' venue-approval.ts (rule 27 parity). */

export const VENUE_REJECTED_NOTE =
  'Venue rejected your slot request. Please select a different venue or choose a different time slot and submit your request again.';

export interface VenueApprovalChip {
  label: string;
  tone: 'error' | 'warning';
}

/** Chip for the pod card — only the in-flight approval states are surfaced. */
export function venueApprovalChip(status?: string | null): VenueApprovalChip | null {
  if (status === 'DECLINED') return { label: 'Venue Rejected', tone: 'error' };
  if (status === 'PENDING') return { label: 'Venue Approval Pending', tone: 'warning' };
  return null;
}

/** The row's chip once the venue may have answered the host's offer: a pod
 * still PENDING whose offer the venue COUNTERED reads `counteredLabel` (the
 * pending screen has Accept / Reject); anything else is `venueApprovalChip`. */
export function venueOfferChip(
  status: string | null | undefined,
  offerStatus: string | null | undefined,
  counteredLabel: string,
): VenueApprovalChip | null {
  if (status === 'PENDING' && offerStatus === 'COUNTERED') {
    return { label: counteredLabel, tone: 'warning' };
  }
  return venueApprovalChip(status);
}

/** A venue-rejected pod is fully editable + resubmittable by its host. */
export const isVenueRejected = (status?: string | null): boolean => status === 'DECLINED';
