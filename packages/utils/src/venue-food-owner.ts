/**
 * A venue's food desk, as its owner works it — the Food Dashboard, the order
 * board and the venue's food coupons. One contract for the three MUI surfaces
 * that mount @duncit/venue-food (Partners console, Venues console, mWeb) and
 * for the native app's Tamagui twins.
 *
 * The guest side (menu, cart, checkout, the order page) is `venue-food.ts`.
 * Everything here is framework-free: the documents travel as plain strings so
 * the web parses them with `gql` and native with graphql's `parse`, and every
 * label is a translation KEY resolved by the surface's own `t`.
 *
 * The server scopes every operation to the venue's owner and to Venues console
 * editors; nothing here decides who may act.
 */

import { formatCount, formatRating } from './club-admin-dashboard';
import { formatMoney } from './format-money';
import { PUBLIC_PAGE_RANGES } from './public-page';
import {
  FOOD_ORDER_FLOW,
  formatFoodMoney,
  type VenueFoodDiet,
  type VenueFoodFeedback,
  type VenueFoodOrderLine,
  type VenueFoodOrderStatus,
  type VenueFoodPaymentStatus,
} from './venue-food';
import type { SwitchableVenue } from './venue-switcher';

/** The `t` every label builder here takes — mWeb's, native's and the consoles' all fit. */
export type FoodOwnerTranslate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

/** The chip palette a status is painted with — MUI's names; native maps each to a theme token. */
export type FoodChipColor = 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error';

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/** One of the owner's venues, with whether it serves food — the desk exists only when it does. */
export interface FoodOwnerVenue extends SwitchableVenue {
  offers_food: boolean;
}

/** One paid (or refunded) food order as the board, its details and every action read it. */
export interface FoodOwnerOrder {
  id: string;
  order_no: string;
  customer_name: string;
  customer_phone: string;
  table_label: string;
  note: string;
  items: VenueFoodOrderLine[];
  subtotal: number;
  discount_pct: number;
  discount_amount: number;
  coupon_code?: string | null;
  coupon_pct?: number | null;
  coupon_discount_amount?: number | null;
  total: number;
  currency_symbol: string;
  status: VenueFoodOrderStatus;
  payment_status: VenueFoodPaymentStatus;
  cancel_reason?: string | null;
  created_at: string;
  venue_gstin?: string | null;
  invoice_available?: boolean | null;
  subscribe_events?: boolean | null;
  feedback?: VenueFoodFeedback | null;
}

/** One of a venue's food coupons as the list, its switch and the edit form read it. */
export interface FoodOwnerCoupon {
  id: string;
  code: string;
  description?: string | null;
  discount_pct: number;
  min_order_amount: number;
  valid_from?: string | null;
  valid_until?: string | null;
  max_uses?: number | null;
  per_phone_limit?: number | null;
  used_count: number;
  is_active: boolean;
  created_at: string;
}

export interface FoodStatusCount {
  status: string;
  count: number;
}

export interface FoodTopItem {
  name: string;
  quantity: number;
  revenue: number;
}

export interface FoodDailyPoint {
  date: string;
  orders: number;
  revenue: number;
}

/** A guest's rating on the dashboard's recent list. */
export interface FoodFeedbackRow {
  order_no: string;
  customer_name: string;
  rating: number;
  comment: string;
  images: string[];
  submitted_at: string;
}

/** One venue's food numbers over the picked period. */
export interface FoodOwnerStats {
  days: number;
  currency_symbol: string;
  orders: number;
  revenue: number;
  average_order: number;
  discount_given: number;
  coupon_orders: number;
  served: number;
  cancelled: number;
  refunded: number;
  invoice_downloads: number;
  subscribe_opt_ins: number;
  subscribers: number;
  page_scans: number;
  table_scans: number;
  feedback_count: number;
  average_rating: number;
  status_counts: FoodStatusCount[];
  top_items: FoodTopItem[];
  daily: FoodDailyPoint[];
  recent_feedback: FoodFeedbackRow[];
}

