import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { withTransaction } from '@utils/mongoTransaction';
import { WalletWithdrawalModel, type IWalletWithdrawal } from '@modules/finance/wallet/wallet.model';
import { refundWithdrawal } from '@modules/finance/wallet/wallet.service';
import { trimAllocations } from '@modules/finance/wallet/withdrawal-allocation';
import { assertPayoutsConfigured, destinationOf, idempotencyKeyFor, type PayoutPayee } from './payout.dispatch';
import { runClaimedPayout } from './payout.run';
import { recordPayoutEvent, type PayoutActor } from './payout.audit';
import { matchVerified, verifiedAccountsFor, type VerifiedAccount } from './payout.accounts';
import { notifyMoneyOut } from './payout.notify';
import { approvalOf } from './withdrawal.state';

/**
 * Finance's decision on a withdrawal: approve, partially approve, or reject.
 *
 * The money was taken out of the wallet when the person asked, so:
 *   - REJECT hands all of it back,
 *   - PARTIAL hands back what was not approved and pays the rest,
 *   - APPROVE pays all of it.
 * The decision, the refund, the ledger row, the audit row and the CLAIM on the
 * payout (PROCESSING under a fresh idempotency key) are ONE transaction. The
 * call to RazorpayX comes after it commits: two Finance Managers deciding the
 * same row conflict on it, and the loser finds it no longer pending — so a
 * withdrawal can never be approved twice or paid twice.
 */

export type WithdrawalDecision = 'APPROVE' | 'PARTIAL' | 'REJECT';

export interface DecideInput {
  /** The withdrawal's document id. */
  id: string;
  decision: WithdrawalDecision;
  approvedAmount?: number | null;
  reason?: string | null;
  /** Finance confirms paying an account that is not on a verified record. */
  acknowledgeUnverifiedAccount?: boolean;
  actor: PayoutActor;
}

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const clean = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);

const badInput = (message: string, field: string, code = 'BAD_USER_INPUT') =>
  new GraphQLError(message, { extensions: { code, field } });

/** Reason and amount rules, checked before anything is read or locked. Pure. */
export function validateDecision(input: Pick<DecideInput, 'decision' | 'approvedAmount' | 'reason'>, requested: number) {
  const reason = clean(input.reason, 500);
  if (input.decision !== 'APPROVE' && reason.length < 3) {
    throw badInput(
      input.decision === 'REJECT' ? 'A reason is required to reject a withdrawal.' : 'A reason is required to partially approve a withdrawal.',
      'reason'
    );
  }
  if (input.decision !== 'PARTIAL') return { reason, approved: requested };
  const approved = round2(input.approvedAmount ?? NaN);
  if (!Number.isFinite(approved) || approved <= 0) {
    throw badInput('Enter the amount to approve.', 'approved_amount');
  }
  if (approved < 1) {
    throw badInput('The smallest amount that can be approved is 1.', 'approved_amount');
  }
  if (approved >= requested) {
    throw badInput('A partial approval must be less than the requested amount. Use Accept to approve it in full.', 'approved_amount');
  }
  return { reason, approved };
}

const payeeOf = (row: IWalletWithdrawal): PayoutPayee => ({
  name: row.beneficiary_name,
  email: row.beneficiary_email,
  method: row.payout_method,
  account_holder_name: row.account_holder_name,
  account_number: row.account_number,
  ifsc_code: row.ifsc_code,
  upi_id: row.upi_id,
});

/**
 * A withdrawal can be decided while it is still PENDING. The one exception is a
 * REJECT of an approved withdrawal whose payout FAILED: nothing was ever paid,
 * so Finance may give up on it and return the approved amount to the wallet.
 */
export function canDecide(row: IWalletWithdrawal, decision: WithdrawalDecision): boolean {
  if (row.status !== 'PENDING') return false;
  if (approvalOf(row) === 'PENDING') return true;
  return decision === 'REJECT' && row.payout?.status === 'FAILED';
}

const notDecidable = () =>
  new GraphQLError('This withdrawal can no longer be decided.', { extensions: { code: 'BAD_USER_INPUT' } });

async function loadDecidable(id: string, decision: WithdrawalDecision): Promise<IWalletWithdrawal> {
  const row = Types.ObjectId.isValid(id) ? await WalletWithdrawalModel.findById(id) : null;
  if (!row) throw new GraphQLError('Withdrawal not found', { extensions: { code: 'NOT_FOUND' } });
  if (!canDecide(row, decision)) throw notDecidable();
  return row;
}

/** Paying an account that is not on a verified record needs Finance to say so, out loud. */
export async function checkAccount(row: IWalletWithdrawal, acknowledge: boolean): Promise<VerifiedAccount | null> {
  destinationOf(payeeOf(row)); // throws a field-level error for a malformed account
  const verified = matchVerified(await verifiedAccountsFor(String(row.user_id)), row);
  if (!verified && !acknowledge) {
    throw badInput(
      'This account is not on a verified Duncit record. Confirm you have checked it to continue.',
      'acknowledge_unverified_account',
      'UNVERIFIED_ACCOUNT'
    );
  }
  return verified;
}

