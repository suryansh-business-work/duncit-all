const gateway = {
  createContact: jest.fn(),
  createFundAccount: jest.fn(),
  createPayout: jest.fn(),
  fetchPayout: jest.fn(),
  isPayoutConfigured: jest.fn(),
};
const notify = jest.fn();

jest.mock('../../razorpayX.gateway', () => ({
  ...jest.requireActual('../../razorpayX.gateway'),
  createContact: (...a: unknown[]) => gateway.createContact(...a),
  createFundAccount: (...a: unknown[]) => gateway.createFundAccount(...a),
  createPayout: (...a: unknown[]) => gateway.createPayout(...a),
  fetchPayout: (...a: unknown[]) => gateway.fetchPayout(...a),
  isPayoutConfigured: () => gateway.isPayoutConfigured(),
}));
jest.mock('../../payout.notify', () => ({ notifyMoneyOut: (...a: unknown[]) => notify(...a) }));

import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { HostModel } from '@modules/venues/host/host.model';
import { WalletModel, WalletTransactionModel, WalletWithdrawalModel } from '@modules/finance/wallet/wallet.model';
import { PayoutEventModel } from '../../payout.model';
import { decideWithdrawal } from '../../withdrawal.decision';
import { retryWithdrawalPayout } from '../../withdrawal.retry';
import { reviewWithdrawalLegacy } from '../../withdrawal.legacy';
import { settlePayout } from '../../payout.settle';
import { refreshPayoutStatus } from '../../payout.refresh';

const actor = { id: String(new Types.ObjectId()), name: 'Finance One', role: 'FINANCE_MANAGER' };
const ACCOUNT = { account_number: '123456789012', ifsc_code: 'HDFC0001234' };

let seq = 0;
async function seedWithdrawal(opts: { amount?: number; verified?: boolean } = {}) {
  const amount = opts.amount ?? 2000;
  const user = await UserModel.create({
    auth: { email: `person${++seq}@example.com` },
    profile: { first_name: 'Meera', last_name: 'Nair' },
  });
  if (opts.verified) {
    await HostModel.create({
      user_id: user._id,
      full_name: 'Meera Nair',
      email: user.auth.email,
      status: 'APPROVED',
      bank_account: { payout_method: 'IMPS', account_holder_name: 'Meera Nair', ...ACCOUNT, upi_id: '' },
    });
  }
  // The request already took the money out of the wallet: 5000 - 2000 left.
  await WalletModel.create({ user_id: user._id, balance: 5000 - amount });
  const row = await WalletWithdrawalModel.create({
    withdrawal_id: `wd_test${seq}`,
    user_id: user._id,
    beneficiary_name: 'Meera Nair',
    beneficiary_email: user.auth.email,
    amount,
    withdrawer_role: 'HOST',
    payout_method: 'IMPS',
    account_holder_name: 'Meera Nair',
    ...ACCOUNT,
    scheduled_for: new Date(),
    allocations: [
      { pod_id: new Types.ObjectId(), pod_title: 'Pod A', release_id: 'rel-a', kind: 'HOST_PAYMENT', amount: amount * 0.75 },
      { pod_id: new Types.ObjectId(), pod_title: 'Pod B', release_id: 'rel-b', kind: 'HOST_PAYMENT', amount: amount * 0.25 },
    ],
  });
  return { user, row };
}

const balanceOf = async (userId: unknown) => (await WalletModel.findOne({ user_id: userId }))?.balance;
const auditActions = async (id: string) =>
  (await PayoutEventModel.find({ subject_id: id }).sort({ created_at: 1 })).map((e) => e.action);
const reload = (id: unknown) => WalletWithdrawalModel.findById(id).then((r) => r!);

const queued = (id = 'pout_1') => ({ id, status: 'queued', utr: '', failure_reason: '', reference_id: 'x' });
const refusal = new GraphQLError('Insufficient RazorpayX balance', { extensions: { razorpay_status: 400 } });

beforeAll(async () => {
  await Promise.all([PayoutEventModel.init(), WalletWithdrawalModel.init()]);
});

beforeEach(() => {
  gateway.isPayoutConfigured.mockResolvedValue(true);
  gateway.createContact.mockResolvedValue('cont_1');
  gateway.createFundAccount.mockResolvedValue('fa_1');
  gateway.createPayout.mockResolvedValue(queued());
});

