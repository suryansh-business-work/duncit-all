jest.mock('@services/email/email.service', () => ({
  sendGiftCardReceivedEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@services/email/email-i18n', () => ({
  recipientLocale: jest.fn().mockResolvedValue('en'),
  emailTranslationVars: jest.fn(),
}));
jest.mock('@config/url-configs', () => ({
  getUrlConfigs: jest.fn().mockResolvedValue({ appUrl: 'https://app.example.test' }),
}));

import { Types } from 'mongoose';
import { CategoryModel } from '@modules/pods/category/category.model';
import { FeatureFlagModel } from '@modules/platform/settings/settings.model';
import { settingsService } from '@modules/platform/settings/settings.service';
import { sendGiftCardReceivedEmail } from '@services/email/email.service';
import { emailTranslationVars } from '@services/email/email-i18n';
import { appDate } from '@utils/app-time';
import { GiftCardModel, GiftCardTransactionModel } from '../../giftcard.model';
import { giftcardService, normalizeGiftCardCode, type GiftCardPurchaseFacts } from '../../giftcard.service';
import { giftCardSettingsService } from '../../giftcard.settings.service';

/**
 * Buying a gift card: the sales gate, the validation of what is being bought,
 * the one-card-per-payment issue leg, and the email that carries the code.
 * A gift card is money, so each amount and each idempotency guarantee is pinned
 * against the database rather than assumed.
 */

const mockSend = jest.mocked(sendGiftCardReceivedEmail);
const mockVars = jest.mocked(emailTranslationVars);

const CODE_SHAPE = /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

const shopFacts = (over: Partial<GiftCardPurchaseFacts> = {}): GiftCardPurchaseFacts => ({
  scope_type: 'SHOP',
  scope_category_id: null,
  scope_name: '',
  scope_image_url: 'https://ik.imagekit.io/duncit/shop-slide-1.jpg',
  scope_image_front_url: '',
  scope_image_back_url: '',
  amount: 1500,
  recipient_email: '',
  recipient_name: '',
  message: '',
  ...over,
});

let slugSeq = 0;
const seedCategory = (over: Record<string, unknown> = {}) =>
  CategoryModel.create({ name: 'Badminton', slug: `badminton-${++slugSeq}`, level: 'SUB', ...over });

const setFlag = (enabled: boolean) =>
  FeatureFlagModel.updateOne(
    { key: 'gift_cards' },
    { $set: { name: 'Gift cards', enabled } },
    { upsert: true }
  );

beforeAll(async () => {
  await Promise.all([GiftCardModel.init(), GiftCardTransactionModel.init()]);
});

afterEach(() => jest.restoreAllMocks());

describe('normalizeGiftCardCode', () => {
  it('upper-cases, strips separators and re-groups a code typed any way', () => {
    expect(normalizeGiftCardCode(' abcd efgh-jkmn_pqrs ')).toBe('ABCD-EFGH-JKMN-PQRS');
  });

  it.each([['ABCD-EFGH-JKMN'], ['ABCD-EFGH-JKMN-PQRS-T'], [''], [undefined as unknown as string]])(
    'refuses %p, which is not sixteen characters',
    (input) => {
      expect(normalizeGiftCardCode(input)).toBe('');
    }
  );
});

describe('giftcardService.assertPurchaseEnabled', () => {
  it('refuses a sale when the gift_cards flag has never been created', async () => {
    await expect(giftcardService.assertPurchaseEnabled()).rejects.toMatchObject({
      message: 'Gift cards are not available right now',
      extensions: { code: 'BAD_REQUEST' },
    });
  });

  it('refuses a sale while the flag is off, and allows it once it is on', async () => {
    await setFlag(false);
    await expect(giftcardService.assertPurchaseEnabled()).rejects.toThrow('Gift cards are not available right now');
    await setFlag(true);
    await expect(giftcardService.assertPurchaseEnabled()).resolves.toBeUndefined();
  });
});

