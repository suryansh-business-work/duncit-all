/**
 * The rule that decides whether a deduction claim is refundable without a
 * person (green), needs Review (yellow) or cannot be refunded through Razorpay.
 */
import type { RazorpayPaymentSummary } from '@modules/finance/payment/razorpay.gateway';
import { matchEvidence, rupeesToPaise, type MatchInput } from '../../failedPayment.match';

const payment = (over: Partial<RazorpayPaymentSummary> = {}): RazorpayPaymentSummary => ({
  id: 'pay_CAPTURED1',
  status: 'captured',
  amount: 49900,
  amount_refunded: 0,
  order_id: 'order_1',
  references: ['412345678901'],
  error_code: '',
  error_description: '',
  ...over,
});

const input = (over: Partial<MatchInput> = {}): MatchInput => ({
  claimedIds: ['pay_CAPTURED1'],
  orderPayments: [payment()],
  expectedAmountPaise: 49900,
  extractedAmountPaise: null,
  bookingExists: false,
  bookedRazorpayPaymentId: null,
  ...over,
});

describe('matchEvidence', () => {
  it('matches a captured payment of the order with the right amount and no booking', () => {
    const result = matchEvidence(input());
    expect(result).toMatchObject({
      status: 'MATCHED',
      matchedPaymentId: 'pay_CAPTURED1',
      razorpayStatus: 'captured',
      razorpayAmount: 49900,
    });
    expect(result.matchedFields).toEqual(['payment_id', 'status', 'amount', 'no_booking']);
  });

  it('matches by a bank reference (UTR / RRN) as well as by the payment id', () => {
    const result = matchEvidence(input({ claimedIds: ['', ' 412345678901 '] }));
    expect(result.status).toBe('MATCHED');
    expect(result.matchedFields[0]).toBe('bank_reference');
  });

  it('never matches an id that belongs to a different order', () => {
    const result = matchEvidence(input({ claimedIds: ['pay_SOMEONE_ELSE'] }));
    expect(result.status).toBe('UNMATCHED');
    expect(result.matchedPaymentId).toBe('');
    expect(result.notes).toMatch(/not a payment of this order/);
  });

  it('is UNMATCHED with a manual note when nothing could be read', () => {
    const result = matchEvidence(input({ claimedIds: ['', '  '] }));
    expect(result.status).toBe('UNMATCHED');
    expect(result.notes).toMatch(/No transaction id/);
  });

  it('is NOT_CAPTURED when Razorpay never captured the claimed payment', () => {
    const result = matchEvidence(input({ orderPayments: [payment({ status: 'failed' })] }));
    expect(result.status).toBe('NOT_CAPTURED');
    expect(result.matchedPaymentId).toBe('pay_CAPTURED1');
  });

  it('treats an authorized-only payment as not captured too', () => {
    expect(matchEvidence(input({ orderPayments: [payment({ status: 'authorized' })] })).status).toBe('NOT_CAPTURED');
  });

  it('does not offer a payment Razorpay already refunded', () => {
    const result = matchEvidence(input({ orderPayments: [payment({ status: 'refunded' })] }));
    expect(result.status).toBe('UNMATCHED');
    expect(result.notes).toMatch(/already refunded/);
  });

  it('prefers the captured payment when a failed attempt shares the reference', () => {
    const result = matchEvidence(
      input({
        claimedIds: ['412345678901'],
        orderPayments: [payment({ id: 'pay_FAILED', status: 'failed' }), payment()],
      })
    );
    expect(result.status).toBe('MATCHED');
    expect(result.matchedPaymentId).toBe('pay_CAPTURED1');
  });

  it('is UNMATCHED when the captured amount differs from the checkout', () => {
    const result = matchEvidence(input({ orderPayments: [payment({ amount: 39900 })] }));
    expect(result.status).toBe('UNMATCHED');
    expect(result.matchedFields).toEqual(['payment_id', 'status']);
  });

  it('accepts a screenshot amount within one rupee and refuses one further off', () => {
    expect(matchEvidence(input({ extractedAmountPaise: 49900 + 100 })).status).toBe('MATCHED');
    expect(matchEvidence(input({ extractedAmountPaise: 49900 + 101 })).status).toBe('UNMATCHED');
  });

  it('refuses when a booking was made with this very payment', () => {
    const result = matchEvidence(input({ bookingExists: true, bookedRazorpayPaymentId: 'pay_CAPTURED1' }));
    expect(result.status).toBe('UNMATCHED');
    expect(result.notes).toMatch(/booking already exists/);
  });

  it('refuses when a booking exists and its payment is unknown (fails safe)', () => {
    expect(matchEvidence(input({ bookingExists: true, bookedRazorpayPaymentId: null })).status).toBe('UNMATCHED');
  });

  it('matches a second, duplicate capture when the booking used a different payment', () => {
    const result = matchEvidence(input({ bookingExists: true, bookedRazorpayPaymentId: 'pay_BOOKED' }));
    expect(result.status).toBe('MATCHED');
  });
});

describe('rupeesToPaise', () => {
  it.each([
    ['₹1,299.00', 129900],
    ['499', 49900],
    [499.5, 49950],
  ])('reads %p as %p paise', (value, paise) => {
    expect(rupeesToPaise(value)).toBe(paise);
  });

  it.each([null, undefined, '', 'abc', 0, -5, Number.NaN])('answers null for %p', (value) => {
    expect(rupeesToPaise(value)).toBeNull();
  });
});