describe('rejecting a withdrawal', () => {
  it('returns the whole amount to the wallet, frees the pods, logs it and tells the person', async () => {
    const { user, row } = await seedWithdrawal();
    const after = await decideWithdrawal({ id: String(row._id), decision: 'REJECT', reason: 'Bank details unclear', actor });

    expect(after.status).toBe('REJECTED');
    expect(after.approval_status).toBe('REJECTED');
    expect(after.reject_reason).toBe('Bank details unclear');
    expect(after.allocations).toHaveLength(0);
    expect(await balanceOf(user._id)).toBe(5000);
    const ledger = await WalletTransactionModel.findOne({ withdrawal_id: row.withdrawal_id });
    expect(ledger).toMatchObject({ type: 'CREDIT', source: 'WITHDRAWAL_REVERSAL', amount: 2000 });
    expect(await auditActions(row.withdrawal_id)).toEqual(['REJECTED']);
    expect(gateway.createPayout).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ notice: 'WITHDRAWAL_REJECTED', vars: { requested: 2000, reason: 'Bank details unclear' } })
    );
  });

  it('refuses without a reason and changes nothing', async () => {
    const { user, row } = await seedWithdrawal();
    await expect(decideWithdrawal({ id: String(row._id), decision: 'REJECT', reason: ' ', actor })).rejects.toThrow('reason is required');
    expect((await reload(row._id)).status).toBe('PENDING');
    expect(await balanceOf(user._id)).toBe(3000);
  });

  it('cannot be decided twice, and the second try never refunds a second time', async () => {
    const { user, row } = await seedWithdrawal();
    await decideWithdrawal({ id: String(row._id), decision: 'REJECT', reason: 'Nope', actor });
    await expect(decideWithdrawal({ id: String(row._id), decision: 'REJECT', reason: 'Nope again', actor })).rejects.toThrow(
      'can no longer be decided'
    );
    expect(await balanceOf(user._id)).toBe(5000);
  });

  it('lets only one of two simultaneous decisions win', async () => {
    const { user, row } = await seedWithdrawal({ verified: true });
    const results = await Promise.allSettled([
      decideWithdrawal({ id: String(row._id), decision: 'REJECT', reason: 'Reject it', actor }),
      decideWithdrawal({ id: String(row._id), decision: 'APPROVE', actor }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    // Whichever won, the money is consistent: refunded XOR sent to Razorpay, never both.
    const refunded = (await balanceOf(user._id)) === 5000;
    const sent = gateway.createPayout.mock.calls.length === 1;
    expect(refunded !== sent).toBe(true);
  });
});

describe('approving a withdrawal', () => {
  it('claims the payout, sends it to RazorpayX once with a stable idempotency key, and waits for the bank', async () => {
    const { row } = await seedWithdrawal({ verified: true });
    const after = await decideWithdrawal({ id: String(row._id), decision: 'APPROVE', actor });

    expect(after.approval_status).toBe('APPROVED');
    expect(after.approved_amount).toBe(2000);
    // Approved and sent is NOT paid: the legacy status stays PENDING until Razorpay confirms.
    expect(after.status).toBe('PENDING');
    expect(after.paid_at).toBeNull();
    expect(after.payout).toMatchObject({ status: 'PROCESSING', razorpay_payout_id: 'pout_1', attempt: 1 });
    expect(gateway.createPayout).toHaveBeenCalledTimes(1);
    expect(gateway.createPayout).toHaveBeenCalledWith(
      expect.objectContaining({ amountPaise: 200000, mode: 'IMPS', reference: row.withdrawal_id, idempotencyKey: `${row.withdrawal_id}:1` })
    );
    expect(await auditActions(row.withdrawal_id)).toEqual(['APPROVED', 'PAYOUT_SENT']);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ notice: 'WITHDRAWAL_APPROVED' }));
  });

  it('refuses an account that is not on a verified record, until Finance acknowledges it', async () => {
    const { user, row } = await seedWithdrawal({ verified: false });
    await expect(decideWithdrawal({ id: String(row._id), decision: 'APPROVE', actor })).rejects.toMatchObject({
      extensions: { code: 'UNVERIFIED_ACCOUNT' },
    });
    expect((await reload(row._id)).approval_status).toBeUndefined();
    expect(await balanceOf(user._id)).toBe(3000);
    expect(gateway.createPayout).not.toHaveBeenCalled();

    const ok = await decideWithdrawal({ id: String(row._id), decision: 'APPROVE', acknowledgeUnverifiedAccount: true, actor });
    expect(ok.payout?.status).toBe('PROCESSING');
  });

  it('refuses to approve when payouts are not set up, and leaves the request untouched', async () => {
    gateway.isPayoutConfigured.mockResolvedValue(false);
    const { row } = await seedWithdrawal({ verified: true });
    await expect(decideWithdrawal({ id: String(row._id), decision: 'APPROVE', actor })).rejects.toThrow('Payouts are not set up');
    expect((await reload(row._id)).approval_status).toBeUndefined();
  });

  it('keeps the withdrawal approved but FAILED — never paid — when Razorpay refuses the payout', async () => {
    gateway.createPayout.mockRejectedValue(refusal);
    const { row } = await seedWithdrawal({ verified: true });
    const after = await decideWithdrawal({ id: String(row._id), decision: 'APPROVE', actor });
    expect(after.status).toBe('PENDING');
    expect(after.approval_status).toBe('APPROVED');
    expect(after.payout).toMatchObject({ status: 'FAILED', failure_reason: 'Insufficient RazorpayX balance' });
    expect(await auditActions(row.withdrawal_id)).toEqual(['APPROVED', 'PAYOUT_FAILED']);
    expect(notify).not.toHaveBeenCalledWith(expect.objectContaining({ notice: 'WITHDRAWAL_PAID' }));
  });

  it('stays PROCESSING with no payout id when Razorpay cannot be reached, so nothing is marked failed or paid', async () => {
    gateway.createPayout.mockRejectedValue(new Error('fetch failed'));
    const { row } = await seedWithdrawal({ verified: true });
    const after = await decideWithdrawal({ id: String(row._id), decision: 'APPROVE', actor });
    expect(after.payout).toMatchObject({ status: 'PROCESSING', razorpay_payout_id: '' });
    expect(after.status).toBe('PENDING');
  });
});

