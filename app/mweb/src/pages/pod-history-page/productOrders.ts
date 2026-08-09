import { gql } from '@apollo/client';
import { fallbackT, type Translate } from '../../i18n/fallback';

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

export type FulfilmentMethod = 'SHIP' | 'PICKUP';

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
  fulfilment_method: FulfilmentMethod;
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
  shipping_address: { name: string; line1: string; city: string; state: string; pincode: string } | null;
  shiprocket: { awb: string; courier_name: string; tracking_status: string; label_url: string };
  tracking_events: Array<{ status: string; location: string; note: string; at: string }>;
}

/** Translation KEYS, not text — the words live in @duncit/i18n so mWeb and the
 * native app cannot start naming the same shipment differently (rule 27). */
export const FULFILMENT_LABEL: Record<FulfilmentMethod, string> = {
  SHIP: 'mweb.podHistory.fulfilShip',
  PICKUP: 'mweb.podHistory.fulfilPickup',
};

/** Translation KEYS, not text — see FULFILMENT_LABEL. */
export const STATUS_LABEL: Record<string, string> = {
  PENDING: 'mweb.podHistory.statusOrderPlaced',
  AWAITING_SHIPMENT: 'mweb.podHistory.statusPreparingShipment',
  AWB_ASSIGNED: 'mweb.podHistory.statusCourierAssigned',
  PICKUP_SCHEDULED: 'mweb.podHistory.statusPickupScheduled',
  SHIPPED: 'mweb.podHistory.statusShipped',
  OUT_FOR_DELIVERY: 'mweb.podHistory.statusOutForDelivery',
  DELIVERED: 'mweb.podHistory.statusDelivered',
  READY_FOR_PICKUP: 'mweb.podHistory.statusReadyForPickup',
  PICKED_UP: 'mweb.podHistory.statusPickedUp',
  CANCELLED: 'mweb.podHistory.statusCancelled',
  RTO: 'mweb.podHistory.statusReturnedToOrigin',
  FAILED: 'mweb.podHistory.statusFulfilmentFailed',
};

/** An unmapped status renders as its raw code — visible and greppable, never
 * blank. `t` comes from the rendering screen; the bundled English is the
 * default so a call site without one still reads as words. */
export const statusLabel = (s: string, t: Translate = fallbackT) => {
  const key = STATUS_LABEL[s];
  return key ? t(key) : s;
};

/** Human label for a fulfilment method — see {@link statusLabel}. */
export const fulfilmentLabel = (m: string, t: Translate = fallbackT) => {
  const key = FULFILMENT_LABEL[m as FulfilmentMethod];
  return key ? t(key) : m;
};

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
export function buildOrderTimeline(
  order: Pick<ProductOrder, 'fulfilment_method' | 'fulfilment_status'>,
  t: Translate = fallbackT,
): TimelineStep[] {
  if (TERMINAL.has(order.fulfilment_status)) {
    return [{ status: order.fulfilment_status, label: statusLabel(order.fulfilment_status, t), done: true, current: true }];
  }
  const ladder = order.fulfilment_method === 'SHIP' ? SHIP_LADDER : PICKUP_LADDER;
  const found = ladder.indexOf(order.fulfilment_status);
  const currentIdx = Math.max(found, 0);
  return ladder.map((s, i) => ({
    status: s,
    label: statusLabel(s, t),
    done: i < currentIdx,
    current: i === currentIdx,
  }));
}

/** Public ShipRocket tracking URL for an AWB (empty when none yet). */
export const trackingUrl = (awb: string) => (awb ? `https://shiprocket.co/tracking/${awb}` : '');

export const formatMoney = (symbol: string, amount: number) => `${symbol}${Number(amount || 0).toLocaleString('en-IN')}`;
