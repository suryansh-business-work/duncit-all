import type { ClubAdminTranslate } from './club-admin-copy';

/**
 * The status a pod ROW shows in the club-admin pods tables — the vocabulary
 * behind the Status chip AND the pods page's status filter, stated once so the
 * two can never name the same pod differently, and stated once for the three
 * surfaces that draw it (rules 27 + 40): the Partners console and mWeb chip it
 * with MUI, the native app with Tamagui, but WHICH status a row is in, what
 * tone it takes and what it is called are decided here.
 *
 * The server mirrors this as the `PodRowStatus` GraphQL enum (see
 * server/src/modules/pods/pod/pod.rowStatus.ts): the chip derives the value
 * from a loaded row, the enum turns it into a query predicate, and the order of
 * the checks in `podRowStatus` is the precedence both of them use.
 */

/** Every status, in the order a pod passes through them — the filter's option order. */
export const POD_ROW_STATUS_ORDER = [
  'AWAITING_VENUE',
  'VENUE_REJECTED',
  'DRAFT',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
] as const;

export type PodRowStatus = (typeof POD_ROW_STATUS_ORDER)[number];

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

/** The tone a status chip takes. Each surface maps it onto its own palette —
 * the MUI `Chip` colours take it as-is. */
export type StatusTone = 'default' | 'info' | 'success' | 'warning' | 'error';

export const POD_ROW_STATUS_COLORS: Record<PodRowStatus, StatusTone> = {
  ACTIVE: 'info',
  DRAFT: 'default',
  AWAITING_VENUE: 'warning',
  VENUE_REJECTED: 'error',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

/**
 * The chip's words, from the caller's own translator. One literal key per
 * status: `scripts/verify-translation-keys.mjs` greps source for the literal
 * string, so a composed key reads as shipped-but-never-rendered.
 */
export function podRowStatusLabel(status: PodRowStatus, t: ClubAdminTranslate): string {
  if (status === 'ACTIVE') return t('clubAdmin.podStatus.active');
  if (status === 'DRAFT') return t('clubAdmin.podStatus.draft');
  if (status === 'AWAITING_VENUE') return t('clubAdmin.podStatus.awaitingVenue');
  if (status === 'VENUE_REJECTED') return t('clubAdmin.podStatus.venueRejected');
  if (status === 'COMPLETED') return t('clubAdmin.podStatus.completed');
  return t('clubAdmin.podStatus.cancelled');
}

/** One row of a select or a filter chip strip. */
export interface StatusOption<T extends string> {
  value: T;
  label: string;
}

/** Option rows for the status filter: "all" first, then every status in order. */
export function podRowStatusOptions(t: ClubAdminTranslate): StatusOption<PodRowStatusFilter>[] {
  return [
    { value: '', label: t('clubAdmin.podStatus.all') },
    ...POD_ROW_STATUS_ORDER.map((status) => ({
      value: status,
      label: podRowStatusLabel(status, t),
    })),
  ];
}
