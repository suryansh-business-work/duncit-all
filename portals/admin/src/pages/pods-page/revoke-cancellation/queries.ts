import { gql } from '@apollo/client';

/** What revoking would cost, read before the dialog opens so the button can
 * already know whether it is allowed to be pressed. */
export const POD_REVOKE_PREVIEW = gql`
  query AdminPodRevokePreview($id: ID!) {
    podRevokePreview(pod_doc_id: $id) {
      pod_id
      pod_title
      pod_date_time
      is_cancelled
      can_revoke
      blocked_reason
      loss_total
      held_total
      currency_symbol
      refunds {
        payment_id
        user_id
        user_name
        user_email
        amount
        currency_symbol
        state
      }
    }
  }
`;

export const REVOKE_POD_CANCELLATION = gql`
  mutation AdminRevokePodCancellation($id: ID!) {
    revokePodCancellation(pod_doc_id: $id) {
      id
      is_active
      is_deleted
      deleted_at
      venue_approval_status
    }
  }
`;

/** One payer's cancellation refund, as the panel lists it. */
export interface PodRevokeRefund {
  payment_id: string;
  user_id: string | null;
  user_name: string;
  user_email: string;
  amount: number;
  currency_symbol: string;
  state: 'PAID' | 'HELD';
}

export interface PodRevokePreview {
  pod_id: string;
  pod_title: string;
  pod_date_time: string | null;
  is_cancelled: boolean;
  can_revoke: boolean;
  blocked_reason: 'NOT_CANCELLED' | 'POD_DATE_PASSED' | null;
  loss_total: number;
  held_total: number;
  currency_symbol: string;
  refunds: PodRevokeRefund[];
}