describe('partially approving a withdrawal', () => {
  it('pays only the approved part and hands the rest back to the wallet with its own ledger row', async () => {
    const { user, row } = await seedWithdrawal({ verified: true });
    const after = await decideWithdrawal({
      id: String(row._id),
      decision: 'PARTIAL',
      approvedAmount: 1200,
      reason: 'Part of the balance is on hold',
      actor,
    });

    expect(after.amount).toBe(1200);
    expect(after.requested_amount).toBe(2000);
    expect(after.approved_amount).toBe(1200);
    expect(after.approval_status).toBe('PARTIALLY_APPROVED');
    expect(await balanceOf(user._id)).toBe(3800);
    const credit = await WalletTransactionModel.findOne({ withdrawal_id: row.withdrawal_id, source: 'WITHDRAWAL_REVERSAL' });
    expect(credit).toMatchObject({ type: 'CREDIT', amount: 800 });
    expect(credit?.reason).toContain('partially approved');
    expect(gateway.createPayout).toHaveBeenCalledWith(expect.objectContaining({ amountPaise: 120000 }));
    // The attribution follows the money: 1500 + 500 trimmed to 1200, oldest slice first.
    expect(after.allocations.map((a) => a.amount)).toEqual([1200]);
    expect(await auditActions(row.withdrawal_id)).toEqual(['PARTIALLY_APPROVED', 'PAYOUT_SENT']);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ notice: 'WITHDRAWAL_PARTIALLY_APPROVED', vars: expect.objectContaining({ requested: 2000, approved: 1200 }) })
    );
  });

  it.each([
    ['equal to the request', 2000],
    ['above the request', 2500],
    ['zero', 0],
  ])('refuses an approved amount %s and moves no money', async (_label, approvedAmount) => {
    const { user, row } = await seedWithdrawal({ verified: true });
    await expect(
      decideWithdrawal({ id: String(row._id), decision: 'PARTIAL', approvedAmount, reason: 'On hold', actor })
    ).rejects.toMatchObject({ extensions: { field: 'approved_amount' } });
    expect(await balanceOf(user._id)).toBe(3000);
    expect(gateway.createPayout).not.toHaveBeenCalled();
  });
});