describe('giftcardService.purchaseFacts — amount', () => {
  it.each([[99], [10001], ['not a number']])('refuses %p outside the ₹100–₹10000 bounds', async (amount) => {
    await expect(
      giftcardService.purchaseFacts({ scope_type: 'SHOP', amount: amount as number })
    ).rejects.toMatchObject({
      message: 'Gift card amount must be between 100 and 10000',
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });

  it('accepts the exact bounds and floors a fractional amount to whole rupees', async () => {
    jest.spyOn(settingsService, 'getBranding').mockResolvedValue({ pod_shop_slider: [], logo_url: '' } as never);
    expect((await giftcardService.purchaseFacts({ scope_type: 'SHOP', amount: 100 })).amount).toBe(100);
    expect((await giftcardService.purchaseFacts({ scope_type: 'SHOP', amount: 10000 })).amount).toBe(10000);
    expect((await giftcardService.purchaseFacts({ scope_type: 'SHOP', amount: 500.99 })).amount).toBe(500);
  });

  it('honours bounds Finance has changed', async () => {
    await giftCardSettingsService.update({ min_amount: 250, max_amount: 2000 });
    await expect(giftcardService.purchaseFacts({ scope_type: 'SHOP', amount: 200 })).rejects.toThrow(
      'Gift card amount must be between 250 and 2000'
    );
  });
});

describe('giftcardService.purchaseFacts — SHOP theme', () => {
  it('refuses a category on a shop card', async () => {
    await expect(
      giftcardService.purchaseFacts({
        scope_type: 'SHOP',
        scope_category_id: new Types.ObjectId().toHexString(),
        amount: 500,
      })
    ).rejects.toThrow('A shop gift card carries no category');
  });

  it('takes the first Pod Shop slide as the art, and cleans the recipient fields', async () => {
    jest.spyOn(settingsService, 'getBranding').mockResolvedValue({
      pod_shop_slider: [{ url: 'https://ik.imagekit.io/duncit/shop-slide-1.jpg' }, { url: 'https://x/2.jpg' }],
      logo_url: 'https://ik.imagekit.io/duncit/logo.png',
    } as never);
    const facts = await giftcardService.purchaseFacts({
      scope_type: 'SHOP',
      amount: 1000,
      recipient_email: '  Priya.Menon@Example.com ',
      recipient_name: '  Priya Menon ',
      message: '  Happy birthday!  ',
    });
    expect(facts).toEqual({
      scope_type: 'SHOP',
      scope_category_id: null,
      scope_name: '',
      scope_image_url: 'https://ik.imagekit.io/duncit/shop-slide-1.jpg',
      scope_image_front_url: '',
      scope_image_back_url: '',
      amount: 1000,
      recipient_email: 'priya.menon@example.com',
      recipient_name: 'Priya Menon',
      message: 'Happy birthday!',
    });
  });

  it('falls back to the logo without a slider, and to no image without either', async () => {
    const branding = jest
      .spyOn(settingsService, 'getBranding')
      .mockResolvedValueOnce({ pod_shop_slider: [], logo_url: 'https://ik.imagekit.io/duncit/logo.png' } as never)
      .mockResolvedValueOnce(null as never);
    expect((await giftcardService.purchaseFacts({ scope_type: 'SHOP', amount: 500 })).scope_image_url).toBe(
      'https://ik.imagekit.io/duncit/logo.png'
    );
    const bare = await giftcardService.purchaseFacts({ scope_type: 'SHOP', amount: 500 });
    expect(bare.scope_image_url).toBe('');
    expect(bare).toMatchObject({ recipient_email: '', recipient_name: '', message: '' });
    expect(branding).toHaveBeenCalledTimes(2);
  });
});

describe('giftcardService.purchaseFacts — category themes', () => {
  it.each([[undefined], ['not-an-object-id']])('asks for a category when the id is %p', async (id) => {
    await expect(
      giftcardService.purchaseFacts({ scope_type: 'SUB', scope_category_id: id, amount: 500 })
    ).rejects.toThrow('Choose a category for this gift card');
  });

  it('reports a category that does not exist as NOT_FOUND', async () => {
    await expect(
      giftcardService.purchaseFacts({
        scope_type: 'SUB',
        scope_category_id: new Types.ObjectId().toHexString(),
        amount: 500,
      })
    ).rejects.toMatchObject({ message: 'Category not found', extensions: { code: 'NOT_FOUND' } });
  });

  it('refuses a category of a different level than the card type', async () => {
    const sub = await seedCategory({ level: 'SUB' });
    await expect(
      giftcardService.purchaseFacts({ scope_type: 'SUPER', scope_category_id: String(sub._id), amount: 500 })
    ).rejects.toThrow('The chosen category does not match the gift card type');
  });

  it('refuses a category that is switched off', async () => {
    const off = await seedCategory({ level: 'CATEGORY', is_active: false });
    await expect(
      giftcardService.purchaseFacts({ scope_type: 'CATEGORY', scope_category_id: String(off._id), amount: 500 })
    ).rejects.toThrow('That category is not available right now');
  });

  it('snapshots the category name, icon and card artwork', async () => {
    const sports = await seedCategory({
      name: 'Sports',
      level: 'SUPER',
      icon: 'https://ik.imagekit.io/duncit/sports-icon.png',
      media: [{ url: 'https://ik.imagekit.io/duncit/sports.jpg', type: 'IMAGE' }],
      gift_card_image_front: 'https://ik.imagekit.io/duncit/gc-front.png',
      gift_card_image_back: 'https://ik.imagekit.io/duncit/gc-back.png',
    });
    const facts = await giftcardService.purchaseFacts({
      scope_type: 'SUPER',
      scope_category_id: String(sports._id),
      amount: 2000,
    });
    expect(facts).toMatchObject({
      scope_type: 'SUPER',
      scope_category_id: String(sports._id),
      scope_name: 'Sports',
      scope_image_url: 'https://ik.imagekit.io/duncit/sports-icon.png',
      scope_image_front_url: 'https://ik.imagekit.io/duncit/gc-front.png',
      scope_image_back_url: 'https://ik.imagekit.io/duncit/gc-back.png',
      amount: 2000,
    });
  });

  it('uses the first IMAGE when the category has no icon, skipping videos', async () => {
    const sub = await seedCategory({
      icon: '',
      media: [
        { url: 'https://ik.imagekit.io/duncit/clip.mp4', type: 'VIDEO' },
        { url: 'https://ik.imagekit.io/duncit/court.jpg', type: 'IMAGE' },
      ],
    });
    const facts = await giftcardService.purchaseFacts({ scope_type: 'SUB', scope_category_id: String(sub._id), amount: 500 });
    expect(facts.scope_image_url).toBe('https://ik.imagekit.io/duncit/court.jpg');
    expect(facts.scope_image_front_url).toBe('');
  });

  it('carries no image when the category has neither an icon nor a photo', async () => {
    const sub = await seedCategory({ icon: '', media: [] });
    const facts = await giftcardService.purchaseFacts({ scope_type: 'SUB', scope_category_id: String(sub._id), amount: 500 });
    expect(facts.scope_image_url).toBe('');
  });
});

describe('giftcardService.issueForPayment', () => {
  const purchaserId = new Types.ObjectId().toHexString();

  it('issues one ACTIVE card worth the amount, expiring after the validity months, with its ISSUE row', async () => {
    const before = new Date();
    const card = await giftcardService.issueForPayment({
      paymentId: 'pay_gc_001',
      purchaserId,
      facts: shopFacts({ recipient_email: 'priya@example.com', recipient_name: 'Priya', message: 'Enjoy' }),
    });

    expect(card.code).toMatch(CODE_SHAPE);
    expect(card).toMatchObject({
      initial_amount: 1500,
      balance: 1500,
      status: 'ACTIVE',
      payment_id: 'pay_gc_001',
      scope_type: 'SHOP',
      recipient_email: 'priya@example.com',
      recipient_name: 'Priya',
      message: 'Enjoy',
    });
    expect(String(card.purchaser_user_id)).toBe(purchaserId);
    const expected = new Date(before);
    expected.setMonth(expected.getMonth() + 12);
    expect(Math.abs(card.expires_at.getTime() - expected.getTime())).toBeLessThan(10_000);

    const rows = await GiftCardTransactionModel.find({ gift_card_id: card._id }).lean();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: 'ISSUE',
      source: 'PURCHASE',
      amount: 1500,
      balance_after: 1500,
      payment_id: 'pay_gc_001',
      code: card.code,
    });
  });

  it('honours the validity Finance set, and stores the category on a category card', async () => {
    await giftCardSettingsService.update({ validity_months: 3 });
    const categoryId = new Types.ObjectId().toHexString();
    const before = new Date();
    const card = await giftcardService.issueForPayment({
      paymentId: 'pay_gc_002',
      purchaserId,
      facts: shopFacts({ scope_type: 'SUB', scope_category_id: categoryId, scope_name: 'Badminton' }),
    });
    const expected = new Date(before);
    expected.setMonth(expected.getMonth() + 3);
    expect(Math.abs(card.expires_at.getTime() - expected.getTime())).toBeLessThan(10_000);
    expect(String(card.scope_category_id)).toBe(categoryId);
    expect(card.scope_name).toBe('Badminton');
  });

  it('returns the same card on every replay of the success path — never a second card or ledger row', async () => {
    const first = await giftcardService.issueForPayment({ paymentId: 'pay_gc_003', purchaserId, facts: shopFacts() });
    const again = await giftcardService.issueForPayment({ paymentId: 'pay_gc_003', purchaserId, facts: shopFacts({ amount: 9999 }) });

    expect(String(again._id)).toBe(String(first._id));
    expect(again.initial_amount).toBe(1500);
    expect(await GiftCardModel.countDocuments({ payment_id: 'pay_gc_003' })).toBe(1);
    expect(await GiftCardTransactionModel.countDocuments({ payment_id: 'pay_gc_003' })).toBe(1);
  });

  it('issues exactly one card when two replays race each other', async () => {
    const [a, b] = await Promise.all([
      giftcardService.issueForPayment({ paymentId: 'pay_gc_004', purchaserId, facts: shopFacts() }),
      giftcardService.issueForPayment({ paymentId: 'pay_gc_004', purchaserId, facts: shopFacts() }),
    ]);
    expect(String(a._id)).toBe(String(b._id));
    expect(await GiftCardModel.countDocuments({ payment_id: 'pay_gc_004' })).toBe(1);
    expect(await GiftCardTransactionModel.countDocuments({ payment_id: 'pay_gc_004' })).toBe(1);
  });

  it('still returns the card when its ISSUE row already exists from an earlier, interrupted run', async () => {
    await GiftCardTransactionModel.create({
      gift_card_id: new Types.ObjectId(),
      code: 'AAAA-BBBB-CCCC-DDDD',
      user_id: new Types.ObjectId(purchaserId),
      type: 'ISSUE',
      amount: 1500,
      balance_after: 1500,
      source: 'PURCHASE',
      payment_id: 'pay_gc_005',
    });
    const card = await giftcardService.issueForPayment({ paymentId: 'pay_gc_005', purchaserId, facts: shopFacts() });
    expect(card.payment_id).toBe('pay_gc_005');
    expect(await GiftCardTransactionModel.countDocuments({ payment_id: 'pay_gc_005' })).toBe(1);
  });

  it('stores empty artwork for facts frozen before artwork existed', async () => {
    const legacy = shopFacts() as Partial<GiftCardPurchaseFacts>;
    delete legacy.scope_image_front_url;
    delete legacy.scope_image_back_url;
    const card = await giftcardService.issueForPayment({
      paymentId: 'pay_gc_006',
      purchaserId,
      facts: legacy as GiftCardPurchaseFacts,
    });
    expect(card.scope_image_front_url).toBe('');
    expect(card.scope_image_back_url).toBe('');
  });

  it('surfaces a validation failure instead of retrying it, and leaves nothing behind', async () => {
    await expect(
      giftcardService.issueForPayment({ paymentId: 'pay_gc_007', purchaserId, facts: shopFacts({ amount: 0 }) })
    ).rejects.toThrow(/initial_amount/);
    expect(await GiftCardModel.countDocuments({ payment_id: 'pay_gc_007' })).toBe(0);
    expect(await GiftCardTransactionModel.countDocuments({ payment_id: 'pay_gc_007' })).toBe(0);
  });
});

