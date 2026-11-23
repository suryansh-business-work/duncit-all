/**
 * The Refund dialog's live preview: the same eligibility rule and live Razorpay
 * check as the refund, without claiming or sending anything.
 */
jest.mock('../../failedPayment.refund', () => {
  const actual = jest.requireActual('../../failedPayment.refund');
  return { ...actual, liveRefundCheck: jest.fn() };
});
jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn() } } }));

import { logs } from '@observability/log';
import { liveRefundCheck, RefundRefusal } from '../../failedPayment.refund';
import { refundPreviewFor } from '../../failedPayment.refundPreview';

const m = (fn: unknown) => fn as jest.Mock;

const kase = (over: Record<string, unknown> = {}) =>
  ({
    _id: '65aa00000000000000000001',
    resolution: { state: 'OPEN' },
    verification: { status: 'PENDING' },
    review: null,
    claims: [],
    refund: { status: '' },
    ...over,
  }) as never;

beforeEach(() => jest.clearAllMocks());

describe('refundPreviewFor', () => {
  it('answers the rupees and payment Razorpay would refund now', async () => {
    m(liveRefundCheck).mockResolvedValue({ razorpayPaymentId: 'pay_9', amountPaise: 49950 });
    await expect(refundPreviewFor(kase())).resolves.toEqual({ refundable: true, amount: 499.5, razorpay_payment_id: 'pay_9', reason: null });
  });

  it('passes on the reason Razorpay\'s live check refused', async () => {
    m(liveRefundCheck).mockRejectedValue(new RefundRefusal('Razorpay shows this payment as authorized; only captured money can be refunded.'));
    await expect(refundPreviewFor(kase())).resolves.toEqual({
      refundable: false,
      amount: null,
      razorpay_payment_id: null,
      reason: 'Razorpay shows this payment as authorized; only captured money can be refunded.',
    });
  });

  it('says Razorpay could not be reached on a gateway fault, and logs it', async () => {
    m(liveRefundCheck).mockRejectedValue(new Error('ECONNRESET'));
    const out = await refundPreviewFor(kase());
    expect(out).toMatchObject({ refundable: false, reason: 'Razorpay could not be reached. Try again in a minute.' });
    expect(logs.server.warn).toHaveBeenCalledWith('failedPayment', 'refundPreview', expect.objectContaining({ case_id: '65aa00000000000000000001' }));
  });

  it('never asks Razorpay for a case the rules already refuse', async () => {
    await expect(refundPreviewFor(kase({ refund: { status: 'PROCESSED' } }))).resolves.toMatchObject({
      refundable: false,
      reason: 'This payment has already been refunded.',
    });
    await expect(refundPreviewFor(kase({ verification: { status: 'UNMATCHED' }, claims: [{}] }))).resolves.toMatchObject({
      reason: 'Approve the evidence in Review before refunding.',
    });
    expect(liveRefundCheck).not.toHaveBeenCalled();
  });

  it('reports a refund already on its way instead of previewing a second one', async () => {
    await expect(refundPreviewFor(kase({ refund: { status: 'PENDING' } }))).resolves.toMatchObject({
      refundable: false,
      reason: 'This refund is already on its way to Razorpay.',
    });
    expect(liveRefundCheck).not.toHaveBeenCalled();
  });
});
