import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { WalletWithdrawalModel, type IWalletWithdrawal } from '@modules/finance/wallet/wallet.model';
import { assertPayoutsConfigured } from './payout.dispatch';
import { retryAttemptPatch } from './payout.patch';
import type { PayoutActor } from './payout.audit';
import { refreshPayoutStatus } from './payout.refresh';
import { sendWithdrawalPayout } from './withdrawal.decision';
import { approvalOf } from './withdrawal.state';

/**
 * Get an approved withdrawal's payout moving again, whichever way it stalled.
 *
 *  - FAILED            -> a NEW attempt under a new idempotency key. The failed
 *                         payout never moved money, so this cannot double-pay.
 *  - PROCESSING, no id -> the request may not have reached Razorpay; resend under
 *                         the SAME key, which returns the original if it did.
 *  - PROCESSING, id    -> nothing to resend: ask Razorpay where it stands.
 *  - PAID              -> refused; there is nothing left to do.
 *
 * Only a decided-and-approved withdrawal has a payout to retry; rejecting a
 * failed one is done through the normal decision flow (it refunds the wallet).
 */
export async function retryWithdrawalPayout(id: string, actor: PayoutActor): Promise<IWalletWithdrawal> {
  const row = Types.ObjectId.isValid(id) ? await WalletWithdrawalModel.findById(id) : null;
  if (!row) throw new GraphQLError('Withdrawal not found', { extensions: { code: 'NOT_FOUND' } });
  const approval = approvalOf(row);
  if (row.status !== 'PENDING' || (approval !== 'APPROVED' && approval !== 'PARTIALLY_APPROVED') || !row.payout) {
    throw new GraphQLError('This withdrawal has no payout that can be retried.', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const payout = row.payout;
  if (payout.status === 'FAILED') {
    await assertPayoutsConfigured();
    const attempt = payout.attempt + 1;
    // Compare-and-set on the attempt number: two Retry clicks claim ONE new attempt.
    const claimed = await WalletWithdrawalModel.findOneAndUpdate(
      { _id: row._id, 'payout.status': 'FAILED', 'payout.attempt': payout.attempt },
      {
        $set: retryAttemptPatch(row.withdrawal_id, attempt, actor.id ? new Types.ObjectId(actor.id) : null),
      },
      { new: true }
    );
    if (claimed) await sendWithdrawalPayout(row.withdrawal_id, actor);
  } else if (payout.status === 'PROCESSING') {
    if (payout.razorpay_payout_id) await refreshPayoutStatus('WITHDRAWAL', row.withdrawal_id, actor);
    else {
      await assertPayoutsConfigured();
      await sendWithdrawalPayout(row.withdrawal_id, actor);
    }
  } else {
    throw new GraphQLError('This withdrawal is already paid.', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return (await WalletWithdrawalModel.findById(row._id)) ?? row;
}
