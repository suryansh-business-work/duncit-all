jest.mock('@modules/commerce/shiprocket/shiprocket.gateway', () => ({
  getServiceability: jest.fn(),
  isShiprocketConfigured: jest.fn().mockResolvedValue(false),
}));
jest.mock('@modules/finance/payment/razorpay.gateway', () => ({
  ...jest.requireActual('@modules/finance/payment/razorpay.gateway'),
  isRazorpayConfigured: jest.fn(),
  getRazorpayKeys: jest.fn(),
  createRazorpayOrder: jest.fn(),
}));
// The finalizer that turns a settled payment into orders is shared with the pod
// shop and covered on its own; here only the hand-off to it is under test.
jest.mock('@modules/finance/payment/payment.service', () => ({
  ...jest.requireActual('@modules/finance/payment/payment.service'),
  settle: jest.fn().mockResolvedValue(undefined),
  verifyRazorpayAndSettle: jest.fn(),
}));

import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { UserModel } from '@modules/access/user/user.model';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { CouponModel } from '@modules/finance/coupon/coupon.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { settle, verifyRazorpayAndSettle } from '@modules/finance/payment/payment.service';
import { createRazorpayOrder, getRazorpayKeys, isRazorpayConfigured } from '@modules/finance/payment/razorpay.gateway';
import { otpService } from '@modules/platform/otp/otp.service';
import { StoreProductModel } from '../../storeProduct.model';
import { StoreSettingsModel } from '../../storeSettings.model';
import { StoreCartModel } from '../../storeCart.model';
import { StoreSubscriptionModel } from '../../storeSubscription.model';
import { storeCheckoutService } from '../../store.checkout.service';

/**
 * Placing a pet-store order and coming back to it. Each way of paying writes
 * one payment row with the quote's money and the facts the finalizer needs,
 * and only the account that placed it, or the guest holding its cart or key,
 * may verify or read it back.
 */

const mockSettle = jest.mocked(settle);
const mockVerify = jest.mocked(verifyRazorpayAndSettle);
const mockRazorpayOn = jest.mocked(isRazorpayConfigured);
const mockOrder = jest.mocked(createRazorpayOrder);
const mockKeys = jest.mocked(getRazorpayKeys);

const TOKEN = 'guest-cart-token-000000000002';
const guest = { user: null } as unknown as GraphQLContext;
const signedIn = (id: string) => ({ user: { id, roles: [] } }) as unknown as GraphQLContext;

const shipTo = {
  name: 'Asha Verma',
  phone: '9811000000',
  line1: 'B-619 Windsor Paradise 2',
  city: 'Ghaziabad',
  state: 'Uttar Pradesh',
  pincode: '201017',
};
const order = (over: Record<string, unknown> = {}) => ({
  cart_token: TOKEN,
  contact: { name: 'Asha Verma', email: 'Asha@Example.com', phone_extension: '+91', phone_number: '9811000000' },
  shipping_address: shipTo,
  checkout_url: 'https://ecomm.duncit.com/checkout',
  ...over,
});

const openStore = (over: Record<string, unknown> = {}) =>
  StoreSettingsModel.updateOne(
    { singleton_key: 'store' },
    { $set: { store_enabled: true, flat_shipping_fee: 49, ...over } },
    { upsert: true, setDefaultsOnInsert: true }
  );

let seq = 0;
async function seedProduct(over: Record<string, unknown> = {}) {
  const warehouse = await BrandPickupLocationModel.create({ owner_kind: 'DUNCIT', nickname: `DUN-WH-P${++seq}`, pincode: '201301' });
  return StoreProductModel.create({
    product_name: 'Drools Adult Chicken 3 kg',
    sku: `DRL-P-${seq}`,
    brand_name: 'Drools',
    unit_cost: 849,
    inventory_count: 20,
    pickup_location_id: warehouse._id,
    weight_kg: 3.2,
    length_cm: 40,
    breadth_cm: 28,
    height_cm: 10,
    status: 'PUBLISHED',
    store: { slug: `drools-p-${seq}`, title: 'Drools Adult Chicken 3 kg', mrp: 999 },
    ...over,
  });
}

