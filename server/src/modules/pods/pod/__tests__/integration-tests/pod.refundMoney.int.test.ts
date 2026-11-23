jest.mock('@modules/finance/payment/razorpay.gateway', () => ({
  createRazorpayRefund: jest.fn(),
  listRazorpayRefunds: jest.fn().mockResolvedValue([]),
}));

import { Types } from 'mongoose';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { PaymentGatewayRefundModel } from '@modules/finance/payment/payment.gatewayRefund.model';
import { coinService } from '@modules/finance/coin/coin.service';
import { cancellationRefundKey, returnCancellationMoney } from '../../pod.refundMoney';

/**
 * When Duncit cancels a pod, the buyer's money goes back through Razorpay and
 * the Duncit Coins they paid with come back too, while the purchase reward the
 * booking earned is taken back. Every write is keyed on the payment, so a pod
 * cancelled twice (or a held refund released after an immediate one) moves each
 * sum once.
 */
let seq = 0;
const makePayment = (over: Record<string, unknown> = {}) =>
  PaymentModel.create({
    payment_id: `DPAY-RM-${++seq}`,
    user_id: new Types.ObjectId(),
    user_name: 'Asha',
    user_email: 'asha@x.com',
    billing_address: 'address line',
    checkout_url: 'https://app/checkout',
    target_type: 'POD',
    pod_id: new Types.ObjectId(),
    description: 'Pod booking',
    subtotal: 30.51,
    total: 36,
    coins_redeemed: 50,
    coins_earned: 7,
    currency_symbol: '₹',
    status: 'SUCCESS',
    gateway: 'RAZORPAY',
    gateway_ref: `pay_rm${seq}`,
    metadata: { razorpay_payment_id: `pay_rm${seq}` },
    ...over,
  });

let refundCoins: jest.SpyInstance;
let revokeEarned: jest.SpyInstance;

beforeEach(() => {
  refundCoins = jest.spyOn(coinService, 'refundForBackout').mockResolvedValue(0);
  revokeEarned = jest.spyOn(coinService, 'revokeEarnForBackout').mockResolvedValue(0);
});

afterEach(() => jest.restoreAllMocks());

const cancel = (payment: Awaited<ReturnType<typeof makePayment>>, refund = 36, pct = 100) =>
  returnCancellationMoney({ payment, refund, pct, reason: 'Minimum bookings not met', initiatedBy: 'SYSTEM', initiatorId: '' });

describe('returnCancellationMoney', () => {
  it('queues the Razorpay refund for the full amount and gives every paid coin back on a full refund', async () => {
    const payment = await makePayment();
    const record = await cancel(payment);
    const key = cancellationRefundKey(payment._id);

    expect(record).toMatchObject({ status: 'QUEUED', amount_paise: 3600, source: 'POD_CANCELLATION', idempotency_key: key });
    expect(refundCoins).toHaveBeenCalledWith(expect.objectContaining({ userId: String(payment.user_id), backoutId: key, coins: 50 }));
    expect(revokeEarned).toHaveBeenCalledWith(expect.objectContaining({ userId: String(payment.user_id), backoutId: key, coins: 7 }));
  });

  it('returns paid coins, and takes back the reward, in the same share as the venue policy refunds', async () => {
    const payment = await makePayment();
    await cancel(payment, 18, 50);
    expect(refundCoins).toHaveBeenCalledWith(expect.objectContaining({ coins: 25 }));
    // 7 × 50% = 3.5 → 3: the buyer keeps the reward for the half they paid for.
    expect(revokeEarned).toHaveBeenCalledWith(expect.objectContaining({ coins: 3 }));
  });

  it('moves the money once however many times the cancellation runs', async () => {
    const payment = await makePayment();
    const first = await cancel(payment);
    const again = await cancel(payment);
    expect(String(again!._id)).toBe(String(first!._id));
    expect(await PaymentGatewayRefundModel.countDocuments({ payment_doc_id: payment._id })).toBe(1);
    // Both coin writes carry the same key — the ledger's unique index drops the second.
    const keys = refundCoins.mock.calls.map(([args]) => args.backoutId);
    expect(new Set(keys)).toEqual(new Set([cancellationRefundKey(payment._id)]));
  });

  it('records a test-gateway payment as having no Razorpay money, and still settles its coins', async () => {
    const payment = await makePayment({ gateway: 'DUMMY', gateway_ref: 'dummy', metadata: {} });
    const record = await cancel(payment);
    expect(record).toMatchObject({ status: 'NOT_APPLICABLE' });
    expect(refundCoins).toHaveBeenCalledWith(expect.objectContaining({ coins: 50 }));
  });

  it('never lets a coin-ledger failure undo the recorded cash refund', async () => {
    refundCoins.mockRejectedValue(new Error('ledger down'));
    const payment = await makePayment();
    await expect(cancel(payment)).resolves.toMatchObject({ status: 'QUEUED' });
  });

  it('queues nothing for a ₹0 refund (a policy that refunds nothing), returns no coins and revokes no reward', async () => {
    const payment = await makePayment();
    await expect(cancel(payment, 0, 0)).resolves.toBeNull();
    expect(refundCoins).not.toHaveBeenCalled();
    expect(revokeEarned).not.toHaveBeenCalled();
  });
});
