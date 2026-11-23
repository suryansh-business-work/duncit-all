import { GraphQLError } from 'graphql';
import type { FulfilmentStatus } from '@modules/commerce/productOrder/productOrder.model';
import { getShiprocketAccount } from '@modules/commerce/shiprocket/shiprocket.account';
import { addressProblems } from '@modules/commerce/shiprocket/shiprocket.address';
import {
  hasShiprocketAccount,
  isSandboxCall,
  shiprocketError,
  withShiprocketAccount,
} from '@modules/commerce/shiprocket/shiprocket.client';
import {
  couriersForOrder,
  createOrderAdhoc,
  fetchDocumentPdf,
  findOrderByChannelId,
  generateLabel,
  generatePickup,
  parseShiprocketDate,
  trackByAwb,
  trackByShipment,
  type AdhocOrderResult,
  type TrackResult,
} from '@modules/commerce/shiprocket/shiprocket.gateway';
import { awbFor, cheapestCourier, walletOrNull } from '@modules/commerce/shiprocket/shiprocket.shipment';
import { mapShiprocketStatus, nextStatus } from '@modules/commerce/shiprocket/shiprocket.statusMap';
import { giftCardSettingsService } from '@modules/finance/giftcard/giftcard.settings.service';
import { logs } from '@observability/log';
import {
  GiftCardOrderModel,
  type GiftCardFulfilmentStatus,
  type IGiftCardOrder,
} from './giftCardOrder.model';
import { recordOrderActivity } from './giftCardOrder.service';
import { notifyGiftCardStatus } from './giftCardOrder.notify';

/**
 * A physical gift card order's courier leg, on the platform's own ShipRocket
 * account (the Tech-portal entry). Booking is a console action, taken once the
 * scratch cards are printed and packed — never automatic, because a parcel
 * with nothing printed in it must not be collected. It resumes step by step,
 * like the shop's: the ShipRocket order (looked up first, so a lost answer is
 * never booked twice), the cheapest courier's AWB, then the pickup.
 */

/** Statuses the booking may start or resume from. */
const BOOKABLE: readonly GiftCardFulfilmentStatus[] = ['PRINTED', 'AWAITING_SHIPMENT', 'AWB_ASSIGNED'];

/** Statuses tracking is pulled for — booked, and not yet at rest. */
export const OPEN_SHIPMENT_STATUSES: readonly GiftCardFulfilmentStatus[] = [
  'AWAITING_SHIPMENT',
  'AWB_ASSIGNED',
  'PICKUP_SCHEDULED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'NDR',
  'RTO',
];

const bad = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
};

const addEvent = (order: IGiftCardOrder, status: string, note: string) => {
  order.tracking_events.push({ status, location: '', note, at: new Date() });
};

/** Our pre-courier statuses rank as "nothing booked yet" against ShipRocket's. */
const asCourierStatus = (s: GiftCardFulfilmentStatus): FulfilmentStatus =>
  s === 'PROCESSING' || s === 'PRINTED' ? 'PENDING' : s;

async function pickupFor(): Promise<string> {
  const settings = await giftCardSettingsService.get();
  const account = await getShiprocketAccount();
  const pickup = settings.pickup_location || account?.pickupLocation || '';
  if (!pickup) {
    throw shiprocketError('Set the gift card pickup location in Loyalty > Gift card settings, then retry');
  }
  return pickup;
}

async function adhocPayload(order: IGiftCardOrder, pickup: string) {
  const settings = await giftCardSettingsService.get();
  const a = order.shipping_address!;
  const [first = 'Customer', ...rest] = (a.name || order.buyer_name).trim().split(/\s+/);
  return {
    order_id: order.order_no,
    order_date: order.created_at.toISOString().slice(0, 10),
    pickup_location: pickup,
    billing_customer_name: first,
    billing_last_name: rest.join(' ') || '.',
    billing_address: a.line1,
    billing_address_2: [a.line2, a.landmark].filter(Boolean).join(', '),
    billing_city: a.city,
    billing_pincode: a.pincode,
    billing_state: a.state,
    billing_country: a.country || 'India',
    billing_email: order.buyer_email,
    billing_phone: String(a.phone || order.buyer_phone || '').replaceAll(/\D/g, '').slice(-10),
    shipping_is_billing: true,
    order_items: [
      {
        name: order.design_name ? `Duncit Gift Card - ${order.design_name}` : 'Duncit Gift Card',
        sku: 'DUNCIT-GIFT-CARD',
        units: order.quantity,
        selling_price: order.amount,
        hsn: '',
        tax: 0,
      },
    ],
    payment_method: 'Prepaid',
    sub_total: order.cards_value,
    length: settings.parcel_length_cm,
    breadth: settings.parcel_breadth_cm,
    height: settings.parcel_height_cm,
    weight: settings.parcel_weight_kg,
  };
}

