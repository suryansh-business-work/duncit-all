import { logs } from '@duncit/logs';

import {
  readFoodCart,
  readFoodCoupon,
  readFoodGuest,
  readFoodOrder,
  saveFoodOrder,
  storedFoodOrderKeys,
  writeFoodCart,
  writeFoodCoupon,
  writeFoodGuest,
} from '@/services/food-storage';
import { getItem, setItem } from '@/services/secure-storage';

const mockStore = new Map<string, string>();
jest.mock('@/services/secure-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
}));

const mockGet = jest.mocked(getItem);
const mockSet = jest.mocked(setItem);
const ORDERS_KEY = 'duncit.food_orders';

const stored = (key: string): unknown => JSON.parse(mockStore.get(key) ?? 'null');
const keep = (key: string, value: unknown) => mockStore.set(key, JSON.stringify(value));

const order = (id: string, over: Record<string, unknown> = {}) => ({
  order_id: id,
  venue_id: 'v1',
  order_no: `F-${id}`,
  access_key: `ak-${id}`,
  client_key: `ck-${id}`,
  ...over,
});

let warn: jest.SpyInstance;

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
  warn = jest.spyOn(logs.mobileApp, 'warn').mockImplementation(() => undefined);
});

afterEach(() => warn.mockRestore());

describe('the food cart on the device', () => {
  it('keeps each venue’s cart under its own key and reads back only the counts', async () => {
    await writeFoodCart('v1', { chai: 2 });
    expect(mockSet).toHaveBeenCalledWith('duncit.food_cart.v1', JSON.stringify({ chai: 2 }));

    keep('duncit.food_cart.v2', { chai: 1, samosa: '3', bad: null });
    expect(await readFoodCart('v2')).toEqual({ chai: 1 });
    expect(await readFoodCart('v1')).toEqual({ chai: 2 });
  });

  it('starts empty when nothing, or something that is not a cart, was kept', async () => {
    expect(await readFoodCart('none')).toEqual({});
    keep('duncit.food_cart.list', [1, 2]);
    expect(await readFoodCart('list')).toEqual({});
  });

  it('forgets rather than fails when the store cannot be read or holds broken JSON', async () => {
    mockGet.mockRejectedValueOnce(new Error('locked'));
    expect(await readFoodCart('v1')).toEqual({});
    mockStore.set('duncit.food_cart.v1', '{not json');
    expect(await readFoodCart('v1')).toEqual({});
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith('venueFood', 'storageRead', {
      error: expect.any(Error),
      key: 'duncit.food_cart.v1',
    });
  });

  it('logs a write the store refused and carries on', async () => {
    mockSet.mockRejectedValueOnce(new Error('full'));
    await expect(writeFoodCart('v1', { chai: 1 })).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith('venueFood', 'storageWrite', {
      error: expect.any(Error),
      key: 'duncit.food_cart.v1',
    });
  });
});

describe('the coupon applied to a cart', () => {
  it('reads back a kept coupon, and forgets it when null is written', async () => {
    await writeFoodCoupon('v1', { code: 'SAVE20', coupon_pct: 20, min_order_amount: 150 });
    expect(await readFoodCoupon('v1')).toEqual({
      code: 'SAVE20',
      coupon_pct: 20,
      min_order_amount: 150,
    });

    await writeFoodCoupon('v1', null);
    expect(mockStore.get('duncit.food_coupon.v1')).toBe('null');
    expect(await readFoodCoupon('v1')).toBeNull();
  });

  it('takes a missing minimum as none', async () => {
    keep('duncit.food_coupon.v1', { code: 'SAVE20', coupon_pct: 20 });
    expect(await readFoodCoupon('v1')).toEqual({
      code: 'SAVE20',
      coupon_pct: 20,
      min_order_amount: 0,
    });
  });

  it.each([
    ['no code', { coupon_pct: 20 }],
    ['an empty code', { code: '', coupon_pct: 20 }],
    ['no percentage', { code: 'SAVE20', coupon_pct: '20' }],
    ['a list', ['SAVE20']],
  ])('refuses a kept coupon with %s', async (_label, value) => {
    keep('duncit.food_coupon.v1', value);
    expect(await readFoodCoupon('v1')).toBeNull();
  });
});

