import { Types } from 'mongoose';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { ticketService } from '@modules/support/ticket/ticket.service';
import { FailedPaymentCaseModel, type IFailedPaymentCase } from './failedPaymentCase.model';
import { bookingFor } from './failedPayment.booking';
import { listPaymentEvents } from './paymentEvent.service';
import type { Highlight } from './failedPayment.types';

/** Finance's reads: the table, one case in full, and its timeline. */

const iso = (date: Date | null | undefined) => (date ? new Date(date).toISOString() : null);
const orNull = (value: string | null | undefined) => value || null;
const rupees = (paise: number) => Math.round(paise) / 100;

/** The flags behind a row's colour and its action buttons. Pure, for tests. */
export function caseFlags(kase: Pick<IFailedPaymentCase, 'resolution' | 'refund' | 'verification' | 'review' | 'claims'>) {
  const open = kase.resolution.state === 'OPEN';
  const idle = kase.refund.status === '' || kase.refund.status === 'FAILED';
  const approved = kase.review?.decision === 'APPROVED';
  const can_refund = open && idle && (kase.verification.status === 'MATCHED' || approved);
  const needs_review =
    open &&
    idle &&
    !can_refund &&
    (kase.claims?.length ?? 0) > 0 &&
    (kase.verification.status === 'UNMATCHED' || kase.verification.status === 'ERROR');
  const can_mark_not_refundable = open && kase.refund.status === '' && kase.verification.status === 'NOT_CAPTURED';
  let highlight: Highlight = 'NONE';
  if (can_refund) highlight = 'GREEN';
  else if (needs_review) highlight = 'YELLOW';
  return { can_refund, needs_review, can_mark_not_refundable, highlight };
}

const refundStatusOut = (status: string) => status || 'NONE';

