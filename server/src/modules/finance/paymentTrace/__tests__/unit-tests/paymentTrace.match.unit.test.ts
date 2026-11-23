import { Types } from 'mongoose';
import { matchedOn, paymentRefFilter, razorpayIdSets } from '../../paymentTrace.match';

const DOC_ID = new Types.ObjectId('65aa00000000000000000002');

const payment = (over: Record<string, unknown> = {}) =>
  ({
    _id: DOC_ID,
    payment_id: 'DPAY-MWRKSGXI1EE90B59',
    invoice_no: 'DUN/2026/0001',
    gateway: 'RAZORPAY',
    gateway_ref: 'pay_U39IlCSe3KJuyJ',
    metadata: { razorpay_order_id: 'order_U39IVJblWttbgN', razorpay_refund_ids: ['rfnd_A', 'rfnd_B'] },
    ...over,
  }) as never;

describe('matchedOn', () => {
  it('names the one field each id is equal to', () => {
    expect(matchedOn(payment(), 'DPAY-MWRKSGXI1EE90B59')).toEqual(['DUNCIT_REF']);
    expect(matchedOn(payment(), 'DUN/2026/0001')).toEqual(['INVOICE']);
    expect(matchedOn(payment(), '65aa00000000000000000002')).toEqual(['DOCUMENT_ID']);
    expect(matchedOn(payment(), 'pay_U39IlCSe3KJuyJ')).toEqual(['RAZORPAY_PAYMENT']);
    expect(matchedOn(payment(), 'order_U39IVJblWttbgN')).toEqual(['RAZORPAY_ORDER']);
    expect(matchedOn(payment(), 'rfnd_B')).toEqual(['RAZORPAY_REFUND']);
  });

  it('names every field an old pay_-shaped Duncit ref equals, never guessing from its shape', () => {
    const old = payment({ payment_id: 'pay_mwrjymwbd7ebc019', gateway_ref: 'pay_mwrjymwbd7ebc019' });
    expect(matchedOn(old, 'pay_mwrjymwbd7ebc019')).toEqual(['DUNCIT_REF', 'RAZORPAY_PAYMENT']);
  });

  it('matches nothing for an id the payment does not carry, and no Razorpay id on a non-Razorpay payment', () => {
    expect(matchedOn(payment(), 'pay_other')).toEqual([]);
    expect(matchedOn(payment({ gateway: 'DUMMY' }), 'pay_U39IlCSe3KJuyJ')).toEqual([]);
  });
});

describe('paymentRefFilter', () => {
  it('matches the id exactly on every indexed id field', () => {
    expect(paymentRefFilter('pay_1')).toEqual({
      $or: [
        { payment_id: 'pay_1' },
        { invoice_no: 'pay_1' },
        { gateway_ref: 'pay_1' },
        { 'metadata.razorpay_payment_id': 'pay_1' },
        { 'metadata.razorpay_order_id': 'pay_1' },
        { 'metadata.razorpay_refund_ids': 'pay_1' },
      ],
    });
  });

  it('adds the document id only for a 24-hex id', () => {
    const or = (paymentRefFilter('65aa00000000000000000002').$or as Record<string, unknown>[]);
    expect(or.at(-1)).toEqual({ _id: DOC_ID });
    expect(paymentRefFilter('65aa0000000000000000000z').$or as unknown[]).toHaveLength(6);
  });

  it('treats a pattern-looking id as plain text, never as a regex', () => {
    const or = paymentRefFilter('.*').$or as Record<string, unknown>[];
    expect(or[0]).toEqual({ payment_id: '.*' });
  });
});

describe('razorpayIdSets', () => {
  it('collects the payments\' Razorpay ids without duplicates', () => {
    const sets = razorpayIdSets([payment(), payment()], 'DPAY-MWRKSGXI1EE90B59');
    expect(sets).toEqual({
      paymentIds: ['pay_U39IlCSe3KJuyJ'],
      orderIds: ['order_U39IVJblWttbgN'],
      refundIds: ['rfnd_A', 'rfnd_B'],
    });
  });

  it('still looks up a Razorpay id no payment of ours carries', () => {
    expect(razorpayIdSets([], 'pay_X')).toEqual({ paymentIds: ['pay_X'], orderIds: [], refundIds: [] });
    expect(razorpayIdSets([], 'order_X')).toEqual({ paymentIds: [], orderIds: ['order_X'], refundIds: [] });
    expect(razorpayIdSets([], 'rfnd_X')).toEqual({ paymentIds: [], orderIds: [], refundIds: ['rfnd_X'] });
    expect(razorpayIdSets([], 'DPAY-1')).toEqual({ paymentIds: [], orderIds: [], refundIds: [] });
  });
});
