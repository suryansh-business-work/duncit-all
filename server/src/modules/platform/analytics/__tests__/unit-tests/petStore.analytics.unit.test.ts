/**
 * The Pet Store page of the Analytics console, computed from hand-built order
 * rows so every tile, trend, breakdown and the leaderboard can be checked
 * against arithmetic done by hand. The order loaders and the store models'
 * live counts are mocked; the maths is real.
 */
jest.mock('@modules/platform/analytics/entity/petStore.data', () => ({
  loadStoreOrders: jest.fn(),
  firstOrderByEmail: jest.fn(),
  filingOf: jest.fn(),
}));
jest.mock('@modules/commerce/store/storeProduct.model', () => ({ StoreProductModel: { countDocuments: jest.fn() } }));
jest.mock('@modules/commerce/store/storeCart.model', () => ({ StoreCartModel: { countDocuments: jest.fn() } }));
jest.mock('@modules/commerce/store/storeReturn.model', () => ({ StoreReturnModel: { countDocuments: jest.fn() } }));
jest.mock('@modules/commerce/store/storeSubscription.model', () => ({
  StoreSubscriptionModel: { countDocuments: jest.fn() },
}));

import { FULFILMENT_STATUSES } from '@modules/commerce/productOrder/productOrder.model';
import { StoreProductModel } from '@modules/commerce/store/storeProduct.model';
import { StoreCartModel } from '@modules/commerce/store/storeCart.model';
import { StoreReturnModel } from '@modules/commerce/store/storeReturn.model';
import { StoreSubscriptionModel } from '@modules/commerce/store/storeSubscription.model';
import { filingOf, firstOrderByEmail, loadStoreOrders, type StoreOrderRow } from '../../entity/petStore.data';
import { petStoreAnalytics } from '../../entity/petStore.analytics';
import type { AnalyticsWindow } from '../../entity/window';

const m = (fn: unknown) => fn as jest.Mock;
const d = (iso: string) => new Date(iso);

const WINDOW: AnalyticsWindow = {
  days: 7,
  from: d('2026-03-08T00:00:00Z'),
  to: d('2026-03-15T00:00:00Z'),
  prevFrom: d('2026-03-01T00:00:00Z'),
  prevTo: d('2026-03-08T00:00:00Z'),
  compare: 'PREVIOUS',
  city: null,
  granularity: 'DAY',
  zone: 'UTC',
  buckets: ['2026-03-08', '2026-03-09', '2026-03-10'],
};

const order = (over: Partial<StoreOrderRow>): StoreOrderRow => ({
  id: 'o',
  created_at: d('2026-03-08T10:00:00Z'),
  buyer_email: 'a@x.com',
  guest: false,
  cancelled: false,
  status: 'DELIVERED',
  cod: false,
  net: 0,
  city: '',
  lines: [],
  ...over,
});

const CURRENT = [
  order({
    id: 'r1',
    net: 1200,
    city: 'Pune',
    lines: [
      { product_id: 'p1', name: 'Kibble', qty: 2, gross: 1000 },
      { product_id: 'p2', name: 'Toy', qty: 1, gross: 200 },
    ],
  }),
  order({
    id: 'r2',
    created_at: d('2026-03-09T15:30:00Z'),
    buyer_email: 'b@x.com',
    guest: true,
    cod: true,
    status: 'PENDING',
    net: 300,
    lines: [{ product_id: 'p1', name: 'Kibble', qty: 1, gross: 500 }],
  }),
  order({
    id: 'r3',
    created_at: d('2026-03-09T20:00:00Z'),
    cancelled: true,
    status: 'CANCELLED',
    net: 999,
    city: 'Pune',
    lines: [{ product_id: 'p3', name: 'Bed', qty: 1, gross: 999 }],
  }),
  order({
    id: 'r4',
    created_at: d('2026-03-10T01:00:00Z'),
    buyer_email: 'c@x.com',
    net: 6000,
    city: 'Mumbai',
    lines: [{ product_id: 'p4', name: 'Crate', qty: 1, gross: 6000 }],
  }),
];

