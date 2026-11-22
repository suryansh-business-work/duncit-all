import crypto from 'node:crypto';
import { logs } from '@observability/log';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { fetchRazorpayOrderPayments, type RazorpayPaymentSummary } from '@modules/finance/payment/razorpay.gateway';
import { FailedPaymentCaseModel, type ICaseClaim, type IFailedPaymentCase } from './failedPaymentCase.model';
import { extractFromImages, type ExtractResult } from './failedPayment.ai';
import { matchEvidence, rupeesToPaise } from './failedPayment.match';
import { bookingFor } from './failedPayment.booking';
import { recordPaymentEvent } from './paymentEvent.service';
import type { ActorSnapshot } from './failedPayment.types';

/**
 * The check that runs after every claim (and again when Finance asks): read the
 * evidence, ask Razorpay what really happened on the case's order, and apply
 * `matchEvidence`. PDFs always go to a person (user decision); a transaction id
 * skips the AI; an AI that is off or failing leaves the case UNMATCHED.
 *
 * Runs are tagged with a run id and a result is only written while it is still
 * the latest run, so a slow, older run can never overwrite a newer verdict.
 */

const MANUAL_REVIEW_NOTE = 'Manual review: bank statement PDFs are always checked by a person.';

interface Verdict {
  status: 'MATCHED' | 'UNMATCHED' | 'NOT_CAPTURED' | 'ERROR';
  confidence: number | null;
  extracted: IFailedPaymentCase['verification']['extracted'];
  matched_fields: string[];
  matched_payment_id: string;
  razorpay_status: string;
  razorpay_amount: number | null;
  notes: string;
}

const emptyVerdict = (status: Verdict['status'], notes: string): Verdict => ({
  status,
  confidence: null,
  extracted: null,
  matched_fields: [],
  matched_payment_id: '',
  razorpay_status: '',
  razorpay_amount: null,
  notes,
});

async function readEvidence(kase: IFailedPaymentCase, claim: ICaseClaim): Promise<ExtractResult | null> {
  if (claim.evidence_type === 'TRANSACTION_ID') return null;
  return extractFromImages({
    files: claim.files,
    evidenceType: claim.evidence_type,
    amountLabel: `${kase.currency_symbol}${kase.amount.toFixed(2)}`,
    caseId: String(kase._id),
  });
}

/** The verdict for the case's latest claim. Never throws: a failure is an ERROR verdict. */
async function decide(kase: IFailedPaymentCase): Promise<Verdict> {
  const claim = kase.claims.at(-1);
  if (!claim) return emptyVerdict('UNMATCHED', 'No evidence has been submitted.');
  if (claim.files.some((f) => f.kind === 'PDF')) return emptyVerdict('UNMATCHED', MANUAL_REVIEW_NOTE);
  const payment = await PaymentModel.findById(kase.payment_doc_id);
  if (!payment || !kase.razorpay_order_id) return emptyVerdict('UNMATCHED', 'The payment has no Razorpay order to check.');

  const read = await readEvidence(kase, claim);
  if (read && !read.ok) return emptyVerdict('UNMATCHED', read.reason);
  const extracted = read?.ok ? read.extracted : null;
  const claimedIds = [claim.transaction_id, extracted?.payment_id ?? '', extracted?.utr ?? ''];

  let orderPayments: RazorpayPaymentSummary[];
  try {
    orderPayments = await fetchRazorpayOrderPayments(kase.razorpay_order_id, payment.metadata?.razorpay_account);
  } catch (error) {
    return { ...emptyVerdict('ERROR', `Razorpay could not be reached: ${(error as Error).message}`.slice(0, 500)), extracted };
  }
  const booking = await bookingFor(payment);
  const result = matchEvidence({
    claimedIds,
    orderPayments,
    expectedAmountPaise: Math.round((payment.total ?? 0) * 100),
    extractedAmountPaise: rupeesToPaise(extracted?.amount ?? null),
    bookingExists: booking.exists,
    bookedRazorpayPaymentId: booking.bookedRazorpayPaymentId,
  });
  return {
    status: result.status,
    confidence: read?.ok ? read.confidence : 1,
    extracted,
    matched_fields: result.matchedFields,
    matched_payment_id: result.matchedPaymentId,
    razorpay_status: result.razorpayStatus,
    razorpay_amount: result.razorpayAmount,
    notes: result.notes,
  };
}

/**
 * Run the check now. Answers the case as saved afterwards (or as it stood if a
 * newer run took over). A case whose refund is under way or done is left alone.
 */
export async function runVerification(caseId: string, actor: ActorSnapshot | null = null): Promise<IFailedPaymentCase | null> {
  const runId = crypto.randomUUID();
  const kase = await FailedPaymentCaseModel.findOneAndUpdate(
    { _id: caseId, 'refund.status': { $in: ['', 'FAILED'] } },
    { $set: { 'verification.status': 'PENDING', 'verification.run_id': runId }, $inc: { revision: 1 } },
    { new: true }
  );
  if (!kase) return FailedPaymentCaseModel.findById(caseId);

  let verdict: Verdict;
  try {
    verdict = await decide(kase);
  } catch (error) {
    logs.server.error('failedPayment', 'runVerification', { error, case_id: caseId });
    verdict = emptyVerdict('ERROR', 'The check failed unexpectedly; run it again.');
  }
  const saved = await FailedPaymentCaseModel.findOneAndUpdate(
    { _id: caseId, 'verification.run_id': runId },
    {
      $set: {
        verification: { ...verdict, run_id: runId, checked_at: new Date() },
      },
      $inc: { revision: 1 },
    },
    { new: true }
  );
  if (!saved) return FailedPaymentCaseModel.findById(caseId);
  await recordPaymentEvent({
    paymentDocId: saved.payment_doc_id,
    caseId: saved._id,
    type: 'EVIDENCE_VERIFIED',
    source: actor ? 'FINANCE' : 'SYSTEM',
    actor,
    data: {
      status: verdict.status,
      matched_payment_id: verdict.matched_payment_id,
      razorpay_status: verdict.razorpay_status,
      matched_fields: verdict.matched_fields.join(','),
      notes: verdict.notes,
    },
  });
  return saved;
}

/** Fire-and-forget after a claim: the buyer's request never waits on OpenAI or Razorpay. */
export function verifyInBackground(caseId: string): void {
  runVerification(caseId).catch((error: unknown) =>
    logs.server.error('failedPayment', 'verifyInBackground', { error, case_id: caseId })
  );
}
