import { gql } from '@apollo/client';
import type {
  GiftCardOrderAddress,
  GiftCardOrderDeliveryMode,
  GiftCardOrderFulfilment,
  GiftCardOrderPayment,
  GiftCardOrderShipment,
  GiftCardOrderTrackingEvent,
} from '@duncit/utils';

export type { GiftCardOrderAddress, GiftCardOrderShipment, GiftCardOrderTrackingEvent };

/** A member's own gift card order — never a card code or passcode. */
export interface GiftCardOrder {
  id: string;
  order_no: string;
  delivery_mode: GiftCardOrderDeliveryMode;
  design_name: string;
  design_front_url: string;
  design_back_url: string;
  amount: number;
  quantity: number;
  cards_value: number;
  shipping_fee: number;
  total: number;
  currency_symbol: string;
  recipient_name: string;
  recipient_email: string;
  message: string;
  shipping_address: GiftCardOrderAddress | null;
  payment_status: GiftCardOrderPayment;
  fulfilment_status: GiftCardOrderFulfilment;
  cards_issued: number;
  paid_at: string | null;
  delivered_at: string | null;
  created_at: string;
  shipment: GiftCardOrderShipment | null;
  tracking_events: GiftCardOrderTrackingEvent[];
}

const ORDER_LIST_FIELDS = `
  id
  order_no
  delivery_mode
  design_name
  design_front_url
  amount
  quantity
  total
  currency_symbol
  payment_status
  fulfilment_status
  created_at
`;

export const MY_GIFT_CARD_ORDERS = gql`
  query MyGiftCardOrders($page: Int, $page_size: Int) {
    myGiftCardOrders(page: $page, page_size: $page_size) {
      total
      page
      page_size
      rows {
        ${ORDER_LIST_FIELDS}
      }
    }
  }
`;

export const MY_GIFT_CARD_ORDER = gql`
  query MyGiftCardOrder($order_no: String!) {
    myGiftCardOrder(order_no: $order_no) {
      ${ORDER_LIST_FIELDS}
      design_back_url
      cards_value
      shipping_fee
      recipient_name
      recipient_email
      message
      shipping_address { name phone line1 line2 landmark city state pincode country }
      cards_issued
      paid_at
      delivered_at
      shipment { courier_name awb tracking_status etd pickup_scheduled_date last_synced_at }
      tracking_events { status location note at }
    }
  }
`;

export type GiftCardOrderRow = Pick<
  GiftCardOrder,
  | 'id'
  | 'order_no'
  | 'delivery_mode'
  | 'design_name'
  | 'design_front_url'
  | 'amount'
  | 'quantity'
  | 'total'
  | 'currency_symbol'
  | 'payment_status'
  | 'fulfilment_status'
  | 'created_at'
>;
