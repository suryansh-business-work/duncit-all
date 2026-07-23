import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import {
  isShiprocketConfigured,
  createOrderAdhoc,
  assignAwb,
  getServiceability,
  trackByShipment,
  type TrackResult,
} from './shiprocket.gateway';
import { mapShiprocketStatus } from './shiprocket.statusMap';
import { ProductOrderModel, type IProductOrder } from '@modules/commerce/productOrder/productOrder.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { PodModel } from '@modules/pods/pod/pod.model';

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface ShipQuoteLine {
  /** The pod this shipment group belongs to ('' when the cart line had no pod). */
  pod_id: string;
  warehouse_id: string;
  pickup_pincode: string;
  courier_name: string;
  charge: number;
  quoted: boolean;
  /** True when every line in this (pod, warehouse) group met its product's free-delivery threshold. */
  free: boolean;
}

export interface ShipQuote {
  total: number;
  breakup: ShipQuoteLine[];
  all_quoted: boolean;
}

interface ShipGroup {
  pod_id: string;
  warehouse_id: string;
  weight: number;
  manual: number;
  free: boolean;
}

interface CartLineSelection {
  pod_id: string;
  product_id: string;
  variant_id: string;
  quantity: number;
}

type CartItem = {
  product_id: string;
  quantity: number;
  variant_id?: string | null;
  pod_id?: string | null;
};

/** Merge raw cart items into pod+product+variant lines (duplicate rows summed),
 * bucketed per (pod, product) — the granularity of the free-delivery rule.
 * Lines never merge across pods: each pod ships (and is charged) separately. */
function mergeLinesByPodProduct(items: CartItem[]): Map<string, CartLineSelection[]> {
  const merged = new Map<string, CartLineSelection>();
  for (const item of items) {
    const quantity = Number(item.quantity || 0);
    if (quantity <= 0) continue;
    const podId = item.pod_id ? String(item.pod_id) : '';
    const productId = String(item.product_id);
    const variantId = item.variant_id ? String(item.variant_id) : '';
    const key = `${podId}|${productId}|${variantId}`;
    const row = merged.get(key) ?? { pod_id: podId, product_id: productId, variant_id: variantId, quantity: 0 };
    row.quantity += quantity;
    merged.set(key, row);
  }
  const byPodProduct = new Map<string, CartLineSelection[]>();
  for (const row of merged.values()) {
    const key = `${row.pod_id}|${row.product_id}`;
    const rows = byPodProduct.get(key) ?? [];
    rows.push(row);
    byPodProduct.set(key, rows);
  }
  return byPodProduct;
}

/** Snapshot unit costs from the referenced pods' product_requests, keyed
 * `pod|product`. The checkout charges non-variant lines from this snapshot, so
 * free-delivery qualification must price from the same basis. */
async function loadSnapshotUnitCosts(podIds: string[]): Promise<Map<string, number>> {
  const valid = [...new Set(podIds)].filter((id) => id && Types.ObjectId.isValid(id));
  if (valid.length === 0) return new Map();
  const pods = await PodModel.find({ _id: { $in: valid } }).select('product_requests').lean();
  const map = new Map<string, number>();
  for (const pod of pods) {
    for (const req of (pod as any).product_requests ?? []) {
      const cost = Number(req?.unit_cost);
      if (Number.isFinite(cost)) map.set(`${String(pod._id)}|${String(req.product_id)}`, cost);
    }
  }
  return map;
}

/** Free-delivery rule (per cart line): a line qualifies when its goods value
 * (qty × unit price) meets the product's free_delivery_above threshold. The
 * unit price mirrors what the checkout charges: the chosen variant's live
 * unit_cost, else the pod snapshot's unit_cost (live product price only when
 * no snapshot exists). No threshold = never qualifies. */