describe('the payout settling', () => {
  const approveAndSend = async () => {
    const seeded = await seedWithdrawal({ verified: true });
    await decideWithdrawal({ id: String(seeded.row._id), decision: 'APPROVE', actor });
    return seeded;
  };

  it('marks the withdrawal PAID only when settled, once, however many times Razorpay repeats itself', async () => {
    const { row } = await approveAndSend();
    const args = { kind: 'WITHDRAWAL' as const, recordId: row.withdrawal_id, outcome: 'PAID' as const, razorpayPayoutId: 'pout_1', utr: 'UTR1' };

    expect(await settlePayout({ ...args, dedupeKey: 'evt:1' })).toBe('APPLIED');
    expect(await settlePayout({ ...args, dedupeKey: 'evt:1' })).toBe('IGNORED');
    expect(await settlePayout({ ...args, dedupeKey: 'evt:2' })).toBe('IGNORED');

    const paid = await reload(row._id);
    expect(paid.status).toBe('PAID');
    expect(paid.paid_at).toBeInstanceOf(Date);
    expect(paid.payout).toMatchObject({ status: 'PAID', utr: 'UTR1' });
    expect((await auditActions(row.withdrawal_id)).filter((a) => a === 'PAYOUT_PAID')).toHaveLength(1);
    expect(notify.mock.calls.filter(([n]) => n.notice === 'WITHDRAWAL_PAID')).toHaveLength(1);
  });

  it('records a failure with its reason and does not mark the withdrawal paid', async () => {
    const { row } = await approveAndSend();
    await settlePayout({
      kind: 'WITHDRAWAL',
      recordId: row.withdrawal_id,
      outcome: 'FAILED',
      razorpayPayoutId: 'pout_1',
      failureReason: 'Beneficiary account closed',
      dedupeKey: 'evt:f',
    });
    const failed = await reload(row._id);
    expect(failed.status).toBe('PENDING');
    expect(failed.payout).toMatchObject({ status: 'FAILED', failure_reason: 'Beneficiary account closed' });
  });

  it('never downgrades a paid withdrawal when a late failure event arrives', async () => {
    const { row } = await approveAndSend();
    const base = { kind: 'WITHDRAWAL' as const, recordId: row.withdrawal_id, razorpayPayoutId: 'pout_1' };
    await settlePayout({ ...base, outcome: 'PAID', utr: 'U', dedupeKey: 'a' });
    expect(await settlePayout({ ...base, outcome: 'FAILED', failureReason: 'late', dedupeKey: 'b' })).toBe('IGNORED');
    expect((await reload(row._id)).payout?.status).toBe('PAID');
  });

  it('ignores an event for a payout that is not the current attempt', async () => {
    const { row } = await approveAndSend();
    const result = await settlePayout({
      kind: 'WITHDRAWAL',
      recordId: row.withdrawal_id,
      outcome: 'PAID',
      razorpayPayoutId: 'pout_OTHER',
      dedupeKey: 'stale',
    });
    expect(result).toBe('IGNORED');
    expect((await reload(row._id)).status).toBe('PENDING');
  });

  it('refresh asks Razorpay and settles through the same path', async () => {
    const { row } = await approveAndSend();
    gateway.fetchPayout.mockResolvedValue({ id: 'pout_1', status: 'processed', utr: 'UTR5', failure_reason: '', reference_id: row.withdrawal_id });
    expect(await refreshPayoutStatus('WITHDRAWAL', row.withdrawal_id, actor)).toBe('APPLIED');
    expect((await reload(row._id)).status).toBe('PAID');
    await expect(refreshPayoutStatus('WITHDRAWAL', row.withdrawal_id, actor)).rejects.toThrow('no payout in progress');
  });

  it('refresh leaves a payout that Razorpay still shows as processing alone', async () => {
    const { row } = await approveAndSend();
    gateway.fetchPayout.mockResolvedValue({ id: 'pout_1', status: 'processing', utr: '', failure_reason: '', reference_id: row.withdrawal_id });
    expect(await refreshPayoutStatus('WITHDRAWAL', row.withdrawal_id, actor)).toBe('IGNORED');
    expect((await reload(row._id)).payout?.status).toBe('PROCESSING');
  });
});

describe('retrying and giving up on a failed payout', () => {
  const failedPayout = async () => {
    gateway.createPayout.mockRejectedValueOnce(refusal);
    const seeded = await seedWithdrawal({ verified: true });
    await decideWithdrawal({ id: String(seeded.row._id), decision: 'APPROVE', actor });
    return seeded;
  };

  it('starts a NEW attempt under a new idempotency key', async () => {
    const { row } = await failedPayout();
    gateway.createPayout.mockResolvedValue(queued('pout_2'));
    const after = await retryWithdrawalPayout(String(row._id), actor);
    expect(after.payout).toMatchObject({ status: 'PROCESSING', attempt: 2, razorpay_payout_id: 'pout_2' });
    expect(gateway.createPayout).toHaveBeenLastCalledWith(expect.objectContaining({ idempotencyKey: `${row.withdrawal_id}:2` }));
    expect(await auditActions(row.withdrawal_id)).toEqual(['APPROVED', 'PAYOUT_FAILED', 'PAYOUT_RETRIED']);
  });

  it('claims only one new attempt when Retry is clicked twice at once', async () => {
    const { row } = await failedPayout();
    gateway.createPayout.mockResolvedValue(queued('pout_2'));
    await Promise.allSettled([retryWithdrawalPayout(String(row._id), actor), retryWithdrawalPayout(String(row._id), actor)]);
    const sends = gateway.createPayout.mock.calls.filter(([a]) => a.idempotencyKey === `${row.withdrawal_id}:2`);
    expect(sends).toHaveLength(1);
    expect((await reload(row._id)).payout?.attempt).toBe(2);
  });

  it('refuses to retry something already paid, or that was never approved', async () => {
    const { row } = await seedWithdrawal({ verified: true });
    await expect(retryWithdrawalPayout(String(row._id), actor)).rejects.toThrow('no payout that can be retried');
  });

  it('lets Finance reject after a failed payout, returning the APPROVED amount to the wallet', async () => {
    gateway.createPayout.mockRejectedValueOnce(refusal);
    const { user, row } = await seedWithdrawal({ verified: true });
    await decideWithdrawal({ id: String(row._id), decision: 'PARTIAL', approvedAmount: 1200, reason: 'On hold', actor });
    expect(await balanceOf(user._id)).toBe(3800);

    const rejected = await decideWithdrawal({ id: String(row._id), decision: 'REJECT', reason: 'Account cannot be paid', actor });
    expect(rejected.status).toBe('REJECTED');
    expect(await balanceOf(user._id)).toBe(5000);
  });
});

