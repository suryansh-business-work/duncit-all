import type { Translate } from '@duncit/shell';
import { formatCount, formatFoodMoney, formatRating } from '@duncit/utils';
import { FOOD_ORDER_STATUSES } from '../venue-food-orders-page/food-order-labels';
import type { FoodOrderStatus } from '../venue-food-orders-page/queries';
import type { FoodDailyPoint, FoodStats, FoodTopItem } from './queries';

export interface FoodStatTile {
  key: string;
  label: string;
  value: string;
  hint?: string;
}

/** The dashboard's tiles, in reading order: sales first, then service, then reach. */
export function foodStatTiles(stats: FoodStats, t: Translate): FoodStatTile[] {
  const money = (amount: number) => formatFoodMoney(amount, stats.currency_symbol);
  const rated = stats.feedback_count > 0;
  return [
    { key: 'orders', label: t('partners.foodDashboard.orders'), value: formatCount(stats.orders), hint: t('partners.foodDashboard.ordersHint') },
    { key: 'revenue', label: t('partners.foodDashboard.revenue'), value: money(stats.revenue), hint: t('partners.foodDashboard.revenueHint') },
    { key: 'average-order', label: t('partners.foodDashboard.averageOrder'), value: money(stats.average_order) },
    { key: 'served', label: t('partners.foodDashboard.served'), value: formatCount(stats.served) },
    {
      key: 'cancelled',
      label: t('partners.foodDashboard.cancelled'),
      value: formatCount(stats.cancelled),
      hint: t('partners.foodDashboard.cancelledHint', { vars: { amount: money(stats.refunded) } }),
    },
    { key: 'discounts', label: t('partners.foodDashboard.discounts'), value: money(stats.discount_given), hint: t('partners.foodDashboard.discountsHint') },
    { key: 'coupon-orders', label: t('partners.foodDashboard.couponOrders'), value: formatCount(stats.coupon_orders), hint: t('partners.foodDashboard.couponOrdersHint') },
    {
      key: 'rating',
      label: t('partners.foodDashboard.rating'),
      value: rated
        ? t('partners.foodDashboard.ratingValue', { vars: { rating: formatRating(stats.average_rating) } })
        : t('partners.foodDashboard.none'),
      hint: rated
        ? t('partners.foodDashboard.ratingCount', { vars: { count: formatCount(stats.feedback_count) } })
        : t('partners.foodDashboard.noRatings'),
    },
    {
      key: 'subscribers',
      label: t('partners.foodDashboard.subscribers'),
      value: formatCount(stats.subscribers),
      hint: t('partners.foodDashboard.subscribersHint', { vars: { count: formatCount(stats.subscribe_opt_ins) } }),
    },
    { key: 'poster-scans', label: t('partners.foodDashboard.posterScans'), value: formatCount(stats.page_scans), hint: t('partners.foodDashboard.posterScansHint') },
    { key: 'table-scans', label: t('partners.foodDashboard.tableScans'), value: formatCount(stats.table_scans), hint: t('partners.foodDashboard.tableScansHint') },
    { key: 'invoice-downloads', label: t('partners.foodDashboard.invoiceDownloads'), value: formatCount(stats.invoice_downloads) },
  ];
}

/** `value` as a 0–100 share of `whole`, safe when the whole is nothing. */
export const barPercent = (value: number, whole: number): number =>
  whole > 0 ? Math.min(100, Math.max(0, (value / whole) * 100)) : 0;

export interface FoodStatusBar {
  status: FoodOrderStatus;
  count: number;
  /** The status's share of every order in the period. */
  percent: number;
}

/** Every order status in kitchen order, each with its share — a status with no orders keeps its row at zero. */
export function foodStatusBars(stats: Pick<FoodStats, 'status_counts'>): FoodStatusBar[] {
  const counts = new Map(stats.status_counts.map((row) => [row.status, row.count]));
  const total = stats.status_counts.reduce((sum, row) => sum + row.count, 0);
  return FOOD_ORDER_STATUSES.map((status) => {
    const count = counts.get(status) ?? 0;
    return { status, count, percent: barPercent(count, total) };
  });
}

export interface FoodDishBar extends FoodTopItem {
  /** The dish's quantity as a share of the best seller's, so the top dish fills its row. */
  percent: number;
}

export function foodDishBars(items: readonly FoodTopItem[]): FoodDishBar[] {
  const best = Math.max(...items.map((item) => item.quantity), 0);
  return items.map((item) => ({ ...item, percent: barPercent(item.quantity, best) }));
}

export type FoodTrendKey = 'orders' | 'revenue';

/**
 * One series of the daily chart as SVG polyline points. Each series is scaled
 * to its OWN peak — orders and revenue differ by orders of magnitude, so on a
 * shared scale the order line would lie flat along the axis.
 */
export function foodTrendLine(
  daily: readonly FoodDailyPoint[],
  key: FoodTrendKey,
  box: { width: number; height: number; pad: number },
): string {
  const span = Math.max(...daily.map((point) => point[key]), 0) || 1;
  const step = daily.length > 1 ? box.width / (daily.length - 1) : 0;
  return daily
    .map((point, index) => {
      const x = index * step;
      const y = box.height - box.pad - (point[key] / span) * (box.height - box.pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
