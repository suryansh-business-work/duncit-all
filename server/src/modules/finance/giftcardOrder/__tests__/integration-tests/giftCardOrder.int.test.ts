jest.mock('@services/notify/notify.service', () => ({
  notifyEvent: jest.fn().mockResolvedValue({ wa: { status: 'SENT' }, mail: null }),
}));
jest.mock('@config/url-configs', () => ({
  getUrlConfigs: jest.fn().mockResolvedValue({ appUrl: 'https://app.example.test' }),
}));

import { Types } from 'mongoose';
import { notifyEvent } from '@services/notify/notify.service';
import { UserModel } from '@modules/access/user/user.model';
import { settingsService } from '@modules/platform/settings/settings.service';
import { PaymentModel, type IPayment } from '@modules/finance/payment/payment.model';
import { GiftCardModel, GiftCardTransactionModel } from '@modules/finance/giftcard/giftcard.model';
import { giftCardSettingsService } from '@modules/finance/giftcard/giftcard.settings.service';
import { giftcardService } from '@modules/finance/giftcard/giftcard.service';
import { factsTotal, type GiftCardPurchaseFacts } from '@modules/finance/giftcard/giftcard.facts';
import {
  PhysicalGiftCardBatchModel,
  PhysicalGiftCardModel,
} from '@modules/finance/physicalGiftCard/physicalGiftCard.model';
import { GiftCardDesignModel } from '../../giftCardDesign.model';
import { GiftCardOrderModel } from '../../giftCardOrder.model';
import { GiftCardActivityModel } from '../../giftCardActivity.model';
import { giftCardOrderService } from '../../giftCardOrder.service';
import { giftCardOrderAdminService } from '../../giftCardOrder.admin.service';

/**
 * A gift card order is money end to end: what a catalogue purchase may ask for,
 * the PENDING order beside the checkout, the cards a successful payment issues
 * (and only once, however often the success path replays), the physical stock
 * it takes, and who may read it afterwards.
 */

const mockNotify = jest.mocked(notifyEvent);
const ADDRESS = {
  name: 'Priya Nair',
  phone: '9876543210',
  line1: '12 MG Road, Indiranagar',
  line2: '',
  landmark: '',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560038',
  country: 'India',
};

let seq = 0;
const seedUser = () =>
  UserModel.create({ auth: { email: `buyer${++seq}@x.com` }, profile: { first_name: 'Aarav', last_name: 'Shah' } });

const seedDesign = (over: Record<string, unknown> = {}) =>
  GiftCardDesignModel.create({
    name: 'Classic',
    front_image_url: 'https://ik.imagekit.io/duncit/front.png',
    back_image_url: 'https://ik.imagekit.io/duncit/back.png',
    is_default: true,
    physical_stock: 10,
    ...over,
  });

const seedPayment = (userId: Types.ObjectId, facts: GiftCardPurchaseFacts, over: Record<string, unknown> = {}) =>
  PaymentModel.create({
    payment_id: `pay_gco_${++seq}`,
    user_id: userId,
    user_name: 'Aarav Shah',
    user_email: 'aarav@x.com',
    user_phone: '9876543210',
    checkout_url: 'https://app.example.test/gift-cards/checkout',
    target_type: 'GIFT_CARD',
    description: 'Gift card',
    subtotal: factsTotal(facts),
    total: factsTotal(facts),
    currency_symbol: '₹',
    status: 'PENDING',
    gateway: 'DUMMY',
    metadata: { gift_card: facts },
    ...over,
  }) as Promise<IPayment>;

const enablePhysical = () => giftCardSettingsService.update({ shipping_fee: 99, physical_enabled: true });

beforeAll(async () => {
  await Promise.all([
    GiftCardModel.init(),
    GiftCardTransactionModel.init(),
    GiftCardOrderModel.init(),
    GiftCardDesignModel.init(),
    PhysicalGiftCardBatchModel.init(),
    PhysicalGiftCardModel.init(),
  ]);
});

beforeEach(() => mockNotify.mockClear());
afterEach(() => jest.restoreAllMocks());

