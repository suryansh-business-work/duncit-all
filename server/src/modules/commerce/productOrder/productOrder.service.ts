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

/** Enrich a snapshot line from Payment.metadata with the live product's
 * ownership/dimensions so the order carries everything ShipRocket needs even if
 * the product is later edited or deleted. */
async function buildLineItem(line: any) {
  const productId = String(line.product_id || '');
  const qty = Number(line.quantity ?? line.qty) || 0;
  const unit_cost = Number(line.unit_cost) || 0;
  const product = Types.ObjectId.isValid(productId)
    ? await InventoryProductModel.findById(productId)
    : null;
  return {
    product_id: new Types.ObjectId(productId),
    name: line.name || product?.product_name || 'Product',
    sku: product?.sku ?? '',
    image_url: (product as any)?.images?.[0] ?? (product as any)?.image_url ?? '',
    qty,
    unit_cost,
    gross: round2(Number(line.gross) || unit_cost * qty),
    ownership: ((product as any)?.ownership ?? 'DUNCIT') as 'DUNCIT' | 'BRAND',
    brand_id: (product as any)?.brand_id ?? null,
    weight_kg: Number((product as any)?.weight_kg ?? 0),
    length_cm: Number((product as any)?.length_cm ?? 0),
    breadth_cm: Number((product as any)?.breadth_cm ?? 0),
    height_cm: Number((product as any)?.height_cm ?? 0),
  };
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
    const meta = (payment.metadata ?? {}) as Record<string, any>;
    const lines: any[] = Array.isArray(meta.product_lines) ? meta.product_lines : [];
    if (lines.length === 0) return [];

    const topMethod = asMethod(meta.fulfilment_method ?? 'PICKUP');
    const groups = new Map<FulfilmentMethod, any[]>();
    for (const line of lines) {
      const method = asMethod(line.fulfilment_method ?? topMethod);
      const arr = groups.get(method) ?? [];
      arr.push(line);
      groups.set(method, arr);
    }

    const pod = payment.pod_id ? await PodModel.findById(payment.pod_id) : null;
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
      const line_items = await Promise.all(groupLines.map(buildLineItem));
      const items_total = round2(line_items.reduce((s, l) => s + l.gross, 0));
      const isShip = method === 'SHIP';
      const doc = await ProductOrderModel.create({
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
        shipping_address: isShip ? meta.shipping_address ?? null : null,
        pickup_venue_id: isShip ? null : (pod as any)?.venue_id ?? null,
        pickup_ref: isShip ? '' : newPickupRef(),
      });
      created.push(doc);
      if (isShip) await this.tryCreateShipment(doc);
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
      console.warn('[productOrder] shipment create skipped/failed', (e as Error).message);
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
      const r = new RegExp(filter.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ order_no: r }, { buyer_name: r }, { buyer_email: r }, { 'shiprocket.awb': r }];
    }
    const docs = await ProductOrderModel.find(q).sort({ created_at: -1 }).limit(limit);
    return docs.map(toPub);
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
