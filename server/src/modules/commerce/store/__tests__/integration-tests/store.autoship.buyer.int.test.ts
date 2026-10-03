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
import { StoreSubscriptionModel } from '../../storeSubscription.model';
import { StoreCartModel } from '../../storeCart.model';
import { storeAutoshipService } from '../../store.autoship.service';

/**
 * A pet-store shopper's Autoship subscriptions: setting one up (with every
 * gate a recurring order has to pass), changing, pausing, skipping, cancelling
 * and re-ordering it. Only the subscription's owner may touch it.
 */

const WEEK = 7 * 86_400_000;
const near = (actual: Date | null | undefined, expected: number) =>
  expect(Math.abs((actual?.getTime() ?? Number.NaN) - expected)).toBeLessThan(10_000);

const ctxFor = (id: string) => ({ user: { id, roles: [] }, isClientGone: () => false }) as unknown as GraphQLContext;
const guest = { user: null } as unknown as GraphQLContext;

const contact = { name: ' Asha Verma ', email: 'Asha.Verma@Example.com', phone_extension: '+91', phone_number: '98110 00000' };
const address = {
  name: 'Asha Verma',
  phone: '+91 98110 00000',
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
        autoship_frequencies: [2, 4],
        cod_enabled: true,
        cod_requires_otp: false,
        ...over,
      },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

let seq = 0;
async function seedProduct(listing: Record<string, unknown> = {}, over: Record<string, unknown> = {}) {
  const warehouse = await BrandPickupLocationModel.create({
    owner_kind: 'DUNCIT',
    nickname: `DUN-WH-${++seq}`,
    pincode: '201017',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
  });
  return StoreProductModel.create({
    product_name: 'Drools Adult Chicken 3 kg',
    sku: `DRL-ADULT-${seq}`,
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
    ...over,
    store: { slug: `drools-adult-${seq}`, title: 'Drools Adult Chicken 3 kg', mrp: 999, ...listing },
  });
}

const input = (productId: unknown, over: Record<string, unknown> = {}) => ({
  product_id: String(productId),
  qty: 2,
  frequency_weeks: 4,
  mode: 'REMIND' as const,
  contact,
  shipping_address: address,
  ...over,
});

const seedSub = (userId: string, productId: unknown, over: Record<string, unknown> = {}) =>
  StoreSubscriptionModel.create({
    user_id: new Types.ObjectId(userId),
    buyer_name: 'Asha Verma',
    buyer_email: 'asha.verma@example.com',
    phone_number: '9811000000',
    product_id: productId,
    product_name: 'Drools Adult Chicken 3 kg',
    qty: 2,
    frequency_weeks: 4,
    mode: 'REMIND',
    status: 'ACTIVE',
    shipping_address: address,
    next_run_at: new Date(Date.now() + 2 * WEEK),
    ...over,
  });

const ME = new Types.ObjectId().toHexString();

afterEach(() => jest.restoreAllMocks());

