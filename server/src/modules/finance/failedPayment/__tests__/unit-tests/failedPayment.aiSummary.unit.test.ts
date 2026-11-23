/**
 * The AI refund note service: cache per case revision, the model call, and
 * every failure stored on the note instead of thrown.
 */
jest.mock('../../failedPaymentCase.model', () => ({
  FailedPaymentCaseModel: { findById: jest.fn(), updateOne: jest.fn() },
}));
jest.mock('@modules/finance/payment/payment.model', () => ({ PaymentModel: { findById: jest.fn() } }));
jest.mock('../../failedPayment.booking', () => ({ bookingFor: jest.fn() }));
jest.mock('../../failedPayment.refundPreview', () => ({ refundPreviewFor: jest.fn() }));
jest.mock('@services/openai/openai.client', () => ({ openaiChat: jest.fn() }));
jest.mock('@modules/ai/prompt/prompt.service', () => ({ resolvePrompt: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { error: jest.fn() } } }));

import { FailedPaymentCaseModel } from '../../failedPaymentCase.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { bookingFor } from '../../failedPayment.booking';
import { refundPreviewFor } from '../../failedPayment.refundPreview';
import { openaiChat } from '@services/openai/openai.client';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { summarizeFailedPayment } from '../../failedPayment.aiSummary';

const m = (fn: unknown) => fn as jest.Mock;
const CASE_ID = '65aa00000000000000000001';
const actor = { id: 'u1', name: 'Fin Reader', roles: ['FINANCE_USER'] };

const kase = (over: Record<string, unknown> = {}) => ({
  _id: CASE_ID,
  payment_doc_id: '65aa00000000000000000002',
  amount: 499,
  currency_symbol: '₹',
  sources: ['FINALIZE_FAILED'],
  latest_error: null,
  attempts: 0,
  retry_shown: false,
  claims: [],
  verification: { status: 'PENDING', notes: '', razorpay_status: '', matched_fields: [] },
  review: null,
  refund: { status: '', attempts: 0, error: '' },
  resolution: { state: 'OPEN' },
  created_at: new Date('2026-11-22T00:00:00Z'),
  revision: 4,
  ai_summary: null as unknown,
  ...over,
});

const answer = (content: unknown) => ({ ok: true, content: JSON.stringify(content), model: 'gpt-4o-mini', usage: {} });

beforeEach(() => {
  jest.clearAllMocks();
  m(PaymentModel.findById).mockResolvedValue({ status: 'FAILED', finalize_state: 'FAILED', needs_refund: true, target_type: 'POD', metadata: {} });
  m(bookingFor).mockResolvedValue({ exists: false, bookedRazorpayPaymentId: null });
  m(refundPreviewFor).mockResolvedValue({ refundable: true, amount: 499, razorpay_payment_id: 'pay_1', reason: null });
  m(resolvePrompt).mockResolvedValue({ content: 'PROMPT', model: 'gpt-4o-mini' });
  m(FailedPaymentCaseModel.updateOne).mockResolvedValue({ modifiedCount: 1 });
});

const savedNote = () => m(FailedPaymentCaseModel.updateOne).mock.calls[0][1].$set.ai_summary;

