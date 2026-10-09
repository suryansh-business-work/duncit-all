import { gql, type TypedDocumentNode } from '@apollo/client';
import type { BrandOrdersTableQuery } from '@duncit/utils';
import type { ShipToValues } from '@duncit/forms/schemas';

/**
 * Brand Studio → Brand Orders: the Pod Shop orders of the signed-in partner's
 * own brands. The server scopes every operation here to those brands, so an id
 * of anyone else's order answers "not found". Native twin: graphql/brand-orders.
 */

/** What a row of the list shows. */
export const BRAND_ORDERS_TABLE: TypedDocumentNode<BrandOrdersTableData, BrandOrdersTableVars> = gql`
  query BrandProductOrdersTable($query: TableQueryInput) {
    brandProductOrdersTable(query: $query) {
      total
      page
      page_size
      rows {
        id
        order_no
        buyer_name
        fulfilment_method
        fulfilment_status
        currency_symbol
        total
        created_at
        line_items {
          qty
        }
        shiprocket {
          awb
        }
      }
    }
  }
`;

const ORDER_DETAIL_FIELDS = `
  id
  order_no
  buyer_name
  buyer_phone
  fulfilment_method
  fulfilment_status
  currency_symbol
  items_total
  shipping_charge
  total
  created_at
  cancelled_at
  last_error
  pickup_ref
  line_items {
    product_id
    variant_id
    variant_label
    name
    image_url
    qty
    gross
  }
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
    order_id
    shipment_id
    awb
    courier_name
    tracking_status
    etd
    pickup_scheduled_date
  }
`;

/** One order, with everything the detail page and its actions read. */
export const BRAND_PRODUCT_ORDER: TypedDocumentNode<BrandProductOrderData, { id: string }> = gql`
  query BrandProductOrder($id: ID!) {
    brandProductOrder(id: $id) {
      ${ORDER_DETAIL_FIELDS}
    }
  }
`;

export const BRAND_BOOK_SHIPMENT: TypedDocumentNode<{ brandBookProductOrderShipment: BrandOrderDetail }, { id: string }> = gql`
  mutation BrandBookProductOrderShipment($id: ID!) {
    brandBookProductOrderShipment(id: $id) {
      ${ORDER_DETAIL_FIELDS}
    }
  }
`;

export const BRAND_REFRESH_TRACKING: TypedDocumentNode<{ brandRefreshProductOrderTracking: BrandOrderDetail }, { id: string }> = gql`
  mutation BrandRefreshProductOrderTracking($id: ID!) {
    brandRefreshProductOrderTracking(id: $id) {
      ${ORDER_DETAIL_FIELDS}
    }
  }
`;

export const BRAND_UPDATE_ADDRESS: TypedDocumentNode<
  { brandUpdateProductOrderAddress: BrandOrderDetail },
  { id: string; address: ShipToInput }
> = gql`
  mutation BrandUpdateProductOrderAddress($id: ID!, $address: OrderShippingAddressInput!) {
    brandUpdateProductOrderAddress(id: $id, address: $address) {
      ${ORDER_DETAIL_FIELDS}
    }
  }
`;

export const BRAND_SHIPMENT_FILE: TypedDocumentNode<ShipmentFileData, { ids: string[]; kind: ShipmentFileKind }> = gql`
  mutation BrandProductOrderShipmentFile($ids: [ID!]!, $kind: ShipmentDocumentKind!) {
    brandProductOrderShipmentFile(ids: $ids, kind: $kind) {
      filename
      mime
      content_base64
    }
  }
`;

export interface BrandOrderRow {
  id: string;
  order_no: string;
  buyer_name: string;
  fulfilment_method: string;
  fulfilment_status: string;
  currency_symbol: string;
  total: number;
  created_at: string;
  line_items: Array<{ qty: number }>;
  shiprocket: { awb: string };
}

export interface BrandOrdersTableData {
  brandProductOrdersTable: { total: number; page: number; page_size: number; rows: BrandOrderRow[] };
}

export interface BrandOrdersTableVars {
  query: BrandOrdersTableQuery;
}

export interface BrandOrderAddress {
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

export interface BrandOrderDetail {
  id: string;
  order_no: string;
  buyer_name: string;
  buyer_phone: string | null;
  fulfilment_method: string;
  fulfilment_status: string;
  currency_symbol: string;
  items_total: number;
  shipping_charge: number;
  total: number;
  created_at: string;
  cancelled_at: string | null;
  last_error: string;
  pickup_ref: string;
  line_items: Array<{
    product_id: string;
    variant_id: string;
    variant_label: string;
    name: string;
    image_url: string;
    qty: number;
    gross: number;
  }>;
  shipping_address: BrandOrderAddress | null;
  shiprocket: {
    order_id: string;
    shipment_id: string;
    awb: string;
    courier_name: string;
    tracking_status: string;
    etd: string;
    pickup_scheduled_date: string;
  };
}

export interface BrandProductOrderData {
  brandProductOrder: BrandOrderDetail | null;
}

export type ShipmentFileKind = 'LABEL' | 'INVOICE' | 'MANIFEST';

export interface ShipmentFileData {
  brandProductOrderShipmentFile: { filename: string; mime: string; content_base64: string };
}

/** The ship-to the address mutation sends — the form's values plus the email the order already had. */
export type ShipToInput = ShipToValues & { email: string };