describe('giftcardService.emailForPayment', () => {
  const purchaserId = new Types.ObjectId().toHexString();
  const buyer = { user_name: 'Aarav Sharma', user_email: 'aarav@example.com' };

  it('fails loudly when no card exists, so the step is retried', async () => {
    await expect(giftcardService.emailForPayment({ payment_id: 'pay_missing', ...buyer })).rejects.toThrow(
      'No gift card exists for this payment'
    );
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('mails a gifted card to its recipient with the value, the theme, the note and the redeem link', async () => {
    mockVars.mockResolvedValue({ 't:email.giftCard.shopScope': 'Duncit Pod Shop' });
    const card = await giftcardService.issueForPayment({
      paymentId: 'pay_gc_mail_1',
      purchaserId,
      facts: shopFacts({
        scope_type: 'SUB',
        scope_category_id: new Types.ObjectId().toHexString(),
        scope_name: 'Badminton',
        recipient_email: 'priya@example.com',
        recipient_name: 'Priya Menon',
        message: 'See you on court',
      }),
    });

    const out = await giftcardService.emailForPayment({ payment_id: 'pay_gc_mail_1', ...buyer });

    expect(out).toEqual({ to: 'priya@example.com', cardId: String(card._id) });
    expect(mockSend).toHaveBeenCalledWith({
      to: 'priya@example.com',
      recipient_name: 'Priya Menon',
      sender_name: 'Aarav Sharma',
      amount: '₹1500.00',
      scope_label: 'Badminton',
      code: card.code,
      message_line: '“See you on court”',
      redeem_url: `https://app.example.test/gift-card/${card.code}`,
      expires_on: appDate(card.expires_at),
    });
  });

  it('mails a self-purchase to the buyer and labels a shop card in the recipient’s language', async () => {
    mockVars.mockResolvedValue({ 't:email.giftCard.shopScope': 'Duncit Pod Shop' });
    await giftcardService.issueForPayment({ paymentId: 'pay_gc_mail_2', purchaserId, facts: shopFacts({ amount: 500 }) });

    const out = await giftcardService.emailForPayment({ payment_id: 'pay_gc_mail_2', ...buyer });

    expect(out.to).toBe('aarav@example.com');
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'aarav@example.com',
        recipient_name: 'Aarav Sharma',
        amount: '₹500.00',
        scope_label: 'Duncit Pod Shop',
        message_line: '',
      })
    );
  });

  it('falls back to "Pod Shop" when no translation is available', async () => {
    mockVars.mockResolvedValue({});
    await giftcardService.issueForPayment({ paymentId: 'pay_gc_mail_3', purchaserId, facts: shopFacts() });
    await giftcardService.emailForPayment({ payment_id: 'pay_gc_mail_3', ...buyer });
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ scope_label: 'Pod Shop' }));
  });
});

describe('giftcardService.syncIndexes', () => {
  it('builds the unique guards that make issuing and redeeming idempotent', async () => {
    await giftcardService.syncIndexes();
    const txnIndexes = await GiftCardTransactionModel.collection.indexes();
    const cardIndexes = await GiftCardModel.collection.indexes();
    expect(txnIndexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: { payment_id: 1, source: 1 }, unique: true }),
        expect.objectContaining({ key: { gift_card_id: 1, source: 1 }, unique: true }),
      ])
    );
    expect(cardIndexes).toEqual(expect.arrayContaining([expect.objectContaining({ key: { payment_id: 1 }, unique: true })]));
  });
});
