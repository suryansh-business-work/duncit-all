import { gql } from '@apollo/client';
import type { OrderRefund } from '../pod-history-page/productOrders';

/** The signed-in buyer's pod-shop returns — listed under the order each one is for. */
export const MY_POD_SHOP_RETURNS = gql`
  query MyPodShopReturns {
    myPodShopReturns {
      id
      return_no
      order_id
      status
      decision_note
      items {
        product_id
        variant_id
        name
        variant_label
        qty
      }
      pickup {
        awb
        courier_name
      }
      refund {
        status
        amount
        coins
        refunded_at
      }
      created_at
    }
  }
`;

/** Ask to send items back. The server splits it per brand, so it answers with a list. */
export const REQUEST_POD_SHOP_RETURN = gql`
  mutation RequestPodShopReturn($input: RequestPodShopReturnInput!) {
    requestPodShopReturn(input: $input) {
      id
      return_no
    }
  }
`;

/** Withdraw a return nobody has decided yet. */
export const CANCEL_MY_POD_SHOP_RETURN = gql`
  mutation CancelMyPodShopReturn($id: ID!) {
    cancelMyPodShopReturn(id: $id) {
      id
      status
    }
  }
`;

export type PodShopReturnStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PICKUP_SCHEDULED'
  | 'RECEIVED'
  | 'REFUNDED'
  | 'CANCELLED';

export interface PodShopReturn {
  id: string;
  return_no: string;
  order_id: string;
  status: PodShopReturnStatus;
  decision_note: string;
  items: Array<{ product_id: string; variant_id: string; name: string; variant_label: string; qty: number }>;
  pickup: { awb: string; courier_name: string };
  refund: OrderRefund;
  created_at: string;
}

export interface MyPodShopReturnsData {
  myPodShopReturns: PodShopReturn[];
}

export interface RequestPodShopReturnInput {
  order_id: string;
  items: Array<{ product_id: string; variant_id: string; qty: number }>;
  reason: string;
  comments: string;
}
