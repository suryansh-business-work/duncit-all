import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { assertPayoutsConfigured, destinationOf, idempotencyKeyFor, type PayoutPayee } from './payout.dispatch';
import { recordPayoutEvent, type PayoutActor } from './payout.audit';
import { normalizeBankAccountInput } from '@modules/finance/finance/bankAccount';
import {
  customAccount,
  matchVerified,
  verifiedAccountsFor,
  type CustomAccountInput,
  type VerifiedAccount,
} from './payout.accounts';
import { runClaimedPayout } from './payout.run';
import { refreshPayoutStatus } from './payout.refresh';
import {
  SEND_MONEY_CATEGORIES,
  SendMoneyTransferModel,
  type ISendMoneyTransfer,
  type SendMoneyCategory,
} from './payout.model';
import type { PayoutPurpose } from './razorpayX.gateway';

/**
 * Send Money — a one-off transfer from Finance to a person's VERIFIED account:
 * salary, a manual refund, a reimbursement, an adjustment.
 *
 * By default the form picks one of the accounts Duncit has verified for that
 * person ({@link verifiedAccountsFor}) by id, and the server re-reads it, so a
 * tampered request cannot point the money anywhere else. Finance may instead
 * type a bank account or UPI ID ({@link customAccount}); that is refused unless
 * they state they checked it, and the transfer is recorded as CUSTOM.
 * The form mints a `request_id` when it opens; a double click, a second tab or a
 * retried request carries the same one and finds the transfer already made.
 */

