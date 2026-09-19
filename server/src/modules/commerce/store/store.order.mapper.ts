import type { FulfilmentStatus, IProductOrder } from '@modules/commerce/productOrder/productOrder.model';
import type { IPayment } from '@modules/finance/payment/payment.model';
import { iso, round2 } from './store.shared';

/**
 * A pet-store order as its BUYER reads it — the storefront's order page, the
 * confirmation screen and a guest's tracking lookup. The ecomm portal reads the
 * full `ProductOrder` instead; this shape leaves out every operator field.
 */

/** Before the courier has it, an order can still be called off. */
export const CANCELLABLE: ReadonlySet<FulfilmentStatus> = new Set([
  'PENDING',
  'AWAITING_SHIPMENT',
  'AWB_ASSIGNED',
  'PICKUP_SCHEDULED',
]);

/** The public ShipRocket tracking page for an AWB. */
export const trackingUrlOf = (awb: string) =>
  awb ? `https://shiprocket.co/tracking/${encodeURIComponent(awb)}` : '';

/** When the parcel arrived: the DELIVERED tracking event, else the last update. */
export function deliveredAt(order: IProductOrder): Date | null {
  if (order.fulfilment_status !== 'DELIVERED') return null;
  const events = [...(order.tracking_events ?? [])].reverse();
  const hit = events.find((e) => String(e.status).toUpperCase().includes('DELIVERED'));
  return hit?.at ?? order.updated_at ?? null;
}

export type StorePaymentState =
  | 'PAID'
  | 'PENDING'
  | 'FAILED'
  | 'REFUNDED'
  | 'REFUND_INITIATED'
  | 'COD_PENDING'
  | 'COD_COLLECTED'
  | 'CANCELLED';

export function paymentStateOf(order: IProductOrder, payment: IPayment | null): StorePaymentState {
  if (order.payment_method === 'COD') {
    if (order.cod_collected_at) return 'COD_COLLECTED';
    return order.cancelled_at ? 'CANCELLED' : 'COD_PENDING';
  }
  if (order.cancelled_at) return payment?.status === 'REFUNDED' ? 'REFUNDED' : 'REFUND_INITIATED';
  if (!payment) return 'PAID';
  if (payment.status === 'SUCCESS') return 'PAID';
  if (payment.status === 'REFUNDED') return 'REFUNDED';
  return payment.status === 'FAILED' ? 'FAILED' : 'PENDING';
}

export interface StoreOrderContext {
  returnsEnabled?: boolean;
  returnWindowDays?: number;
  /** Units already on a return request, per `product|variant`. */
  returnedQty?: Map<string, number>;
}

const DAY_MS = 86_400_000;

export function returnDeadline(order: IProductOrder, windowDays: number): Date | null {
  const at = deliveredAt(order);
  return at ? new Date(at.getTime() + windowDays * DAY_MS) : null;
}

export function toStoreOrder(order: IProductOrder, payment: IPayment | null, ctx: StoreOrderContext = {}) {
  const awb = order.shiprocket?.awb ?? '';
  const deadline = returnDeadline(order, ctx.returnWindowDays ?? 0);
  const returned = ctx.returnedQty ?? new Map<string, number>();
  const items = (order.line_items ?? []).map((l) => {
    const key = `${String(l.product_id)}|${l.variant_id ?? ''}`;
    return {
      product_id: String(l.product_id),
      variant_id: l.variant_id ?? '',
      name: l.name,
      variant_label: l.variant_label ?? '',
      image_url: l.image_url ?? '',
      qty: l.qty,
      unit_price: l.unit_cost,
      line_total: l.gross,
      returned_qty: returned.get(key) ?? 0,
    };
  });
  const canReturn =
    !!ctx.returnsEnabled &&
    !!deadline &&
    deadline.getTime() > Date.now() &&
    items.some((i) => i.qty > i.returned_qty);
  return {
    id: String(order._id),
    order_no: order.order_no,
    status: order.fulfilment_status,
    payment_method: order.payment_method ?? 'PREPAID',
    payment_state: paymentStateOf(order, payment),
    invoice_no: payment?.invoice_no ?? '',
    items,
    items_total: order.items_total,
    shipping_charge: order.shipping_charge,
    discount_total: order.discount_total ?? 0,
    amount_paid: round2(Math.max(0, order.total - (order.discount_total ?? 0))),
    cod_amount: order.cod_amount ?? 0,
    total: order.total,
    currency_symbol: order.currency_symbol,
    shipping_address: order.shipping_address
      ? {
          name: order.shipping_address.name,
          phone: order.shipping_address.phone,
          line1: order.shipping_address.line1,
          line2: order.shipping_address.line2,
          landmark: order.shipping_address.landmark,
          city: order.shipping_address.city,
          state: order.shipping_address.state,
          pincode: order.shipping_address.pincode,
          country: order.shipping_address.country,
        }
      : null,
    courier_name: order.shiprocket?.courier_name ?? '',
    awb,
    tracking_url: trackingUrlOf(awb),
    etd: order.shiprocket?.etd ?? '',
    events: (order.tracking_events ?? []).map((e) => ({
      status: e.status,
      location: e.location,
      note: e.note,
      at: iso(e.at) ?? '',
    })),
    created_at: iso(order.created_at) ?? '',
    delivered_at: iso(deliveredAt(order)),
    cancelled_at: iso(order.cancelled_at),
    cancel_reason: order.cancel_reason ?? '',
    can_cancel: CANCELLABLE.has(order.fulfilment_status) && !order.cancelled_at,
    can_return: canReturn,
    return_deadline: iso(deadline),
  };
}
