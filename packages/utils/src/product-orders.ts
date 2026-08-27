/**
 * Product-order fulfilment: one status vocabulary, one ladder per method.
 *
 * Three surfaces render the same order. The buyer sees it in mWeb's Pod History
 * and in the app; the seller works it in the Products portal. They had three
 * copies of the status list, and the two the buyer sees **disagreed with the one
 * the seller drives**:
 *
 * - the apps' SHIP ladder began at `AWAITING_SHIPMENT`, so a just-placed order
 *   (`PENDING`) fell to index 0 and read "Preparing shipment" before anyone had
 *   touched it;
 * - the apps' PICKUP ladder had no `PICKUP_SCHEDULED` at all, so an order the
 *   seller had scheduled fell back to step one and read "Order placed".
 *
 * The flows below are the seller's, which is what the server actually moves
 * through, so all three now agree. Nothing here imports a framework: the labels
 * arrive through `t` and the chip tone is named by meaning.
 */

/** How the buyer gets the goods. */
export type FulfilmentMethod = 'SHIP' | 'PICKUP';

/** Every state an order can be in, whichever way it is fulfilled. */
export type FulfilmentStatus =
  | 'PENDING'
  | 'AWAITING_SHIPMENT'
  | 'AWB_ASSIGNED'
  | 'PICKUP_SCHEDULED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'CANCELLED'
  | 'RTO'
  | 'FAILED';

/** The seller's status filter lists these, so the order is the working order. */
export const ALL_FULFILMENT_STATUSES: readonly FulfilmentStatus[] = [
  'PENDING',
  'AWAITING_SHIPMENT',
  'AWB_ASSIGNED',
  'PICKUP_SCHEDULED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'READY_FOR_PICKUP',
  'PICKED_UP',
  'CANCELLED',
  'RTO',
  'FAILED',
];

/** The forward flow for a shipped order. */
export const SHIP_FLOW: readonly FulfilmentStatus[] = [
  'PENDING',
  'AWAITING_SHIPMENT',
  'AWB_ASSIGNED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

/** The forward flow for a collected order. */
export const PICKUP_FLOW: readonly FulfilmentStatus[] = [
  'PENDING',
  'PICKUP_SCHEDULED',
  'READY_FOR_PICKUP',
  'PICKED_UP',
];

/** States an order does not come back from — they collapse the timeline to one step. */
const TERMINAL = new Set<string>(['CANCELLED', 'RTO', 'FAILED']);

/** True when the order has stopped moving. */
export function isTerminalFulfilment(status: string): boolean {
  return TERMINAL.has(status);
}

/** The flow an order of this method walks. */
export function fulfilmentFlow(method: string): readonly FulfilmentStatus[] {
  return method === 'SHIP' ? SHIP_FLOW : PICKUP_FLOW;
}

/** Localization keys, never sentences — see rule 38. */
export const FULFILMENT_METHOD_KEYS: Record<FulfilmentMethod, string> = {
  SHIP: 'fulfilment.methodShip',
  PICKUP: 'fulfilment.methodPickup',
};

/** Localization keys for every status. */
export const FULFILMENT_STATUS_KEYS: Record<FulfilmentStatus, string> = {
  PENDING: 'fulfilment.statusPending',
  AWAITING_SHIPMENT: 'fulfilment.statusAwaitingShipment',
  AWB_ASSIGNED: 'fulfilment.statusAwbAssigned',
  PICKUP_SCHEDULED: 'fulfilment.statusPickupScheduled',
  SHIPPED: 'fulfilment.statusShipped',
  OUT_FOR_DELIVERY: 'fulfilment.statusOutForDelivery',
  DELIVERED: 'fulfilment.statusDelivered',
  READY_FOR_PICKUP: 'fulfilment.statusReadyForPickup',
  PICKED_UP: 'fulfilment.statusPickedUp',
  CANCELLED: 'fulfilment.statusCancelled',
  RTO: 'fulfilment.statusReturnedToOrigin',
  FAILED: 'fulfilment.statusFailed',
};

/** The translator a caller hands in. Typed locally to keep this package zero-dep. */
export type FulfilmentTranslate = (key: string) => string;

/**
 * The words for a status.
 *
 * An unmapped code renders as itself — visible and greppable, never blank. That
 * matters here: the server can add a state before any client knows about it.
 */
export function statusLabel(status: string, t: FulfilmentTranslate): string {
  const key = FULFILMENT_STATUS_KEYS[status as FulfilmentStatus];
  return key ? t(key) : status;
}

/** The words for a fulfilment method — same fallback rule as `statusLabel`. */
export function fulfilmentLabel(method: string, t: FulfilmentTranslate): string {
  const key = FULFILMENT_METHOD_KEYS[method as FulfilmentMethod];
  return key ? t(key) : method;
}

/** How a status chip should read at a glance, named by meaning not by palette. */
export type FulfilmentTone = 'neutral' | 'pending' | 'moving' | 'done' | 'failed';

/** Status → tone. Each surface maps the tone onto its own chip colours. */
export const FULFILMENT_TONE: Record<FulfilmentStatus, FulfilmentTone> = {
  PENDING: 'pending',
  AWAITING_SHIPMENT: 'pending',
  AWB_ASSIGNED: 'moving',
  PICKUP_SCHEDULED: 'moving',
  SHIPPED: 'moving',
  OUT_FOR_DELIVERY: 'moving',
  DELIVERED: 'done',
  READY_FOR_PICKUP: 'moving',
  PICKED_UP: 'done',
  CANCELLED: 'neutral',
  RTO: 'failed',
  FAILED: 'failed',
};

/** Tone → MUI `<Chip color>`, for mWeb and the portals. */
export const TONE_CHIP_COLOR: Record<
  FulfilmentTone,
  'default' | 'warning' | 'info' | 'success' | 'error'
> = {
  neutral: 'default',
  pending: 'warning',
  moving: 'info',
  done: 'success',
  failed: 'error',
};

/** One rung of the order's progress ladder. */
export interface TimelineStep {
  status: string;
  label: string;
  done: boolean;
  current: boolean;
}

/**
 * The order's progress, with the current rung marked.
 *
 * Terminal states collapse to a single step — there is no ladder left to walk.
 * An unrecognised status falls back to the first rung so the timeline is never
 * empty or broken, which is the behaviour that hid the two ladder bugs above.
 */
export function buildOrderTimeline(
  order: Readonly<{ fulfilment_method: string; fulfilment_status: string }>,
  t: FulfilmentTranslate,
): TimelineStep[] {
  if (isTerminalFulfilment(order.fulfilment_status)) {
    return [
      {
        status: order.fulfilment_status,
        label: statusLabel(order.fulfilment_status, t),
        done: true,
        current: true,
      },
    ];
  }
  const flow = fulfilmentFlow(order.fulfilment_method);
  const currentIdx = Math.max(flow.indexOf(order.fulfilment_status as FulfilmentStatus), 0);
  return flow.map((status, i) => ({
    status,
    label: statusLabel(status, t),
    done: i < currentIdx,
    current: i === currentIdx,
  }));
}

/** Public ShipRocket tracking URL for an AWB — empty until one is assigned. */
export function trackingUrl(awb: string): string {
  return awb ? `https://shiprocket.co/tracking/${awb}` : '';
}
