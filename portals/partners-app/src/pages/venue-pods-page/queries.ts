import { gql } from '@apollo/client';
import type { TableQueryState } from '@duncit/table';
import type { StatusColorMap } from '@duncit/ui';
import { formatDateTime } from '@duncit/app-settings';
import {
  cancelDisabledReason,
  matchesTab,
  type VenueCancelDisabledReason,
  type VenueCancelPodResult,
  type VenuePodBucket,
  type VenuePodTab,
} from '@duncit/utils';

export const VENUE_PODS = gql`
  query VenuePods($venue_id: ID) {
    venuePods(venue_id: $venue_id) {
      id
      pod_slug
      pod_title
      pod_date_time
      pod_end_date_time
      pod_amount
      pod_type
      no_of_spots
      attendee_count
      pod_attendees
      host_names
      venue_id
      venue_name
      bucket
      is_active
      completed_at
      cancelled_at
      created_at
    }
  }
`;

export const VENUE_POD_ATTENDEE_PROFILES = gql`
  query VenuePodAttendeeProfiles($ids: [ID!]!) {
    publicUsersByIds(user_ids: $ids) {
      user_id
      full_name
      profile_photo
    }
  }
`;

export const VENUE_CANCEL_POD = gql`
  mutation VenueCancelPod($pod_id: ID!, $reason: String!) {
    venueCancelPod(pod_id: $pod_id, reason: $reason) {
      pod_id
      health_penalty
      venue_health_score
      refunded_count
    }
  }
`;

/**
 * The Account Health penalty a venue pays for cancelling, straight from Admin >
 * Pods > Pod Settings. Its own operation name (never `PublicAppSettings`) so it
 * cannot thrash the shared document's normalized cache entry.
 */
export const VENUE_CANCEL_PENALTY = gql`
  query VenueCancelPenalty {
    publicAppSettings {
      venue_cancel_health_penalty
    }
  }
`;

/** One `venuePods` row. The cancel and tab rules read `bucket` + `cancelled_at` (@duncit/utils). */
export interface VenuePodRow {
  id: string;
  pod_slug: string;
  pod_title: string;
  pod_date_time: string;
  pod_end_date_time: string | null;
  pod_amount: number;
  pod_type: 'FREE' | 'PAID';
  no_of_spots: number;
  attendee_count: number;
  pod_attendees: string[];
  host_names: string[];
  venue_id: string;
  venue_name: string;
  bucket: VenuePodBucket;
  is_active: boolean;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface AttendeeProfile {
  user_id: string;
  full_name: string | null;
  profile_photo: string | null;
}

/** The shared rule answers a code; these are the owner's words for each. */
const CANCEL_DISABLED_TEXT: Record<VenueCancelDisabledReason, string> = {
  ALREADY_CANCELLED: 'This pod is already cancelled.',
  ALREADY_STARTED: 'This pod has already started, so it can no longer be cancelled.',
  ALREADY_FINISHED: 'This pod has already finished.',
};

/** Why the Cancel action is unavailable, or null when it is available. */
export function cancelDisabledText(row: VenuePodRow): string | null {
  const reason = cancelDisabledReason(row);
  return reason ? CANCEL_DISABLED_TEXT[reason] : null;
}

/** Success line for the page snackbar — every number comes from the server. */
export function cancelSuccessMessage(result: VenueCancelPodResult): string {
  const refunds =
    result.refunded_count === 1 ? '1 payment refunded' : `${result.refunded_count} payments refunded`;
  return `Pod cancelled — ${refunds}. This venue's Account Health is now ${result.venue_health_score}.`;
}

export const BUCKET_LABELS: Record<VenuePodBucket, string> = {
  UPCOMING: 'Upcoming',
  ONGOING: 'Ongoing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const BUCKET_COLORS: StatusColorMap = {
  UPCOMING: 'info',
  ONGOING: 'success',
  COMPLETED: 'primary',
  CANCELLED: 'error',
};

export const TAB_LABELS: Record<VenuePodTab, string> = {
  ALL: 'All',
  UPCOMING: 'Upcoming',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
};

export const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  return formatDateTime(iso) || '—';
};

type RowComparator = (a: VenuePodRow, b: VenuePodRow) => number;

const ROW_COMPARATORS: Record<string, RowComparator> = {
  pod_title: (a, b) => a.pod_title.localeCompare(b.pod_title),
  pod_date_time: (a, b) => a.pod_date_time.localeCompare(b.pod_date_time),
  pod_amount: (a, b) => a.pod_amount - b.pod_amount,
  attendee_count: (a, b) => a.attendee_count - b.attendee_count,
};

/**
 * In-memory search/sort/page over the venuePods rows. The active tab arrives
 * through the table's externalFilters (field "tab"), so switching tabs
 * re-slices without a second data source.
 */
export function applyVenuePodsQuery(
  rows: readonly VenuePodRow[],
  q: TableQueryState,
): { rows: VenuePodRow[]; total: number } {
  const tab = (q.filters.find((f) => f.field === 'tab')?.value ?? 'ALL') as VenuePodTab;
  const term = q.search.trim().toLowerCase();
  let filtered = rows.filter((row) => matchesTab(row, tab));
  if (term) {
    filtered = filtered.filter((row) =>
      [row.pod_title, row.venue_name, row.host_names.join(' ')].join(' ').toLowerCase().includes(term),
    );
  }
  const cmp = q.sortBy ? ROW_COMPARATORS[q.sortBy] : undefined;
  if (cmp) {
    filtered.sort(q.sortDir === 'desc' ? (a, b) => cmp(b, a) : cmp);
  }
  const start = (q.page - 1) * q.pageSize;
  return { rows: filtered.slice(start, start + q.pageSize), total: filtered.length };
}
