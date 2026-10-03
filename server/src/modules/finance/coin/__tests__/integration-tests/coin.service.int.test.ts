jest.mock('@observability/log', () => ({
  logs: { server: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } },
}));

import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { UserModel } from '@modules/access/user/user.model';
import { coinService } from '../../coin.service';
import { CoinBalanceModel, CoinSettingsModel, CoinTransactionModel } from '../../coin.model';

/**
 * The coin ledger against a real Mongo. Every way coins move is pinned to the
 * exact amount, the balance and lifetime totals it leaves, the ledger row it
 * writes — and, for every keyed credit or debit, that a retry of the same event
 * neither pays nor spends twice and leaves the balance exactly where the first
 * attempt put it.
 */

const warn = logs.server.warn as jest.Mock;
let seq = 0;

beforeAll(async () => {
  // The once-only guarantees ARE the unique indexes; make sure they exist
  // before the first duplicate is attempted.
  await Promise.all([CoinTransactionModel.init(), CoinBalanceModel.init(), CoinSettingsModel.init()]);
});

const settings = (over: Record<string, number> = {}) =>
  CoinSettingsModel.create({
    singleton_key: 'coin',
    pod_join_earn_pct: 10,
    shop_earn_pct: 2,
    coins_per_referral: 50,
    pod_feedback_coins: 20,
    coin_expiry_days: 30,
    ...over,
  });

const uid = () => new Types.ObjectId().toHexString();
const wallet = (userId: string) => CoinBalanceModel.findOne({ user_id: new Types.ObjectId(userId) }).lean();
const ledger = (userId: string) =>
  CoinTransactionModel.find({ user_id: new Types.ObjectId(userId) }).sort({ _id: 1 }).lean();

async function seedUser() {
  seq += 1;
  return UserModel.create({ auth: { email: `coin${seq}@x.com` }, profile: { first_name: 'Coin', last_name: 'User' } });
}

describe('creditForPayment', () => {
  beforeEach(() => settings());

  it('grants the pod rate on the spend, floored, as one expiring lot with an auditable row', async () => {
    const user = uid();
    const granted = await coinService.creditForPayment({
      userId: user,
      paymentId: 'PAY-1',
      spendAmount: 1049,
      reason: 'Pod booking',
      targetType: 'POD',
    });

    expect(granted).toBe(104); // 10% of 1049 = 104.9 -> 104
    expect(await wallet(user)).toMatchObject({ balance: 104, lifetime_earned: 104 });
    const rows = await ledger(user);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: 'CREDIT',
      amount: 104,
      balance_after: 104,
      source: 'PAYMENT_EARN',
      reason: 'Pod booking',
      payment_id: 'PAY-1',
      earn_pct: 10,
      spend_amount: 1049,
      remaining: 104,
    });
    expect(rows[0].expires_at).toBeInstanceOf(Date);
    expect(rows[0].expires_at?.getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 60 * 60 * 1000);
  });

  it('is idempotent per payment: a retried finalize returns 0 and leaves balance and ledger untouched', async () => {
    const user = uid();
    const opts = { userId: user, paymentId: 'PAY-RETRY', spendAmount: 500, reason: 'r', targetType: 'POD' as const };
    expect(await coinService.creditForPayment(opts)).toBe(50);
    expect(await coinService.creditForPayment(opts)).toBe(0);
    expect(await coinService.creditForPayment(opts)).toBe(0);

    expect(await wallet(user)).toMatchObject({ balance: 50, lifetime_earned: 50 });
    expect(await CoinTransactionModel.countDocuments({ payment_id: 'PAY-RETRY', source: 'PAYMENT_EARN' })).toBe(1);
  });

  it('earns at the shop rate on a product order, and nothing on a gift card', async () => {
    const user = uid();
    expect(
      await coinService.creditForPayment({ userId: user, paymentId: 'P-SHOP', spendAmount: 1000, reason: 's', targetType: 'PRODUCT' })
    ).toBe(20);
    expect(
      await coinService.creditForPayment({ userId: user, paymentId: 'P-GC', spendAmount: 1000, reason: 'g', targetType: 'GIFT_CARD' })
    ).toBe(0);
    expect(await wallet(user)).toMatchObject({ balance: 20, lifetime_earned: 20 });
    expect(await ledger(user)).toHaveLength(1);
  });

  it('a spend too small for one coin, a bad user id or no payment id writes nothing at all', async () => {
    const user = uid();
    expect(await coinService.creditForPayment({ userId: user, paymentId: 'P-TINY', spendAmount: 9, reason: 't' })).toBe(0);
    expect(await coinService.creditForPayment({ userId: 'nope', paymentId: 'P-X', spendAmount: 1000, reason: 't' })).toBe(0);
    expect(await coinService.creditForPayment({ userId: user, paymentId: '', spendAmount: 1000, reason: 't' })).toBe(0);
    expect(await wallet(user)).toBeNull();
    expect(await CoinTransactionModel.countDocuments({})).toBe(0);
  });

  it('with expiry switched off the grant carries no lot', async () => {
    await CoinSettingsModel.updateOne({ singleton_key: 'coin' }, { $set: { coin_expiry_days: 0 } });
    const user = uid();
    await coinService.creditForPayment({ userId: user, paymentId: 'P-NOEXP', spendAmount: 100, reason: 'n' });
    const [row] = await ledger(user);
    expect(row.expires_at).toBeNull();
    expect(row.remaining).toBe(0);
  });
});

