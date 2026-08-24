import type { TableFilterValue } from '@duncit/table';
import type { MeetingStatus, OnboardingMeeting } from './queries';

/**
 * Status toggle keys for the meetings table: the raw DB statuses plus a synthetic
 * "REJECTED". A staff rejection and a user self-cancel are both stored as the DB
 * status CANCELLED and split only by the cancelled_by_staff flag, so the toggle
 * exposes them as two separate keys.
 */
export type StatusFilterKey = MeetingStatus | 'REJECTED';

/**
 * Pinned table filters for a chosen status toggle:
 * - "REJECTED"  → CANCELLED rows the onboarding team rejected (cancelled_by_staff).
 * - "CANCELLED" → CANCELLED rows the user self-cancelled (or a reschedule superseded).
 * - any other key filters the status field directly.
 * An empty key applies no status filter (the "All" toggle).
 */
export function statusPinnedFilters(key: StatusFilterKey | ''): TableFilterValue[] {
  if (!key) return [];
  if (key === 'REJECTED') {
    return [
      { field: 'status', op: 'eq', value: 'CANCELLED' },
      { field: 'cancelled_by_staff', op: 'is_true' },
    ];
  }
  if (key === 'CANCELLED') {
    return [
      { field: 'status', op: 'eq', value: 'CANCELLED' },
      { field: 'cancelled_by_staff', op: 'is_false' },
    ];
  }
  return [{ field: 'status', op: 'eq', value: key }];
}

/**
 * Would this meeting still be in the list under the chosen toggle?
 *
 * The client-side twin of {@link statusPinnedFilters}, and the question that
 * decides whether an action can be reflected by updating the row or has to
 * re-ask the server. Marking a SCHEDULED meeting done while the Scheduled
 * toggle is on does not change a cell — it removes the row from the list, and
 * only the query knows what takes its place.
 */
export function matchesStatusFilter(
  meeting: Pick<OnboardingMeeting, 'status' | 'cancelled_by_staff'>,
  key: StatusFilterKey | '',
): boolean {
  if (!key) return true;
  if (key === 'REJECTED') return meeting.status === 'CANCELLED' && !!meeting.cancelled_by_staff;
  if (key === 'CANCELLED') return meeting.status === 'CANCELLED' && !meeting.cancelled_by_staff;
  return meeting.status === key;
}
