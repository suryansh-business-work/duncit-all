/**
 * The Refund area of Finance › Payment Logs › one payment, as pure functions.
 *
 * A payment's refunds are not in one place. Money goes back through five
 * different engines and each keeps its own record:
 *  - the gateway refund outbox (`PaymentGatewayRefund`): a pod cancellation, a
 *    Finance refund, a Backout, a rented item — plus a cancellation refund that
 *    is being HELD until the pod starts;
 *  - the pod-shop refund on an order or a return (`refund` on the document);
 *  - the failed-payment case: a capture that bought nothing, refunded by Finance;
 *  - the Duncit Coin ledger: coins handed back to the wallet;
 *  - and, for refunds older than any of those records, only the stamps left on
 *    the payment itself.
 * This file turns each record into one `RefundEntry` and groups them into
 * sections. It reads nothing — the service loads the documents — so every rule
 * about what counts as "owed" or "safe to press Refund" is testable on its own.
 *
 * Three buckets, because the page colours three things: PENDING (money is owed
 * or on its way, yellow), COMPLETED, and FAILED (a refund Razorpay refused or
 * whose retries ran out — somebody has to act).
 */
import { PAYMENT_WRITE_ROLES } from './payment.roles';
import { razorpayPaymentIdOf, razorpayRefundIdsOf } from './payment.gatewayIds';
import type { IPayment } from './payment.model';
import type { GatewayRefundStatus, IPaymentGatewayRefund } from './payment.gatewayRefund.model';
import type { IOrderRefund } from '@modules/commerce/productOrder/productOrder.model';
import type { ICaseRefund, IFailedPaymentCase } from '@modules/finance/failedPayment/failedPaymentCase.model';
import type { ICoinTransaction } from '@modules/finance/coin/coin.model';
import { FAILED_PAYMENT_WRITE } from '@modules/finance/failedPayment/failedPayment.types';

/** In the order the page lists them: coins first, then the payment itself, then what hangs off it. */
export const REFUND_KINDS = ['COIN', 'POD_PAYMENT', 'PAYMENT', 'RENTAL', 'POD_SHOP', 'ECOMM', 'FAILED_PAYMENT'] as const;
export type RefundKind = (typeof REFUND_KINDS)[number];
export type RefundState = 'PENDING' | 'COMPLETED' | 'FAILED';

/** One refund event as the audit trail reports it (the shape `toEventOut` returns). */
export interface RefundEventOut {
  id: string;
  type: string;
  source: string;
  actor_name: string | null;
  details: { key: string; value: string }[];
  created_at: string;
}

export interface RefundEntry {
  id: string;
  ref: string | null;
  source: string;
  status: string;
  state: RefundState;
  amount: number;
  coins: number;
  razorpay_refund_id: string | null;
  razorpay_refund_ids: string[];
  razorpay_payment_id: string | null;
  initiated_by: string | null;
  reason: string | null;
  error: string | null;
  attempts: number;
  requested_at: string | null;
  processed_at: string | null;
  due_at: string | null;
  can_refund: boolean;
}

export interface RefundSection {
  kind: RefundKind;
  state: RefundState;
  amount: number;
  coins: number;
  entries: RefundEntry[];
  events: RefundEventOut[];
}

/**
 * Who may press Refund for each kind. The gateway kinds are exactly who may
 * `refundPayment`; the pod shop and failed-payment refunds keep the narrower
 * sets their own consoles already use. The e-commerce store pays out by hand and
 * the coin ledger is not a refund to send, so neither has a button at all.
 */
const WRITE_ROLES: Record<RefundKind, readonly string[]> = {
  COIN: [],
  POD_PAYMENT: PAYMENT_WRITE_ROLES,
  PAYMENT: PAYMENT_WRITE_ROLES,
  RENTAL: PAYMENT_WRITE_ROLES,
  POD_SHOP: ['SUPER_ADMIN', 'FINANCE_MANAGER'],
  ECOMM: [],
  FAILED_PAYMENT: FAILED_PAYMENT_WRITE,
};

export const refundWriteRoles = (kind: RefundKind): readonly string[] => WRITE_ROLES[kind];

/** Kinds that go through the gateway outbox — they share Finance's city/zone scope check. */
export const GATEWAY_REFUND_KINDS: ReadonlySet<RefundKind> = new Set(['POD_PAYMENT', 'PAYMENT', 'RENTAL']);