describe('flat credits — referral, gift card, pod feedback', () => {
  beforeEach(() => settings());

  it('pays both sides of one referral once each, flooring the coins', async () => {
    const referrer = uid();
    const newbie = uid();
    await coinService.creditForReferral({ userId: referrer, referralId: 'REF-1', coins: 50.9, reason: 'r', source: 'REFERRAL_EARN' });
    await coinService.creditForReferral({ userId: newbie, referralId: 'REF-1', coins: 50, reason: 's', source: 'REFERRAL_SIGNUP' });
    // The same side again — a racing second apply of the code.
    await coinService.creditForReferral({ userId: referrer, referralId: 'REF-1', coins: 50, reason: 'r', source: 'REFERRAL_EARN' });

    expect(await wallet(referrer)).toMatchObject({ balance: 50, lifetime_earned: 50 });
    expect(await wallet(newbie)).toMatchObject({ balance: 50, lifetime_earned: 50 });
    expect(await CoinTransactionModel.countDocuments({ referral_id: 'REF-1' })).toBe(2);
    const [row] = await ledger(referrer);
    expect(row).toMatchObject({ source: 'REFERRAL_EARN', amount: 50, balance_after: 50, remaining: 50 });
  });

  it('a referral with no coins, no id or a bad user pays nothing', async () => {
    const user = uid();
    await coinService.creditForReferral({ userId: user, referralId: 'R0', coins: 0.5, reason: 'r', source: 'REFERRAL_EARN' });
    await coinService.creditForReferral({ userId: user, referralId: '', coins: 50, reason: 'r', source: 'REFERRAL_EARN' });
    await coinService.creditForReferral({ userId: 'bad', referralId: 'R1', coins: 50, reason: 'r', source: 'REFERRAL_EARN' });
    expect(await CoinTransactionModel.countDocuments({})).toBe(0);
  });

  it('converts a gift card once, into coins that never expire', async () => {
    const user = uid();
    const opts = { userId: user, giftCardId: 'GC-1', coins: 500, reason: 'Gift card' };
    expect(await coinService.creditForGiftCard(opts)).toBe(500);
    expect(await coinService.creditForGiftCard(opts)).toBe(0);

    expect(await wallet(user)).toMatchObject({ balance: 500, lifetime_earned: 500 });
    const rows = await ledger(user);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ source: 'GIFT_CARD_REDEEM', gift_card_id: 'GC-1', expires_at: null, remaining: 0 });
    expect(await coinService.creditForGiftCard({ ...opts, giftCardId: 'GC-2', coins: 0 })).toBe(0);
  });

  it('pays the configured pod-feedback reward once per rating', async () => {
    const user = uid();
    const opts = { userId: user, feedbackId: 'FB-1', reason: 'Rated pod' };
    expect(await coinService.creditForPodFeedback(opts)).toBe(20);
    expect(await coinService.creditForPodFeedback(opts)).toBe(0);
    expect(await wallet(user)).toMatchObject({ balance: 20, lifetime_earned: 20 });
    expect(await coinService.creditForPodFeedback({ ...opts, feedbackId: '' })).toBe(0);
  });

  it('a pod-feedback reward switched off to 0 pays nothing and leaves no row', async () => {
    await CoinSettingsModel.updateOne({ singleton_key: 'coin' }, { $set: { pod_feedback_coins: 0 } });
    const user = uid();
    expect(await coinService.creditForPodFeedback({ userId: user, feedbackId: 'FB-OFF', reason: 'r' })).toBe(0);
    expect(await ledger(user)).toHaveLength(0);
  });
});

