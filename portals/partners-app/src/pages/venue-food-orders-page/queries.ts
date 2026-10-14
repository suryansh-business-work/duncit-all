import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  MutationCancelVenueFoodOrderArgs,
  MutationSetVenueFoodOrderStatusArgs,
  VenueFoodFeedback,
  VenueFoodOrder,
  VenueFoodOrderLine,
  VenueFoodOrderStatus,
  VenueFoodPaymentStatus,
} from '@duncit/gql-types';
import type { SwitchableVenue } from '@duncit/utils';

export type FoodOrderStatus = VenueFoodOrderStatus;
export type FoodPaymentStatus = VenueFoodPaymentStatus;
export type FoodOrderLine = Pick<VenueFoodOrderLine, 'item_id' | 'name' | 'diet' | 'unit_price' | 'quantity' | 'line_total'>;
/** What the guest said about a served order — absent until they rate it. */
export type FoodOrderFeedback = Pick<VenueFoodFeedback, 'rating' | 'comment' | 'images' | 'submitted_at'>;

/** One paid food order as the board, its details dialog and every action read it. */
export type FoodOrderRow = Pick<
  VenueFoodOrder,
  | 'id'
  | 'order_no'
  | 'customer_name'
  | 'customer_phone'
  | 'table_label'
  | 'note'
  | 'subtotal'
  | 'discount_pct'
  | 'discount_amount'
  | 'coupon_code'
  | 'coupon_pct'
  | 'coupon_discount_amount'
  | 'total'
  | 'currency_symbol'
  | 'status'
  | 'payment_status'
  | 'cancel_reason'
  | 'created_at'
  | 'venue_gstin'
  | 'invoice_available'
  | 'subscribe_events'
> & { items: FoodOrderLine[]; feedback?: FoodOrderFeedback | null };

const FOOD_ORDER_FIELDS = `
  id
  order_no
  customer_name
  customer_phone
  table_label
  note
  items { item_id name diet unit_price quantity line_total }
  subtotal
  discount_pct
  discount_amount
  coupon_code
  coupon_pct
  coupon_discount_amount
  total
  currency_symbol
  status
  payment_status
  cancel_reason
  created_at
  venue_gstin
  invoice_available
  subscribe_events
  feedback { rating comment images submitted_at }
`;

export interface FoodOrderVenue extends SwitchableVenue {
  offers_food: boolean;
}

/** The owner's venues for the picker, with whether each serves food. */
export const FOOD_ORDER_VENUES: TypedDocumentNode<{ myVenues: FoodOrderVenue[] }, Record<string, never>> = gql`
  query VenueFoodOrderVenues {
    myVenues {
      id
      venue_name
      city
      status
      offers_food
    }
  }
`;

/** One venue's paid (or refunded) food orders — server-scoped to its owner. */
export const VENUE_FOOD_ORDERS_TABLE = gql`
  query VenueFoodOrdersTable($venue_id: ID!, $query: TableQueryInput) {
    venueFoodOrdersTable(venue_id: $venue_id, query: $query) {
      total
      rows { ${FOOD_ORDER_FIELDS} }
    }
  }
`;

export const SET_VENUE_FOOD_ORDER_STATUS: TypedDocumentNode<
  { setVenueFoodOrderStatus: FoodOrderRow },
  MutationSetVenueFoodOrderStatusArgs
> = gql`
  mutation SetVenueFoodOrderStatus($order_id: ID!, $status: VenueFoodOrderStatus!) {
    setVenueFoodOrderStatus(order_id: $order_id, status: $status) { ${FOOD_ORDER_FIELDS} }
  }
`;

export const CANCEL_VENUE_FOOD_ORDER: TypedDocumentNode<
  { cancelVenueFoodOrder: FoodOrderRow },
  MutationCancelVenueFoodOrderArgs
> = gql`
  mutation CancelVenueFoodOrder($order_id: ID!, $reason: String!) {
    cancelVenueFoodOrder(order_id: $order_id, reason: $reason) { ${FOOD_ORDER_FIELDS} }
  }
`;