/** A refund sent to Razorpay with no answer recorded is only abandoned after this long (same window the pod-shop retry uses). */
export const ORDER_REFUND_IN_FLIGHT_MS = 15 * 60_000;

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const iso = (value: Date | string | null | undefined): string | null => (value ? new Date(value).toISOString() : null);
const orNull = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);

// ---------------------------------------------------------------- gateway outbox

const GATEWAY_STATE: Record<GatewayRefundStatus, RefundState> = {
  QUEUED: 'PENDING',
  SENDING: 'PENDING',
  PROCESSING: 'PENDING',
  // A failed send is retried by the sweep on its own, so it is still owed — not yet a problem for a person.
  FAILED: 'PENDING',
  SUCCEEDED: 'COMPLETED',
  // Nothing to send back (test gateway, offline payment): recorded, nothing owed.
  NOT_APPLICABLE: 'COMPLETED',
  RECONCILIATION_REQUIRED: 'FAILED',
};

/** States where pressing Refund is safe: nothing is in flight at Razorpay, and the next send adopts any refund that did reach it. */
const GATEWAY_ACTIONABLE: ReadonlySet<GatewayRefundStatus> = new Set(['QUEUED', 'FAILED', 'RECONCILIATION_REQUIRED']);

/** `rental_refund:<booking>` / `backout:<request>` name what the refund was for; the others are the payment itself. */
const refOfKey = (key: string, fallback: string): string => {
  const [kind, id] = key.split(':');
  return (kind === 'rental_refund' || kind === 'backout') && id ? id : fallback;
};

export function gatewayEntry(record: IPaymentGatewayRefund): RefundEntry {
  const refundId = orNull(record.razorpay_refund_id);
  const razorpayPaymentId = orNull(record.razorpay_payment_id);
  return {
    id: String(record._id),
    ref: refOfKey(record.idempotency_key, record.payment_id),
    source: record.source,
    status: record.status,
    state: GATEWAY_STATE[record.status],
    amount: round2((record.amount_paise || 0) / 100),
    coins: 0,
    razorpay_refund_id: refundId,
    razorpay_refund_ids: refundId ? [refundId] : [],
    razorpay_payment_id: razorpayPaymentId,
    initiated_by: orNull(record.initiated_by),
    reason: orNull(record.reason),
    error: orNull(record.last_error),
    attempts: record.attempts ?? 0,
    requested_at: iso(record.requested_at ?? record.created_at),
    processed_at: iso(record.processed_at),
    due_at: null,
    // Without a Razorpay payment id there is nothing to send it against — a person must find it on the dashboard.
    can_refund: GATEWAY_ACTIONABLE.has(record.status) && razorpayPaymentId !== null,
  };
}

/** A cancellation refund scheduled for when the pod starts: owed, deliberately not paid yet, and not Finance's to hurry. */
export function heldEntry(payment: Pick<IPayment, '_id' | 'metadata'>): RefundEntry | null {
  const meta = payment.metadata ?? {};
  if (meta.refund_hold !== true) return null;
  return {
    id: `held:${String(payment._id)}`,
    ref: null,
    source: 'HELD',
    status: 'HELD',
    state: 'PENDING',
    amount: round2(Number(meta.refund_hold_amount)),
    coins: 0,
    razorpay_refund_id: null,
    razorpay_refund_ids: [],
    razorpay_payment_id: null,
    initiated_by: orNull(meta.refund_hold_initiated_by),
    reason: orNull(meta.refund_hold_reason),
    error: null,
    attempts: 0,
    requested_at: null,
    processed_at: null,
    due_at: iso(meta.refund_hold_release_at),
    can_refund: false,
  };
}

/**
 * A refund older than the outbox: nothing but the stamps on the payment says it
 * happened. Shown so a REFUNDED payment never reads as having no refund at all.
 */
