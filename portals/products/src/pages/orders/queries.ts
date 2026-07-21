import { gql } from '@apollo/client';

const ORDER_DETAIL_FIELDS = `
  id
  order_no
  buyer_name
  buyer_email
  buyer_phone
  pod_id
  pod {
    id
    pod_title
    pod_date_time
  }
  payment_ref
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
    ownership
    brand_id
  }
  currency_symbol
  items_total
  shipping_charge
  total
  fulfilment_method
  fulfilment_status
  shipping_address {
    name
    phone
    line1
    line2
    city
    state
    pincode
    country
  }
  pickup_ref
  pickup_location_id
  shiprocket {
    order_id
    shipment_id
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
  created_at
`;

export const PRODUCT_ORDERS = gql`
  query ProductOrders($filter: ProductOrderFilter) {
    productOrders(filter: $filter) {
      id
      order_no
      buyer_name
      buyer_email
      pod {
        id
        pod_title
      }
      currency_symbol
      total
      fulfilment_method
      fulfilment_status
      shiprocket {
        awb
        courier_name
      }
      created_at
    }
  }
`;

/** Row shape consumed by the product orders table columns. */
export interface ProductOrderRow {
  id: string;
  order_no: string;
  buyer_name?: string | null;
  buyer_email?: string | null;
  pod?: { id: string; pod_title: string } | null;
  currency_symbol: string;
  total: number;
  fulfilment_method: string;
  fulfilment_status: string;
  shiprocket?: { awb?: string | null } | null;
  created_at?: string | null;
}

/** Same selection as PRODUCT_ORDERS rows — feeds the server-paged table. */
const PRODUCT_ORDER_ROW_FIELDS = gql`
  fragment ProductOrderRowFields on ProductOrder {
    id
    order_no
    buyer_name
    buyer_email
    pod {
      id
      pod_title
    }
    currency_symbol
    total
    fulfilment_method
    fulfilment_status
    shiprocket {
      awb
      courier_name
    }
    created_at
  }
`;

export const PRODUCT_ORDERS_TABLE = gql`
  query ProductOrdersTable($query: TableQueryInput) {
    productOrdersTable(query: $query) {
      total
      rows {
        ...ProductOrderRowFields
      }
    }
  }
  ${PRODUCT_ORDER_ROW_FIELDS}
`;

export const PRODUCT_ORDER = gql`
  query ProductOrder($id: ID!) {
    productOrder(id: $id) {
      ${ORDER_DETAIL_FIELDS}
    }
  }
`;

export const ADVANCE_PRODUCT_ORDER_STATUS = gql`
  mutation AdvanceProductOrderStatus($id: ID!, $status: FulfilmentStatus!, $note: String) {
    advanceProductOrderStatus(id: $id, status: $status, note: $note) {
      ${ORDER_DETAIL_FIELDS}
    }
  }
`;

export const SET_PRODUCT_ORDER_FULFILMENT_METHOD = gql`
  mutation SetProductOrderFulfilmentMethod($id: ID!, $method: FulfilmentMethod!) {
    setProductOrderFulfilmentMethod(id: $id, method: $method) {
      ${ORDER_DETAIL_FIELDS}
    }
  }
`;

export const CREATE_PRODUCT_ORDER_SHIPMENT = gql`
  mutation CreateProductOrderShipment($id: ID!, $pickup_location: String) {
    createProductOrderShipment(id: $id, pickup_location: $pickup_location) {
      ${ORDER_DETAIL_FIELDS}
    }
  }
`;

export const REFRESH_PRODUCT_ORDER_TRACKING = gql`
  mutation RefreshProductOrderTracking($id: ID!) {
    refreshProductOrderTracking(id: $id) {
      ${ORDER_DETAIL_FIELDS}
    }
  }
`;
