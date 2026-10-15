import crypto from 'node:crypto';
import { Types, type ClientSession, type Model } from 'mongoose';
import { GraphQLError } from 'graphql';

import {
  ProductOrderModel,
  type FulfilmentMethod,
  type FulfilmentStatus,
  type IOrderLineItem,
  type IProductOrder,
  type OrderChannel,
  type OrderPaymentMethod,
} from './productOrder.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { StoreProductModel } from '@modules/commerce/store/storeProduct.model';
import { availableOf, notifyStockCrossings } from '@modules/venues/inventory/inventory.service';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import type { IPayment } from '@modules/finance/payment/payment.model';
import { roundOffOf } from '@modules/finance/payment/payment.roundoff';
import { getUrlConfigs } from '@config/url-configs';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { logs } from '@observability/log';
import { notifyEach } from '@services/notify/notify.service';
import { notifyOrderStatus } from './productOrder.notify';
import type { ShipmentDocument } from '@modules/commerce/shiprocket/shiprocket.shipment';

const round2 = (n: number) => Math.round(n * 100) / 100;
const newOrderNo = () =>
  `ord_${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}`;
const newPickupRef = () => `PU-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

const asMethod = (v: any): FulfilmentMethod => (String(v).toUpperCase() === 'SHIP' ? 'SHIP' : 'PICKUP');

/** Where an order's products live: the pet store's own catalogue, or the pod shop's inventory. */
const catalogFor = (petStore: boolean): Model<any> => (petStore ? StoreProductModel : InventoryProductModel);

const toPub = (d: IProductOrder) => ({
  id: String(d._id),
  order_no: d.order_no,
  // A pet-store guest order has no account behind it.
  buyer_id: d.buyer_id ? String(d.buyer_id) : null,
  buyer_name: d.buyer_name,
  buyer_email: d.buyer_email,
  buyer_phone: d.buyer_phone,
  pod_id: d.pod_id ? String(d.pod_id) : null,
  payment_id: String(d.payment_id),
  payment_ref: d.payment_ref,
  line_items: (d.line_items ?? []).map((l) => ({
    product_id: String(l.product_id),
    variant_id: l.variant_id ?? '',
    variant_label: l.variant_label ?? '',
    variant_sku: l.variant_sku ?? '',
    name: l.name,
    sku: l.sku,
    image_url: l.image_url,
    qty: l.qty,
    unit_cost: l.unit_cost,
    gross: l.gross,
    ownership: l.ownership,
    brand_id: l.brand_id ? String(l.brand_id) : null,
    weight_kg: l.weight_kg,
    length_cm: l.length_cm,
    breadth_cm: l.breadth_cm,
    height_cm: l.height_cm,
    return_window_days: l.return_window_days ?? 0,
  })),
  currency_symbol: d.currency_symbol,
  items_total: d.items_total,
  shipping_charge: d.shipping_charge,
  total: d.total,
  fulfilment_method: d.fulfilment_method,
  fulfilment_status: d.fulfilment_status,
  shipping_address: d.shipping_address
    ? {
        name: d.shipping_address.name,
        phone: d.shipping_address.phone,
        email: d.shipping_address.email,
        line1: d.shipping_address.line1,
        line2: d.shipping_address.line2,
        landmark: d.shipping_address.landmark,
        city: d.shipping_address.city,
        state: d.shipping_address.state,
        pincode: d.shipping_address.pincode,
        country: d.shipping_address.country,
      }
    : null,
  pickup_venue_id: d.pickup_venue_id ? String(d.pickup_venue_id) : null,
  pickup_ref: d.pickup_ref,
  pickup_location_id: d.pickup_location_id,
  shiprocket: {
    order_id: d.shiprocket?.order_id ?? '',
    shipment_id: d.shiprocket?.shipment_id ?? '',
    awb: d.shiprocket?.awb ?? '',
    courier_name: d.shiprocket?.courier_name ?? '',
    tracking_status: d.shiprocket?.tracking_status ?? '',
    label_url: d.shiprocket?.label_url ?? '',
    invoice_url: d.shiprocket?.invoice_url ?? '',
    manifest_url: d.shiprocket?.manifest_url ?? '',
    etd: d.shiprocket?.etd ?? '',
    pickup_scheduled_date: d.shiprocket?.pickup_scheduled_date ?? '',
    last_synced_at: d.shiprocket?.last_synced_at?.toISOString?.() ?? null,
    sandbox: d.shiprocket?.sandbox === true,
  },
  tracking_events: (d.tracking_events ?? []).map((e) => ({
    status: e.status,
    code: e.code,
    location: e.location,
    note: e.note,
    at: e.at?.toISOString?.() ?? '',
  })),
  last_error: d.last_error,
  channel: d.channel ?? 'POD_SHOP',
  payment_method: d.payment_method ?? 'PREPAID',
  cod_amount: d.cod_amount ?? 0,
  cod_collected_at: d.cod_collected_at?.toISOString?.() ?? null,
  discount_total: d.discount_total ?? 0,
  coins_share: d.coins_share ?? 0,
  cancelled_at: d.cancelled_at?.toISOString?.() ?? null,
  cancel_reason: d.cancel_reason ?? '',
  cancelled_by: d.cancelled_by ?? '',
  deletion_request_id: d.deletion_request_id ? String(d.deletion_request_id) : null,
  deletion_request_no: d.deletion_request_no ?? '',
  delivered_at: d.delivered_at?.toISOString?.() ?? null,
  refund: {
    status: d.refund?.status || 'NONE',
    amount: d.refund?.amount ?? 0,
    coins: d.refund?.coins ?? 0,
    razorpay_refund_id: d.refund?.razorpay_refund_id ?? '',
    refunded_at: d.refund?.refunded_at?.toISOString?.() ?? null,
    error: d.refund?.error ?? '',
    initiated_by: d.refund?.initiated_by ?? '',
  },
  notes: (d.notes ?? []).map((n) => ({
    id: String(n._id),
    text: n.text,
    by_name: n.by_name,
    at: n.at?.toISOString?.() ?? '',
  })),
  created_at: d.created_at?.toISOString?.() ?? '',
  updated_at: d.updated_at?.toISOString?.() ?? '',
});

/**
 * An order as its BUYER may read it. Same shape as `toPub`, with what belongs
 * to the people working the order blanked: operators' notes, the booking
 * error, who cancelled or refunded it (staff emails), the gateway's refusal
 * text, and ShipRocket's document links — a label or manifest is the seller's,
 * and a stored invoice link can be one batch PDF covering other buyers' orders
 * (the buyer's own copy comes from `sellerInvoiceForBuyer`). An event the
 * platform wrote (code 0) keeps its status and time but not its note, which an
 * operator typed; courier scans pass through.
 */
const toBuyerPub = (d: IProductOrder) => {
  const pub = toPub(d);
  return {
    ...pub,
    notes: [],
    last_error: '',
    cancelled_by: '',
    shiprocket: { ...pub.shiprocket, label_url: '', invoice_url: '', manifest_url: '' },
    tracking_events: pub.tracking_events.map((e) => (e.code ? e : { ...e, note: '' })),
    refund: { ...pub.refund, error: '', initiated_by: '' },
  };
};

/**
 * The Pod Shop, as a buyer-side filter: everything that is not the pet store's.
 * Written as "not PET_STORE" so an order saved before `channel` existed (the
 * field's default is POD_SHOP, and `toPub` reads it that way) still belongs to
 * its buyer's history.
 */
const BUYER_POD_SHOP = { $ne: 'PET_STORE' } as const;

/** The buyer's own pod-shop order document, or null — someone else's, the pet store's and a bad id all read the same. */
async function findBuyerOrder(userId: string, id: string): Promise<IProductOrder | null> {
  if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId)) return null;
  return ProductOrderModel.findOne({
    _id: new Types.ObjectId(id),
    buyer_id: new Types.ObjectId(userId),
    channel: BUYER_POD_SHOP,
  });
}

const BUYER_INVOICE_NOT_READY =
  'The seller’s invoice is not ready yet — it is issued once your order is booked with the courier.';
const BUYER_INVOICE_UNAVAILABLE =
  'We could not fetch the seller’s invoice right now. Please try again in a little while.';

/** How a deletion request signs the orders it cancels (`cancelPodShopOrder`: "<source>:<actor>"). */
const DELETION_CANCELLED_BY = /^DELETION:/;

/** Allowlists for the shared table engine (productOrdersTable — DUNCIT TABLE CONTRACT v1). */
const PRODUCT_ORDER_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['order_no', 'buyer_name', 'buyer_email', 'shiprocket.awb', 'deletion_request_no'],
  sortFields: {
    order_no: 'order_no',
    buyer_name: 'buyer_name',
    fulfilment_method: 'fulfilment_method',
    fulfilment_status: 'fulfilment_status',
    total: 'total',
    created_at: 'created_at',
    updated_at: 'updated_at',
    awb: 'shiprocket.awb',
    buyer_email: 'buyer_email',
    cancelled_at: 'cancelled_at',
    refund_status: 'refund.status',
    refund_amount: 'refund.amount',
    refunded_at: 'refund.refunded_at',
    deletion_request_no: 'deletion_request_no',
  },
  filterFields: {
    buyer_name: { type: 'string' },
    awb: { path: 'shiprocket.awb', type: 'string' },
    fulfilment_method: { type: 'enum' },
    fulfilment_status: { type: 'enum' },
    buyer_email: { type: 'string' },
    order_no: { type: 'string' },
    total: { type: 'number' },
    created_at: { type: 'date' },
    // Admin › User › Shop Orders scopes the table to one buyer and one shop.
    buyer_id: { type: 'string' },
    channel: { type: 'enum' },
    // Refund lists (deletion refunds, Finance): where the money going back stands.
    cancelled_at: { type: 'date' },
    refund_status: { path: 'refund.status', type: 'enum' },
    refund_amount: { path: 'refund.amount', type: 'number' },
    deletion_request_no: { type: 'string' },
  },
  defaultSort: { created_at: -1 },
};

/** Enrich a snapshot line from Payment.metadata with the live product's
 * ownership/dimensions so the order carries everything ShipRocket needs even if
 * the product is later edited or deleted. When the buyer chose a variant, the
 * variant's sku/image/dimensions win (correct parcel data per combination). */
async function buildLineItem(line: any, petStore: boolean, session?: ClientSession) {
  const productId = String(line.product_id || '');
  const qty = Number(line.quantity ?? line.qty) || 0;
  const unit_cost = Number(line.unit_cost) || 0;
  const product = Types.ObjectId.isValid(productId)
    ? await catalogFor(petStore).findById(productId).session(session ?? null)
    : null;
  const variantId = line.variant_id ? String(line.variant_id) : '';
  const variant = variantId
    ? ((product as any)?.variants ?? []).find((v: any) => String(v._id) === variantId)
    : null;
  return {
    product_id: new Types.ObjectId(productId),
    variant_id: variantId,
    variant_label: String(line.variant_label ?? variant?.option_label ?? ''),
    variant_sku: String(line.variant_sku ?? variant?.sku ?? ''),
    name: line.name || product?.product_name || 'Product',
    sku: variant?.sku || (product?.sku ?? ''),
    image_url:
      variant?.images?.[0] ?? (product as any)?.images?.[0] ?? (product as any)?.image_url ?? '',
    qty,
    unit_cost,
    gross: round2(Number(line.gross) || unit_cost * qty),
    ownership: ((product as any)?.ownership ?? 'DUNCIT') as 'DUNCIT' | 'BRAND',
    // A pet-store product's brand is the store's own, never a partner brand's.
    brand_id: petStore ? null : ((product as any)?.brand_id ?? null),
    weight_kg: Number(variant?.weight_kg || (product as any)?.weight_kg || 0),
    length_cm: Number(variant?.length_cm || (product as any)?.length_cm || 0),
    breadth_cm: Number(variant?.breadth_cm || (product as any)?.breadth_cm || 0),
    height_cm: Number(variant?.height_cm || (product as any)?.height_cm || 0),
    // The return policy the buyer bought under; the pet store runs its own returns.
    return_window_days: petStore ? 0 : Math.max(0, Math.floor(Number(product?.get?.('return_window_days')) || 0)),
  };
}

/** The `$inc` (and variant array filter) one sold line applies to its catalogue row. */
function stockDecrement(order: IProductOrder, item: IOrderLineItem, qty: number, session?: ClientSession) {
  const inc: Record<string, number> = { inventory_count: -qty };
  const options: Record<string, unknown> = { session };
  if (item.variant_id && Types.ObjectId.isValid(item.variant_id)) {
    inc['variants.$[v].inventory_count'] = -qty;
    options.arrayFilters = [{ 'v._id': new Types.ObjectId(item.variant_id) }];
  }
  // Pod-channel sales consume units the pod had reserved — release that
  // share of the reservation so available stock stays truthful.
  const reservationReleased = order.pod_id ? qty : 0;
  if (reservationReleased) {
    inc.requested_count = -reservationReleased;
  }
  // The pet store sorts its "bestsellers" by what it actually sold.
  if (order.channel === 'PET_STORE') inc['store.sold_count'] = qty;
  return { inc, options, reservationReleased };
}

/**
 * Point-of-sale stock movement for a freshly created order: decrement the
 * product's inventory (and the bought variant's own count), and step the pod
 * row's sold_count so the pod's available_count reflects real sales. Runs only
 * when the order doc is newly created (idempotency comes from createFromPayment
 * skipping existing docs).
 *
 * A failure here USED to be logged and stepped over, which is exactly how an
 * order could exist with stock that was never decremented — the pod then went
 * on selling units it had already shipped. It now propagates, so the order doc
 * and the stock it consumed commit or roll back together.
 */
async function recordStockForOrder(order: IProductOrder, session?: ClientSession) {
  for (const item of order.line_items) {
    const qty = Number(item.qty) || 0;
    if (qty <= 0) continue;
    const { inc, options, reservationReleased } = stockDecrement(order, item, qty, session);
    // findOneAndUpdate rather than updateOne so the post-decrement counts come
    // back with the write that caused them — a crossing needs both sides.
    const petStore = order.channel === 'PET_STORE';
    const product = await catalogFor(petStore).findOneAndUpdate(
      { _id: item.product_id },
      { $inc: inc },
      { ...options, new: true }
    );
    // Partner low-stock alerts are about the pod shop's inventory, not the store's.
    if (product && !petStore) {
      // `$inc` is atomic, so this decrement IS the difference: adding it back
      // to the returned doc is the state before the sale, and no second read
      // can disagree with it. A pod-channel sale drops inventory and
      // reservation together, so AVAILABLE does not move and nothing is sent —
      // it already crossed when the pod reserved the units.
      const beforeAvailable = availableOf({
        inventory_count: (product.inventory_count ?? 0) + qty,
        requested_count: (product.requested_count ?? 0) + reservationReleased,
        reserved_count: product.reserved_count ?? 0,
      });
      await notifyStockCrossings(product, beforeAvailable);
    }
    if (order.pod_id) {
      await PodModel.updateOne(
        { _id: order.pod_id, 'product_requests.product_id': item.product_id },
        { $inc: { 'product_requests.$.sold_count': qty } },
        { session }
      );
    }
  }
}

/** Force ShipRocket-delivery products onto the SHIP fulfilment path so a paid
 * checkout of such a product always creates a ShipRocket shipment — regardless
 * of the checkout-level method. Mutates each matching line in place. This is the
 * bridge from a product's `delivery_target` to the order's `fulfilment_method`. */
async function applyProductDeliveryOverrides(lines: any[], session?: ClientSession) {
  const ids = Array.from(
    new Set(lines.map((l) => String(l.product_id || '')).filter((id) => Types.ObjectId.isValid(id)))
  );
  if (ids.length === 0) return;
  const products = await InventoryProductModel.find({ _id: { $in: ids } })
    .select('delivery_target')
    .session(session ?? null)
    .lean();
  const shiprocketIds = new Set(
    products
      .filter((p: any) => p.delivery_target === 'SHIPROCKET')
      .map((p: any) => String(p._id))
  );
  if (shiprocketIds.size === 0) return;
  for (const line of lines) {
    if (shiprocketIds.has(String(line.product_id))) line.fulfilment_method = 'SHIP';
  }
}

interface Warehouse {
  id: string;
  nickname: string;
}
const EMPTY_WAREHOUSE: Warehouse = { id: '', nickname: '' };

/** Map each product id → its Duncit warehouse ({ id, nickname }) so SHIP orders
 * carry the right pickup origin (nickname = the ShipRocket-registered pickup). */
async function buildWarehouseMap(
  lines: any[],
  petStore: boolean,
  session?: ClientSession
): Promise<Map<string, Warehouse>> {
  const map = new Map<string, Warehouse>();
  const productIds = Array.from(
    new Set(lines.map((l) => String(l.product_id || '')).filter((id) => Types.ObjectId.isValid(id)))
  );
  if (productIds.length === 0) return map;
  const products = await catalogFor(petStore)
    .find({ _id: { $in: productIds } })
    .select('pickup_location_id')
    .session(session ?? null)
    .lean();
  const warehouseIds = Array.from(
    new Set(products.map((p: any) => (p.pickup_location_id ? String(p.pickup_location_id) : '')).filter(Boolean))
  );
  const warehouses = warehouseIds.length
    ? await BrandPickupLocationModel.find({ _id: { $in: warehouseIds } })
        .select('nickname')
        .session(session ?? null)
        .lean()
    : [];
  const nicknameById = new Map(warehouses.map((w: any) => [String(w._id), String(w.nickname ?? '')]));
  for (const product of products) {
    const id = product.pickup_location_id ? String(product.pickup_location_id) : '';
    map.set(String(product._id), { id, nickname: nicknameById.get(id) ?? '' });
  }
  return map;
}

/** Shipping charge per (pod, warehouse) group, taken from the payment's quoted
 * breakup. Modern quote lines carry a pod_id and key `pod|warehouse` — each
 * order records exactly its own group's charge. Legacy metadata (no pod_id on
 * the line) keys by warehouse alone as a fallback. */
function buildShippingChargeMap(shipping: any): Map<string, number> {
  const map = new Map<string, number>();
  const breakup: any[] = Array.isArray(shipping?.breakup) ? shipping.breakup : [];
  for (const entry of breakup) {
    const warehouseId = String(entry.warehouse_id ?? '');
    const charge = Number(entry.charge) || 0;
    if (entry.pod_id === undefined) {
      map.set(warehouseId, charge);
    } else {
      map.set(`${String(entry.pod_id ?? '')}|${warehouseId}`, charge);
    }
  }
  return map;
}

/** The shipping charge for one order group: the (pod, warehouse) quote line
 * wins; a warehouse-only line covers legacy payment metadata. */
function shippingChargeForGroup(charges: Map<string, number>, group: OrderGroup): number {
  return charges.get(`${group.pod_id}|${group.warehouse.id}`) ?? charges.get(group.warehouse.id) ?? 0;
}

interface OrderGroup {
  pod_id: string;
  method: FulfilmentMethod;
  warehouse: Warehouse;
  lines: any[];
}

/** Bucket lines by (pod, method, warehouse) — the shape of one product order.
 * A unified cart spans pods; SHIPROCKET products split further by warehouse. */
function groupOrderLines(
  lines: any[],
  topMethod: FulfilmentMethod,
  warehouseMap: Map<string, Warehouse>,
  fallbackPodId: string
): OrderGroup[] {
  const groups = new Map<string, OrderGroup>();
  for (const line of lines) {
    const method = asMethod(line.fulfilment_method ?? topMethod);
    const podId = line.pod_id ? String(line.pod_id) : fallbackPodId;
    const warehouse =
      method === 'SHIP' ? warehouseMap.get(String(line.product_id)) ?? EMPTY_WAREHOUSE : EMPTY_WAREHOUSE;
    const key = `${podId}|${method}|${warehouse.id}`;
    const group = groups.get(key) ?? { pod_id: podId, method, warehouse, lines: [] };
    group.lines.push(line);
    groups.set(key, group);
  }
  return [...groups.values()];
}

/** venue_id per distinct pod, for a PICKUP order's pickup_venue_id. */
async function loadVenueByPod(podIds: string[], session?: ClientSession): Promise<Map<string, any>> {
  const valid = Array.from(new Set(podIds.filter((id) => id && Types.ObjectId.isValid(id))));
  if (valid.length === 0) return new Map();
  const pods = await PodModel.find({ _id: { $in: valid } })
    .select('venue_id')
    .session(session ?? null)
    .lean();
  return new Map(pods.map((p: any) => [String(p._id), p.venue_id ?? null]));
}

interface CreateOrderInput {
  group: OrderGroup;
  shippingAddress: any;
  pickupVenueId: any;
  shippingCharge: number;
  share: StoreOrderShare;
  session?: ClientSession;
}

/** The two states in which the buyer is holding the goods — SHIP ends at
 * DELIVERED, PICKUP at PICKED_UP. */
const DELIVERED_STATUSES = new Set<FulfilmentStatus>(['DELIVERED', 'PICKED_UP']);

/**
 * The pod shop's reaction to a status move — from the operator's button, the
 * courier's webhook or a tracking pull alike. Only the crossing INTO delivery
 * asks for feedback: the operator mutation writes the status unconditionally,
 * so re-applying a delivered state would otherwise be a second billed message.
 * It used to run from the operator's button alone, so an order ShipRocket
 * delivered never asked its brand anything.
 */
async function afterPodShopStatusChange(order: IProductOrder, previous: FulfilmentStatus) {
  if (order.fulfilment_status !== previous) await notifyOrderStatus(order);
  if (DELIVERED_STATUSES.has(order.fulfilment_status) && !DELIVERED_STATUSES.has(previous)) {
    await requestBrandFeedback(order);
  }
}

/**
 * Ask every brand behind a delivered order for feedback, grouped by owner so a
 * brand with two products on the same order hears once rather than twice.
 */
async function requestBrandFeedback(order: IProductOrder) {
  // The pet store sells its own catalogue: there is no partner brand to ask.
  if (order.channel === 'PET_STORE') return;
  const productIds = order.line_items.map((line) => line.product_id);
  if (productIds.length === 0) return;
  const products = await InventoryProductModel.find({ _id: { $in: productIds } })
    .select('product_name listing_submitted_by_id')
    .lean();
  const productsByOwner = new Map<string, string[]>();
  for (const product of products) {
    const ownerId = String(product.listing_submitted_by_id ?? '');
    if (!Types.ObjectId.isValid(ownerId)) continue;
    const names = productsByOwner.get(ownerId) ?? [];
    names.push(product.product_name);
    productsByOwner.set(ownerId, names);
  }
  if (productsByOwner.size === 0) return;
  // The phone AND address fields are selected explicitly: the funnel reads the
  // number and `notifyEvent` reads the address off these documents, so a
  // narrower projection skips every send silently.
  const owners = await UserModel.find({ _id: { $in: [...productsByOwner.keys()] } })
    .select('profile.first_name profile.last_name auth.email auth.phone communication.whatsapp')
    .lean();
  const { mwebUrl } = await getUrlConfigs();
  const feedbackUrl = `${mwebUrl.replace(/\/+$/, '')}/support/feedback`;
  await notifyEach(
    owners.map((owner) => {
      const name = `${owner.profile?.first_name ?? ''} ${owner.profile?.last_name ?? ''}`.trim();
      return {
        event: 'ECOMM_FEEDBACK',
        entityId: String(order._id),
        user: owner,
        name,
        params: [name, (productsByOwner.get(String(owner._id)) ?? []).join(', '), feedbackUrl],
        vars: { feedback_url: feedbackUrl },
      };
    })
  );
}

/**
 * What a pet-store payment froze for the orders it creates, or null for the pod
 * shop. Written by the store checkout (`store.checkout.service.ts`); read only
 * here, so an order carries its channel, how it is paid and its share of the
 * discount without the finalizer knowing the store exists.
 */
interface StoreOrderFacts {
  payment_method: OrderPaymentMethod;
  discount_total: number;
  access_key: string;
}

function storeFactsOf(payment: IPayment): StoreOrderFacts | null {
  const facts = payment.metadata?.store;
  if (!facts || typeof facts !== 'object') return null;
  return {
    payment_method: facts.payment_method === 'COD' ? 'COD' : 'PREPAID',
    discount_total: Math.max(0, Number(facts.discount_total) || 0),
    access_key: String(facts.access_key ?? ''),
  };
}

/** Split `amount` across groups in proportion to `weights`. The last group takes
 * the rounding remainder, so the shares always add back up to the amount. */
function splitAcross(amount: number, weights: number[]): number[] {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (weights.length === 0) return [];
  let allocated = 0;
  return weights.map((w, i) => {
    if (i === weights.length - 1) return round2(amount - allocated);
    const share = sum > 0 ? round2((amount * w) / sum) : 0;
    allocated = round2(allocated + share);
    return share;
  });
}

/** One order group's goods + its own shipping charge — the weight its share of a
 * COD collection or a discount is split by. */
const groupGross = (group: OrderGroup, shippingCharge: number) =>
  round2(
    group.lines.reduce((s, l) => s + (Number(l.gross) || 0), 0) +
      (group.method === 'SHIP' ? shippingCharge : 0)
  );

/** The pet-store columns of one order: channel, payment method and its shares. */
interface StoreOrderShare {
  channel: OrderChannel;
  payment_method: OrderPaymentMethod;
  cod_amount: number;
  discount_total: number;
  coins_share: number;
  round_off: number;
  access_key: string;
}

const POD_SHOP_SHARE: StoreOrderShare = {
  channel: 'POD_SHOP',
  payment_method: 'PREPAID',
  cod_amount: 0,
  discount_total: 0,
  coins_share: 0,
  round_off: 0,
  access_key: '',
};

function storeSharesFor(
  payment: IPayment,
  groups: OrderGroup[],
  charges: Map<string, number>
): StoreOrderShare[] {
  const facts = storeFactsOf(payment);
  if (!facts) return groups.map(() => POD_SHOP_SHARE);
  const weights = groups.map((g) => groupGross(g, shippingChargeForGroup(charges, g)));
  const cod = facts.payment_method === 'COD' ? splitAcross(payment.total, weights) : [];
  const discounts = splitAcross(facts.discount_total, weights);
  // Coins are whole, so the split is floored and the last order takes the rest.
  const coinsTotal = Math.max(0, Math.floor(payment.coins_redeemed ?? 0));
  const coins = splitAcross(coinsTotal, weights).map(Math.floor);
  coins[coins.length - 1] = coinsTotal - coins.slice(0, -1).reduce((s, c) => s + c, 0);
  // The payment's round-off, shared out the same way: an order's cash is then
  // `total − discount_total + round_off`, and a cancelled order refunds all of it.
  const roundOffs = splitAcross(roundOffOf(payment), weights);
  return groups.map((_g, i) => ({
    channel: 'PET_STORE',
    payment_method: facts.payment_method,
    cod_amount: cod[i] ?? 0,
    discount_total: discounts[i] ?? 0,
    coins_share: coins[i] ?? 0,
    round_off: roundOffs[i] ?? 0,
    access_key: facts.access_key,
  }));
}

/**
 * Every path that moves an order's status ends here once it is saved — the
 * operator's button, the courier's webhook and a tracking pull. The pet store
 * settles a delivered COD order and tells its buyer; the pod shop has no
 * reaction of its own yet. Imported lazily: the store module imports this one.
 */
export async function afterStatusChange(order: IProductOrder, previous: FulfilmentStatus) {
  if (order.channel !== 'PET_STORE') {
    await afterPodShopStatusChange(order, previous);
    return;
  }
  const { afterStoreStatusChange } = await import('@modules/commerce/store/store.order.service');
  await afterStoreStatusChange(order, previous);
}

/** Persist the order doc for one (pod, method, warehouse) group. */
async function createOrderForGroup(payment: IPayment, input: CreateOrderInput) {
  const { group, shippingAddress, pickupVenueId, shippingCharge, share, session } = input;
  const petStore = share.channel === 'PET_STORE';
  const line_items = await Promise.all(group.lines.map((l) => buildLineItem(l, petStore, session)));
  const items_total = round2(line_items.reduce((s, l) => s + l.gross, 0));
  const isShip = group.method === 'SHIP';
  const charge = isShip ? round2(shippingCharge) : 0;
  const podObjId = Types.ObjectId.isValid(group.pod_id) ? new Types.ObjectId(group.pod_id) : null;
  // The array form is required with a session (and returns an array).
  const [doc] = await ProductOrderModel.create(
    [
      {
        ...share,
        order_no: newOrderNo(),
        buyer_id: payment.user_id ?? null,
        buyer_name: payment.user_name,
        buyer_email: payment.user_email,
        buyer_phone: payment.user_phone,
        pod_id: podObjId,
        payment_id: payment._id,
        payment_ref: payment.payment_id,
        line_items,
        currency_symbol: payment.currency_symbol,
        items_total,
        shipping_charge: charge,
        total: round2(items_total + charge),
        fulfilment_method: group.method,
        fulfilment_status: isShip ? 'AWAITING_SHIPMENT' : 'PENDING',
        shipping_address: isShip ? shippingAddress : null,
        pickup_venue_id: isShip ? null : pickupVenueId,
        pickup_ref: isShip ? '' : newPickupRef(),
        pickup_location_id: isShip ? group.warehouse.nickname : '',
      },
    ],
    { session }
  );
  return doc;
}

export const productOrderService = {
  toPub,

  /**
   * Create the product order(s) for a finalized payment from its metadata
   * snapshot — one order per (pod, fulfilment method, warehouse). Idempotent on
   * that same key, so a re-entrant finalize never duplicates.
   *
   * Runs inside the payment finalizer's transaction: the order doc, the stock it
   * consumed and the brand's points commit together or not at all. The
   * ShipRocket call deliberately does NOT live here any more — it is a third
   * party over HTTP, and the finalizer runs it after the commit.
   */
  async createFromPayment(payment: IPayment, session?: ClientSession) {
    const meta = payment.metadata ?? {};
    const lines: any[] = Array.isArray(meta.product_lines) ? meta.product_lines : [];
    if (lines.length === 0) return [];

    // A pet-store payment ships every line already; the delivery override is the pod shop's.
    const petStore = storeFactsOf(payment) !== null;
    if (!petStore) await applyProductDeliveryOverrides(lines, session);
    const topMethod = asMethod(meta.fulfilment_method ?? 'PICKUP');
    const fallbackPodId = payment.pod_id ? String(payment.pod_id) : '';
    const warehouseMap = await buildWarehouseMap(lines, petStore, session);
    const shippingCharges = buildShippingChargeMap(meta.shipping);
    const groups = groupOrderLines(lines, topMethod, warehouseMap, fallbackPodId);
    const venueByPod = await loadVenueByPod(groups.map((g) => g.pod_id), session);
    const shippingAddress = meta.shipping_address ?? null;
    const shares = storeSharesFor(payment, groups, shippingCharges);

    const created: IProductOrder[] = [];
    for (const [index, group] of groups.entries()) {
      const podObjId = Types.ObjectId.isValid(group.pod_id) ? new Types.ObjectId(group.pod_id) : null;
      const pickupLocationId = group.method === 'SHIP' ? group.warehouse.nickname : '';
      const existing = await ProductOrderModel.findOne({
        payment_id: payment._id,
        pod_id: podObjId,
        fulfilment_method: group.method,
        pickup_location_id: pickupLocationId,
      }).session(session ?? null);
      if (existing) {
        created.push(existing);
        continue;
      }
      const doc = await createOrderForGroup(payment, {
        group,
        shippingAddress,
        pickupVenueId: venueByPod.get(group.pod_id) ?? null,
        shippingCharge: shippingChargeForGroup(shippingCharges, group),
        share: shares[index],
        session,
      });
      created.push(doc);
      // Point of sale: stock moves only when this order doc is first created.
      await recordStockForOrder(doc, session);
      // Leaderboard points for the brand owner(s) behind this order's lines —
      // partner brands only, so none for the pet store's own catalogue.
      // Idempotent inside the service, so a replayed finalize re-inserts nothing.
      if (!petStore) {
        const { leaderboardService } = await import(
          '@modules/engagement/leaderboard/leaderboard.service'
        );
        await leaderboardService.awardProductSales(doc, session);
      }
    }
    return created.map(toPub);
  },

  /** Best-effort ShipRocket shipment creation — no-ops cleanly when the module
   * or its credentials are absent so PICKUP-only / unconfigured setups work. */
  async tryCreateShipment(order: IProductOrder) {
    try {
      const { shiprocketService } = await import('@modules/commerce/shiprocket/shiprocket.service');
      await shiprocketService.createShipment(order);
    } catch (e) {
      logs.server.warn('productOrder', 'tryCreateShipment', {
        error: e,
        msg: 'shipment create skipped/failed',
      });
    }
  },

  async list(filter?: {
    buyer_id?: string;
    pod_id?: string;
    fulfilment_method?: string;
    fulfilment_status?: string;
    search?: string;
  }, limit = 200) {
    const q: any = {};
    if (filter?.buyer_id) q.buyer_id = new Types.ObjectId(filter.buyer_id);
    if (filter?.pod_id) q.pod_id = new Types.ObjectId(filter.pod_id);
    if (filter?.fulfilment_method) q.fulfilment_method = filter.fulfilment_method;
    if (filter?.fulfilment_status) q.fulfilment_status = filter.fulfilment_status;
    if (filter?.search) {
      const r = new RegExp(filter.search.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), 'i');
      q.$or = [{ order_no: r }, { buyer_name: r }, { buyer_email: r }, { 'shiprocket.awb': r }];
    }
    const docs = await ProductOrderModel.find(q).sort({ created_at: -1 }).limit(limit);
    return docs.map(toPub);
  },

  /** Server-side table page (search/filter/sort/paginate) for productOrdersTable. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IProductOrder>(
      ProductOrderModel,
      {},
      input,
      PRODUCT_ORDER_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  /** One member's pod-shop orders — the scope is fixed here, so a client filter cannot widen it. */
  async tableForUser(userId: string, input?: TableQueryInput | null) {
    if (!Types.ObjectId.isValid(userId)) return { rows: [], total: 0, page: 1, page_size: 25 };
    const { docs, total, page, page_size } = await runTableQuery<IProductOrder>(
      ProductOrderModel,
      { buyer_id: new Types.ObjectId(userId), channel: 'POD_SHOP' },
      input,
      PRODUCT_ORDER_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  /** Pod-shop orders of the given brands — the scope is fixed here, so a client filter cannot widen it. */
  async tableForBrands(brandIds: Types.ObjectId[], input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IProductOrder>(
      ProductOrderModel,
      { 'line_items.brand_id': { $in: brandIds }, channel: 'POD_SHOP' },
      input,
      PRODUCT_ORDER_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  /**
   * The orders a deletion request cancelled — one row per order, with what went
   * back to the buyer and where that refund stands. The Products portal reads
   * all of them (or one request's); a partner reads their own brands'. The scope
   * is fixed here, so a client filter cannot widen it.
   */
  async tableForDeletionRefunds(
    scope: { brandIds?: Types.ObjectId[]; requestId?: string | null },
    input?: TableQueryInput | null
  ) {
    const base: Record<string, unknown> = { channel: 'POD_SHOP', cancelled_by: DELETION_CANCELLED_BY };
    if (scope.brandIds) base['line_items.brand_id'] = { $in: scope.brandIds };
    if (scope.requestId) {
      if (!Types.ObjectId.isValid(scope.requestId)) return { rows: [], total: 0, page: 1, page_size: 25 };
      // A brand request cancels through the product requests raised under it too,
      // so "this request's orders" means its own and its children's.
      const requestId = new Types.ObjectId(scope.requestId);
      const { CatalogDeletionRequestModel } = await import('@modules/commerce/catalogDeletion/catalogDeletion.model');
      const children = await CatalogDeletionRequestModel.find({ parent_id: requestId }).select('_id').lean();
      base.deletion_request_id = { $in: [requestId, ...children.map((child) => child._id)] };
    }
    const { docs, total, page, page_size } = await runTableQuery<IProductOrder>(
      ProductOrderModel,
      base,
      input,
      PRODUCT_ORDER_TABLE_CONFIG
    );
    // One read names every brand on the page — never one per row.
    const brandIds = [...new Set(docs.flatMap((d) => d.line_items.map((l) => String(l.brand_id ?? ''))).filter(Boolean))];
    const brands = await EcommBrandModel.find({ _id: { $in: brandIds } }).select('brand_name').lean();
    const nameOf = new Map(brands.map((b) => [String(b._id), b.brand_name ?? '']));
    const rows = docs.map((d) => {
      const brandId = d.line_items.find((l) => l.brand_id)?.brand_id;
      return { ...toPub(d), brand_name: brandId ? (nameOf.get(String(brandId)) ?? '') : '' };
    });
    return { rows, total, page, page_size };
  },

  async getById(id: string) {
    const d = await ProductOrderModel.findById(id);
    return d ? toPub(d) : null;
  },

  /**
   * The buyer's own POD-SHOP orders, as a buyer may read them. Pinned to the
   * channel: a member's pet-store orders belong to ecomm.duncit.com's own
   * queries (`storeMyOrders`), never to the app's Pod Shop history.
   */
  async listForBuyer(userId: string, podId?: string) {
    const q: any = { buyer_id: new Types.ObjectId(userId), channel: BUYER_POD_SHOP };
    if (podId) q.pod_id = new Types.ObjectId(podId);
    const docs = await ProductOrderModel.find(q).sort({ created_at: -1 });
    return docs.map(toBuyerPub);
  },

  /** One order of the buyer's own (null for anyone else's, so ids cannot be probed). */
  async getForBuyer(userId: string, id: string) {
    const doc = await findBuyerOrder(userId, id);
    return doc ? toBuyerPub(doc) : null;
  },

  /**
   * The seller's tax invoice for the buyer's own order — the INVOICE document
   * only, never the label or manifest, fetched for this one order on the
   * account it was booked on (`documentFile` runs inside that account).
   */
  async sellerInvoiceForBuyer(userId: string, id: string) {
    const order = await findBuyerOrder(userId, id);
    if (!order) throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
    if (order.fulfilment_method !== 'SHIP' || !order.shiprocket?.shipment_id || !order.shiprocket?.order_id) {
      throw new GraphQLError(BUYER_INVOICE_NOT_READY, { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const { documentFile } = await import('@modules/commerce/shiprocket/shiprocket.shipment');
    try {
      return await documentFile([order], 'INVOICE');
    } catch (error) {
      // ShipRocket's own words are written for the seller's desk — the buyer gets a plain answer.
      logs.server.warn('productOrder', 'sellerInvoiceForBuyer', { error, order_no: order.order_no });
      throw new GraphQLError(BUYER_INVOICE_UNAVAILABLE, { extensions: { code: 'UPSTREAM_UNAVAILABLE' } });
    }
  },

  async advanceStatus(id: string, status: FulfilmentStatus, note = '') {
    const doc = await ProductOrderModel.findById(id);
    if (!doc) throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
    // A pod-shop cancellation owes the buyer a courier stop, the stock and a
    // refund — a bare status write would do none of it.
    if (status === 'CANCELLED' && doc.channel === 'POD_SHOP' && !doc.cancelled_at) {
      throw new GraphQLError('Use Cancel order — it also stops the courier, restocks and refunds the buyer', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }
    const previous = doc.fulfilment_status;
    doc.fulfilment_status = status;
    doc.tracking_events.push({ status, code: 0, location: '', note, at: new Date() } as any);
    await doc.save();
    await afterStatusChange(doc, previous);
    return toPub(doc);
  },

  async setFulfilmentMethod(id: string, method: FulfilmentMethod) {
    const doc = await ProductOrderModel.findById(id);
    if (!doc) throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
    doc.fulfilment_method = method;
    doc.fulfilment_status = method === 'SHIP' ? 'AWAITING_SHIPMENT' : 'PENDING';
    if (method === 'PICKUP' && !doc.pickup_ref) doc.pickup_ref = newPickupRef();
    await doc.save();
    return toPub(doc);
  },

  async createShipmentForOrder(id: string, pickupLocation?: string) {
    const doc = await ProductOrderModel.findById(id);
    if (!doc) throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
    if (doc.fulfilment_method !== 'SHIP') {
      throw new GraphQLError('Only SHIP orders can create a shipment', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }
    if (pickupLocation && pickupLocation !== doc.pickup_location_id) {
      // The pickup is the warehouse NICKNAME — the name ShipRocket books it under.
      if (doc.shiprocket.order_id) {
        throw new GraphQLError(`This shipment is already booked from "${doc.pickup_location_id}" — its pickup cannot change`, {
          extensions: { code: 'BAD_REQUEST' },
        });
      }
      const warehouse = await BrandPickupLocationModel.findOne({ nickname: pickupLocation }).select('nickname').lean();
      if (!warehouse) {
        throw new GraphQLError(`There is no pickup address named "${pickupLocation}"`, { extensions: { code: 'BAD_USER_INPUT' } });
      }
      doc.pickup_location_id = warehouse.nickname;
    }
    const { shiprocketService } = await import('@modules/commerce/shiprocket/shiprocket.service');
    await shiprocketService.createShipment(doc);
    return toPub(doc);
  },

  /** One PDF (label, invoice or manifest) for the given orders, as a file to print or save. */
  async shipmentFile(ids: string[], kind: ShipmentDocument) {
    const oids = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    const orders = await ProductOrderModel.find({ _id: { $in: oids } });
    if (orders.length === 0) throw new GraphQLError('No orders selected', { extensions: { code: 'NOT_FOUND' } });
    const { documentFile } = await import('@modules/commerce/shiprocket/shiprocket.shipment');
    return documentFile(orders, kind);
  },

  async refreshTrackingById(id: string) {
    const doc = await ProductOrderModel.findById(id);
    if (!doc) throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
    const { shiprocketService } = await import('@modules/commerce/shiprocket/shiprocket.service');
    await shiprocketService.refreshTracking(doc);
    return toPub(doc);
  },

  /**
   * An order's tracking by its number. Staff read any order (`buyerId` null);
   * a member reads only an order they bought — anyone else's answers null, the
   * same as a number that does not exist — and never the seller's label link
   * or an operator's event note.
   */
  async trackingByOrderNo(orderNo: string, buyerId: string | null = null) {
    const scope: Record<string, unknown> = { order_no: orderNo };
    if (buyerId !== null) {
      if (!Types.ObjectId.isValid(buyerId)) return null;
      scope.buyer_id = new Types.ObjectId(buyerId);
    }
    const doc = await ProductOrderModel.findOne(scope);
    if (!doc) return null;
    const forBuyer = buyerId !== null;
    return {
      order_no: doc.order_no,
      fulfilment_method: doc.fulfilment_method,
      fulfilment_status: doc.fulfilment_status,
      awb: doc.shiprocket.awb,
      courier_name: doc.shiprocket.courier_name,
      label_url: forBuyer ? '' : doc.shiprocket.label_url,
      tracking_status: doc.shiprocket.tracking_status,
      events: (doc.tracking_events ?? []).map((e) => ({
        status: e.status,
        code: e.code,
        location: e.location,
        note: forBuyer && !e.code ? '' : e.note,
        at: e.at?.toISOString?.() ?? '',
      })),
    };
  },
};
