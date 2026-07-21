import { gql } from '@apollo/client';
import { formatMoney } from '@duncit/utils';

/** Same selection as the list rows — one row per Backout request. */
const BACKOUT_REFUND_ROW_FIELDS = gql`
  fragment BackoutRefundRowFields on BackoutRefundRequest {
    id
    backout_no
    pod_id
    user_id
    user_name
    user_email
    status
    backout_status
    attempt_no
    backout_attempts_used
    max_backout_attempts
    replacement_confirmed
    joined_at
    backed_out_at
    refund_status
    payment_id
    payment_amount
    payment_currency
    payment_status
    deduction_pct
    refund_amount
    refund_processed_at
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

export const BACKOUT_REFUND_REQUESTS = gql`
  query BackoutRefundRequests {
    backoutRefundRequests {
      ...BackoutRefundRowFields
    }
    publicFinanceSettings {
      currency_symbol
      default_backout_deduction_pct
    }
  }
  ${BACKOUT_REFUND_ROW_FIELDS}
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
      backout_no
      pod_id
      user_id
      user_name
      user_email
      status
      backout_status
      attempt_no
      backout_attempts_used
      max_backout_attempts
      replacement_confirmed
      joined_at
      backed_out_at
      refund_status
      payment_id
      payment_amount
      payment_currency
      payment_status
      deduction_pct
      refund_amount
      refund_processed_at
      events {
        status
        backout_count
        at
      }
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

/** Finance processes the refund for a Spot Filled request (one per request). */
export const PROCESS_BACKOUT_REFUND = gql`
  mutation ProcessBackoutRefund($id: ID!) {
    processBackoutRefund(id: $id) {
      ...BackoutRefundRowFields
    }
  }
  ${BACKOUT_REFUND_ROW_FIELDS}
`;

export type RefundStatus = 'NONE' | 'PENDING' | 'PROCESSED' | 'NOT_ELIGIBLE';
export type BackoutStatus = 'IN_PROCESS' | 'CANCELLED' | 'SPOT_FILLED';

export type ChipColor = 'default' | 'warning' | 'success' | 'error';

export const REFUND_STATUS_COLORS: Record<RefundStatus, ChipColor> = {
  NONE: 'default',
  PENDING: 'warning',
  PROCESSED: 'success',
  NOT_ELIGIBLE: 'error',
};

/** Display labels + chip colors for a Backout request's lifecycle status. */
export const BACKOUT_STATUS_LABELS: Record<BackoutStatus, string> = {
  IN_PROCESS: 'Backout In Process',
  CANCELLED: 'Backout Cancelled',
  SPOT_FILLED: 'Spot Filled',
};

export const BACKOUT_STATUS_COLORS: Record<BackoutStatus, ChipColor> = {
  IN_PROCESS: 'warning',
  CANCELLED: 'default',
  SPOT_FILLED: 'success',
};

export const money = (symbol: string, value: number) =>
  formatMoney(value, { symbol, decimals: 2, grouping: false });

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

export interface BackoutEvent {
  status: BackoutStatus;
  backout_count: number;
  at: string;
}

export interface BackoutRefundRequest {
  id: string;
  backout_no: string;
  pod_id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  status: string;
  backout_status: BackoutStatus;
  attempt_no: number;
  backout_attempts_used: number;
  max_backout_attempts: number;
  replacement_confirmed: boolean;
  joined_at: string;
  backed_out_at: string | null;
  refund_status: RefundStatus;
  payment_id: string | null;
  payment_amount: number | null;
  payment_currency: string | null;
  payment_status: string | null;
  deduction_pct: number;
  refund_amount: number | null;
  refund_processed_at: string | null;
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
  events: BackoutEvent[];
  pod: BackoutRefundDetailPod | null;
}

/**
 * Refund eligibility is derived from the LATEST Backout status: only a Spot
 * Filled request with a payment that has not yet been refunded is processable.
 */
export const canProcessRefund = (row: BackoutRefundRequest): boolean =>
  row.backout_status === 'SPOT_FILLED' && !!row.payment_id && !row.refund_processed_at;

export interface BreakupLine {
  key: string;
  label: string;
  value: string;
  bold?: boolean;
}

/**
 * Builds the read-only refund "breakup" lines for a Backout request. The
 * request carries a snapshot (deduction_pct / refund_amount) taken when the
 * user confirmed the backout; the global Default Deductions Backouts % is only
 * a fallback for legacy rows without one.
 */
export function buildRefundBreakup(
  row: BackoutRefundRequest,
  symbol: string,
  fallbackDeductionPct: number
): BreakupLine[] {
  const amount = Number(row.payment_amount ?? 0);
  const pct = Math.max(0, Math.min(100, Number(row.deduction_pct ?? fallbackDeductionPct) || 0));
  const deduction = Math.round(amount * pct) / 100; // amount × pct%, 2dp
  const net = row.refund_amount ?? Math.max(0, amount - deduction);
  return [
    { key: 'paid', label: 'Amount paid', value: money(symbol, amount) },
    { key: 'backout-status', label: 'Backout status', value: BACKOUT_STATUS_LABELS[row.backout_status] },
    { key: 'deduction', label: `Backout deduction (${pct}%)`, value: `- ${money(symbol, deduction)}` },
    { key: 'refund', label: 'Refund payable', value: money(symbol, net), bold: true },
  ];
}