describe('redeemForPayment', () => {
  beforeEach(() => settings());

  async function earned(user: string, coins: number) {
    // 10% pod rate: spend ten times the coins wanted.
    await coinService.creditForPayment({ userId: user, paymentId: `EARN-${user}`, spendAmount: coins * 10, reason: 'e' });
  }

  it('debits the coins with a guarded update, writes the DEBIT row and draws the lot down', async () => {
    const user = uid();
    await earned(user, 100);

    await expect(
      coinService.redeemForPayment({ userId: user, paymentId: 'SPEND-1', coins: 30.8, reason: 'Checkout' })
    ).resolves.toBe(true);

    expect(await wallet(user)).toMatchObject({ balance: 70, lifetime_earned: 100 });
    const debit = await CoinTransactionModel.findOne({ payment_id: 'SPEND-1' }).lean();
    expect(debit).toMatchObject({ type: 'DEBIT', amount: 30, balance_after: 70, source: 'PAYMENT_REDEEM', earn_pct: 0 });
    const lot = await CoinTransactionModel.findOne({ source: 'PAYMENT_EARN', user_id: new Types.ObjectId(user) }).lean();
    expect(lot?.remaining).toBe(70);
  });

  it('a retried redemption reports success but spends nothing more', async () => {
    const user = uid();
    await earned(user, 100);
    const opts = { userId: user, paymentId: 'SPEND-RETRY', coins: 40, reason: 'Checkout' };

    expect(await coinService.redeemForPayment(opts)).toBe(true);
    expect(await coinService.redeemForPayment(opts)).toBe(true);

    expect(await wallet(user)).toMatchObject({ balance: 60 });
    expect(await CoinTransactionModel.countDocuments({ payment_id: 'SPEND-RETRY' })).toBe(1);
    const lot = await CoinTransactionModel.findOne({ source: 'PAYMENT_EARN', user_id: new Types.ObjectId(user) }).lean();
    expect(lot?.remaining).toBe(60);
  });

  it('refuses to overdraw: returns false, warns, and leaves balance and ledger as they were', async () => {
    const user = uid();
    await earned(user, 25);

    expect(await coinService.redeemForPayment({ userId: user, paymentId: 'SPEND-BIG', coins: 26, reason: 'c' })).toBe(false);

    expect(await wallet(user)).toMatchObject({ balance: 25 });
    expect(await CoinTransactionModel.countDocuments({ payment_id: 'SPEND-BIG' })).toBe(0);
    expect(warn).toHaveBeenCalledWith('coin', 'redeemForPayment', expect.objectContaining({ msg: expect.any(String) }));
  });

  it('spending the exact balance is allowed and leaves zero', async () => {
    const user = uid();
    await earned(user, 25);
    expect(await coinService.redeemForPayment({ userId: user, paymentId: 'SPEND-ALL', coins: 25, reason: 'c' })).toBe(true);
    expect(await coinService.balanceOf(user)).toBe(0);
  });

  it('refuses a non-positive amount, a bad user or a missing payment id without touching the balance', async () => {
    const user = uid();
    await earned(user, 10);
    expect(await coinService.redeemForPayment({ userId: user, paymentId: 'S', coins: 0.9, reason: 'c' })).toBe(false);
    expect(await coinService.redeemForPayment({ userId: 'bad', paymentId: 'S', coins: 5, reason: 'c' })).toBe(false);
    expect(await coinService.redeemForPayment({ userId: user, paymentId: '', coins: 5, reason: 'c' })).toBe(false);
    expect(await coinService.balanceOf(user)).toBe(10);
  });
});

