/**
 * Sending a pod payment's refund back through Razorpay — at most once.
 *
 * The flows that give money back (a pod cancellation and the release of a held
 * cancellation refund, a Finance refund, a Backout whose seat was filled)
 * record the refund on the payment as before; each now also QUEUES one
 * PaymentGatewayRefund here, inside the same request — the outbox — and this
 * module sends it:
 *  1. queue: one record per business event (unique idempotency key). A
 *     repeated cancellation finds the record that exists and adds nothing.
 *  2. claim: one conditional write moves it to SENDING, so two workers (the
 *     sweep and an immediate send) cannot both send it.
 *  3. adopt before send: Razorpay's refund call has no idempotency key, so the
 *     payment's refunds are listed first and one of ours (receipt
 *     `dr_<record>_n`) still alive is adopted — a crash between sending and
 *     recording can never send twice.
 *  4. follow: `processed` → SUCCEEDED; `pending` → PROCESSING until the
 *     `refund.processed` / `refund.failed` webhook or the sweep's poll says;
 *     an error → FAILED and retried with back-off, then
 *     RECONCILIATION_REQUIRED for Finance once the retries are used up.
 * A payment with no Razorpay money (test gateway, offline) is NOT_APPLICABLE:
 * recorded, never sent. Every step lands on the payment's own timeline.
 */
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { startClusterJob } from '@utils/clusterJob';
import { isDuplicateKeyError } from '@utils/mongo-error';
import { PaymentModel, type IPayment } from './payment.model';
import { razorpayPaymentIdOf } from './payment.gatewayIds';
import { createRazorpayRefund, listRazorpayRefunds, type RazorpayRefund } from './razorpay.gateway';
import { recordPaymentEvent } from '@modules/finance/failedPayment/paymentEvent.service';
import {
  PaymentGatewayRefundModel,
  type GatewayRefundSource,
  type GatewayRefundStatus,
  type IPaymentGatewayRefund,
} from './payment.gatewayRefund.model';

/** Sends before a refund is left to Finance (RECONCILIATION_REQUIRED). */
export const GATEWAY_REFUND_MAX_ATTEMPTS = 5;
/** A SENDING claim older than this was abandoned by a crash and may be taken again. */
const STALE_CLAIM_MS = 10 * 60_000;
/** How long a PROCESSING refund waits for the webhook before the sweep asks Razorpay. */
const POLL_AFTER_MS = 15 * 60_000;
const SWEEP_BATCH = 50;

type RefundPayment = Pick<IPayment, '_id' | 'payment_id' | 'pod_id' | 'user_id' | 'gateway' | 'gateway_ref' | 'metadata'>;

export const receiptPrefixOf = (refundId: unknown) => `dr_${String(refundId)}`;

/** Minutes to wait before attempt `n` (1-based): 2, 4, 8, 16 … capped at a day. */
const backoffMs = (attempt: number) => Math.min(24 * 60, 2 ** Math.max(1, attempt)) * 60_000;

const accountOf = (payment: RefundPayment) => {
  const account = payment.metadata?.razorpay_account;
  return typeof account === 'string' && account ? account : null;
};

/** What Razorpay's refund status means for our record. */
function statusFromRazorpay(status: string): GatewayRefundStatus {
  if (status === 'processed') return 'SUCCEEDED';
  if (status === 'failed') return 'FAILED';
  return 'PROCESSING';
}

/** The payment shows its latest refund's progress, and the refund id searches it. */
async function mirrorOnPayment(record: IPaymentGatewayRefund) {
  const set = {
    'metadata.refund_gateway_status': record.status,
    'metadata.refund_gateway_updated_at': new Date().toISOString(),
  };
  await PaymentModel.updateOne(
    { _id: record.payment_doc_id },
    record.razorpay_refund_id
      ? { $set: set, $addToSet: { 'metadata.razorpay_refund_ids': record.razorpay_refund_id } }
      : { $set: set }
  );
}

/**
 * A rented item's refund tells its booking what happened. Imported lazily: the
 * rental module imports this one to queue its refunds. A booking that could not
 * be updated is logged, never allowed to undo the refund's own record.
 */
async function followOnBooking(record: IPaymentGatewayRefund) {
  if (record.source !== 'RENTAL') return;
  try {
    const { syncRentalRefund } = await import('@modules/venues/venueRental/rentalRefund.service');
    await syncRentalRefund(record);
  } catch (error) {
    logs.server.error('payment', 'gatewayRefund', { error, gateway_refund_id: String(record._id), msg: 'rental booking sync failed' });
  }
}

