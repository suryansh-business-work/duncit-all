/**
 * The buyer's order detail page — mWeb `/orders/:orderId` and the app's
 * `OrderDetail` screen (rule 27). Three rules both render, so they live here:
 *
 * - the **detailed timeline**: the status ladder of `product-orders.ts` with the
 *   real `tracking_events` folded in — when each rung was reached and what the
 *   courier scanned under it;
 * - the **support-ticket draft** a "Get help with this order" button opens;
 * - **which downloads** the order offers.
 *
 * Framework-free: labels arrive through `t`, dates stay ISO for each app's own
 * formatter.
 */
import {
  ALL_FULFILMENT_STATUSES,
  FULFILMENT_TONE,
  fulfilmentFlow,
  isTerminalFulfilment,
  statusLabel,
  type FulfilmentStatus,
  type FulfilmentTone,
  type TimelineStep,
} from './product-orders';

/** One stored tracking event, as the buyer queries return it. */
export interface OrderTrackingEvent {
  /** Our own status code (events the platform wrote) or the courier's scan label. */
  status: string;
  /** ShipRocket's status id on a courier scan; 0 on an event the platform wrote. */
  code?: number | null;
  location?: string | null;
  note?: string | null;
  at?: string | null;
}

/** One courier scan, in the courier's own words. */
export interface OrderScan {
  label: string;
  location: string;
  note: string;
  /** ISO, or null when the courier sent no usable time. */
  at: string | null;
}

/** A rung of the ladder with what actually happened on it. */
export interface DetailedTimelineStep extends TimelineStep {
  /** When the order reached this rung (ISO) — null when unknown or still ahead. */
  at: string | null;
  /** Where the parcel was last scanned on this rung. */
  location: string;
  /** The courier's latest note on this rung — or, for a cancellation, why. */
  note: string;
  /** How the rung's dot should read. */
  tone: FulfilmentTone;
  /** Every courier scan made while the order sat on this rung, oldest first. */
  scans: OrderScan[];
}

/** The order facts the timeline reads. */
export interface OrderForTimeline {
  fulfilment_method: string;
  fulfilment_status: string;
  created_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  tracking_events?: readonly OrderTrackingEvent[] | null;
}

const OWN_STATUSES: ReadonlySet<string> = new Set<string>(ALL_FULFILMENT_STATUSES);

type ScanRule = readonly [match: (label: string) => boolean, status: FulfilmentStatus];

const has =
  (...words: string[]) =>
  (label: string) =>
    words.some((word) => label.includes(word));

/**
 * ShipRocket's scan labels → our lifecycle. Mirrors the server's
 * `mapShiprocketStatus` (`shiprocket.statusMap.ts`), which is what moves the
 * order — first match wins, so the specific phrases sit above the words they
 * contain.
 */
const SCAN_RULES: readonly ScanRule[] = [
  [has('RTO DELIVERED'), 'RTO_DELIVERED'],
  [(label) => label.startsWith('RTO') || label.includes('RETURN TO ORIGIN'), 'RTO'],
  [has('UNDELIVERED', 'NDR', 'DELIVERY FAILED', 'DELIVERY ATTEMPTED'), 'NDR'],
  [has('LOST', 'UNTRACEABLE', 'DESTROYED', 'DISPOSED'), 'LOST'],
  [(label) => label === 'CANCELED' || label === 'CANCELLED' || label.includes('CANCELLED BEFORE'), 'CANCELLED'],
  [has('OUT FOR DELIVERY'), 'OUT_FOR_DELIVERY'],
  [has('DELIVERED'), 'DELIVERED'],
  [has('PICKED UP', 'IN TRANSIT', 'SHIPPED', 'DISPATCHED', 'REACHED', 'DELAYED', 'MISROUTED', 'IN FLIGHT'), 'SHIPPED'],
  [has('PICKUP', 'MANIFEST'), 'PICKUP_SCHEDULED'],
  [has('AWB ASSIGNED'), 'AWB_ASSIGNED'],
];

/** Our status for a courier scan label, or null when the label says nothing we track. */
export function courierScanStatus(label: string | null | undefined): FulfilmentStatus | null {
  const text = String(label ?? '')
    .trim()
    .toUpperCase()
    .split('_')
    .join(' ');
  if (!text) return null;
  return SCAN_RULES.find(([match]) => match(text))?.[1] ?? null;
}

/** A tracking event resolved once: what it proves, and whether the courier said it. */
interface Stamped extends OrderScan {
  status: FulfilmentStatus | null;
  /** A courier scan — only these carry words a buyer should read. */
  scan: boolean;
  /** Sort key; 0 for an event with no usable time. */
  ms: number;
}

