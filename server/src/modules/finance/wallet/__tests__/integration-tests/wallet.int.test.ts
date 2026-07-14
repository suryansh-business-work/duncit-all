jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));

import { Types } from 'mongoose';
import { walletService, nextPayoutDate } from '../../wallet.service';
import { WalletModel } from '../../wallet.model';
import { paymentReleaseService } from '@modules/finance/finance/paymentRelease.service';
import { FinanceSettingsModel } from '@modules/finance/finance/finance.model';
import { PaymentReleaseModel } from '@modules/finance/finance/paymentRelease.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';

let seq = 0;
async function seedHost() {
  return UserModel.create({
    auth: { email: `host${++seq}@x.com` },
    profile: { first_name: 'Asha', last_name: 'Host' },
  });
}
async function seedPod(hostId: Types.ObjectId) {
  return PodModel.create({
    pod_id: `pod-${++seq}`,
    pod_title: 'Sunset Pod',
    pod_hosts_id: [hostId],
    club_id: new Types.ObjectId(),
    pod_description: 'd',
    pod_date_time: new Date(),
    pod_type: 'NON_NATIVE_PAID',
  });
}
async function seedHostRelease(hostId: Types.ObjectId, podId: Types.ObjectId, amount: number) {
  const doc = await PaymentReleaseModel.create({
    release_id: `rel-${++seq}`,
    kind: 'HOST_PAYMENT',
    status: 'PENDING',
    pod_id: podId,
    pod_title: 'Sunset Pod',
    host_user_id: hostId,
    beneficiary_name: 'Asha',
    beneficiary_email: 'asha@x.com',
    amount_requested: amount,
  });
  return { id: String(doc._id), release_id: doc.release_id };
}

describe('nextPayoutDate', () => {
  it('returns now for IMMEDIATE and a future date for scheduled modes', () => {
    const now = new Date('2026-06-15T10:00:00');
    expect(nextPayoutDate('IMMEDIATE', 1, '18:00', now)).toEqual(now);
    const weekly = nextPayoutDate('WEEKLY', 1, '18:00', now); // next Monday
    expect(weekly.getDay()).toBe(1);
    expect(weekly.getTime()).toBeGreaterThan(now.getTime());
    const monthEnd = nextPayoutDate('MONTH_END', 1, '18:00', now);
    expect(monthEnd.getMonth()).toBe(5); // June (0-based)
    expect(monthEnd.getDate()).toBe(30);
  });
});

describe('wallet credit on pod-payout approval', () => {
  it('credits the host wallet once when a HOST_PAYMENT release is approved', async () => {
    const host = await seedHost();
    const pod = await seedPod(host._id);
    const rel = await seedHostRelease(host._id, pod._id, 1500);

    let wallet = await walletService.getMyWallet(String(host._id));
    expect(wallet.balance).toBe(0);

    await paymentReleaseService.review(rel.id, { status: 'APPROVED', approval_type: 'FULL' }, new Types.ObjectId().toString());
    wallet = await walletService.getMyWallet(String(host._id));
    expect(wallet.balance).toBe(1500);

    const txns = await walletService.listTransactions(String(host._id));
    expect(txns).toHaveLength(1);
    expect(txns[0].type).toBe('CREDIT');
    expect(txns[0].source).toBe('POD_COMPLETION');

    // Idempotent: a re-credit for the same release_id does nothing.
    await walletService.creditPodPayout(String(host._id), 1500, { release_id: rel.release_id });
    expect((await walletService.getMyWallet(String(host._id))).balance).toBe(1500);
  });
});