/** The ShipRocket order a lost answer already created, looked up best-effort before the first send. */
async function bookedAlready(order: IGiftCardOrder): Promise<AdhocOrderResult | null> {
  try {
    return await findOrderByChannelId(order.order_no);
  } catch (error) {
    if (order.shipment.create_attempted_at) throw error;
    logs.server.warn('giftCardOrder', 'findOrder', { order_no: order.order_no, msg: (error as Error).message });
    return null;
  }
}

/** Step 1 — the ShipRocket order. */
async function book(order: IGiftCardOrder) {
  if (order.shipment.order_id) return;
  const problems = addressProblems(order.shipping_address ?? {});
  if (problems.length > 0) bad(`The delivery address needs ${problems.join(' and ')} — correct it, then retry`);
  const pickup = await pickupFor();
  let booked = await bookedAlready(order);
  if (!booked) {
    order.shipment.create_attempted_at = new Date();
    await order.save();
    booked = await createOrderAdhoc(await adhocPayload(order, pickup));
  }
  order.shipment.order_id = booked.order_id;
  order.shipment.shipment_id = booked.shipment_id;
  order.shipment.sandbox = await isSandboxCall();
  order.fulfilment_status = 'AWAITING_SHIPMENT';
  addEvent(order, 'AWAITING_SHIPMENT', `ShipRocket ${order.shipment.sandbox ? 'SANDBOX ' : ''}order ${booked.order_id} created`);
}

/** Step 2 — the cheapest courier's AWB. False when the wallet cannot pay (an alert, not a failure). */
async function assignCourier(order: IGiftCardOrder): Promise<boolean> {
  if (order.shipment.awb) return true;
  const options = await couriersForOrder(order.shipment.order_id);
  if (options.length === 0) {
    throw shiprocketError('No courier can carry this parcel right now — check the pincode, then retry');
  }
  const courier = cheapestCourier(options);
  const balance = await walletOrNull();
  const awb = balance !== null && balance < courier.rate ? null : await awbFor(order.shipment.shipment_id, courier.courier_company_id);
  if (!awb) {
    order.shipment.alert = 'LOW_WALLET';
    order.shipment.alert_message = `${courier.courier_name} costs about ₹${courier.rate}. Recharge the ShipRocket wallet, then retry.`;
    return false;
  }
  order.shipment.awb = awb.awb;
  order.shipment.courier_name = awb.courier_name || courier.courier_name;
  order.shipment.courier_company_id = awb.courier_company_id || courier.courier_company_id;
  order.shipment.label_url = awb.label_url || order.shipment.label_url;
  order.shipment.etd = courier.etd;
  order.shipment.alert = '';
  order.shipment.alert_message = '';
  order.fulfilment_status = 'AWB_ASSIGNED';
  addEvent(order, 'AWB_ASSIGNED', `AWB ${awb.awb} with ${order.shipment.courier_name}`);
  return true;
}

/** Step 3 — the courier collects. */
async function schedulePickup(order: IGiftCardOrder) {
  if (order.shipment.pickup_token || !order.shipment.awb) return;
  try {
    const pickup = await generatePickup(order.shipment.shipment_id);
    order.shipment.pickup_token = pickup.token || 'SCHEDULED';
    order.shipment.pickup_scheduled_date = pickup.scheduled_date;
  } catch (error) {
    if (!/already/i.test((error as Error).message)) throw error;
    order.shipment.pickup_token = 'SCHEDULED';
  }
  order.fulfilment_status = 'PICKUP_SCHEDULED';
  addEvent(order, 'PICKUP_SCHEDULED', order.shipment.pickup_scheduled_date ? `Pickup on ${order.shipment.pickup_scheduled_date}` : 'Pickup requested');
}

/**
 * Book (or resume booking) the courier for a printed physical order. A refusal
 * lands on the order as `last_error` and is thrown back, so the operator sees
 * what to fix; the steps already done are kept.
 */
export async function bookGiftCardShipment(order: IGiftCardOrder, actorId: string): Promise<IGiftCardOrder> {
  if (order.delivery_mode !== 'PHYSICAL') bad('Only a physical order ships');
  if (order.payment_status !== 'PAID') bad('This order has not been paid');
  if (!BOOKABLE.includes(order.fulfilment_status)) {
    bad(order.fulfilment_status === 'PROCESSING' ? 'Mark the cards printed before booking the courier' : 'This order is already with the courier');
  }
  return withShiprocketAccount(null, async () => {
    if (!(await hasShiprocketAccount())) throw shiprocketError('ShipRocket is not connected — add it in the Tech portal');
    try {
      await book(order);
      if (await assignCourier(order)) await schedulePickup(order);
      order.last_error = '';
      await order.save();
      await recordOrderActivity(order._id, 'SHIPMENT_BOOKED', actorId, order.shipment.awb ? `AWB ${order.shipment.awb}` : order.shipment.alert_message || 'ShipRocket order created');
      return order;
    } catch (error) {
      order.last_error = (error as Error).message.slice(0, 500);
      await order.save();
      await recordOrderActivity(order._id, 'SHIPMENT_FAILED', actorId, order.last_error);
      throw error;
    }
  });
}

