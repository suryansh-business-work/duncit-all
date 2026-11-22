import { GraphQLError } from 'graphql';
import { WalletWithdrawalModel } from '@modules/finance/wallet/wallet.model';
import { SendMoneyTransferModel, type PayoutSubjectKind } from './payout.model';
import { fetchPayout, payoutOutcomeOf } from './razorpayX.gateway';
import { settlePayout, type SettleResult } from './payout.settle';
import type { PayoutActor } from './payout.audit';

/**
 * Ask Razorpay where a payout stands and apply the answer.
 *
 * The webhook is the normal route; this is the other half of it for a delivery
 * that never arrived (or arrived while the server was down). It goes through the
 * same {@link settlePayout}, so refreshing a payout the webhook already settled
 * changes nothing.
 */
export async function refreshPayoutStatus(kind: PayoutSubjectKind, recordId: string, actor: PayoutActor): Promise<SettleResult> {
  const row =
    kind === 'WITHDRAWAL'
      ? await WalletWithdrawalModel.findOne({ withdrawal_id: recordId }).select('payout').lean()
      : await SendMoneyTransferModel.findOne({ transfer_id: recordId }).select('payout').lean();
  const payoutId = row?.payout?.razorpay_payout_id ?? '';
  if (!payoutId || row?.payout?.status !== 'PROCESSING') {
    throw new GraphQLError('There is no payout in progress to refresh.', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const remote = await fetchPayout(payoutId);
  const outcome = payoutOutcomeOf(remote.status);
  if (outcome === 'PROCESSING') return 'IGNORED';
  return settlePayout({
    kind,
    recordId,
    outcome,
    razorpayPayoutId: payoutId,
    utr: remote.utr,
    failureReason: remote.failure_reason || `Razorpay reported the payout as ${remote.status}.`,
    dedupeKey: `refresh:${payoutId}:${outcome}`,
    actor,
  });
}
