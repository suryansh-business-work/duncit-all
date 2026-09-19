import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { StoreProductModel } from '@modules/commerce/store/storeProduct.model';
import { PACKAGING_LIMITS } from '@modules/venues/inventory/inventory.packaging';
import type { IProductOrder, IOrderParcel } from '@modules/commerce/productOrder/productOrder.model';
import { getShiprocketAccount, isShiprocketConfigured } from './shiprocket.account';
import { addressProblems } from './shiprocket.address';
import { shiprocketError, type Json } from './shiprocket.client';
import {
  assignAwb,
  couriersForOrder,
  createOrderAdhoc,
  findOrderByChannelId,
  generateLabel,
  generatePickup,
  manifestFor,
  printInvoice,
  walletBalance,
  type CourierOption,
} from './shiprocket.gateway';
import { buildParcel, withWeights, type Parcel, type ParcelDims } from './shiprocket.parcel';

/**
 * Getting one order onto a courier, in three steps that each pick up where the
 * last attempt stopped:
 *
 *   1. book   — `/orders/create/adhoc` (idempotent on our order number)
 *   2. courier — choose one (the operator's pick, else ShipRocket's
 *                recommendation), check the wallet can pay for it, assign the AWB
 *   3. pickup — `/courier/generate/pickup`
 *
 * A step that fails leaves a readable `last_error` and the order where it was;
 * the order page's Retry runs the pipeline again and it resumes. An order is
 * FAILED only while no AWB exists. A wallet too low to pay is not a failure —
 * the order waits in AWAITING_SHIPMENT with a LOW_WALLET alert.
 */

const bad = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
};

const addEvent = (order: IProductOrder, status: string, note: string) => {
  order.tracking_events.push({ status, code: 0, location: '', note, at: new Date() } as any);
};

const lineLabel = (line: { name: string; variant_label?: string }) =>
  line.variant_label ? `${line.name} (${line.variant_label})` : line.name;

/**
 * The ship-to address as the courier check reads it. Read field by field: the
 * order's address is a Mongoose subdocument, and spreading one copies none of
 * its fields — every address would read as empty and every booking refused.
 */
const shipToOf = (order: IProductOrder) => {
  const a = order.shipping_address;
  return {
    line1: a?.line1,
    city: a?.city,
    state: a?.state,
    pincode: a?.pincode,
    country: a?.country,
    phone: a?.phone || order.buyer_phone,
  };
};

const complete = (d: ParcelDims) =>
  d.weight_kg >= PACKAGING_LIMITS.minWeightKg &&
  d.length_cm >= PACKAGING_LIMITS.minSideCm &&
  d.breadth_cm >= PACKAGING_LIMITS.minSideCm &&
  d.height_cm >= PACKAGING_LIMITS.minSideCm;

/** The parcel we will declare: the operator's override, else the lines packed together (buildParcel). */
export function parcelFor(order: IProductOrder): Parcel {
  if (order.parcel?.source === 'OVERRIDE') return withWeights(order.parcel);
  return buildParcel(
    order.line_items.map((l) => ({
      qty: l.qty,
      weight_kg: l.weight_kg,
      length_cm: l.length_cm,
      breadth_cm: l.breadth_cm,
      height_cm: l.height_cm,
    }))
  );
}

/** Refuse to declare a parcel we know is wrong — naming the items without packaging. */
function assertParcel(order: IProductOrder, parcel: Parcel) {
  if (order.parcel?.source === 'OVERRIDE') {
    if (!complete(parcel)) throw shiprocketError('The parcel set on this order is incomplete — enter its weight, length, breadth and height');
    return;
  }
  const missing = order.line_items.filter((l) => !complete(l)).map(lineLabel);
  if (missing.length > 0) {
    throw shiprocketError(
      `Packaging is missing for ${missing.join(', ')} — add it on the product, or set the parcel on this order, then retry`
    );
  }
}