function stamp(event: OrderTrackingEvent): Stamped {
  const at = event.at ?? '';
  const ms = Date.parse(at);
  const timed = !Number.isNaN(ms);
  return {
    status: OWN_STATUSES.has(event.status) ? (event.status as FulfilmentStatus) : courierScanStatus(event.status),
    scan: !!event.code,
    label: event.status,
    location: event.location ?? '',
    note: event.note ?? '',
    at: timed ? at : null,
    ms: timed ? ms : 0,
  };
}

/** The furthest rung of the flow any event proves the order reached (never before the first). */
const furthestReached = (flow: readonly FulfilmentStatus[], events: readonly Stamped[]): number =>
  events.reduce((max, event) => Math.max(max, flow.indexOf(event.status as FulfilmentStatus)), 0);

/** Which rung a scan belongs under, or -1 to stay on the rung the parcel is already at. */
function scanRung(rungs: readonly string[], activeIdx: number, offLadder: boolean, status: FulfilmentStatus | null): number {
  if (!status) return -1;
  const idx = rungs.indexOf(status);
  // A scan never files under a rung the order has not reached.
  if (idx >= 0) return Math.min(idx, activeIdx);
  // Delivery trouble (a failed attempt, a return) reads under the order's own off-ladder step.
  return offLadder ? activeIdx : -1;
}

/**
 * The courier's scans, filed under the rung the parcel was on when each was
 * made. Answers a lookup: the scans of rung `i`, oldest first.
 */
function scansByRung(
  rungs: readonly string[],
  activeIdx: number,
  offLadder: boolean,
  events: readonly Stamped[],
): (rung: number) => OrderScan[] {
  const filed: { rung: number; scan: OrderScan }[] = [];
  let rung = 0;
  for (const event of events) {
    if (!event.scan) continue;
    rung = Math.max(rung, scanRung(rungs, activeIdx, offLadder, event.status));
    filed.push({ rung, scan: { label: event.label, location: event.location, note: event.note, at: event.at } });
  }
  return (index) => filed.filter((entry) => entry.rung === index).map((entry) => entry.scan);
}

/** When each status was first seen, by any event that carries a time. */
function firstSeen(events: readonly Stamped[]): Map<string, string> {
  const seen = new Map<string, string>();
  for (const event of events) {
    if (event.status && event.at && !seen.has(event.status)) seen.set(event.status, event.at);
  }
  return seen;
}

/**
 * The order's progress in ladder order (first rung first), each rung carrying
 * when it was reached and the courier scans made on it.
 *
 * - An order on its ladder shows the whole flow: done, current, still ahead.
 * - An order whose status the ladder does not carry shows the rungs it really
 *   reached, then that status as its own step. If it is still moving — a
 *   shipment waiting for its courier pickup, a failed delivery attempt (NDR),
 *   a state no client knows yet — the rest of the ladder follows, still ahead.
 *   If it came to rest (cancelled, lost, failed, returned), that step closes
 *   the timeline: nothing it never reached is drawn.
 *
 * Only courier scans (`code` set) lend their words: the platform's own events
 * give a rung its time, but their notes are written for operators.
 */
export function buildDetailedOrderTimeline(
  order: Readonly<OrderForTimeline>,
  t: (key: string) => string,
): DetailedTimelineStep[] {
  const events = (order.tracking_events ?? []).map(stamp).sort((a, b) => a.ms - b.ms);
  const flow = fulfilmentFlow(order.fulfilment_method);
  const status = order.fulfilment_status;
  const onLadderIdx = flow.indexOf(status as FulfilmentStatus);
  const offLadder = onLadderIdx < 0;
  // An order that came to rest (cancelled, lost, returned…) has no rungs ahead of it.
  const closed = offLadder && isTerminalFulfilment(status);
  const reachedIdx = offLadder ? furthestReached(flow, events) : onLadderIdx;
  const ahead = closed ? [] : flow.slice(reachedIdx + 1);
  const rungs: readonly string[] = offLadder ? [...flow.slice(0, reachedIdx + 1), status, ...ahead] : flow;
  const activeIdx = offLadder ? reachedIdx + 1 : onLadderIdx;
  const scansOf = scansByRung(rungs, activeIdx, offLadder, events);
  const seen = firstSeen(events);
  const anchors: Record<string, string | null | undefined> = {
    PENDING: order.created_at,
    DELIVERED: order.delivered_at,
    PICKED_UP: order.delivered_at,
    CANCELLED: order.cancelled_at,
  };

  return rungs.map((rung, i) => {
    const scans = scansOf(i);
    const latest = scans[scans.length - 1];
    const reached = i <= activeIdx;
    let tone: FulfilmentTone = 'neutral';
    if (i < activeIdx) tone = 'done';
    else if (i === activeIdx) tone = FULFILMENT_TONE[rung as FulfilmentStatus] ?? 'neutral';
    return {
      status: rung,
      label: statusLabel(rung, t),
      done: i < activeIdx || closed,
      current: i === activeIdx,
      at: reached ? anchors[rung] || seen.get(rung) || scans[0]?.at || null : null,
      location: latest?.location ?? '',
      note: (rung === 'CANCELLED' && order.cancel_reason) || latest?.note || '',
      tone,
      scans,
    };
  });
}