function productLinesQualifyFree(
  product: any,
  lines: CartLineSelection[],
  snapshotUnitCost: number | undefined,
): boolean {
  const threshold = product.free_delivery_above;
  if (threshold === null || threshold === undefined) return false;
  if (lines.length === 0) return false;
  return lines.every((line) => {
    const variant = line.variant_id
      ? (product.variants ?? []).find((v: any) => String(v._id) === line.variant_id)
      : null;
    let unitCost: number;
    if (variant) {
      unitCost = Number(variant.unit_cost ?? 0);
    } else {
      unitCost = Number(snapshotUnitCost ?? product.unit_cost ?? 0);
    }
    return unitCost * line.quantity >= Number(threshold);
  });
}

/** Bucket only SHIPROCKET-delivered products by (pod, warehouse), accumulating
 * total shipment weight and the manual delivery-charge fallback. Each pod ships
 * separately even from a shared warehouse — one group per physical shipment.
 * Weight scales with quantity; the manual charge is a flat per-shipment fee, so
 * a bucket takes the highest product delivery_charge (one courier pickup,
 * charged once). A bucket is free only while EVERY line in it meets its
 * free-delivery threshold. */
function buildShipGroups(
  products: any[],
  linesByPodProduct: Map<string, CartLineSelection[]>,
  snapshotUnitCosts: Map<string, number>,
): Map<string, ShipGroup> {
  const productById = new Map<string, any>(products.map((p: any) => [String(p._id), p]));
  const groups = new Map<string, ShipGroup>();
  for (const lines of linesByPodProduct.values()) {
    const { pod_id: podId, product_id: productId } = lines[0];
    const product = productById.get(productId);
    if (!product || product.delivery_target !== 'SHIPROCKET') continue;
    const qty = lines.reduce((sum, line) => sum + line.quantity, 0);
    if (qty <= 0) continue;
    const warehouseId = product.pickup_location_id ? String(product.pickup_location_id) : '';
    const key = `${podId}|${warehouseId}`;
    const group =
      groups.get(key) ?? { pod_id: podId, warehouse_id: warehouseId, weight: 0, manual: 0, free: true };
    group.weight += Number(product.weight_kg || 0) * qty;
    group.manual = Math.max(group.manual, Number(product.delivery_charge || 0));
    group.free =
      group.free && productLinesQualifyFree(product, lines, snapshotUnitCosts.get(`${podId}|${productId}`));
    groups.set(key, group);
  }
  return groups;
}

/** Quote one (pod, warehouse) bucket: free when every line qualified, else the
 * live ShipRocket rate, else the manual charge. */
async function quoteShipGroup(
  group: ShipGroup,
  pickupPincode: string,
  deliveryPincode: string,
  configured: boolean,
): Promise<ShipQuoteLine> {
  if (group.free) {
    // Every line met its product's free-delivery threshold — no rate lookup.
    return {
      pod_id: group.pod_id,
      warehouse_id: group.warehouse_id,
      pickup_pincode: pickupPincode,
      courier_name: '',
      charge: 0,
      quoted: true,
      free: true,
    };
  }
  const fallback: ShipQuoteLine = {
    pod_id: group.pod_id,
    warehouse_id: group.warehouse_id,
    pickup_pincode: pickupPincode,
    courier_name: '',
    charge: round2(group.manual),
    quoted: false,
    free: false,
  };
  if (!configured || !pickupPincode || !deliveryPincode) return fallback;
  try {
    const quote = await getServiceability({
      pickupPincode,
      deliveryPincode,
      weightKg: Math.max(0.1, group.weight),
    });
    if (!quote) return fallback;
    return {
      pod_id: group.pod_id,
      warehouse_id: group.warehouse_id,
      pickup_pincode: pickupPincode,
      courier_name: quote.courier_name,
      charge: round2(quote.freight_charge),
      quoted: true,
      free: false,
    };
  } catch (error) {
    logs.server.error('shiprocket', 'quoteShipping', {
      error,
      msg: 'serviceability lookup failed; using manual delivery charge',
      pickup_pincode: pickupPincode,
      delivery_pincode: deliveryPincode,
    });
    return fallback;
  }
}

