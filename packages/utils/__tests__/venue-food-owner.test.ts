import { describe, expect, it } from 'vitest';
import {
  barPercent,
  canCancelFoodOrder,
  CANCEL_VENUE_FOOD_ORDER_MUTATION,
  CREATE_VENUE_FOOD_COUPON_MUTATION,
  DELETE_VENUE_FOOD_COUPON_MUTATION,
  FOOD_DASHBOARD_DEFAULT_DAYS,
  FOOD_ORDER_STATUS_COLORS,
  FOOD_OWNER_ORDER_STATUSES,
  FOOD_OWNER_VENUES_QUERY,
  FOOD_PAYMENT_STATUS_COLORS,
  foodCouponMinOrderText,
  foodCouponPerPersonText,
  foodCouponToggledMessage,
  foodCouponUsesText,
  foodCouponWindow,
  foodDietLabel,
  foodDishBars,
  foodDishLine,
  foodFeedbackByLine,
  foodItemsSummary,
  foodOrderAdvanceLabel,
  foodOrderCancelledMessage,
  foodOrderMoney,
  foodOrderMoneyLines,
  foodOrderNextStep,
  foodOrderStatusLabel,
  foodPaymentStatusLabel,
  foodSpiceLabel,
  foodStatTiles,
  foodStatusBars,
  foodTrendLine,
  nextFoodOrderStatus,
  SET_VENUE_FOOD_COUPON_ACTIVE_MUTATION,
  SET_VENUE_FOOD_ORDER_STATUS_MUTATION,
  UPDATE_VENUE_FOOD_COUPON_MUTATION,
  VENUE_FOOD_COUPONS_TABLE_QUERY,
  VENUE_FOOD_ORDERS_TABLE_QUERY,
  VENUE_FOOD_STATS_QUERY,
  type FoodOwnerOrder,
  type FoodOwnerStats,
} from '../src/venue-food-owner';