const PREVIOUS = [
  order({ id: 'q1', created_at: d('2026-03-02T09:00:00Z'), net: 500, lines: [{ product_id: 'p1', name: 'Kibble', qty: 1, gross: 500 }] }),
  order({ id: 'q2', created_at: d('2026-03-03T09:00:00Z'), buyer_email: 'd@x.com', cancelled: true, net: 800 }),
];

const FIRSTS = new Map([
  ['a@x.com', d('2026-03-02T09:00:00Z')],
  ['b@x.com', d('2026-03-09T15:30:00Z')],
  ['c@x.com', d('2026-03-10T01:00:00Z')],
  ['d@x.com', d('2026-03-03T09:00:00Z')],
  ['e@x.com', d('2026-01-01T00:00:00Z')],
]);

const FILING = {
  filing: new Map([
    ['p1', { brand: 'b1', brandName: 'Acme', petTypes: ['dog'], categories: ['food'] }],
    ['p2', { brand: 'duncit', brandName: '', petTypes: ['dog', 'cat'], categories: ['toys'] }],
  ]),
  petNames: new Map([
    ['dog', 'Dogs'],
    ['cat', 'Cats'],
  ]),
  categoryNames: new Map([
    ['food', 'Food'],
    ['toys', 'Toys'],
  ]),
};

const isCurrent = (filter: Record<string, any>, field: string) => filter[field].$gte === WINDOW.from;

beforeEach(() => {
  m(loadStoreOrders).mockResolvedValue([...CURRENT, ...PREVIOUS]);
  m(firstOrderByEmail).mockResolvedValue(FIRSTS);
  m(filingOf).mockResolvedValue(FILING);
  m(StoreReturnModel.countDocuments).mockImplementation(async (f) => (isCurrent(f, 'created_at') ? 1 : 0));
  m(StoreCartModel.countDocuments).mockImplementation(async (f) => (isCurrent(f, 'last_activity_at') ? 3 : 1));
  m(StoreProductModel.countDocuments).mockResolvedValue(40);
  m(StoreSubscriptionModel.countDocuments).mockResolvedValue(7);
});

const kpisByKey = (sections: Awaited<ReturnType<typeof petStoreAnalytics>>) =>
  Object.fromEntries(sections.kpis.map((k) => [k.key, [k.value, k.previous]]));
const breakdownOf = (sections: Awaited<ReturnType<typeof petStoreAnalytics>>, key: string) => {
  const found = sections.breakdowns.find((b) => b.key === key);
  if (!found) throw new Error(`no breakdown ${key}`);
  return found;
};