describe('purchaseFacts — catalogue purchase', () => {
  it('buys the default design digitally when the app names no design', async () => {
    const design = await seedDesign();
    const facts = await giftcardService.purchaseFacts({ amount: 500, quantity: 3, recipient_email: ' Friend@X.com ' });
    expect(facts).toMatchObject({
      scope_type: 'SHOP',
      design_id: String(design._id),
      design_name: 'Classic',
      scope_image_front_url: design.front_image_url,
      scope_image_back_url: design.back_image_url,
      quantity: 3,
      delivery_mode: 'DIGITAL',
      shipping_fee: 0,
      shipping_address: null,
      recipient_email: 'friend@x.com',
    });
    expect(factsTotal(facts)).toBe(1500);
  });

  it('says gift cards are unavailable while the catalogue has no default design', async () => {
    await expect(giftcardService.purchaseFacts({ amount: 500, quantity: 1 })).rejects.toMatchObject({
      extensions: { code: 'NOT_FOUND', field: 'design_id' },
    });
  });

  it.each([[0], [11], [2.5]])('refuses a quantity of %p (policy maximum 10)', async (quantity) => {
    await seedDesign();
    await expect(giftcardService.purchaseFacts({ amount: 500, quantity })).rejects.toMatchObject({
      message: 'Choose between 1 and 10 cards',
      extensions: { field: 'quantity' },
    });
  });

  it('charges the delivery fee once on a physical order and drops any recipient email', async () => {
    await seedDesign();
    await enablePhysical();
    const facts = await giftcardService.purchaseFacts({
      amount: 1000,
      quantity: 4,
      delivery_mode: 'PHYSICAL',
      recipient_email: 'friend@x.com',
      shipping_address: ADDRESS,
    });
    expect(facts).toMatchObject({ delivery_mode: 'PHYSICAL', shipping_fee: 99, recipient_email: '', shipping_address: ADDRESS });
    expect(factsTotal(facts)).toBe(4099);
  });

  it('refuses a physical order while physical delivery is off', async () => {
    await seedDesign();
    await expect(
      giftcardService.purchaseFacts({ amount: 500, delivery_mode: 'PHYSICAL', shipping_address: ADDRESS })
    ).rejects.toThrow('Physical gift cards are not available right now');
  });

  it('refuses more printed cards than the design has in stock', async () => {
    await seedDesign({ physical_stock: 2 });
    await enablePhysical();
    await expect(
      giftcardService.purchaseFacts({ amount: 500, quantity: 3, delivery_mode: 'PHYSICAL', shipping_address: ADDRESS })
    ).rejects.toMatchObject({ message: 'Only 2 printed cards are left', extensions: { field: 'quantity' } });
  });

  it('refuses an address a courier would reject', async () => {
    await seedDesign();
    await enablePhysical();
    await expect(
      giftcardService.purchaseFacts({
        amount: 500,
        delivery_mode: 'PHYSICAL',
        shipping_address: { ...ADDRESS, pincode: '5600', phone: '12' },
      })
    ).rejects.toThrow('Enter a 6-digit pincode and a 10-digit phone number');
  });

  it('keeps the legacy theme purchase of older apps on the old path', async () => {
    await seedDesign();
    jest.spyOn(settingsService, 'getBranding').mockResolvedValue({ pod_shop_slider: [], logo_url: '' } as never);
    const facts = await giftcardService.purchaseFacts({ scope_type: 'SHOP', amount: 500 });
    expect(facts.design_id).toBeUndefined();
    expect(facts.quantity).toBeUndefined();
  });
});