describe('summarizeFailedPayment', () => {
  it('asks the model with the case facts and stores its note for this revision, without touching the case\'s revision or time', async () => {
    m(FailedPaymentCaseModel.findById).mockResolvedValue(kase());
    m(openaiChat).mockResolvedValue(answer({ recommendation: 'REFUND', summary: 'Captured, pod full.', reasons: ['Pod is full'] }));

    const out = await summarizeFailedPayment(CASE_ID, actor, false);

    const facts = JSON.parse(m(resolvePrompt).mock.calls[0][1].facts);
    expect(m(resolvePrompt).mock.calls[0][0]).toBe('finance.failed_payment_summary');
    expect(facts).toMatchObject({ checkout: 'POD_BOOKING', live_razorpay_check: { refundable: true } });
    expect(m(openaiChat).mock.calls[0][0]).toMatchObject({ task: 'finance.failed_payment_summary', json: true, temperature: 0, detail: `case:${CASE_ID}` });
    expect(savedNote()).toMatchObject({ recommendation: 'REFUND', summary: 'Captured, pod full.', reasons: ['Pod is full'], error: '', case_revision: 4, generated_by_name: 'Fin Reader' });
    expect(m(FailedPaymentCaseModel.updateOne).mock.calls[0][2]).toEqual({ timestamps: false });
    expect(m(FailedPaymentCaseModel.updateOne).mock.calls[0][1].$inc).toBeUndefined();
    expect(out.ai_summary).toMatchObject({ recommendation: 'REFUND' });
  });

  it('answers from the cached note of an unchanged case without calling the AI', async () => {
    const cached = { recommendation: 'DO_NOT_REFUND', summary: 'x', reasons: [], error: '', case_revision: 4 };
    m(FailedPaymentCaseModel.findById).mockResolvedValue(kase({ ai_summary: cached }));
    const out = await summarizeFailedPayment(CASE_ID, actor, false);
    expect(openaiChat).not.toHaveBeenCalled();
    expect(FailedPaymentCaseModel.updateOne).not.toHaveBeenCalled();
    expect(out.ai_summary).toBe(cached);
  });

  it('asks again for a stale note, a failed one, or when forced', async () => {
    m(openaiChat).mockResolvedValue(answer({ recommendation: 'NEEDS_REVIEW', summary: 'Look closer.', reasons: [] }));
    for (const [note, force] of [
      [{ recommendation: 'REFUND', error: '', case_revision: 3 }, false],
      [{ recommendation: '', error: 'AI off', case_revision: 4 }, false],
      [{ recommendation: 'REFUND', error: '', case_revision: 4 }, true],
    ] as const) {
      m(FailedPaymentCaseModel.findById).mockResolvedValue(kase({ ai_summary: note }));
      await summarizeFailedPayment(CASE_ID, actor, force);
    }
    expect(openaiChat).toHaveBeenCalledTimes(3);
  });

  it('overrules a refund suggestion Razorpay just refused', async () => {
    m(FailedPaymentCaseModel.findById).mockResolvedValue(kase());
    m(refundPreviewFor).mockResolvedValue({ refundable: false, amount: null, razorpay_payment_id: null, reason: 'Not captured.' });
    m(openaiChat).mockResolvedValue(answer({ recommendation: 'REFUND', summary: 'Refund it.', reasons: [] }));
    await summarizeFailedPayment(CASE_ID, actor, false);
    expect(savedNote().recommendation).toBe('NEEDS_REVIEW');
  });

  it('stores the AI outage as the note\'s error', async () => {
    m(FailedPaymentCaseModel.findById).mockResolvedValue(kase());
    m(openaiChat).mockResolvedValue({ ok: false, code: 'DISABLED', status: 0, message: 'The AI feature is switched off.', model: '' });
    await summarizeFailedPayment(CASE_ID, actor, false);
    expect(savedNote()).toMatchObject({ recommendation: '', summary: '', error: 'The AI feature is switched off.' });
  });

  it('stores an unreadable answer as an error', async () => {
    m(FailedPaymentCaseModel.findById).mockResolvedValue(kase());
    m(openaiChat).mockResolvedValue({ ok: true, content: 'Refund!', model: 'x', usage: {} });
    await summarizeFailedPayment(CASE_ID, actor, false);
    expect(savedNote().error).toBe('The AI answer could not be read. Try again.');
  });

  it('stores an unexpected failure as an error instead of throwing', async () => {
    m(FailedPaymentCaseModel.findById).mockResolvedValue(kase());
    m(resolvePrompt).mockRejectedValue(new Error('db down'));
    await expect(summarizeFailedPayment(CASE_ID, actor, false)).resolves.toBeTruthy();
    expect(savedNote().error).toBe('The AI note could not be written. Try again.');
  });

  it('describes a case whose payment is gone as an unknown checkout with no booking', async () => {
    m(FailedPaymentCaseModel.findById).mockResolvedValue(kase());
    m(PaymentModel.findById).mockResolvedValue(null);
    m(openaiChat).mockResolvedValue(answer({ recommendation: 'NEEDS_REVIEW', summary: 'Payment missing.', reasons: [] }));
    await summarizeFailedPayment(CASE_ID, actor, false);
    expect(JSON.parse(m(resolvePrompt).mock.calls[0][1].facts)).toMatchObject({ checkout: 'UNKNOWN', booking: null });
    expect(bookingFor).not.toHaveBeenCalled();
  });

  it('refuses an unknown case with NOT_FOUND', async () => {
    m(FailedPaymentCaseModel.findById).mockResolvedValue(null);
    await expect(summarizeFailedPayment(CASE_ID, actor, false)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });
});