describe('the old reviewWithdrawal mutation', () => {
  it('routes REJECTED through the new flow, so it refunds, logs and notifies', async () => {
    const { user, row } = await seedWithdrawal();
    const pub = await reviewWithdrawalLegacy(String(row._id), 'REJECTED', 'Old portal reject', actor);
    expect(pub.status).toBe('REJECTED');
    expect(await balanceOf(user._id)).toBe(5000);
    expect(await auditActions(row.withdrawal_id)).toEqual(['REJECTED']);
  });

  it('refuses a hand-marked PAID once Razorpay payouts are set up', async () => {
    const { row } = await seedWithdrawal();
    await expect(reviewWithdrawalLegacy(String(row._id), 'PAID', undefined, actor)).rejects.toThrow('paid through Razorpay');
    expect((await reload(row._id)).status).toBe('PENDING');
  });

  it('still accepts a hand-marked PAID before payouts are set up, and audits it as manual', async () => {
    gateway.isPayoutConfigured.mockResolvedValue(false);
    const { row } = await seedWithdrawal();
    const pub = await reviewWithdrawalLegacy(String(row._id), 'PAID', undefined, actor);
    expect(pub.status).toBe('PAID');
    expect(await auditActions(row.withdrawal_id)).toEqual(['MARKED_PAID_MANUALLY']);
  });

  it('refuses a hand-marked PAID on a withdrawal the new flow is already paying', async () => {
    const { row } = await seedWithdrawal({ verified: true });
    await decideWithdrawal({ id: String(row._id), decision: 'APPROVE', actor });
    gateway.isPayoutConfigured.mockResolvedValue(false);
    await expect(reviewWithdrawalLegacy(String(row._id), 'PAID', undefined, actor)).rejects.toThrow('already being handled');
  });
});

describe('the audit trail', () => {
  it('cannot be edited or deleted', async () => {
    const { row } = await seedWithdrawal();
    await decideWithdrawal({ id: String(row._id), decision: 'REJECT', reason: 'Nope', actor });
    const entry = await PayoutEventModel.findOne({ subject_id: row.withdrawal_id });
    expect(entry).toBeTruthy();

    await expect(PayoutEventModel.updateOne({ _id: entry!._id }, { $set: { reason: 'edited' } })).rejects.toThrow('append-only');
    await expect(PayoutEventModel.deleteOne({ _id: entry!._id })).rejects.toThrow('append-only');
    await expect(PayoutEventModel.deleteMany({})).rejects.toThrow('append-only');
    entry!.reason = 'edited';
    await expect(entry!.save()).rejects.toThrow('append-only');
    expect((await PayoutEventModel.findById(entry!._id))?.reason).toBe('Nope');
  });

  it('records who decided, in what capacity, and the amounts', async () => {
    const { row } = await seedWithdrawal({ verified: true });
    await decideWithdrawal({ id: String(row._id), decision: 'PARTIAL', approvedAmount: 1200, reason: 'On hold', actor });
    const entry = await PayoutEventModel.findOne({ subject_id: row.withdrawal_id, action: 'PARTIALLY_APPROVED' });
    expect(entry).toMatchObject({
      actor_name: 'Finance One',
      actor_role: 'FINANCE_MANAGER',
      requested_amount: 2000,
      approved_amount: 1200,
      reason: 'On hold',
      user_name: 'Meera Nair',
    });
  });
});
