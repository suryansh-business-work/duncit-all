import { paymentResolvers } from '../../payment.resolver';
import { makeContext } from '@test/harness';

describe('payment unit', () => {
  it('payments query is gated to admin roles', async () => {
    await expect(
      (async () => (paymentResolvers.Query as any).payments({}, {}, makeContext({ roles: ['USER'] })))()
    ).rejects.toThrow(/access denied/i);
  });

  it('myPayments requires authentication', async () => {
    await expect(
      (async () => (paymentResolvers.Query as any).myPayments({}, {}, makeContext(null)))()
    ).rejects.toThrow();
  });

  it('createRazorpayOrder requires authentication', async () => {
    await expect(
      (async () =>
        (paymentResolvers.Mutation as any).createRazorpayOrder({}, { input: {} }, makeContext(null)))()
    ).rejects.toThrow();
  });

  it('verifyRazorpayPayment requires authentication', async () => {
    await expect(
      (async () =>
        (paymentResolvers.Mutation as any).verifyRazorpayPayment(
          {},
          { input: {} },
          makeContext(null)
        ))()
    ).rejects.toThrow();
  });
});

describe('retired multi-ticket discount fields', () => {
  const field = (type: 'Payment' | 'PaymentTotals' | 'CheckoutQuote', name: string) =>
    (paymentResolvers[type] as unknown as Record<string, (p: unknown) => number>)[name];

  it('answer 0 for clients that still select them, even on a payment that froze a discount', () => {
    const legacy = { ticket_discount_amount: 94.16, ticket_discount_pct: 10, ticket_discount_total: 94.16 };
    expect(field('Payment', 'ticket_discount_amount')(legacy)).toBe(0);
    expect(field('Payment', 'ticket_discount_pct')(legacy)).toBe(0);
    expect(field('PaymentTotals', 'ticket_discount_total')(legacy)).toBe(0);
    expect(field('CheckoutQuote', 'ticket_discount_amount')(legacy)).toBe(0);
    expect(field('CheckoutQuote', 'ticket_discount_pct')(legacy)).toBe(0);
  });
});
