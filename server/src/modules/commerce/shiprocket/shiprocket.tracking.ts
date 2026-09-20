import { logs } from '@observability/log';
import {
  FULFILMENT_STATUSES,
  ProductOrderModel,
  type FulfilmentStatus,
  type IProductOrder,
} from '@modules/commerce/productOrder/productOrder.model';
import { StoreReturnModel } from '@modules/commerce/store/storeReturn.model';
import { hasShiprocketAccount, withShiprocketAccount } from './shiprocket.client';
import { accountForOrder } from './shiprocket.shipment';
import { parseShiprocketDate, trackByAwb, trackByShipment, type TrackActivity, type TrackResult } from './shiprocket.gateway';
import { isFinalStatus, mapShiprocketStatus, nextStatus } from './shiprocket.statusMap';
import { applyReturnTracking } from './shiprocket.returns';

/**
 * Where a parcel is. Two feeds write here and nothing else:
 *
 * - the webhook (`/webhooks/courier-updates`), ShipRocket's push — primary;
 * - a sweep every two hours that pulls `/courier/track/awb/{awb}` for any
 *   shipment the webhook has not touched in six — the fallback for a missed
 *   or unregistered webhook.
 *
 * Every scan becomes a tracking event (deduplicated, so a replayed webhook or
 * a pull that returns the whole history adds nothing twice); the order's
 * status only moves forward (`nextStatus`).
 */

/** The shared post-status reaction, imported lazily — productOrder imports this module. */
async function afterStatusChange(order: IProductOrder, previous: FulfilmentStatus) {
  const { afterStatusChange: react } = await import('@modules/commerce/productOrder/productOrder.service');
  await react(order, previous);
}

/** Add the scans we have not stored yet, oldest first. */
export function mergeEvents(order: IProductOrder, activities: TrackActivity[], statusId: number) {
  const seen = new Set(order.tracking_events.map((e) => `${new Date(e.at).getTime()}|${e.status}`));
  const scans = activities
    .map((a) => ({ ...a, at: parseShiprocketDate(a.date) ?? new Date() }))
    .sort((x, y) => x.at.getTime() - y.at.getTime());
  for (const scan of scans) {
    const key = `${scan.at.getTime()}|${scan.status}`;
    if (seen.has(key)) continue;
    seen.add(key);
    order.tracking_events.push({ status: scan.status, code: statusId, location: scan.location, note: scan.note, at: scan.at } as any);
  }
}

/** Fold a tracking answer into the order. Answers the new status, or null when it stayed put. */
export function applyTracking(order: IProductOrder, t: TrackResult): FulfilmentStatus | null {
  order.shiprocket.tracking_status = t.current_status;
  order.shiprocket.status_code = t.status_id;
  if (t.etd) order.shiprocket.etd = t.etd;
  order.shiprocket.last_synced_at = new Date();
  mergeEvents(order, t.activities, t.status_id);
  const next = nextStatus(order.fulfilment_status, mapShiprocketStatus(t.current_status));
  if (!next) return null;
  order.fulfilment_status = next;
  if (next === 'NDR') {
    order.shiprocket.alert = 'NDR';
    order.shiprocket.alert_message = t.activities[0]?.note || t.current_status;
    order.shiprocket.ndr_action = '';
    order.shiprocket.ndr_actioned_at = null;
  } else if (order.shiprocket.alert === 'NDR') {
    order.shiprocket.alert = '';
    order.shiprocket.alert_message = '';
  }
  return next;
}

/** Pull the latest tracking for one order and persist it. */
export async function refreshTracking(order: IProductOrder): Promise<IProductOrder> {
  return withShiprocketAccount(await accountForOrder(order), () => refreshOnAccount(order));
}

async function refreshOnAccount(order: IProductOrder): Promise<IProductOrder> {
  if (!(await hasShiprocketAccount())) return order;
  const { awb, shipment_id } = order.shiprocket;
  if (!awb && !shipment_id) return order;
  const previous = order.fulfilment_status;
  const t = awb ? await trackByAwb(awb) : await trackByShipment(shipment_id);
  const moved = applyTracking(order, t);
  await order.save();
  if (moved) await afterStatusChange(order, previous);
  return order;
}