/** The ShipRocket pickup nickname: the order's warehouse, else the Tech portal's default. Never guessed. */
async function pickupFor(order: IProductOrder): Promise<string> {
  if (order.pickup_location_id) return order.pickup_location_id;
  const account = await getShiprocketAccount();
  if (account?.pickupLocation) return account.pickupLocation;
  throw shiprocketError(
    'This order has no pickup location — give the product a warehouse, or set a default pickup nickname in the Tech portal'
  );
}

async function hsnByProduct(order: IProductOrder): Promise<Map<string, string>> {
  // The pet store sells from its own catalogue; the pod shop from the inventory.
  const ids = { _id: { $in: order.line_items.map((l) => l.product_id) } };
  const products: { _id: unknown; hsn_code?: string }[] =
    order.channel === 'PET_STORE'
      ? await StoreProductModel.find(ids).select('hsn_code').lean()
      : await InventoryProductModel.find(ids).select('hsn_code').lean();
  return new Map(products.map((p) => [String(p._id), p.hsn_code ?? '']));
}

function adhocPayload(order: IProductOrder, pickup: string, parcel: Parcel, hsn: Map<string, string>): Json {
  const addr = (order.shipping_address ?? {}) as unknown as Record<string, string>;
  const [first = 'Customer', ...rest] = String(addr.name || order.buyer_name).trim().split(/\s+/);
  return {
    order_id: order.order_no,
    order_date: order.created_at.toISOString().slice(0, 10),
    pickup_location: pickup,
    billing_customer_name: first,
    billing_last_name: rest.join(' ') || '.',
    billing_address: addr.line1,
    billing_address_2: [addr.line2, addr.landmark].filter(Boolean).join(', '),
    billing_city: addr.city,
    billing_pincode: addr.pincode,
    billing_state: addr.state,
    billing_country: addr.country || 'India',
    billing_email: addr.email || order.buyer_email,
    billing_phone: String(addr.phone || order.buyer_phone || '').replaceAll(/\D/g, '').slice(-10),
    shipping_is_billing: true,
    order_items: order.line_items.map((l) => ({
      name: l.variant_label ? `${l.name} - ${l.variant_label}` : l.name,
      sku: l.variant_sku || l.sku || l.name,
      units: l.qty,
      selling_price: l.unit_cost,
      hsn: hsn.get(String(l.product_id)) ?? '',
    })),
    // COD: the courier collects this order's share of the bill at the door.
    payment_method: order.payment_method === 'COD' ? 'COD' : 'Prepaid',
    sub_total: order.payment_method === 'COD' ? order.cod_amount : order.items_total,
    length: parcel.length_cm,
    breadth: parcel.breadth_cm,
    height: parcel.height_cm,
    weight: parcel.weight_kg,
  };
}

/** Step 1 — the ShipRocket order. Re-uses one a lost answer already created. */
async function book(order: IProductOrder) {
  if (order.shiprocket.order_id) return;
  const problems = addressProblems(shipToOf(order));
  if (problems.length > 0) {
    throw shiprocketError(`The ship-to address needs ${problems.join(' and ')} — correct it on this order, then retry`);
  }
  const parcel = parcelFor(order);
  assertParcel(order, parcel);
  const pickup = await pickupFor(order);
  const booked =
    (await findOrderByChannelId(order.order_no)) ??
    (await createOrderAdhoc(adhocPayload(order, pickup, parcel, await hsnByProduct(order))));
  order.pickup_location_id = pickup;
  order.shiprocket.order_id = booked.order_id;
  order.shiprocket.shipment_id = booked.shipment_id;
  order.parcel = { ...parcel, source: order.parcel?.source ?? 'AUTO', sent_at: new Date() } as IOrderParcel;
  order.fulfilment_status = 'AWAITING_SHIPMENT';
  addEvent(order, 'AWAITING_SHIPMENT', `ShipRocket order ${booked.order_id} created`);
}