describe('storeAutoshipService.create — gates', () => {
  it('needs a signed-in buyer', async () => {
    await expect(storeAutoshipService.create(guest, input(new Types.ObjectId()))).rejects.toThrow('Not authenticated');
  });

  it('refuses while the store does not offer Autoship', async () => {
    await openStore({ autoship_enabled: false });
    const product = await seedProduct();
    await expect(storeAutoshipService.create(ctxFor(ME), input(product._id))).rejects.toThrow('Autoship is not available right now');
  });

  it('accepts only the frequencies the store offers, or 1–26 weeks when it lists none', async () => {
    await openStore();
    const product = await seedProduct();
    await expect(storeAutoshipService.create(ctxFor(ME), input(product._id, { frequency_weeks: 3 }))).rejects.toThrow(
      'Choose how often it should arrive'
    );

    await openStore({ autoship_frequencies: [] });
    await expect(storeAutoshipService.create(ctxFor(ME), input(product._id, { frequency_weeks: 27 }))).rejects.toThrow(
      'Choose how often it should arrive'
    );
    const sub = await storeAutoshipService.create(ctxFor(ME), input(product._id, { frequency_weeks: 26 }));
    expect(sub.frequency_weeks).toBe(26);
  });

  it('refuses a product that is not on the shelf, and a variant product without its option', async () => {
    await openStore();
    const draft = await seedProduct({}, { status: 'DRAFT' });
    await expect(storeAutoshipService.create(ctxFor(ME), input(draft._id))).rejects.toThrow('This product is not available for Autoship');
    await expect(storeAutoshipService.create(ctxFor(ME), input('junk'))).rejects.toThrow('This product is not available for Autoship');

    const sized = await seedProduct(
      {},
      { variant_option: 'Size', variants: [{ option_label: '10 kg', sku: 'DRL-10', unit_cost: 2499, inventory_count: 4 }] }
    );
    await expect(storeAutoshipService.create(ctxFor(ME), input(sized._id))).rejects.toThrow('Choose an option first');
  });

  it.each([[0], [11], ['two']])('refuses a quantity of %p', async (qty) => {
    await openStore();
    const product = await seedProduct();
    await expect(storeAutoshipService.create(ctxFor(ME), input(product._id, { qty }))).rejects.toThrow('Choose a valid quantity');
  });

  it('caps the quantity at the listing’s own per-order limit', async () => {
    await openStore();
    const product = await seedProduct({ max_per_order: 3 });
    await expect(storeAutoshipService.create(ctxFor(ME), input(product._id, { qty: 4 }))).rejects.toThrow('Choose a valid quantity');
    expect((await storeAutoshipService.create(ctxFor(ME), input(product._id, { qty: 3 }))).qty).toBe(3);
  });

  it('refuses automatic COD when the store or the product does not offer it', async () => {
    await openStore({ cod_enabled: false });
    const product = await seedProduct();
    await expect(storeAutoshipService.create(ctxFor(ME), input(product._id, { mode: 'COD_AUTO' }))).rejects.toThrow(
      'Automatic Cash on Delivery is not available for this product'
    );

    await openStore();
    const prepaidOnly = await seedProduct({ cod_available: false });
    await expect(storeAutoshipService.create(ctxFor(ME), input(prepaidOnly._id, { mode: 'COD_AUTO' }))).rejects.toThrow(
      'Automatic Cash on Delivery is not available for this product'
    );
    expect(await StoreSubscriptionModel.countDocuments()).toBe(0);
  });

  it('asks for the phone proof when the store requires it, and spends it on this number', async () => {
    await openStore({ cod_requires_otp: true });
    const product = await seedProduct();
    await expect(storeAutoshipService.create(ctxFor(ME), input(product._id, { mode: 'COD_AUTO' }))).rejects.toThrow(
      'Verify your phone number to place a Cash on Delivery order'
    );

    const consume = jest.spyOn(otpService, 'consume').mockResolvedValue({} as never);
    const sub = await storeAutoshipService.create(ctxFor(ME), input(product._id, { mode: 'COD_AUTO', cod_challenge_id: 'chal-1' }));

    expect(sub.mode).toBe('COD_AUTO');
    expect(consume).toHaveBeenCalledWith('chal-1', expect.objectContaining({ purpose: 'STORE_COD' }));
    const [, expected] = consume.mock.calls[0];
    expect(expected.match!({ phone_number: '+91 98110 00000' } as never)).toBe(true);
    expect(expected.match!({ phone_number: '+91 98110 00001' } as never)).toBe(false);
  });
});

describe('storeAutoshipService.create — the subscription', () => {
  it('starts a reminder cycle one period out, with the product card and the autoship discount', async () => {
    await openStore();
    const product = await seedProduct();
    const before = Date.now();

    const sub = await storeAutoshipService.create(ctxFor(ME), input(product._id, { mode: 'SOMETHING_ELSE' }));

    expect(sub).toMatchObject({
      product_id: String(product._id),
      variant_id: '',
      variant_label: '',
      qty: 2,
      frequency_weeks: 4,
      mode: 'REMIND',
      status: 'ACTIVE',
      unit_price: 849,
      discount_pct: 5,
      run_count: 0,
      last_order_no: '',
      last_run_at: null,
      events: [expect.objectContaining({ action: 'CREATED', note: '' })],
    });
    expect(sub.product).toMatchObject({ id: String(product._id), title: 'Drools Adult Chicken 3 kg', price: 849, mrp: 999 });
    expect(new Date(sub.next_run_at!).getTime() - before).toBeGreaterThanOrEqual(4 * WEEK - 10_000);

    const stored = await StoreSubscriptionModel.findById(sub.id).lean();
    expect(stored).toMatchObject({
      buyer_name: 'Asha Verma',
      buyer_email: 'asha.verma@example.com',
      phone_extension: '+91',
      phone_number: '9811000000',
      product_name: 'Drools Adult Chicken 3 kg',
    });
    expect(stored!.shipping_address).toMatchObject({ phone: '9811000000', pincode: '201017', country: 'India' });
    expect(String(stored!.user_id)).toBe(ME);
  });

  it('books an automatic COD subscription on the very next sweep, for the chosen variant', async () => {
    await openStore();
    const product = await seedProduct(
      { title: '' },
      {
        product_name: 'Drools Puppy',
        variant_option: 'Size',
        variants: [{ option_label: '1 kg', sku: 'DRL-P1', unit_cost: 349, inventory_count: 9 }],
      }
    );
    const variantId = String(product.variants[0]._id);
    const before = Date.now();

    const sub = await storeAutoshipService.create(ctxFor(ME), input(product._id, { variant_id: variantId, mode: 'COD_AUTO' }));

    expect(sub).toMatchObject({ variant_id: variantId, variant_label: '1 kg', unit_price: 349, mode: 'COD_AUTO' });
    near(new Date(sub.next_run_at!), before);
    expect((await StoreSubscriptionModel.findById(sub.id).lean())!.product_name).toBe('Drools Puppy');
  });

  it('refuses a malformed contact or address before anything is saved', async () => {
    await openStore();
    const product = await seedProduct();
    await expect(
      storeAutoshipService.create(ctxFor(ME), input(product._id, { contact: { ...contact, email: 'not-an-email' } }))
    ).rejects.toThrow('Enter a valid email address');
    await expect(
      storeAutoshipService.create(ctxFor(ME), input(product._id, { shipping_address: { ...address, pincode: '2010' } }))
    ).rejects.toThrow('Enter a valid 6-digit pincode');
    expect(await StoreSubscriptionModel.countDocuments()).toBe(0);
  });
});