/** A webhook body as a tracking answer: its scans, status and ETA. */
function webhookTracking(payload: Record<string, any>): TrackResult {
  const scans = Array.isArray(payload.scans) ? payload.scans : [];
  return {
    current_status: String(payload.current_status ?? payload.shipment_status ?? ''),
    status_id: Number(payload.current_status_id ?? payload.shipment_status_id) || 0,
    etd: String(payload.etd ?? ''),
    activities: scans.map((s: Record<string, unknown>) => ({
      status: String(s['sr-status-label'] ?? s.status ?? ''),
      location: String(s.location ?? ''),
      note: String(s.activity ?? ''),
      date: String(s.date ?? ''),
    })),
  };
}

/**
 * Apply one ShipRocket webhook. The body names the AWB and our order number
 * (`order_id` is the channel order id we sent); a return shipment's AWB lands
 * on its return instead. Answers what it updated, for the log.
 */
export async function applyWebhookEvent(payload: Record<string, any>): Promise<string> {
  const awb = String(payload.awb ?? payload.awb_code ?? '').trim();
  const orderNo = String(payload.order_id ?? '').trim();
  const t = webhookTracking(payload);
  const order =
    (awb ? await ProductOrderModel.findOne({ 'shiprocket.awb': awb }) : null) ??
    (orderNo ? await ProductOrderModel.findOne({ order_no: orderNo }) : null);
  if (order) {
    const previous = order.fulfilment_status;
    const moved = applyTracking(order, t);
    await order.save();
    if (moved) await afterStatusChange(order, previous);
    return `order ${order.order_no}`;
  }
  const ret = awb ? await StoreReturnModel.findOne({ 'pickup.awb': awb }) : null;
  if (ret) {
    await applyReturnTracking(ret, t);
    return `return ${ret.return_no}`;
  }
  return 'nothing';
}

/* ------------------------------------------------------------------ *
 * The fallback sweep
 * ------------------------------------------------------------------ */

/** A shipment is re-pulled when tracking has been quiet this long. */
export const STALE_AFTER_MS = 6 * 3_600_000;
/** How many shipments one sweep pulls — ShipRocket rate-limits tracking. */
const SWEEP_BATCH = 150;

const OPEN_STATUSES = FULFILMENT_STATUSES.filter((s) => !isFinalStatus(s) && s !== 'FAILED' && s !== 'PENDING');

/** Pull tracking for every open shipment the webhook has not updated lately. Answers how many were pulled. */
export async function sweepStaleTracking(): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_AFTER_MS);
  const stale = { $or: [{ 'shiprocket.last_synced_at': null }, { 'shiprocket.last_synced_at': { $lt: cutoff } }] };
  const orders = await ProductOrderModel.find({
    fulfilment_method: 'SHIP',
    fulfilment_status: { $in: OPEN_STATUSES },
    'shiprocket.awb': { $ne: '' },
    ...stale,
  })
    .sort({ 'shiprocket.last_synced_at': 1 })
    .limit(SWEEP_BATCH);
  let pulled = 0;
  for (const order of orders) {
    try {
      await refreshTracking(order);
      pulled += 1;
    } catch (error) {
      logs.server.warn('shiprocket', 'sweepStaleTracking', { error, order_no: order.order_no });
    }
  }
  const returns = await StoreReturnModel.find({
    'pickup.awb': { $ne: '' },
    'pickup.status': { $in: ['BOOKED', 'PICKUP_SCHEDULED', 'IN_TRANSIT'] },
    $or: [{ 'pickup.last_synced_at': null }, { 'pickup.last_synced_at': { $lt: cutoff } }],
  }).limit(SWEEP_BATCH);
  for (const ret of returns) {
    try {
      await applyReturnTracking(ret, await trackByAwb(ret.pickup.awb));
      pulled += 1;
    } catch (error) {
      logs.server.warn('shiprocket', 'sweepStaleTracking', { error, return_no: ret.return_no });
    }
  }
  return pulled;
}
