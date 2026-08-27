/**
 * The status a pod ROW shows in the partner pods tables — the vocabulary behind
 * the Status chip AND the Club Admin pods page's status filter, stated once so
 * the two can never name the same pod differently.
 *
 * The server mirrors this as the `PodRowStatus` GraphQL enum (see
 * server/src/modules/pods/pod/pod.rowStatus.ts): the chip derives the value
 * from a loaded row, the enum turns it into a query predicate, and the order of
 * the checks below is the precedence both of them use.
 */
export type PodRowStatus =
  | 'ACTIVE'
  | 'DRAFT'
  | 'AWAITING_VENUE'
  | 'VENUE_REJECTED'
  | 'COMPLETED'
  | 'CANCELLED';

/** `''` is the ABSENCE of the filter (every status), not a seventh value — the
 * server takes no `status` argument for that. */
export type PodRowStatusFilter = '' | PodRowStatus;

/** The four fields a status is read from. Every partner pod row carries them,
 * so a row satisfies this structurally. */
export interface PodStatusFields {
  is_active: boolean;
  completed_at?: string | null;
  is_deleted?: boolean | null;
  venue_approval_status?: string | null;
}

/** Booking-cycle state wins over the plain active/draft split, so a cancelled
 * or venue-blocked pod is never mistaken for a draft. */
export const podRowStatus = (pod: PodStatusFields): PodRowStatus => {
  if (pod.is_deleted) return 'CANCELLED';
  if (pod.completed_at) return 'COMPLETED';
  if (pod.venue_approval_status === 'PENDING') return 'AWAITING_VENUE';
  if (pod.venue_approval_status === 'DECLINED') return 'VENUE_REJECTED';
  return pod.is_active ? 'ACTIVE' : 'DRAFT';
};

/**
 * The pods whose attendance can be opened: the ones that are running or have
 * run. A draft, a pod still awaiting its venue and a venue-rejected one have no
 * door to have stood at, and a cancelled pod never happened — the server locks
 * its board for exactly that reason.
 *
 * COMPLETED stays in on purpose. Completion locks MARKING, because the payout
 * is already split by then, but the roster is still the record of who was
 * there — and the board says why it is closed far more usefully than a missing
 * action does.
 */
const ATTENDANCE_STATUSES = new Set<PodRowStatus>(['ACTIVE', 'COMPLETED']);

export const canOpenPodAttendance = (pod: PodStatusFields): boolean =>
  ATTENDANCE_STATUSES.has(podRowStatus(pod));

type ChipColor = 'success' | 'info' | 'default' | 'error' | 'warning';

export const POD_ROW_STATUS_COLORS: Record<PodRowStatus, ChipColor> = {
  ACTIVE: 'info',
  DRAFT: 'default',
  AWAITING_VENUE: 'warning',
  VENUE_REJECTED: 'error',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

export const POD_ROW_STATUS_KEYS: Record<PodRowStatus, string> = {
  ACTIVE: 'partners.podStatus.active',
  DRAFT: 'partners.podStatus.draft',
  AWAITING_VENUE: 'partners.podStatus.awaitingVenue',
  VENUE_REJECTED: 'partners.podStatus.venueRejected',
  COMPLETED: 'partners.podStatus.completed',
  CANCELLED: 'partners.podStatus.cancelled',
};

/** Option rows for the status select, in the order a pod passes through them. */
export const POD_ROW_STATUS_OPTIONS: ReadonlyArray<{
  value: PodRowStatusFilter;
  labelKey: string;
}> = [
  { value: '', labelKey: 'partners.podStatus.all' },
  { value: 'AWAITING_VENUE', labelKey: POD_ROW_STATUS_KEYS.AWAITING_VENUE },
  { value: 'VENUE_REJECTED', labelKey: POD_ROW_STATUS_KEYS.VENUE_REJECTED },
  { value: 'DRAFT', labelKey: POD_ROW_STATUS_KEYS.DRAFT },
  { value: 'ACTIVE', labelKey: POD_ROW_STATUS_KEYS.ACTIVE },
  { value: 'COMPLETED', labelKey: POD_ROW_STATUS_KEYS.COMPLETED },
  { value: 'CANCELLED', labelKey: POD_ROW_STATUS_KEYS.CANCELLED },
];