describe('petStoreAnalytics — tiles', () => {
  it('computes every KPI for the window and the period before it', async () => {
    const out = await petStoreAnalytics(WINDOW);
    expect(kpisByKey(out)).toEqual({
      store_revenue: [7500, 500],
      store_orders: [4, 2],
      store_aov: [2500, 500],
      store_units: [5, 1],
      store_customers: [3, 2],
      store_new_customers: [2, 2],
      store_returning_rate: [33.3, 0],
      store_cancel_rate: [25, 50],
      store_return_rate: [25, 0],
      store_cod_share: [25, 0],
      store_guest_share: [25, 0],
      store_abandoned_carts: [3, 1],
      store_listed_products: [40, null],
      store_active_subscriptions: [7, null],
    });
    const byKey = Object.fromEntries(out.kpis.map((k) => [k.key, k]));
    expect(byKey.store_revenue.format).toBe('CURRENCY');
    expect(byKey.store_cancel_rate).toMatchObject({ format: 'PERCENT', higher_is_better: false });
    expect(byKey.store_abandoned_carts.higher_is_better).toBe(false);
    expect(byKey.store_guest_share.higher_is_better).toBe(true);
  });

  it('reads the live counts with the right filters', async () => {
    const before = Date.now();
    await petStoreAnalytics(WINDOW);
    expect(StoreProductModel.countDocuments).toHaveBeenCalledWith({ status: 'PUBLISHED' });
    expect(StoreSubscriptionModel.countDocuments).toHaveBeenCalledWith({ status: 'ACTIVE' });
    expect(StoreReturnModel.countDocuments).toHaveBeenCalledWith({ created_at: { $gte: WINDOW.prevFrom, $lt: WINDOW.prevTo } });
    const nowCart = m(StoreCartModel.countDocuments).mock.calls.find(([f]) => f.last_activity_at.$gte === WINDOW.from)[0];
    expect(nowCart['items.0']).toEqual({ $exists: true });
    // Only carts idle for at least an hour count as abandoned.
    const idle = nowCart.last_activity_at.$lt.getTime();
    expect(idle).toBeGreaterThanOrEqual(before - 60 * 60 * 1000);
    expect(idle).toBeLessThanOrEqual(Date.now() - 60 * 60 * 1000);
  });

  it('reads zero everywhere, without a leaderboard, when nothing was ordered', async () => {
    m(loadStoreOrders).mockResolvedValue([]);
    m(firstOrderByEmail).mockResolvedValue(new Map());
    m(filingOf).mockResolvedValue({ filing: new Map(), petNames: new Map(), categoryNames: new Map() });
    const out = await petStoreAnalytics(WINDOW);
    const windowed = out.kpis.filter((k) => k.previous !== null && k.key !== 'store_abandoned_carts');
    expect(windowed).toHaveLength(11);
    expect(windowed.map((k) => [k.key, k.value, k.previous])).toEqual(windowed.map((k) => [k.key, 0, 0]));
    // Carts are counted live from their own collection, not from orders.
    expect(kpisByKey(out).store_abandoned_carts).toEqual([3, 1]);
    expect(out.leaderboard).toBeNull();
    expect(filingOf).toHaveBeenCalledWith([]);
    expect(out.trends.every((t) => t.series.every((s) => s.values.every((v) => v === 0)))).toBe(true);
    expect(breakdownOf(out, 'store_basket_value').slices.every((s) => s.value === 0)).toBe(true);
  });

  it('keeps AOV at zero when every order in a period was cancelled', async () => {
    m(loadStoreOrders).mockResolvedValue([order({ cancelled: true, net: 900 })]);
    const out = await petStoreAnalytics(WINDOW);
    expect(kpisByKey(out)).toMatchObject({ store_aov: [0, 0], store_revenue: [0, 0], store_cancel_rate: [100, 0] });
  });
});

describe('petStoreAnalytics — trends', () => {
  it('lays revenue, orders and new-vs-returning onto the window buckets', async () => {
    const out = await petStoreAnalytics(WINDOW);
    const series = Object.fromEntries(out.trends.flatMap((t) => t.series.map((s) => [s.key, s.values])));
    expect(series).toEqual({
      store_revenue: [1200, 300, 6000],
      store_orders: [1, 2, 1],
      store_cancelled: [0, 1, 0],
      store_new_customers: [0, 1, 1],
      store_orders_returning: [1, 1, 0],
    });
    expect(out.trends[0]).toMatchObject({ key: 'store_revenue', format: 'CURRENCY', granularity: 'DAY', buckets: WINDOW.buckets });
  });

  it('counts only the first order of a new buyer as new, even with repeat orders in the window', async () => {
    m(loadStoreOrders).mockResolvedValue([
      order({ id: 'z2', buyer_email: 'b@x.com', created_at: d('2026-03-10T05:00:00Z') }),
      order({ id: 'z1', buyer_email: 'b@x.com', created_at: d('2026-03-09T15:30:00Z') }),
      order({ id: 'z3', buyer_email: 'nobody@x.com', created_at: d('2026-03-10T06:00:00Z') }),
    ]);
    const out = await petStoreAnalytics(WINDOW);
    const customers = out.trends.find((t) => t.key === 'store_customers');
    expect(customers?.series).toEqual([
      { key: 'store_new_customers', values: [0, 1, 0] },
      { key: 'store_orders_returning', values: [0, 0, 2] },
    ]);
  });
});

