import { gql } from '@/generated/graphql';

/**
 * The signed-in buyer's product orders for one pod (add-on products bought at
 * checkout) with fulfilment + tracking — RN twin of mWeb's
 * MY_PRODUCT_ORDERS_FOR_POD, backing the Pod History "Products & tracking" card.
 */
export const MyProductOrdersForPodDocument = gql(`
  query MobileMyProductOrdersForPod($podId: ID!) {
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
`);

/** Every product order the buyer has placed, across all pods — the sidebar's
 * "My Product Order History" screen (RN twin of mWeb's MY_PRODUCT_ORDERS). */
export const MyProductOrdersDocument = gql(`
  query MobileMyProductOrders {
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
`);
