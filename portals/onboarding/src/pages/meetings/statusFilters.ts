import type { TableFilterValue } from '@duncit/table';
import type { MeetingStatus } from './queries';

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
