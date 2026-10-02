jest.mock('@modules/commerce/shiprocket/shiprocket.gateway', () => ({
  getServiceability: jest.fn(),
  isShiprocketConfigured: jest.fn().mockResolvedValue(false),
}));

import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { otpService } from '@modules/platform/otp/otp.service';
import { StoreProductModel } from '../../storeProduct.model';
import { StoreSettingsModel } from '../../storeSettings.model';
import { StoreCartModel } from '../../storeCart.model';
import { cleanAddress, cleanContact, describeBasket, storeCheckoutService } from '../../store.checkout.service';

/**
 * The pet store's checkout before any money moves: the shopper's details
 * cleaned to what a courier accepts, the priced quote the checkout page shows
 * (the same numbers the charge will use), and the COD phone code.
 */

const TOKEN = 'guest-cart-token-000000000001';
const guest = { user: null } as unknown as GraphQLContext;
const signedIn = (id: string) => ({ user: { id, roles: [] } }) as unknown as GraphQLContext;

const address = {
  name: ' Asha Verma ',
  phone: '+91 98110-00000',
  email: ' Asha@Example.com ',
  line1: ' B-619 Windsor Paradise 2 ',
  city: 'Ghaziabad',
  state: 'Uttar Pradesh',
  pincode: '201 017',
};

const openStore = (over: Record<string, unknown> = {}) =>
  StoreSettingsModel.updateOne(
    { singleton_key: 'store' },
    { $set: { store_enabled: true, flat_shipping_fee: 49, ...over } },
    { upsert: true, setDefaultsOnInsert: true }
  );

let seq = 0;
async function seedProduct(over: Record<string, unknown> = {}) {
  const warehouse = await BrandPickupLocationModel.create({ owner_kind: 'DUNCIT', nickname: `DUN-WH-Q${++seq}`, pincode: '201301' });
  return StoreProductModel.create({
    product_name: 'Drools Adult Chicken 3 kg',
    sku: `DRL-Q-${seq}`,
    brand_name: 'Drools',
    images: ['https://ik.imagekit.io/duncit/store/drools-3kg.jpg'],
    unit_cost: 849,
    inventory_count: 20,
    pickup_location_id: warehouse._id,
    weight_kg: 3.2,
    length_cm: 40,
    breadth_cm: 28,
    height_cm: 10,
    status: 'PUBLISHED',
    store: { slug: `drools-q-${seq}`, title: 'Drools Adult Chicken 3 kg', mrp: 999 },
    ...over,
  });
}

const seedCart = (ownerKey: string, items: { product_id: unknown; qty: number; variant_id?: string }[]) =>
  StoreCartModel.create({ owner_key: ownerKey, items: items.map((i) => ({ variant_id: '', ...i })) });

afterEach(() => jest.restoreAllMocks());

describe('cleanAddress', () => {
  it('trims, keeps the last ten phone digits, strips the pincode and defaults the country', () => {
    expect(cleanAddress(address)).toEqual({
      name: 'Asha Verma',
      phone: '9811000000',
      email: 'asha@example.com',
      line1: 'B-619 Windsor Paradise 2',
      line2: '',
      landmark: '',
      city: 'Ghaziabad',
      state: 'Uttar Pradesh',
      pincode: '201017',
      country: 'India',
    });
  });

  it.each([
    [{ name: '  ' }, 'Enter the name to deliver to'],
    [{ phone: '98110' }, 'Enter a 10-digit phone number for delivery'],
    [{ line1: '' }, 'Enter the delivery address'],
    [{ state: '' }, 'Enter the city and state'],
    [{ pincode: '20101' }, 'Enter a valid 6-digit pincode'],
    [{ line1: 'India' }, 'Enter the house number and street of the delivery address'],
    [{ city: 'India' }, 'Enter the city of the delivery address'],
  ])('refuses %p', (over, message) => {
    expect(() => cleanAddress({ ...address, ...over })).toThrow(message);
  });

  it('refuses a missing address outright', () => {
    expect(() => cleanAddress(undefined as never)).toThrow('Enter the name to deliver to');
  });
});