// The key with its variables, so a test reads exactly which sentence was asked for.
const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key} ${JSON.stringify(options.vars)}` : key;

const order = (over: Partial<FoodOwnerOrder> = {}): FoodOwnerOrder => ({
  id: 'o1',
  order_no: 'F-1001',
  customer_name: 'Asha',
  customer_phone: '9876543210',
  table_label: 'T4',
  note: '',
  items: [
    { item_id: 'i1', name: 'Masala dosa', diet: 'VEG', unit_price: 120, quantity: 2, line_total: 240 },
    { item_id: 'i2', name: 'Filter coffee', diet: 'VEG', unit_price: 40, quantity: 1, line_total: 40 },
  ],
  subtotal: 280,
  discount_pct: 0,
  discount_amount: 0,
  coupon_code: null,
  coupon_pct: 0,
  coupon_discount_amount: 0,
  total: 280,
  currency_symbol: '₹',
  status: 'PLACED',
  payment_status: 'PAID',
  cancel_reason: '',
  created_at: '2026-10-01T10:00:00.000Z',
  feedback: null,
  ...over,
});

const stats = (over: Partial<FoodOwnerStats> = {}): FoodOwnerStats => ({
  days: 30,
  currency_symbol: '₹',
  orders: 12,
  revenue: 4520.5,
  average_order: 376.71,
  discount_given: 300,
  coupon_orders: 3,
  served: 9,
  cancelled: 1,
  refunded: 250,
  invoice_downloads: 4,
  subscribe_opt_ins: 5,
  subscribers: 20,
  page_scans: 40,
  table_scans: 18,
  feedback_count: 6,
  average_rating: 4.33,
  status_counts: [],
  top_items: [],
  daily: [],
  recent_feedback: [],
  ...over,
});

describe('the food desk documents', () => {
  it('each name the operation the server answers, with balanced selections', () => {
    const names = [
      FOOD_OWNER_VENUES_QUERY,
      VENUE_FOOD_STATS_QUERY,
      VENUE_FOOD_ORDERS_TABLE_QUERY,
      SET_VENUE_FOOD_ORDER_STATUS_MUTATION,
      CANCEL_VENUE_FOOD_ORDER_MUTATION,
      VENUE_FOOD_COUPONS_TABLE_QUERY,
      CREATE_VENUE_FOOD_COUPON_MUTATION,
      UPDATE_VENUE_FOOD_COUPON_MUTATION,
      SET_VENUE_FOOD_COUPON_ACTIVE_MUTATION,
      DELETE_VENUE_FOOD_COUPON_MUTATION,
    ].map((doc) => {
      // Every brace a selection opens is closed — an interpolated field list cannot leave one dangling.
      expect(doc.split('{').length).toBe(doc.split('}').length);
      return /^\s*(?:query|mutation) (\w+)/.exec(doc)?.[1];
    });
    expect(names).toEqual([
      'VenueFoodOrderVenues',
      'VenueFoodStats',
      'VenueFoodOrdersTable',
      'SetVenueFoodOrderStatus',
      'CancelVenueFoodOrder',
      'VenueFoodCouponsTable',
      'CreateVenueFoodCoupon',
      'UpdateVenueFoodCoupon',
      'SetVenueFoodCouponActive',
      'DeleteVenueFoodCoupon',
    ]);
  });

  it('select the same order and coupon fields on every read and write', () => {
    for (const doc of [VENUE_FOOD_ORDERS_TABLE_QUERY, SET_VENUE_FOOD_ORDER_STATUS_MUTATION, CANCEL_VENUE_FOOD_ORDER_MUTATION]) {
      expect(doc).toContain('feedback { rating comment images submitted_at }');
      expect(doc).toContain('payment_status');
    }
    for (const doc of [VENUE_FOOD_COUPONS_TABLE_QUERY, CREATE_VENUE_FOOD_COUPON_MUTATION, UPDATE_VENUE_FOOD_COUPON_MUTATION]) {
      expect(doc).toContain('per_phone_limit');
      expect(doc).toContain('used_count');
    }
  });
});

describe('the kitchen flow', () => {
  it('moves an order one step at a time and stops once served or cancelled', () => {
    expect(nextFoodOrderStatus('PLACED')).toBe('ACCEPTED');
    expect(nextFoodOrderStatus('ACCEPTED')).toBe('PREPARING');
    expect(nextFoodOrderStatus('PREPARING')).toBe('READY');
    expect(nextFoodOrderStatus('READY')).toBe('SERVED');
    expect(nextFoodOrderStatus('SERVED')).toBeNull();
    expect(nextFoodOrderStatus('CANCELLED')).toBeNull();
  });

  it('offers a next step only on a paid order', () => {
    expect(foodOrderNextStep({ status: 'PLACED', payment_status: 'PAID' })).toBe('ACCEPTED');
    expect(foodOrderNextStep({ status: 'PLACED', payment_status: 'REFUND_PENDING' })).toBeNull();
    expect(foodOrderNextStep({ status: 'READY', payment_status: 'REFUNDED' })).toBeNull();
  });

  it('allows a cancel only while the paid food is not served or already off', () => {
    expect(canCancelFoodOrder({ status: 'PREPARING', payment_status: 'PAID' })).toBe(true);
    expect(canCancelFoodOrder({ status: 'SERVED', payment_status: 'PAID' })).toBe(false);
    expect(canCancelFoodOrder({ status: 'CANCELLED', payment_status: 'PAID' })).toBe(false);
    expect(canCancelFoodOrder({ status: 'PLACED', payment_status: 'REFUNDED' })).toBe(false);
  });

  it('lists every status in kitchen order with cancelled last, each with a chip colour', () => {
    expect(FOOD_OWNER_ORDER_STATUSES).toEqual(['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED']);
    expect(FOOD_OWNER_ORDER_STATUSES.map((status) => FOOD_ORDER_STATUS_COLORS[status])).toEqual([
      'warning',
      'info',
      'info',
      'primary',
      'success',
      'error',
    ]);
    expect(FOOD_PAYMENT_STATUS_COLORS.REFUNDED).toBe('default');
  });
});

describe('order labels', () => {
  it('names each status, payment and diet, and leaves an unknown value as it came', () => {
    expect(foodOrderStatusLabel(t, 'READY')).toBe('venueFoodOwner.orders.status.READY');
    expect(foodOrderStatusLabel(t, 'ON_HOLD')).toBe('ON_HOLD');
    expect(foodPaymentStatusLabel(t, 'REFUND_PENDING')).toBe('venueFoodOwner.orders.payment.REFUND_PENDING');
    expect(foodPaymentStatusLabel(t, 'CHARGEBACK')).toBe('CHARGEBACK');
    expect(foodDietLabel(t, 'NON_VEG')).toBe('venueFoodOwner.diet.NON_VEG');
    expect(foodDietLabel(t, 'JAIN')).toBe('JAIN');
    expect(foodSpiceLabel(t, 'EXTRA_HOT')).toBe('venueFoodOwner.spice.EXTRA_HOT');
    expect(foodSpiceLabel(t, 'GHOST_PEPPER')).toBe('GHOST_PEPPER');
  });

  it('words the next-step button by where it moves the order', () => {
    expect(foodOrderAdvanceLabel(t, 'ACCEPTED')).toBe('venueFoodOwner.orders.advance.ACCEPTED');
    expect(foodOrderAdvanceLabel(t, 'SERVED')).toBe('venueFoodOwner.orders.advance.SERVED');
    // No button moves an order back to Placed; the status's own name stands in.
    expect(foodOrderAdvanceLabel(t, 'PLACED')).toBe('venueFoodOwner.orders.status.PLACED');
  });

  it('summarises the dishes and prices in the order’s own currency', () => {
    expect(foodItemsSummary(t, order())).toBe(
      'venueFoodOwner.orders.itemLine {"qty":2,"name":"Masala dosa"}, venueFoodOwner.orders.itemLine {"qty":1,"name":"Filter coffee"}',
    );
    expect(foodOrderMoney({ currency_symbol: '$' }, 12.5)).toBe('$12.50');
  });

  it('says whether the refund has landed or is on its way', () => {
    expect(foodOrderCancelledMessage(t, { order_no: 'F-1', payment_status: 'REFUNDED' })).toBe(
      'venueFoodOwner.orders.cancelledRefunded {"no":"F-1"}',
    );
    expect(foodOrderCancelledMessage(t, { order_no: 'F-1', payment_status: 'REFUND_PENDING' })).toBe(
      'venueFoodOwner.orders.cancelledRefundPending {"no":"F-1"}',
    );
  });
});

describe('foodOrderMoneyLines', () => {
  it('is the subtotal and the total when nothing was taken off', () => {
    expect(foodOrderMoneyLines(t, order()).map((line) => line.key)).toEqual(['subtotal', 'total']);
  });

  it('adds the QR discount and the coupon, each with what it took off', () => {
    const lines = foodOrderMoneyLines(
      t,
      order({ discount_pct: 10, discount_amount: 28, coupon_code: 'WELCOME10', coupon_pct: 5, coupon_discount_amount: 12.6, total: 239.4 }),
    );
    expect(lines).toEqual([
      { key: 'subtotal', label: 'venueFoodOwner.orders.subtotal', value: '₹280.00' },
      {
        key: 'discount',
        label: 'venueFoodOwner.orders.discount {"pct":10}',
        value: 'venueFoodOwner.orders.discountValue {"amount":"₹28.00"}',
      },
      {
        key: 'coupon',
        label: 'venueFoodOwner.orders.coupon {"code":"WELCOME10","pct":5}',
        value: 'venueFoodOwner.orders.discountValue {"amount":"₹12.60"}',
      },
      { key: 'total', label: 'venueFoodOwner.orders.colTotal', value: '₹239.40' },
    ]);
  });

  it('reads a coupon from an older answer without its percent or amount as zero', () => {
    const lines = foodOrderMoneyLines(t, order({ coupon_code: 'OLD', coupon_pct: null, coupon_discount_amount: undefined }));
    expect(lines[1]).toEqual({
      key: 'coupon',
      label: 'venueFoodOwner.orders.coupon {"code":"OLD","pct":0}',
      value: 'venueFoodOwner.orders.discountValue {"amount":"₹0.00"}',
    });
  });
});

describe('coupon labels', () => {
  it('counts uses against the cap, or says there is none', () => {
    expect(foodCouponUsesText(t, { used_count: 7, max_uses: 100 })).toBe('venueFoodOwner.coupons.usesOf {"used":7,"max":100}');
    expect(foodCouponUsesText(t, { used_count: 0, max_uses: null })).toBe('venueFoodOwner.coupons.usesNoLimit {"used":0}');
    expect(foodCouponUsesText(t, { used_count: 3 })).toBe('venueFoodOwner.coupons.usesNoLimit {"used":3}');
  });

  it('shows a minimum as money and no minimum in words', () => {
    expect(foodCouponMinOrderText(t, { min_order_amount: 200 })).toBe('₹200.00');
    expect(foodCouponMinOrderText(t, { min_order_amount: 0 })).toBe('venueFoodOwner.coupons.noMinimum');
  });

  it('shows the per-person limit or no limit', () => {
    expect(foodCouponPerPersonText(t, { per_phone_limit: 2 })).toBe('2');
    expect(foodCouponPerPersonText(t, { per_phone_limit: null })).toBe('venueFoodOwner.coupons.noLimit');
    expect(foodCouponPerPersonText(t, {})).toBe('venueFoodOwner.coupons.noLimit');
  });

  it('draws each set end of the window with the surface’s formatter and an open end in words', () => {
    const format = (iso: string) => `fmt(${iso})`;
    expect(foodCouponWindow(t, { valid_from: '2026-10-01T00:00:00.000Z', valid_until: null }, format)).toEqual({
      from: 'fmt(2026-10-01T00:00:00.000Z)',
      until: 'venueFoodOwner.coupons.noEnd',
    });
    expect(foodCouponWindow(t, { valid_until: '2026-12-31T00:00:00.000Z' }, format)).toEqual({
      from: 'venueFoodOwner.coupons.noStart',
      until: 'fmt(2026-12-31T00:00:00.000Z)',
    });
    // A date the formatter cannot draw falls back to the open-end words rather than a blank cell.
    expect(foodCouponWindow(t, { valid_from: 'bad', valid_until: 'bad' }, () => '')).toEqual({
      from: 'venueFoodOwner.coupons.noStart',
      until: 'venueFoodOwner.coupons.noEnd',
    });
  });

  it('words the switch’s answer by where it landed', () => {
    expect(foodCouponToggledMessage(t, 'WELCOME10', true)).toBe('venueFoodOwner.coupons.activated {"code":"WELCOME10"}');
    expect(foodCouponToggledMessage(t, 'WELCOME10', false)).toBe('venueFoodOwner.coupons.deactivated {"code":"WELCOME10"}');
  });
});

describe('foodStatTiles', () => {
  it('lists sales, then service, then reach, in the venue’s currency', () => {
    const tiles = foodStatTiles(stats(), t);
    expect(tiles.map((tile) => tile.key)).toEqual([
      'orders',
      'revenue',
      'average-order',
      'served',
      'cancelled',
      'discounts',
      'coupon-orders',
      'rating',
      'subscribers',
      'poster-scans',
      'table-scans',
      'invoice-downloads',
    ]);
    const byKey = Object.fromEntries(tiles.map((tile) => [tile.key, tile]));
    expect(byKey.revenue.value).toBe('₹4,520.50');
    expect(byKey.cancelled.hint).toBe('venueFoodOwner.dashboard.cancelledHint {"amount":"₹250"}');
    expect(byKey.rating).toEqual({
      key: 'rating',
      label: 'venueFoodOwner.dashboard.rating',
      value: 'venueFoodOwner.dashboard.ratingValue {"rating":"4.3"}',
      hint: 'venueFoodOwner.dashboard.ratingCount {"count":"6"}',
    });
    expect(byKey.subscribers.hint).toBe('venueFoodOwner.dashboard.subscribersHint {"count":"5"}');
    expect(byKey['invoice-downloads'].hint).toBeUndefined();
  });

  it('says there are no ratings yet rather than showing a zero average', () => {
    const rating = foodStatTiles(stats({ feedback_count: 0, average_rating: 0 }), t).find((tile) => tile.key === 'rating');
    expect(rating).toMatchObject({ value: 'venueFoodOwner.dashboard.none', hint: 'venueFoodOwner.dashboard.noRatings' });
  });

  it('opens on the last 30 days', () => {
    expect(FOOD_DASHBOARD_DEFAULT_DAYS).toBe(30);
  });
});

describe('the dashboard bars', () => {
  it('bounds a share between 0 and 100 and is 0 of nothing', () => {
    expect(barPercent(1, 4)).toBe(25);
    expect(barPercent(5, 4)).toBe(100);
    expect(barPercent(-1, 4)).toBe(0);
    expect(barPercent(3, 0)).toBe(0);
  });

  it('keeps a row for every status, zero when it had no orders', () => {
    const bars = foodStatusBars({
      status_counts: [
        { status: 'SERVED', count: 3 },
        { status: 'CANCELLED', count: 1 },
      ],
    });
    expect(bars.map((bar) => [bar.status, bar.count, bar.percent])).toEqual([
      ['PLACED', 0, 0],
      ['ACCEPTED', 0, 0],
      ['PREPARING', 0, 0],
      ['READY', 0, 0],
      ['SERVED', 3, 75],
      ['CANCELLED', 1, 25],
    ]);
  });

  it('scales each dish against the best seller and handles an empty list', () => {
    const dishes = foodDishBars([
      { name: 'Dosa', quantity: 8, revenue: 960 },
      { name: 'Coffee', quantity: 2, revenue: 80 },
    ]);
    expect(dishes.map((dish) => dish.percent)).toEqual([100, 25]);
    expect(foodDishBars([])).toEqual([]);
  });

  it('words a dish bar and a feedback byline, a nameless guest as Guest', () => {
    expect(foodDishLine(t, { name: 'Dosa', quantity: 8, revenue: 960 }, '₹')).toBe(
      'venueFoodOwner.dashboard.dishLine {"qty":"8","revenue":"₹960"}',
    );
    expect(foodFeedbackByLine(t, { customer_name: 'Asha', order_no: 'F-1' })).toBe(
      'venueFoodOwner.dashboard.feedbackBy {"name":"Asha","no":"F-1"}',
    );
    expect(foodFeedbackByLine(t, { customer_name: '', order_no: 'F-2' })).toBe(
      'venueFoodOwner.dashboard.feedbackBy {"name":"venueFoodOwner.dashboard.guest","no":"F-2"}',
    );
  });
});

describe('foodTrendLine', () => {
  const box = { width: 100, height: 50, pad: 5 };

  it('scales a series to its own peak across the full width', () => {
    const daily = [
      { date: '2026-10-01', orders: 0, revenue: 0 },
      { date: '2026-10-02', orders: 2, revenue: 500 },
      { date: '2026-10-03', orders: 4, revenue: 1000 },
    ];
    expect(foodTrendLine(daily, 'orders', box)).toBe('0.0,45.0 50.0,25.0 100.0,5.0');
    expect(foodTrendLine(daily, 'revenue', box)).toBe('0.0,45.0 50.0,25.0 100.0,5.0');
  });

  it('lays a flat series on the floor and a single day at the start', () => {
    expect(foodTrendLine([{ date: 'a', orders: 0, revenue: 0 }, { date: 'b', orders: 0, revenue: 0 }], 'orders', box)).toBe(
      '0.0,45.0 100.0,45.0',
    );
    expect(foodTrendLine([{ date: 'a', orders: 3, revenue: 9 }], 'orders', box)).toBe('0.0,5.0');
  });
});