describe('storeAutoshipService.mine', () => {
  it('lists only the caller’s subscriptions, with a card only for a product still on the shelf', async () => {
    await openStore();
    const listed = await seedProduct();
    const pulled = await seedProduct();
    await seedSub(ME, listed._id);
    await seedSub(ME, pulled._id, { status: 'PAUSED' });
    await seedSub(new Types.ObjectId().toHexString(), listed._id);
    await StoreProductModel.updateOne({ _id: pulled._id }, { $set: { status: 'DRAFT' } });

    const mine = await storeAutoshipService.mine(ctxFor(ME));

    expect(mine).toHaveLength(2);
    const byProduct = new Map(mine.map((s) => [s.product_id, s]));
    expect(byProduct.get(String(listed._id))!.product).toMatchObject({ id: String(listed._id) });
    expect(byProduct.get(String(pulled._id))).toMatchObject({ product: null, unit_price: 849, status: 'PAUSED' });
  });

  it('offers no discount and prices nothing for a product that no longer exists', async () => {
    await openStore({ autoship_enabled: false });
    await seedSub(ME, new Types.ObjectId());
    const [sub] = await storeAutoshipService.mine(ctxFor(ME));
    expect(sub).toMatchObject({ product: null, unit_price: 0, discount_pct: 0 });
  });
});

describe('storeAutoshipService.update', () => {
  it('only lets the owner change a subscription', async () => {
    await openStore();
    const product = await seedProduct();
    const theirs = await seedSub(new Types.ObjectId().toHexString(), product._id);
    await expect(storeAutoshipService.update(ctxFor(ME), String(theirs._id), { qty: 3 })).rejects.toMatchObject({
      message: 'Subscription not found',
      extensions: { code: 'NOT_FOUND' },
    });
    await expect(storeAutoshipService.update(ctxFor(ME), 'junk', { qty: 3 })).rejects.toThrow('Subscription not found');
  });

  it('changes the frequency, quantity, address and mode, and logs it', async () => {
    await openStore();
    const product = await seedProduct();
    const sub = await seedSub(ME, product._id);

    const out = await storeAutoshipService.update(ctxFor(ME), String(sub._id), {
      frequency_weeks: 2,
      qty: 5,
      shipping_address: { ...address, line1: 'Flat 12, Gaur Green City' },
      mode: 'COD_AUTO',
    });

    expect(out).toMatchObject({ frequency_weeks: 2, qty: 5, mode: 'COD_AUTO' });
    expect(out.shipping_address).toMatchObject({ line1: 'Flat 12, Gaur Green City' });
    expect(out.events.map((e) => e.action)).toEqual(['UPDATED']);
  });

  it('refuses a cancelled subscription, a bad quantity, a bad frequency and COD the store does not offer', async () => {
    await openStore({ cod_enabled: false });
    const product = await seedProduct();
    const sub = await seedSub(ME, product._id);
    const id = String(sub._id);

    await expect(storeAutoshipService.update(ctxFor(ME), id, { qty: 100 })).rejects.toThrow('Choose a valid quantity');
    await expect(storeAutoshipService.update(ctxFor(ME), id, { frequency_weeks: 3 })).rejects.toThrow('Choose how often it should arrive');
    await expect(storeAutoshipService.update(ctxFor(ME), id, { mode: 'COD_AUTO' })).rejects.toThrow(
      'Automatic Cash on Delivery is not available for this product'
    );

    const cancelled = await seedSub(ME, product._id, { status: 'CANCELLED' });
    await expect(storeAutoshipService.update(ctxFor(ME), String(cancelled._id), { qty: 1 })).rejects.toThrow(
      'This subscription has been cancelled'
    );
    expect((await StoreSubscriptionModel.findById(id).lean())!.qty).toBe(2);
  });

  it('switches back to reminders without asking for COD again', async () => {
    await openStore({ cod_enabled: false });
    const product = await seedProduct();
    const sub = await seedSub(ME, product._id, { mode: 'COD_AUTO' });
    const out = await storeAutoshipService.update(ctxFor(ME), String(sub._id), { mode: 'REMIND' });
    expect(out.mode).toBe('REMIND');
  });
});

