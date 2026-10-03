jest.mock('@modules/commerce/shiprocket/shiprocket.gateway', () => ({
  getServiceability: jest.fn(),
  isShiprocketConfigured: jest.fn().mockResolvedValue(false),
}));
jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@config/url-configs', () => ({
  ...jest.requireActual('@config/url-configs'),
  getUrlConfigs: jest.fn().mockResolvedValue({ ecommUrl: 'https://ecomm.example.test/' }),
}));
// The finalizer that turns a booked COD payment into orders is the pod shop's
// and is covered on its own; here only the hand-off to it is under test.
jest.mock('@modules/finance/payment/payment.service', () => ({
  ...jest.requireActual('@modules/finance/payment/payment.service'),
  settle: jest.fn().mockResolvedValue(undefined),
}));

import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { COD_GATEWAY } from '@modules/finance/payment/payment.finalize';
import { settle } from '@modules/finance/payment/payment.service';
import { sendEmail } from '@services/email/email.service';
import { StoreProductModel } from '../../storeProduct.model';
import { StoreSettingsModel } from '../../storeSettings.model';
import { StoreSubscriptionModel } from '../../storeSubscription.model';
import { storeAutoshipService } from '../../store.autoship.service';

/**
 * The Autoship runner books every due cycle as an ordinary pet-store COD order
 * (the same pricing plus the autoship discount), reminds the REMIND ones, and
 * pauses a subscription that keeps failing — and the console's table and
 * status override around it. A cycle is money, so the booked amounts are
 * pinned to the rupee.
 */

const WEEK = 7 * 86_400_000;
const DAY = 86_400_000;
const mockSettle = jest.mocked(settle);
const mockMail = jest.mocked(sendEmail);
const near = (actual: Date | null | undefined, expected: number) =>
  expect(Math.abs((actual?.getTime() ?? Number.NaN) - expected)).toBeLessThan(10_000);

const address = {
  name: 'Asha Verma',
  phone: '9811000000',
  line1: 'B-619 Windsor Paradise 2',
  city: 'Ghaziabad',
  state: 'Uttar Pradesh',
  pincode: '201017',
};