async function pickCourier(order: IProductOrder, courierId?: string | null): Promise<CourierOption> {
  const options = await couriersForOrder(order.shiprocket.order_id);
  if (options.length === 0) throw shiprocketError('No courier can carry this shipment right now — check the pincode and parcel, then retry');
  if (!courierId) return options.find((o) => o.recommended) ?? options[0];
  return options.find((o) => o.courier_company_id === courierId) ?? bad('That courier is no longer offered for this shipment — pick another');
}

/** Step 2 — courier + AWB. Answers false when the wallet cannot pay, so the pipeline stops without failing. */
async function assignCourier(order: IProductOrder, courierId?: string | null): Promise<boolean> {
  if (order.shiprocket.awb) return true;
  const courier = await pickCourier(order, courierId);
  const balance = await walletBalance();
  if (balance < courier.rate) {
    order.fulfilment_status = 'AWAITING_SHIPMENT';
    order.shiprocket.alert = 'LOW_WALLET';
    order.shiprocket.alert_message = `The ShipRocket wallet has ₹${balance}; ${courier.courier_name} costs about ₹${courier.rate}. Recharge the wallet, then retry.`;
    return false;
  }
  const awb = await assignAwb(order.shiprocket.shipment_id, courier.courier_company_id);
  order.shiprocket.awb = awb.awb;
  order.shiprocket.courier_name = awb.courier_name || courier.courier_name;
  order.shiprocket.courier_company_id = awb.courier_company_id || courier.courier_company_id;
  if (awb.label_url) order.shiprocket.label_url = awb.label_url;
  order.shiprocket.etd = courier.etd;
  order.shiprocket.alert = '';
  order.shiprocket.alert_message = '';
  order.fulfilment_status = 'AWB_ASSIGNED';
  addEvent(order, 'AWB_ASSIGNED', `AWB ${awb.awb} with ${order.shiprocket.courier_name}`);
  return true;
}

/** Step 3 — the courier collects. ShipRocket's own auto-pickup may have queued it already. */
async function schedulePickup(order: IProductOrder) {
  if (order.shiprocket.pickup_token || !order.shiprocket.awb) return;
  try {
    const pickup = await generatePickup(order.shiprocket.shipment_id);
    order.shiprocket.pickup_token = pickup.token || 'SCHEDULED';
    order.shiprocket.pickup_scheduled_date = pickup.scheduled_date;
  } catch (error) {
    if (!/already/i.test((error as Error).message)) throw error;
    order.shiprocket.pickup_token = 'SCHEDULED';
  }
  order.fulfilment_status = 'PICKUP_SCHEDULED';
  addEvent(order, 'PICKUP_SCHEDULED', order.shiprocket.pickup_scheduled_date ? `Pickup on ${order.shiprocket.pickup_scheduled_date}` : 'Pickup requested');
}

/**
 * Run (or resume) the pipeline for a SHIP order. Never throws: a paid
 * checkout must not fail on a courier hiccup — the reason lands on the order.
 */
export async function createShipment(order: IProductOrder, courierId?: string | null): Promise<IProductOrder> {
  if (order.fulfilment_method !== 'SHIP' || order.cancelled_at) return order;
  if (!(await isShiprocketConfigured())) return order;
  try {
    await book(order);
    await order.save();
    if (await assignCourier(order, courierId)) {
      await order.save();
      await schedulePickup(order);
    }
    order.last_error = '';
  } catch (error) {
    order.last_error = (error as Error).message;
    if (!order.shiprocket.awb) order.fulfilment_status = 'FAILED';
    logs.server.warn('shiprocket', 'createShipment', { order_no: order.order_no, msg: order.last_error });
  }
  order.shiprocket.last_synced_at = new Date();
  await order.save();
  return order;
}

