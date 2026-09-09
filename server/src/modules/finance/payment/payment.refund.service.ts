/**
 * The read behind Finance › User Refund Logs: every refund that has actually
 * been paid back to a buyer.
 *
 * There is no refund collection — a refund is recorded ON the payment it
 * reverses, and FOUR different flows write it: the admin's `refundPayment`, a
 * pod cancellation, the delayed release of a held cancellation refund, and a
 * Backout whose spot was filled. All four set `metadata.refunded_at`, so that
 * one stamp is what makes a payment a refund here — a payment merely HOLDING a
 * refund (`metadata.refund_hold`) has not paid anything back yet and must not
 * appear.
 *
 * Two fields are derived rather than stored, because the writers record what
 * they changed rather than a snapshot:
 *  - `refund_amount` is `metadata.refunded_amount` — the running total returned
 *    across every release on the booking — falling back to the payment total,
 *    which is what the admin refund returns without writing a figure. Same rule
 *    the cancellation console already reads by (REFUNDED_MONEY_EXPR).
 *  - `partial` is a payment still SUCCESS after a refund: only a release of the
 *    WHOLE booking flips the status, so a buyer who gave back some seats and
 *    kept the rest shows here as a part refund instead of a settled one.
 */
import { PaymentModel, type IPayment } from './payment.model';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

/** A refund is a payment carrying the stamp one of the four flows left on it. */
const REFUNDED_ONLY = { 'metadata.refunded_at': { $exists: true, $ne: null } };

/**
 * Allowlists for the shared table engine (userRefundsTable — DUNCIT TABLE
 * CONTRACT v1). `refunded_at` sorts on the metadata path: the writers store an
 * ISO string, which orders chronologically as text, so it is deliberately NOT
 * offered as a date FILTER (that would coerce the value to a Date and compare
 * it against a string). Callers narrow by date on `created_at`, which is a real
 * Date on the document.
 */
const USER_REFUND_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['payment_id', 'invoice_no', 'user_name', 'user_email'],
  sortFields: {
    payment_id: 'payment_id',
    invoice_no: 'invoice_no',
    user_name: 'user_name',
    user_email: 'user_email',
    description: 'description',
    subtotal: 'subtotal',
    platform_fee_amount: 'platform_fee_amount',
    gst_amount: 'gst_amount',
    total: 'total',
    status: 'status',
    gateway: 'gateway',
    created_at: 'created_at',
    refunded_at: 'metadata.refunded_at',
  },
  // Exactly the filters the table's columns declare — an allowlist wider than
  // the UI is a query surface nobody reviewed.
  filterFields: {
    status: { type: 'enum' },
    gateway: { type: 'string' },
    refund_initiated_by: { path: 'metadata.refund_initiated_by', type: 'string' },
    total: { type: 'number' },
    created_at: { type: 'date' },
  },
  defaultSort: { 'metadata.refunded_at': -1 },
};

const toRefundRow = (p: IPayment) => {
  const meta = (p.metadata ?? {}) as Record<string, unknown>;
  const refunded = Number(meta.refunded_amount);
  return {
    id: String(p._id),
    payment_id: p.payment_id,
    invoice_no: p.invoice_no ?? null,
    user_name: p.user_name,
    user_email: p.user_email,
    description: p.description,
    subtotal: p.subtotal,
    platform_fee_amount: p.platform_fee_amount,
    gst_amount: p.gst_amount,
    total: p.total,
    currency_symbol: p.currency_symbol,
    status: p.status,
    gateway: p.gateway,
    // Every writer stores this already rounded. An admin refund writes no
    // figure at all, because it returns the whole payment.
    refund_amount: Number.isFinite(refunded) ? refunded : p.total,
    refund_reason: (meta.refund_reason as string) || null,
    refund_initiated_by: (meta.refund_initiated_by as string) || null,
    refunded_at: (meta.refunded_at as string) ?? null,
    paid_at: p.paid_at ? p.paid_at.toISOString() : null,
    created_at: p.created_at.toISOString(),
    partial: p.status === 'SUCCESS',
  };
};

export const paymentRefundService = {
  /** Server-side table page for the userRefundsTable query. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IPayment>(
      PaymentModel,
      REFUNDED_ONLY,
      input,
      USER_REFUND_TABLE_CONFIG
    );
    return { rows: docs.map(toRefundRow), total, page, page_size };
  },
};
