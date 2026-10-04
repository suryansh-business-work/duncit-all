import type { PodShopReturnStatus } from './podShopReturn.model';

/** What the rules read of an existing return — a stored doc or a lean read. */
export interface ReturnFacts {
  status: string;
  items: { product_id: unknown; variant_id?: string; qty: number }[];
}

/**
 * What a buyer may still send back on a pod-shop order — pure, so the buyer's
 * "Return items" screen and the request mutation can never disagree.
 */

const DAY_MS = 86_400_000;

export interface ReturnableLine {
  product_id: string;
  variant_id: string;
  /** Units bought minus units already on a live or settled return. */
  returnable_qty: number;
  /** Last moment a return can be asked for; null when the line was never returnable. */
  returnable_until: string | null;
}

const lineKey = (productId: unknown, variantId: unknown) => `${String(productId)}|${String(variantId ?? '')}`;

/** Units already on a return that is not rejected or cancelled, per `product|variant`. */
export function returnedQty(returns: ReturnFacts[]) {
  const taken = new Map<string, number>();
  const dead: string[] = ['REJECTED', 'CANCELLED'];
  for (const r of returns) {
    if (dead.includes(r.status)) continue;
    for (const item of r.items) {
      const key = lineKey(item.product_id, item.variant_id);
      taken.set(key, (taken.get(key) ?? 0) + item.qty);
    }
  }
  return taken;
}

/** The facts about an order the return rules read — a stored order or its public shape converted. */
export interface ReturnOrderFacts {
  channel: string;
  cancelled_at: Date | null;
  delivered_at: Date | null;
  fulfilment_status: string;
  updated_at: Date | null;
  line_items: { product_id: unknown; variant_id?: string; qty: number; return_window_days?: number }[];
}

/** When the goods reached the buyer: the stamp, else the last change on a delivered order (older orders). */
export function deliveredAt(order: Pick<ReturnOrderFacts, 'delivered_at' | 'fulfilment_status' | 'updated_at'>): Date | null {
  if (order.fulfilment_status !== 'DELIVERED' && order.fulfilment_status !== 'PICKED_UP') return null;
  return order.delivered_at ?? order.updated_at ?? null;
}

/** Every line of the order with how much of it can still go back, and until when. */
export function returnableLines(
  order: ReturnOrderFacts,
  returns: ReturnFacts[],
  now = new Date()
): ReturnableLine[] {
  const delivered = order.channel === 'POD_SHOP' && !order.cancelled_at ? deliveredAt(order) : null;
  const taken = returnedQty(returns);
  return order.line_items.map((line) => {
    const days = Math.max(0, Math.floor(Number(line.return_window_days) || 0));
    const until = delivered && days > 0 ? new Date(delivered.getTime() + days * DAY_MS) : null;
    const open = until !== null && until.getTime() >= now.getTime();
    const left = line.qty - (taken.get(lineKey(line.product_id, line.variant_id)) ?? 0);
    return {
      product_id: String(line.product_id),
      variant_id: line.variant_id ?? '',
      returnable_qty: open ? Math.max(0, left) : 0,
      returnable_until: until ? until.toISOString() : null,
    };
  });
}

/** The buyer-facing words for a return's status, used in the email and WhatsApp. */
export const RETURN_STATUS_WORDS: Record<PodShopReturnStatus, string> = {
  REQUESTED: 'requested — the brand will review it shortly',
  APPROVED: 'approved — a courier pickup is being booked',
  REJECTED: 'not accepted',
  PICKUP_SCHEDULED: 'pickup scheduled — keep the item packed and ready',
  RECEIVED: 'received at the warehouse — your refund is next',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled',
};
