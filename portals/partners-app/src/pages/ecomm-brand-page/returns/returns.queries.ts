import { gql } from '@apollo/client';
import type {
  OrderRefund,
  PodShopReturn,
  PodShopReturnEvent,
  PodShopReturnItem,
  PodShopReturnPickup,
} from '@duncit/gql-types';

/** Everything the table row and the detail drawer read — one selection for the list and every action. */
const RETURN_FIELDS = `
  id
  return_no
  order_no
  buyer_name
  items { product_id variant_id name variant_label qty unit_cost image_url }
  reason
  comments
  status
  gross
  decision_note
  events { status note by at }
  pickup { awb courier_name status tracking_status last_error }
  refund { status amount coins error }
  created_at
`;

/** A partner sees only their own brands' returns (server-scoped). */
export const POD_SHOP_RETURNS_TABLE = gql`
  query PartnerPodShopReturnsTable($query: TableQueryInput, $brand_id: ID) {
    podShopReturnsTable(query: $query, brand_id: $brand_id) {
      total
      rows { ${RETURN_FIELDS} }
    }
  }
`;

export const APPROVE_RETURN = gql`
  mutation PartnerApprovePodShopReturn($id: ID!, $note: String) {
    approvePodShopReturn(id: $id, note: $note) { ${RETURN_FIELDS} }
  }
`;

export const REJECT_RETURN = gql`
  mutation PartnerRejectPodShopReturn($id: ID!, $note: String!) {
    rejectPodShopReturn(id: $id, note: $note) { ${RETURN_FIELDS} }
  }
`;

export const RETRY_RETURN_PICKUP = gql`
  mutation PartnerRetryPodShopReturnPickup($id: ID!) {
    retryPodShopReturnPickup(id: $id) { ${RETURN_FIELDS} }
  }
`;

export const MARK_RETURN_RECEIVED = gql`
  mutation PartnerMarkPodShopReturnReceived($id: ID!) {
    markPodShopReturnReceived(id: $id) { ${RETURN_FIELDS} }
  }
`;

export const REFUND_RETURN = gql`
  mutation PartnerRefundPodShopReturn($id: ID!) {
    refundPodShopReturn(id: $id) { ${RETURN_FIELDS} }
  }
`;

export const RETRY_RETURN_REFUND = gql`
  mutation PartnerRetryPodShopReturnRefund($id: ID!) {
    retryPodShopReturnRefund(id: $id) { ${RETURN_FIELDS} }
  }
`;

export type ReturnItem = Pick<PodShopReturnItem, 'product_id' | 'variant_id' | 'name' | 'variant_label' | 'qty' | 'unit_cost' | 'image_url'>;
export type ReturnEvent = Pick<PodShopReturnEvent, 'status' | 'note' | 'by' | 'at'>;

export type ReturnRow = Pick<
  PodShopReturn,
  'id' | 'return_no' | 'order_no' | 'buyer_name' | 'reason' | 'comments' | 'status' | 'gross' | 'decision_note' | 'created_at'
> & {
  items: ReturnItem[];
  events: ReturnEvent[];
  pickup: Pick<PodShopReturnPickup, 'awb' | 'courier_name' | 'status' | 'tracking_status' | 'last_error'>;
  refund: Pick<OrderRefund, 'status' | 'amount' | 'coins' | 'error'>;
};
