import { gql } from '@apollo/client';
import type { TableQueryState } from '@duncit/table';
import type { StatusColorMap } from '@duncit/ui';
import { formatDateTime } from '@duncit/app-settings';

export const POD_CANCELLATIONS = gql`
  query PodCancellations($kind: PodCancelKind) {
    podCancellations(kind: $kind) {
      pod_id
      pod_slug
      pod_title
      kind
      reason
      actor_name
      cancelled_at
      pod_date_time
      pod_amount
      attendee_count
      refunded_count
      refunded_total
      unrefunded_count
      unrefunded_total
      venue_id
      venue_name
      venue_amount
      host_names
      club_id
      currency_symbol
    }
  }
`;

export const POD_CANCELLATION_STATS = gql`
  query PodCancellationStats {
    podCancellationStats {
      total_cancelled
      cancelled_by_host
      cancelled_by_venue
      cancelled_by_admin
      cancelled_by_club_admin
      total_refund_amount
      refunded_payment_count
      currency_symbol
    }
  }
`;

export type PodCancelKind = 'HOST' | 'VENUE' | 'ADMIN' | 'CLUB_ADMIN' | 'SYSTEM';

export interface PodCancellationRow {
  pod_id: string;
  pod_slug: string;
  pod_title: string;
  kind: PodCancelKind;
  reason: string;
  actor_name: string;
  cancelled_at: string;
  pod_date_time: string | null;
  pod_amount: number;
  attendee_count: number;
  refunded_count: number;
  refunded_total: number;
  unrefunded_count: number;
  unrefunded_total: number;
  venue_id: string | null;
  venue_name: string | null;
  venue_amount: number;
  host_names: string[];
  club_id: string | null;
  currency_symbol: string;
}

export interface PodCancellationStats {
  total_cancelled: number;
  cancelled_by_host: number;
  cancelled_by_venue: number;
  cancelled_by_admin: number;
  cancelled_by_club_admin: number;
  total_refund_amount: number;
  refunded_payment_count: number;
  currency_symbol: string;
}

export const KIND_LABELS: Record<PodCancelKind, string> = {
  HOST: 'Host',
  VENUE: 'Venue',
  ADMIN: 'Admin',
  CLUB_ADMIN: 'Club admin',
  SYSTEM: 'System',
};

export const KIND_COLORS: StatusColorMap = {
  HOST: 'warning',
  VENUE: 'info',
  ADMIN: 'error',
  CLUB_ADMIN: 'secondary',
  SYSTEM: 'default',
};

export const money = (sym: string, value?: number | null) =>
  `${sym}${(value ?? 0).toLocaleString('en-IN')}`;

export const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  return formatDateTime(iso) || '—';
};

type RowComparator = (a: PodCancellationRow, b: PodCancellationRow) => number;

const ROW_COMPARATORS: Record<string, RowComparator> = {
  pod_title: (a, b) => a.pod_title.localeCompare(b.pod_title),
  cancelled_at: (a, b) => a.cancelled_at.localeCompare(b.cancelled_at),
  attendee_count: (a, b) => a.attendee_count - b.attendee_count,
  refunded_total: (a, b) => a.refunded_total - b.refunded_total,
  unrefunded_total: (a, b) => a.unrefunded_total - b.unrefunded_total,
  venue_amount: (a, b) => a.venue_amount - b.venue_amount,
};

/**
 * In-memory search/sort/page over the cancellation rows — podCancellations is
 * a bounded, hydrated list (same convention as the Pod Finance grouped list),
 * so the table's fetchRows slices it here.
 */
export function applyCancellationQuery(
  rows: readonly PodCancellationRow[],
  q: TableQueryState,
): { rows: PodCancellationRow[]; total: number } {
  const term = q.search.trim().toLowerCase();
  const filtered = term
    ? rows.filter((row) =>
        [row.pod_title, row.reason, row.actor_name, row.venue_name ?? '']
          .join(' ')
          .toLowerCase()
          .includes(term),
      )
    : [...rows];
  const cmp = q.sortBy ? ROW_COMPARATORS[q.sortBy] : undefined;
  if (cmp) {
    filtered.sort(q.sortDir === 'desc' ? (a, b) => cmp(b, a) : cmp);
  }
  const start = (q.page - 1) * q.pageSize;
  return { rows: filtered.slice(start, start + q.pageSize), total: filtered.length };
}
