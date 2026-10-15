import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logs } from '@duncit/logs';
import { MY_FOOD_ORDER_KEYS_MAX } from '@duncit/utils';
import {
  foodOrderPath,
  readFoodCoupon,
  readFoodGuest,
  readFoodOrder,
  saveFoodOrder,
  storedFoodOrderKeys,
  writeFoodCart,
  writeFoodCoupon,
} from '../foodStorage';

const ORDERS_KEY = 'mweb_food_orders';

const save = (orderId: string, accessKey: string, venueId = 'v1') =>
  saveFoodOrder({ order_id: orderId, venue_id: venueId, order_no: `#${orderId}`, access_key: accessKey, client_key: '' });

beforeEach(() => localStorage.clear());
afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('storedFoodOrderKeys', () => {
  it('is empty on a device that has placed no order', () => {
    expect(storedFoodOrderKeys()).toEqual([]);
  });

  it('sends every remembered order with its key, newest first, from every venue', () => {
    save('o1', 'k1', 'v1');
    save('o2', 'k2', 'v2');
    save('o3', 'k3', 'v1');
    expect(storedFoodOrderKeys()).toEqual([
      { order_id: 'o3', access_key: 'k3' },
      { order_id: 'o2', access_key: 'k2' },
      { order_id: 'o1', access_key: 'k1' },
    ]);
  });

  it('keeps finished orders too — the server decides what is still running', () => {
    saveFoodOrder({ order_id: 'o1', venue_id: 'v1', order_no: '#1', access_key: 'k1', client_key: '', finished: true });
    expect(storedFoodOrderKeys()).toEqual([{ order_id: 'o1', access_key: 'k1' }]);
  });

  it('carries only the order id and key — nothing else the device stored', () => {
    save('o1', 'k1');
    expect(Object.keys(storedFoodOrderKeys()[0]).sort()).toEqual(['access_key', 'order_id']);
  });

  it('drops an order remembered without a key, which could prove nothing', () => {
    save('o1', '');
    save('o2', 'k2');
    expect(storedFoodOrderKeys()).toEqual([{ order_id: 'o2', access_key: 'k2' }]);
  });

  it('never sends more keys than the server reads', () => {
    const many = Array.from({ length: MY_FOOD_ORDER_KEYS_MAX + 5 }, (_, i) => ({
      order_id: `o${i}`,
      venue_id: 'v1',
      order_no: `#${i}`,
      access_key: `k${i}`,
      client_key: '',
      saved_at: i,
      finished: false,
    }));
    localStorage.setItem(ORDERS_KEY, JSON.stringify(many));
    const keys = storedFoodOrderKeys();
    expect(keys).toHaveLength(MY_FOOD_ORDER_KEYS_MAX);
    expect(keys[0]).toEqual({ order_id: 'o0', access_key: 'k0' });
  });

  it('skips malformed entries and survives storage that is not a list', () => {
    localStorage.setItem(ORDERS_KEY, JSON.stringify([{ order_id: 'o1' }, 'junk', null]));
    expect(storedFoodOrderKeys()).toEqual([]);
    localStorage.setItem(ORDERS_KEY, JSON.stringify({ order_id: 'o1', access_key: 'k1' }));
    expect(storedFoodOrderKeys()).toEqual([]);
  });

  it('reads unparseable storage as no orders, and logs it', () => {
    const warn = vi.spyOn(logs.mWeb, 'warn').mockImplementation(() => undefined);
    localStorage.setItem(ORDERS_KEY, '{not json');
    expect(storedFoodOrderKeys()).toEqual([]);
    expect(warn).toHaveBeenCalledWith('venueFood', 'storageRead', expect.objectContaining({ key: ORDERS_KEY }));
  });
});

describe('foodOrderPath', () => {
  it('carries the access key so the order opens on another device', () => {
    expect(foodOrderPath('v 1', 'o/1', 'k&1')).toBe('/venue/v%201/food-order/o%2F1?key=k%261');
  });

  it('is the bare order page for an order opened by account', () => {
    expect(foodOrderPath('v1', 'o1', null)).toBe('/venue/v1/food-order/o1');
  });
});