export function recordedEntry(payment: Pick<IPayment, '_id' | 'metadata' | 'total' | 'payment_id' | 'gateway_ref'>): RefundEntry {
  const meta = payment.metadata ?? {};
  const stamped = Number(meta.refunded_amount);
  const ids = razorpayRefundIdsOf(payment);
  const refundedAt = orNull(meta.refunded_at);
  return {
    id: `recorded:${String(payment._id)}`,
    ref: payment.payment_id,
    source: 'RECORDED',
    status: 'RECORDED',
    state: 'COMPLETED',
    amount: Number.isFinite(stamped) ? round2(stamped) : round2(payment.total),
    coins: 0,
    razorpay_refund_id: ids[0] ?? null,
    razorpay_refund_ids: ids,
    razorpay_payment_id: null,
    initiated_by: orNull(meta.refund_initiated_by) ?? orNull(meta.refunded_by),
    reason: orNull(meta.refund_reason),
    error: null,
    attempts: 0,
    requested_at: refundedAt,
    processed_at: refundedAt,
    due_at: null,
    can_refund: false,
  };
}

// ---------------------------------------------------------------- pod shop / ecomm

type OrderRefundStatus = IOrderRefund['status'];

const ORDER_STATE: Record<Exclude<OrderRefundStatus, ''>, RefundState> = {
  PENDING: 'PENDING',
  PROCESSED: 'COMPLETED',
  RECORDED: 'COMPLETED',
  FAILED: 'FAILED',
};

export interface OrderRefundInput {
  id: string;
  ref: string;
  source: 'CANCELLATION' | 'RETURN';
  refund: IOrderRefund;
  /** The Razorpay payment the refund goes back to — the payment's own. */
  razorpayPaymentId: string | null;
  /** The pod shop can retry one; the e-commerce store pays out by hand. */
  retryable: boolean;
}

/** A refund Razorpay refused, or one a crash left PENDING long enough to be sure nothing is still on the wire. */
const orderRetryable = (refund: IOrderRefund, now: Date): boolean => {
  if (refund.status === 'FAILED') return true;
  const attempted = refund.attempted_at ? new Date(refund.attempted_at).getTime() : Number.NaN;
  return refund.status === 'PENDING' && Number.isFinite(attempted) && now.getTime() - attempted > ORDER_REFUND_IN_FLIGHT_MS;
};

/** Null when no refund was ever started on the order or return. */
export function orderRefundEntry(input: OrderRefundInput, now: Date): RefundEntry | null {
  const { refund } = input;
  if (!refund.status) return null;
  const refundId = orNull(refund.razorpay_refund_id);
  return {
    id: input.id,
    ref: input.ref,
    source: input.source,
    status: refund.status,
    state: ORDER_STATE[refund.status],
    amount: round2(refund.amount),
    coins: Math.max(0, Math.floor(refund.coins ?? 0)),
    razorpay_refund_id: refundId,
    razorpay_refund_ids: refundId ? [refundId] : [],
    razorpay_payment_id: input.razorpayPaymentId,
    initiated_by: orNull(refund.initiated_by),
    reason: null,
    error: orNull(refund.error),
    attempts: 0,
    requested_at: iso(refund.attempted_at),
    processed_at: iso(refund.refunded_at),
    due_at: null,
    can_refund: input.retryable && orderRetryable(refund, now),
  };
}

// ---------------------------------------------------------------- failed payment

const CASE_REFUND_STATE: Record<ICaseRefund['status'], RefundState> = {
  '': 'PENDING',
  PENDING: 'PENDING',
  PROCESSED: 'COMPLETED',
  FAILED: 'FAILED',
};

/**
 * A failed-payment case belongs in the Refund area when a refund was started or
 * finished, or when money is still owed: the case is open on a payment the
 * reconciler flagged as captured-and-unbooked.
 */
export const caseHasRefund = (kase: Pick<IFailedPaymentCase, 'refund' | 'resolution'>, needsRefund: boolean): boolean =>
  kase.refund.status !== '' || (kase.resolution.state === 'OPEN' && needsRefund);

