import type { ResultOf } from '@graphql-typed-document-node/core';

import type { MyProductOrdersForPodDocument } from '@/graphql/product-orders';
import { fallbackT, type Translate } from '@/i18n/fallback';

export type ProductOrder = ResultOf<
  typeof MyProductOrdersForPodDocument
>['myProductOrdersForPod'][number];
export type ProductOrderLine = ProductOrder['line_items'][number];
export type FulfilmentMethod = ProductOrder['fulfilment_method'];

/** Translation KEYS, not text — the words live in @duncit/i18n so mWeb and the
 * native app cannot start naming the same shipment differently (rule 27). */
const FULFILMENT_KEY: Record<string, string> = {
  SHIP: 'mweb.podHistory.fulfilShip',
  PICKUP: 'mweb.podHistory.fulfilPickup',
};

const STATUS_KEY: Record<string, string> = {
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

/** Label for a fulfilment status, defaulting to the raw code if unknown. `t`
 * comes from the rendering screen; the bundled English is the default. */
export const statusLabel = (s: string, t: Translate = fallbackT): string => {
  const key = STATUS_KEY[s];
  return key ? t(key) : s;
};

/** Label for a fulfilment method, defaulting to the raw code if unknown. */
export const fulfilmentLabel = (m: string, t: Translate = fallbackT): string => {
  const key = FULFILMENT_KEY[m];
  return key ? t(key) : m;
};

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
export function buildOrderTimeline(
  order: {
    fulfilment_method: string;
    fulfilment_status: string;
  },
  t: Translate = fallbackT,
): TimelineStep[] {
  if (TERMINAL.has(order.fulfilment_status)) {
    return [
      {
        status: order.fulfilment_status,
        label: statusLabel(order.fulfilment_status, t),
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
    label: statusLabel(s, t),
    done: i < currentIdx,
    current: i === currentIdx,
  }));
}

/** Public ShipRocket tracking URL for an AWB (empty when none yet). */
export const trackingUrl = (awb: string): string =>
  awb ? `https://shiprocket.co/tracking/${awb}` : '';

export const formatMoney = (symbol: string, amount: number): string =>
  `${symbol}${Number(amount || 0).toLocaleString('en-IN')}`;
