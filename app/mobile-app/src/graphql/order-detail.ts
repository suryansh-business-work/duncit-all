import { gql } from '@/generated/graphql';

/**
 * My Product Orders → one order. The server answers only for the signed-in
 * buyer's own pod-shop order — anyone else's id, a pet-store order and a bad
 * id all come back null. The selection is the history card's (so the shared
 * return components take the order as-is) plus the money, payment, full
 * address and courier facts only this screen shows; `shiprocket.label_url`
 * rides along for that shared shape and the server blanks it for a buyer.
 * RN twin of mWeb's MY_PRODUCT_ORDER (pages/order-detail-page/queries).
 */
export const MyProductOrderDocument = gql(`
  query MobileMyProductOrder($id: ID!) {
    myProductOrder(id: $id) {
      id
      order_no
      fulfilment_method
      fulfilment_status
      currency_symbol
      items_total
      shipping_charge
      discount_total
      coins_share
      total
      payment_id
      payment_ref
      payment_method
      pickup_ref
      pickup_location_id
      created_at
      delivered_at
      cancelled_at
      cancel_reason
      refund {
        status
        amount
        coins
        refunded_at
      }
      returnable {
        product_id
        variant_id
        returnable_qty
        returnable_until
      }
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
        phone
        line1
        line2
        landmark
        city
        state
        pincode
        country
      }
      shiprocket {
        shipment_id
        awb
        courier_name
        tracking_status
        etd
        label_url
      }
      tracking_events {
        status
        code
        location
        note
        at
      }
    }
  }
`);

/** The seller's tax invoice for the buyer's own order, as a PDF to save or share. */
export const MyProductOrderSellerInvoiceDocument = gql(`
  mutation MobileMyProductOrderSellerInvoice($id: ID!) {
    myProductOrderSellerInvoice(id: $id) {
      filename
      mime
      content_base64
    }
  }
`);