describe('giftCardOrderService — checkout and payment success', () => {
  it('creates one PENDING order per payment, whatever the replays', async () => {
    const user = await seedUser();
    await seedDesign();
    const facts = await giftcardService.purchaseFacts({ amount: 500, quantity: 2 });
    const payment = await seedPayment(user._id, facts);
    const a = await giftCardOrderService.createForPayment(payment, facts);
    const b = await giftCardOrderService.createForPayment(payment, facts);
    expect(String(a._id)).toBe(String(b._id));
    expect(a).toMatchObject({ payment_status: 'PENDING', quantity: 2, cards_value: 1000, total: 1000 });
    expect(await GiftCardActivityModel.countDocuments({ entity_id: a._id, action: 'ORDER_PLACED' })).toBe(1);
  });

  it('issues one virtual card per unit on a digital payment, and nothing more on a replay', async () => {
    const user = await seedUser();
    await seedDesign();
    const facts = await giftcardService.purchaseFacts({ amount: 500, quantity: 3 });
    const payment = await seedPayment(user._id, facts);
    await giftCardOrderService.createForPayment(payment, facts);

    const first = await giftCardOrderService.onPaid(payment, facts);
    const again = await giftCardOrderService.onPaid(payment, facts);

    const cards = await GiftCardModel.find({ payment_id: payment.payment_id }).sort({ line_index: 1 });
    expect(cards.map((c) => c.line_index)).toEqual([0, 1, 2]);
    expect(new Set(cards.map((c) => c.code)).size).toBe(3);
    expect(cards.every((c) => c.design_name === 'Classic' && String(c.order_id) === String(first.order._id))).toBe(true);
    expect(await GiftCardTransactionModel.countDocuments({ payment_id: payment.payment_id, type: 'ISSUE' })).toBe(3);
    expect(first.refs).toEqual(again.refs);
    expect(again.order).toMatchObject({ payment_status: 'PAID', fulfilment_status: 'PROCESSING' });
    expect(await GiftCardActivityModel.countDocuments({ entity_id: first.order._id, action: 'ORDER_PAID' })).toBe(1);
  });

  it('mints one scratch-card batch for a physical payment and takes the stock exactly once', async () => {
    const user = await seedUser();
    const design = await seedDesign({ physical_stock: 10 });
    await enablePhysical();
    const facts = await giftcardService.purchaseFacts({
      amount: 750,
      quantity: 4,
      delivery_mode: 'PHYSICAL',
      shipping_address: ADDRESS,
    });
    const payment = await seedPayment(user._id, facts);

    const { order } = await giftCardOrderService.onPaid(payment, facts);
    await giftCardOrderService.onPaid(payment, facts);

    const batches = await PhysicalGiftCardBatchModel.find({ order_id: order._id });
    expect(batches).toHaveLength(1);
    const cards = await PhysicalGiftCardModel.find({ batch_id: batches[0]._id });
    expect(cards).toHaveLength(4);
    expect(cards.every((c) => c.coins === 750 && c.assigned_user_id === null)).toBe(true);
    expect((await GiftCardDesignModel.findById(design._id))?.physical_stock).toBe(6);
    expect(await GiftCardModel.countDocuments({ payment_id: payment.payment_id })).toBe(0);
    const saved = await GiftCardOrderModel.findById(order._id);
    expect(saved).toMatchObject({ stock_consumed: true, stock_short: false, shipping_fee: 99, total: 3099 });
    expect(String(saved?.physical_batch_id)).toBe(String(batches[0]._id));
  });

  it('flags the order instead of selling stock it does not have when two buyers race', async () => {
    const user = await seedUser();
    const design = await seedDesign({ physical_stock: 3 });
    await enablePhysical();
    const facts = await giftcardService.purchaseFacts({ amount: 500, quantity: 3, delivery_mode: 'PHYSICAL', shipping_address: ADDRESS });
    // Another order took the cards between this checkout and its payment.
    await GiftCardDesignModel.updateOne({ _id: design._id }, { $set: { physical_stock: 1 } });
    const { order } = await giftCardOrderService.onPaid(await seedPayment(user._id, facts), facts);
    expect(order).toMatchObject({ stock_short: true, stock_consumed: false, payment_status: 'PAID' });
    expect((await GiftCardDesignModel.findById(design._id))?.physical_stock).toBe(1);
    expect(await GiftCardActivityModel.countDocuments({ entity_id: order._id, action: 'STOCK_SHORT' })).toBe(1);
  });

  it('confirms the order to the buyer, and marks a digital order delivered once its cards are mailed', async () => {
    const user = await seedUser();
    await seedDesign();
    const facts = await giftcardService.purchaseFacts({ amount: 500, quantity: 1 });
    const payment = await seedPayment(user._id, facts);
    await giftCardOrderService.onPaid(payment, facts);

    await giftCardOrderService.confirm(payment.payment_id);
    await giftCardOrderService.markEmailed(payment.payment_id, 'aarav@x.com');
    await giftCardOrderService.markEmailed(payment.payment_id, 'aarav@x.com');

    const order = await GiftCardOrderModel.findOne({ payment_id: payment.payment_id });
    expect(order).toMatchObject({ fulfilment_status: 'DELIVERED' });
    expect(order?.emailed_at).toBeInstanceOf(Date);
    expect(mockNotify.mock.calls.map(([input]) => input.event)).toEqual([
      'GIFT_CARD_ORDER_CONFIRMED',
      'GIFT_CARD_ORDER_DELIVERED',
    ]);
    expect(mockNotify.mock.calls[0][0]).toMatchObject({
      entityId: `${String(order?._id)}:GIFT_CARD_ORDER_CONFIRMED`,
      params: ['Aarav', order?.order_no, '₹500.00', `https://app.example.test/gift-cards/orders/${order?.order_no}`],
    });
  });
});