async function seedBasket(ownerKey = `g:${TOKEN}`, qty = 2, productOver: Record<string, unknown> = {}) {
  const product = await seedProduct(productOver);
  await StoreCartModel.create({ owner_key: ownerKey, items: [{ product_id: product._id, variant_id: '', qty }] });
  return product;
}

beforeEach(() => {
  mockRazorpayOn.mockResolvedValue(false);
  mockKeys.mockResolvedValue({ keyId: 'rzp_test_key', keySecret: 'secret' } as never);
  mockOrder.mockResolvedValue({ id: 'order_test_1' } as never);
});

afterEach(() => jest.restoreAllMocks());

describe('storeCheckoutService.place — refusals', () => {
  it('refuses while the store is closed, and a guest when guest checkout is off', async () => {
    await expect(storeCheckoutService.place(guest, order())).rejects.toMatchObject({ extensions: { code: 'STORE_CLOSED' } });
    await openStore({ guest_checkout_enabled: false });
    await expect(storeCheckoutService.place(guest, order())).rejects.toMatchObject({
      message: 'Sign in to check out',
      extensions: { code: 'UNAUTHENTICATED' },
    });
  });

  it.each([
    ['The minimum order value is 5000', { min_order_value: 5000 }, {}, {}],
    ['We cannot deliver to this pincode yet', { serviceable_pincodes_enabled: true, serviceable_pincodes: ['110001'] }, {}, {}],
    ['Invalid or inactive coupon code', {}, { coupon_code: 'NOPE10' }, {}],
    ['Cash on Delivery is not available for this order', {}, { payment_method: 'COD' }, {}],
    ['Verify your phone number to place a Cash on Delivery order', { cod_enabled: true }, { payment_method: 'COD' }, {}],
    ['Drools Adult Chicken 3 kg is out of stock', {}, {}, { inventory_count: 0 }],
  ])('refuses "%s" and writes no payment', async (message, settings, args, productOver) => {
    await openStore(settings);
    await seedBasket(`g:${TOKEN}`, 2, productOver);

    await expect(storeCheckoutService.place(guest, order(args))).rejects.toMatchObject({
      message,
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(await PaymentModel.countDocuments()).toBe(0);
    expect((await StoreCartModel.findOne({ owner_key: `g:${TOKEN}` }).lean())!.items).toHaveLength(1);
  });
});

describe('storeCheckoutService.place — Cash on Delivery', () => {
  it('books a guest’s COD order with the phone proof, hands it to the finalizer and empties the cart', async () => {
    await openStore({ cod_enabled: true, cod_fee: 39 });
    await seedBasket();
    const consume = jest.spyOn(otpService, 'consume').mockResolvedValue({} as never);

    const out = await storeCheckoutService.place(guest, order({ payment_method: 'COD', cod_challenge_id: 'chal-7' }));

    expect(consume).toHaveBeenCalledWith('chal-7', expect.objectContaining({ purpose: 'STORE_COD' }));
    const payment = (await PaymentModel.findById(out.payment_doc_id).lean())!;
    expect(out).toMatchObject({
      status: 'COD_CONFIRMED',
      payment_id: payment.payment_id,
      total: 1786,
      currency_symbol: '₹',
      orders: [],
      razorpay: null,
    });
    expect(out.access_key).toMatch(/^[\da-f]{48}$/);
    expect(payment).toMatchObject({
      user_id: null,
      user_email: 'asha@example.com',
      target_type: 'PRODUCT',
      gateway: 'COD',
      status: 'PENDING',
      total: 1786,
      description: 'Pet store order · 1 item',
      checkout_url: 'https://ecomm.duncit.com/checkout',
    });
    expect(payment.metadata.store).toMatchObject({
      payment_method: 'COD',
      cod_fee: 39,
      access_key: out.access_key,
      cart_owner_key: `g:${TOKEN}`,
    });
    expect(payment.metadata.store).not.toHaveProperty('autoship_id');
    expect(mockSettle).toHaveBeenCalledWith(out.payment_doc_id, 'Cash on delivery', 'storePlaceOrder');

    const cart = (await StoreCartModel.findOne({ owner_key: `g:${TOKEN}` }).lean())!;
    expect(cart).toMatchObject({ items: [], coupon_code: '', email: 'asha@example.com', phone: '9811000000' });
    expect(String(cart.converted_payment_id)).toBe(out.payment_doc_id);
  });

  it('books COD without a code when the store does not ask for one', async () => {
    await openStore({ cod_enabled: true, cod_requires_otp: false });
    await seedBasket();
    const consume = jest.spyOn(otpService, 'consume');
    const out = await storeCheckoutService.place(guest, order({ payment_method: 'COD' }));
    expect(out.status).toBe('COD_CONFIRMED');
    expect(consume).not.toHaveBeenCalled();
  });
});

describe('storeCheckoutService.place — paying online', () => {
  it('opens a Razorpay sheet for the exact total in paise, and keeps the cart until it is paid', async () => {
    mockRazorpayOn.mockResolvedValue(true);
    await openStore({ razorpay_account: 'petstore', store_name: 'Duncit Pets' });
    await seedBasket();

    const out = await storeCheckoutService.place(guest, order());

    expect(mockOrder).toHaveBeenCalledWith({
      amountPaise: 174700,
      currency: 'INR',
      receipt: out.payment_id,
      notes: { kind: 'pet_store', user_id: 'guest' },
      account: 'petstore',
    });
    expect(mockKeys).toHaveBeenCalledWith('petstore');
    expect(out).toMatchObject({ status: 'PENDING_PAYMENT', total: 1747 });
    expect(out.razorpay).toMatchObject({
      payment_doc_id: out.payment_doc_id,
      key_id: 'rzp_test_key',
      order_id: 'order_test_1',
      amount: 174700,
      currency: 'INR',
      name: 'Duncit Pets',
      description: 'Pet store order · 1 item',
      prefill_email: 'asha@example.com',
      prefill_contact: '9811000000',
      total: 1747,
      free: false,
    });
    const payment = (await PaymentModel.findById(out.payment_doc_id).lean())!;
    expect(payment).toMatchObject({ gateway: 'RAZORPAY', gateway_ref: 'order_test_1', status: 'PENDING' });
    expect(payment.metadata).toMatchObject({ razorpay_order_id: 'order_test_1', razorpay_account: 'petstore' });
    expect(mockSettle).not.toHaveBeenCalled();
    expect((await StoreCartModel.findOne({ owner_key: `g:${TOKEN}` }).lean())!.items).toHaveLength(1);
  });

  it('never uses dummy mode while a Razorpay account is configured, and uses it when none is', async () => {
    await openStore();
    await seedBasket();

    const out = await storeCheckoutService.place(guest, order());

    expect(out).toMatchObject({ status: 'PAID', razorpay: null });
    const payment = (await PaymentModel.findById(out.payment_doc_id).lean())!;
    expect(payment.gateway).toBe('DUMMY');
    expect(payment.gateway_ref).toMatch(/^dummy_\d+$/);
    expect(mockSettle).toHaveBeenCalledWith(out.payment_doc_id, 'Dummy Gateway', 'storePlaceOrder');
    expect(mockOrder).not.toHaveBeenCalled();
    expect((await StoreCartModel.findOne({ owner_key: `g:${TOKEN}` }).lean())!.items).toEqual([]);
  });

  it('settles a basket a 100% coupon fully covers without any gateway', async () => {
    mockRazorpayOn.mockResolvedValue(true);
    await openStore({ free_shipping_above: 500 });
    await CouponModel.create({ code: 'FREEPET', discount_pct: 100, scope: 'STORE' });
    await seedBasket();

    const out = await storeCheckoutService.place(guest, order({ coupon_code: 'freepet' }));

    expect(out).toMatchObject({ status: 'PAID', total: 0 });
    const payment = (await PaymentModel.findById(out.payment_doc_id).lean())!;
    expect(payment).toMatchObject({ gateway: 'COUPON', coupon_code: 'FREEPET', coupon_discount: 1698, total: 0 });
    expect(mockSettle).toHaveBeenCalledWith(out.payment_doc_id, 'Coupon (100% off)', 'storePlaceOrder');
    expect(mockOrder).not.toHaveBeenCalled();
  });

  it('bills a signed-in buyer to a separate billing address and returns no guest key', async () => {
    const user = await UserModel.create({ auth: { email: 'asha.buyer@example.com' }, profile: { first_name: 'Asha', last_name: 'Verma' } });
    await openStore();
    await seedBasket(`u:${String(user._id)}`, 1);

    const out = await storeCheckoutService.place(
      signedIn(String(user._id)),
      order({
        cart_token: null,
        billing_same_as_shipping: false,
        billing_address: { ...shipTo, line1: 'Plot 4, Udyog Vihar', city: 'Gurugram', state: 'Haryana', pincode: '122016' },
        gstin: ' 06abcde1234f1z5 ',
      })
    );

    expect(out.access_key).toBe('');
    const payment = (await PaymentModel.findById(out.payment_doc_id).lean())!;
    expect(String(payment.user_id)).toBe(String(user._id));
    expect(payment.billing).toMatchObject({ line1: 'Plot 4, Udyog Vihar', city: 'Gurugram', pincode: '122016', gstin: '06ABCDE1234F1Z5' });
    expect(payment.metadata.shipping_address).toMatchObject({ city: 'Ghaziabad', pincode: '201017' });
    expect(payment.metadata.store.cart_owner_key).toBe(`u:${String(user._id)}`);
  });

  it('gives an Autoship "Order now" checkout its discount and records the subscription', async () => {
    const user = await UserModel.create({ auth: { email: 'autoship.buyer@example.com' }, profile: { first_name: 'Asha' } });
    await openStore({ autoship_enabled: true, autoship_discount_pct: 10 });
    const product = await seedBasket(`u:${String(user._id)}`, 2);
    const sub = await StoreSubscriptionModel.create({
      user_id: user._id,
      product_id: product._id,
      qty: 2,
      frequency_weeks: 4,
      status: 'ACTIVE',
    });

    const out = await storeCheckoutService.place(signedIn(String(user._id)), order({ cart_token: null, autoship_id: String(sub._id) }));

    // ₹1698 of goods − 10% autoship (₹169.80 → ₹169) + ₹49 delivery.
    expect(out.total).toBe(1578);
    const payment = (await PaymentModel.findById(out.payment_doc_id).lean())!;
    expect(payment.metadata.store).toMatchObject({ autoship_id: String(sub._id), autoship_discount: 169, discount_total: 169 });
  });
});

describe('storeCheckoutService.verify and confirmation', () => {
  const ACCESS_KEY = 'a'.repeat(48);

  const seedStorePayment = (over: Record<string, unknown> = {}, store: Record<string, unknown> = {}) =>
    PaymentModel.create({
      payment_id: `pay_store_${++seq}`,
      user_id: null,
      user_name: 'Asha Verma',
      user_email: 'asha@example.com',
      subtotal: 1480.51,
      total: 1747,
      target_type: 'PRODUCT',
      gateway: 'RAZORPAY',
      gateway_ref: 'order_test_1',
      metadata: { store: { access_key: ACCESS_KEY, cart_owner_key: `g:${TOKEN}`, ...store } },
      ...over,
    });

  const proof = (paymentDocId: unknown, over: Record<string, unknown> = {}) => ({
    payment_doc_id: String(paymentDocId),
    razorpay_order_id: 'order_test_1',
    razorpay_payment_id: 'pay_rzp_1',
    razorpay_signature: 'sig',
    ...over,
  });

  it('reports an unknown payment and one that is not a store order', async () => {
    await expect(storeCheckoutService.verify(guest, proof(new Types.ObjectId()))).rejects.toThrow('Payment not found');
    const podPayment = await seedStorePayment({ metadata: {} });
    await expect(storeCheckoutService.verify(guest, proof(podPayment._id, { access_key: ACCESS_KEY }))).rejects.toMatchObject({
      message: 'Order not found',
      extensions: { code: 'NOT_FOUND' },
    });
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('lets a guest verify with the order key, then empties the cart and reports it PAID', async () => {
    await StoreCartModel.create({ owner_key: `g:${TOKEN}`, items: [{ product_id: new Types.ObjectId(), qty: 1 }] });
    const payment = await seedStorePayment();
    mockVerify.mockImplementation(async (doc: { _id: unknown }) => {
      await PaymentModel.updateOne({ _id: doc._id }, { $set: { status: 'SUCCESS' } });
      return { status: 'SUCCESS' } as never;
    });

    const out = await storeCheckoutService.verify(guest, proof(payment._id, { access_key: ACCESS_KEY }));

    expect(out).toMatchObject({ status: 'PAID', payment_id: payment.payment_id, access_key: ACCESS_KEY, total: 1747 });
    expect(mockVerify).toHaveBeenCalledTimes(1);
    const [verifiedDoc, signedInput, component] = mockVerify.mock.calls[0];
    expect(String(verifiedDoc._id)).toBe(String(payment._id));
    expect(signedInput).toMatchObject({ razorpay_order_id: 'order_test_1', razorpay_payment_id: 'pay_rzp_1', razorpay_signature: 'sig' });
    expect(component).toBe('storeVerifyPayment');
    expect((await StoreCartModel.findOne({ owner_key: `g:${TOKEN}` }).lean())!.items).toEqual([]);
  });

  it('lets a guest verify from the cart that placed it, and reports a refused signature as FAILED', async () => {
    const payment = await seedStorePayment();
    mockVerify.mockResolvedValue({ status: 'FAILED' } as never);
    const out = await storeCheckoutService.verify(guest, proof(payment._id, { cart_token: ` ${TOKEN} ` }));
    expect(out.status).toBe('FAILED');
  });

  it('refuses anyone without the key or the cart, and another account', async () => {
    const payment = await seedStorePayment();
    await expect(storeCheckoutService.verify(guest, proof(payment._id, { access_key: 'b'.repeat(48) }))).rejects.toMatchObject({
      message: 'This order link is not valid',
      extensions: { code: 'FORBIDDEN' },
    });
    await expect(
      storeCheckoutService.verify(guest, proof(payment._id, { cart_token: 'guest-cart-token-999999999999' }))
    ).rejects.toThrow('This order link is not valid');

    const owner = new Types.ObjectId();
    const owned = await seedStorePayment({ user_id: owner });
    await expect(
      storeCheckoutService.verify(signedIn(new Types.ObjectId().toHexString()), proof(owned._id, { access_key: ACCESS_KEY }))
    ).rejects.toThrow('Sign in with the account that placed this order');
    await expect(storeCheckoutService.verify(guest, proof(owned._id))).rejects.toThrow(
      'Sign in with the account that placed this order'
    );
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it.each([
    [{ gateway: 'COD', status: 'PENDING' }, 'COD_CONFIRMED'],
    [{ status: 'SUCCESS' }, 'PAID'],
    [{ status: 'FAILED' }, 'FAILED'],
    [{ status: 'PENDING' }, 'PENDING_PAYMENT'],
  ])('reads a %p order back as %s', async (over, status) => {
    const payment = await seedStorePayment(over);
    const out = await storeCheckoutService.confirmation(guest, String(payment._id), null, ACCESS_KEY);
    expect(out).toMatchObject({ status, payment_doc_id: String(payment._id), access_key: ACCESS_KEY, orders: [] });
  });

  it('shows the account its own order without a key, and hides the key from it', async () => {
    const owner = new Types.ObjectId();
    const payment = await seedStorePayment({ user_id: owner, status: 'SUCCESS' });
    const out = await storeCheckoutService.confirmation(signedIn(owner.toHexString()), String(payment._id));
    expect(out).toMatchObject({ status: 'PAID', access_key: '' });
    await expect(storeCheckoutService.confirmation(guest, new Types.ObjectId().toHexString())).rejects.toThrow('Order not found');
  });
});
