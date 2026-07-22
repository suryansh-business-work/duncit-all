import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { GraphQLError } from 'graphql';

import {
  ProductOrderModel,
  type FulfilmentMethod,
  type FulfilmentStatus,
  type IProductOrder,
} from './productOrder.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import type { IPayment } from '@modules/finance/payment/payment.model';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { logs } from '@observability/log';

const round2 = (n: number) => Math.round(n * 100) / 100;
const newOrderNo = () =>
  `ord_${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}`;
const newPickupRef = () => `PU-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

const asMethod = (v: any): FulfilmentMethod => (String(v).toUpperCase() === 'SHIP' ? 'SHIP' : 'PICKUP');

const toPub = (d: IProductOrder) => ({
  id: String(d._id),
  order_no: d.order_no,
  buyer_id: String(d.buyer_id),
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
    last_synced_at: d.shiprocket?.last_synced_at?.toISOString?.() ?? null,
  },
  tracking_events: (d.tracking_events ?? []).map((e) => ({
    status: e.status,
    code: e.code,
    location: e.location,
    note: e.note,
    at: e.at?.toISOString?.() ?? '',
  })),
  last_error: d.last_error,
  created_at: d.created_at?.toISOString?.() ?? '',
  updated_at: d.updated_at?.toISOString?.() ?? '',
});

/** Allowlists for the shared table engine (productOrdersTable — DUNCIT TABLE CONTRACT v1). */
const PRODUCT_ORDER_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['order_no', 'buyer_name', 'buyer_email', 'shiprocket.awb'],
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
  },
  filterFields: {
    fulfilment_method: { type: 'enum' },
    fulfilment_status: { type: 'enum' },
    buyer_email: { type: 'string' },
    order_no: { type: 'string' },
    total: { type: 'number' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

/** Enrich a snapshot line from Payment.metadata with the live product's
 * ownership/dimensions so the order carries everything ShipRocket needs even if
 * the product is later edited or deleted. When the buyer chose a variant, the
 * variant's sku/image/dimensions win (correct parcel data per combination). */
async function buildLineItem(line: any) {
  const productId = String(line.product_id || '');
  const qty = Number(line.quantity ?? line.qty) || 0;
  const unit_cost = Number(line.unit_cost) || 0;
  const product = Types.ObjectId.isValid(productId)
    ? await InventoryProductModel.findById(productId)
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
    brand_id: (product as any)?.brand_id ?? null,
    weight_kg: Number(variant?.weight_kg || (product as any)?.weight_kg || 0),
    length_cm: Number(variant?.length_cm || (product as any)?.length_cm || 0),
    breadth_cm: Number(variant?.breadth_cm || (product as any)?.breadth_cm || 0),
    height_cm: Number(variant?.height_cm || (product as any)?.height_cm || 0),
  };
}

/**
 * Point-of-sale stock movement for a freshly created order: decrement the
 * product's inventory (and the bought variant's own count), and step the pod
 * row's sold_count so the pod's available_count reflects real sales. Runs only
 * when the order doc is newly created (idempotency comes from createFromPayment
 * skipping existing docs); best-effort — a counter failure never voids a paid
 * order.
 */
async function recordStockForOrder(order: IProductOrder) {
  for (const item of order.line_items) {
    const qty = Number(item.qty) || 0;
    if (qty <= 0) continue;
    try {
      const inc: Record<string, number> = { inventory_count: -qty };
      const options: Record<string, unknown> = {};
      if (item.variant_id && Types.ObjectId.isValid(item.variant_id)) {
        inc['variants.$[v].inventory_count'] = -qty;
        options.arrayFilters = [{ 'v._id': new Types.ObjectId(item.variant_id) }];
      }
      if (order.pod_id) {
        // Pod-channel sales consume units the pod had reserved — release that
        // share of the reservation so available stock stays truthful.
        inc.requested_count = -qty;
      }
      await InventoryProductModel.updateOne({ _id: item.product_id }, { $inc: inc }, options);
      if (order.pod_id) {
        await PodModel.updateOne(
          { _id: order.pod_id, 'product_requests.product_id': item.product_id },
          { $inc: { 'product_requests.$.sold_count': qty } }
        );
      }
    } catch (err) {
      logs.server.error('productOrder', 'recordStockForOrder', {
        error: err,
        msg: 'stock decrement failed',
      });
    }
  }
}

/** Force ShipRocket-delivery products onto the SHIP fulfilment path so a paid
 * checkout of such a product always creates a ShipRocket shipment — regardless
 * of the checkout-level method. Mutates each matching line in place. This is the
 * bridge from a product's `delivery_target` to the order's `fulfilment_method`. */
async function applyProductDeliveryOverrides(lines: any[]) {
  const ids = Array.from(
    new Set(lines.map((l) => String(l.product_id || '')).filter((id) => Types.ObjectId.isValid(id)))
  );
  if (ids.length === 0) return;
  const products = await InventoryProductModel.find({ _id: { $in: ids } })
    .select('delivery_target')
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

/** Bucket the snapshot lines by their effective fulfilment method (per-line
 * override, else the checkout-level one). */
function groupLinesByMethod(lines: any[], topMethod: FulfilmentMethod) {
  const groups = new Map<FulfilmentMethod, any[]>();
  for (const line of lines) {
    const method = asMethod(line.fulfilment_method ?? topMethod);
    const arr = groups.get(method) ?? [];
    arr.push(line);
    groups.set(method, arr);
  }
  return groups;
}

/** Persist the order doc for one fulfilment-method group. */
async function createOrderForGroup(
  payment: IPayment,
  method: FulfilmentMethod,
  groupLines: any[],
  shippingAddress: any,
  pickupVenueId: any
) {
  const line_items = await Promise.all(groupLines.map(buildLineItem));
  const items_total = round2(line_items.reduce((s, l) => s + l.gross, 0));
  const isShip = method === 'SHIP';
  return ProductOrderModel.create({
    order_no: newOrderNo(),
    buyer_id: payment.user_id,
    buyer_name: payment.user_name,
    buyer_email: payment.user_email,
    buyer_phone: payment.user_phone,
    pod_id: payment.pod_id,
    payment_id: payment._id,
    payment_ref: payment.payment_id,
    line_items,
    currency_symbol: payment.currency_symbol,
    items_total,
    shipping_charge: 0,
    total: items_total,
    fulfilment_method: method,
    fulfilment_status: isShip ? 'AWAITING_SHIPMENT' : 'PENDING',
    shipping_address: isShip ? shippingAddress : null,
    pickup_venue_id: isShip ? null : pickupVenueId,
    pickup_ref: isShip ? '' : newPickupRef(),
  });
}

export const productOrderService = {
  toPub,

  /**
   * Create the product order(s) for a finalized payment from its metadata
   * snapshot — one order per fulfilment method (SHIP/PICKUP). Idempotent on
   * (payment_id, method) so re-entrant finalize never duplicates. Best-effort:
   * throws are swallowed by the caller so a paid checkout is never failed.
   */
  async createFromPayment(payment: IPayment) {
    const meta = payment.metadata ?? {};
    const lines: any[] = Array.isArray(meta.product_lines) ? meta.product_lines : [];
    if (lines.length === 0) return [];

    await applyProductDeliveryOverrides(lines);
    const groups = groupLinesByMethod(lines, asMethod(meta.fulfilment_method ?? 'PICKUP'));

    const pod = payment.pod_id ? await PodModel.findById(payment.pod_id) : null;
    const shippingAddress = meta.shipping_address ?? null;
    const pickupVenueId = (pod as any)?.venue_id ?? null;
    const created: IProductOrder[] = [];

    for (const [method, groupLines] of groups) {
      const existing = await ProductOrderModel.findOne({
        payment_id: payment._id,
        fulfilment_method: method,
      });
      if (existing) {
        created.push(existing);
        continue;
      }
      const doc = await createOrderForGroup(payment, method, groupLines, shippingAddress, pickupVenueId);
      created.push(doc);
      // Point of sale: stock moves only when this order doc is first created.
      await recordStockForOrder(doc);
      if (method === 'SHIP') await this.tryCreateShipment(doc);
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

  async getById(id: string) {
    const d = await ProductOrderModel.findById(id);
    return d ? toPub(d) : null;
  },

  async listForBuyer(userId: string, podId?: string) {
    const q: any = { buyer_id: new Types.ObjectId(userId) };
    if (podId) q.pod_id = new Types.ObjectId(podId);
    const docs = await ProductOrderModel.find(q).sort({ created_at: -1 });
    return docs.map(toPub);
  },

  async advanceStatus(id: string, status: FulfilmentStatus, note = '') {
    const doc = await ProductOrderModel.findById(id);
    if (!doc) throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
    doc.fulfilment_status = status;
    doc.tracking_events.push({ status, code: 0, location: '', note, at: new Date() } as any);
    await doc.save();
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
    if (pickupLocation) doc.pickup_location_id = pickupLocation;
    const { shiprocketService } = await import('@modules/commerce/shiprocket/shiprocket.service');
    await shiprocketService.createShipment(doc);
    return toPub(doc);
  },

  async refreshTrackingById(id: string) {
    const doc = await ProductOrderModel.findById(id);
    if (!doc) throw new GraphQLError('Order not found', { extensions: { code: 'NOT_FOUND' } });
    const { shiprocketService } = await import('@modules/commerce/shiprocket/shiprocket.service');
    await shiprocketService.refreshTracking(doc);
    return toPub(doc);
  },

  async trackingByOrderNo(orderNo: string) {
    const doc = await ProductOrderModel.findOne({ order_no: orderNo });
    if (!doc) return null;
    return {
      order_no: doc.order_no,
      fulfilment_method: doc.fulfilment_method,
      fulfilment_status: doc.fulfilment_status,
      awb: doc.shiprocket.awb,
      courier_name: doc.shiprocket.courier_name,
      label_url: doc.shiprocket.label_url,
      tracking_status: doc.shiprocket.tracking_status,
      events: (doc.tracking_events ?? []).map((e) => ({
        status: e.status,
        code: e.code,
        location: e.location,
        note: e.note,
        at: e.at?.toISOString?.() ?? '',
      })),
    };
  },
};