describe('storeAutoshipService.pause, skip and cancel', () => {
  it('pauses, and on resume clears the failures and books an overdue cycle now', async () => {
    await openStore();
    const product = await seedProduct();
    const sub = await seedSub(ME, product._id, { failures: 2, next_run_at: new Date(Date.now() - WEEK) });

    const paused = await storeAutoshipService.pause(ctxFor(ME), String(sub._id), true);
    expect(paused.status).toBe('PAUSED');

    const before = Date.now();
    const resumed = await storeAutoshipService.pause(ctxFor(ME), String(sub._id), false);
    expect(resumed.status).toBe('ACTIVE');
    near(new Date(resumed.next_run_at!), before);
    expect(resumed.events.map((e) => e.action)).toEqual(['PAUSED', 'RESUMED']);
    expect((await StoreSubscriptionModel.findById(sub._id).lean())!.failures).toBe(0);
  });

  it('keeps a future cycle when resuming', async () => {
    await openStore();
    const product = await seedProduct();
    const next = new Date(Date.now() + 3 * WEEK);
    const sub = await seedSub(ME, product._id, { status: 'PAUSED', next_run_at: next });
    const resumed = await storeAutoshipService.pause(ctxFor(ME), String(sub._id), false);
    expect(resumed.next_run_at).toBe(next.toISOString());
  });

  it('skips one delivery from the later of now and the next run, and only while active', async () => {
    await openStore();
    const product = await seedProduct();
    const next = new Date(Date.now() + WEEK);
    const sub = await seedSub(ME, product._id, { next_run_at: next, frequency_weeks: 2 });

    const skipped = await storeAutoshipService.skip(ctxFor(ME), String(sub._id));
    expect(new Date(skipped.next_run_at!).getTime()).toBe(next.getTime() + 2 * WEEK);

    const overdue = await seedSub(ME, product._id, { next_run_at: new Date(Date.now() - 5 * WEEK), frequency_weeks: 2 });
    const before = Date.now();
    near(new Date((await storeAutoshipService.skip(ctxFor(ME), String(overdue._id))).next_run_at!), before + 2 * WEEK);

    const paused = await seedSub(ME, product._id, { status: 'PAUSED' });
    await expect(storeAutoshipService.skip(ctxFor(ME), String(paused._id))).rejects.toThrow(
      'Only an active subscription can skip a delivery'
    );
  });

  it('keeps only the latest fifty events', async () => {
    await openStore();
    const product = await seedProduct();
    const events = Array.from({ length: 50 }, (_, i) => ({ action: `OLD_${i}`, note: '', at: new Date() }));
    const sub = await seedSub(ME, product._id, { events });

    const out = await storeAutoshipService.skip(ctxFor(ME), String(sub._id));

    expect(out.events).toHaveLength(50);
    expect(out.events[0].action).toBe('OLD_1');
    expect(out.events[49].action).toBe('SKIPPED');
  });

  it('cancels for good, and refuses to pause what is cancelled', async () => {
    await openStore();
    const product = await seedProduct();
    const sub = await seedSub(ME, product._id);

    const cancelled = await storeAutoshipService.cancel(ctxFor(ME), String(sub._id));
    expect(cancelled).toMatchObject({ status: 'CANCELLED', next_run_at: null });
    await expect(storeAutoshipService.pause(ctxFor(ME), String(sub._id), true)).rejects.toThrow(
      'This subscription has been cancelled'
    );
  });
});

describe('storeAutoshipService.orderNow', () => {
  it('puts this delivery’s product and quantity in the buyer’s own cart', async () => {
    await openStore();
    const product = await seedProduct();
    const sub = await seedSub(ME, product._id, { qty: 3 });

    const cart = await storeAutoshipService.orderNow(ctxFor(ME), String(sub._id));

    expect(cart).toMatchObject({ item_count: 3, items_total: 2547 });
    const stored = await StoreCartModel.findOne({ owner_key: `u:${ME}` }).lean();
    expect(stored!.items).toEqual([expect.objectContaining({ product_id: product._id, variant_id: '', qty: 3 })]);
  });

  it('refuses a cancelled subscription', async () => {
    await openStore();
    const product = await seedProduct();
    const sub = await seedSub(ME, product._id, { status: 'CANCELLED' });
    await expect(storeAutoshipService.orderNow(ctxFor(ME), String(sub._id))).rejects.toThrow('This subscription has been cancelled');
    expect(await StoreCartModel.countDocuments()).toBe(0);
  });
});
