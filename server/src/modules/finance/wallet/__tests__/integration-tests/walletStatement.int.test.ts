jest.mock('@observability/log', () => ({ logs: { server: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } } }));

import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { UserModel } from '@modules/access/user/user.model';
import { FinanceSettingsModel } from '@modules/finance/finance/finance.model';
import { PaymentReleaseModel } from '@modules/finance/finance/paymentRelease.model';
import { WalletModel, WalletTransactionModel, WalletWithdrawalModel } from '../../wallet.model';
import { MAX_STATEMENT_ROWS, loadWalletStatement, walletStatementService as svc } from '../../walletStatement.service';

/**
 * The partner's wallet statement: a read-only view of the ledger that must add
 * up exactly, describe each row from the records behind it, and only ever show
 * the signed-in user's own money.
 */

const period = { from: '2025-01-01', to: '2025-01-31' };
const NOW = new Date('2025-06-01T00:00:00.000Z');
const at = (day: string) => new Date(`2025-01-${day}T09:00:00.000Z`);
let seq = 0;

async function seedUser() {
  seq += 1;
  return UserModel.create({ auth: { email: `partner${seq}@x.com` }, profile: { first_name: 'Asha', last_name: 'Rao' } });
}

const txn = (userId: Types.ObjectId, over: Record<string, unknown>) =>
  WalletTransactionModel.create({
    user_id: userId,
    type: 'CREDIT',
    amount: 0,
    balance_after: 0,
    source: 'POD_COMPLETION',
    ...over,
  });

const withdrawal = (userId: Types.ObjectId, over: Record<string, unknown>) => {
  seq += 1;
  return WalletWithdrawalModel.create({
    withdrawal_id: `wd-${seq}`,
    user_id: userId,
    amount: 100,
    scheduled_for: at('20'),
    ...over,
  });
};

