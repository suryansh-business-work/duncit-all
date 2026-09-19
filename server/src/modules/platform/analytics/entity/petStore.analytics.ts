import { formatInTimeZone } from 'date-fns-tz';
import { FULFILMENT_STATUSES } from '@modules/commerce/productOrder/productOrder.model';
import { StoreProductModel } from '@modules/commerce/store/storeProduct.model';
import { StoreCartModel } from '@modules/commerce/store/storeCart.model';
import { StoreReturnModel } from '@modules/commerce/store/storeReturn.model';
import { StoreSubscriptionModel } from '@modules/commerce/store/storeSubscription.model';
import {
  bandSlices,
  breakdown,
  fixedSlices,
  kpi,
  pct,
  round1,
  tally,
  topSlices,
  trend,
  type Band,
  type EntityAnalyticsSections,
} from './shapes';
import { dayTotals, seriesFromDays, type AnalyticsWindow } from './window';
import { filingOf, firstOrderByEmail, loadStoreOrders, type StoreOrderRow } from './petStore.data';

/**
 * The Pet Store page of the Analytics console: sales, customers, what sells and
 * where it goes. Orders are counted the day they are placed; revenue is only
 * what the buyer owes on orders that were not cancelled.
 */

const BASKET_BANDS: Band[] = [
  { key: 'basket_under_500', min: 0 },
  { key: 'basket_500_999', min: 500 },
  { key: 'basket_1000_1999', min: 1000 },
  { key: 'basket_2000_4999', min: 2000 },
  { key: 'basket_5000_plus', min: 5000 },
];

const HOURS = Array.from({ length: 24 }, (_v, h) => String(h));
const HOUR_MS = 60 * 60 * 1000;

interface PeriodStats {
  orders: number;
  cancelled: number;
  revenue: number;
  units: number;
  customers: Set<string>;
  cod: number;
  guests: number;
}

function statsOf(rows: StoreOrderRow[]): PeriodStats {
  const live = rows.filter((r) => !r.cancelled);
  return {
    orders: rows.length,
    cancelled: rows.length - live.length,
    revenue: Math.round(live.reduce((s, r) => s + r.net, 0)),
    units: live.reduce((s, r) => s + r.lines.reduce((u, l) => u + l.qty, 0), 0),
    customers: new Set(rows.map((r) => r.buyer_email)),
    cod: rows.filter((r) => r.cod).length,
    guests: rows.filter((r) => r.guest).length,
  };
}

/** Buyers whose first-ever store order falls inside [from, to). */
const newBuyers = (firsts: Map<string, Date>, from: Date, to: Date) =>
  [...firsts.values()].filter((d) => d >= from && d < to).length;

async function liveCounts(window: AnalyticsWindow) {
  const idle = new Date(Date.now() - HOUR_MS);
  const [returnsNow, returnsBefore, listed, subscriptions, cartsNow, cartsBefore] = await Promise.all([
    StoreReturnModel.countDocuments({ created_at: { $gte: window.from, $lt: window.to } }),
    StoreReturnModel.countDocuments({ created_at: { $gte: window.prevFrom, $lt: window.prevTo } }),
    StoreProductModel.countDocuments({ status: 'PUBLISHED' }),
    StoreSubscriptionModel.countDocuments({ status: 'ACTIVE' }),
    StoreCartModel.countDocuments({
      'items.0': { $exists: true },
      last_activity_at: { $gte: window.from, $lt: idle },
    }),
    StoreCartModel.countDocuments({
      'items.0': { $exists: true },
      last_activity_at: { $gte: window.prevFrom, $lt: window.prevTo },
    }),
  ]);
  return { returnsNow, returnsBefore, listed, subscriptions, cartsNow, cartsBefore };
}

function kpisOf(cur: PeriodStats, prev: PeriodStats, fresh: { now: number; before: number }, live: Awaited<ReturnType<typeof liveCounts>>) {
  const aov = (s: PeriodStats) => (s.orders - s.cancelled > 0 ? round1(s.revenue / (s.orders - s.cancelled)) : 0);
  const returning = (s: PeriodStats, fresh: number) => pct(Math.max(0, s.customers.size - fresh), s.customers.size);
  return [
    kpi('store_revenue', cur.revenue, prev.revenue, { format: 'CURRENCY' }),
    kpi('store_orders', cur.orders, prev.orders),
    kpi('store_aov', aov(cur), aov(prev), { format: 'CURRENCY' }),
    kpi('store_units', cur.units, prev.units),
    kpi('store_customers', cur.customers.size, prev.customers.size),
    kpi('store_new_customers', fresh.now, fresh.before),
    kpi('store_returning_rate', returning(cur, fresh.now), returning(prev, fresh.before), { format: 'PERCENT' }),
    kpi('store_cancel_rate', pct(cur.cancelled, cur.orders), pct(prev.cancelled, prev.orders), {
      format: 'PERCENT',
      higherIsBetter: false,
    }),
    kpi('store_return_rate', pct(live.returnsNow, cur.orders), pct(live.returnsBefore, prev.orders), {
      format: 'PERCENT',
      higherIsBetter: false,
    }),
    kpi('store_cod_share', pct(cur.cod, cur.orders), pct(prev.cod, prev.orders), {
      format: 'PERCENT',
      higherIsBetter: false,
    }),
    kpi('store_guest_share', pct(cur.guests, cur.orders), pct(prev.guests, prev.orders), { format: 'PERCENT' }),
    kpi('store_abandoned_carts', live.cartsNow, live.cartsBefore, { higherIsBetter: false }),
    kpi('store_listed_products', live.listed, null),
    kpi('store_active_subscriptions', live.subscriptions, null),
  ];
}

