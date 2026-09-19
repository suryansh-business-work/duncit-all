import { gql, type TypedDocumentNode } from '@apollo/client';
import { ORDER_FIELDS, type OrderRow, type StoreOrder } from './queries';

export type { OrderParcel, ShipmentOps } from './queries';

export interface CourierOption {
  courier_company_id: string;
  courier_name: string;
  rate: number;
  etd: string;
  cod: boolean;
  rating: number;
  recommended: boolean;
}

export type ShipmentDocument = 'LABEL' | 'INVOICE' | 'MANIFEST';
export type NdrAction = 'REATTEMPT' | 'RETURN';

export interface ParcelInput {
  weight_kg: number;
  length_cm: number;
  breadth_cm: number;
  height_cm: number;
}

export const STORE_SHIPMENT_COURIERS: TypedDocumentNode<{ storeShipmentCouriers: CourierOption[] }, { id: string }> = gql`
  query StoreShipmentCouriers($id: ID!) {
    storeShipmentCouriers(id: $id) {
      courier_company_id
      courier_name
      rate
      etd
      cod
      rating
      recommended
    }
  }
`;

/** Every order write here answers the order; the shipment block is re-read with the detail query. */
export const ORDER_REFRESH = { refetchQueries: ['StoreAdminOrder'] };

export const BOOK_SHIPMENT: TypedDocumentNode<{ storeBookShipment: StoreOrder }, { id: string; courier_id?: string | null }> = gql`
  mutation StoreBookShipment($id: ID!, $courier_id: String) {
    storeBookShipment(id: $id, courier_id: $courier_id) {
      ${ORDER_FIELDS}
    }
  }
`;

export const SET_PARCEL: TypedDocumentNode<{ storeSetParcel: StoreOrder }, { id: string; input: ParcelInput | null }> = gql`
  mutation StoreSetParcel($id: ID!, $input: StoreParcelInput) {
    storeSetParcel(id: $id, input: $input) {
      ${ORDER_FIELDS}
    }
  }
`;

export interface ShippingAddressInput {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
}

export const UPDATE_SHIPPING_ADDRESS: TypedDocumentNode<
  { storeUpdateShippingAddress: StoreOrder },
  { id: string; input: ShippingAddressInput }
> = gql`
  mutation StoreUpdateShippingAddress($id: ID!, $input: StoreAddressInput!) {
    storeUpdateShippingAddress(id: $id, input: $input) {
      ${ORDER_FIELDS}
    }
  }
`;

/** A ShipRocket PDF itself, so the console can print it in place or save it under this name. */
export interface ShipmentFile {
  filename: string;
  mime: string;
  content_base64: string;
}

export const SHIPMENT_FILE: TypedDocumentNode<
  { storeShipmentFile: ShipmentFile },
  { ids: string[]; kind: ShipmentDocument }
> = gql`
  mutation StoreShipmentFile($ids: [ID!]!, $kind: ShipmentDocumentKind!) {
    storeShipmentFile(ids: $ids, kind: $kind) {
      filename
      mime
      content_base64
    }
  }
`;

export interface BookingRetry {
  attempted: number;
  booked: number;
  failed: number;
}

export const RETRY_FAILED_BOOKINGS: TypedDocumentNode<{ storeRetryFailedBookings: BookingRetry }> = gql`
  mutation StoreRetryFailedBookings {
    storeRetryFailedBookings {
      attempted
      booked
      failed
    }
  }
`;

export const ANSWER_NDR: TypedDocumentNode<
  { storeAnswerNdr: StoreOrder },
  { id: string; action: NdrAction; comments?: string | null }
> = gql`
  mutation StoreAnswerNdr($id: ID!, $action: StoreNdrAction!, $comments: String) {
    storeAnswerNdr(id: $id, action: $action, comments: $comments) {
      ${ORDER_FIELDS}
    }
  }
`;

/** An order waiting on an operator, as the Needs-action list shows it. */
export interface AlertOrder extends OrderRow {
  last_error: string;
  shiprocket: { awb: string; courier_name: string; tracking_status: string };
}

export const STORE_SHIPMENT_ALERTS: TypedDocumentNode<{ storeShipmentAlerts: AlertOrder[] }> = gql`
  query StoreShipmentAlerts {
    storeShipmentAlerts {
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
      last_error
      shiprocket {
        awb
        courier_name
        tracking_status
      }
      created_at
    }
  }
`;