describe('the details last ordered with', () => {
  it('reads back the name and mobile written', async () => {
    await writeFoodGuest({ name: 'Asha Rao', phone: '9876543210' });
    expect(await readFoodGuest()).toEqual({ name: 'Asha Rao', phone: '9876543210' });
  });

  it('blanks a field that is not text, and has nothing when nothing was kept', async () => {
    expect(await readFoodGuest()).toBeNull();
    keep('duncit.food_guest', { name: 42 });
    expect(await readFoodGuest()).toEqual({ name: '', phone: '' });
  });
});

describe('the orders placed from this device', () => {
  let now: jest.SpyInstance;

  beforeEach(() => {
    now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
  });

  afterEach(() => now.mockRestore());

  it('remembers a new order, newest first, as not finished', async () => {
    await saveFoodOrder(order('o1'));
    await saveFoodOrder(order('o2'));

    expect(stored(ORDERS_KEY)).toEqual([
      { ...order('o2'), saved_at: 1_000, finished: false },
      { ...order('o1'), saved_at: 1_000, finished: false },
    ]);
    expect(await readFoodOrder('o1')).toEqual({ ...order('o1'), saved_at: 1_000, finished: false });
    expect(await readFoodOrder('missing')).toBeNull();
  });

  it('keeps the first client key, saved time and finished flag on a later save of the same order', async () => {
    await saveFoodOrder(order('o1', { finished: true }));
    now.mockReturnValue(9_000);

    await saveFoodOrder(order('o1', { client_key: '', order_no: 'F-renamed' }));

    expect(await readFoodOrder('o1')).toEqual({
      ...order('o1', { order_no: 'F-renamed' }),
      client_key: 'ck-o1',
      saved_at: 1_000,
      finished: true,
    });
  });

  it('saves an order opened from a link with no client key at all', async () => {
    await saveFoodOrder(order('o1', { client_key: '' }));
    expect(await readFoodOrder('o1')).toMatchObject({ client_key: '', finished: false });
  });

  it('keeps only the ten newest orders', async () => {
    for (let n = 1; n <= 11; n += 1) {
      await saveFoodOrder(order(`o${n}`));
    }
    const kept = stored(ORDERS_KEY) as { order_id: string }[];
    expect(kept).toHaveLength(10);
    expect(kept[0]?.order_id).toBe('o11');
    expect(kept.map((entry) => entry.order_id)).not.toContain('o1');
  });

  it('skips kept entries that are not orders', async () => {
    keep(ORDERS_KEY, [
      { ...order('good'), saved_at: 5, finished: false },
      { ...order('no-time') },
      { ...order('bad-venue', { venue_id: 7 }), saved_at: 5 },
      { ...order('bad-key', { access_key: null }), saved_at: 5 },
      { order_id: 3, saved_at: 5 },
      'junk',
    ]);
    expect(await readFoodOrder('good')).not.toBeNull();
    expect(await readFoodOrder('no-time')).toBeNull();
    expect(await storedFoodOrderKeys()).toEqual([{ order_id: 'good', access_key: 'ak-good' }]);
  });

  it('has no orders when the kept value is not a list', async () => {
    keep(ORDERS_KEY, { order_id: 'o1' });
    expect(await storedFoodOrderKeys()).toEqual([]);
  });
});

describe('storedFoodOrderKeys', () => {
  it('sends only each order’s id and access key, newest first', async () => {
    await saveFoodOrder(order('o1'));
    await saveFoodOrder(order('o2'));
    expect(await storedFoodOrderKeys()).toEqual([
      { order_id: 'o2', access_key: 'ak-o2' },
      { order_id: 'o1', access_key: 'ak-o1' },
    ]);
  });

  it('leaves out an order without a key to prove it', async () => {
    keep(ORDERS_KEY, [
      { ...order('o1', { access_key: '' }), saved_at: 1 },
      { ...order('o2'), saved_at: 1 },
    ]);
    expect(await storedFoodOrderKeys()).toEqual([{ order_id: 'o2', access_key: 'ak-o2' }]);
  });

  it('counts an order whose save is still in flight', async () => {
    const saved = saveFoodOrder(order('o1'));
    const keys = storedFoodOrderKeys();
    expect(await keys).toEqual([{ order_id: 'o1', access_key: 'ak-o1' }]);
    await saved;
  });

  it('has none on a device that never ordered', async () => {
    expect(await storedFoodOrderKeys()).toEqual([]);
  });
});
