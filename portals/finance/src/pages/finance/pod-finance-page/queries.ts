import { gql } from '@apollo/client';

export const POD_FINANCE_RELEASES = gql`
  query PodFinanceReleases {
    paymentReleaseRequests {
      id
      pod_id
      pod_title
      kind
      status
      amount_requested
      requested_at
    }
    publicFinanceSettings {
      currency_symbol
    }
  }
`;

export const POD_FINANCE_BREAKDOWN = gql`
  query PodFinanceBreakdown($podId: ID!) {
    podFinanceBreakdown(pod_id: $podId) {
      pod_id
      pod_title
      settlement_status
      frozen
      bookings_count
      collected_total
      currency_symbol
      has_venue
      completed_at
      waterfall {
        version
        amount
        gst_pct
        gst_amount
        net_amount
        platform_fee_pct
        platform_fee_amount
        pool_amount
        venue_amount
        venue_commission_pct
        venue_commission_amount
        venue_receives
        host_amount
        host_commission_pct
        host_commission_amount
        host_receives
        duncit_revenue
        host_earn_pct
      }
    }
  }
`;

export const money = (symbol: string, value: number) => `${symbol}${Number(value || 0).toFixed(2)}`;

export type PodSettlementStatus = 'LIVE' | 'PENDING_APPROVAL' | 'SETTLED';

export interface PodFinanceWaterfall {
  version: number;
  amount: number;
  gst_pct: number;
  gst_amount: number;
  net_amount: number;
  platform_fee_pct: number;
  platform_fee_amount: number;
  pool_amount: number;
  venue_amount: number;
  venue_commission_pct: number;
  venue_commission_amount: number;
  venue_receives: number;
  host_amount: number;
  host_commission_pct: number;
  host_commission_amount: number;
  host_receives: number;
  duncit_revenue: number;
  host_earn_pct: number;
}

export interface PodFinanceBreakdown {
  pod_id: string;
  pod_title: string;
  settlement_status: PodSettlementStatus;
  frozen: boolean;
  bookings_count: number;
  collected_total: number;
  currency_symbol: string;
  has_venue: boolean;
  completed_at: string | null;
  waterfall: PodFinanceWaterfall;
}

export interface PodReleaseRow {
  id: string;
  pod_id: string;
  pod_title: string;
  kind: string;
  status: string;
  amount_requested: number;
  requested_at: string;
}

export interface PodFinanceGroup {
  pod_id: string;
  pod_title: string;
  releases_count: number;
  requested_total: number;
  status_counts: Record<string, number>;
  last_requested_at: string;
}

/** Group the flat release-request rows into one row per pod for the list view. */
export function groupReleasesByPod(rows: readonly PodReleaseRow[]): PodFinanceGroup[] {
  const byPod = new Map<string, PodFinanceGroup>();
  for (const row of rows) {
    const entry = byPod.get(row.pod_id) ?? {
      pod_id: row.pod_id,
      pod_title: row.pod_title,
      releases_count: 0,
      requested_total: 0,
      status_counts: {},
      last_requested_at: row.requested_at,
    };
    entry.releases_count += 1;
    entry.requested_total += Number(row.amount_requested || 0);
    entry.status_counts[row.status] = (entry.status_counts[row.status] ?? 0) + 1;
    if (row.requested_at > entry.last_requested_at) entry.last_requested_at = row.requested_at;
    byPod.set(row.pod_id, entry);
  }
  return [...byPod.values()].sort((a, b) => b.last_requested_at.localeCompare(a.last_requested_at));
}
