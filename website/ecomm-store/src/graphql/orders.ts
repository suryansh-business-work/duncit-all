import { gql, type TypedDocumentNode } from '@apollo/client';

import type { NoVars } from './types';

/** An order read by its number — plus, for a guest, the key their checkout handed back. */
export interface OrderKeyVars {
  order_no: string;
  access_key?: string;
}

export type FulfilmentStatus =
  | 'PENDING'
  | 'AWAITING_SHIPMENT'
  | 'AWB_ASSIGNED'
  | 'PICKUP_SCHEDULED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'CANCELLED'
  | 'RTO'
  | 'RTO_DELIVERED'
  | 'NDR'
  | 'LOST'
  | 'FAILED';

export type StorePaymentState =
  | 'PAID'
  | 'PENDING'
  | 'FAILED'
  | 'REFUNDED'
  | 'REFUND_INITIATED'
  | 'COD_PENDING'
  | 'COD_COLLECTED'
  | 'CANCELLED';

export interface StoreOrderItem {
  product_id: string;
  variant_id: string;
  name: string;
  variant_label: string;
  image_url: string;
  qty: number;
  unit_price: number;
  line_total: number;
  returned_qty: number;
}

export interface StoreOrderAddress {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface StoreOrderEvent {
  status: string;
  location: string;
  note: string;
  at: string;
}

export interface StoreOrder {
  id: string;
  order_no: string;
  status: FulfilmentStatus;
  payment_method: 'PREPAID' | 'COD';
  payment_state: StorePaymentState;
  invoice_no: string;
  items: StoreOrderItem[];
  items_total: number;
  shipping_charge: number;
  discount_total: number;
  amount_paid: number;
  cod_amount: number;
  total: number;
  currency_symbol: string;
  shipping_address: StoreOrderAddress | null;
  courier_name: string;
  awb: string;
  tracking_url: string;
  /** The courier's estimated delivery date; '' until one is assigned. */
  etd: string;
  events: StoreOrderEvent[];
  created_at: string;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string;
  can_cancel: boolean;
  can_return: boolean;
  return_deadline: string | null;
}

const ORDER_FIELDS = `
  id
  order_no
  status
  payment_method
  payment_state
  invoice_no
  items { product_id variant_id name variant_label image_url qty unit_price line_total returned_qty }
  items_total
  shipping_charge
  discount_total
  amount_paid
  cod_amount
  total
  currency_symbol
  shipping_address { name phone line1 line2 landmark city state pincode country }
  courier_name
  awb
  tracking_url
  etd
  events { status location note at }
  created_at
  delivered_at
  cancelled_at
  cancel_reason
  can_cancel
  can_return
  return_deadline
`;

export type StoreOrderResultStatus = 'PAID' | 'PENDING_PAYMENT' | 'COD_CONFIRMED' | 'FAILED';

export interface StoreOrderConfirmation {
  status: StoreOrderResultStatus;
  payment_doc_id: string;
  payment_id: string;
  total: number;
  currency_symbol: string;
  access_key: string;
  orders: StoreOrder[];
}

export const ORDER_CONFIRMATION: TypedDocumentNode<{ storeOrderConfirmation: StoreOrderConfirmation }, { payment_doc_id: string; cart_token: string; access_key?: string }> = gql`
  query EcommStoreOrderConfirmation($payment_doc_id: ID!, $cart_token: String, $access_key: String) {
    storeOrderConfirmation(payment_doc_id: $payment_doc_id, cart_token: $cart_token, access_key: $access_key) {
      status
      payment_doc_id
      payment_id
      total
      currency_symbol
      access_key
      orders { ${ORDER_FIELDS} }
    }
  }
`;

export const MY_ORDERS: TypedDocumentNode<{ storeMyOrders: StoreOrder[] }, NoVars> = gql`
  query EcommStoreMyOrders {
    storeMyOrders { ${ORDER_FIELDS} }
  }
`;

export const STORE_ORDER: TypedDocumentNode<{ storeOrder: StoreOrder }, OrderKeyVars> = gql`
  query EcommStoreOrder($order_no: String!, $access_key: String) {
    storeOrder(order_no: $order_no, access_key: $access_key) { ${ORDER_FIELDS} }
  }
`;

export const TRACK_ORDER: TypedDocumentNode<{ storeTrackOrder: StoreOrder }, { order_no: string; contact: string }> = gql`
  query EcommStoreTrackOrder($order_no: String!, $contact: String!) {
    storeTrackOrder(order_no: $order_no, contact: $contact) { ${ORDER_FIELDS} }
  }
`;

export const CANCEL_ORDER: TypedDocumentNode<{ storeCancelOrder: StoreOrder }, OrderKeyVars & { reason: string }> = gql`
  mutation EcommStoreCancelOrder($order_no: String!, $reason: String!, $access_key: String) {
    storeCancelOrder(order_no: $order_no, reason: $reason, access_key: $access_key) { ${ORDER_FIELDS} }
  }
`;

export const INVOICE_PDF: TypedDocumentNode<{ storeInvoicePdf: string }, OrderKeyVars> = gql`
  query EcommStoreInvoicePdf($order_no: String!, $access_key: String) {
    storeInvoicePdf(order_no: $order_no, access_key: $access_key)
  }
`;
