import type { GraphQLContext } from '@context';
import { FINANCE_READER, requireRole } from '@middleware/rbac';
import { assertPlatformFinanceWrite, assertPodFinanceScope } from '../financeScope';
import { financeTargets } from '../financeScope.targets';
import { withdrawalPub } from '@modules/finance/wallet/wallet.service';
import { actorFor } from './payout.audit';
import { decideWithdrawal, type WithdrawalDecision } from './withdrawal.decision';
import { retryWithdrawalPayout } from './withdrawal.retry';
import { retryTransfer, sendMoney } from './sendMoney.service';
import {
  payoutAuditTable,
  sendMoneyOptions,
  sendMoneyRecipient,
  sendMoneyRecipients,
  sendMoneyTransfersTable,
  transferPub,
  withdrawalReview,
} from './payout.queries';
import type { SendMoneyCategory, PayoutSubjectKind } from './payout.model';
import type { CustomAccountInput } from './payout.accounts';

/**
 * Who may do what with money going OUT:
 *  - Reads: the Finance seats, including the analyst (read-only).
 *  - Deciding or retrying a withdrawal: Finance Manager, Super Admin and City
 *    Admin — a City Admin only for withdrawals whose pods are in their city.
 *  - Send Money: Finance Manager and Super Admin ONLY. It is not tied to a pod
 *    or a city, so a city-bound admin is refused, exactly as for the other
 *    platform-wide money settings.
 * Every check is server-side; the portal hiding a button is a courtesy.
 */
const FINANCE_RW = ['SUPER_ADMIN', 'CITY_ADMIN', 'FINANCE_MANAGER'];
const FINANCE_READ = [...FINANCE_RW, FINANCE_READER];

interface DecideArgs {
  withdrawal_id: string;
  input: {
    decision: WithdrawalDecision;
    approved_amount?: number | null;
    reason?: string | null;
    acknowledge_unverified_account?: boolean | null;
  };
}

interface SendMoneyArgs {
  input: {
    request_id: string;
    recipient_user_id: string;
    account_id?: string | null;
    custom_account?: CustomAccountInput | null;
    acknowledge_custom_account?: boolean | null;
    payout_method?: 'IMPS' | 'NEFT' | 'UPI' | null;
    amount: number;
    category: SendMoneyCategory;
    reason: string;
    notes?: string | null;
    supporting_reference?: string | null;
    supporting_url?: string | null;
  };
}

const withdrawalScope = (ctx: GraphQLContext, id: string) =>
  assertPodFinanceScope(ctx, FINANCE_RW, () => financeTargets.withdrawal(id));

export const payoutResolvers = {
  Query: {
    withdrawalReview: (_p: unknown, args: { withdrawal_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_READ);
      return withdrawalReview(args.withdrawal_id);
    },
    payoutAuditTable: (_p: unknown, args: { kind: PayoutSubjectKind; query?: never }, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_READ);
      return payoutAuditTable(args.kind, args.query);
    },
    sendMoneyRecipients: (_p: unknown, args: { search: string; limit?: number | null }, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_READ);
      return sendMoneyRecipients(args.search, args.limit);
    },
    sendMoneyRecipient: (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_READ);
      return sendMoneyRecipient(args.user_id);
    },
    sendMoneyOptions: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_READ);
      return sendMoneyOptions();
    },
    sendMoneyTransfersTable: (_p: unknown, args: { query?: never }, ctx: GraphQLContext) => {
      requireRole(ctx, FINANCE_READ);
      return sendMoneyTransfersTable(args.query);
    },
  },
  Mutation: {
    decideWithdrawal: async (_p: unknown, args: DecideArgs, ctx: GraphQLContext) => {
      const user = requireRole(ctx, FINANCE_RW);
      await withdrawalScope(ctx, args.withdrawal_id);
      const row = await decideWithdrawal({
        id: args.withdrawal_id,
        decision: args.input.decision,
        approvedAmount: args.input.approved_amount,
        reason: args.input.reason,
        acknowledgeUnverifiedAccount: args.input.acknowledge_unverified_account === true,
        actor: await actorFor(user),
      });
      return withdrawalPub(row);
    },
    retryWithdrawalPayout: async (_p: unknown, args: { withdrawal_id: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, FINANCE_RW);
      await withdrawalScope(ctx, args.withdrawal_id);
      return withdrawalPub(await retryWithdrawalPayout(args.withdrawal_id, await actorFor(user)));
    },
    sendMoney: async (_p: unknown, args: SendMoneyArgs, ctx: GraphQLContext) => {
      const user = requireRole(ctx, FINANCE_RW);
      assertPlatformFinanceWrite(ctx, FINANCE_RW);
      const { input } = args;
      const row = await sendMoney({
        requestId: input.request_id,
        recipientUserId: input.recipient_user_id,
        accountId: input.account_id,
        customAccount: input.custom_account,
        acknowledgeCustomAccount: input.acknowledge_custom_account === true,
        payoutMethod: input.payout_method === 'UPI' ? null : input.payout_method,
        amount: input.amount,
        category: input.category,
        reason: input.reason,
        notes: input.notes,
        supportingReference: input.supporting_reference,
        supportingUrl: input.supporting_url,
        actor: await actorFor(user),
      });
      return transferPub(row);
    },
    retrySendMoneyTransfer: async (_p: unknown, args: { transfer_id: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, FINANCE_RW);
      assertPlatformFinanceWrite(ctx, FINANCE_RW);
      return transferPub(await retryTransfer(args.transfer_id, await actorFor(user)));
    },
  },
};
