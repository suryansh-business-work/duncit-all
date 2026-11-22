import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { WalletWithdrawalModel } from '@modules/finance/wallet/wallet.model';
import { walletService, withdrawalPub } from '@modules/finance/wallet/wallet.service';
import { recordPayoutEvent, type PayoutActor } from './payout.audit';
import { isPayoutConfigured } from './razorpayX.gateway';
import { decideWithdrawal } from './withdrawal.decision';
import { approvalOf } from './withdrawal.state';

/**
 * The OLD `reviewWithdrawal(PAID | REJECTED)` mutation, kept working for portal
 * builds that still call it (backward compatibility), without letting it undo
 * what the new flow guarantees:
 *
 *  - REJECTED is the new REJECT, so it refunds, writes the audit row and tells
 *    the person exactly like a rejection from the new dialog.
 *  - PAID means "I paid this by hand". That is only accepted while payouts are
 *    NOT set up (a company that has not connected RazorpayX); once they are,
 *    money moves through Razorpay and a hand-marked "paid" would let a withdrawal
 *    be both paid by Razorpay and marked paid — or marked paid with nothing sent.
 *    It is also refused for any withdrawal the new flow has already touched.
 *    A manual mark is audited as such.
 */
export async function reviewWithdrawalLegacy(
  id: string,
  status: string,
  reason: string | undefined,
  actor: PayoutActor
) {
  if (status === 'REJECTED') {
    return withdrawalPub(await decideWithdrawal({ id, decision: 'REJECT', reason, actor }));
  }
  if (status !== 'PAID') {
    throw new GraphQLError('Select PAID or REJECTED', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  if (await isPayoutConfigured()) {
    throw new GraphQLError(
      'Withdrawals are paid through Razorpay now. Use Accept to approve and pay this withdrawal.',
      { extensions: { code: 'BAD_USER_INPUT' } }
    );
  }
  const row = Types.ObjectId.isValid(id) ? await WalletWithdrawalModel.findById(id).lean() : null;
  if (row && (row.payout || approvalOf(row) !== 'PENDING')) {
    throw new GraphQLError('This withdrawal is already being handled through the approval flow.', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  const paid = await walletService.reviewWithdrawal(id, 'PAID', reason, actor.id);
  await recordPayoutEvent({
    kind: 'WITHDRAWAL',
    subjectId: paid.withdrawal_id,
    action: 'MARKED_PAID_MANUALLY',
    userId: paid.user_id,
    userName: paid.beneficiary_name,
    requestedAmount: paid.amount,
    approvedAmount: paid.amount,
    reason: reason ?? '',
    actor,
    paymentStatus: 'PAID',
    dedupeKey: `wd:${paid.withdrawal_id}:manual`,
  });
  return paid;
}