async function resolvePickup(order: IProductOrder): Promise<string> {
  if (order.pickup_location_id) return order.pickup_location_id;
  return (await getRuntimeEnvValue('SHIPROCKET_PICKUP_LOCATION')) || 'Primary';
}

function buildAdhocPayload(order: IProductOrder, pickup: string): Record<string, unknown> {
  const addr = (order.shipping_address ?? {}) as Record<string, any>;
  const nameParts = String(addr.name ?? order.buyer_name ?? 'Customer').trim().split(/\s+/);
  const first = nameParts.shift() || 'Customer';
  const last = nameParts.join(' ') || '.';
  const items = order.line_items ?? [];
  const weight = Math.max(0.1, items.reduce((s, l) => s + Number(l.weight_kg || 0) * l.qty, 0));
  const length = Math.max(1, ...items.map((l) => Number(l.length_cm || 0)), 10);
  const breadth = Math.max(1, ...items.map((l) => Number(l.breadth_cm || 0)), 10);
  const height = Math.max(1, ...items.map((l) => Number(l.height_cm || 0)), 5);
  return {
    order_id: order.order_no,
    order_date: (order.created_at ?? new Date()).toISOString().slice(0, 10),
    pickup_location: pickup,
    billing_customer_name: first,
    billing_last_name: last,
    billing_address: addr.line1 ?? '',
    billing_address_2: addr.line2 ?? '',
    billing_city: addr.city ?? '',
    billing_pincode: addr.pincode ?? '',
    billing_state: addr.state ?? '',
    billing_country: addr.country || 'India',
    billing_email: addr.email || order.buyer_email,
    billing_phone: (addr.phone || order.buyer_phone || '').replace(/\D/g, '').slice(-10),
    shipping_is_billing: true,
    order_items: items.map((l) => ({
      name: l.name,
      sku: l.sku || l.name,
      units: l.qty,
      selling_price: l.unit_cost,
    })),
    payment_method: 'Prepaid',
    sub_total: order.items_total,
    length,
    breadth,
    height,
    weight,
  };
}

function applyTracking(order: IProductOrder, t: TrackResult): void {
  const status = mapShiprocketStatus(t.current_status);
  order.shiprocket.tracking_status = t.current_status;
  order.shiprocket.last_synced_at = new Date();
  order.fulfilment_status = status;
  const latest = t.activities[0];
  if (latest) {
    order.tracking_events.push({
      status: latest.status || t.current_status,
      code: 0,
      location: latest.location,
      note: latest.note,
      at: new Date(),
    } as any);
  }
}