export interface SendMoneyInput {
  requestId: string;
  recipientUserId: string;
  /** One of the recipient's verified accounts. Empty when `customAccount` is given. */
  accountId?: string | null;
  /** An account Finance typed in for this transfer, instead of a verified one. */
  customAccount?: CustomAccountInput | null;
  /** Finance's statement that they checked the typed account. Required with `customAccount`. */
  acknowledgeCustomAccount?: boolean;
  /** For a verified bank account: IMPS or NEFT. A UPI account is always UPI. */
  payoutMethod?: 'IMPS' | 'NEFT' | null;
  amount: number;
  category: SendMoneyCategory;
  reason: string;
  notes?: string | null;
  supportingReference?: string | null;
  supportingUrl?: string | null;
  actor: PayoutActor;
}

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const clean = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
const transferId = () => `sm_${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
const badInput = (message: string, field: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT', field } });

/** Razorpay's payout `purpose` for each category. Pure. */
const PURPOSE: Record<SendMoneyCategory, PayoutPurpose> = {
  SALARY: 'salary',
  REFUND: 'refund',
  REIMBURSEMENT: 'vendor bill',
  ADJUSTMENT: 'payout',
  OTHER: 'payout',
};

/** Field-level validation, before any lookup or lock. Pure. */
export function validateSendMoney(input: SendMoneyInput) {
  const amount = round2(input.amount);
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(input.requestId)) throw badInput('The request id is missing or malformed.', 'request_id');
  if (!Types.ObjectId.isValid(input.recipientUserId)) throw badInput('Select who to send money to.', 'recipient_user_id');
  if (input.accountId && input.customAccount) {
    throw badInput('Pay either a verified account or an account you enter, not both.', 'account_id');
  }
  if (!input.accountId && !input.customAccount) throw badInput('Select the bank account to pay.', 'account_id');
  if (input.customAccount && input.acknowledgeCustomAccount !== true) {
    throw badInput('Confirm you have checked the account details to continue.', 'acknowledge_custom_account');
  }
  if (!Number.isFinite(amount) || amount < 1) throw badInput('Enter an amount of at least 1.', 'amount');
  if (!SEND_MONEY_CATEGORIES.includes(input.category)) throw badInput('Select a payment category.', 'category');
  const reason = clean(input.reason, 300);
  if (reason.length < 3) throw badInput('A reason is required.', 'reason');
  return {
    amount,
    reason,
    notes: clean(input.notes, 1000),
    supportingReference: clean(input.supportingReference, 120),
    supportingUrl: clean(input.supportingUrl, 500),
  };
}

const phoneOf = (phone?: { extension?: string; number?: string } | null) =>
  phone?.number ? `${phone.extension ?? ''}${phone.number}` : '';

async function recipientOf(userId: string) {
  const user = await UserModel.findById(userId)
    .select('auth.email profile.first_name profile.last_name phone')
    .lean<{
      auth?: { email?: string };
      profile?: { first_name?: string; last_name?: string };
      phone?: { extension?: string; number?: string };
    }>();
  if (!user) throw badInput('That person could not be found.', 'recipient_user_id');
  const name = [user.profile?.first_name, user.profile?.last_name].filter(Boolean).join(' ').trim();
  return { name: name || user.auth?.email || 'Recipient', email: user.auth?.email ?? '', phone: phoneOf(user.phone) };
}

/**
 * UPI is always UPI. A bank account is paid by the method the person sending
 * chose — on the typed account itself, or in the form for a verified one — and
 * IMPS when nothing was chosen. Pure.
 */
const methodFor = (account: VerifiedAccount, input: SendMoneyInput): 'UPI' | 'IMPS' | 'NEFT' => {
  if (account.payout_method === 'UPI') return 'UPI';
  const typed = normalizeBankAccountInput(input.customAccount ?? {}).payout_method;
  if (typed === 'IMPS' || typed === 'NEFT') return typed;
  return input.payoutMethod ?? 'IMPS';
};

/**
 * Where the money goes: the chosen verified account, re-read from its record, or
 * the account Finance typed in. A typed account that turns out to BE one of the
 * person's verified accounts is recorded as that one, so the log says it was
 * on file; anything else stays CUSTOM.
 */
async function destinationAccount(input: SendMoneyInput): Promise<VerifiedAccount> {
  const verified = await verifiedAccountsFor(input.recipientUserId);
  if (input.customAccount) {
    const typed = customAccount(input.customAccount);
    return { ...typed, source: matchVerified(verified, typed)?.source ?? 'CUSTOM' };
  }
  const account = verified.find((a) => a.id === input.accountId);
  if (!account) throw badInput('That account is not a verified account for this person.', 'account_id');
  return account;
}

const payeeOf = (row: ISendMoneyTransfer): PayoutPayee => ({
  name: row.recipient_name,
  email: row.recipient_email,
  method: row.payout_method,
  account_holder_name: row.account_holder_name,
  account_number: row.account_number,
  ifsc_code: row.ifsc_code,
  upi_id: row.upi_id,
});

const isDuplicate = (error: unknown) => (error as { code?: number } | null)?.code === 11000;

/** The transfer a repeated request id already made — only if it really is the same request. */
async function existingFor(input: SendMoneyInput, amount: number): Promise<ISendMoneyTransfer | null> {
  const prior = await SendMoneyTransferModel.findOne({ request_id: input.requestId });
  if (!prior) return null;
  if (String(prior.recipient_user_id) !== input.recipientUserId || prior.amount !== amount) {
    throw badInput('This request id was already used for a different transfer.', 'request_id');
  }
  return prior;
}

export async function sendMoney(input: SendMoneyInput): Promise<ISendMoneyTransfer> {
  const fields = validateSendMoney(input);
  const prior = await existingFor(input, fields.amount);
  if (prior) return prior;

  await assertPayoutsConfigured();
  const recipient = await recipientOf(input.recipientUserId);
  const account = await destinationAccount(input);
  const method = methodFor(account, input);
  destinationOf({
    name: recipient.name,
    email: recipient.email,
    method,
    account_holder_name: account.account_holder_name,
    account_number: account.account_number,
    ifsc_code: account.ifsc_code,
    upi_id: account.upi_id,
  });

  const id = transferId();
  const now = new Date();
  let row: ISendMoneyTransfer;
  try {
    row = await SendMoneyTransferModel.create({
      transfer_id: id,
      request_id: input.requestId,
      recipient_user_id: new Types.ObjectId(input.recipientUserId),
      recipient_name: recipient.name,
      recipient_email: recipient.email,
      recipient_phone: recipient.phone,
      amount: fields.amount,
      category: input.category,
      reason: fields.reason,
      notes: fields.notes,
      supporting_reference: fields.supportingReference,
      supporting_url: fields.supportingUrl,
      payout_method: method,
      account_holder_name: account.account_holder_name,
      account_number: account.account_number,
      ifsc_code: account.ifsc_code,
      upi_id: account.upi_id,
      account_source: account.source,
      initiated_by: input.actor.id ? new Types.ObjectId(input.actor.id) : undefined,
      initiated_by_name: input.actor.name,
      // Single-step authorisation: the Finance Manager who sends it is the one who approves it.
      approved_by: input.actor.id ? new Types.ObjectId(input.actor.id) : null,
      approved_by_name: input.actor.name,
      payout: {
        status: 'PROCESSING',
        attempt: 1,
        idempotency_key: idempotencyKeyFor(id, 1),
        initiated_by: input.actor.id ? new Types.ObjectId(input.actor.id) : null,
        initiated_at: now,
      },
    });
  } catch (error) {
    // Two requests with one request id raced: the loser reads the winner's transfer.
    if (isDuplicate(error)) {
      const winner = await existingFor(input, fields.amount);
      if (winner) return winner;
    }
    throw error;
  }
  await recordPayoutEvent({
    kind: 'SEND_MONEY',
    subjectId: row.transfer_id,
    action: 'TRANSFER_CREATED',
    userId: row.recipient_user_id,
    userName: row.recipient_name,
    requestedAmount: row.amount,
    approvedAmount: row.amount,
    reason: row.reason,
    actor: input.actor,
    paymentStatus: 'PROCESSING',
    dedupeKey: `sm:${row.transfer_id}:created`,
  });
  await sendTransferPayout(row.transfer_id, input.actor);
  return (await SendMoneyTransferModel.findById(row._id)) ?? row;
}

export async function sendTransferPayout(id: string, actor: PayoutActor): Promise<void> {
  const row = await SendMoneyTransferModel.findOne({ transfer_id: id });
  if (!row) return;
  await runClaimedPayout({
    kind: 'SEND_MONEY',
    model: SendMoneyTransferModel,
    idField: 'transfer_id',
    recordId: id,
    payee: payeeOf(row),
    amount: row.amount,
    purpose: PURPOSE[row.category],
    narration: 'Duncit payment',
    actor,
    audit: { userId: String(row.recipient_user_id), userName: row.recipient_name, requestedAmount: row.amount },
  });
}

/** Retry a transfer whose payout failed (new attempt) or stalled (same key / refresh). */
export async function retryTransfer(id: string, actor: PayoutActor): Promise<ISendMoneyTransfer> {
  const row = await SendMoneyTransferModel.findOne({ transfer_id: id });
  if (!row) throw new GraphQLError('Transfer not found', { extensions: { code: 'NOT_FOUND' } });
  const payout = row.payout;
  if (payout.status === 'PAID') {
    throw new GraphQLError('This transfer is already paid.', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  await assertPayoutsConfigured();
  if (payout.status === 'PROCESSING' && payout.razorpay_payout_id) {
    await refreshPayoutStatus('SEND_MONEY', id, actor);
  } else if (payout.status === 'PROCESSING') {
    await sendTransferPayout(id, actor);
  } else {
    const attempt = payout.attempt + 1;
    const claimed = await SendMoneyTransferModel.findOneAndUpdate(
      { transfer_id: id, 'payout.status': 'FAILED', 'payout.attempt': payout.attempt },
      {
        $set: {
          'payout.status': 'PROCESSING',
          'payout.attempt': attempt,
          'payout.idempotency_key': idempotencyKeyFor(id, attempt),
          'payout.razorpay_payout_id': '',
          'payout.failure_reason': '',
          'payout.initiated_by': actor.id ? new Types.ObjectId(actor.id) : null,
          'payout.initiated_at': new Date(),
          'payout.completed_at': null,
        },
      },
      { new: true }
    );
    if (claimed) await sendTransferPayout(id, actor);
  }
  return (await SendMoneyTransferModel.findOne({ transfer_id: id })) ?? row;
}