const EVENT_OF: Partial<Record<GatewayRefundStatus, 'REFUND_INITIATED' | 'REFUND_PROCESSED' | 'REFUND_FAILED'>> = {
  PROCESSING: 'REFUND_INITIATED',
  SUCCEEDED: 'REFUND_PROCESSED',
  FAILED: 'REFUND_FAILED',
  RECONCILIATION_REQUIRED: 'REFUND_FAILED',
};

async function recordStep(record: IPaymentGatewayRefund, source: 'SERVER' | 'WEBHOOK' | 'SYSTEM') {
  const type = EVENT_OF[record.status];
  if (!type) return;
  await recordPaymentEvent({
    paymentDocId: record.payment_doc_id,
    type,
    source,
    data: {
      gateway_refund_id: String(record._id),
      razorpay_refund_id: record.razorpay_refund_id,
      amount_paise: record.amount_paise,
      status: record.status,
      error: record.last_error || undefined,
    },
    // One row per state per refund, however many times a webhook redelivers it.
    dedupeKey: `gateway_refund:${String(record._id)}:${record.status}:${record.attempts}`,
  });
}

/**
 * Record one refund to send. Returns the record — the existing one when the
 * same business event already queued it — or null when there is nothing to
 * send (zero amount).
 */
export async function queueGatewayRefund(input: {
  payment: RefundPayment;
  amount: number;
  key: string;
  source: GatewayRefundSource;
  reason: string;
  initiatedBy: string;
  initiatorId?: string | null;
}): Promise<IPaymentGatewayRefund | null> {
  const amountPaise = Math.round((Number(input.amount) || 0) * 100);
  if (amountPaise <= 0) return null;
  const viaRazorpay = input.payment.gateway === 'RAZORPAY';
  const razorpayPaymentId = viaRazorpay ? razorpayPaymentIdOf(input.payment) : '';
  // Razorpay holds money we cannot name a payment for: Finance must find it,
  // never a silent "nothing to send".
  let status: GatewayRefundStatus = 'NOT_APPLICABLE';
  if (razorpayPaymentId) status = 'QUEUED';
  else if (viaRazorpay) status = 'RECONCILIATION_REQUIRED';
  const fields = {
    idempotency_key: input.key,
    payment_doc_id: input.payment._id,
    payment_id: input.payment.payment_id ?? '',
    pod_id: input.payment.pod_id ?? null,
    user_id: input.payment.user_id ?? null,
    source: input.source,
    reason: (input.reason ?? '').slice(0, 500),
    amount_paise: amountPaise,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_account: accountOf(input.payment),
    status,
    last_error: status === 'RECONCILIATION_REQUIRED' ? 'No Razorpay payment id is recorded on this payment.' : '',
    next_attempt_at: status === 'QUEUED' ? new Date() : null,
    initiated_by: input.initiatedBy,
    initiator_id: input.initiatorId ?? '',
  };
  let record: IPaymentGatewayRefund | null;
  try {
    record = await PaymentGatewayRefundModel.findOneAndUpdate(
      { idempotency_key: input.key },
      { $setOnInsert: fields },
      { upsert: true, new: true }
    );
  } catch (error) {
    // Two cancels racing on one payment: the loser reads the winner's record.
    if (!isDuplicateKeyError(error)) throw error;
    record = await PaymentGatewayRefundModel.findOne({ idempotency_key: input.key });
  }
  if (record) await mirrorOnPayment(record);
  return record;
}

/** Record what Razorpay answered about one of our refunds. */
export async function applyRazorpayRefund(
  recordId: Types.ObjectId | string,
  refund: RazorpayRefund,
  source: 'SERVER' | 'WEBHOOK' | 'SYSTEM'
): Promise<IPaymentGatewayRefund | null> {
  const status = statusFromRazorpay(refund.status);
  const now = new Date();
  const record = await PaymentGatewayRefundModel.findOneAndUpdate(
    // A late report never undoes a refund already known to have reached the bank.
    { _id: recordId, status: { $ne: 'SUCCEEDED' } },
    {
      $set: {
        status,
        razorpay_refund_id: refund.id,
        razorpay_status: refund.status,
        requested_at: now,
        ...(status === 'SUCCEEDED' ? { processed_at: now, next_attempt_at: null } : {}),
        ...(status === 'FAILED' ? { last_error: 'Razorpay marked the refund failed.', next_attempt_at: now } : {}),
        ...(status === 'PROCESSING' ? { next_attempt_at: new Date(now.getTime() + POLL_AFTER_MS) } : {}),
      },
    },
    { new: true }
  );
  if (!record) return PaymentGatewayRefundModel.findById(recordId);
  await mirrorOnPayment(record);
  await recordStep(record, source);
  await followOnBooking(record);
  return record;
}

