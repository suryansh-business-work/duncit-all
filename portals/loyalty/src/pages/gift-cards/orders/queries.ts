import { gql } from '@apollo/client';
import type { GiftCardOrderAddress, GiftCardOrderShipment, GiftCardOrderTrackingEvent } from '@duncit/utils';

export type { GiftCardOrderAddress, GiftCardOrderShipment, GiftCardOrderTrackingEvent };

export type GiftCardDeliveryMode = 'DIGITAL' | 'PHYSICAL';
export type GiftCardOrderPaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type GiftCardOrderFulfilmentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PRINTED'
  | 'AWAITING_SHIPMENT'
  | 'AWB_ASSIGNED'
  | 'PICKUP_SCHEDULED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'NDR'
  | 'RTO'
  | 'RTO_DELIVERED'
  | 'LOST'
  | 'CANCELLED'
  | 'FAILED';

/** One order as the console reads it. */
export interface GiftCardAdminOrder {
  id: string;
  order_no: string;
  delivery_mode: GiftCardDeliveryMode;
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
  payment_status: GiftCardOrderPaymentStatus;
  fulfilment_status: GiftCardOrderFulfilmentStatus;
  cards_issued: number;
  paid_at: string | null;
  emailed_at: string | null;
  printed_at: string | null;
  delivered_at: string | null;
  created_at: string;
  shipment: GiftCardOrderShipment | null;
  tracking_events: GiftCardOrderTrackingEvent[];
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  payment_id: string;
  payment_doc_id: string;
  physical_batch_id: string | null;
  gift_card_ids: string[];
  stock_short: boolean;
  last_error: string;
  shipment_alert: string;
  shipment_alert_message: string;
  shipment_sandbox: boolean;
  label_available: boolean;
}

export interface GiftCardOrderHistoryEntry {
  id: string;
  action: string;
  note: string;
  actor_name: string;
  created_at: string;
}

export interface GiftCardOrderStats {
  paid_orders: number;
  paid_value: number;
  pending_payment: number;
  to_print: number;
  to_ship: number;
  in_transit: number;
  delivered: number;
  returned_or_lost: number;
  needs_attention: number;
}

const ORDER_FIELDS = `
  id
  order_no
  delivery_mode
  design_name
  design_front_url
  design_back_url
  amount
  quantity
  cards_value
  shipping_fee
  total
  currency_symbol
  recipient_name
  recipient_email
  message
  shipping_address { name phone line1 line2 landmark city state pincode country }
  payment_status
  fulfilment_status
  cards_issued
  paid_at
  emailed_at
  printed_at
  delivered_at
  created_at
  shipment { courier_name awb tracking_status etd pickup_scheduled_date last_synced_at }
  tracking_events { status location note at }
  buyer_name
  buyer_email
  buyer_phone
  payment_id
  payment_doc_id
  physical_batch_id
  gift_card_ids
  stock_short
  last_error
  shipment_alert
  shipment_alert_message
  shipment_sandbox
  label_available
`;

export const GIFT_CARD_ORDERS_TABLE = gql`
  query LoyaltyGiftCardOrdersTable($query: TableQueryInput) {
    giftCardOrdersTable(query: $query) {
      total
      page
      page_size
      rows {
        ${ORDER_FIELDS}
      }
    }
  }
`;

/** The Finance currency symbol, for the order book's money tiles. */
export const GIFT_ORDER_CURRENCY = gql`
  query LoyaltyGiftOrderCurrency {
    publicFinanceSettings {
      currency_symbol
    }
  }
`;

export const GIFT_CARD_ORDER_STATS = gql`
  query LoyaltyGiftCardOrderStats {
    giftCardOrderStats {
      paid_orders
      paid_value
      pending_payment
      to_print
      to_ship
      in_transit
      delivered
      returned_or_lost
      needs_attention
    }
  }
`;

export const GIFT_CARD_ORDER_ADMIN = gql`
  query LoyaltyGiftCardOrderAdmin($id: ID!) {
    giftCardOrderAdmin(id: $id) {
      order {
        ${ORDER_FIELDS}
      }
      history { id action note actor_name created_at }
    }
  }
`;

export const MARK_GIFT_CARD_ORDER_PRINTED = gql`
  mutation LoyaltyMarkGiftCardOrderPrinted($id: ID!) {
    markGiftCardOrderPrinted(id: $id) {
      ${ORDER_FIELDS}
    }
  }
`;

export const BOOK_GIFT_CARD_ORDER_SHIPMENT = gql`
  mutation LoyaltyBookGiftCardOrderShipment($id: ID!) {
    bookGiftCardOrderShipment(id: $id) {
      ${ORDER_FIELDS}
    }
  }
`;

export const REFRESH_GIFT_CARD_ORDER_TRACKING = gql`
  mutation LoyaltyRefreshGiftCardOrderTracking($id: ID!) {
    refreshGiftCardOrderTracking(id: $id) {
      ${ORDER_FIELDS}
    }
  }
`;

export const UPDATE_GIFT_CARD_ORDER_ADDRESS = gql`
  mutation LoyaltyUpdateGiftCardOrderAddress($id: ID!, $input: GiftCardOrderAddressInput!) {
    updateGiftCardOrderAddress(id: $id, input: $input) {
      ${ORDER_FIELDS}
    }
  }
`;

export const GIFT_CARD_ORDER_LABEL_FILE = gql`
  mutation LoyaltyGiftCardOrderLabelFile($id: ID!) {
    giftCardOrderLabelFile(id: $id)
  }
`;