/** The couriers an operator can choose from, once the ShipRocket order exists. */
export async function courierChoices(order: IProductOrder): Promise<CourierOption[]> {
  if (!order.shiprocket.order_id) bad('Create the shipment first — couriers are offered for a booked order');
  return couriersForOrder(order.shiprocket.order_id);
}

/** An operator's parcel, used instead of the computed one when the shipment is created. */
export function setParcelOverride(order: IProductOrder, dims: ParcelDims) {
  if (order.shiprocket.order_id) bad('The shipment is already booked — its parcel was sent with it');
  const parcel = withWeights(dims);
  if (!complete(parcel)) bad(`Enter a weight of at least ${PACKAGING_LIMITS.minWeightKg} kg and every side of at least ${PACKAGING_LIMITS.minSideCm} cm`);
  if (parcel.weight_kg > PACKAGING_LIMITS.maxWeightKg) bad(`A parcel can weigh at most ${PACKAGING_LIMITS.maxWeightKg} kg`);
  order.parcel = { ...parcel, source: 'OVERRIDE', sent_at: null } as IOrderParcel;
}

/** Drop an override so the computed parcel is used again. */
export function clearParcelOverride(order: IProductOrder) {
  if (order.shiprocket.order_id) bad('The shipment is already booked — its parcel was sent with it');
  order.parcel = null;
}

const isoOrNull = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);

/** The operator's view of an order's shipment — what the ecomm portal's order page works from. */
export function shipmentView(order: IProductOrder) {
  const sent = !!order.parcel?.sent_at;
  const parcel = sent ? order.parcel! : { ...parcelFor(order), source: order.parcel?.source ?? 'AUTO', sent_at: null };
  return {
    shiprocket_order_id: order.shiprocket?.order_id ?? '',
    shipment_id: order.shiprocket?.shipment_id ?? '',
    alert: order.shiprocket?.alert ?? '',
    alert_message: order.shiprocket?.alert_message ?? '',
    ndr_action: order.shiprocket?.ndr_action ?? '',
    ndr_actioned_at: isoOrNull(order.shiprocket?.ndr_actioned_at),
    pickup_token: order.shiprocket?.pickup_token ?? '',
    parcel: {
      weight_kg: parcel.weight_kg,
      length_cm: parcel.length_cm,
      breadth_cm: parcel.breadth_cm,
      height_cm: parcel.height_cm,
      volumetric_weight_kg: parcel.volumetric_weight_kg,
      chargeable_weight_kg: parcel.chargeable_weight_kg,
      source: parcel.source,
      sent_at: isoOrNull(parcel.sent_at),
    },
    parcel_sent: sent,
    packaging_missing: order.line_items
      .filter((l) => !complete(l))
      .map(lineLabel),
    address_problems: addressProblems(shipToOf(order)),
  };
}

export type ShipmentDocument = 'LABEL' | 'INVOICE' | 'MANIFEST';

/** One PDF (label, invoice or manifest) covering every given order; each order keeps its link. */
export async function documentFor(orders: IProductOrder[], kind: ShipmentDocument): Promise<string> {
  const booked = orders.filter((o) => o.shiprocket.shipment_id && o.shiprocket.order_id);
  if (booked.length === 0) bad('None of these orders has a ShipRocket shipment yet');
  if (kind !== 'INVOICE' && booked.some((o) => !o.shiprocket.awb)) bad('Assign a courier (AWB) to every selected order first');
  const shipmentIds = booked.map((o) => o.shiprocket.shipment_id);
  const orderIds = booked.map((o) => o.shiprocket.order_id);
  let url: string;
  if (kind === 'LABEL') url = await generateLabel(shipmentIds);
  else if (kind === 'INVOICE') url = await printInvoice(orderIds);
  else url = await manifestFor(shipmentIds, orderIds);
  const field = { LABEL: 'label_url', INVOICE: 'invoice_url', MANIFEST: 'manifest_url' } as const;
  for (const order of booked) {
    order.shiprocket[field[kind]] = url;
    await order.save();
  }
  return url;
}