const TABLE_CONFIG: TableEntityConfig = {
  searchFields: [
    'user_name',
    'user_phone',
    'user_email',
    'razorpay_payment_id',
    'razorpay_order_id',
    'refund.razorpay_refund_id',
    'ticket_no',
    'payment_id',
  ],
  sortFields: {
    created_at: 'created_at',
    updated_at: 'updated_at',
    amount: 'amount',
    attempts: 'attempts',
    user_name: 'user_name',
  },
  filterFields: {
    verification_status: { path: 'verification.status', type: 'enum' },
    resolution_state: { path: 'resolution.state', type: 'enum' },
    review_decision: { path: 'review.decision', type: 'enum' },
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

/** `refund_status` arrives as NONE|PENDING|PROCESSED|FAILED; NONE is stored as ''. */
function refundStatusFilter(input: TableQueryInput | null | undefined): Record<string, unknown> {
  const filter = input?.filters?.find((f) => f.field === 'refund_status');
  if (!filter) return {};
  const values = (filter.values?.length ? filter.values : [filter.value ?? '']).map((v) => (v === 'NONE' ? '' : String(v)));
  return filter.op === 'ne' ? { 'refund.status': { $nin: values } } : { 'refund.status': { $in: values } };
}

export function toRow(kase: IFailedPaymentCase) {
  return {
    id: String(kase._id),
    payment_doc_id: String(kase.payment_doc_id),
    payment_id: kase.payment_id,
    user_id: kase.user_id ? String(kase.user_id) : null,
    user_name: kase.user_name,
    user_email: orNull(kase.user_email),
    user_phone: orNull(kase.user_phone),
    pod_id: kase.pod_id ? String(kase.pod_id) : null,
    pod_title: kase.pod_title,
    amount: kase.amount,
    currency_symbol: kase.currency_symbol,
    razorpay_payment_id: orNull(kase.razorpay_payment_id),
    razorpay_order_id: orNull(kase.razorpay_order_id),
    error_code: orNull(kase.latest_error?.code),
    error_description: orNull(kase.latest_error?.description),
    attempts: kase.attempts,
    sources: kase.sources,
    claim_count: kase.claims?.length ?? 0,
    ticket_id: kase.ticket_id ? String(kase.ticket_id) : null,
    ticket_no: orNull(kase.ticket_no),
    verification_status: kase.verification.status,
    review_decision: kase.review?.decision ?? null,
    refund_status: refundStatusOut(kase.refund.status),
    refund_amount: kase.refund.amount_paise > 0 ? rupees(kase.refund.amount_paise) : null,
    razorpay_refund_id: orNull(kase.refund.razorpay_refund_id),
    resolution_state: kase.resolution.state,
    ...caseFlags(kase),
    created_at: kase.created_at.toISOString(),
    updated_at: kase.updated_at.toISOString(),
  };
}

export async function failedPaymentsTable(input: TableQueryInput | null | undefined) {
  const query = input ? { ...input, filters: input.filters?.filter((f) => f.field !== 'refund_status') } : input;
  const page = await runTableQuery<IFailedPaymentCase>(FailedPaymentCaseModel, refundStatusFilter(input), query, TABLE_CONFIG, {
    projection: { 'claims.files': 0 },
  });
  return { rows: page.docs.map(toRow), total: page.total, page: page.page, page_size: page.page_size };
}

async function bookingSection(kase: IFailedPaymentCase) {
  const payment = await PaymentModel.findById(kase.payment_doc_id);
  if (!payment) {
    return { exists: false, booked_razorpay_payment_id: null, payment_status: 'UNKNOWN', finalize_state: 'UNKNOWN', needs_refund: false, paid_at: null };
  }
  const booking = await bookingFor(payment);
  return {
    exists: booking.exists,
    booked_razorpay_payment_id: booking.bookedRazorpayPaymentId,
    payment_status: payment.status,
    finalize_state: payment.finalize_state ?? 'NOT_STARTED',
    needs_refund: payment.needs_refund === true,
    paid_at: iso(payment.paid_at),
  };
}

/** One case in full; null when there is no such case. */
async function loadCase(kaseOrId: IFailedPaymentCase | string | null): Promise<IFailedPaymentCase | null> {
  if (typeof kaseOrId !== 'string') return kaseOrId;
  return Types.ObjectId.isValid(kaseOrId) ? FailedPaymentCaseModel.findById(kaseOrId) : null;
}

const errorOut = (error: IFailedPaymentCase['latest_error']) =>
  error
    ? {
        code: orNull(error.code),
        description: orNull(error.description),
        reason: orNull(error.reason),
        source: orNull(error.source),
        step: orNull(error.step),
        reported_by: orNull(error.reported_by),
        at: iso(error.at),
      }
    : null;

export async function failedPaymentDetail(kaseOrId: IFailedPaymentCase | string | null) {
  const kase = await loadCase(kaseOrId);
  if (!kase) return null;
  const [booking, ticket] = await Promise.all([
    bookingSection(kase),
    kase.ticket_id ? ticketService.statusOf(String(kase.ticket_id)) : null,
  ]);
  const v = kase.verification;
  // Known once the check matched a capture and nothing has gone back yet; the
  // refund itself re-reads the live figure from Razorpay.
  const remaining = v.status === 'MATCHED' && v.razorpay_amount && kase.refund.status !== 'PROCESSED' ? rupees(v.razorpay_amount) : null;
  return {
    ...toRow(kase),
    user: { id: kase.user_id ? String(kase.user_id) : null, name: kase.user_name, email: orNull(kase.user_email), phone: orNull(kase.user_phone) },
    booking,
    latest_error: errorOut(kase.latest_error),
    retry_shown: kase.retry_shown,
    claims: (kase.claims ?? []).map((c) => ({
      evidence_type: c.evidence_type,
      transaction_id: orNull(c.transaction_id),
      files: c.files,
      submitted_at: c.submitted_at.toISOString(),
    })),
    verification: {
      status: v.status,
      confidence: v.confidence,
      extracted: v.extracted,
      matched_fields: v.matched_fields ?? [],
      matched_payment_id: orNull(v.matched_payment_id),
      razorpay_status: orNull(v.razorpay_status),
      razorpay_amount_paise: v.razorpay_amount,
      checked_at: iso(v.checked_at),
      notes: orNull(v.notes),
    },
    review: kase.review ? { decision: kase.review.decision, note: kase.review.note, by_name: orNull(kase.review.by_name), at: kase.review.at.toISOString() } : null,
    refund: {
      status: refundStatusOut(kase.refund.status),
      razorpay_refund_id: orNull(kase.refund.razorpay_refund_id),
      razorpay_payment_id: orNull(kase.refund.razorpay_payment_id),
      amount: kase.refund.amount_paise > 0 ? rupees(kase.refund.amount_paise) : null,
      attempted_at: iso(kase.refund.attempted_at),
      refunded_at: iso(kase.refund.refunded_at),
      error: orNull(kase.refund.error),
      initiated_by_name: orNull(kase.refund.initiated_by_name),
    },
    ticket: ticket ? { id: ticket.id, ticket_no: ticket.ticket_no, status: ticket.status } : null,
    resolution: {
      state: kase.resolution.state,
      at: iso(kase.resolution.at),
      by_name: orNull(kase.resolution.by_name),
      note: orNull(kase.resolution.note),
    },
    refundable_amount: remaining,
    revision: kase.revision,
  };
}

/** The case's payment timeline, oldest first, as key/value details. */
export async function failedPaymentEvents(caseId: string) {
  if (!Types.ObjectId.isValid(caseId)) return [];
  const kase = await FailedPaymentCaseModel.findById(caseId).select('payment_doc_id').lean();
  if (!kase) return [];
  const events = await listPaymentEvents(kase.payment_doc_id);
  return events.map((e) => ({
    id: String(e._id),
    type: e.type,
    source: e.source,
    actor_name: e.actor?.name || null,
    details: Object.entries(e.data ?? {})
      .filter(([, value]) => value !== null && value !== '')
      .map(([key, value]) => ({ key, value: String(value) })),
    created_at: new Date(e.created_at).toISOString(),
  }));
}
