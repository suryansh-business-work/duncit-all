import { gql, type TypedDocumentNode } from '@apollo/client';
import type { ProductOrder } from '../pod-history-page/productOrders';

/**
 * My Product Orders → one order (/orders/:orderId). The server answers only
 * for the signed-in buyer's own pod-shop order — anyone else's id, a pet-store
 * order and a bad id all come back null. Native twin: graphql/order-detail.
 */
export const MY_PRODUCT_ORDER: TypedDocumentNode<MyProductOrderData, { id: string }> = gql`
  query MyProductOrder($id: ID!) {
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
`;

/** The seller's tax invoice for the buyer's own order, as a PDF to save. */
export const MY_ORDER_SELLER_INVOICE: TypedDocumentNode<SellerInvoiceData, { id: string }> = gql`
  mutation MyProductOrderSellerInvoice($id: ID!) {
    myProductOrderSellerInvoice(id: $id) {
      filename
      mime
      content_base64
    }
  }
`;

/**
 * The order as the detail page reads it: the history card's shape (so the
 * shared return components take it as-is) plus the money, payment, full
 * address and courier facts only this page shows. `shiprocket.label_url` rides
 * along for that shared shape; the server blanks it for a buyer.
 */
export interface OrderDetail extends ProductOrder {
  shipping_charge: number;
  discount_total: number;
  coins_share: number;
  payment_id: string;
  payment_ref: string;
  payment_method: 'PREPAID' | 'COD';
  shipping_address:
    | (NonNullable<ProductOrder['shipping_address']> & {
        phone: string;
        line2: string;
        landmark: string;
        country: string;
      })
    | null;
  shiprocket: ProductOrder['shiprocket'] & { shipment_id: string; etd: string };
  tracking_events: Array<ProductOrder['tracking_events'][number] & { code: number }>;
}

export interface MyProductOrderData {
  myProductOrder: OrderDetail | null;
}

export interface SellerInvoiceData {
  myProductOrderSellerInvoice: { filename: string; mime: string; content_base64: string };
}
