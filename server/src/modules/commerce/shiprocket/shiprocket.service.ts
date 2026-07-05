import { getRuntimeEnvValue } from '@config/runtimeEnv';
import {
  isShiprocketConfigured,
  createOrderAdhoc,
  assignAwb,
  trackByShipment,
  type TrackResult,
} from './shiprocket.gateway';
import { mapShiprocketStatus } from './shiprocket.statusMap';
import { ProductOrderModel, type IProductOrder } from '@modules/commerce/productOrder/productOrder.model';

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
