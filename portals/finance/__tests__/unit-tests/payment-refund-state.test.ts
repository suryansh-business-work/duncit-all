/**
 * What a payment's refund is doing, as one of five states. The rules are the
 * ones the Payment Logs PDF prints on the server (payment.logsPdf.words), so
 * these cases are the screen's half of "the page and its printout never name
 * one refund two ways".
 */
import { describe, expect, it } from 'vitest';
import { refundStateLabels, refundStateOf } from '../../src/pages/finance/payment-logs-page/refundState';

describe('refundStateOf', () => {
  it.each([
    [{ status: 'REFUNDED', refund_status: 'SUCCEEDED' }, 'REFUNDED'],
    [{ status: 'SUCCESS', refund_status: 'SUCCEEDED' }, 'PART_REFUNDED'],
    [{ status: 'REFUNDED', refund_status: 'PROCESSING' }, 'PROCESSING'],
    [{ status: 'REFUNDED', refund_status: 'REQUESTED' }, 'PENDING'],
    [{ status: 'REFUNDED', refund_status: 'FAILED' }, 'ATTENTION'],
    [{ status: 'REFUNDED', refund_status: 'RECONCILIATION_REQUIRED' }, 'ATTENTION'],
  ] as const)('reads %j as %s', (facts, state) => {
    expect(refundStateOf(facts)).toBe(state);
  });

  it('lets the refund engine speak before the owed flag: a refund on its way is not "pending" any more', () => {
    expect(refundStateOf({ status: 'SUCCESS', refund_status: 'PROCESSING', needs_refund: true })).toBe('PROCESSING');
    expect(refundStateOf({ status: 'REFUNDED', refund_status: 'SUCCEEDED', needs_refund: true })).toBe('REFUNDED');
  });

  it('calls a capture that bought nothing and is still owed back "pending"', () => {
    expect(refundStateOf({ status: 'SUCCESS', refund_status: null, needs_refund: true })).toBe('PENDING');
    expect(refundStateOf({ status: 'PENDING', needs_refund: true })).toBe('PENDING');
  });

  it('reads an older refunded payment, with no engine record or nothing to send, from its status alone', () => {
    expect(refundStateOf({ status: 'REFUNDED', refund_status: null })).toBe('REFUNDED');
    expect(refundStateOf({ status: 'REFUNDED', refund_status: 'NOT_APPLICABLE' })).toBe('REFUNDED');
    expect(refundStateOf({ status: 'REFUNDED' })).toBe('REFUNDED');
  });

  it('has nothing to say about a payment with no refund', () => {
    expect(refundStateOf({ status: 'SUCCESS', refund_status: null, needs_refund: false })).toBeNull();
    expect(refundStateOf({ status: 'FAILED' })).toBeNull();
    // A refund that was never needed or sent: NOT_APPLICABLE on a payment that is still paid.
    expect(refundStateOf({ status: 'SUCCESS', refund_status: 'NOT_APPLICABLE' })).toBeNull();
  });
});

describe('refundStateLabels', () => {
  it('has a word for every state, each from its own key', () => {
    const labels = refundStateLabels((key: string) => key);
    expect(labels).toEqual({
      REFUNDED: 'finance.payment.refundStateRefunded',
      PART_REFUNDED: 'finance.payment.refundStatePart',
      PROCESSING: 'finance.payment.refundStateProcessing',
      PENDING: 'finance.payment.refundStatePending',
      ATTENTION: 'finance.payment.refundStateAttention',
    });
    expect(new Set(Object.values(labels)).size).toBe(5);
  });
});
