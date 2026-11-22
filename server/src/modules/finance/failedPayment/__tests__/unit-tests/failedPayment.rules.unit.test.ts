/**
 * The small pure rules around the workflow: what the event trail may store,
 * which colour and actions a case gets, how the AI's answer is read, and the
 * input validation the apps show verbatim.
 */
// Pure functions only; the modules they live in reach for these at call time.
jest.mock('@modules/support/ticket/ticket.service', () => ({ ticketService: {} }));
jest.mock('../../failedPayment.booking', () => ({ bookingFor: jest.fn() }));
jest.mock('@services/openai/openai.client', () => ({ openaiChat: jest.fn() }));
jest.mock('@modules/ai/prompt/prompt.service', () => ({ resolvePrompt: jest.fn() }));
jest.mock('@modules/platform/upload/privateMedia', () => ({ signedPrivateUrl: jest.fn() }));

import { sanitizeEventData } from '../../paymentEvent.service';
import { caseFlags } from '../../failedPayment.read';
import { parseExtraction } from '../../failedPayment.ai';
import {
  PAYMENT_TRANSACTION_ID_REGEX,
  parseInput,
  reviewSchema,
  submitClaimSchema,
} from '../../failedPayment.validator';

describe('sanitizeEventData', () => {
  it('keeps flat values and drops card, contact and secret fields', () => {
    const out = sanitizeEventData({
      razorpay_payment_id: 'pay_1',
      amount_paise: 49900,
      retry_shown: true,
      note: null,
      card_last4: '4242',
      email: 'a@b.c',
      contact_phone: '999',
      razorpay_signature: 'sig',
      nested: { a: 1 },
      missing: undefined,
      infinite: Number.POSITIVE_INFINITY,
    });
    expect(out).toEqual({ razorpay_payment_id: 'pay_1', amount_paise: 49900, retry_shown: true, note: null });
  });

  it('caps long text and turns dates into ISO strings', () => {
    const out = sanitizeEventData({ description: 'x'.repeat(900), at: new Date('2026-11-22T00:00:00Z') });
    expect(String(out.description)).toHaveLength(500);
    expect(out.at).toBe('2026-11-22T00:00:00.000Z');
  });
});

describe('caseFlags', () => {
  const base = {
    resolution: { state: 'OPEN' },
    refund: { status: '' },
    verification: { status: 'MATCHED' },
    review: null,
    claims: [{}],
  } as never;
  const flags = (over: Record<string, unknown>) => caseFlags({ ...(base as object), ...over } as never);

  it('a matched open case is green and refundable', () => {
    expect(caseFlags(base)).toEqual({ can_refund: true, needs_review: false, can_mark_not_refundable: false, highlight: 'GREEN' });
  });

  it('an unmatched claim is yellow until approved, then green', () => {
    expect(flags({ verification: { status: 'UNMATCHED' } })).toMatchObject({ highlight: 'YELLOW', needs_review: true, can_refund: false });
    expect(flags({ verification: { status: 'UNMATCHED' }, review: { decision: 'APPROVED' } })).toMatchObject({ highlight: 'GREEN', can_refund: true });
  });

  it('a case with no claim yet needs no review', () => {
    expect(flags({ verification: { status: 'PENDING' }, claims: [] })).toMatchObject({ highlight: 'NONE', needs_review: false });
  });

  it('a never-captured case can only be closed as not refundable', () => {
    expect(flags({ verification: { status: 'NOT_CAPTURED' } })).toMatchObject({ can_mark_not_refundable: true, can_refund: false, highlight: 'NONE' });
  });

  it('nothing is actionable while a refund is pending or after it is done', () => {
    expect(flags({ refund: { status: 'PENDING' } })).toMatchObject({ can_refund: false, highlight: 'NONE' });
    expect(flags({ refund: { status: 'PROCESSED' }, resolution: { state: 'REFUNDED' } })).toMatchObject({ can_refund: false });
  });

  it('a failed refund can be retried', () => {
    expect(flags({ refund: { status: 'FAILED' } })).toMatchObject({ can_refund: true });
  });
});

describe('parseExtraction', () => {
  it('reads the fields and keeps a 0–1 confidence', () => {
    const result = parseExtraction(
      JSON.stringify({ payment_id: ' pay_1 ', utr: '412345678901', amount: '₹499.00', date: '22 Nov', status: 'Success', payee: 'Duncit', confidence: 0.9 })
    );
    expect(result).toEqual({
      ok: true,
      rawAmount: '₹499.00',
      confidence: 0.9,
      extracted: { payment_id: 'pay_1', utr: '412345678901', amount: 499, date: '22 Nov', status: 'Success', payee: 'Duncit' },
    });
  });

  it('drops an out-of-range confidence and an unreadable amount', () => {
    const result = parseExtraction(JSON.stringify({ amount: 'n/a', confidence: 7 }));
    expect(result).toMatchObject({ ok: true, confidence: null, extracted: { amount: null, payment_id: '' } });
  });

  it('fails safe on an answer that is not JSON', () => {
    expect(parseExtraction('Sure! Here is the data')).toEqual({ ok: false, reason: 'The AI answer could not be read.' });
  });
});

describe('validation', () => {
  it('mirrors the @duncit/regex transaction id shape', () => {
    expect(PAYMENT_TRANSACTION_ID_REGEX.test('pay_29QQoUBi66xm2f')).toBe(true);
    expect(PAYMENT_TRANSACTION_ID_REGEX.test('412345678901')).toBe(true);
    expect(PAYMENT_TRANSACTION_ID_REGEX.test('abc12')).toBe(false);
    expect(PAYMENT_TRANSACTION_ID_REGEX.test('a'.repeat(41))).toBe(false);
    expect(PAYMENT_TRANSACTION_ID_REGEX.test('pay 123456')).toBe(false);
  });

  const claim = { payment_doc_id: '65aa00000000000000000002', client_request_id: 'claim-req-1' };

  it('accepts explicit nulls for absent optionals', () => {
    expect(parseInput(submitClaimSchema, { ...claim, evidence_type: 'TRANSACTION_ID', transaction_id: 'pay_123456', file_refs: null })).toMatchObject({
      file_refs: [],
      transaction_id: 'pay_123456',
    });
  });

  it('answers the first problem as the message, with code BAD_USER_INPUT', () => {
    expect(() => parseInput(submitClaimSchema, { ...claim, evidence_type: 'TRANSACTION_ID', transaction_id: 'x', file_refs: null })).toThrow(
      'Enter a valid transaction ID (6–40 letters, digits, - or _).'
    );
    let error: unknown = null;
    try {
      parseInput(submitClaimSchema, { ...claim, evidence_type: 'SCREENSHOT', transaction_id: null, file_refs: [] });
    } catch (caught) {
      error = caught;
    }
    expect(error).toMatchObject({ message: 'Attach between 1 and 5 files.', extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('refuses more than five files', () => {
    const refs = Array.from({ length: 6 }, (_, i) => `https://x/${i}.png`);
    expect(() => parseInput(submitClaimSchema, { ...claim, evidence_type: 'SCREENSHOT', transaction_id: null, file_refs: refs })).toThrow(
      'Attach between 1 and 5 files.'
    );
  });

  it('requires a note to reject but not to approve', () => {
    const review = { case_id: '65aa00000000000000000003', client_request_id: null };
    expect(parseInput(reviewSchema, { ...review, decision: 'APPROVED', note: '' })).toMatchObject({ note: '', client_request_id: '' });
    expect(() => parseInput(reviewSchema, { ...review, decision: 'REJECTED', note: '  ' })).toThrow('Add a note explaining the rejection.');
  });
});