/** A send that threw: retried later with back-off, or handed to Finance once the retries are used up. */
async function failSend(record: IPaymentGatewayRefund, error: unknown) {
  const exhausted = record.attempts >= GATEWAY_REFUND_MAX_ATTEMPTS;
  const message = error instanceof Error ? error.message : String(error);
  const failed = await PaymentGatewayRefundModel.findOneAndUpdate(
    { _id: record._id, status: 'SENDING' },
    {
      $set: {
        status: exhausted ? 'RECONCILIATION_REQUIRED' : 'FAILED',
        last_error: message.slice(0, 500),
        next_attempt_at: exhausted ? null : new Date(Date.now() + backoffMs(record.attempts)),
      },
    },
    { new: true }
  );
  logs.server.warn('payment', 'gatewayRefund', {
    error,
    gateway_refund_id: String(record._id),
    payment_id: record.payment_id,
    attempt: record.attempts,
    msg: exhausted ? 'refund retries used up — reconciliation required' : 'refund send failed — will retry',
  });
  if (failed) {
    await mirrorOnPayment(failed);
    await recordStep(failed, 'SERVER');
    await followOnBooking(failed);
  }
  return failed;
}

/**
 * Claim one queued (or retryable) refund and send it. Answers the record as it
 * now stands; a refund another worker holds, or one already finished, comes
 * back untouched.
 */
export async function processGatewayRefund(recordId: Types.ObjectId | string): Promise<IPaymentGatewayRefund | null> {
  const now = new Date();
  const claimed = await PaymentGatewayRefundModel.findOneAndUpdate(
    {
      _id: recordId,
      $or: [
        { status: { $in: ['QUEUED', 'FAILED'] }, attempts: { $lt: GATEWAY_REFUND_MAX_ATTEMPTS } },
        { status: 'SENDING', claimed_at: { $lt: new Date(now.getTime() - STALE_CLAIM_MS) } },
      ],
    },
    { $set: { status: 'SENDING', claimed_at: now }, $inc: { attempts: 1 } },
    { new: true }
  );
  if (!claimed) return PaymentGatewayRefundModel.findById(recordId);
  try {
    const prefix = receiptPrefixOf(claimed._id);
    const live = (await listRazorpayRefunds(claimed.razorpay_payment_id, claimed.razorpay_account)).find(
      (refund) => refund.receipt.startsWith(prefix) && refund.status !== 'failed'
    );
    const refund =
      live ??
      (await createRazorpayRefund({
        paymentId: claimed.razorpay_payment_id,
        amountPaise: claimed.amount_paise,
        receipt: `${prefix}_${claimed.attempts}`,
        notes: { payment_id: claimed.payment_id, source: claimed.source, gateway_refund_id: String(claimed._id) },
        account: claimed.razorpay_account,
      }));
    return await applyRazorpayRefund(claimed._id, refund, 'SERVER');
  } catch (error) {
    return failSend(claimed, error);
  }
}

/**
 * Finance pressed Refund on a refund that is stuck: put it back in the queue
 * and send it now. A refund whose retries are used up (RECONCILIATION_REQUIRED,
 * or a FAILED one the webhook marked after the last attempt) gets a fresh set of
 * attempts; one with attempts left is sent as it stands. Nothing is ever sent
 * twice — the claim in `processGatewayRefund` still lets one worker through, and
 * its look-up by receipt adopts any refund that already reached Razorpay. A
 * refund with no Razorpay payment id is left alone: there is nothing to send it
 * against, and only a person at the Razorpay dashboard can settle it.
 */
export async function retryGatewayRefund(recordId: Types.ObjectId | string): Promise<IPaymentGatewayRefund | null> {
  await PaymentGatewayRefundModel.updateOne(
    {
      _id: recordId,
      status: { $in: ['FAILED', 'RECONCILIATION_REQUIRED'] },
      attempts: { $gte: GATEWAY_REFUND_MAX_ATTEMPTS },
      razorpay_payment_id: { $ne: '' },
    },
    { $set: { status: 'QUEUED', attempts: 0, last_error: '', next_attempt_at: new Date() } }
  );
  return processGatewayRefund(recordId);
}

