import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { openaiChat } from '@services/openai/openai.client';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { paymentSourceOf } from '@modules/finance/payment/payment.source';
import { FailedPaymentCaseModel, type IFailedPaymentCase } from './failedPaymentCase.model';
import type { ICaseAiSummary } from './failedPaymentAiSummary.model';
import { bookingFor } from './failedPayment.booking';
import { refundPreviewFor, type RefundPreview } from './failedPayment.refundPreview';
import { constrainRecommendation, parseAiSummary, summaryFacts, type BookingFacts } from './failedPayment.aiSummary.parse';
import type { ActorSnapshot } from './failedPayment.types';

/**
 * A short AI note on one failed payment: refund, do not refund, or look closer,
 * and why (AI feature `finance.failed_payment_summary`).
 *
 * It is advice for the person deciding and never moves money. The model reads
 * the case's recorded facts plus Razorpay's live refund check, never any
 * personal data, and the code overrules it if it suggests a refund Razorpay
 * just refused. The note is cached on the case per revision: asking again for
 * an unchanged case answers from the cache, so opening a page costs nothing.
 * Every failure (feature off, no key, outage, unreadable answer) is stored as
 * the note's error, shown to Finance with a retry.
 */

async function facts(kase: IFailedPaymentCase, preview: RefundPreview) {
  const payment = await PaymentModel.findById(kase.payment_doc_id);
  let booking: BookingFacts | null = null;
  if (payment) {
    const found = await bookingFor(payment);
    booking = {
      exists: found.exists,
      payment_status: payment.status,
      finalize_state: payment.finalize_state ?? 'NOT_STARTED',
      needs_refund: payment.needs_refund === true,
    };
  }
  return summaryFacts({ kase, source: payment ? paymentSourceOf(payment) : null, booking, preview });
}

type Note = Pick<ICaseAiSummary, 'recommendation' | 'summary' | 'reasons' | 'error'>;

const failed = (error: string): Note => ({ recommendation: '', summary: '', reasons: [], error: error.slice(0, 500) });

async function askModel(kase: IFailedPaymentCase): Promise<Note> {
  const preview = await refundPreviewFor(kase);
  const prompt = await resolvePrompt('finance.failed_payment_summary', {
    facts: JSON.stringify(await facts(kase, preview)),
  });
  const res = await openaiChat({
    task: 'finance.failed_payment_summary',
    detail: `case:${String(kase._id)}`,
    model: prompt.model || undefined,
    temperature: 0,
    max_tokens: 400,
    json: true,
    messages: [{ role: 'system', content: prompt.content }],
  });
  if (!res.ok) return failed(res.message || `The AI is unavailable (${res.code}).`);
  const parsed = parseAiSummary(res.content);
  if (!parsed) return failed('The AI answer could not be read. Try again.');
  return { ...constrainRecommendation(parsed, preview), error: '' };
}

/** The case with a fresh (or still current) note. `force` asks again even when the cached note is current. */
export async function summarizeFailedPayment(caseId: string, actor: ActorSnapshot, force: boolean): Promise<IFailedPaymentCase> {
  const kase = await FailedPaymentCaseModel.findById(caseId);
  if (!kase) throw new GraphQLError('Failed payment not found', { extensions: { code: 'NOT_FOUND' } });
  const cached = kase.ai_summary;
  if (!force && cached && !cached.error && cached.case_revision === kase.revision) return kase;

  let note: Note;
  try {
    note = await askModel(kase);
  } catch (error) {
    logs.server.error('failedPayment', 'aiSummary', { error, case_id: caseId });
    note = failed('The AI note could not be written. Try again.');
  }
  const ai_summary: ICaseAiSummary = { ...note, case_revision: kase.revision, generated_at: new Date(), generated_by_name: actor.name };
  // The note is advice, not a change to the case: it neither bumps the revision
  // nor the updated time, so it can never make itself (or the row) look newer.
  await FailedPaymentCaseModel.updateOne({ _id: kase._id }, { $set: { ai_summary } }, { timestamps: false });
  kase.ai_summary = ai_summary;
  return kase;
}