describe('petStoreAnalytics — breakdowns and leaderboard', () => {
  it('splits orders by status, payment and buyer type in fixed order', async () => {
    const out = await petStoreAnalytics(WINDOW);
    const status = breakdownOf(out, 'store_orders_by_status');
    expect(status.slices.map((s) => s.key)).toEqual(FULFILMENT_STATUSES);
    expect(status.slices.find((s) => s.key === 'PENDING')?.value).toBe(1);
    expect(breakdownOf(out, 'store_payment_method').slices).toEqual([
      { key: 'PREPAID', label: null, value: 3 },
      { key: 'COD', label: null, value: 1 },
    ]);
    expect(breakdownOf(out, 'store_buyer_type').slices).toEqual([
      { key: 'MEMBER', label: null, value: 3 },
      { key: 'GUEST', label: null, value: 1 },
    ]);
  });

  it('splits live revenue across pet types, categories and brands, unfiled products going to Duncit', async () => {
    const out = await petStoreAnalytics(WINDOW);
    expect(filingOf).toHaveBeenCalledWith(['p1', 'p2', 'p4']);
    expect(breakdownOf(out, 'store_revenue_by_pet')).toMatchObject({
      format: 'CURRENCY',
      slices: [
        { key: 'dog', label: 'Dogs', value: 1700 },
        { key: 'cat', label: 'Cats', value: 200 },
      ],
    });
    expect(breakdownOf(out, 'store_revenue_by_category').slices).toEqual([
      { key: 'food', label: 'Food', value: 1500 },
      { key: 'toys', label: 'Toys', value: 200 },
    ]);
    expect(breakdownOf(out, 'store_revenue_by_brand').slices).toEqual([
      { key: 'duncit', label: '', value: 6200 },
      { key: 'b1', label: 'Acme', value: 1500 },
    ]);
  });

  it('counts cities (blank ones left out), basket bands and order hours', async () => {
    const out = await petStoreAnalytics(WINDOW);
    expect(breakdownOf(out, 'store_orders_by_city').slices).toEqual([
      { key: 'Pune', label: 'Pune', value: 2 },
      { key: 'Mumbai', label: 'Mumbai', value: 1 },
    ]);
    const basket = breakdownOf(out, 'store_basket_value');
    expect(basket.ordered).toBe(true);
    expect(basket.slices.map((s) => [s.key, s.value])).toEqual([
      ['basket_under_500', 1],
      ['basket_500_999', 0],
      ['basket_1000_1999', 1],
      ['basket_2000_4999', 0],
      ['basket_5000_plus', 1],
    ]);
    const hours = breakdownOf(out, 'store_order_hour');
    expect(hours.slices).toHaveLength(24);
    expect(hours.slices.filter((s) => s.value > 0).map((s) => [s.key, s.value])).toEqual([
      ['1', 1],
      ['10', 1],
      ['15', 1],
      ['20', 1],
    ]);
  });

  it('reads order hours in the admin time zone', async () => {
    const out = await petStoreAnalytics({ ...WINDOW, zone: 'Asia/Kolkata' });
    const busy = breakdownOf(out, 'store_order_hour').slices.filter((s) => s.value > 0).map((s) => s.key);
    // 01:00Z → 6:30, 10:00Z → 15:30, 15:30Z → 21:00, 20:00Z → 01:30 next day.
    expect(busy).toEqual(['1', '6', '15', '21']);
  });

  it('ranks products by units then revenue, ignoring cancelled orders', async () => {
    const out = await petStoreAnalytics(WINDOW);
    expect(out.leaderboard).toEqual({
      key: 'top_store_products',
      columns: [
        { key: 'units', format: 'COUNT' },
        { key: 'revenue', format: 'CURRENCY' },
      ],
      rows: [
        { id: 'p1', name: 'Kibble', caption: null, values: [3, 1500] },
        { id: 'p4', name: 'Crate', caption: null, values: [1, 6000] },
        { id: 'p2', name: 'Toy', caption: null, values: [1, 200] },
      ],
    });
  });

  it('caps the leaderboard at ten products', async () => {
    const lines = Array.from({ length: 12 }, (_v, i) => ({ product_id: `p${i}`, name: `P${i}`, qty: i + 1, gross: 10 }));
    m(loadStoreOrders).mockResolvedValue([order({ lines })]);
    const out = await petStoreAnalytics(WINDOW);
    expect(out.leaderboard?.rows).toHaveLength(10);
    expect(out.leaderboard?.rows[0]).toMatchObject({ id: 'p11', values: [12, 10] });
  });
});
