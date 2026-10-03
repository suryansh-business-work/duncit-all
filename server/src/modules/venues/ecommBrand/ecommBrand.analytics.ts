import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import {
  EXCLUDED_ORDER_STATUSES,
  performanceRows,
  soldCommissionPcts,
} from '@modules/venues/partnerDashboard/partnerDashboard.service';

/**
 * One brand's sales over a window — the Analytics tab of the brand details page
 * in Partners (owner) and the Products portal (staff). The money rules are the
 * partner dashboard's own (`soldCommissionPcts` / `performanceRows`), so the two
 * screens can never quote a brand different numbers.
 */

const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;
const TOP_PRODUCTS = 10;
const DAY_MS = 86_400_000;

/** One product's sold lines in the window, as the $facet groups them. */
interface SoldProductRow {
  _id: Types.ObjectId;
  name?: string;
  units: number;
  gross: number;
}

const money = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

/** 1–365 whole days; anything else falls back to the 30-day default. */
export function clampDays(days?: number | null): number {
  const n = Math.trunc(Number(days));
  if (!Number.isFinite(n) || n < 1) return DEFAULT_DAYS;
  return Math.min(n, MAX_DAYS);
}

/** Every UTC day of the window, oldest first, zero-filled where nothing sold. */
export function fillTrend(
  rows: { _id: string; orders: number; gross: number }[],
  since: Date,
  days: number
) {
  const byDay = new Map(rows.map((row) => [row._id, row]));
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(since.getTime() + index * DAY_MS).toISOString().slice(0, 10);
    const row = byDay.get(date);
    return { date, orders: row?.orders ?? 0, gross_revenue: money(row?.gross ?? 0) };
  });
}

export async function brandAnalytics(brandId: string, days?: number | null) {
  if (!Types.ObjectId.isValid(brandId)) {
    throw new GraphQLError('Invalid brand', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const window = clampDays(days);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const since = new Date(today.getTime() - (window - 1) * DAY_MS);
  const brand = new Types.ObjectId(brandId);
  const mine = { 'line_items.brand_id': brand };

  const [facets, products] = await Promise.all([
    ProductOrderModel.aggregate([
      { $match: { ...mine, created_at: { $gte: since }, fulfilment_status: { $nin: EXCLUDED_ORDER_STATUSES } } },
      { $unwind: '$line_items' },
      { $match: mine },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                units: { $sum: '$line_items.qty' },
                gross: { $sum: '$line_items.gross' },
                orders: { $addToSet: '$_id' },
              },
            },
            { $project: { units: 1, gross: 1, orders: { $size: '$orders' } } },
          ],
          trend: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
                orders: { $addToSet: '$_id' },
                gross: { $sum: '$line_items.gross' },
              },
            },
            { $project: { gross: 1, orders: { $size: '$orders' } } },
          ],
          byProduct: [
            {
              $group: {
                _id: '$line_items.product_id',
                name: { $first: '$line_items.name' },
                units: { $sum: '$line_items.qty' },
                gross: { $sum: '$line_items.gross' },
              },
            },
            { $sort: { gross: -1 } },
          ],
        },
      },
    ]),
    InventoryProductModel.find({ brand_id: brand, ownership: 'BRAND' })
      .select('view_count click_count is_active status listing_review_status')
      .lean(),
  ]);

  const facet = facets[0] ?? {};
  const totals = facet.totals?.[0] ?? { units: 0, gross: 0, orders: 0 };
  const byProduct: SoldProductRow[] = facet.byProduct ?? [];
  const performance = performanceRows(byProduct, await soldCommissionPcts(byProduct.map((row) => row._id)));
  const gross = money(totals.gross);
  const orders = totals.orders ?? 0;

  return {
    days: window,
    since: since.toISOString(),
    orders,
    units_sold: totals.units ?? 0,
    gross_revenue: gross,
    net_earnings: money(performance.reduce((sum, row) => sum + row.net_earnings, 0)),
    average_order_value: orders > 0 ? money(gross / orders) : 0,
    // Lifetime counters (the product pages keep no per-day history).
    product_views: products.reduce((sum, p) => sum + (p.view_count ?? 0), 0),
    product_clicks: products.reduce((sum, p) => sum + (p.click_count ?? 0), 0),
    total_products: products.length,
    live_products: products.filter(
      (p) => p.is_active !== false && p.status === 'ACTIVE' && p.listing_review_status === 'APPROVED'
    ).length,
    trend: fillTrend(facet.trend ?? [], since, window),
    top_products: performance.slice(0, TOP_PRODUCTS),
  };
}