describe('loadWalletStatement', () => {
  it('refuses an id that is not a user id', async () => {
    await expect(loadWalletStatement('nope', period, NOW)).rejects.toMatchObject({ extensions: { code: 'UNAUTHENTICATED' } });
  });

  it('adds the period up from the opening balance and describes every row from its own records', async () => {
    const user = await seedUser();
    const other = await seedUser();
    await WalletModel.create({ user_id: user._id, currency_symbol: 'Rs' });
    await PaymentReleaseModel.create({
      release_id: 'rel-host-1',
      kind: 'HOST_PAYMENT',
      status: 'APPROVED',
      pod_id: new Types.ObjectId(),
      pod_title: 'Sunset Pod',
      host_user_id: user._id,
      beneficiary_name: 'Asha',
      beneficiary_email: 'a@x.com',
      amount_requested: 1000,
    });
    const paid = await withdrawal(user._id, { amount: 600, status: 'PAID', payout_method: 'UPI', upi_id: 'asha@okbank', paid_at: at('15') });
    const rejected = await withdrawal(user._id, { amount: 200, status: 'REJECTED', payout_method: 'NEFT', account_number: '123456789012' });
    const pending = await withdrawal(user._id, { amount: 100, payout_method: 'IMPS', account_number: '' });
    // Before the period: the balance the period opens on.
    await txn(user._id, { created_at: new Date('2024-12-20T10:00:00.000Z'), amount: 500, balance_after: 500 });
    await txn(user._id, { created_at: at('05'), amount: 1000, balance_after: 1500, release_id: 'rel-host-1' });
    await txn(user._id, { created_at: at('10'), type: 'DEBIT', source: 'WITHDRAWAL', amount: 600, balance_after: 900, withdrawal_id: paid.withdrawal_id });
    await txn(user._id, { created_at: at('12'), type: 'DEBIT', source: 'WITHDRAWAL', amount: 200, balance_after: 700, withdrawal_id: rejected.withdrawal_id });
    await txn(user._id, { created_at: at('13'), source: 'WITHDRAWAL_REVERSAL', amount: 200, balance_after: 900, reason: '', withdrawal_id: rejected.withdrawal_id });
    await txn(user._id, { created_at: at('14'), type: 'DEBIT', source: 'WITHDRAWAL', amount: 100, balance_after: 800, withdrawal_id: pending.withdrawal_id });
    // Someone else's money never appears.
    await txn(other._id, { created_at: at('06'), amount: 9999, balance_after: 9999 });

    const { statement } = await loadWalletStatement(String(user._id), period, NOW);

    expect(statement).toMatchObject({
      account_name: 'Asha Rao',
      account_email: user.auth.email,
      currency_symbol: 'Rs',
      time_zone: 'Asia/Kolkata',
      balances_reconciled: true,
      opening_balance: 500,
      closing_balance: 800,
    });
    expect(statement.rows.map((r) => r.balance)).toEqual([1500, 900, 700, 900, 800]);
    expect(statement.rows.map((r) => r.status)).toEqual(['CREDITED', 'PAID', 'REJECTED', 'REVERSED', 'PENDING']);
    expect(statement.rows[0]).toMatchObject({ credit: 1000, debit: 0, reference: 'rel-host-1', description: 'Earning credit - Host payout - Sunset Pod' });
    expect(statement.rows[1].description).toMatch(/^Withdrawal request to UPI as\*\*\*@okbank - paid /);
    expect(statement.rows[2].description).toBe('Withdrawal request to NEFT XXXXXXXX9012');
    expect(statement.rows[3].description).toBe('Withdrawal rejected - amount returned');
    expect(statement.rows[4].description).toBe('Withdrawal request to IMPS');
    expect(statement.totals).toEqual({
      transaction_count: 5,
      total_credits: 1200,
      total_debits: 900,
      earnings_credited: 1000,
      withdrawals_requested: 900,
      withdrawals_paid: 600,
      withdrawals_pending: 100,
      withdrawals_rejected: 200,
      reversals_credited: 200,
    });
    // opening + credits - debits is the closing balance.
    expect(500 + 1200 - 900).toBe(statement.closing_balance);
  });

  it('describes rows whose release or withdrawal record is missing from the ledger’s own reason', async () => {
    const user = await seedUser();
    const stranger = await seedUser();
    // A withdrawal with this id exists, but it is another user's: it must not describe this row.
    const theirs = await withdrawal(stranger._id, { amount: 50, status: 'PAID', upi_id: 'x@y' });
    await txn(user._id, { created_at: at('02'), amount: 100, balance_after: 100, reason: 'Manual correction' });
    await txn(user._id, { created_at: at('03'), amount: 50, balance_after: 150, release_id: 'rel-gone' });
    await txn(user._id, { created_at: at('04'), amount: 25, balance_after: 175, release_id: null });
    await txn(user._id, { created_at: at('05'), type: 'DEBIT', source: 'WITHDRAWAL', amount: 50, balance_after: 125, withdrawal_id: theirs.withdrawal_id, reason: 'Payout to bank' });
    await txn(user._id, { created_at: at('06'), type: 'DEBIT', source: 'WITHDRAWAL', amount: 25, balance_after: 100 });
    await txn(user._id, { created_at: at('07'), source: 'WITHDRAWAL_REVERSAL', amount: 25, balance_after: 125, reason: 'Bank returned it' });

    const { statement } = await loadWalletStatement(String(user._id), period, NOW);

    expect(statement.rows.map((r) => r.description)).toEqual([
      'Manual correction',
      'Earning credit',
      'Earning credit',
      'Payout to bank',
      'Withdrawal requested',
      'Bank returned it',
    ]);
    expect(statement.rows[3].status).toBe('PENDING');
    expect(statement.rows[5].reference).toBe(String(statement.rows[5].id));
  });

  it('labels an unknown payout leg and a release with no pod title plainly, and a UPI payout with no id by its method', async () => {
    const user = await seedUser();
    await PaymentReleaseModel.collection.insertOne({ release_id: 'rel-old', kind: 'LEGACY_KIND', status: 'APPROVED', pod_title: '' } as never);
    await PaymentReleaseModel.collection.insertOne({ release_id: 'rel-club', kind: 'CLUB_ADMIN', status: 'APPROVED' } as never);
    const upi = await withdrawal(user._id, { amount: 10, payout_method: 'UPI', upi_id: '' });
    await txn(user._id, { created_at: at('02'), amount: 10, balance_after: 10, release_id: 'rel-old' });
    await txn(user._id, { created_at: at('03'), amount: 10, balance_after: 20, release_id: 'rel-club' });
    await txn(user._id, { created_at: at('04'), type: 'DEBIT', source: 'WITHDRAWAL', amount: 10, balance_after: 10, withdrawal_id: upi.withdrawal_id });

    const { statement } = await loadWalletStatement(String(user._id), period, NOW);

    expect(statement.rows.map((r) => r.description)).toEqual([
      'Earning credit - Payout',
      'Earning credit - Club admin share',
      'Withdrawal request to UPI',
    ]);
  });

  it('withholds every balance when the ledger does not add up, and says so', async () => {
    const user = await seedUser();
    await txn(user._id, { created_at: at('02'), amount: 100, balance_after: 100 });
    await txn(user._id, { created_at: at('03'), amount: 50, balance_after: 999 });

    const { statement } = await loadWalletStatement(String(user._id), period, NOW);

    expect(statement).toMatchObject({ balances_reconciled: false, opening_balance: null, closing_balance: null });
    expect(statement.rows.map((r) => r.balance)).toEqual([null, null]);
    // The movements themselves are still exact.
    expect(statement.totals).toMatchObject({ total_credits: 150, transaction_count: 2 });
    expect(logs.server.warn).toHaveBeenCalledWith(
      'wallet-statement',
      'loadWalletStatement',
      expect.objectContaining({ computed_closing: 150, stored_closing: 999 })
    );
  });

  it('carries the opening balance through an empty period, without creating a wallet', async () => {
    const user = await seedUser();
    await txn(user._id, { created_at: new Date('2024-12-01T10:00:00.000Z'), amount: 300, balance_after: 300 });
    await FinanceSettingsModel.create({ singleton_key: 'finance', currency_symbol: 'USD' });

    const { statement } = await loadWalletStatement(String(user._id), period, NOW);

    expect(statement).toMatchObject({ rows: [], opening_balance: 300, closing_balance: 300, balances_reconciled: true, currency_symbol: 'USD' });
    expect(statement.totals.transaction_count).toBe(0);
    expect(await WalletModel.countDocuments({ user_id: user._id })).toBe(0);
  });

  it('opens a brand-new account at zero, and names an unknown user by nothing', async () => {
    const { statement } = await loadWalletStatement(new Types.ObjectId().toHexString(), period, NOW);
    expect(statement).toMatchObject({ opening_balance: 0, closing_balance: 0, account_name: '', account_email: '' });
  });

  it('names an account by its email when it has no name', async () => {
    const { insertedId } = await UserModel.collection.insertOne({ auth: { email: 'noname@x.com' } } as never);
    const user = { _id: insertedId };
    const { statement } = await loadWalletStatement(String(user._id), period, NOW);
    expect(statement.account_name).toBe('noname@x.com');
  });

  it('refuses a period holding more rows than a statement can carry, rather than cutting it short', async () => {
    const user = await seedUser();
    const docs = Array.from({ length: MAX_STATEMENT_ROWS + 1 }, (_, i) => ({
      user_id: user._id,
      type: 'CREDIT',
      amount: 1,
      balance_after: i + 1,
      source: 'POD_COMPLETION',
      reason: '',
      created_at: new Date(at('10').getTime() + i * 1000),
    }));
    await WalletTransactionModel.collection.insertMany(docs as never);

    await expect(loadWalletStatement(String(user._id), period, NOW)).rejects.toThrow('more than 5000 transactions');
  });
});

