import { gql, type TypedDocumentNode } from '@apollo/client';

import type { OrderKeyVars } from './orders';
import type { NoVars } from './types';

export type StoreReturnStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PICKUP_SCHEDULED'
  | 'RECEIVED'
  | 'REFUNDED'
  | 'CLOSED';

export interface StoreReturn {
  id: string;
  return_no: string;
  order_no: string;
  items: { product_id: string; variant_id: string; name: string; variant_label: string; qty: number }[];
  reason: string;
  status: StoreReturnStatus;
  refund_amount: number;
  refund_mode: 'ORIGINAL' | 'COINS';
  refunded_at: string | null;
  created_at: string;
}

const RETURN_FIELDS = `
  id
  return_no
  order_no
  items { product_id variant_id name variant_label qty }
  reason
  status
  refund_amount
  refund_mode
  refunded_at
  created_at
`;

export const MY_RETURNS: TypedDocumentNode<{ storeMyReturns: StoreReturn[] }, NoVars> = gql`
  query EcommStoreMyReturns {
    storeMyReturns { ${RETURN_FIELDS} }
  }
`;

export const ORDER_RETURNS: TypedDocumentNode<{ storeOrderReturns: StoreReturn[] }, OrderKeyVars> = gql`
  query EcommStoreOrderReturns($order_no: String!, $access_key: String) {
    storeOrderReturns(order_no: $order_no, access_key: $access_key) { ${RETURN_FIELDS} }
  }
`;

export interface StoreReturnRequestInput {
  order_no: string;
  access_key?: string;
  items: { product_id: string; variant_id?: string; qty: number }[];
  reason: string;
  comments?: string;
}

export const REQUEST_RETURN: TypedDocumentNode<{ storeRequestReturn: StoreReturn }, { input: StoreReturnRequestInput }> = gql`
  mutation EcommStoreRequestReturn($input: StoreReturnRequestInput!) {
    storeRequestReturn(input: $input) { ${RETURN_FIELDS} }
  }
`;
