import type { ResultOf } from '@graphql-typed-document-node/core';

import type { MyProductOrdersForPodDocument } from '@/graphql/product-orders';

export type ProductOrder = ResultOf<
  typeof MyProductOrdersForPodDocument
>['myProductOrdersForPod'][number];
export type ProductOrderLine = ProductOrder['line_items'][number];
export type FulfilmentMethod = ProductOrder['fulfilment_method'];

const FULFILMENT_LABEL: Record<string, string> = {
  SHIP: 'Ship to me',
  PICKUP: 'Pick up at venue',
};

const STATUS_LABEL: Record<string, string> = {
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

/** Label for a fulfilment status, defaulting to the raw code if unknown. */
export const statusLabel = (s: string): string => STATUS_LABEL[s] ?? s;

/** Label for a fulfilment method, defaulting to the raw code if unknown. */
export const fulfilmentLabel = (m: string): string => FULFILMENT_LABEL[m] ?? m;

const SHIP_LADDER = [
  'AWAITING_SHIPMENT',
  'AWB_ASSIGNED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];
const PICKUP_LADDER = ['PENDING', 'READY_FOR_PICKUP', 'PICKED_UP'];
const TERMINAL = new Set(['CANCELLED', 'RTO', 'FAILED']);

export interface TimelineStep {
  status: string;
  label: string;
  done: boolean;
  current: boolean;
}

/** Step ladder for the order's fulfilment method with the current status marked.
 * Terminal states collapse to one step; an unknown status falls back to the
 * first step so the timeline is never empty. RN twin of mWeb's buildOrderTimeline. */
export function buildOrderTimeline(order: {
  fulfilment_method: string;
  fulfilment_status: string;
}): TimelineStep[] {
  if (TERMINAL.has(order.fulfilment_status)) {
    return [
      {
        status: order.fulfilment_status,
        label: statusLabel(order.fulfilment_status),
        done: true,
        current: true,
      },
    ];
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
export const trackingUrl = (awb: string): string =>
  awb ? `https://shiprocket.co/tracking/${awb}` : '';

export const formatMoney = (symbol: string, amount: number): string =>
  `${symbol}${Number(amount || 0).toLocaleString('en-IN')}`;
