import { gql, type TypedDocumentNode } from '@apollo/client';
import type { RefundMode, ReturnStatus } from '../../lib/status';

export interface StoreReturnItem {
  product_id: string;
  variant_id: string;
  name: string;
  variant_label: string;
  image_url: string;
  qty: number;
  unit_price: number;
}

export interface StoreReturnEvent {
  status: ReturnStatus;
  note: string;
  by: string;
  at: string;
}

/** A buyer's request to send goods back, and everything that has happened to it. */
export interface StoreReturn {
  id: string;
  return_no: string;
  order_id: string;
  order_no: string;
  buyer_name: string;
  buyer_email: string;
  is_guest: boolean;
  items: StoreReturnItem[];
  reason: string;
  comments: string;
  images: string[];
  status: ReturnStatus;
  /** Where an operator may move it next. */
  next_statuses: ReturnStatus[];
  refund_amount: number;
  refund_mode: RefundMode;
  refunded_at: string | null;
  restocked: boolean;
  admin_note: string;
  events: StoreReturnEvent[];
  created_at: string;
  updated_at: string;
}

const RETURN_FIELDS = `
  id
  return_no
  order_id
  order_no
  buyer_name
  buyer_email
  is_guest
  items {
    product_id
    variant_id
    name
    variant_label
    image_url
    qty
    unit_price
  }
  reason
  comments
  images
  status
  next_statuses
  refund_amount
  refund_mode
  refunded_at
  restocked
  admin_note
  events {
    status
    note
    by
    at
  }
  created_at
  updated_at
`;

export const STORE_RETURNS_TABLE = gql`
  query StoreReturnsTable($query: TableQueryInput) {
    storeReturnsTable(query: $query) {
      total
      rows {
        ${RETURN_FIELDS}
      }
    }
  }
`;

export const STORE_ADMIN_RETURN: TypedDocumentNode<{ storeAdminReturn: StoreReturn }, { id: string }> = gql`
  query StoreAdminReturn($id: ID!) {
    storeAdminReturn(id: $id) {
      ${RETURN_FIELDS}
    }
  }
`;

export const UPDATE_RETURN = gql`
  mutation StoreUpdateReturn($id: ID!, $input: StoreReturnUpdateInput!) {
    storeUpdateReturn(id: $id, input: $input) {
      ${RETURN_FIELDS}
    }
  }
`;
