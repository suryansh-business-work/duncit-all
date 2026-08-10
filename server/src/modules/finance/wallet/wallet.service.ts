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
import {
  getFinanceSettings,
  getMinWithdrawals,
  setMinWithdrawals,
  MIN_WITHDRAWAL_FIELD,
  type IFinanceSettings,
  type IMinWithdrawal,
  type WithdrawerRole,
} from '@modules/finance/finance/finance.model';
import { UserModel } from '@modules/access/user/user.model';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';

const withdrawalId = () => `wd_${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const clean = (value: string | number | null | undefined, max = 160) => String(value ?? '').trim().slice(0, max);
const METHODS = new Set<string>(['UPI', 'IMPS', 'NEFT']);

/**
 * Withdrawer-role precedence, most specific capacity first.
 *
 * A user can hold several of these at once — a venue owner who also runs pods
 * holds HOST too — but there is ONE wallet and one balance, so exactly one
 * minimum has to apply. The order is FIXED and never derived from the
 * configured amounts: the role is stamped on the payout record permanently, so
 * picking "whichever role has the cheapest floor today" would make the stamped
 * role change meaning the moment Finance edits a setting. HOST comes last
 * because almost every earning user also holds it, so leading with it would
 * collapse every partner into the host floor.
 */
const WITHDRAWER_ROLE_PRECEDENCE: WithdrawerRole[] = ['VENUE_OWNER', 'CLUB_ADMIN', 'ECOMM_MANAGER', 'HOST'];

/** Ticket wording for the four capacities — used in the eligibility errors. */
const WITHDRAWER_ROLE_LABEL: Record<WithdrawerRole, string> = {
  HOST: 'Host',
  VENUE_OWNER: 'Venue Owner',
  ECOMM_MANAGER: 'E-Commerce Brand',
  CLUB_ADMIN: 'Club Admin',
};

/** First precedence match, HOST when the user holds none of the four. */
function resolveWithdrawerRole(roleKeys: readonly string[]): WithdrawerRole {
  const held = new Set(roleKeys);
  return WITHDRAWER_ROLE_PRECEDENCE.find((role) => held.has(role)) ?? 'HOST';
}

async function withdrawerRoleOf(userId: string): Promise<WithdrawerRole> {
  const user = await UserModel.findById(userId).select('metadata.role_keys').lean();
  return resolveWithdrawerRole((user as any)?.metadata?.role_keys ?? []);
}

const minimumFor = (minimums: IMinWithdrawal, role: WithdrawerRole) =>
  round2(minimums[MIN_WITHDRAWAL_FIELD[role]]);

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

function walletPub(doc: IWallet, fs: IFinanceSettings, role: WithdrawerRole, minimum: number) {
  const balance = round2(doc.balance);
  return {
    balance,
    currency_symbol: doc.currency_symbol,
    payout_mode: fs.host_payout_mode,
    next_payout_at: nextPayoutDate(fs.host_payout_mode, fs.payout_day_of_week, fs.payout_time).toISOString(),
    withdrawer_role: role,
    min_withdrawal_amount: minimum,
    // The eligibility answer itself, so mWeb and native disable the Withdraw
    // button on exactly the rule requestWithdrawal enforces instead of each
    // re-implementing the comparison.
    can_withdraw: balance >= minimum,
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
  withdrawer_role: w.withdrawer_role ?? 'HOST',
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
    withdrawer_role: 'withdrawer_role',
    scheduled_for: 'scheduled_for',
    requested_at: 'requested_at',
    created_at: 'created_at',
  },
  filterFields: {
    status: { type: 'enum' },
    payout_method: { type: 'enum' },
    withdrawer_role: { type: 'enum' },
    amount: { type: 'number' },
    scheduled_for: { type: 'date' },
    requested_at: { type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

/**
 * The role-wise minimum-withdrawal gate. WHAT IS COMPARED, spelled out because
 * getting it wrong is the whole feature:
 *
 *  1. BALANCE >= minimum — the ticket's rule verbatim: a withdrawer may only
 *     initiate a withdrawal once their TOTAL WITHDRAWABLE AMOUNT has reached
 *     the floor configured for their role. This is the number
 *     `myWallet.can_withdraw` reports, so the apps gate on exactly this.
 *  2. AMOUNT >= minimum — a floor that only checked the balance would let
 *     someone sitting on ₹5,000 raise twenty ₹250 payouts, i.e. twenty bank
 *     transfers below the floor the setting exists to prevent. A "Minimum
 *     Withdrawal Amount" is a floor on the payout, not merely on the balance.
 *
 * The minimum is read at REQUEST time and never re-read afterwards: changing a
 * minimum must not re-gate or invalidate an already-submitted request, which
 * keeps the amount and role it was created with.
 */
function assertWithdrawalEligible(args: {
  balance: number;
  amount: number;
  minimum: number;
  role: WithdrawerRole;
  currency: string;
}) {
  const { balance, amount, minimum, role, currency } = args;
  if (minimum <= 0) return;
  const floor = `${currency}${minimum}`;
  if (balance < minimum) {
    throw new GraphQLError(
      `A ${WITHDRAWER_ROLE_LABEL[role]} can withdraw once the wallet balance reaches ${floor}. Available: ${currency}${balance}.`,
      { extensions: { code: 'BAD_USER_INPUT' } }
    );
  }
  if (amount < minimum) {
    throw new GraphQLError(`The minimum withdrawal for a ${WITHDRAWER_ROLE_LABEL[role]} is ${floor}.`, {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
}

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
    const [wallet, minimums, role] = await Promise.all([
      ensureWallet(userId, fs.currency_symbol),
      getMinWithdrawals(),
      withdrawerRoleOf(userId),
    ]);
    return walletPub(wallet, fs, role, minimumFor(minimums, role));
  },

  /** Role-wise minimum withdrawal amounts (Finance → Withdrawal Settings). */
  async getWithdrawalMinimums() {
    return getMinWithdrawals();
  },

  /** Patch one or more role minimums; roles left out keep their stored value. */
  async updateWithdrawalMinimums(input: Partial<IMinWithdrawal>) {
    const patch: Partial<IMinWithdrawal> = {};
    for (const field of Object.values(MIN_WITHDRAWAL_FIELD)) {
      const value = input?.[field];
      if (value === undefined || value === null) continue;
      if (!Number.isFinite(value) || value < 0) {
        throw new GraphQLError(`${field} minimum must be 0 or more`, { extensions: { code: 'BAD_USER_INPUT' } });
      }
      patch[field] = round2(value);
    }
    return setMinWithdrawals(patch);
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
    const fs = await getFinanceSettings();
    const user: any = await UserModel.findById(userId).select(
      'auth.email profile.first_name profile.last_name metadata.role_keys'
    );
    const [minimums, current] = await Promise.all([
      getMinWithdrawals(),
      ensureWallet(userId, fs.currency_symbol),
    ]);
    const role = resolveWithdrawerRole(user?.metadata?.role_keys ?? []);
    const minimum = minimumFor(minimums, role);
    assertWithdrawalEligible({
      balance: round2(current.balance),
      amount,
      minimum,
      role,
      currency: fs.currency_symbol,
    });
    // Atomic, overdraw-safe debit. The floor rides in the filter as well as in
    // the guard above so two concurrent requests cannot both pass the read and
    // leave the balance under the minimum.
    const wallet = await WalletModel.findOneAndUpdate(
      { user_id: new Types.ObjectId(userId), balance: { $gte: Math.max(amount, minimum) } },
      { $inc: { balance: -amount } },
      { new: true }
    );
    if (!wallet) {
      throw new GraphQLError('Insufficient wallet balance', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const name = [user?.profile?.first_name, user?.profile?.last_name].filter(Boolean).join(' ').trim();
    const doc = await WalletWithdrawalModel.create({
      withdrawal_id: withdrawalId(),
      user_id: new Types.ObjectId(userId),
      beneficiary_name: name || user?.auth?.email || 'Host',
      beneficiary_email: user?.auth?.email ?? '',
      amount,
      withdrawer_role: role,
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
        // Clamped to the transaction's own 300-char `reason` limit: a 500-char
        // reject reason made this insert fail validation AFTER the wallet had
        // already been credited, leaving the row PENDING with the money back —
        // and every retry credited it again.
        reason: clean(`Withdrawal rejected: ${cleaned}`, 300),
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
