import { gql } from '@apollo/client';

export const BACKOUT_REFUND_REQUESTS = gql`
  query BackoutRefundRequests {
    backoutRefundRequests {
      id
      pod_id
      user_id
      user_name
      user_email
      status
      joined_at
      backed_out_at
      refund_status
      payment_id
      payment_amount
      payment_currency
      payment_status
      refund_threshold_pct
      created_at
      pod {
        id
        pod_id
        pod_title
        pod_date_time
        pod_type
      }
    }
    publicFinanceSettings {
      currency_symbol
      default_backout_deduction_pct
    }
  }
`;

/** Same selection as BACKOUT_REFUND_REQUESTS rows, for the server-paged table query. */
const BACKOUT_REFUND_ROW_FIELDS = gql`
  fragment BackoutRefundRowFields on BackoutRefundRequest {
    id
    pod_id
    user_id
    user_name
    user_email
    status
    joined_at
    backed_out_at
    refund_status
    payment_id
    payment_amount
    payment_currency
    payment_status
    refund_threshold_pct
    created_at
    pod {
      id
      pod_id
      pod_title
      pod_date_time
      pod_type
    }
  }
`;

export const BACKOUT_REFUNDS_TABLE = gql`
  query BackoutRefundRequestsTable($query: TableQueryInput) {
    backoutRefundRequestsTable(query: $query) {
      total
      rows {
        ...BackoutRefundRowFields
      }
    }
  }
  ${BACKOUT_REFUND_ROW_FIELDS}
`;

/** Currency + deduction settings alone — rows come from the paged table query now. */
export const BACKOUT_FINANCE_SETTINGS = gql`
  query BackoutFinanceSettings {
    publicFinanceSettings {
      currency_symbol
      default_backout_deduction_pct
    }
  }
`;

export const BACKOUT_REFUND_DETAIL = gql`
  query BackoutRefundDetail($id: ID!) {
    backoutRefundRequest(id: $id) {
      id
      pod_id
      user_id
      user_name
      user_email
      status
      joined_at
      backed_out_at
      refund_status
      payment_id
      payment_amount
      payment_currency
      payment_status
      refund_threshold_pct
      created_at
      pod {
        id
        pod_id
        pod_title
        pod_date_time
        pod_end_date_time
        pod_amount
        pod_type
        no_of_spots
        club_slug
        venue_id
        completed_at
        is_deleted
        host_names
        pod_images_and_videos {
          url
          type
        }
        club {
          id
          club_id
          club_name
          club_description
        }
      }
    }
    publicFinanceSettings {
      currency_symbol
      default_backout_deduction_pct
    }
  }
`;

export type RefundStatus = 'NONE' | 'PENDING' | 'PROCESSED' | 'NOT_ELIGIBLE';

export type ChipColor = 'default' | 'warning' | 'success' | 'error';

export const REFUND_STATUS_COLORS: Record<RefundStatus, ChipColor> = {
  NONE: 'default',
  PENDING: 'warning',
  PROCESSED: 'success',
  NOT_ELIGIBLE: 'error',
};

export const money = (symbol: string, value: number) => `${symbol}${Number(value || 0).toFixed(2)}`;

export const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN');
};

export interface PodMedia {
  url: string;
  type: string;
}

export interface BackoutRefundPod {
  id: string;
  pod_id: string;
  pod_title: string;
  pod_date_time: string;
  pod_type: string;
}

export interface BackoutRefundRequest {
  id: string;
  pod_id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  status: string;
  joined_at: string;
  backed_out_at: string | null;
  refund_status: RefundStatus;
  payment_id: string | null;
  payment_amount: number | null;
  payment_currency: string | null;
  payment_status: string | null;
  refund_threshold_pct: number;
  created_at: string;
  pod: BackoutRefundPod | null;
}

export interface BackoutRefundClub {
  id: string;
  club_id: string;
  club_name: string;
  club_description: string | null;
}

export interface BackoutRefundDetailPod {
  id: string;
  pod_id: string;
  pod_title: string;
  pod_date_time: string;
  pod_end_date_time: string | null;
  pod_amount: number;
  pod_type: string;
  no_of_spots: number;
  club_slug: string;
  venue_id: string | null;
  completed_at: string | null;
  is_deleted: boolean;
  host_names: string[];
  pod_images_and_videos: PodMedia[];
  club: BackoutRefundClub | null;
}

export interface BackoutRefundDetail extends Omit<BackoutRefundRequest, 'pod'> {
  pod: BackoutRefundDetailPod | null;
}

export interface BreakupLine {
  key: string;
  label: string;
  value: string;
  bold?: boolean;
}

/**
 * Builds the read-only refund "breakup" lines from a backed-out membership row.
 * The estimated refund applies the global Backouts deduction % (Default
 * Deductions → Backouts, `publicFinanceSettings.default_backout_deduction_pct`):
 * estimated refund = amount − amount × pct%.
 */
export function buildRefundBreakup(
  row: BackoutRefundRequest,
  symbol: string,
  deductionPct: number
): BreakupLine[] {
  const amount = Number(row.payment_amount ?? 0);
  const pct = Math.max(0, Math.min(100, Number(deductionPct) || 0));
  const deduction = Math.round(amount * pct) / 100; // amount × pct%, 2dp
  const net = Math.max(0, amount - deduction);
  return [
    { key: 'paid', label: 'Amount paid', value: money(symbol, amount) },
    { key: 'refund-status', label: 'Refund status', value: row.refund_status },
    { key: 'deduction', label: `Backout deduction (${pct}%)`, value: `- ${money(symbol, deduction)}` },
    { key: 'estimate', label: 'Estimated refund', value: money(symbol, net), bold: true },
  ];
}
