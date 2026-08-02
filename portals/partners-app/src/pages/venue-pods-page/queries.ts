import { gql } from '@apollo/client';
import type { TableQueryState } from '@duncit/table';
import type { StatusColorMap } from '@duncit/ui';

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

export type VenuePodBucket = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

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

/** Tab keys — Upcoming includes pods that are live right now. */
export type VenuePodTab = 'ALL' | 'UPCOMING' | 'CANCELLED' | 'COMPLETED';

export const TAB_ORDER: VenuePodTab[] = ['ALL', 'UPCOMING', 'CANCELLED', 'COMPLETED'];

export const TAB_LABELS: Record<VenuePodTab, string> = {
  ALL: 'All',
  UPCOMING: 'Upcoming',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
};

export function matchesTab(row: VenuePodRow, tab: VenuePodTab): boolean {
  if (tab === 'ALL') return true;
  if (tab === 'UPCOMING') return row.bucket === 'UPCOMING' || row.bucket === 'ONGOING';
  return row.bucket === tab;
}

export const tabCounts = (rows: readonly VenuePodRow[]): Record<VenuePodTab, number> =>
  Object.fromEntries(
    TAB_ORDER.map((tab) => [tab, rows.filter((row) => matchesTab(row, tab)).length]),
  ) as Record<VenuePodTab, number>;

export const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN');
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