describe('refundForBackout', () => {
  beforeEach(() => settings());

  it('returns coins to the balance only (not lifetime), as a fresh lot keyed on the backout', async () => {
    const user = uid();
    await coinService.creditForPayment({ userId: user, paymentId: 'PAY-B', spendAmount: 1000, reason: 'e' });

    const refunded = await coinService.refundForBackout({
      userId: user,
      backoutId: 'BO-1',
      paymentId: 'PAY-B',
      coins: 40.7,
      reason: 'Backout',
    });

    expect(refunded).toBe(40);
    expect(await wallet(user)).toMatchObject({ balance: 140, lifetime_earned: 100 });
    const row = await CoinTransactionModel.findOne({ backout_id: 'BO-1' }).lean();
    expect(row).toMatchObject({ type: 'CREDIT', source: 'PAYMENT_REFUND', amount: 40, balance_after: 140, payment_id: 'PAY-B', remaining: 40 });
  });

  it('a retry of the same backout returns 0 and undoes its own increment; a second release of the same payment pays again', async () => {
    const user = uid();
    const opts = { userId: user, backoutId: 'BO-A', paymentId: 'PAY-P', coins: 30, reason: 'b' };
    expect(await coinService.refundForBackout(opts)).toBe(30);
    expect(await coinService.refundForBackout(opts)).toBe(0);
    expect(await coinService.balanceOf(user)).toBe(30);

    expect(await coinService.refundForBackout({ ...opts, backoutId: 'BO-B' })).toBe(30);
    expect(await coinService.balanceOf(user)).toBe(60);
    expect(await CoinTransactionModel.countDocuments({ payment_id: 'PAY-P', source: 'PAYMENT_REFUND' })).toBe(2);
  });

  it('nothing to give back, a bad user or no backout id refunds 0 and writes nothing', async () => {
    const user = uid();
    expect(await coinService.refundForBackout({ userId: user, backoutId: 'B', paymentId: 'P', coins: 0, reason: 'b' })).toBe(0);
    expect(await coinService.refundForBackout({ userId: 'bad', backoutId: 'B', paymentId: 'P', coins: 5, reason: 'b' })).toBe(0);
    expect(await coinService.refundForBackout({ userId: user, backoutId: '', paymentId: 'P', coins: 5, reason: 'b' })).toBe(0);
    expect(await wallet(user)).toBeNull();
  });
});

describe('adminAdjust', () => {
  beforeEach(() => settings());
  const admin = new Types.ObjectId().toHexString();

  it('validates the amount, the reason, the user id and that the account exists', async () => {
    const user = await seedUser();
    const base = { userId: String(user._id), adminId: admin, direction: 'GRANT' as const, coins: 10, reason: 'Goodwill' };
    await expect(coinService.adminAdjust({ ...base, coins: 0.4 })).rejects.toThrow('Enter how many coins to apply');
    await expect(coinService.adminAdjust({ ...base, reason: '   ' })).rejects.toThrow('A reason is required');
    await expect(coinService.adminAdjust({ ...base, userId: 'bad' })).rejects.toThrow('Choose a user');
    await expect(coinService.adminAdjust({ ...base, userId: uid() })).rejects.toThrow('That account no longer exists');
    expect(await CoinTransactionModel.countDocuments({})).toBe(0);
  });

  it('a grant credits balance and lifetime, and two identical grants are two real grants', async () => {
    const user = await seedUser();
    const opts = { userId: String(user._id), adminId: admin, direction: 'GRANT' as const, coins: 50, reason: '  Goodwill ' };

    expect(await coinService.adminAdjust(opts)).toEqual({ balance: 50, lifetime_earned: 50, applied: 50 });
    expect(await coinService.adminAdjust(opts)).toEqual({ balance: 100, lifetime_earned: 100, applied: 50 });

    const rows = await ledger(String(user._id));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ source: 'ADMIN_GRANT', type: 'CREDIT', reason: 'Goodwill', remaining: 50 });
    expect(String(rows[0].admin_id)).toBe(admin);
  });

  it('a deduct debits balance only, draws lots down, and refuses to overdraw with the real balance', async () => {
    const user = await seedUser();
    const id = String(user._id);
    await coinService.adminAdjust({ userId: id, adminId: admin, direction: 'GRANT', coins: 70, reason: 'g' });

    expect(await coinService.adminAdjust({ userId: id, adminId: admin, direction: 'DEDUCT', coins: 30, reason: 'fix' })).toEqual({
      balance: 40,
      lifetime_earned: 70,
      applied: -30,
    });
    const debit = await CoinTransactionModel.findOne({ source: 'ADMIN_DEDUCT' }).lean();
    expect(debit).toMatchObject({ type: 'DEBIT', amount: 30, balance_after: 40, expires_at: null });
    const grantLot = await CoinTransactionModel.findOne({ source: 'ADMIN_GRANT' }).lean();
    expect(grantLot?.remaining).toBe(40);

    await expect(
      coinService.adminAdjust({ userId: id, adminId: admin, direction: 'DEDUCT', coins: 41, reason: 'fix' })
    ).rejects.toThrow('That account holds 40 coins — it cannot give up 41');
    expect(await coinService.balanceOf(id)).toBe(40);
    expect(await CoinTransactionModel.countDocuments({ source: 'ADMIN_DEDUCT' })).toBe(1);
  });

  it('a deduct on an account with no wallet reports 0 held', async () => {
    const user = await seedUser();
    await expect(
      coinService.adminAdjust({ userId: String(user._id), adminId: admin, direction: 'DEDUCT', coins: 5, reason: 'fix' })
    ).rejects.toThrow('That account holds 0 coins — it cannot give up 5');
  });
});