/**
 * Send what was just queued, without making the caller wait for Razorpay. Not
 * under NODE_ENV=test — the same rule the background jobs follow, so a suite
 * never reaches Razorpay; tests call processGatewayRefund themselves. A send
 * that dies here is the sweep's to finish.
 */
export function sendSoon(records: ReadonlyArray<IPaymentGatewayRefund | null>): void {
  if (process.env.NODE_ENV === 'test') return;
  for (const record of records) {
    if (record?.status !== 'QUEUED') continue;
    processGatewayRefund(record._id).catch((error: unknown) =>
      logs.server.error('payment', 'gatewayRefund', { error, gateway_refund_id: String(record._id), msg: 'immediate send failed' })
    );
  }
}

/** Ask Razorpay where a PROCESSING refund has got to — the webhook's backstop. */
async function pollProcessing(record: IPaymentGatewayRefund) {
  const refunds = await listRazorpayRefunds(record.razorpay_payment_id, record.razorpay_account);
  const ours = refunds.find((refund) => refund.id === record.razorpay_refund_id);
  if (ours) return applyRazorpayRefund(record._id, ours, 'SYSTEM');
  await PaymentGatewayRefundModel.updateOne(
    { _id: record._id, status: 'PROCESSING' },
    { $set: { next_attempt_at: new Date(Date.now() + POLL_AFTER_MS) } }
  );
  return record;
}

/** One sweep: send what is due, and ask Razorpay about refunds the webhook never confirmed. */
export async function runGatewayRefundSweep(now = new Date()): Promise<number> {
  const due = await PaymentGatewayRefundModel.find({
    $or: [
      { status: { $in: ['QUEUED', 'FAILED'] }, next_attempt_at: { $lte: now } },
      { status: 'SENDING', claimed_at: { $lt: new Date(now.getTime() - STALE_CLAIM_MS) } },
      { status: 'PROCESSING', next_attempt_at: { $lte: now } },
    ],
  })
    .sort({ next_attempt_at: 1 })
    .limit(SWEEP_BATCH);
  for (const record of due) {
    // One unreachable payment must not hold back the rest of the batch.
    const step = record.status === 'PROCESSING' ? pollProcessing(record) : processGatewayRefund(record._id);
    await step.catch((error: unknown) =>
      logs.server.error('payment', 'gatewayRefundSweep', { error, gateway_refund_id: String(record._id) })
    );
  }
  return due.length;
}

/** Start the refund sweep: every 3 minutes, first run 2 minutes after boot (no-op under NODE_ENV=test). */
export function startGatewayRefundSweep(): void {
  startClusterJob({
    component: 'payment-gateway-refunds',
    operation: 'sweep',
    firstDelayMs: 2 * 60_000,
    intervalMs: 3 * 60_000,
    run: () => runGatewayRefundSweep(),
  });
}

/** A refund's state as the apps and consoles read it (PaymentRefundStatus). */
export type PublicRefundStatus =
  | 'REQUESTED'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'RECONCILIATION_REQUIRED'
  | 'NOT_APPLICABLE';

/**
 * The payment's latest refund state, from the mirror this module writes; null
 * when no refund was ever sent through here (every payment before it, and
 * payments never refunded). Queued and in-flight read the same to a buyer.
 */
export function publicRefundStatus(metadata: Record<string, unknown> | null | undefined): PublicRefundStatus | null {
  const status = metadata?.refund_gateway_status;
  if (status === 'QUEUED' || status === 'SENDING') return 'REQUESTED';
  return isPassedThrough(status) ? status : null;
}

const PASSED_THROUGH = ['PROCESSING', 'SUCCEEDED', 'FAILED', 'RECONCILIATION_REQUIRED', 'NOT_APPLICABLE'] as const;
const isPassedThrough = (status: unknown): status is (typeof PASSED_THROUGH)[number] =>
  typeof status === 'string' && (PASSED_THROUGH as readonly string[]).includes(status);

/** The refund record a Razorpay refund belongs to: by our receipt, else by its refund id. */
export async function gatewayRefundForRazorpay(refund: { id?: string; receipt?: string }) {
  const match = /^dr_([a-f\d]{24})(?:_\d+)?$/i.exec(refund.receipt ?? '');
  if (match) return PaymentGatewayRefundModel.findById(match[1]);
  return refund.id ? PaymentGatewayRefundModel.findOne({ razorpay_refund_id: refund.id }) : null;
}
