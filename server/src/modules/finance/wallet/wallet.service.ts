import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import {
  WalletModel,
  WalletTransactionModel,
  WalletWithdrawalModel,
  type IWallet,
  type IWalletTransaction,
  type IWalletWithdrawal,
  type WithdrawalMethod,
} from './wallet.model';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { UserModel } from '@modules/access/user/user.model';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

const withdrawalId = () => `wd_${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const clean = (value: string | number | null | undefined, max = 160) => String(value ?? '').trim().slice(0, max);
const METHODS = new Set<string>(['UPI', 'IMPS', 'NEFT']);

/** Next disbursement date for a payout mode, from the configured cycle. */
export function nextPayoutDate(mode: string, dayOfWeek: number, time: string, now = new Date()): Date {
  const [h, m] = (time || '18:00').split(':').map((x) => Number(x) || 0);
  if (mode === 'WEEKLY') {
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    let diff = (dayOfWeek - d.getDay() + 7) % 7;
    if (diff === 0 && d <= now) diff = 7;
    d.setDate(d.getDate() + diff);
    return d;
  }
  if (mode === 'MONTH_END') {
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, h, m, 0, 0);
    return end <= now ? new Date(now.getFullYear(), now.getMonth() + 2, 0, h, m, 0, 0) : end;
  }
  return now; // IMMEDIATE
}

function walletPub(doc: IWallet, fs: any) {
  return {
    balance: round2(doc.balance),
    currency_symbol: doc.currency_symbol,
    payout_mode: fs.host_payout_mode,
    next_payout_at: nextPayoutDate(fs.host_payout_mode, fs.payout_day_of_week, fs.payout_time).toISOString(),
  };
}

const txnPub = (t: IWalletTransaction) => ({
  id: String(t._id),
  type: t.type,
  amount: t.amount,
  balance_after: t.balance_after,
  source: t.source,
  reason: t.reason ?? '',
  pod_id: t.pod_id ? String(t.pod_id) : null,
  created_at: t.created_at?.toISOString?.() ?? '',
});

const withdrawalPub = (w: IWalletWithdrawal) => ({
  id: String(w._id),
  withdrawal_id: w.withdrawal_id,
  user_id: String(w.user_id),
  beneficiary_name: w.beneficiary_name ?? '',
  beneficiary_email: w.beneficiary_email ?? '',
  amount: w.amount,
  status: w.status,
  payout_method: w.payout_method,
  account_holder_name: w.account_holder_name ?? '',
  account_number: w.account_number ?? '',
  ifsc_code: w.ifsc_code ?? '',
  upi_id: w.upi_id ?? '',
  scheduled_for: w.scheduled_for?.toISOString?.() ?? '',
  reject_reason: w.reject_reason ?? '',
  requested_at: w.requested_at?.toISOString?.() ?? '',
  reviewed_at: w.reviewed_at?.toISOString?.() ?? null,
  paid_at: w.paid_at?.toISOString?.() ?? null,
  created_at: w.created_at?.toISOString?.() ?? '',
});

/** Allowlists for the shared table engine (withdrawalRequestsTable — DUNCIT TABLE CONTRACT v1). */
const WITHDRAWAL_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['withdrawal_id', 'beneficiary_name', 'beneficiary_email', 'upi_id', 'account_number'],
  sortFields: {
    beneficiary_name: 'beneficiary_name',
    amount: 'amount',
    status: 'status',
    payout_method: 'payout_method',
    scheduled_for: 'scheduled_for',
    requested_at: 'requested_at',
    created_at: 'created_at',
  },
  filterFields: {
    status: { type: 'enum' },
    payout_method: { type: 'enum' },
    amount: { type: 'number' },
    scheduled_for: { type: 'date' },
    requested_at: { type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

async function ensureWallet(userId: string, currency: string) {
  return WalletModel.findOneAndUpdate(
    { user_id: new Types.ObjectId(userId) },
    { $setOnInsert: { balance: 0, currency_symbol: currency } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export const walletService = {
  /** Credit a host's wallet for an approved pod-completion payout. Idempotent
   * per release_id so a re-review never double-credits. */
  async creditPodPayout(userId: string, amount: number, opts: { pod_id?: any; release_id?: string; reason?: string }) {
    const value = round2(amount);
    if (!Types.ObjectId.isValid(userId) || value <= 0) return;
    if (opts.release_id) {
      const exists = await WalletTransactionModel.exists({ release_id: opts.release_id, type: 'CREDIT' });
      if (exists) return;
    }
    const fs = await getFinanceSettings();
    const wallet = await WalletModel.findOneAndUpdate(
      { user_id: new Types.ObjectId(userId) },
      { $inc: { balance: value }, $setOnInsert: { currency_symbol: fs.currency_symbol } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await WalletTransactionModel.create({
      user_id: new Types.ObjectId(userId),
      type: 'CREDIT',
      amount: value,
      balance_after: round2(wallet!.balance),
      source: 'POD_COMPLETION',
      reason: opts.reason ?? 'Pod completion payout',
      pod_id: opts.pod_id ?? null,
      release_id: opts.release_id ?? null,
    });
  },

  async getMyWallet(userId: string) {
    const fs = await getFinanceSettings();
    const wallet = await ensureWallet(userId, fs.currency_symbol);
    return walletPub(wallet, fs);
  },

  async listTransactions(userId: string) {
    const docs = await WalletTransactionModel.find({ user_id: new Types.ObjectId(userId) })
      .sort({ created_at: -1 })
      .limit(200);
    return docs.map(txnPub);
  },

  async listMyWithdrawals(userId: string) {
    const docs = await WalletWithdrawalModel.find({ user_id: new Types.ObjectId(userId) })
      .sort({ created_at: -1 })
      .limit(100);
    return docs.map(withdrawalPub);
  },

  async requestWithdrawal(userId: string, input: any) {
    const amount = round2(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new GraphQLError('Withdrawal amount must be greater than 0', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const method = (METHODS.has(input.payout_method) ? input.payout_method : 'UPI') as WithdrawalMethod;
    if (method === 'UPI' ? !clean(input.upi_id) : !(clean(input.account_number) && clean(input.ifsc_code))) {
      throw new GraphQLError('Add the payout account details', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    // Atomic, overdraw-safe debit.
    const wallet = await WalletModel.findOneAndUpdate(
      { user_id: new Types.ObjectId(userId), balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { new: true }
    );
    if (!wallet) {
      throw new GraphQLError('Insufficient wallet balance', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const fs = await getFinanceSettings();
    const user = await UserModel.findById(userId).select('auth.email profile.first_name profile.last_name');
    const name = [user?.profile?.first_name, user?.profile?.last_name].filter(Boolean).join(' ').trim();
    const doc = await WalletWithdrawalModel.create({
      withdrawal_id: withdrawalId(),
      user_id: new Types.ObjectId(userId),
      beneficiary_name: name || user?.auth?.email || 'Host',
      beneficiary_email: user?.auth?.email ?? '',
      amount,
      payout_method: method,
      account_holder_name: clean(input.account_holder_name),
      account_number: clean(input.account_number, 40),
      ifsc_code: clean(input.ifsc_code, 20),
      upi_id: clean(input.upi_id, 120),
      scheduled_for: nextPayoutDate(fs.host_payout_mode, fs.payout_day_of_week, fs.payout_time),
    });
    await WalletTransactionModel.create({
      user_id: new Types.ObjectId(userId),
      type: 'DEBIT',
      amount,
      balance_after: round2(wallet.balance),
      source: 'WITHDRAWAL',
      reason: 'Withdrawal requested',
      withdrawal_id: doc.withdrawal_id,
    });
    return withdrawalPub(doc);
  },

  async listAllWithdrawals(status?: string | null) {
    const query: any = {};
    if (status) query.status = status;
    const docs = await WalletWithdrawalModel.find(query).sort({ created_at: -1 }).limit(300);
    return docs.map(withdrawalPub);
  },

  /** Server-side table page (search/filter/sort/paginate) for the withdrawalRequestsTable query. */
  async withdrawalsTable(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IWalletWithdrawal>(
      WalletWithdrawalModel,
      {},
      input,
      WITHDRAWAL_TABLE_CONFIG
    );
    return { rows: docs.map(withdrawalPub), total, page, page_size };
  },

  async reviewWithdrawal(id: string, status: string, reason: string | undefined, reviewerId?: string | null) {
    const doc = await WalletWithdrawalModel.findById(id);
    if (!doc) throw new GraphQLError('Withdrawal not found', { extensions: { code: 'NOT_FOUND' } });
    if (doc.status !== 'PENDING') {
      throw new GraphQLError('Only pending withdrawals can be reviewed', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    if (!['PAID', 'REJECTED'].includes(status)) {
      throw new GraphQLError('Select PAID or REJECTED', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    if (status === 'REJECTED') {
      const cleaned = clean(reason, 500);
      if (!cleaned) throw new GraphQLError('A reason is required to reject', { extensions: { code: 'BAD_USER_INPUT' } });
      // Refund the held amount back to the wallet.
      const wallet = await WalletModel.findOneAndUpdate(
        { user_id: doc.user_id },
        { $inc: { balance: doc.amount } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      await WalletTransactionModel.create({
        user_id: doc.user_id,
        type: 'CREDIT',
        amount: doc.amount,
        balance_after: round2(wallet!.balance),
        source: 'WITHDRAWAL_REVERSAL',
        reason: `Withdrawal rejected: ${cleaned}`,
        withdrawal_id: doc.withdrawal_id,
      });
      doc.reject_reason = cleaned;
    }
    doc.status = status as IWalletWithdrawal['status'];
    doc.reviewed_by = reviewerId ? new Types.ObjectId(reviewerId) : null;
    doc.reviewed_at = new Date();
    if (status === 'PAID') doc.paid_at = new Date();
    await doc.save();
    return withdrawalPub(doc);
  },
};
