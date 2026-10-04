import { gql } from '@apollo/client';
import { formatMoney, type PodParticipationFields } from '@duncit/utils';
import { formatDateTime } from '@duncit/app-settings';

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
    coins_paid
    coins_refunded
    payment_gateway
    coins_earned_share
    coins_to_revoke
    coins_revoked
    cash_refund_processed_at
    coins_refund_processed_at
    earn_revoke_processed_at
    refund_parts
    pending_refund_parts
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
      user_phone
      status
      backout_status
      attempt_no
      seats
      seats_before
      backout_attempts_used
      max_backout_attempts
      replacement_confirmed
      replacement_user_id
      replacement_user_name
      replacement_user_email
      joined_at
      backed_out_at
      refund_status
      payment_id
      payment_amount
      payment_currency
      payment_status
      deduction_pct
      refund_amount
      coins_paid
      coins_refunded
      payment_gateway
      coins_earned_share
      coins_to_revoke
      coins_revoked
      cash_refund_processed_at
      coins_refund_processed_at
      earn_revoke_processed_at
      refund_parts
      pending_refund_parts
      refund_processed_at
      events {
        status
        backout_count
        at
      }
      participation {
        joined_at
        attended
        attended_at
        attendance_recorded
        pod_cancelled_by
        pod_cancelled_at
        cancel_refund_status
        backouts {
          backout_no
          status
          attempt_no
          seats
          seats_before
          refund_amount
          coins_refunded
          refund_status
          deduction_pct
          refund_processed_at
          created_at
          events {
            status
            at
          }
        }
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

/** Finance processes ONE part of a Spot Filled request's refund — the gateway
 * money, the coins, or the earned-coin revocation. */
export const PROCESS_BACKOUT_REFUND = gql`
  mutation ProcessBackoutRefund($id: ID!, $part: BackoutRefundPart) {
    processBackoutRefund(id: $id, part: $part) {
      ...BackoutRefundRowFields
    }
  }
  ${BACKOUT_REFUND_ROW_FIELDS}
`;

export type RefundStatus = 'NONE' | 'PENDING' | 'PROCESSED' | 'NOT_ELIGIBLE';
export type BackoutStatus = 'IN_PROCESS' | 'CANCELLED' | 'SPOT_FILLED';
/** One separately-actioned part of a refund (server enum BackoutRefundPart). */
export type RefundPart = 'CASH' | 'COINS' | 'EARN_REVOKE';

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
  return formatDateTime(iso) || '—';
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
  coins_paid: number;
  coins_refunded: number;
  /** RAZORPAY / DUMMY, or COINS / COUPON when nothing went through a gateway. */
  payment_gateway: string | null;
  coins_earned_share: number;
  coins_to_revoke: number;
  coins_revoked: number;
  cash_refund_processed_at: string | null;
  coins_refund_processed_at: string | null;
  earn_revoke_processed_at: string | null;
  refund_parts: RefundPart[];
  pending_refund_parts: RefundPart[];
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

/**
 * The detail query asks for more than a list row: the contact details Finance
 * needs to action the refund, and the member whose join closed the request.
 * These stay off `BACKOUT_REFUND_ROW_FIELDS` — the table renders none of them.
 */
export interface BackoutRefundDetail extends Omit<BackoutRefundRequest, 'pod'> {
  user_phone: string | null;
  /** Seats this request released, out of the seats the booking held before it. */
  seats: number;
  seats_before: number;
  replacement_user_id: string | null;
  replacement_user_name: string | null;
  replacement_user_email: string | null;
  events: BackoutEvent[];
  /**
   * The whole booking this request came off — the same story the member reads
   * on Pod History, with this request one branch of it (found by backout_no).
   */
  participation: PodParticipationFields | null;
  pod: BackoutRefundDetailPod | null;
}

/**
 * Refund eligibility is derived from the LATEST Backout status: only a Spot
 * Filled request with a payment that has not yet been refunded is processable.
 */
export const canProcessRefund = (row: BackoutRefundRequest): boolean =>
  row.backout_status === 'SPOT_FILLED' && !!row.payment_id && !row.refund_processed_at;