describe('withdrawals', () => {
  async function fund(amount: number) {
    const host = await seedHost();
    await WalletModel.create({ user_id: host._id, balance: amount, currency_symbol: '₹' });
    return host;
  }

  it('requests a withdrawal that debits the wallet and is scheduled', async () => {
    const host = await fund(2000);
    const w = await walletService.requestWithdrawal(String(host._id), {
      amount: 1200,
      payout_method: 'UPI',
      upi_id: 'asha@upi',
    });
    expect(w.status).toBe('PENDING');
    expect(w.amount).toBe(1200);
    expect(w.scheduled_for).toBeTruthy();
    expect((await walletService.getMyWallet(String(host._id))).balance).toBe(800);
  });

  it('blocks overdraw and missing account details', async () => {
    const host = await fund(500);
    await expect(
      walletService.requestWithdrawal(String(host._id), { amount: 900, payout_method: 'UPI', upi_id: 'a@upi' })
    ).rejects.toThrow(/insufficient/i);
    await expect(
      walletService.requestWithdrawal(String(host._id), { amount: 100, payout_method: 'UPI' })
    ).rejects.toThrow(/account details/i);
  });

  it('rejecting a withdrawal refunds the wallet; paying it does not', async () => {
    const host = await fund(1000);
    const reject = await walletService.requestWithdrawal(String(host._id), { amount: 400, payout_method: 'IMPS', account_number: '123', ifsc_code: 'HDFC0001' });
    expect((await walletService.getMyWallet(String(host._id))).balance).toBe(600);

    await walletService.reviewWithdrawal(reject.id, 'REJECTED', 'Bad account', new Types.ObjectId().toString());
    expect((await walletService.getMyWallet(String(host._id))).balance).toBe(1000);

    const pay = await walletService.requestWithdrawal(String(host._id), { amount: 300, payout_method: 'UPI', upi_id: 'a@upi' });
    const paid = await walletService.reviewWithdrawal(pay.id, 'PAID', undefined, new Types.ObjectId().toString());
    expect(paid.status).toBe('PAID');
    expect(paid.paid_at).toBeTruthy();
    expect((await walletService.getMyWallet(String(host._id))).balance).toBe(700);
  });

  it('serves the withdrawalRequestsTable page with search, filter, sort and paging', async () => {
    const a = await fund(2000);
    const b = await fund(2000);
    const c = await fund(2000);
    await walletService.requestWithdrawal(String(a._id), { amount: 1200, payout_method: 'UPI', upi_id: 'alpha@upi' });
    await walletService.requestWithdrawal(String(b._id), { amount: 400, payout_method: 'UPI', upi_id: 'beta@upi' });
    const paid = await walletService.requestWithdrawal(String(c._id), { amount: 300, payout_method: 'UPI', upi_id: 'gamma@upi' });
    await walletService.reviewWithdrawal(paid.id, 'PAID', undefined, null);

    // Plain envelope with the clamp defaults (created_at desc).
    const all = await walletService.withdrawalsTable();
    expect(all.total).toBe(3);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans the payout account fields.
    const byUpi = await walletService.withdrawalsTable({ search: 'alpha' });
    expect(byUpi.rows.map((w) => w.upi_id)).toEqual(['alpha@upi']);
    expect(byUpi.total).toBe(1);

    // Status enum filter narrows (the old UI's ToggleButtonGroup).
    const pending = await walletService.withdrawalsTable({
      filters: [{ field: 'status', op: 'eq', value: 'PENDING' }],
    });
    expect(pending.rows.map((w) => w.upi_id).sort((x, y) => x.localeCompare(y))).toEqual([
      'alpha@upi',
      'beta@upi',
    ]);

    // Allowlisted sort + paging keep the total.
    const asc = await walletService.withdrawalsTable({ sort_by: 'amount', sort_dir: 'asc' });
    expect(asc.rows.map((w) => w.amount)).toEqual([300, 400, 1200]);
    const page2 = await walletService.withdrawalsTable({ sort_by: 'amount', sort_dir: 'asc', page: 2, page_size: 1 });
    expect(page2.rows.map((w) => w.amount)).toEqual([400]);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });

  it('validates the review (reason required, only pending)', async () => {
    const host = await fund(500);
    const w = await walletService.requestWithdrawal(String(host._id), { amount: 100, payout_method: 'UPI', upi_id: 'a@upi' });
    await expect(walletService.reviewWithdrawal(w.id, 'REJECTED', '', null)).rejects.toThrow(/reason is required/i);
    await walletService.reviewWithdrawal(w.id, 'PAID', undefined, null);
    await expect(walletService.reviewWithdrawal(w.id, 'PAID', undefined, null)).rejects.toThrow(/only pending/i);
  });

  afterAll(async () => {
    await FinanceSettingsModel.deleteMany({});
  });
});
