/**
 * The pod-shop history rules My Product Orders reads: which orders can still be
 * returned and until when, what a refund line says, and what a return's status
 * is called. Framework-free, and kept line-for-line identical to the mWeb twin
 * `pages/orders-history-page/podShopReturns.ts` (rule 27) so both surfaces decide alike.
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