/** A page of a server-driven table, as `venueFoodOrdersTable` / `venueFoodCouponsTable` answer. */
export interface FoodTablePage<T> {
  total: number;
  rows: T[];
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

const ORDER_FIELDS = `
  id
  order_no
  customer_name
  customer_phone
  table_label
  note
  items { item_id name diet unit_price quantity line_total }
  subtotal
  discount_pct
  discount_amount
  coupon_code
  coupon_pct
  coupon_discount_amount
  total
  currency_symbol
  status
  payment_status
  cancel_reason
  created_at
  venue_gstin
  invoice_available
  subscribe_events
  feedback { rating comment images submitted_at }
`;

const COUPON_FIELDS = `
  id
  code
  description
  discount_pct
  min_order_amount
  valid_from
  valid_until
  max_uses
  per_phone_limit
  used_count
  is_active
  created_at
`;

/** The signed-in owner's venues for the picker, with whether each serves food. */
export const FOOD_OWNER_VENUES_QUERY = /* GraphQL */ `
  query VenueFoodOrderVenues {
    myVenues {
      id
      venue_name
      city
      status
      offers_food
    }
  }
`;

/** One venue's food dashboard. `days` 0 is all time. */
export const VENUE_FOOD_STATS_QUERY = /* GraphQL */ `
  query VenueFoodStats($venue_id: ID!, $days: Int) {
    venueFoodStats(venue_id: $venue_id, days: $days) {
      days
      currency_symbol
      orders
      revenue
      average_order
      discount_given
      coupon_orders
      served
      cancelled
      refunded
      invoice_downloads
      subscribe_opt_ins
      subscribers
      page_scans
      table_scans
      feedback_count
      average_rating
      status_counts { status count }
      top_items { name quantity revenue }
      daily { date orders revenue }
      recent_feedback { order_no customer_name rating comment images submitted_at }
    }
  }
`;

/** One venue's paid (or refunded) food orders, a server-side page at a time. */
export const VENUE_FOOD_ORDERS_TABLE_QUERY = /* GraphQL */ `
  query VenueFoodOrdersTable($venue_id: ID!, $query: TableQueryInput) {
    venueFoodOrdersTable(venue_id: $venue_id, query: $query) {
      total
      rows { ${ORDER_FIELDS} }
    }
  }
`;

export const SET_VENUE_FOOD_ORDER_STATUS_MUTATION = /* GraphQL */ `
  mutation SetVenueFoodOrderStatus($order_id: ID!, $status: VenueFoodOrderStatus!) {
    setVenueFoodOrderStatus(order_id: $order_id, status: $status) { ${ORDER_FIELDS} }
  }
`;

/** Cancel a paid order and refund it in full — one write on the server, so a retry cannot refund twice. */
export const CANCEL_VENUE_FOOD_ORDER_MUTATION = /* GraphQL */ `
  mutation CancelVenueFoodOrder($order_id: ID!, $reason: String!) {
    cancelVenueFoodOrder(order_id: $order_id, reason: $reason) { ${ORDER_FIELDS} }
  }
`;

export const VENUE_FOOD_COUPONS_TABLE_QUERY = /* GraphQL */ `
  query VenueFoodCouponsTable($venue_id: ID!, $query: TableQueryInput) {
    venueFoodCouponsTable(venue_id: $venue_id, query: $query) {
      total
      rows { ${COUPON_FIELDS} }
    }
  }
`;

export const CREATE_VENUE_FOOD_COUPON_MUTATION = /* GraphQL */ `
  mutation CreateVenueFoodCoupon($input: CreateVenueFoodCouponInput!) {
    createVenueFoodCoupon(input: $input) { ${COUPON_FIELDS} }
  }
`;

export const UPDATE_VENUE_FOOD_COUPON_MUTATION = /* GraphQL */ `
  mutation UpdateVenueFoodCoupon($coupon_id: ID!, $input: UpdateVenueFoodCouponInput!) {
    updateVenueFoodCoupon(coupon_id: $coupon_id, input: $input) { ${COUPON_FIELDS} }
  }
`;

export const SET_VENUE_FOOD_COUPON_ACTIVE_MUTATION = /* GraphQL */ `
  mutation SetVenueFoodCouponActive($coupon_id: ID!, $is_active: Boolean!) {
    setVenueFoodCouponActive(coupon_id: $coupon_id, is_active: $is_active) { ${COUPON_FIELDS} }
  }
`;

export const DELETE_VENUE_FOOD_COUPON_MUTATION = /* GraphQL */ `
  mutation DeleteVenueFoodCoupon($coupon_id: ID!) {
    deleteVenueFoodCoupon(coupon_id: $coupon_id)
  }
`;

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

/** How often an open board asks again, so a newly paid order shows up unprompted. */
export const FOOD_ORDERS_POLL_MS = 20_000;

/** Every status an order can be in, in kitchen order, cancelled last. */
export const FOOD_OWNER_ORDER_STATUSES: readonly VenueFoodOrderStatus[] = [...FOOD_ORDER_FLOW, 'CANCELLED'];

/** Only paid and refunded orders reach the board. */
export const FOOD_BOARD_PAYMENT_STATUSES: readonly VenueFoodPaymentStatus[] = ['PAID', 'REFUND_PENDING', 'REFUNDED'];

export const FOOD_ORDER_STATUS_COLORS: Readonly<Record<VenueFoodOrderStatus, FoodChipColor>> = {
  PLACED: 'warning',
  ACCEPTED: 'info',
  PREPARING: 'info',
  READY: 'primary',
  SERVED: 'success',
  CANCELLED: 'error',
};

export const FOOD_PAYMENT_STATUS_COLORS: Readonly<Record<VenueFoodPaymentStatus, FoodChipColor>> = {
  PENDING: 'warning',
  PAID: 'success',
  FAILED: 'error',
  REFUND_PENDING: 'warning',
  REFUNDED: 'default',
};

/** The step after `status` along the kitchen's path, or null once served or cancelled. */
export function nextFoodOrderStatus(status: VenueFoodOrderStatus): VenueFoodOrderStatus | null {
  const index = FOOD_ORDER_FLOW.indexOf(status);
  // Past the end (SERVED) or off the path (CANCELLED) there is no next step.
  return index >= 0 ? (FOOD_ORDER_FLOW[index + 1] ?? null) : null;
}

/** The move the board offers for an order: only a paid one moves along the kitchen's path. */
export const foodOrderNextStep = (
  order: Pick<FoodOwnerOrder, 'status' | 'payment_status'>,
): VenueFoodOrderStatus | null => (order.payment_status === 'PAID' ? nextFoodOrderStatus(order.status) : null);

/** The server refuses a cancel once the food is served or the order is already off. */
export const canCancelFoodOrder = (order: Pick<FoodOwnerOrder, 'status' | 'payment_status'>): boolean =>
  order.payment_status === 'PAID' && order.status !== 'SERVED' && order.status !== 'CANCELLED';

// Every key written out once, as a literal: the translation gate reads source for them.
const ORDER_STATUS_KEYS: Readonly<Record<string, string>> = {
  PLACED: 'venueFoodOwner.orders.status.PLACED',
  ACCEPTED: 'venueFoodOwner.orders.status.ACCEPTED',
  PREPARING: 'venueFoodOwner.orders.status.PREPARING',
  READY: 'venueFoodOwner.orders.status.READY',
  SERVED: 'venueFoodOwner.orders.status.SERVED',
  CANCELLED: 'venueFoodOwner.orders.status.CANCELLED',
};

const PAYMENT_STATUS_KEYS: Readonly<Record<string, string>> = {
  PENDING: 'venueFoodOwner.orders.payment.PENDING',
  PAID: 'venueFoodOwner.orders.payment.PAID',
  FAILED: 'venueFoodOwner.orders.payment.FAILED',
  REFUND_PENDING: 'venueFoodOwner.orders.payment.REFUND_PENDING',
  REFUNDED: 'venueFoodOwner.orders.payment.REFUNDED',
};

const ADVANCE_KEYS: Readonly<Record<string, string>> = {
  ACCEPTED: 'venueFoodOwner.orders.advance.ACCEPTED',
  PREPARING: 'venueFoodOwner.orders.advance.PREPARING',
  READY: 'venueFoodOwner.orders.advance.READY',
  SERVED: 'venueFoodOwner.orders.advance.SERVED',
};

const DIET_KEYS: Readonly<Record<string, string>> = {
  VEG: 'venueFoodOwner.diet.VEG',
  NON_VEG: 'venueFoodOwner.diet.NON_VEG',
  EGG: 'venueFoodOwner.diet.EGG',
  VEGAN: 'venueFoodOwner.diet.VEGAN',
};

const SPICE_KEYS: Readonly<Record<string, string>> = {
  NONE: 'venueFoodOwner.spice.NONE',
  MILD: 'venueFoodOwner.spice.MILD',
  MEDIUM: 'venueFoodOwner.spice.MEDIUM',
  HOT: 'venueFoodOwner.spice.HOT',
  EXTRA_HOT: 'venueFoodOwner.spice.EXTRA_HOT',
};

/** `value`'s words from `keys`; a value this build does not know reads as itself. */
const labelOf = (t: FoodOwnerTranslate, keys: Readonly<Record<string, string>>, value: string): string => {
  const key: string | undefined = keys[value];
  return key ? t(key) : value;
};

/** An order status in words. */
export const foodOrderStatusLabel = (t: FoodOwnerTranslate, status: string): string =>
  labelOf(t, ORDER_STATUS_KEYS, status);

export const foodPaymentStatusLabel = (t: FoodOwnerTranslate, status: string): string =>
  labelOf(t, PAYMENT_STATUS_KEYS, status);

/** What the "next step" button says for the status it moves the order TO. */
export const foodOrderAdvanceLabel = (t: FoodOwnerTranslate, next: VenueFoodOrderStatus): string => {
  const key: string | undefined = ADVANCE_KEYS[next];
  return key ? t(key) : foodOrderStatusLabel(t, next);
};

export const foodDietLabel = (t: FoodOwnerTranslate, diet: VenueFoodDiet | string): string =>
  labelOf(t, DIET_KEYS, diet);

/** A dish's spice level in words — what the menu editor's select offers on every surface. */
export const foodSpiceLabel = (t: FoodOwnerTranslate, level: string): string =>
  labelOf(t, SPICE_KEYS, level);

/** An amount in the order's own currency, as the server stamped it. */
export const foodOrderMoney = (order: Pick<FoodOwnerOrder, 'currency_symbol'>, amount: number): string =>
  formatMoney(amount, { symbol: order.currency_symbol, decimals: 2 });

/** "2 × Masala dosa, 1 × Filter coffee". */
export const foodItemsSummary = (t: FoodOwnerTranslate, order: Pick<FoodOwnerOrder, 'items'>): string =>
  order.items
    .map((line) => t('venueFoodOwner.orders.itemLine', { vars: { qty: line.quantity, name: line.name } }))
    .join(', ');

/** The success line after a cancel — whether the refund already landed or is on its way. */
export const foodOrderCancelledMessage = (
  t: FoodOwnerTranslate,
  order: Pick<FoodOwnerOrder, 'order_no' | 'payment_status'>,
): string =>
  order.payment_status === 'REFUNDED'
    ? t('venueFoodOwner.orders.cancelledRefunded', { vars: { no: order.order_no } })
    : t('venueFoodOwner.orders.cancelledRefundPending', { vars: { no: order.order_no } });

/** A label/value pair of an order's money breakdown. */
export interface FoodOrderMoneyLine {
  key: 'subtotal' | 'discount' | 'coupon' | 'total';
  label: string;
  value: string;
}

/** How the order's total was reached: subtotal, the QR discount and the coupon when any, then the total. */
export function foodOrderMoneyLines(t: FoodOwnerTranslate, order: FoodOwnerOrder): FoodOrderMoneyLine[] {
  const money = (amount: number) => foodOrderMoney(order, amount);
  const off = (amount: number) => t('venueFoodOwner.orders.discountValue', { vars: { amount: money(amount) } });
  const lines: FoodOrderMoneyLine[] = [
    { key: 'subtotal', label: t('venueFoodOwner.orders.subtotal'), value: money(order.subtotal) },
  ];
  if (order.discount_amount > 0) {
    lines.push({
      key: 'discount',
      label: t('venueFoodOwner.orders.discount', { vars: { pct: order.discount_pct } }),
      value: off(order.discount_amount),
    });
  }
  if (order.coupon_code) {
    lines.push({
      key: 'coupon',
      label: t('venueFoodOwner.orders.coupon', { vars: { code: order.coupon_code, pct: order.coupon_pct ?? 0 } }),
      value: off(order.coupon_discount_amount ?? 0),
    });
  }
  lines.push({ key: 'total', label: t('venueFoodOwner.orders.colTotal'), value: money(order.total) });
  return lines;
}

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

/** How many paid orders used the code, against its cap when it has one. */
export const foodCouponUsesText = (
  t: FoodOwnerTranslate,
  coupon: Pick<FoodOwnerCoupon, 'used_count' | 'max_uses'>,
): string =>
  coupon.max_uses === null || coupon.max_uses === undefined
    ? t('venueFoodOwner.coupons.usesNoLimit', { vars: { used: coupon.used_count } })
    : t('venueFoodOwner.coupons.usesOf', { vars: { used: coupon.used_count, max: coupon.max_uses } });

export const foodCouponMinOrderText = (t: FoodOwnerTranslate, coupon: Pick<FoodOwnerCoupon, 'min_order_amount'>): string =>
  coupon.min_order_amount > 0
    ? formatMoney(coupon.min_order_amount, { decimals: 2 })
    : t('venueFoodOwner.coupons.noMinimum');

export const foodCouponPerPersonText = (
  t: FoodOwnerTranslate,
  coupon: Pick<FoodOwnerCoupon, 'per_phone_limit'>,
): string =>
  coupon.per_phone_limit === null || coupon.per_phone_limit === undefined
    ? t('venueFoodOwner.coupons.noLimit')
    : String(coupon.per_phone_limit);

/** Each end of the coupon's window in words, `format` drawing a set date the surface's configured way. */
export function foodCouponWindow(
  t: FoodOwnerTranslate,
  coupon: Pick<FoodOwnerCoupon, 'valid_from' | 'valid_until'>,
  format: (iso: string) => string,
): { from: string; until: string } {
  return {
    from: (coupon.valid_from && format(coupon.valid_from)) || t('venueFoodOwner.coupons.noStart'),
    until: (coupon.valid_until && format(coupon.valid_until)) || t('venueFoodOwner.coupons.noEnd'),
  };
}

/** The line after a coupon's switch was answered. */
export const foodCouponToggledMessage = (t: FoodOwnerTranslate, code: string, active: boolean): string =>
  active
    ? t('venueFoodOwner.coupons.activated', { vars: { code } })
    : t('venueFoodOwner.coupons.deactivated', { vars: { code } });

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

/** The period the dashboard opens on: the second choice, the last 30 days. */
export const FOOD_DASHBOARD_DEFAULT_DAYS: number = PUBLIC_PAGE_RANGES[1].days;

export interface FoodStatTile {
  key: string;
  label: string;
  value: string;
  hint?: string;
}

/** The dashboard's tiles, in reading order: sales first, then service, then reach. */
export function foodStatTiles(stats: FoodOwnerStats, t: FoodOwnerTranslate): FoodStatTile[] {
  const money = (amount: number) => formatFoodMoney(amount, stats.currency_symbol);
  const count = formatCount;
  const rated = stats.feedback_count > 0;
  const rating = rated
    ? {
        value: t('venueFoodOwner.dashboard.ratingValue', { vars: { rating: formatRating(stats.average_rating) } }),
        hint: t('venueFoodOwner.dashboard.ratingCount', { vars: { count: count(stats.feedback_count) } }),
      }
    : { value: t('venueFoodOwner.dashboard.none'), hint: t('venueFoodOwner.dashboard.noRatings') };
  return [
    {
      key: 'orders',
      label: t('venueFoodOwner.dashboard.orders'),
      value: count(stats.orders),
      hint: t('venueFoodOwner.dashboard.ordersHint'),
    },
    {
      key: 'revenue',
      label: t('venueFoodOwner.dashboard.revenue'),
      value: money(stats.revenue),
      hint: t('venueFoodOwner.dashboard.revenueHint'),
    },
    { key: 'average-order', label: t('venueFoodOwner.dashboard.averageOrder'), value: money(stats.average_order) },
    { key: 'served', label: t('venueFoodOwner.dashboard.served'), value: count(stats.served) },
    {
      key: 'cancelled',
      label: t('venueFoodOwner.dashboard.cancelled'),
      value: count(stats.cancelled),
      hint: t('venueFoodOwner.dashboard.cancelledHint', { vars: { amount: money(stats.refunded) } }),
    },
    {
      key: 'discounts',
      label: t('venueFoodOwner.dashboard.discounts'),
      value: money(stats.discount_given),
      hint: t('venueFoodOwner.dashboard.discountsHint'),
    },
    {
      key: 'coupon-orders',
      label: t('venueFoodOwner.dashboard.couponOrders'),
      value: count(stats.coupon_orders),
      hint: t('venueFoodOwner.dashboard.couponOrdersHint'),
    },
    { key: 'rating', label: t('venueFoodOwner.dashboard.rating'), ...rating },
    {
      key: 'subscribers',
      label: t('venueFoodOwner.dashboard.subscribers'),
      value: count(stats.subscribers),
      hint: t('venueFoodOwner.dashboard.subscribersHint', { vars: { count: count(stats.subscribe_opt_ins) } }),
    },
    {
      key: 'poster-scans',
      label: t('venueFoodOwner.dashboard.posterScans'),
      value: count(stats.page_scans),
      hint: t('venueFoodOwner.dashboard.posterScansHint'),
    },
    {
      key: 'table-scans',
      label: t('venueFoodOwner.dashboard.tableScans'),
      value: count(stats.table_scans),
      hint: t('venueFoodOwner.dashboard.tableScansHint'),
    },
    {
      key: 'invoice-downloads',
      label: t('venueFoodOwner.dashboard.invoiceDownloads'),
      value: count(stats.invoice_downloads),
    },
  ];
}

/** `value` as a 0–100 share of `whole`, safe when the whole is nothing. */
export const barPercent = (value: number, whole: number): number =>
  whole > 0 ? Math.min(100, Math.max(0, (value / whole) * 100)) : 0;

export interface FoodStatusBar {
  status: VenueFoodOrderStatus;
  count: number;
  /** The status's share of every order in the period. */
  percent: number;
}

/** Every order status in kitchen order, each with its share — a status with no orders keeps its row at zero. */
export function foodStatusBars(stats: Pick<FoodOwnerStats, 'status_counts'>): FoodStatusBar[] {
  const counts = new Map(stats.status_counts.map((row) => [row.status, row.count]));
  const total = stats.status_counts.reduce((sum, row) => sum + row.count, 0);
  return FOOD_OWNER_ORDER_STATUSES.map((status) => {
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

/** A dish bar's figure: how many sold and what they earned. */
export const foodDishLine = (t: FoodOwnerTranslate, dish: FoodTopItem, currencySymbol: string): string =>
  t('venueFoodOwner.dashboard.dishLine', {
    vars: { qty: formatCount(dish.quantity), revenue: formatFoodMoney(dish.revenue, currencySymbol) },
  });

/** Who rated which order — "Asha · Order F-1001", or "Guest" when the name was left out. */
export const foodFeedbackByLine = (t: FoodOwnerTranslate, row: Pick<FoodFeedbackRow, 'customer_name' | 'order_no'>): string =>
  t('venueFoodOwner.dashboard.feedbackBy', {
    vars: { name: row.customer_name || t('venueFoodOwner.dashboard.guest'), no: row.order_no },
  });

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
