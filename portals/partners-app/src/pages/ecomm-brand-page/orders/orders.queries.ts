import { gql } from '@apollo/client';
import type {
  OrderLineItem,
  OrderRefund,
  OrderShippingAddress,
  OrderTrackingEvent,
  ProductOrder,
  ShipmentDocumentKind,
  ShipmentFile,
  ShipRocketInfo,
} from '@duncit/gql-types';

/** Everything the table row and the detail page read — one selection for the list and every action. */
const ORDER_FIELDS = `
  id
  order_no
  buyer_name
  buyer_phone
  line_items { product_id variant_id name variant_label qty unit_cost image_url brand_id }
  currency_symbol
  total
  fulfilment_method
  fulfilment_status
  shipping_address { name phone email line1 line2 landmark city state pincode country }
  shiprocket { order_id shipment_id awb courier_name tracking_status etd pickup_scheduled_date sandbox }
  tracking_events { status location at }
  last_error
  cancelled_at
  cancel_reason
  deletion_request_no
  refund { status amount coins razorpay_refund_id refunded_at error }
  created_at
`;

/** A partner sees only their own brands' Pod Shop orders (server-scoped). */
export const BRAND_ORDERS_TABLE = gql`
  query PartnerBrandProductOrdersTable($query: TableQueryInput, $brand_id: ID) {
    brandProductOrdersTable(query: $query, brand_id: $brand_id) {
      total
      rows { ${ORDER_FIELDS} }
    }
  }
`;

/** One own-brand order — the details page, opened from a row or a shared link. */
export const BRAND_ORDER = gql`
  query PartnerBrandProductOrder($id: ID!) {
    brandProductOrder(id: $id) { ${ORDER_FIELDS} }
  }
`;

export const BOOK_ORDER_SHIPMENT = gql`
  mutation PartnerBookProductOrderShipment($id: ID!) {
    brandBookProductOrderShipment(id: $id) { ${ORDER_FIELDS} }
  }
`;

export const REFRESH_ORDER_TRACKING = gql`
  mutation PartnerRefreshProductOrderTracking($id: ID!) {
    brandRefreshProductOrderTracking(id: $id) { ${ORDER_FIELDS} }
  }
`;

export const UPDATE_ORDER_ADDRESS = gql`
  mutation PartnerUpdateProductOrderAddress($id: ID!, $address: OrderShippingAddressInput!) {
    brandUpdateProductOrderAddress(id: $id, address: $address) { ${ORDER_FIELDS} }
  }
`;

export const ORDER_SHIPMENT_FILE = gql`
  mutation PartnerProductOrderShipmentFile($ids: [ID!]!, $kind: ShipmentDocumentKind!) {
    brandProductOrderShipmentFile(ids: $ids, kind: $kind) { filename mime content_base64 }
  }
`;

export type OrderItem = Pick<OrderLineItem, 'product_id' | 'variant_id' | 'name' | 'variant_label' | 'qty' | 'unit_cost' | 'image_url' | 'brand_id'>;
export type OrderShipTo = Pick<OrderShippingAddress, 'name' | 'phone' | 'email' | 'line1' | 'line2' | 'landmark' | 'city' | 'state' | 'pincode' | 'country'>;
export type OrderScan = Pick<OrderTrackingEvent, 'status' | 'location' | 'at'>;
export type OrderDocumentKind = ShipmentDocumentKind;
/** Where the money going back to the buyer stands. */
export type OrderRefundFacts = Pick<OrderRefund, 'status' | 'amount' | 'coins' | 'razorpay_refund_id' | 'refunded_at' | 'error'>;
export type OrderShipmentFile = Pick<ShipmentFile, 'filename' | 'mime' | 'content_base64'>;

export type OrderRow = Pick<
  ProductOrder,
  | 'id'
  | 'order_no'
  | 'buyer_name'
  | 'buyer_phone'
  | 'currency_symbol'
  | 'total'
  | 'fulfilment_method'
  | 'fulfilment_status'
  | 'last_error'
  | 'cancelled_at'
  | 'cancel_reason'
  | 'deletion_request_no'
  | 'created_at'
> & {
  line_items: OrderItem[];
  shipping_address: OrderShipTo | null;
  shiprocket: Pick<
    ShipRocketInfo,
    'order_id' | 'shipment_id' | 'awb' | 'courier_name' | 'tracking_status' | 'etd' | 'pickup_scheduled_date' | 'sandbox'
  >;
  tracking_events: OrderScan[];
  refund: OrderRefundFacts;
  /** The selling brand's name — only the deletion-refunds list asks for it. */
  brand_name?: string | null;
};

/** Call an own-brand order off: shipment stopped, stock back, the buyer refunded in full and told why. */
export const CANCEL_ORDER = gql`
  mutation PartnerCancelProductOrder($id: ID!, $reason: String!) {
    brandCancelProductOrder(id: $id, reason: $reason) { ${ORDER_FIELDS} }
  }
`;

/** The partner's orders that a deletion request cancelled, with each buyer's refund. */
export const MY_DELETION_REFUNDS_TABLE = gql`
  query PartnerDeletionRefundsTable($query: TableQueryInput, $brand_id: ID) {
    myDeletionRefundsTable(query: $query, brand_id: $brand_id) {
      total
      rows { ${ORDER_FIELDS} brand_name }
    }
  }
`;
