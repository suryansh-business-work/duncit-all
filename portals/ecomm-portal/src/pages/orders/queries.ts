import { gql, type TypedDocumentNode } from '@apollo/client';

/** One pet-store order as the orders table and a customer's history list it. */
export interface OrderRow {
  id: string;
  order_no: string;
  buyer_id: string | null;
  buyer_name: string;
  buyer_email: string;
  currency_symbol: string;
  total: number;
  /** This order's share of the coupon, prepaid discount and coins. */
  discount_total: number;
  line_items: { qty: number }[];
  payment_method: string;
  fulfilment_status: string;
  shiprocket: { awb: string };
  created_at: string;
}

export interface OrderLineItem {
  product_id: string;
  variant_id: string;
  variant_label: string;
  variant_sku: string;
  name: string;
  sku: string;
  image_url: string;
  qty: number;
  unit_cost: number;
  gross: number;
}

export interface OrderAddress {
  name: string;
  phone: string;
  email: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface OrderEvent {
  status: string;
  location: string;
  note: string;
  at: string;
}

export interface OrderNote {
  id: string;
  text: string;
  by_name: string;
  at: string;
}

/** The whole order, as its detail page works it. */
export interface StoreOrder extends Omit<OrderRow, 'line_items' | 'shiprocket'> {
  buyer_phone: string | null;
  line_items: OrderLineItem[];
  items_total: number;
  shipping_charge: number;
  shipping_address: OrderAddress | null;
  shiprocket: { awb: string; courier_name: string; tracking_status: string; label_url: string; last_synced_at: string | null };
  tracking_events: OrderEvent[];
  last_error: string;
  cod_amount: number;
  cod_collected_at: string | null;
  coins_share: number;
  cancelled_at: string | null;
  cancel_reason: string;
  cancelled_by: string;
  notes: OrderNote[];
}

export interface StoreAdminPayment {
  id: string;
  payment_id: string;
  invoice_no: string;
  status: string;
  gateway: string;
  total: number;
  coupon_code: string;
  coupon_discount: number;
  coins_redeemed: number;
  prepaid_discount: number;
  cod_fee: number;
  refunded_amount: number;
  paid_at: string | null;
}

/** A return raised against an order, as the order page lists it. */
export interface OrderReturnSummary {
  id: string;
  return_no: string;
  status: string;
  refund_amount: number;
  created_at: string;
  items: { product_id: string; qty: number }[];
}

export interface StoreAdminOrder {
  order: StoreOrder;
  payment: StoreAdminPayment | null;
  return_ids: string[];
  customer_order_count: number;
  is_guest: boolean;
}

const ROW_FIELDS = `
  id
  order_no
  buyer_id
  buyer_name
  buyer_email
  currency_symbol
  total
  discount_total
  line_items {
    qty
  }
  payment_method
  fulfilment_status
  shiprocket {
    awb
  }
  created_at
`;

const ORDER_FIELDS = `
  id
  order_no
  buyer_id
  buyer_name
  buyer_email
  buyer_phone
  currency_symbol
  line_items {
    product_id
    variant_id
    variant_label
    variant_sku
    name
    sku
    image_url
    qty
    unit_cost
    gross
  }
  items_total
  shipping_charge
  total
  payment_method
  fulfilment_status
  shipping_address {
    name
    phone
    email
    line1
    line2
    landmark
    city
    state
    pincode
    country
  }
  shiprocket {
    awb
    courier_name
    tracking_status
    label_url
    last_synced_at
  }
  tracking_events {
    status
    location
    note
    at
  }
  last_error
  cod_amount
  cod_collected_at
  discount_total
  coins_share
  cancelled_at
  cancel_reason
  cancelled_by
  notes {
    id
    text
    by_name
    at
  }
  created_at
`;

export const STORE_ORDERS_TABLE = gql`
  query StoreOrdersTable($query: TableQueryInput) {
    storeOrdersTable(query: $query) {
      total
      rows {
        ${ROW_FIELDS}
      }
    }
  }
`;

export const STORE_CUSTOMER_ORDERS: TypedDocumentNode<{ storeCustomerOrders: OrderRow[] }, { email: string }> = gql`
  query StoreCustomerOrders($email: String!) {
    storeCustomerOrders(email: $email) {
      ${ROW_FIELDS}
    }
  }
`;

export const STORE_ADMIN_ORDER: TypedDocumentNode<{ storeAdminOrder: StoreAdminOrder }, { id: string }> = gql`
  query StoreAdminOrder($id: ID!) {
    storeAdminOrder(id: $id) {
      order {
        ${ORDER_FIELDS}
      }
      payment {
        id
        payment_id
        invoice_no
        status
        gateway
        total
        coupon_code
        coupon_discount
        coins_redeemed
        prepaid_discount
        cod_fee
        refunded_amount
        paid_at
      }
      return_ids
      customer_order_count
      is_guest
    }
  }
`;

export const STORE_RETURNS_FOR_ORDER: TypedDocumentNode<{ storeReturnsForOrder: OrderReturnSummary[] }, { order_id: string }> = gql`
  query StoreReturnsForOrder($order_id: ID!) {
    storeReturnsForOrder(order_id: $order_id) {
      id
      return_no
      status
      refund_amount
      created_at
      items {
        product_id
        qty
      }
    }
  }
`;

/** The operator's reasons for calling an order off, from the store's settings. */
export const STORE_CANCEL_REASONS: TypedDocumentNode<{ storeAdminSettings: { cancel_reasons: string[] } }> = gql`
  query StoreCancelReasons {
    storeAdminSettings {
      cancel_reasons
    }
  }
`;

export const UPDATE_ORDER_STATUS = gql`
  mutation StoreUpdateOrderStatus($id: ID!, $status: FulfilmentStatus!, $note: String) {
    storeUpdateOrderStatus(id: $id, status: $status, note: $note) {
      ${ORDER_FIELDS}
    }
  }
`;

export const ADD_ORDER_NOTE = gql`
  mutation StoreAddOrderNote($id: ID!, $text: String!) {
    storeAddOrderNote(id: $id, text: $text) {
      ${ORDER_FIELDS}
    }
  }
`;

export const CANCEL_ORDER = gql`
  mutation StoreAdminCancelOrder($id: ID!, $reason: String!, $refund_mode: StoreRefundMode!) {
    storeAdminCancelOrder(id: $id, reason: $reason, refund_mode: $refund_mode) {
      ${ORDER_FIELDS}
    }
  }
`;

export const MARK_COD_COLLECTED = gql`
  mutation StoreMarkCodCollected($id: ID!) {
    storeMarkCodCollected(id: $id) {
      ${ORDER_FIELDS}
    }
  }
`;

export const CREATE_SHIPMENT = gql`
  mutation StoreCreateShipment($id: ID!) {
    storeCreateShipment(id: $id) {
      ${ORDER_FIELDS}
    }
  }
`;

export const REFRESH_TRACKING = gql`
  mutation StoreRefreshTracking($id: ID!) {
    storeRefreshTracking(id: $id) {
      ${ORDER_FIELDS}
    }
  }
`;