describe('cleanContact', () => {
  it('trims, lower-cases the email, keeps only phone digits and defaults the dialling code', () => {
    expect(cleanContact({ name: ' Asha ', email: ' Asha@Example.COM ', phone_extension: ' ', phone_number: '98110 00000' })).toEqual({
      name: 'Asha',
      email: 'asha@example.com',
      phone_extension: '+91',
      phone_number: '9811000000',
    });
  });

  it.each([
    [{ name: '' }, 'Enter your name'],
    [{ email: 'asha@' }, 'Enter a valid email address'],
    [{ phone_number: '+91 98110 00000' }, 'Enter a valid 10-digit mobile number'],
  ])('refuses %p', (over, message) => {
    const valid = { name: 'Asha', email: 'asha@example.com', phone_extension: '+91', phone_number: '9811000000' };
    expect(() => cleanContact({ ...valid, ...over })).toThrow(message);
  });
});

describe('describeBasket', () => {
  it('names the item count in the right number', () => {
    expect(describeBasket(1)).toBe('Pet store order · 1 item');
    expect(describeBasket(3)).toBe('Pet store order · 3 items');
  });
});

describe('storeCheckoutService.quote', () => {
  it('refuses a guest with no cart session, and an empty cart', async () => {
    await openStore();
    await expect(storeCheckoutService.quote(guest, { cart_token: 'short' })).rejects.toThrow(
      'Your cart session has expired — refresh the page'
    );
    await expect(storeCheckoutService.quote(guest, { cart_token: TOKEN })).rejects.toThrow('Your cart is empty');
    await seedCart(`g:${TOKEN}`, []);
    await expect(storeCheckoutService.quote(guest, { cart_token: TOKEN })).rejects.toThrow('Your cart is empty');
  });

  it('prices a prepaid basket: goods, the prepaid discount, flat delivery and GST inside the total', async () => {
    await openStore({ prepaid_discount_pct: 10 });
    const product = await seedProduct();
    await seedCart(`g:${TOKEN}`, [{ product_id: product._id, qty: 2 }]);

    const q = await storeCheckoutService.quote(guest, { cart_token: TOKEN, pincode: '201-017' });

    // ₹1698 of goods, 10% prepaid off (₹169.80 → ₹169), ₹49 delivery = ₹1578.
    expect(q).toMatchObject({
      items_total: 1698,
      mrp_total: 1998,
      savings: 300,
      coupon_code: '',
      coupon_discount: 0,
      coupon_error: null,
      prepaid_discount: 169,
      autoship_discount: 0,
      shipping_total: 49,
      shipping_quoted: false,
      serviceable: true,
      cod_fee: 0,
      coins_redeemed: 0,
      discount_total: 169,
      gst_amount: 240.71,
      total: 1578,
      currency_symbol: '₹',
      cod_available: false,
      cod_block: 'DISABLED',
      below_minimum: false,
      has_issues: false,
    });
    expect(q.lines).toEqual([
      expect.objectContaining({ product_id: String(product._id), quantity: 2, unit_price: 849, mrp: 999, discount_pct: 15, line_total: 1698 }),
    ]);
  });

  it('prices Cash on Delivery with its fee and without the prepaid discount', async () => {
    await openStore({ prepaid_discount_pct: 10, cod_enabled: true, cod_fee: 39 });
    const product = await seedProduct();
    await seedCart(`g:${TOKEN}`, [{ product_id: product._id, qty: 2 }]);

    const q = await storeCheckoutService.quote(guest, { cart_token: TOKEN, pincode: '201017', payment_method: 'COD' });

    expect(q).toMatchObject({ prepaid_discount: 0, cod_fee: 39, total: 1786, cod_available: true, cod_block: null });
  });

  it('reports a bad coupon and the minimum order without refusing the quote', async () => {
    await openStore({ min_order_value: 2000 });
    const product = await seedProduct();
    await seedCart(`g:${TOKEN}`, [{ product_id: product._id, qty: 1 }]);

    const q = await storeCheckoutService.quote(guest, { cart_token: TOKEN, coupon_code: 'NOPE10' });

    expect(q).toMatchObject({ coupon_code: '', coupon_error: 'Invalid or inactive coupon code', below_minimum: true, total: 898 });
  });

  it('quotes a basket with an item that ran out, flagging it rather than refusing', async () => {
    await openStore();
    const gone = await seedProduct({ inventory_count: 0 });
    const kept = await seedProduct();
    await seedCart(`g:${TOKEN}`, [
      { product_id: gone._id, qty: 1 },
      { product_id: kept._id, qty: 1 },
    ]);

    const q = await storeCheckoutService.quote(guest, { cart_token: TOKEN });

    expect(q.has_issues).toBe(true);
    expect(q.lines.map((l) => l.issue)).toEqual(['OUT_OF_STOCK', null]);
    expect(q.items_total).toBe(849);
  });

  it('prices a signed-in buyer’s own cart', async () => {
    await openStore();
    const userId = new Types.ObjectId().toHexString();
    const product = await seedProduct();
    await seedCart(`u:${userId}`, [{ product_id: product._id, qty: 1 }]);
    const q = await storeCheckoutService.quote(signedIn(userId), {});
    expect(q).toMatchObject({ items_total: 849, total: 898 });
  });
});

