/**
 * Pod Shop order history rules, shared by mWeb and the native app (rule 27):
 * which orders can still be returned and until when, what a refund line says,
 * what a return's status is called, and the "Return items" form's defaults
 * and mutation input. Framework-free — the copy comes back as literal bundle
 * keys (the translation-key gate only sees literal keys) for each app to render.
 */

export interface OrderRefundView {
  status: string;
  amount: number;
  coins: number;
  refunded_at?: string | null;
}

export interface ReturnableLineView {
  product_id: string;
  variant_id: string;
  returnable_qty: number;
  returnable_until?: string | null;
}

/** One line of copy: a literal bundle key plus the values it interpolates. */
export interface CopyLine {
  key: string;
  vars?: Record<string, string>;
}

/** Keyed by the server's PodShopReturnStatus. */
export const RETURN_STATUS_KEYS: Readonly<Record<string, string>> = {
  REQUESTED: 'mweb.podShopReturns.statusRequested',
  APPROVED: 'mweb.podShopReturns.statusApproved',
  REJECTED: 'mweb.podShopReturns.statusRejected',
  PICKUP_SCHEDULED: 'mweb.podShopReturns.statusPickupScheduled',
  RECEIVED: 'mweb.podShopReturns.statusReceived',
  REFUNDED: 'mweb.podShopReturns.statusRefunded',
  CANCELLED: 'mweb.podShopReturns.statusCancelled',
};

/** How a return's status chip reads: still moving, finished well, or closed. */
export type ReturnTone = 'active' | 'done' | 'closed';

export function returnTone(status: string): ReturnTone {
  if (status === 'REFUNDED') return 'done';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'closed';
  return 'active';
}

export function returnStatusKey(status: string): string {
  return RETURN_STATUS_KEYS[status] ?? 'mweb.podShopReturns.statusRequested';
}

/** Only an undecided return can still be withdrawn by the buyer. */
export const canCancelReturn = (status: string): boolean => status === 'REQUESTED';

/** The reasons a buyer picks from. The id is stable; the label is what is sent. */
export const RETURN_REASONS = [
  { id: 'damaged', key: 'mweb.podShopReturns.reasonDamaged' },
  { id: 'wrong-item', key: 'mweb.podShopReturns.reasonWrongItem' },
  { id: 'not-as-described', key: 'mweb.podShopReturns.reasonNotAsDescribed' },
  { id: 'size-fit', key: 'mweb.podShopReturns.reasonSizeFit' },
  { id: 'no-longer-needed', key: 'mweb.podShopReturns.reasonNoLongerNeeded' },
  { id: 'other', key: 'mweb.podShopReturns.reasonOther' },
] as const;

export function reasonKey(id: string): string | null {
  return RETURN_REASONS.find((reason) => reason.id === id)?.key ?? null;
}

/** The lines the buyer can still send back — empty means no "Return items". */
export function openReturnLines<T extends ReturnableLineView>(returnable: readonly T[]): T[] {
  return returnable.filter((line) => line.returnable_qty > 0);
}

/** The earliest deadline among the lines that can still go back. */
export function returnDeadline(returnable: readonly ReturnableLineView[]): string | null {
  let earliest: string | null = null;
  for (const line of openReturnLines(returnable)) {
    const until = line.returnable_until;
    if (until && (earliest === null || Date.parse(until) < Date.parse(earliest))) earliest = until;
  }
  return earliest;
}

const MONEY_KEYS: Record<string, string> = {
  PENDING: 'mweb.ordersHistory.refundInitiated',
  PROCESSED: 'mweb.ordersHistory.refundInitiated',
  RECORDED: 'mweb.ordersHistory.refundRecorded',
};

function moneyLine(
  refund: OrderRefundView,
  money: (amount: number) => string,
  date: (iso: string) => string
): CopyLine | null {
  if (refund.status === 'FAILED') return { key: 'mweb.ordersHistory.refundFailed' };
  const key = MONEY_KEYS[refund.status];
  if (!key || refund.amount <= 0) return null;
  const amount = money(refund.amount);
  if (refund.status === 'PROCESSED' && refund.refunded_at) {
    return { key: 'mweb.ordersHistory.refundProcessedOn', vars: { amount, date: date(refund.refunded_at) } };
  }
  return { key, vars: { amount } };
}

/** What the buyer is told about money and coins going back. Empty when nothing is. */
export function refundCopy(
  refund: OrderRefundView,
  money: (amount: number) => string,
  date: (iso: string) => string
): CopyLine[] {
  if (refund.status === 'NONE') return [];
  const lines: CopyLine[] = [];
  const cash = moneyLine(refund, money, date);
  if (cash) lines.push(cash);
  if (refund.coins > 0) {
    lines.push({ key: 'mweb.ordersHistory.coinsReturned', vars: { coins: String(refund.coins) } });
  }
  return lines;
}

/** Returns grouped under the order they were asked for on. */
export function groupReturnsByOrder<T extends { order_id: string }>(returns: readonly T[]): Map<string, T[]> {
  const byOrder = new Map<string, T[]>();
  for (const ret of returns) {
    const list = byOrder.get(ret.order_id) ?? [];
    list.push(ret);
    byOrder.set(ret.order_id, list);
  }
  return byOrder;
}

/** Most characters a buyer can write in a return's comments (the server's limit). */
export const RETURN_COMMENTS_MAX = 2000;

/** One row of the "Return items" form. */
export interface ReturnFormLine {
  product_id: string;
  variant_id: string;
  name: string;
  variant_label: string;
  /** What the server says can still go back. */
  max: number;
  qty: number;
}

export interface ReturnFormValues {
  lines: ReturnFormLine[];
  reason: string;
  comments: string;
}

/** What the form reads off an order. */
export interface OrderForReturn {
  line_items: readonly { product_id: string; variant_id?: string | null; variant_label?: string | null; name: string }[];
  returnable: readonly { product_id: string; variant_id: string; returnable_qty: number }[];
}

/** One row per line that can still go back, nothing picked yet. */
export function returnFormDefaults(order: OrderForReturn): ReturnFormValues {
  const lines: ReturnFormLine[] = [];
  for (const open of order.returnable) {
    if (open.returnable_qty <= 0) continue;
    const item = order.line_items.find(
      (li) => li.product_id === open.product_id && (li.variant_id ?? '') === open.variant_id
    );
    if (!item) continue;
    lines.push({
      product_id: open.product_id,
      variant_id: open.variant_id,
      name: item.name,
      variant_label: item.variant_label ?? '',
      max: open.returnable_qty,
      qty: 0,
    });
  }
  return { lines, reason: '', comments: '' };
}

/** The requestPodShopReturn input: only picked lines, the reason as the buyer read it. */
export function toReturnInput(orderId: string, values: ReturnFormValues, reasonText: string) {
  return {
    order_id: orderId,
    items: values.lines
      .filter((line) => line.qty > 0)
      .map((line) => ({ product_id: line.product_id, variant_id: line.variant_id, qty: line.qty })),
    reason: reasonText,
    comments: values.comments.trim(),
  };
}