describe('readFoodOrder / saveFoodOrder', () => {
  it('finds a remembered order by id, and nothing for one never placed here', () => {
    save('o1', 'k1');
    expect(readFoodOrder('o1')).toMatchObject({ order_id: 'o1', access_key: 'k1', venue_id: 'v1', finished: false });
    expect(readFoodOrder('nope')).toBeNull();
  });

  it('keeps the first save’s client key, time and finished flag when the same order is saved again without them', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
    saveFoodOrder({ order_id: 'o1', venue_id: 'v1', order_no: '#1', access_key: 'k1', client_key: 'ck-1', finished: true });
    vi.spyOn(Date, 'now').mockReturnValue(9_000);
    saveFoodOrder({ order_id: 'o1', venue_id: 'v1', order_no: '#1', access_key: 'k1', client_key: '' });

    expect(readFoodOrder('o1')).toEqual({
      order_id: 'o1',
      venue_id: 'v1',
      order_no: '#1',
      access_key: 'k1',
      client_key: 'ck-1',
      saved_at: 1_000,
      finished: true,
    });
    expect(JSON.parse(localStorage.getItem(ORDERS_KEY) ?? '[]')).toHaveLength(1);
  });

  it('takes a new client key and finished flag when the later save carries them', () => {
    saveFoodOrder({ order_id: 'o1', venue_id: 'v1', order_no: '#1', access_key: 'k1', client_key: 'ck-1' });
    saveFoodOrder({ order_id: 'o1', venue_id: 'v1', order_no: '#1', access_key: 'k1', client_key: 'ck-2', finished: true });
    expect(readFoodOrder('o1')).toMatchObject({ client_key: 'ck-2', finished: true });
  });

  it('keeps only the ten newest orders', () => {
    for (let i = 0; i < 12; i += 1) save(`o${i}`, `k${i}`);
    expect(readFoodOrder('o11')).not.toBeNull();
    expect(readFoodOrder('o2')).not.toBeNull();
    expect(readFoodOrder('o1')).toBeNull();
    expect(readFoodOrder('o0')).toBeNull();
  });
});

describe('the venue cart coupon in storage', () => {
  const COUPON_KEY = 'mweb_food_coupon_v1';

  it('round-trips an applied coupon and forgets it when cleared', () => {
    writeFoodCoupon('v1', { coupon_code: 'SAVE10', coupon_pct: 10, min_order_amount: 150 });
    expect(readFoodCoupon('v1')).toEqual({ coupon_code: 'SAVE10', coupon_pct: 10, min_order_amount: 150 });
    writeFoodCoupon('v1', null);
    expect(localStorage.getItem(COUPON_KEY)).toBeNull();
    expect(readFoodCoupon('v1')).toBeNull();
  });

  it('reads a coupon stored without a minimum as one with no minimum', () => {
    localStorage.setItem(COUPON_KEY, JSON.stringify({ coupon_code: 'FLAT', coupon_pct: 5 }));
    expect(readFoodCoupon('v1')).toEqual({ coupon_code: 'FLAT', coupon_pct: 5, min_order_amount: 0 });
  });

  it('distrusts a stored coupon with no code or no percentage', () => {
    localStorage.setItem(COUPON_KEY, JSON.stringify({ coupon_code: '', coupon_pct: 5 }));
    expect(readFoodCoupon('v1')).toBeNull();
    localStorage.setItem(COUPON_KEY, JSON.stringify({ coupon_code: 'SAVE10', coupon_pct: '10' }));
    expect(readFoodCoupon('v1')).toBeNull();
  });

  it('logs, and does not throw, when storage refuses to remove the coupon', () => {
    const warn = vi.spyOn(logs.mWeb, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => writeFoodCoupon('v1', null)).not.toThrow();
    expect(warn).toHaveBeenCalledWith('venueFood', 'storageRemove', expect.objectContaining({ key: COUPON_KEY }));
  });
});

describe('storage that refuses writes', () => {
  it('logs the failed write and carries on — the page just forgets', () => {
    const warn = vi.spyOn(logs.mWeb, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => writeFoodCart('v1', { chai: 2 })).not.toThrow();
    expect(warn).toHaveBeenCalledWith('venueFood', 'storageWrite', expect.objectContaining({ key: 'mweb_food_cart_v1' }));
    expect(localStorage.getItem('mweb_food_cart_v1')).toBeNull();
  });
});

describe('readFoodGuest', () => {
  it('is null on a device that never ordered', () => {
    expect(readFoodGuest()).toBeNull();
  });

  it('blanks any field that was not stored as text', () => {
    localStorage.setItem('mweb_food_guest', JSON.stringify({ name: 42, phone: '9876543210' }));
    expect(readFoodGuest()).toEqual({ name: '', phone: '9876543210' });
    localStorage.setItem('mweb_food_guest', JSON.stringify({ name: 'Asha', phone: null }));
    expect(readFoodGuest()).toEqual({ name: 'Asha', phone: '' });
  });
});
