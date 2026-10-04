import { PaymentModel, type IPayment } from './payment.model';
import { coinService } from '@modules/finance/coin/coin.service';

/**
 * The two ledger writes every order-level refund makes, whichever shop sold
 * the order (pet store or pod shop). Kept in finance so neither shop imports
 * the other to give money back; both land in Finance › User Refund Logs alike.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Record a refund on the payment it reverses — the same stamps every other
 * refund flow writes, so it lands in Finance › User Refund Logs for payout.
 */
export async function recordPaymentRefund(
  payment: IPayment,
  amount: number,
  reason: string,
  initiatedBy: string
) {
  if (amount <= 0) return;
  const meta = payment.metadata ?? {};
  const refunded = round2((Number(meta.refunded_amount) || 0) + amount);
  const update: Record<string, unknown> = {
    'metadata.refunded_at': new Date().toISOString(),
    'metadata.refunded_amount': refunded,
    'metadata.refund_reason': reason,
    'metadata.refund_initiated_by': initiatedBy,
  };
  if (refunded >= payment.total - 0.01) update.status = 'REFUNDED';
  await PaymentModel.updateOne({ _id: payment._id }, { $set: update });
}

/** Coins back into a buyer's balance, once per key (the ledger dedupes). */
export async function creditCoinsBack(payment: IPayment, coins: number, key: string, reason: string) {
  if (!payment.user_id || coins <= 0) return 0;
  // refundForBackout is the ledger's generic idempotent PAYMENT_REFUND credit;
  // `backoutId` is only its dedupe key, here the order or return it refunds.
  return coinService.refundForBackout({
    userId: String(payment.user_id),
    backoutId: key,
    paymentId: payment.payment_id,
    coins,
    reason,
  });
}