describe('walletStatementService', () => {
  it('serves the statement as data', async () => {
    const user = await seedUser();
    const out = await svc.statement(String(user._id), { from: '2025-01-01', to: '2025-01-02' });
    expect(out).toMatchObject({ period_from: '2025-01-01', period_to: '2025-01-02', rows: [] });
  });

  it('renders the same rows as a CSV with a BOM, named from the business and period', async () => {
    const user = await seedUser();
    await FinanceSettingsModel.create({ singleton_key: 'finance', business_name: 'Duncit Pvt. Ltd.' });
    await txn(user._id, { created_at: at('02'), amount: 100, balance_after: 100, reason: '=HYPERLINK("x")' });

    const file = await svc.file(String(user._id), period, 'CSV');

    expect(file).toMatchObject({ mime: 'text/csv', transaction_count: 1, filename: 'duncit-pvt-ltd-withdrawal-statement-2025-01-01_to_2025-01-31.csv' });
    const text = Buffer.from(file.content_base64, 'base64').toString('utf8');
    expect(text.startsWith('﻿Wallet account statement')).toBe(true);
    // Free text somebody typed is never left able to run as a spreadsheet formula.
    expect(text).toContain(String.raw`"'=HYPERLINK(""x"")"`);
    expect(text.split('\r\n').length).toBeGreaterThan(20);
  });

  it('renders an unreconciled statement as a CSV that says the balances are withheld', async () => {
    const user = await seedUser();
    await txn(user._id, { created_at: at('02'), amount: 100, balance_after: 7 });

    const file = await svc.file(String(user._id), period, 'CSV');

    const text = Buffer.from(file.content_base64, 'base64').toString('utf8');
    expect(text).toContain('Balances,Not shown: the ledger could not be reconciled for this period');
    expect(text).not.toContain('Opening balance');
  });

  it('renders a PDF, and drops the brand from the file name when the business has no name', async () => {
    const user = await seedUser();
    await FinanceSettingsModel.create({ singleton_key: 'finance', business_name: '   ' });
    await txn(user._id, { created_at: at('02'), amount: 100, balance_after: 100 });

    const file = await svc.file(String(user._id), period, 'PDF');

    expect(file).toMatchObject({ mime: 'application/pdf', filename: 'withdrawal-statement-2025-01-01_to_2025-01-31.pdf', transaction_count: 1 });
    expect(Buffer.from(file.content_base64, 'base64').subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('refuses a format other than PDF or CSV', async () => {
    await expect(svc.file(new Types.ObjectId().toHexString(), period, 'XLS' as never)).rejects.toThrow('Choose PDF or CSV');
  });
});
