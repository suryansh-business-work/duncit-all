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
