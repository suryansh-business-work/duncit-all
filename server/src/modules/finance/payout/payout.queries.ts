import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { runTableQuery, escapedSearchRegex, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { UserModel } from '@modules/access/user/user.model';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { WalletModel, WalletWithdrawalModel } from '@modules/finance/wallet/wallet.model';
import { withdrawalPub } from '@modules/finance/wallet/wallet.service';
import { matchVerified, verifiedAccountsFor } from './payout.accounts';
import { isPayoutConfigured } from './razorpayX.gateway';
import {
  PayoutEventModel,
  SEND_MONEY_CATEGORIES,
  SendMoneyTransferModel,
  type IPayoutEvent,
  type ISendMoneyTransfer,
  type PayoutSubjectKind,
} from './payout.model';
import { displayStatusOf } from './withdrawal.state';

/** The read side of withdrawals review, the audit trail and Send Money. */

const iso = (date?: Date | null) => date?.toISOString?.() ?? null;

export async function withdrawalReview(withdrawalId: string) {
  const row = Types.ObjectId.isValid(withdrawalId) ? await WalletWithdrawalModel.findById(withdrawalId) : null;
  if (!row) throw new GraphQLError('Withdrawal not found', { extensions: { code: 'NOT_FOUND' } });
  const [accounts, settings, wallet, configured] = await Promise.all([
    verifiedAccountsFor(String(row.user_id)),
    getFinanceSettings(),
    WalletModel.findOne({ user_id: row.user_id }).select('balance').lean(),
    isPayoutConfigured(),
  ]);
  const verified = matchVerified(accounts, row);
  return {
    withdrawal: withdrawalPub(row),
    verified_account: verified,
    account_verified: verified !== null,
    payouts_configured: configured,
    wallet_balance: wallet?.balance ?? 0,
    currency_symbol: settings.currency_symbol,
  };
}

// --- Audit trail ------------------------------------------------------------

const AUDIT_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['subject_id', 'user_name', 'actor_name', 'razorpay_payout_id', 'utr', 'reason'],
  sortFields: {
    created_at: 'created_at',
    requested_amount: 'requested_amount',
    approved_amount: 'approved_amount',
    action: 'action',
    user_name: 'user_name',
    actor_name: 'actor_name',
  },
  filterFields: {
    action: { type: 'enum' },
    payment_status: { type: 'enum' },
    user_name: { type: 'string' },
    actor_name: { type: 'string' },
    requested_amount: { type: 'number' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

const auditPub = (e: IPayoutEvent) => ({
  id: String(e._id),
  subject: e.subject_kind,
  subject_id: e.subject_id,
  action: e.action,
  user_id: String(e.user_id),
  user_name: e.user_name,
  requested_amount: e.requested_amount,
  approved_amount: e.approved_amount ?? null,
  reason: e.reason,
  actor_id: e.actor_id ? String(e.actor_id) : null,
  actor_name: e.actor_name,
  actor_role: e.actor_role,
  payment_status: e.payment_status,
  razorpay_payout_id: e.razorpay_payout_id,
  utr: e.utr,
  created_at: iso(e.created_at) ?? '',
});

export async function payoutAuditTable(kind: PayoutSubjectKind, input?: TableQueryInput | null) {
  const { docs, total, page, page_size } = await runTableQuery<IPayoutEvent>(
    PayoutEventModel,
    { subject_kind: kind },
    input,
    AUDIT_TABLE_CONFIG
  );
  return { rows: docs.map(auditPub), total, page, page_size };
}

// --- Send Money -------------------------------------------------------------

const TRANSFER_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['transfer_id', 'recipient_name', 'recipient_email', 'reason', 'payout.razorpay_payout_id', 'payout.utr'],
  sortFields: {
    created_at: 'created_at',
    amount: 'amount',
    recipient_name: 'recipient_name',
    category: 'category',
    status: 'payout.status',
  },
  filterFields: {
    category: { type: 'enum' },
    status: { type: 'enum', path: 'payout.status' },
    recipient_name: { type: 'string' },
    initiated_by_name: { type: 'string' },
    amount: { type: 'number' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

export const transferPub = (t: ISendMoneyTransfer) => ({
  id: String(t._id),
  transfer_id: t.transfer_id,
  recipient_user_id: String(t.recipient_user_id),
  recipient_name: t.recipient_name,
  recipient_email: t.recipient_email,
  recipient_phone: t.recipient_phone,
  amount: t.amount,
  category: t.category,
  reason: t.reason,
  notes: t.notes,
  supporting_reference: t.supporting_reference,
  supporting_url: t.supporting_url,
  payout_method: t.payout_method,
  account_holder_name: t.account_holder_name,
  account_number: t.account_number,
  ifsc_code: t.ifsc_code,
  upi_id: t.upi_id,
  account_source: t.account_source,
  initiated_by_name: t.initiated_by_name,
  approved_by_name: t.approved_by_name,
  status: displayStatusOf('APPROVED', t.payout.status),
  payout_status: t.payout.status,
  razorpay_payout_id: t.payout.razorpay_payout_id,
  utr: t.payout.utr,
  failure_reason: t.payout.failure_reason,
  attempt: t.payout.attempt,
  created_at: iso(t.created_at) ?? '',
  completed_at: iso(t.payout.completed_at),
});

export async function sendMoneyTransfersTable(input?: TableQueryInput | null) {
  const { docs, total, page, page_size } = await runTableQuery<ISendMoneyTransfer>(
    SendMoneyTransferModel,
    {},
    input,
    TRANSFER_TABLE_CONFIG
  );
  return { rows: docs.map(transferPub), total, page, page_size };
}

const recipientFields = '_id auth.email profile.first_name profile.last_name phone';

interface RecipientDoc {
  _id: Types.ObjectId;
  auth?: { email?: string };
  profile?: { first_name?: string; last_name?: string };
  phone?: { extension?: string; number?: string };
}

const recipientBase = (u: RecipientDoc) => ({
  id: String(u._id),
  name: [u.profile?.first_name, u.profile?.last_name].filter(Boolean).join(' ').trim() || u.auth?.email || 'Unnamed',
  email: u.auth?.email ?? '',
  phone: u.phone?.number ? `${u.phone.extension ?? ''}${u.phone.number}` : '',
});

/**
 * People matching a search, for the recipient dropdown. Every word must match
 * somewhere (name, email or phone), so "meera 98" narrows instead of widening.
 * Accounts load on SELECTION, not per result — a dropdown must not fan out a
 * lookup for each of its twenty rows.
 */
export async function sendMoneyRecipients(search: string, limit?: number | null) {
  const words = search.trim().split(/\s+/).filter((w) => w.length >= 2).slice(0, 4);
  if (words.length === 0) return [];
  const users = await UserModel.find({
    $and: words.map((word) => {
      const rx = escapedSearchRegex(word);
      return { $or: [{ 'auth.email': rx }, { 'profile.first_name': rx }, { 'profile.last_name': rx }, { 'phone.number': rx }] };
    }),
  })
    .select(recipientFields)
    .limit(Math.min(Math.max(limit ?? 20, 1), 50))
    .lean<RecipientDoc[]>();
  return users.map((u) => ({ ...recipientBase(u), verified_accounts: [] as never[] }));
}

export async function sendMoneyRecipient(userId: string) {
  const user = Types.ObjectId.isValid(userId) ? await UserModel.findById(userId).select(recipientFields).lean<RecipientDoc>() : null;
  if (!user) throw new GraphQLError('That person could not be found.', { extensions: { code: 'NOT_FOUND' } });
  return { ...recipientBase(user), verified_accounts: await verifiedAccountsFor(userId) };
}

export async function sendMoneyOptions() {
  const [settings, configured] = await Promise.all([getFinanceSettings(), isPayoutConfigured()]);
  return { categories: [...SEND_MONEY_CATEGORIES], payouts_configured: configured, currency_symbol: settings.currency_symbol };
}
