import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { CoinBalanceModel, CoinTransactionModel } from '@modules/finance/coin/coin.model';
import { GiftCardModel, GiftCardTransactionModel } from '../../giftcard.model';
import { giftCardPub, giftcardService } from '../../giftcard.service';

/**
 * Holding a gift card: converting it to Duncit Coins (exactly once, by exactly
 * one person), looking it up by code, and the caller's own list. Redemption
 * moves value into the coin ledger, so every repeat and every race is checked
 * against the balances it leaves behind.
 */

const DAY = 86_400_000;
let seq = 0;

const seedUser = (first = 'Aarav', last = 'Sharma') =>
  UserModel.create({ auth: { email: `gc-holder-${++seq}@example.com` }, profile: { first_name: first, last_name: last } });

const seedCard = (over: Record<string, unknown> = {}) =>
  GiftCardModel.create({
    code: `ABCD-EFGH-${String(++seq).padStart(4, '0')}-PQRS`,
    purchaser_user_id: new Types.ObjectId(),
    scope_type: 'SHOP',
    initial_amount: 1000,
    balance: 1000,
    payment_id: `pay_gc_${seq}`,
    expires_at: new Date(Date.now() + 30 * DAY),
    ...over,
  });

const coinBalance = async (userId: unknown) =>
  (await CoinBalanceModel.findOne({ user_id: userId }).lean())?.balance ?? 0;

beforeAll(async () => {
  await Promise.all([
    GiftCardModel.init(),
    GiftCardTransactionModel.init(),
    CoinTransactionModel.init(),
    CoinBalanceModel.init(),
  ]);
});