describe('reads', () => {
  beforeEach(() => settings());

  it('balanceOf is 0 for a bad id or a member with no wallet', async () => {
    expect(await coinService.balanceOf('bad')).toBe(0);
    expect(await coinService.balanceOf(uid())).toBe(0);
  });

  it('getMyBalance returns the rates even for an invalid id', async () => {
    expect(await coinService.getMyBalance('bad')).toEqual({
      balance: 0,
      lifetime_earned: 0,
      earn_pct: 10,
      shop_earn_pct: 2,
      pod_feedback_coins: 20,
      expiring_coins: 0,
      next_expiry_at: null,
    });
  });

  it('getMyBalance states the soonest lot to lapse, never more than the balance itself', async () => {
    const user = uid();
    await coinService.creditForPayment({ userId: user, paymentId: 'P-EXP', spendAmount: 800, reason: 'e' });
    const lot = await CoinTransactionModel.findOne({ payment_id: 'P-EXP' }).lean();

    const mine = await coinService.getMyBalance(user);
    expect(mine).toMatchObject({ balance: 80, lifetime_earned: 80, expiring_coins: 80 });
    expect(mine.next_expiry_at).toBe(lot?.expires_at?.toISOString());

    // A balance that drifted under its own lots must not promise to lose more than it holds.
    await CoinBalanceModel.updateOne({ user_id: new Types.ObjectId(user) }, { $set: { balance: 15 } });
    expect((await coinService.getMyBalance(user)).expiring_coins).toBe(15);

    await CoinBalanceModel.updateOne({ user_id: new Types.ObjectId(user) }, { $set: { balance: 0 } });
    expect(await coinService.getMyBalance(user)).toMatchObject({ expiring_coins: 0, next_expiry_at: null });
  });

  it('listMyTransactions maps rows newest first and is empty for a bad id', async () => {
    const user = uid();
    await coinService.creditForPayment({ userId: user, paymentId: 'P-L1', spendAmount: 100, reason: 'first' });
    await coinService.creditForGiftCard({ userId: user, giftCardId: 'GC-L', coins: 5, reason: 'second' });

    const rows = await coinService.listMyTransactions(user);
    expect(rows).toHaveLength(2);
    const byReason = Object.fromEntries(rows.map((r) => [r.reason, r]));
    expect(byReason.first).toMatchObject({ type: 'CREDIT', amount: 10, payment_id: 'P-L1', earn_pct: 10, spend_amount: 100 });
    expect(typeof byReason.first.expires_at).toBe('string');
    expect(byReason.second).toMatchObject({ amount: 5, payment_id: null, earn_pct: 0, spend_amount: 0, expires_at: null });
    expect(rows[0].created_at >= rows[1].created_at).toBe(true);
    expect(await coinService.listMyTransactions('bad')).toEqual([]);
  });
});
