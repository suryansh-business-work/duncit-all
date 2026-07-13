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

export type FulfilmentMethod = 'SHIP' | 'PICKUP';

export interface ProductOrderLine {
  product_id: string;
  name: string;
  image_url: string;
  qty: number;
  unit_cost: number;
  gross: number;
}

export interface ProductOrder {
  id: string;
  order_no: string;
  fulfilment_method: FulfilmentMethod;
  fulfilment_status: string;
  currency_symbol: string;
  items_total: number;
  total: number;
  pickup_ref: string;
  pickup_location_id: string;
  created_at: string;
  line_items: ProductOrderLine[];
  shipping_address: { name: string; line1: string; city: string; state: string; pincode: string } | null;
  shiprocket: { awb: string; courier_name: string; tracking_status: string; label_url: string };
  tracking_events: Array<{ status: string; location: string; note: string; at: string }>;
}

export const FULFILMENT_LABEL: Record<FulfilmentMethod, string> = {
  SHIP: 'Ship to me',
  PICKUP: 'Pick up at venue',
};

export const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Order placed',
  AWAITING_SHIPMENT: 'Preparing shipment',
  AWB_ASSIGNED: 'Courier assigned',
  PICKUP_SCHEDULED: 'Pickup scheduled',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  READY_FOR_PICKUP: 'Ready for pickup',
  PICKED_UP: 'Picked up',
  CANCELLED: 'Cancelled',
  RTO: 'Returned to origin',
  FAILED: 'Fulfilment failed',
};

export const statusLabel = (s: string) => STATUS_LABEL[s] ?? s;

const SHIP_LADDER = ['AWAITING_SHIPMENT', 'AWB_ASSIGNED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
const PICKUP_LADDER = ['PENDING', 'READY_FOR_PICKUP', 'PICKED_UP'];
const TERMINAL = new Set(['CANCELLED', 'RTO', 'FAILED']);

export interface TimelineStep {
  status: string;
  label: string;
  done: boolean;
  current: boolean;
}

/** A step ladder for the order's fulfilment method with the current status
 * marked. Terminal states (cancelled/RTO/failed) collapse to a single step.
 * An unrecognised status falls back to the first step so the timeline is never
 * empty or broken. */
export function buildOrderTimeline(order: Pick<ProductOrder, 'fulfilment_method' | 'fulfilment_status'>): TimelineStep[] {
  if (TERMINAL.has(order.fulfilment_status)) {
    return [{ status: order.fulfilment_status, label: statusLabel(order.fulfilment_status), done: true, current: true }];
  }
  const ladder = order.fulfilment_method === 'SHIP' ? SHIP_LADDER : PICKUP_LADDER;
  const found = ladder.indexOf(order.fulfilment_status);
  const currentIdx = Math.max(found, 0);
  return ladder.map((s, i) => ({
    status: s,
    label: statusLabel(s),
    done: i < currentIdx,
    current: i === currentIdx,
  }));
}

/** Public ShipRocket tracking URL for an AWB (empty when none yet). */
export const trackingUrl = (awb: string) => (awb ? `https://shiprocket.co/tracking/${awb}` : '');

export const formatMoney = (symbol: string, amount: number) => `${symbol}${Number(amount || 0).toLocaleString('en-IN')}`;
