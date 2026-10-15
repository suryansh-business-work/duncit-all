import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logs } from '@duncit/logs';
import { MY_FOOD_ORDER_KEYS_MAX } from '@duncit/utils';
import { foodOrderPath, saveFoodOrder, storedFoodOrderKeys } from '../foodStorage';

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