/** The translator the draft uses — the apps' `t`, typed locally to stay zero-dep. */
export type OrderTranslate = (key: string, options?: { vars?: Record<string, string> }) => string;

/** The order facts a support agent needs to find it. */
export interface OrderForSupport {
  order_no: string;
  fulfilment_status: string;
  payment_ref?: string | null;
  cancelled_at?: string | null;
  refund?: Readonly<{ status: string }> | null;
  shiprocket?: Readonly<{ awb?: string | null; courier_name?: string | null }> | null;
  line_items: readonly Readonly<{ name: string; variant_label?: string | null; qty: number }>[];
}

/** The category values both apps' ticket forms offer (they map onto the server's enum). */
export type OrderTicketCategory = 'PAYMENT' | 'QUESTION';

export interface OrderSupportDraft {
  subject: string;
  category: OrderTicketCategory;
  message: string;
}

const lineText = (line: Readonly<{ name: string; variant_label?: string | null; qty: number }>): string => {
  const name = line.variant_label ? `${line.name} (${line.variant_label})` : line.name;
  return `${name} × ${line.qty}`;
};

/**
 * The ticket "Get help with this order" opens, prefilled — the buyer edits it
 * before sending. A ticket can only reference a pod, so the order's reference
 * ids go in the body, the way `paymentTicketDraft` carries its own: order
 * number, items, status, and the AWB and payment reference when they exist.
 * An order with money on its way back files under Payment / Refund.
 */
export function orderSupportDraft(order: Readonly<OrderForSupport>, t: OrderTranslate): OrderSupportDraft {
  const awb = order.shiprocket?.awb ?? '';
  const courier = order.shiprocket?.courier_name ?? '';
  const refunding = !!order.cancelled_at || (order.refund?.status ?? 'NONE') !== 'NONE';
  const lines = [
    t('mweb.orderDetail.supportIntro'),
    '',
    t('mweb.orderDetail.supportOrder', { vars: { orderNo: order.order_no } }),
    t('mweb.orderDetail.supportItems', { vars: { items: order.line_items.map(lineText).join(', ') } }),
    t('mweb.orderDetail.supportStatus', { vars: { status: statusLabel(order.fulfilment_status, t) } }),
  ];
  if (awb) {
    lines.push(t('mweb.orderDetail.supportAwb', { vars: { awb: courier ? `${awb} (${courier})` : awb } }));
  }
  if (order.payment_ref) {
    lines.push(t('mweb.orderDetail.supportPaymentRef', { vars: { ref: order.payment_ref } }));
  }
  return {
    subject: t('mweb.orderDetail.supportSubject', { vars: { orderNo: order.order_no } }),
    category: refunding ? 'PAYMENT' : 'QUESTION',
    message: lines.join('\n'),
  };
}

/** Which documents the order detail page offers. */
export interface OrderDownloads {
  /** Duncit's invoice for the payment that bought the order. */
  invoice: boolean;
  /** The seller's tax invoice — issued with the courier booking, so only a booked shipment has one. */
  sellerInvoice: boolean;
}

/** The order facts the downloads rule reads. */
export interface OrderForDownloads {
  payment_id?: string | null;
  fulfilment_method: string;
  shiprocket?: Readonly<{ shipment_id?: string | null }> | null;
}

/**
 * One rule for both apps: the Duncit invoice whenever a payment stands behind
 * the order; the seller's invoice once a shipped order is booked with the
 * courier (the server refuses it before that — a collected order never has one).
 */
export function orderDownloads(order: Readonly<OrderForDownloads>): OrderDownloads {
  return {
    invoice: !!order.payment_id,
    sellerInvoice: order.fulfilment_method === 'SHIP' && !!order.shiprocket?.shipment_id,
  };
}