describe('storeCheckoutService COD phone code', () => {
  const challenge = { challenge_id: 'chal-1', expires_at: '2026-10-03T10:05:00.000Z', resend_after_seconds: 30, test_code: '123456' };

  it('refuses while the store is closed, and while COD is off', async () => {
    await expect(storeCheckoutService.requestCodOtp(guest, TOKEN, '+91', '9811000000')).rejects.toMatchObject({
      message: 'The store is not taking orders right now',
      extensions: { code: 'STORE_CLOSED' },
    });
    await openStore();
    await expect(storeCheckoutService.requestCodOtp(guest, TOKEN, '+91', '9811000000')).rejects.toThrow(
      'Cash on Delivery is not available'
    );
  });

  it('texts a guest only when they hold a cart, and only to a ten-digit number', async () => {
    await openStore({ cod_enabled: true });
    const request = jest.spyOn(otpService, 'request').mockResolvedValue(challenge as never);
    await expect(storeCheckoutService.requestCodOtp(guest, TOKEN, '+91', '9811000000')).rejects.toThrow('Your cart is empty');

    const product = await seedProduct();
    await seedCart(`g:${TOKEN}`, [{ product_id: product._id, qty: 1 }]);
    await expect(storeCheckoutService.requestCodOtp(guest, TOKEN, '+91', '98110')).rejects.toThrow(
      'Enter a valid 10-digit mobile number'
    );
    expect(request).not.toHaveBeenCalled();

    const out = await storeCheckoutService.requestCodOtp(guest, TOKEN, ' ', '98110 00000');

    expect(out).toEqual(challenge);
    expect(request).toHaveBeenCalledWith({
      purpose: 'STORE_COD',
      mediums: ['SMS', 'WHATSAPP'],
      phone_extension: '+91',
      phone_number: '9811000000',
      context: { owner_key: `g:${TOKEN}` },
      requested_by: null,
    });
  });

  it('lets a signed-in buyer prove a phone without a cart (for an Autoship subscription)', async () => {
    await openStore({ cod_enabled: true });
    const userId = new Types.ObjectId().toHexString();
    const request = jest.spyOn(otpService, 'request').mockResolvedValue(challenge as never);

    await storeCheckoutService.requestCodOtp(signedIn(userId), null, '+971', '5012345678');

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ phone_extension: '+971', context: { owner_key: `u:${userId}` }, requested_by: userId })
    );
  });

  it('verifies a code through the OTP service and passes its refusal on', async () => {
    const verify = jest.spyOn(otpService, 'verify').mockResolvedValueOnce({} as never);
    expect(await storeCheckoutService.verifyCodOtp('chal-1', '123456')).toBe(true);
    expect(verify).toHaveBeenCalledWith('chal-1', '123456');

    verify.mockRejectedValueOnce(new Error('That code is not right'));
    await expect(storeCheckoutService.verifyCodOtp('chal-1', '000000')).rejects.toThrow('That code is not right');
  });
});
