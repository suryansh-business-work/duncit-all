import { gql } from '@apollo/client';

/** The signed-in buyer's product orders for one pod (add-on products they
 * bought at checkout), with fulfilment + tracking. */
export const MY_PRODUCT_ORDERS_FOR_POD = gql`
  query MyProductOrdersForPod($podId: ID!) {
    myProductOrdersForPod(pod_doc_id: $podId) {
      id
      order_no
      fulfilment_method
      fulfilment_status
      currency_symbol
      items_total
      total
      pickup_ref
      pickup_location_id
      created_at
      line_items {
        product_id
        variant_id
        variant_label
        name
        image_url
        qty
        unit_cost
        gross
      }
      shipping_address {
        name
        line1
        city
        state
        pincode
      }
      shiprocket {
        awb
        courier_name
        tracking_status
        label_url
      }
      tracking_events {
        status
        location
        note
        at
      }
    }
  }
`;

/** Every product order the signed-in buyer has placed, across all pods —
 * the "My Product Order History" page (newest first). */
export const MY_PRODUCT_ORDERS = gql`
  query MyProductOrders {
    myProductOrders {
      id
      order_no
      fulfilment_method
      fulfilment_status
      currency_symbol
      items_total
      total
      pickup_ref
      pickup_location_id
      created_at
      pod {
        id
        pod_title
      }
      line_items {
        product_id
        variant_id
        variant_label
        name
        image_url
        qty
        unit_cost
        gross
      }
      shipping_address {
        name
        line1
        city
        state
        pincode
      }
      shiprocket {
        awb
        courier_name
        tracking_status
        label_url
      }
      tracking_events {
        status
        location
        note
        at
      }
    }
  }
`;


/**
 * The order shapes this page reads.
 *
 * Everything that DECIDES anything — the status vocabulary, the ladder per
 * fulfilment method, the labels — lives in @duncit/utils, because the native
 * app and the Products portal render the same order and the three copies had
 * drifted apart on which states a ladder even contains.
 */
export type { FulfilmentMethod, FulfilmentStatus, TimelineStep } from '@duncit/utils';
export { trackingUrl } from '@duncit/utils';

export interface ProductOrderLine {
  product_id: string;
  variant_id?: string;
  variant_label?: string;
  name: string;
  image_url: string;
  qty: number;
  unit_cost: number;
  gross: number;
}

export interface ProductOrder {
  id: string;
  order_no: string;
  fulfilment_method: 'SHIP' | 'PICKUP';
  fulfilment_status: string;
  currency_symbol: string;
  items_total: number;
  total: number;
  pickup_ref: string;
  pickup_location_id: string;
  created_at: string;
  /** Present on the all-orders history query only. */
  pod?: { id: string; pod_title: string } | null;
  line_items: ProductOrderLine[];
  shipping_address: {
    name: string;
    line1: string;
    city: string;
    state: string;
    pincode: string;
  } | null;
  shiprocket: { awb: string; courier_name: string; tracking_status: string; label_url: string };
  tracking_events: Array<{ status: string; location: string; note: string; at: string }>;
}
