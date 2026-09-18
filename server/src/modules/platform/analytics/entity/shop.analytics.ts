import type { Types } from 'mongoose';
import { FULFILMENT_STATUSES, ORDER_CHANNELS } from '@modules/commerce/productOrder/productOrder.model';
import { consoleLink } from './links';
import { seriesFromDays, type AnalyticsWindow } from './window';
import { column } from './aggregates';
import {
  breakdown,
  fixedSlices,
  kpi,
  linkEverything,
  mean,
  pct,
  rankedSlices,
  topSlices,
  trend,
  type AnalyticsBreakdown,
  type AnalyticsKpi,
  type AnalyticsLeaderboard,
  type EntityAnalyticsSections,
} from './shapes';
import {
  loadOrderMix,
  loadReturnReasons,
  loadShopDays,
  loadShopLive,
  loadShopPeriod,
  loadTopProducts,
  productOwners,
  type OrderMixRow,
  type ProductSales,
  type ShopPeriod,
} from './shop.data';

/**
 * Analytics > Money > Shop — what both shops sold, how it was paid for, how it
 * travelled and what came back, beside the state of the catalogue. Orders
 * count by when they were placed; stock is as it stands now. The pet store has
 * no console of its own yet, so every link opens the Products console.
 */

const DASHBOARD = consoleLink('products', '/');
const ORDERS = consoleLink('products', '/orders');
const INVENTORY = consoleLink('products', '/inventory');

const DAY_MS = 24 * 60 * 60 * 1000;
const PAYMENT_METHODS = ['PREPAID', 'COD'] as const;
const FULFILMENT_METHODS = ['SHIP', 'PICKUP'] as const;

/** Each tile's value for one period — computed identically for both periods. */
const shopFigures = (period: ShopPeriod) => ({
  orders: period.orders,
  value: Math.round(period.value),
  avg_order: mean(period.value, period.orders - period.cancelled),
  cod_share: pct(period.cod, period.orders),
  cancellation_rate: pct(period.cancelled, period.orders),
  returns: period.returns,
  fulfilment_days: mean(period.done_ms / DAY_MS, period.done),
});

function shopKpis(current: ShopPeriod, previous: ShopPeriod, live: Awaited<ReturnType<typeof loadShopLive>>): AnalyticsKpi[] {
  const now = shopFigures(current);
  const was = shopFigures(previous);
  const worse = { higherIsBetter: false, link: ORDERS };
  const stock = { higherIsBetter: false, link: INVENTORY };
  return [
    kpi('shop_orders', now.orders, was.orders, { link: ORDERS }),
    kpi('shop_order_value', now.value, was.value, { format: 'CURRENCY', link: ORDERS }),
    kpi('shop_avg_order', now.avg_order, was.avg_order, { format: 'CURRENCY', link: ORDERS }),
    kpi('shop_cod_share', now.cod_share, was.cod_share, { ...worse, format: 'PERCENT' }),
    kpi('shop_cancellation_rate', now.cancellation_rate, was.cancellation_rate, { ...worse, format: 'PERCENT' }),
    kpi('shop_returns', now.returns, was.returns, worse),
    kpi('shop_fulfilment_days', now.fulfilment_days, was.fulfilment_days, { ...worse, format: 'DAYS' }),
    kpi('shop_open_orders', live.open, null, worse),
    kpi('shop_products_on_sale', live.products, null, { link: INVENTORY }),
    kpi('shop_store_listed', live.listed, null, { link: INVENTORY }),
    kpi('shop_low_stock', live.low, null, stock),
    kpi('shop_out_of_stock', live.out, null, stock),
  ];
}

/** A courier not assigned yet has no name; it files under "not set". */
const courierKey = (name: string) => (name === '' ? 'none' : name);

