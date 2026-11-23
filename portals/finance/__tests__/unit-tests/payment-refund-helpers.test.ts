import { describe, expect, it } from 'vitest';
import { refundIdsOf } from '../../src/pages/finance/payment-detail-page/refundEntryLines';
import { refundToSourceSchema } from '../../src/pages/finance/payment-detail-page/refundToSource.schema';
import { makeRefundEntry } from '../mocks/payment-detail.mock';

describe('refundIdsOf', () => {
  const base = makeRefundEntry();

  it('prefers the full list', () => {
    expect(refundIdsOf({ ...base, razorpay_refund_id: 'rfnd_1', razorpay_refund_ids: ['rfnd_1', 'rfnd_2'] })).toEqual(['rfnd_1', 'rfnd_2']);
  });

  it('falls back to the primary id, then to nothing', () => {
    expect(refundIdsOf({ ...base, razorpay_refund_id: 'rfnd_1', razorpay_refund_ids: [] })).toEqual(['rfnd_1']);
    expect(refundIdsOf({ ...base, razorpay_refund_id: null, razorpay_refund_ids: [] })).toEqual([]);
  });
});

describe('refundToSourceSchema', () => {
  const schema = refundToSourceSchema((key) => key);

  it('accepts a note and hands it back trimmed', () => {
    const parsed = schema.safeParse({ note: '  Customer waited three days  ' });
    expect(parsed.success && parsed.data.note).toBe('Customer waited three days');
  });

  it('refuses an empty note, a note of spaces and a note under three characters', () => {
    for (const note of ['', '     ', ' ab ']) {
      const parsed = schema.safeParse({ note });
      expect(parsed.success).toBe(false);
      expect(parsed.error?.issues[0].message).toBe('finance.payment.refundArea.noteRequired');
    }
  });

  it('accepts exactly 3 and 500 characters and refuses 501', () => {
    expect(schema.safeParse({ note: 'abc' }).success).toBe(true);
    expect(schema.safeParse({ note: 'a'.repeat(500) }).success).toBe(true);
    const tooLong = schema.safeParse({ note: 'a'.repeat(501) });
    expect(tooLong.success).toBe(false);
    expect(tooLong.error?.issues[0].message).toBe('finance.payment.refundArea.noteTooLong');
  });
});