function trendsOf(cur: StoreOrderRow[], firsts: Map<string, Date>, window: AnalyticsWindow) {
  const live = cur.filter((r) => !r.cancelled);
  const seen = new Set<string>();
  const oldestFirst = [...cur];
  oldestFirst.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  const firstOrders = oldestFirst.filter((r) => {
    const first = firsts.get(r.buyer_email);
    if (seen.has(r.buyer_email) || !first || first < window.from) return false;
    seen.add(r.buyer_email);
    return true;
  });
  const firstIds = new Set(firstOrders.map((r) => r.id));
  const zone = window.zone;
  const daily = (rows: StoreOrderRow[], value?: (r: StoreOrderRow) => number) =>
    seriesFromDays(dayTotals(rows, (r) => r.created_at, zone, value), window);
  return [
    trend('store_revenue', window, [{ key: 'store_revenue', values: daily(live, (r) => r.net) }], 'CURRENCY'),
    trend('store_orders', window, [
      { key: 'store_orders', values: daily(cur) },
      { key: 'store_cancelled', values: daily(cur.filter((r) => r.cancelled)) },
    ]),
    trend('store_customers', window, [
      { key: 'store_new_customers', values: daily(firstOrders) },
      { key: 'store_orders_returning', values: daily(cur.filter((r) => !firstIds.has(r.id))) },
    ]),
  ];
}

/** Revenue per key, split across whatever a sold line is filed under. */
function revenueBy(rows: StoreOrderRow[], keysOf: (productId: string) => string[]) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    for (const line of row.lines) {
      for (const key of keysOf(line.product_id)) totals.set(key, Math.round((totals.get(key) ?? 0) + line.gross));
    }
  }
  return totals;
}

async function breakdownsOf(cur: StoreOrderRow[], window: AnalyticsWindow) {
  const live = cur.filter((r) => !r.cancelled);
  const productIds = [...new Set(live.flatMap((r) => r.lines.map((l) => l.product_id)))];
  const { filing, petNames, categoryNames } = await filingOf(productIds);
  const brandNames = new Map([...filing.values()].map((f) => [f.brand, f.brandName]));
  const cities = tally(cur.map((r) => r.city).filter(Boolean));
  const cityNames = new Map([...cities.keys()].map((c) => [c, c]));
  return [
    breakdown('store_orders_by_status', fixedSlices(FULFILMENT_STATUSES, tally(cur.map((r) => r.status)))),
    breakdown('store_payment_method', fixedSlices(['PREPAID', 'COD'], tally(cur.map((r) => (r.cod ? 'COD' : 'PREPAID'))))),
    breakdown('store_buyer_type', fixedSlices(['MEMBER', 'GUEST'], tally(cur.map((r) => (r.guest ? 'GUEST' : 'MEMBER'))))),
    breakdown('store_revenue_by_pet', topSlices(revenueBy(live, (id) => filing.get(id)?.petTypes ?? []), petNames), {
      format: 'CURRENCY',
    }),
    breakdown(
      'store_revenue_by_category',
      topSlices(revenueBy(live, (id) => filing.get(id)?.categories ?? []), categoryNames),
      { format: 'CURRENCY' }
    ),
    breakdown('store_revenue_by_brand', topSlices(revenueBy(live, (id) => [filing.get(id)?.brand ?? 'duncit']), brandNames), {
      format: 'CURRENCY',
    }),
    breakdown('store_orders_by_city', topSlices(cities, cityNames)),
    breakdown('store_basket_value', bandSlices(live.map((r) => r.net), BASKET_BANDS), { ordered: true }),
    breakdown(
      'store_order_hour',
      fixedSlices(HOURS, tally(cur.map((r) => String(Number(formatInTimeZone(r.created_at, window.zone, 'H')))))),
      { ordered: true }
    ),
  ];
}

function topProducts(cur: StoreOrderRow[]) {
  const byProduct = new Map<string, { name: string; units: number; revenue: number }>();
  for (const row of cur.filter((r) => !r.cancelled)) {
    for (const line of row.lines) {
      const entry = byProduct.get(line.product_id) ?? { name: line.name, units: 0, revenue: 0 };
      entry.units += line.qty;
      entry.revenue += line.gross;
      byProduct.set(line.product_id, entry);
    }
  }
  const rows = [...byProduct.entries()]
    .sort(([, a], [, b]) => b.units - a.units || b.revenue - a.revenue)
    .slice(0, 10)
    .map(([id, e]) => ({ id, name: e.name, caption: null, values: [e.units, Math.round(e.revenue)] }));
  return {
    key: 'top_store_products',
    columns: [
      { key: 'units', format: 'COUNT' as const },
      { key: 'revenue', format: 'CURRENCY' as const },
    ],
    rows,
  };
}

export async function petStoreAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const [orders, firsts, live] = await Promise.all([loadStoreOrders(window), firstOrderByEmail(), liveCounts(window)]);
  const cur = orders.filter((o) => o.created_at >= window.from);
  const prev = orders.filter((o) => o.created_at < window.from);
  const fresh = {
    now: newBuyers(firsts, window.from, window.to),
    before: newBuyers(firsts, window.prevFrom, window.prevTo),
  };
  return {
    kpis: kpisOf(statsOf(cur), statsOf(prev), fresh, live),
    trends: trendsOf(cur, firsts, window),
    breakdowns: await breakdownsOf(cur, window),
    leaderboard: cur.length > 0 ? topProducts(cur) : null,
  };
}