export function caseEntry(
  kase: Pick<IFailedPaymentCase, '_id' | 'refund' | 'amount' | 'ticket_no' | 'razorpay_payment_id'>,
  /** The caller's own answer to "may this case be refunded now" — failedPayment.refund's own eligibility rule. */
  eligible: boolean
): RefundEntry {
  const { refund } = kase;
  const refundId = orNull(refund.razorpay_refund_id);
  const paise = Number(refund.amount_paise) || 0;
  return {
    id: String(kase._id),
    ref: orNull(kase.ticket_no),
    source: 'CASE',
    status: refund.status || 'NOT_STARTED',
    state: CASE_REFUND_STATE[refund.status],
    amount: paise > 0 ? round2(paise / 100) : round2(kase.amount),
    coins: 0,
    razorpay_refund_id: refundId,
    razorpay_refund_ids: refundId ? [refundId] : [],
    razorpay_payment_id: orNull(refund.razorpay_payment_id) ?? orNull(kase.razorpay_payment_id),
    initiated_by: orNull(refund.initiated_by_name),
    reason: null,
    error: orNull(refund.error),
    attempts: refund.attempts ?? 0,
    requested_at: iso(refund.claimed_at),
    processed_at: iso(refund.refunded_at),
    due_at: null,
    can_refund: eligible && (refund.status === '' || refund.status === 'FAILED'),
  };
}

// ---------------------------------------------------------------- coins

/** Coins handed back to the wallet: a ledger row, so it is always already done. */
export function coinEntry(txn: Pick<ICoinTransaction, '_id' | 'amount' | 'reason' | 'backout_id' | 'created_at'>): RefundEntry {
  return {
    id: String(txn._id),
    ref: orNull(txn.backout_id),
    source: 'LEDGER',
    status: 'CREDITED',
    state: 'COMPLETED',
    amount: 0,
    coins: Math.max(0, Math.floor(txn.amount)),
    razorpay_refund_id: null,
    razorpay_refund_ids: [],
    razorpay_payment_id: null,
    initiated_by: null,
    reason: orNull(txn.reason),
    error: null,
    attempts: 0,
    requested_at: iso(txn.created_at),
    processed_at: iso(txn.created_at),
    due_at: null,
    can_refund: false,
  };
}

// ---------------------------------------------------------------- sections

/** Somebody-must-act beats still-owed beats done: the worst row colours the section. */
export function sectionState(entries: readonly RefundEntry[]): RefundState {
  if (entries.some((e) => e.state === 'FAILED')) return 'FAILED';
  if (entries.some((e) => e.state === 'PENDING')) return 'PENDING';
  return 'COMPLETED';
}

/** Sorts a row with no date after every real ISO date. */
const LAST = '9999';
const byRequested = (a: RefundEntry, b: RefundEntry) =>
  (a.requested_at ?? a.due_at ?? LAST).localeCompare(b.requested_at ?? b.due_at ?? LAST);

/**
 * One section, or null when it has nothing to show. A caller who may not send
 * this kind sees every row with its button off — the server refuses them too.
 */
export function buildSection(
  kind: RefundKind,
  entries: readonly RefundEntry[],
  events: readonly RefundEventOut[],
  mayRefund: boolean
): RefundSection | null {
  if (entries.length === 0) return null;
  const sorted = [...entries].sort(byRequested).map((e) => ({ ...e, can_refund: e.can_refund && mayRefund }));
  return {
    kind,
    state: sectionState(sorted),
    amount: round2(sorted.reduce((sum, e) => sum + e.amount, 0)),
    coins: sorted.reduce((sum, e) => sum + e.coins, 0),
    entries: sorted,
    events: [...events],
  };
}

/** Which kind a gateway-outbox row belongs to: a rental has its own; a pod booking's money is the pod payment's. */
export const gatewayKindOf = (record: Pick<IPaymentGatewayRefund, 'source'>, payment: Pick<IPayment, 'pod_id'>): RefundKind => {
  if (record.source === 'RENTAL') return 'RENTAL';
  return payment.pod_id ? 'POD_PAYMENT' : 'PAYMENT';
};

/** True when the legacy stamp is all there is: no record from any engine explains the refund. */
export const needsRecordedEntry = (
  payment: Pick<IPayment, 'status' | 'metadata'>,
  explainedByARecord: boolean
): boolean => !explainedByARecord && (payment.status === 'REFUNDED' || !!orNull(payment.metadata?.refunded_at));

/** The Razorpay payment a pod-shop or store refund goes back to: the payment row's own. */
export const refundTargetOf = (payment: Pick<IPayment, 'gateway' | 'gateway_ref' | 'metadata'>): string | null =>
  payment.gateway === 'RAZORPAY' ? orNull(razorpayPaymentIdOf(payment)) : null;