export const shiprocketService = {
  /**
   * Estimate the delivery charge for a product cart: only SHIPROCKET-delivered
   * products count, grouped by (pod, Duncit warehouse) — each group → one future
   * SHIP order/shipment, so pods never share a quote line even from the same
   * warehouse. Each group is quoted live from ShipRocket, falling back to the
   * product's manual `delivery_charge` when ShipRocket can't rate it. The result
   * is authoritative — the checkout charges exactly this total.
   */
  async quoteShipping(items: CartItem[], deliveryPincode: string): Promise<ShipQuote> {
    const linesByPodProduct = mergeLinesByPodProduct(items);
    const rows = [...linesByPodProduct.values()].flat();
    const productIds = [...new Set(rows.map((r) => r.product_id))].filter((id) => Types.ObjectId.isValid(id));
    if (productIds.length === 0) return { total: 0, breakup: [], all_quoted: true };

    const products = await InventoryProductModel.find({ _id: { $in: productIds } }).select(
      'pickup_location_id delivery_target delivery_charge weight_kg free_delivery_above unit_cost variants',
    );
    const snapshotUnitCosts = await loadSnapshotUnitCosts(rows.map((r) => r.pod_id));
    const groups = buildShipGroups(products, linesByPodProduct, snapshotUnitCosts);
    if (groups.size === 0) return { total: 0, breakup: [], all_quoted: true };

    const warehouseIds = [
      ...new Set([...groups.values()].map((g) => g.warehouse_id)),
    ].filter((id) => id && Types.ObjectId.isValid(id));
    const warehouses = await BrandPickupLocationModel.find({ _id: { $in: warehouseIds } }).select('pincode');
    const pincodeByWarehouse = new Map(warehouses.map((w) => [String(w._id), String(w.pincode ?? '')]));
    const configured = await isShiprocketConfigured();

    const breakup: ShipQuoteLine[] = [];
    for (const group of groups.values()) {
      const pincode = pincodeByWarehouse.get(group.warehouse_id) ?? '';
      breakup.push(await quoteShipGroup(group, pincode, deliveryPincode, configured));
    }
    return {
      total: round2(breakup.reduce((sum, line) => sum + line.charge, 0)),
      breakup,
      all_quoted: breakup.every((line) => line.quoted),
    };
  },

  /**
   * Create the ShipRocket order + shipment for a SHIP order and assign an AWB.
   * Best-effort: no-ops when ShipRocket is unconfigured or the order isn't SHIP,
   * and records FAILED + last_error on error instead of throwing (so a paid
   * checkout is never failed by a fulfilment hiccup).
   */
  async createShipment(order: IProductOrder): Promise<IProductOrder> {
    if (order.fulfilment_method !== 'SHIP') return order;
    if (!(await isShiprocketConfigured())) return order;
    try {
      const pickup = await resolvePickup(order);
      const adhoc = await createOrderAdhoc(buildAdhocPayload(order, pickup));
      order.pickup_location_id = pickup;
      order.shiprocket.order_id = adhoc.order_id;
      order.shiprocket.shipment_id = adhoc.shipment_id;
      let status: IProductOrder['fulfilment_status'] = 'AWAITING_SHIPMENT';
      if (adhoc.shipment_id) {
        const awb = await assignAwb(adhoc.shipment_id);
        order.shiprocket.awb = awb.awb;
        order.shiprocket.courier_name = awb.courier_name;
        order.shiprocket.courier_company_id = awb.courier_company_id;
        order.shiprocket.label_url = awb.label_url;
        if (awb.awb) status = 'AWB_ASSIGNED';
      }
      order.fulfilment_status = status;
      order.shiprocket.last_synced_at = new Date();
      order.last_error = '';
      order.tracking_events.push({
        status,
        code: 0,
        location: '',
        note: 'ShipRocket shipment created',
        at: new Date(),
      } as any);
      await order.save();
    } catch (e) {
      order.fulfilment_status = 'FAILED';
      order.last_error = (e as Error).message;
      await order.save().catch(() => {});
    }
    return order;
  },

  /** Pull the latest tracking from ShipRocket and persist it. No-op when
   * unconfigured or no shipment exists yet. */
  async refreshTracking(order: IProductOrder): Promise<IProductOrder> {
    if (!(await isShiprocketConfigured()) || !order.shiprocket.shipment_id) return order;
    const t = await trackByShipment(order.shiprocket.shipment_id);
    applyTracking(order, t);
    await order.save();
    return order;
  },

  /** Apply an inbound ShipRocket webhook status event to the matching order. */
  async applyWebhookEvent(payload: Record<string, any>): Promise<IProductOrder | null> {
    const awb = String(payload.awb ?? payload.awb_code ?? '').trim();
    const orderId = String(payload.order_id ?? payload.channel_order_id ?? '').trim();
    const query = awb ? { 'shiprocket.awb': awb } : { 'shiprocket.order_id': orderId };
    const order = await ProductOrderModel.findOne(query);
    if (!order) return null;
    const current = String(payload.current_status ?? payload.shipment_status ?? '');
    applyTracking(order, { current_status: current, activities: [] });
    await order.save();
    return order;
  },
};