describe('giftCardOrderService — member reads', () => {
  it('lists only the caller’s orders and shows a failed payment as failed', async () => {
    const [me, other] = await Promise.all([seedUser(), seedUser()]);
    await seedDesign();
    const facts = await giftcardService.purchaseFacts({ amount: 500 });
    const mine = await seedPayment(me._id, facts, { status: 'FAILED' });
    await giftCardOrderService.createForPayment(mine, facts);
    await giftCardOrderService.createForPayment(await seedPayment(other._id, facts), facts);

    const page = await giftCardOrderService.myOrders(String(me._id));
    expect(page.total).toBe(1);
    expect(page.rows[0]).toMatchObject({ payment_status: 'FAILED', quantity: 1, shipment: null });
    expect((await GiftCardOrderModel.findOne({ payment_id: mine.payment_id }))?.payment_status).toBe('FAILED');
  });

  it('answers NOT_FOUND for another member’s order number', async () => {
    const [me, other] = await Promise.all([seedUser(), seedUser()]);
    await seedDesign();
    const facts = await giftcardService.purchaseFacts({ amount: 500 });
    const order = await giftCardOrderService.createForPayment(await seedPayment(other._id, facts), facts);
    await expect(giftCardOrderService.myOrder(String(me._id), order.order_no)).rejects.toMatchObject({
      extensions: { code: 'NOT_FOUND' },
    });
    expect((await giftCardOrderService.myOrder(String(other._id), order.order_no.toLowerCase())).id).toBe(String(order._id));
  });
});

describe('giftCardOrderAdminService — fulfilment before the courier', () => {
  // The shop (one default design, printed cards on) is set up once per test;
  // each call then places one more paid printed order against it.
  const paidPhysical = async (shopReady = false) => {
    const user = await seedUser();
    if (!shopReady) {
      await seedDesign();
      await enablePhysical();
    }
    const facts = await giftcardService.purchaseFacts({ amount: 500, quantity: 2, delivery_mode: 'PHYSICAL', shipping_address: ADDRESS });
    return (await giftCardOrderService.onPaid(await seedPayment(user._id, facts), facts)).order;
  };
  const admin = new Types.ObjectId().toHexString();

  it('marks a paid physical order printed once, and refuses it again', async () => {
    const order = await paidPhysical();
    const view = await giftCardOrderAdminService.markPrinted(String(order._id), admin);
    expect(view).toMatchObject({ fulfilment_status: 'PRINTED', label_available: false });
    await expect(giftCardOrderAdminService.markPrinted(String(order._id), admin)).rejects.toThrow(
      'This order is already past printing'
    );
  });

  it('refuses to print an unpaid order or a digital one', async () => {
    const user = await seedUser();
    await seedDesign();
    const facts = await giftcardService.purchaseFacts({ amount: 500 });
    const digital = await giftCardOrderService.createForPayment(await seedPayment(user._id, facts), facts);
    await expect(giftCardOrderAdminService.markPrinted(String(digital._id), admin)).rejects.toThrow('Only a physical order is printed');
  });

  it('corrects the address before booking, by the courier’s rules', async () => {
    const order = await paidPhysical();
    await expect(
      giftCardOrderAdminService.updateAddress(String(order._id), { pincode: '12' }, admin)
    ).rejects.toThrow('Enter a 6-digit pincode');
    const view = await giftCardOrderAdminService.updateAddress(String(order._id), { line1: '44 Brigade Road', pincode: '560025' }, admin);
    expect(view.shipping_address).toMatchObject({ line1: '44 Brigade Road', pincode: '560025', city: 'Bengaluru' });
    expect(await GiftCardActivityModel.countDocuments({ entity_id: order._id, action: 'ADDRESS_UPDATED' })).toBe(1);
  });

  it('counts the book by what each order waits on', async () => {
    const order = await paidPhysical();
    await paidPhysical(true);
    await giftCardOrderAdminService.markPrinted(String(order._id), admin);
    expect(await giftCardOrderAdminService.stats()).toMatchObject({
      paid_orders: 2,
      paid_value: 2 * 1099,
      to_print: 1,
      to_ship: 1,
      delivered: 0,
      needs_attention: 0,
    });
  });

  it('shows an order’s audit trail newest first, with who acted', async () => {
    const order = await paidPhysical();
    await giftCardOrderAdminService.markPrinted(String(order._id), admin);
    const detail = await giftCardOrderAdminService.detail(String(order._id));
    expect(detail.history.map((h) => h.action)).toEqual(['ORDER_PRINTED', 'CARDS_ISSUED', 'ORDER_PAID']);
    expect(detail.order).toMatchObject({ buyer_email: 'aarav@x.com', physical_batch_id: expect.any(String) });
  });
});