export async function decideWithdrawal(input: DecideInput): Promise<IWalletWithdrawal> {
  const pending = await loadDecidable(input.id, input.decision);
  const requested = pending.requested_amount ?? pending.amount;
  const { reason, approved } = validateDecision(input, requested);
  const paying = input.decision !== 'REJECT';
  if (paying) {
    await assertPayoutsConfigured();
    await checkAccount(pending, input.acknowledgeUnverifiedAccount === true);
  }

  const now = new Date();
  const row = await withTransaction(async (session) => {
    const doc = await WalletWithdrawalModel.findById(input.id).session(session ?? null);
    if (!doc) throw new GraphQLError('Withdrawal not found', { extensions: { code: 'NOT_FOUND' } });
    if (!canDecide(doc, input.decision)) throw notDecidable();
    // The claim: one conditional write that only ONE of two simultaneous
    // decisions can win. The read above is a convenience; this is the lock, and
    // it holds on a topology without transactions too.
    const target = { APPROVE: 'APPROVED', PARTIAL: 'PARTIALLY_APPROVED', REJECT: 'REJECTED' }[input.decision];
    const claimed = await WalletWithdrawalModel.updateOne(
      {
        _id: doc._id,
        status: 'PENDING',
        $or: [
          { approval_status: { $in: [null, 'PENDING'] } },
          ...(input.decision === 'REJECT' ? [{ 'payout.status': 'FAILED' }] : []),
        ],
      },
      { $set: { approval_status: target } },
      { session }
    );
    if (claimed.matchedCount === 0) throw notDecidable();
    doc.requested_amount ??= doc.amount;
    doc.decision_reason = reason;
    doc.reviewed_by = input.actor.id ? new Types.ObjectId(input.actor.id) : null;
    doc.reviewed_by_name = input.actor.name;
    doc.reviewed_at = now;

    if (input.decision === 'REJECT') {
      await refundWithdrawal(doc, reason, session);
      doc.reject_reason = reason;
      doc.set('allocations', []);
      doc.status = 'REJECTED';
      doc.approval_status = 'REJECTED';
      doc.approved_amount = null;
    } else {
      if (input.decision === 'PARTIAL') {
        await refundWithdrawal(doc, reason, session, {
          amount: round2(doc.amount - approved),
          label: 'Withdrawal partially approved',
        });
        doc.set(
          'allocations',
          trimAllocations(
            doc.allocations.map((a) => a.toObject()),
            approved
          )
        );
        doc.amount = approved;
      }
      doc.approval_status = input.decision === 'PARTIAL' ? 'PARTIALLY_APPROVED' : 'APPROVED';
      doc.approved_amount = doc.amount;
      // The claim: from here on this record is being paid, under this key.
      doc.payout = {
        status: 'PROCESSING',
        razorpay_contact_id: '',
        razorpay_fund_account_id: '',
        razorpay_payout_id: '',
        utr: '',
        failure_reason: '',
        attempt: 1,
        idempotency_key: idempotencyKeyFor(doc.withdrawal_id, 1),
        initiated_by: doc.reviewed_by,
        initiated_at: now,
        completed_at: null,
      };
    }
    await doc.save({ session });
    await recordPayoutEvent(
      {
        kind: 'WITHDRAWAL',
        subjectId: doc.withdrawal_id,
        action: { APPROVE: 'APPROVED', PARTIAL: 'PARTIALLY_APPROVED', REJECT: 'REJECTED' }[input.decision] as
          | 'APPROVED'
          | 'PARTIALLY_APPROVED'
          | 'REJECTED',
        userId: doc.user_id,
        userName: doc.beneficiary_name,
        requestedAmount: doc.requested_amount ?? requested,
        approvedAmount: input.decision === 'REJECT' ? null : doc.amount,
        reason,
        actor: input.actor,
        paymentStatus: input.decision === 'REJECT' ? 'REJECTED' : 'PROCESSING',
        dedupeKey: `wd:${doc.withdrawal_id}:decision`,
      },
      session
    );
    return doc;
  });

  await notifyDecision(row, input.decision, requested, reason);
  if (paying) await sendWithdrawalPayout(row.withdrawal_id, input.actor);
  return (await WalletWithdrawalModel.findById(row._id)) ?? row;
}

function notifyDecision(row: IWalletWithdrawal, decision: WithdrawalDecision, requested: number, reason: string) {
  const base = { recordId: row.withdrawal_id, userId: String(row.user_id), name: row.beneficiary_name, email: row.beneficiary_email };
  if (decision === 'REJECT') {
    return notifyMoneyOut({ ...base, notice: 'WITHDRAWAL_REJECTED', vars: { requested, reason } });
  }
  return notifyMoneyOut({
    ...base,
    notice: decision === 'PARTIAL' ? 'WITHDRAWAL_PARTIALLY_APPROVED' : 'WITHDRAWAL_APPROVED',
    vars: { requested, approved: row.amount, reason, paymentStatus: 'Processing' },
  });
}

/**
 * Send the claimed payout to RazorpayX, then record what came back.
 *
 * Safe to call again for the same record: the idempotency key is stored on it,
 * so a resend of an attempt Razorpay already took returns that payout.
 */
export async function sendWithdrawalPayout(withdrawalId: string, actor: PayoutActor): Promise<void> {
  const row = await WalletWithdrawalModel.findOne({ withdrawal_id: withdrawalId });
  if (!row) return;
  await runClaimedPayout({
    kind: 'WITHDRAWAL',
    model: WalletWithdrawalModel,
    idField: 'withdrawal_id',
    recordId: withdrawalId,
    payee: payeeOf(row),
    amount: row.amount,
    purpose: 'payout',
    narration: 'Duncit withdrawal',
    actor,
    audit: { userId: String(row.user_id), userName: row.beneficiary_name, requestedAmount: row.requested_amount ?? row.amount },
  });
}