describe('giftcardService.redeemToCoins', () => {
  it('refuses a code that is not sixteen characters', async () => {
    await expect(giftcardService.redeemToCoins('ABCD-1234', new Types.ObjectId().toHexString())).rejects.toMatchObject({
      message: 'That gift card code is not valid',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('reports a well-formed code nobody issued as NOT_FOUND', async () => {
    await expect(
      giftcardService.redeemToCoins('ZZZZ-ZZZZ-ZZZZ-ZZZZ', new Types.ObjectId().toHexString())
    ).rejects.toMatchObject({ message: 'Gift card not found', extensions: { code: 'NOT_FOUND' } });
  });

  it('converts the whole value into coins, marks the card redeemed and writes the REDEEM row', async () => {
    const holder = await seedUser();
    const card = await seedCard({ initial_amount: 1500, balance: 1500 });

    const out = await giftcardService.redeemToCoins(card.code.toLowerCase().replaceAll('-', ' '), String(holder._id));

    expect(out.coins_added).toBe(1500);
    expect(out.coin_balance).toBe(1500);
    expect(out.card).toMatchObject({ code: card.code, status: 'REDEEMED', balance: 0, initial_amount: 1500, redeemed: true });
    expect(out.card.redeemed_at).not.toBeNull();

    const stored = await GiftCardModel.findById(card._id).lean();
    expect(stored).toMatchObject({ status: 'REDEEMED', balance: 0 });
    expect(String(stored!.redeemed_by_user_id)).toBe(String(holder._id));

    const ledger = await GiftCardTransactionModel.find({ gift_card_id: card._id }).lean();
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ type: 'REDEEM', source: 'REDEEM_TO_COINS', amount: 1500, balance_after: 0, payment_id: null });

    const coins = await CoinTransactionModel.find({ user_id: holder._id }).lean();
    expect(coins).toHaveLength(1);
    expect(coins[0]).toMatchObject({
      type: 'CREDIT',
      source: 'GIFT_CARD_REDEEM',
      amount: 1500,
      balance_after: 1500,
      gift_card_id: String(card._id),
      reason: `Gift card ${card.code}`,
    });
  });

  it('adds the card on top of coins the holder already had', async () => {
    const holder = await seedUser();
    await CoinBalanceModel.create({ user_id: holder._id, balance: 250, lifetime_earned: 250 });
    const card = await seedCard({ initial_amount: 500, balance: 500 });

    const out = await giftcardService.redeemToCoins(card.code, String(holder._id));

    expect(out.coins_added).toBe(500);
    expect(out.coin_balance).toBe(750);
  });

  it('never credits twice when the same holder redeems again', async () => {
    const holder = await seedUser();
    const card = await seedCard();
    await giftcardService.redeemToCoins(card.code, String(holder._id));

    const again = await giftcardService.redeemToCoins(card.code, String(holder._id));

    expect(again.coins_added).toBe(0);
    expect(again.coin_balance).toBe(1000);
    expect(await coinBalance(holder._id)).toBe(1000);
    expect(await CoinTransactionModel.countDocuments({ gift_card_id: String(card._id) })).toBe(1);
    expect(await GiftCardTransactionModel.countDocuments({ gift_card_id: card._id })).toBe(1);
  });

  it('lets exactly one of two people racing the same code win the value', async () => {
    const [aarav, priya] = await Promise.all([seedUser(), seedUser('Priya', 'Menon')]);
    const card = await seedCard();

    const results = await Promise.allSettled([
      giftcardService.redeemToCoins(card.code, String(aarav._id)),
      giftcardService.redeemToCoins(card.code, String(priya._id)),
    ]);

    const won = results.filter((r) => r.status === 'fulfilled');
    const lost = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(1);
    expect(lost[0].reason.message).toBe('This gift card has already been redeemed');
    expect((await coinBalance(aarav._id)) + (await coinBalance(priya._id))).toBe(1000);
  });

  it('refuses someone else once the card is redeemed, and credits them nothing', async () => {
    const [first, second] = await Promise.all([seedUser(), seedUser('Priya', 'Menon')]);
    const card = await seedCard();
    await giftcardService.redeemToCoins(card.code, String(first._id));

    await expect(giftcardService.redeemToCoins(card.code, String(second._id))).rejects.toThrow(
      'This gift card has already been redeemed'
    );
    expect(await coinBalance(second._id)).toBe(0);
  });

  it('refuses an expired card and leaves it ACTIVE with its balance', async () => {
    const holder = await seedUser();
    const card = await seedCard({ expires_at: new Date(Date.now() - DAY) });

    await expect(giftcardService.redeemToCoins(card.code, String(holder._id))).rejects.toThrow('This gift card has expired');
    const stored = await GiftCardModel.findById(card._id).lean();
    expect(stored).toMatchObject({ status: 'ACTIVE', balance: 1000 });
    expect(await coinBalance(holder._id)).toBe(0);
  });

  it('lands the coin credit when an earlier attempt marked the card but crashed before crediting', async () => {
    const holder = await seedUser();
    const card = await seedCard({
      status: 'REDEEMED',
      balance: 0,
      redeemed_by_user_id: holder._id,
      redeemed_at: new Date(),
    });

    const out = await giftcardService.redeemToCoins(card.code, String(holder._id));

    expect(out.coins_added).toBe(1000);
    expect(out.coin_balance).toBe(1000);
    expect(await GiftCardTransactionModel.countDocuments({ gift_card_id: card._id, type: 'REDEEM' })).toBe(1);
  });
});

describe('giftcardService.byCode', () => {
  it('refuses a malformed code and reports an unknown one', async () => {
    await expect(giftcardService.byCode('nope')).rejects.toThrow('That gift card code is not valid');
    await expect(giftcardService.byCode('ZZZZ-ZZZZ-ZZZZ-ZZZZ')).rejects.toMatchObject({
      extensions: { code: 'NOT_FOUND' },
    });
  });

  it('shows the card with the sender’s name', async () => {
    const sender = await seedUser('Aarav', 'Sharma');
    const card = await seedCard({ purchaser_user_id: sender._id, recipient_name: 'Priya', message: 'Enjoy' });

    const view = await giftcardService.byCode(card.code);

    expect(view).toMatchObject({
      id: String(card._id),
      code: card.code,
      status: 'ACTIVE',
      recipient_name: 'Priya',
      message: 'Enjoy',
      redeemed: false,
      redeemed_at: null,
      sender_name: 'Aarav Sharma',
    });
  });

  it('shows an empty sender when the buyer’s account is gone, and EXPIRED past the expiry', async () => {
    const card = await seedCard({ expires_at: new Date(Date.now() - DAY) });
    const view = await giftcardService.byCode(card.code);
    expect(view.sender_name).toBe('');
    expect(view.status).toBe('EXPIRED');
  });
});

describe('giftCardPub', () => {
  it('reports REDEEMED over EXPIRED, and blanks the fields a legacy row lacks', () => {
    const view = giftCardPub({
      _id: new Types.ObjectId(),
      code: 'ABCD-EFGH-JKMN-PQRS',
      scope_type: 'SHOP',
      scope_category_id: null,
      initial_amount: 500,
      balance: 0,
      status: 'REDEEMED',
      redeemed_by_user_id: new Types.ObjectId(),
      redeemed_at: new Date('2026-09-01T10:00:00.000Z'),
      expires_at: new Date('2026-01-01T00:00:00.000Z'),
      created_at: undefined,
    } as never);
    expect(view).toMatchObject({
      status: 'REDEEMED',
      scope_category_id: null,
      scope_name: '',
      scope_image_url: '',
      scope_image_front_url: '',
      scope_image_back_url: '',
      recipient_email: '',
      recipient_name: '',
      message: '',
      redeemed: true,
      redeemed_at: '2026-09-01T10:00:00.000Z',
      expires_at: '2026-01-01T00:00:00.000Z',
      created_at: '',
    });
  });
});

describe('giftcardService.myGiftCards', () => {
  it('returns nothing for an id that is not an ObjectId', async () => {
    expect(await giftcardService.myGiftCards('guest')).toEqual({ owned: [], gifted: [] });
  });

  it('splits the caller’s cards into the ones they hold and the ones they gave away', async () => {
    const me = await seedUser();
    const other = await seedUser('Priya', 'Menon');
    const selfBought = await seedCard({ purchaser_user_id: me._id });
    const redeemedFromFriend = await seedCard({
      purchaser_user_id: other._id,
      recipient_email: 'aarav@example.com',
      status: 'REDEEMED',
      balance: 0,
      redeemed_by_user_id: me._id,
      redeemed_at: new Date(),
    });
    const giftedPending = await seedCard({ purchaser_user_id: me._id, recipient_email: 'priya@example.com' });
    const giftedRedeemed = await seedCard({
      purchaser_user_id: me._id,
      recipient_email: 'priya@example.com',
      status: 'REDEEMED',
      balance: 0,
      redeemed_by_user_id: other._id,
      redeemed_at: new Date(),
    });
    await seedCard({ purchaser_user_id: other._id, recipient_email: 'someone@example.com' });

    const mine = await giftcardService.myGiftCards(String(me._id));

    expect(mine.owned.map((c) => c.id).sort()).toEqual([String(selfBought._id), String(redeemedFromFriend._id)].sort());
    expect(mine.gifted.map((c) => c.id).sort()).toEqual([String(giftedPending._id), String(giftedRedeemed._id)].sort());
  });
});