/** Add the scans we have not stored yet, oldest first. */
function mergeScans(order: IGiftCardOrder, t: TrackResult) {
  const seen = new Set(order.tracking_events.map((e) => `${new Date(e.at).getTime()}|${e.status}`));
  const scans = t.activities
    .map((a) => ({ ...a, at: parseShiprocketDate(a.date) ?? new Date() }))
    .sort((x, y) => x.at.getTime() - y.at.getTime());
  for (const scan of scans) {
    const key = `${scan.at.getTime()}|${scan.status}`;
    if (seen.has(key)) continue;
    seen.add(key);
    order.tracking_events.push({ status: scan.status, location: scan.location, note: scan.note, at: scan.at });
  }
}

/** Fold a tracking answer into the order. Answers whether the status moved (forward only). */
export function applyGiftCardTracking(order: IGiftCardOrder, t: TrackResult): boolean {
  order.shipment.tracking_status = t.current_status;
  order.shipment.status_code = t.status_id;
  if (t.etd) order.shipment.etd = t.etd;
  order.shipment.last_synced_at = new Date();
  mergeScans(order, t);
  const next = nextStatus(asCourierStatus(order.fulfilment_status), mapShiprocketStatus(t.current_status));
  if (!next || next === 'PENDING' || next === 'READY_FOR_PICKUP' || next === 'PICKED_UP') return false;
  order.fulfilment_status = next;
  if (next === 'DELIVERED') order.delivered_at = order.delivered_at ?? new Date();
  order.shipment.alert = next === 'NDR' ? 'NDR' : '';
  order.shipment.alert_message = next === 'NDR' ? t.activities[0]?.note || t.current_status : '';
  return true;
}

async function afterMove(order: IGiftCardOrder) {
  await recordOrderActivity(order._id, 'STATUS_CHANGED', null, `${order.fulfilment_status} (${order.shipment.tracking_status})`);
  await notifyGiftCardStatus(order);
}

/** Pull the latest tracking for one order and persist it. */
export async function refreshGiftCardTracking(order: IGiftCardOrder): Promise<IGiftCardOrder> {
  const { awb, shipment_id } = order.shipment;
  if (!awb && !shipment_id) bad('This order has not been booked with the courier yet');
  return withShiprocketAccount(null, async () => {
    const t = awb ? await trackByAwb(awb) : await trackByShipment(shipment_id);
    const moved = applyGiftCardTracking(order, t);
    await order.save();
    if (moved) await afterMove(order);
    return order;
  });
}

/** The shipping label as a base64 PDF, for the console to print. */
export async function giftCardLabelFile(order: IGiftCardOrder): Promise<string> {
  if (!order.shipment.awb) bad('The label exists once the courier is assigned');
  return withShiprocketAccount(null, async () => {
    const link = order.shipment.label_url || (await generateLabel([order.shipment.shipment_id]));
    if (!order.shipment.label_url && link) {
      order.shipment.label_url = link;
      await order.save();
    }
    return fetchDocumentPdf(link);
  });
}

/** Where ShipRocket's courier webhook and the stale-tracking sweep hand over gift card orders. */
export const giftCardOrderTracking = {
  /** A webhook for this AWB or channel order id, if it is a gift card order. Answers what it updated, or ''. */
  async webhook(awb: string, orderNo: string, t: TrackResult): Promise<string> {
    const order =
      (awb ? await GiftCardOrderModel.findOne({ 'shipment.awb': awb }) : null) ??
      (orderNo.startsWith('GC-') ? await GiftCardOrderModel.findOne({ order_no: orderNo }) : null);
    if (!order) return '';
    const moved = applyGiftCardTracking(order, t);
    await order.save();
    if (moved) await afterMove(order);
    return `gift card order ${order.order_no}`;
  },

  /** Pull every open shipment the webhook has not touched since `cutoff`. Answers how many were pulled. */
  async sweep(cutoff: Date, limit: number): Promise<number> {
    const orders = await GiftCardOrderModel.find({
      fulfilment_status: { $in: OPEN_SHIPMENT_STATUSES },
      'shipment.awb': { $ne: '' },
      $or: [{ 'shipment.last_synced_at': null }, { 'shipment.last_synced_at': { $lt: cutoff } }],
    })
      .sort({ 'shipment.last_synced_at': 1 })
      .limit(limit);
    let pulled = 0;
    for (const order of orders) {
      try {
        await refreshGiftCardTracking(order);
        pulled += 1;
      } catch (error) {
        logs.server.warn('giftCardOrder', 'sweep', { error, order_no: order.order_no });
      }
    }
    return pulled;
  },
};
