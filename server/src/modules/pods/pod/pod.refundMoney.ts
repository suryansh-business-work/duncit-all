/**
 * The money half of a pod-cancellation refund, once the payment has been
 * claimed for it (refunded now, or a held refund being released): the cash goes
 * back through Razorpay, the Duncit Coins the booking was paid with return to
 * the buyer, and the purchase-reward coins it earned are taken back.
 *
 * Every write is keyed on the payment (`pod_cancel:<payment>`), so the immediate
 * cancel and the held-refund release — and any retry of either — move each sum
 * once: the refund record is unique per key and the coin ledger dedupes on it.
 */
import { logs } from '@observability/log';
import { coinService } from '@modules/finance/coin/coin.service';
import type { IPayment } from '@modules/finance/payment/payment.model';
import { creditCoinsBack } from '@modules/finance/payment/payment.refundRecord';
import { queueGatewayRefund } from '@modules/finance/payment/payment.gatewayRefund';
import type { IPaymentGatewayRefund } from '@modules/finance/payment/payment.gatewayRefund.model';

/** The idempotency key every write for one payment's cancellation refund shares. */
export const cancellationRefundKey = (paymentId: unknown) => `pod_cancel:${String(paymentId)}`;

/**
 * Queue the Razorpay refund and settle the coins for one claimed payment.
 * `pct` is the share of the ticket money refunded (the venue's policy on an
 * automatic cancellation, 100 for every person-made one); paid coins come back,
 * and the purchase reward is taken back, in the same proportion. Coin trouble is
 * logged, never thrown — the cash refund is already recorded and must not be
 * undone by it.
 */
export async function returnCancellationMoney(input: {
  payment: IPayment;
  refund: number;
  pct: number;
  reason: string;
  initiatedBy: string;
  initiatorId?: string | null;
}): Promise<IPaymentGatewayRefund | null> {
  const { payment, reason } = input;
  const key = cancellationRefundKey(payment._id);
  const record = await queueGatewayRefund({
    payment,
    amount: input.refund,
    key,
    source: 'POD_CANCELLATION',
    reason,
    initiatedBy: input.initiatedBy,
    initiatorId: input.initiatorId,
  });
  // Both coin moves follow the refunded share: a buyer refunded half gets half
  // their coins back and keeps half the reward, since they paid for half.
  const share = Math.min(100, Math.max(0, Number(input.pct) || 0)) / 100;
  try {
    await creditCoinsBack(payment, Math.floor((Number(payment.coins_redeemed) || 0) * share), key, reason);
    const revoke = Math.floor((Number(payment.coins_earned) || 0) * share);
    if (payment.user_id && revoke > 0) {
      await coinService.revokeEarnForBackout({
        userId: String(payment.user_id),
        backoutId: key,
        paymentId: payment.payment_id,
        coins: revoke,
        reason,
      });
    }
  } catch (error) {
    logs.server.error('pod', 'cancelRefundCoins', { error, payment_id: payment.payment_id, msg: 'coins not settled on cancellation' });
  }
  return record;
}
