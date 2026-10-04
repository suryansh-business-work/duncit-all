import { gql } from '@apollo/client';

/** Products portal › Fulfilment › Product Returns: every pod-shop return, any brand. */

const RETURN_FIELDS = `
  id
  return_no
  order_id
  order_no
  buyer_name
  buyer_email
  items {
    product_id
    variant_id
    name
    variant_label
    image_url
    qty
    unit_cost
  }
  reason
  comments
  status
  gross
  decision_note
  events {
    status
    note
    by
    at
  }
  pickup {
    awb
    courier_name
    status
    tracking_status
    last_error
  }
  refund {
    status
    amount
    coins
    razorpay_refund_id
    refunded_at
    error
  }
  created_at
`;

export const POD_SHOP_RETURNS_TABLE = gql`
  query PodShopReturnsTable($query: TableQueryInput, $brand_id: ID) {
    podShopReturnsTable(query: $query, brand_id: $brand_id) {
      total
      rows {
        ${RETURN_FIELDS}
      }
    }
  }
`;

export const APPROVE_RETURN = gql`
  mutation ApprovePodShopReturn($id: ID!, $note: String) {
    approvePodShopReturn(id: $id, note: $note) {
      ${RETURN_FIELDS}
    }
  }
`;

export const REJECT_RETURN = gql`
  mutation RejectPodShopReturn($id: ID!, $note: String!) {
    rejectPodShopReturn(id: $id, note: $note) {
      ${RETURN_FIELDS}
    }
  }
`;

export const RETRY_RETURN_PICKUP = gql`
  mutation RetryPodShopReturnPickup($id: ID!) {
    retryPodShopReturnPickup(id: $id) {
      ${RETURN_FIELDS}
    }
  }
`;

export const MARK_RETURN_RECEIVED = gql`
  mutation MarkPodShopReturnReceived($id: ID!) {
    markPodShopReturnReceived(id: $id) {
      ${RETURN_FIELDS}
    }
  }
`;

export const REFUND_RETURN = gql`
  mutation RefundPodShopReturn($id: ID!) {
    refundPodShopReturn(id: $id) {
      ${RETURN_FIELDS}
    }
  }
`;

export const RETRY_RETURN_REFUND = gql`
  mutation RetryPodShopReturnRefund($id: ID!) {
    retryPodShopReturnRefund(id: $id) {
      ${RETURN_FIELDS}
    }
  }
`;

export type ReturnStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PICKUP_SCHEDULED' | 'RECEIVED' | 'REFUNDED' | 'CANCELLED';

export interface PodShopReturnRow {
  id: string;
  return_no: string;
  order_id: string;
  order_no: string;
  buyer_name: string;
  buyer_email: string;
  items: { product_id: string; variant_id: string; name: string; variant_label: string; image_url: string; qty: number; unit_cost: number }[];
  reason: string;
  comments: string;
  status: ReturnStatus;
  gross: number;
  decision_note: string;
  events: { status: string; note: string; by: string; at: string }[];
  pickup: { awb: string; courier_name: string; status: string; tracking_status: string; last_error: string };
  refund: { status: string; amount: number; coins: number; razorpay_refund_id: string; refunded_at: string | null; error: string };
  created_at: string;
}