function orderBreakdowns(mix: readonly OrderMixRow[], reasons: Awaited<ReturnType<typeof loadReturnReasons>>): AnalyticsBreakdown[] {
  const countBy = (keyOf: (id: OrderMixRow['_id']) => string | null) => {
    const counts = new Map<string, number>();
    for (const row of mix) {
      const key = keyOf(row._id);
      if (key !== null) counts.set(key, (counts.get(key) ?? 0) + row.count);
    }
    return counts;
  };
  // Only a shipped order has a courier; a pickup never will.
  const couriers = countBy((id) => (id.fulfilment === 'SHIP' ? courierKey(id.courier) : null));
  const courierNames = new Map([...couriers.keys()].filter((key) => key !== 'none').map((key) => [key, key]));
  return [
    breakdown('shop_by_channel', fixedSlices(ORDER_CHANNELS, countBy((id) => id.channel)), { link: ORDERS }),
    breakdown('shop_payment_method', fixedSlices(PAYMENT_METHODS, countBy((id) => id.method)), { link: ORDERS }),
    breakdown('shop_fulfilment_status', fixedSlices(FULFILMENT_STATUSES, countBy((id) => id.status)), {
      ordered: true,
      link: ORDERS,
    }),
    breakdown('shop_fulfilment_method', fixedSlices(FULFILMENT_METHODS, countBy((id) => id.fulfilment)), { link: ORDERS }),
    breakdown('shop_by_courier', topSlices(couriers, courierNames), { link: ORDERS }),
    breakdown('shop_return_reasons', rankedSlices(reasons, (row) => row._id, (row) => row.count), { link: ORDERS }),
  ];
}

/** A brand's product opens under its brand; Duncit's own open in Duncit Products. */
const productLink = (id: string, brandId?: Types.ObjectId | null) =>
  brandId
    ? consoleLink('products', `/catalog/brands/${brandId.toHexString()}/products/${id}/edit`)
    : consoleLink('products', `/inventory/${id}/edit`);

async function productLeaderboard(rows: ProductSales[]): Promise<AnalyticsLeaderboard> {
  const owners = await productOwners(rows.map((row) => row._id));
  return {
    key: 'shop_top_products',
    columns: [
      { key: 'shop_col_units', format: 'COUNT' },
      { key: 'shop_col_revenue', format: 'CURRENCY' },
      { key: 'shop_col_orders', format: 'COUNT' },
    ],
    rows: rows.map((row) => {
      const id = row._id.toHexString();
      const owner = owners.get(id);
      return {
        id,
        name: row.name,
        caption: owner?.ownership === 'BRAND' ? (owner.brand_name ?? null) : null,
        values: [row.units, Math.round(row.revenue), row.orders],
        link: productLink(id, owner?.brand_id),
      };
    }),
    link: INVENTORY,
  };
}

export async function shopAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const [current, previous, live, mix, reasons, days, top] = await Promise.all([
    loadShopPeriod(window.from, window.to),
    loadShopPeriod(window.prevFrom, window.prevTo),
    loadShopLive(),
    loadOrderMix(window.from, window.to),
    loadReturnReasons(window.from, window.to),
    loadShopDays(window.from, window.to, window.zone),
    loadTopProducts(window.from, window.to),
  ]);
  const series = (rows: Array<{ _id: string; value: number }>) => seriesFromDays(rows, window);
  const orderTrend = [
    { key: 'shop_pod_shop', values: series(column(days.orders, 'pod_shop')) },
    { key: 'shop_pet_store', values: series(column(days.orders, 'pet_store')) },
  ];
  const valueTrend = [{ key: 'shop_order_value', values: series(column(days.orders, 'value')) }];
  const troubleTrend = [
    { key: 'shop_cancelled', values: series(column(days.orders, 'cancelled')) },
    { key: 'shop_returns', values: series(column(days.returns, 'value')) },
  ];

  return linkEverything(
    {
      kpis: shopKpis(current, previous, live),
      trends: [
        trend('shop_orders', window, orderTrend, 'COUNT', ORDERS),
        trend('shop_order_value', window, valueTrend, 'CURRENCY', ORDERS),
        trend('shop_cancellations', window, troubleTrend, 'COUNT', ORDERS),
      ],
      breakdowns: orderBreakdowns(mix, reasons),
      leaderboard: await productLeaderboard(top),
    },
    DASHBOARD
  );
}