const openStore = (over: Record<string, unknown> = {}) =>
  StoreSettingsModel.updateOne(
    { singleton_key: 'store' },
    {
      $set: {
        store_enabled: true,
        autoship_enabled: true,
        autoship_discount_pct: 5,
        cod_enabled: true,
        cod_fee: 39,
        flat_shipping_fee: 49,
        ...over,
      },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

let seq = 0;
async function seedProduct(over: Record<string, unknown> = {}) {
  const warehouse = await BrandPickupLocationModel.create({ owner_kind: 'DUNCIT', nickname: `DUN-WH-R${++seq}`, pincode: '201301' });
  return StoreProductModel.create({
    product_name: 'Drools Adult Chicken 3 kg',
    sku: `DRL-R-${seq}`,
    brand_name: 'Drools',
    unit_cost: 849,
    inventory_count: 20,
    pickup_location_id: warehouse._id,
    weight_kg: 3.2,
    length_cm: 40,
    breadth_cm: 28,
    height_cm: 10,
    status: 'PUBLISHED',
    store: { slug: `drools-r-${seq}`, title: 'Drools Adult Chicken 3 kg', mrp: 999 },
    ...over,
  });
}

const seedBuyer = () =>
  UserModel.create({ auth: { email: `autoship-${++seq}@example.com` }, profile: { first_name: 'Asha', last_name: 'Verma' } });

const seedSub = (userId: unknown, productId: unknown, over: Record<string, unknown> = {}) =>
  StoreSubscriptionModel.create({
    user_id: userId,
    buyer_name: 'Asha Verma',
    buyer_email: 'asha.verma@example.com',
    phone_extension: '+91',
    phone_number: '9811000000',
    product_id: productId,
    product_name: 'Drools Adult Chicken 3 kg',
    qty: 2,
    frequency_weeks: 4,
    mode: 'COD_AUTO',
    status: 'ACTIVE',
    shipping_address: address,
    next_run_at: new Date(Date.now() - 60_000),
    ...over,
  });

describe('storeAutoshipService.runDue — booking a COD cycle', () => {
  it('books the cycle as a COD store order at the autoship price and records it on the subscription', async () => {
    await openStore();
    const buyer = await seedBuyer();
    const product = await seedProduct();
    const sub = await seedSub(buyer._id, product._id);
    const before = Date.now();

    expect(await storeAutoshipService.runDue()).toBe(1);

    const payment = await PaymentModel.findOne({ user_id: buyer._id }).lean();
    // ₹849 × 2 = ₹1698 of goods, 5% autoship off (₹84.90 → ₹84 whole), the ₹49
    // flat delivery and the ₹39 COD fee: ₹1702, GST 18% inside it.
    expect(payment).toMatchObject({
      target_type: 'PRODUCT',
      status: 'PENDING',
      gateway: COD_GATEWAY,
      total: 1702,
      gst_pct: 18,
      gst_amount: 259.63,
      subtotal: 1442.37,
      coupon_code: null,
      coupon_discount: 0,
      coins_redeemed: 0,
      user_name: 'Asha Verma',
      user_email: 'asha.verma@example.com',
      user_phone: '+91 9811000000',
      description: 'Autoship · Drools Adult Chicken 3 kg',
      pod_id: null,
    });
    expect(payment!.gateway_ref).toMatch(/^cod_\d+$/);
    expect(payment!.metadata).toMatchObject({
      source: 'store_checkout',
      product_cost_total: 1698,
      original_total: 1786,
      delivery_pincode: '201017',
      fulfilment_method: 'SHIP',
      shipping: { total: 49, all_quoted: false },
      selected_products: [{ product_id: String(product._id), variant_id: '', quantity: 2 }],
      store: {
        channel: 'PET_STORE',
        payment_method: 'COD',
        discount_total: 84,
        coupon_discount: 0,
        prepaid_discount: 0,
        autoship_discount: 84,
        cod_fee: 39,
        mrp_total: 1998,
        cart_owner_key: `u:${String(buyer._id)}`,
        autoship_id: String(sub._id),
      },
    });
    expect(mockSettle).toHaveBeenCalledWith(String(payment!._id), 'Cash on delivery', 'storeAutoship');

    const after = await StoreSubscriptionModel.findById(sub._id).lean();
    expect(after).toMatchObject({ run_count: 1, failures: 0, last_order_no: payment!.payment_id, status: 'ACTIVE' });
    near(after!.last_run_at, before);
    near(after!.next_run_at, before + 4 * WEEK);
    expect(after!.events.map((e) => [e.action, e.note])).toEqual([['ORDERED', payment!.payment_id]]);
  });

  it('does nothing when Autoship is switched off, or when nothing is due', async () => {
    await openStore({ autoship_enabled: false });
    const buyer = await seedBuyer();
    const product = await seedProduct();
    await seedSub(buyer._id, product._id);
    expect(await storeAutoshipService.runDue()).toBe(0);

    await openStore();
    await StoreSubscriptionModel.updateMany({}, { $set: { next_run_at: new Date(Date.now() + DAY) } });
    await seedSub(buyer._id, product._id, { status: 'PAUSED' });
    expect(await storeAutoshipService.runDue()).toBe(0);
    expect(await PaymentModel.countDocuments()).toBe(0);
  });

  it('handles the most overdue cycles first, up to the limit', async () => {
    await openStore({ store_enabled: false });
    const buyer = await seedBuyer();
    const product = await seedProduct();
    const older = await seedSub(buyer._id, product._id, { next_run_at: new Date(Date.now() - 3 * DAY) });
    const newer = await seedSub(buyer._id, product._id, { next_run_at: new Date(Date.now() - DAY) });

    expect(await storeAutoshipService.runDue(1)).toBe(1);

    expect((await StoreSubscriptionModel.findById(older._id).lean())!.failures).toBe(1);
    expect((await StoreSubscriptionModel.findById(newer._id).lean())!.failures).toBe(0);
  });
});

describe('storeAutoshipService.runDue — a cycle that cannot be booked', () => {
  const failureOf = async (subId: unknown) => {
    const sub = (await StoreSubscriptionModel.findById(subId).lean())!;
    return { failures: sub.failures, status: sub.status, note: sub.events.at(-1)?.note, action: sub.events.at(-1)?.action, next: sub.next_run_at };
  };

  it('retries a closed store tomorrow, and pauses after the third failure in a row', async () => {
    await openStore({ store_enabled: false });
    const buyer = await seedBuyer();
    const product = await seedProduct();
    const sub = await seedSub(buyer._id, product._id, { failures: 1 });
    const before = Date.now();

    await storeAutoshipService.runDue();
    const second = await failureOf(sub._id);
    expect(second).toMatchObject({ failures: 2, status: 'ACTIVE', action: 'FAILED', note: 'The store is closed' });
    near(second.next, before + DAY);

    await StoreSubscriptionModel.updateOne({ _id: sub._id }, { $set: { next_run_at: new Date(Date.now() - 1000) } });
    await storeAutoshipService.runDue();
    const third = (await StoreSubscriptionModel.findById(sub._id).lean())!;
    expect(third).toMatchObject({ failures: 3, status: 'PAUSED' });
    expect(third.events.slice(-2).map((e) => [e.action, e.note])).toEqual([
      ['FAILED', 'The store is closed'],
      ['PAUSED', 'Paused after repeated failures'],
    ]);
    expect(await PaymentModel.countDocuments()).toBe(0);
  });

  it.each([
    ['Cash on Delivery is switched off', { cod_enabled: false }, {}],
    ['We cannot deliver to this address', { serviceable_pincodes_enabled: true, serviceable_pincodes: ['110001'] }, {}],
    ['Cash on Delivery is not available for this order', { cod_max_order: 500 }, {}],
    ['An item in your cart is no longer available', {}, { status: 'DRAFT' }],
  ])('records "%s" and books nothing', async (reason, settings, productOver) => {
    await openStore(settings);
    const buyer = await seedBuyer();
    const product = await seedProduct(productOver);
    const sub = await seedSub(buyer._id, product._id);

    await storeAutoshipService.runDue();

    expect(await failureOf(sub._id)).toMatchObject({ failures: 1, action: 'FAILED', note: reason });
    expect(await PaymentModel.countDocuments()).toBe(0);
    expect(mockSettle).not.toHaveBeenCalled();
  });

  it('records a subscription whose account has gone', async () => {
    await openStore();
    const product = await seedProduct();
    const sub = await seedSub(new Types.ObjectId(), product._id);
    await storeAutoshipService.runDue();
    expect(await failureOf(sub._id)).toMatchObject({ note: 'The account behind this subscription no longer exists' });
  });
});

describe('storeAutoshipService.runDue — reminders', () => {
  it('emails a REMIND subscriber once per cycle and moves the cycle on', async () => {
    await openStore();
    const product = await seedProduct();
    const sub = await seedSub(new Types.ObjectId(), product._id, { mode: 'REMIND' });
    const before = Date.now();

    await storeAutoshipService.runDue();

    expect(mockMail).toHaveBeenCalledWith({
      to: 'asha.verma@example.com',
      subject: 'Time for your next Drools Adult Chicken 3 kg',
      template: 'store-autoship-due',
      category: 'transactional',
      vars: {
        name: 'Asha',
        product_name: 'Drools Adult Chicken 3 kg',
        qty: '2',
        frequency: '4',
        autoship_url: 'https://ecomm.example.test/autoship',
      },
    });
    const after = (await StoreSubscriptionModel.findById(sub._id).lean())!;
    expect(after.events.map((e) => e.action)).toEqual(['REMINDED']);
    expect(after.reminded_for!.getTime()).toBe(sub.next_run_at!.getTime());
    near(after.next_run_at, before + 4 * WEEK);
    expect(after.run_count).toBe(0);
    expect(await PaymentModel.countDocuments()).toBe(0);
  });

  it('does not email twice for a cycle it already reminded about', async () => {
    await openStore();
    const product = await seedProduct();
    const due = new Date(Date.now() - 60_000);
    const sub = await seedSub(new Types.ObjectId(), product._id, { mode: 'REMIND', next_run_at: due, reminded_for: due });

    await storeAutoshipService.runDue();

    expect(mockMail).not.toHaveBeenCalled();
    const after = (await StoreSubscriptionModel.findById(sub._id).lean())!;
    expect(after.events).toEqual([]);
    expect(after.next_run_at!.getTime()).toBeGreaterThan(Date.now());
  });

  it('still moves the cycle on when the reminder email fails', async () => {
    await openStore();
    mockMail.mockRejectedValueOnce(new Error('SMTP down'));
    const product = await seedProduct();
    const sub = await seedSub(new Types.ObjectId(), product._id, { mode: 'REMIND', buyer_name: '' });

    await storeAutoshipService.runDue();

    expect(mockMail).toHaveBeenCalledWith(expect.objectContaining({ vars: expect.objectContaining({ name: 'there' }) }));
    const after = (await StoreSubscriptionModel.findById(sub._id).lean())!;
    expect(after.events.map((e) => e.action)).toEqual(['REMINDED']);
    expect(after.next_run_at!.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('storeAutoshipService console', () => {
  it('pages every subscription for the console, soonest first, filterable by status', async () => {
    const product = await seedProduct();
    const user = new Types.ObjectId();
    await seedSub(user, product._id, { buyer_name: 'Later', next_run_at: new Date(Date.now() + 2 * DAY) });
    await seedSub(user, product._id, { buyer_name: 'Sooner', next_run_at: new Date(Date.now() + DAY), failures: 2, last_order_no: 'PET-1001' });
    await seedSub(user, product._id, { buyer_name: 'Stopped', status: 'CANCELLED', next_run_at: null });

    const page = await storeAutoshipService.table();
    expect(page.total).toBe(3);
    expect(page.rows.slice(-2).map((r) => r.buyer_name)).toEqual(['Sooner', 'Later']);
    expect(page.rows.find((r) => r.buyer_name === 'Sooner')).toMatchObject({
      product_id: String(product._id),
      product_name: 'Drools Adult Chicken 3 kg',
      failures: 2,
      last_order_no: 'PET-1001',
      mode: 'COD_AUTO',
      status: 'ACTIVE',
    });

    const cancelled = await storeAutoshipService.table({ filters: [{ field: 'status', op: 'eq', value: 'CANCELLED' }] });
    expect(cancelled.rows.map((r) => r.buyer_name)).toEqual(['Stopped']);
  });

  it('lets an operator cancel, pause and re-activate a subscription, logging each as an admin action', async () => {
    const product = await seedProduct();
    const sub = await seedSub(new Types.ObjectId(), product._id, { failures: 3, status: 'PAUSED', next_run_at: new Date(Date.now() - WEEK) });
    const id = String(sub._id);

    const before = Date.now();
    const active = await storeAutoshipService.adminSetStatus(id, 'ACTIVE');
    expect(active).toMatchObject({ status: 'ACTIVE', failures: 0 });
    near(new Date(active.next_run_at!), before);

    const paused = await storeAutoshipService.adminSetStatus(id, 'PAUSED');
    expect(paused.status).toBe('PAUSED');
    expect(paused.next_run_at).toBe(active.next_run_at);

    const cancelled = await storeAutoshipService.adminSetStatus(id, 'CANCELLED');
    expect(cancelled).toMatchObject({ status: 'CANCELLED', next_run_at: null });

    const events = (await StoreSubscriptionModel.findById(id).lean())!.events.map((e) => e.action);
    expect(events).toEqual(['ADMIN_ACTIVE', 'ADMIN_PAUSED', 'ADMIN_CANCELLED']);
  });

  it('keeps a future cycle when re-activating, and refuses an unknown status or subscription', async () => {
    const product = await seedProduct();
    const next = new Date(Date.now() + WEEK);
    const sub = await seedSub(new Types.ObjectId(), product._id, { status: 'PAUSED', next_run_at: next });
    expect((await storeAutoshipService.adminSetStatus(String(sub._id), 'ACTIVE')).next_run_at).toBe(next.toISOString());

    await expect(storeAutoshipService.adminSetStatus(String(sub._id), 'DELETED' as never)).rejects.toThrow('Unknown status');
    await expect(storeAutoshipService.adminSetStatus(new Types.ObjectId().toHexString(), 'PAUSED')).rejects.toMatchObject({
      message: 'Subscription not found',
      extensions: { code: 'NOT_FOUND' },
    });
  });
});
