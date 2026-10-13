import { describe, expect, it, vi } from 'vitest';
import pricing from './fixtures/venue-food-pricing.json';
import {
  FOOD_COUPON_REJECTION_KEYS,
  FOOD_DIET_KEYS,
  FOOD_ORDER_CONFLICT_RETRY_MS,
  FOOD_ORDER_ERROR,
  FOOD_ORDER_FLOW,
  FOOD_ORDER_GENERIC_ERROR_KEY,
  FOOD_ORDER_LIMITS,
  FOOD_ORDER_POLL_MS,
  FOOD_ORDER_STATUS_KEYS,
  FOOD_PAYMENT_STATUS_KEYS,
  FOOD_SPICE_HEAT,
  FOOD_SPICE_KEYS,
  PLACE_VENUE_FOOD_ORDER_MUTATION,
  PREVIEW_VENUE_FOOD_COUPON_QUERY,
  VENUE_FOOD_ORDER_QUERY,
  VERIFY_VENUE_FOOD_ORDER_MUTATION,
  buildFoodOrderInput,
  buildFoodOrderTimeline,
  createFoodClientKey,
  foodAttemptKey,
  foodAttemptSignature,
  foodCartLines,
  foodCartSignature,
  foodCouponRejectionOf,
  foodOrderErrorCode,
  foodOrderErrorKey,
  foodOrderLineInputs,
  foodOrderPollMs,
  formatFoodMoney,
  groupFoodMenu,
  isFoodOrderFinished,
  isVegFood,
  normalizeFoodCouponCode,
  priceFoodCart,
  priceFoodCartLines,
  reconcileFoodCart,
  tryPlaceFoodOrder,
  type FoodCartQuantities,
  type VenueFoodCouponRejection,
  type VenueFoodDiet,
  type VenueFoodItem,
  type VenueFoodOrder,
  type VenueFoodOrderPlacement,
  type VenueFoodOrderStatus,
  type VenueFoodPaymentStatus,
  type VenueFoodSpiceLevel,
} from '../src/venue-food';

const dish = (over: Partial<VenueFoodItem> = {}): VenueFoodItem => ({
  id: 'dish_1',
  name: 'Paneer Tikka',
  description: 'Charred cottage cheese',
  category: 'Starters',
  price: 240,
  images: [],
  diet: 'VEG',
  spice_level: 'MEDIUM',
  is_available: true,
  ...over,
});

/** A cart exactly as it comes back out of storage — nothing has checked its values yet. */
const storedCart = (json: string): FoodCartQuantities => JSON.parse(json) as FoodCartQuantities;

/** A menu exactly as the wire delivered it, before any type has been trusted. */
const wireMenu = (json: string): VenueFoodItem[] => JSON.parse(json) as VenueFoodItem[];

const order = (over: Partial<VenueFoodOrder> = {}): VenueFoodOrder => ({
  id: 'order_1',
  order_no: 'F-1001',
  venue_id: 'venue_1',
  venue_name: 'Cafe Uno',
  customer_name: 'Asha',
  customer_phone: '9876543210',
  table_label: 'T4',
  note: '',
  items: [{ item_id: 'dish_1', name: 'Paneer Tikka', diet: 'VEG', unit_price: 240, quantity: 2, line_total: 480 }],
  subtotal: 480,
  discount_pct: 10,
  discount_amount: 48,
  total: 432,
  currency_symbol: '₹',
  status: 'PLACED',
  payment_status: 'PENDING',
  paid_at: null,
  cancelled_at: null,
  cancel_reason: '',
  created_at: '2026-10-12T12:00:00.000Z',
  ...over,
});

/** The first line of a document: the operation, its name and its variables. */
const operationOf = (doc: string): string => doc.trim().split('\n')[0].trim();

/** The field names one selection set asks for, a nested set counted by its own field name only. */
const selectionOf = (doc: string, field: string): string[] => {
  const head = new RegExp(String.raw`\b${field}\b[^{}]*\{`).exec(doc);
  if (!head) return [];
  let depth = 0;
  let inner = '';
  for (const ch of doc.slice(head.index + head[0].length - 1)) {
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    else if (depth === 1) inner += ch;
    if (depth === 0) break;
  }
  return inner.split(/\s+/).filter(Boolean);
};

const ORDER_FIELDS = [
  'id',
  'order_no',
  'venue_id',
  'venue_name',
  'customer_name',
  'customer_phone',
  'table_label',
  'note',
  'items',
  'subtotal',
  'discount_pct',
  'discount_amount',
  'coupon_code',
  'coupon_pct',
  'coupon_discount_amount',
  'total',
  'currency_symbol',
  'status',
  'payment_status',
  'paid_at',
  'cancelled_at',
  'cancel_reason',
  'created_at',
];
const LINE_FIELDS = ['item_id', 'name', 'diet', 'unit_price', 'quantity', 'line_total'];

describe('the food-order documents', () => {
  it('places an order through placeVenueFoodOrder and reads back the key, the order and the Razorpay sheet', () => {
    expect(operationOf(PLACE_VENUE_FOOD_ORDER_MUTATION)).toBe('mutation PlaceVenueFoodOrder($input: PlaceVenueFoodOrderInput!) {');
    expect(PLACE_VENUE_FOOD_ORDER_MUTATION).toContain('placeVenueFoodOrder(input: $input) {');
    expect(selectionOf(PLACE_VENUE_FOOD_ORDER_MUTATION, 'placeVenueFoodOrder')).toEqual(['access_key', 'order', 'razorpay']);
    expect(selectionOf(PLACE_VENUE_FOOD_ORDER_MUTATION, 'order')).toEqual(ORDER_FIELDS);
    expect(selectionOf(PLACE_VENUE_FOOD_ORDER_MUTATION, 'items')).toEqual(LINE_FIELDS);
    expect(selectionOf(PLACE_VENUE_FOOD_ORDER_MUTATION, 'razorpay')).toEqual([
      'key_id',
      'order_id',
      'amount',
      'currency',
      'name',
      'description',
      'prefill_contact',
    ]);
  });

  it('verifies a payment and asks only for what the order page updates from the answer', () => {
    expect(operationOf(VERIFY_VENUE_FOOD_ORDER_MUTATION)).toBe('mutation VerifyVenueFoodOrderPayment($input: VerifyVenueFoodOrderInput!) {');
    expect(VERIFY_VENUE_FOOD_ORDER_MUTATION).toContain('verifyVenueFoodOrderPayment(input: $input) {');
    expect(selectionOf(VERIFY_VENUE_FOOD_ORDER_MUTATION, 'verifyVenueFoodOrderPayment')).toEqual(['id', 'status', 'payment_status', 'paid_at']);
  });

  it('re-reads an order by its id and access key, which stays optional for a signed-in owner', () => {
    expect(operationOf(VENUE_FOOD_ORDER_QUERY)).toBe('query VenueFoodOrder($orderId: ID!, $accessKey: String) {');
    expect(VENUE_FOOD_ORDER_QUERY).toContain('venueFoodOrder(order_id: $orderId, access_key: $accessKey) {');
    expect(selectionOf(VENUE_FOOD_ORDER_QUERY, 'items')).toEqual(LINE_FIELDS);
  });

  // The page swaps the placed order for each polled one, so a field one
  // document asks for and the other does not would blank on the first poll.
  it('reads the same order fields when polling as when placing', () => {
    expect(selectionOf(VENUE_FOOD_ORDER_QUERY, 'venueFoodOrder')).toEqual(ORDER_FIELDS);
    expect(selectionOf(VENUE_FOOD_ORDER_QUERY, 'venueFoodOrder')).toEqual(selectionOf(PLACE_VENUE_FOOD_ORDER_MUTATION, 'order'));
  });

  it('previews a coupon through previewVenueFoodCoupon and reads back the verdict and every amount it prices', () => {
    expect(operationOf(PREVIEW_VENUE_FOOD_COUPON_QUERY)).toBe('query PreviewVenueFoodCoupon($input: PreviewVenueFoodCouponInput!) {');
    expect(PREVIEW_VENUE_FOOD_COUPON_QUERY).toContain('previewVenueFoodCoupon(input: $input) {');
    expect(selectionOf(PREVIEW_VENUE_FOOD_COUPON_QUERY, 'previewVenueFoodCoupon')).toEqual([
      'ok',
      'reason',
      'message',
      'coupon_code',
      'coupon_pct',
      'min_order_amount',
      'subtotal',
      'discount_pct',
      'discount_amount',
      'coupon_discount_amount',
      'total',
      'currency_symbol',
    ]);
  });

  it('closes every selection set it opens', () => {
    for (const doc of [
      PLACE_VENUE_FOOD_ORDER_MUTATION,
      VERIFY_VENUE_FOOD_ORDER_MUTATION,
      VENUE_FOOD_ORDER_QUERY,
      PREVIEW_VENUE_FOOD_COUPON_QUERY,
    ]) {
      expect(doc.split('{').length).toBe(doc.split('}').length);
    }
  });
});

describe('FOOD_ORDER_LIMITS', () => {
  it('mirrors the limits the server enforces', () => {
    expect(FOOD_ORDER_LIMITS).toEqual({
      maxLines: 30,
      maxQuantity: 20,
      nameMin: 2,
      nameMax: 80,
      phoneLength: 10,
      tableMax: 20,
      noteMax: 300,
      minTotalPaise: 100,
      maxDiscountPct: 90,
      couponCodeMin: 3,
      couponCodeMax: 30,
    });
  });
});

describe('priceFoodCart', () => {
  it('adds every line in paise and takes the discount off the subtotal', () => {
    expect(
      priceFoodCart(
        [
          { unit_price: 149.5, quantity: 3 },
          { unit_price: 80.25, quantity: 1 },
        ],
        10
      )
    ).toEqual({
      count: 4,
      subtotalPaise: 52875,
      discountPaise: 5287,
      couponPaise: 0,
      totalPaise: 47588,
      subtotal: 528.75,
      discount: 52.87,
      coupon: 0,
      total: 475.88,
      belowMinimum: false,
      couponUnmet: false,
    });
  });

  // 15% of ₹528.75 is ₹79.3125: the venue gives ₹79.31, never ₹79.32.
  it('rounds the discount DOWN to a paisa when the percentage does not divide evenly', () => {
    const price = priceFoodCart(
      [
        { unit_price: 149.5, quantity: 3 },
        { unit_price: 80.25, quantity: 1 },
      ],
      15
    );
    expect(price.discountPaise).toBe(7931);
    expect(price.totalPaise).toBe(44944);
    expect(price.discount).toBe(79.31);
    expect(price.total).toBe(449.44);
    // 12.5% of 333 paise is 41.625 paise.
    expect(priceFoodCart([{ unit_price: 3.33, quantity: 1 }], 12.5)).toMatchObject({ discountPaise: 41, totalPaise: 292 });
    // 1% of 199 paise is 1.99 paise — still one paisa, not two.
    expect(priceFoodCart([{ unit_price: 1.99, quantity: 1 }], 1)).toMatchObject({ discountPaise: 1, totalPaise: 198 });
  });

  // 19.99 * 100 is 1998.9999999999998 in floating point; the line must still be 1999 paise.
  it('converts a price to whole paise before multiplying, so float error never reaches the total', () => {
    expect(priceFoodCart([{ unit_price: 19.99, quantity: 3 }], 0)).toMatchObject({ subtotalPaise: 5997, subtotal: 59.97, total: 59.97 });
    expect(priceFoodCart([{ unit_price: 0.1, quantity: 3 }], 0).subtotalPaise).toBe(30);
  });

  it('charges the full subtotal at 0% and nothing at 100%', () => {
    const lines = [{ unit_price: 240, quantity: 2 }];
    expect(priceFoodCart(lines, 0)).toMatchObject({ subtotalPaise: 48000, discountPaise: 0, totalPaise: 48000, total: 480, belowMinimum: false });
    expect(priceFoodCart(lines, 100)).toMatchObject({ subtotalPaise: 48000, discountPaise: 48000, totalPaise: 0, total: 0, belowMinimum: true });
  });

  it('reads a negative or unreadable discount as no discount', () => {
    const lines = [{ unit_price: 240, quantity: 2 }];
    expect(priceFoodCart(lines, -10)).toMatchObject({ discountPaise: 0, totalPaise: 48000 });
    expect(priceFoodCart(lines, Number.NaN)).toMatchObject({ discountPaise: 0, totalPaise: 48000 });
  });

  it('prices a dish with an unreadable price at nothing while still counting it', () => {
    expect(priceFoodCart([{ unit_price: Number.NaN, quantity: 2 }], 0)).toMatchObject({ count: 2, subtotalPaise: 0, totalPaise: 0 });
  });

  it('prices an empty cart at zero, which is below what the gateway can charge', () => {
    expect(priceFoodCart([], 25)).toEqual({
      count: 0,
      subtotalPaise: 0,
      discountPaise: 0,
      couponPaise: 0,
      totalPaise: 0,
      subtotal: 0,
      discount: 0,
      coupon: 0,
      total: 0,
      belowMinimum: true,
      couponUnmet: false,
    });
  });

  it('flags a total under one rupee, and not a total of exactly one rupee', () => {
    expect(priceFoodCart([{ unit_price: 1, quantity: 1 }], 0)).toMatchObject({ totalPaise: 100, belowMinimum: false });
    expect(priceFoodCart([{ unit_price: 0.99, quantity: 1 }], 0)).toMatchObject({ totalPaise: 99, belowMinimum: true });
    // The discount alone can push a chargeable subtotal under the minimum.
    expect(priceFoodCart([{ unit_price: 1, quantity: 1 }], 1)).toMatchObject({ subtotalPaise: 100, discountPaise: 1, totalPaise: 99, belowMinimum: true });
  });
});

describe('priceFoodCart with a coupon', () => {
  const lines = [
    { unit_price: 149.5, quantity: 3 },
    { unit_price: 80.25, quantity: 1 },
  ];

  // The same matrix the server asserts for foodTotals and for a placed order:
  // the guest must be shown, to the paisa, what they will be charged.
  it.each(pricing.cases)('prices "$name" to the same paise as the server', (fixture) => {
    const price = priceFoodCart(fixture.lines, fixture.discount_pct, fixture.coupon_pct ? { coupon_pct: fixture.coupon_pct } : null);
    expect({
      subtotal_paise: price.subtotalPaise,
      discount_paise: price.discountPaise,
      coupon_discount_paise: price.couponPaise,
      total_paise: price.totalPaise,
      below_minimum: price.belowMinimum,
    }).toEqual({
      subtotal_paise: fixture.subtotal_paise,
      discount_paise: fixture.discount_paise,
      coupon_discount_paise: fixture.coupon_discount_paise,
      total_paise: fixture.total_paise,
      below_minimum: fixture.below_minimum,
    });
  });

  it('covers every pricing situation the matrix is meant to', () => {
    const cases = pricing.cases;
    expect(cases.some((one) => one.discount_pct === 0 && one.coupon_pct === 0)).toBe(true);
    expect(cases.some((one) => one.discount_pct > 0 && one.coupon_pct === 0)).toBe(true);
    expect(cases.some((one) => one.discount_pct === 0 && one.coupon_pct > 0)).toBe(true);
    expect(cases.some((one) => one.discount_pct > 0 && one.coupon_pct > 0 && one.coupon_discount_paise > 0)).toBe(true);
    // Trimmed by the ceiling, and trimmed by the one-rupee minimum.
    expect(cases.some((one) => one.total_paise * 10 === one.subtotal_paise && one.coupon_pct > 0)).toBe(true);
    expect(cases.some((one) => one.total_paise === FOOD_ORDER_LIMITS.minTotalPaise && one.coupon_pct > 0)).toBe(true);
    expect(cases.some((one) => one.below_minimum)).toBe(true);
  });

  it('reports the coupon apart from the venue discount, in paise and in rupees', () => {
    expect(priceFoodCart(lines, 10, { coupon_pct: 20 })).toEqual({
      count: 4,
      subtotalPaise: 52875,
      discountPaise: 5287,
      couponPaise: 9517,
      totalPaise: 38071,
      subtotal: 528.75,
      discount: 52.87,
      coupon: 95.17,
      total: 380.71,
      belowMinimum: false,
      couponUnmet: false,
    });
  });

  it('prices exactly as before when no coupon, or a null one, is given', () => {
    expect(priceFoodCart(lines, 10, null)).toEqual(priceFoodCart(lines, 10));
    expect(priceFoodCart(lines, 10, undefined)).toEqual(priceFoodCart(lines, 10));
    expect(priceFoodCart(lines, 10).couponPaise).toBe(0);
  });

  it('takes nothing off, and says so, while the cart is under the minimum order of the coupon', () => {
    const under = priceFoodCart(lines, 10, { coupon_pct: 20, min_order_amount: 528.76 });
    expect(under).toMatchObject({ couponPaise: 0, coupon: 0, totalPaise: 47588, couponUnmet: true });
    // The minimum is compared with the subtotal, before the venue discount — and met exactly is met.
    const met = priceFoodCart(lines, 10, { coupon_pct: 20, min_order_amount: 528.75 });
    expect(met).toMatchObject({ couponPaise: 9517, totalPaise: 38071, couponUnmet: false });
  });

  it('reads a missing, null or zero minimum order as none', () => {
    for (const min_order_amount of [undefined, null, 0]) {
      expect(priceFoodCart(lines, 0, { coupon_pct: 15, min_order_amount })).toMatchObject({ couponPaise: 7931, couponUnmet: false });
    }
  });

  it('reads a negative or unreadable coupon percent as no coupon discount', () => {
    expect(priceFoodCart(lines, 0, { coupon_pct: -20 })).toMatchObject({ couponPaise: 0, totalPaise: 52875, couponUnmet: false });
    expect(priceFoodCart(lines, 0, { coupon_pct: Number.NaN })).toMatchObject({ couponPaise: 0, totalPaise: 52875 });
  });

  // A percent over the ceiling can only come from a stale or wrong preview; the cap still holds.
  it('never shows a total under what the largest allowed discount would leave', () => {
    const price = priceFoodCart([{ unit_price: 1000, quantity: 1 }], 0, { coupon_pct: 100 });
    expect(price).toMatchObject({ couponPaise: 90000, totalPaise: 10000, belowMinimum: false });
    expect(FOOD_ORDER_LIMITS.maxDiscountPct).toBe(90);
  });

  it('accepts an accepted preview as the coupon, as it came off the wire', () => {
    const preview = {
      ok: true,
      reason: null,
      message: null,
      coupon_code: 'WELCOME20',
      coupon_pct: 20,
      min_order_amount: 100,
      subtotal: 528.75,
      discount_pct: 10,
      discount_amount: 52.87,
      coupon_discount_amount: 95.17,
      total: 380.71,
      currency_symbol: '₹',
    };
    const price = priceFoodCart(lines, preview.discount_pct, preview);
    expect(price.coupon).toBe(preview.coupon_discount_amount);
    expect(price.total).toBe(preview.total);
  });
});

describe('formatFoodMoney', () => {
  it('keeps whole rupees whole, grouped the Indian way', () => {
    expect(formatFoodMoney(250, '₹')).toBe('₹250');
    expect(formatFoodMoney(125000, '₹')).toBe('₹1,25,000');
    expect(formatFoodMoney(0, '₹')).toBe('₹0');
  });

  it('shows two paise digits for anything that is not a whole rupee', () => {
    expect(formatFoodMoney(449.44, '₹')).toBe('₹449.44');
    expect(formatFoodMoney(99.9, '₹')).toBe('₹99.90');
    expect(formatFoodMoney(1250.5, '₹')).toBe('₹1,250.50');
  });

  it("uses the order's own currency symbol", () => {
    expect(formatFoodMoney(12, '$')).toBe('$12');
    expect(formatFoodMoney(12.5, '$')).toBe('$12.50');
  });
});

describe('groupFoodMenu', () => {
  it('groups dishes under each category in the order the category first appears', () => {
    const tikka = dish({ id: 'a', category: 'Starters' });
    const dal = dish({ id: 'b', category: 'Mains' });
    const soup = dish({ id: 'c', category: 'Starters' });
    const kulfi = dish({ id: 'd', category: 'Desserts' });
    expect(groupFoodMenu([tikka, dal, soup, kulfi])).toEqual([
      { category: 'Starters', items: [tikka, soup] },
      { category: 'Mains', items: [dal] },
      { category: 'Desserts', items: [kulfi] },
    ]);
  });

  it('puts dishes with no category last, under an empty heading, wherever they sat in the menu', () => {
    const loose = dish({ id: 'a', category: '' });
    const dal = dish({ id: 'b', category: 'Mains' });
    const blank = dish({ id: 'c', category: '   ' });
    expect(groupFoodMenu([loose, dal, blank])).toEqual([
      { category: 'Mains', items: [dal] },
      { category: '', items: [loose, blank] },
    ]);
  });

  it('treats a category the server sent as null like a missing one', () => {
    const menu = wireMenu(JSON.stringify([{ ...dish({ id: 'a' }), category: null }]));
    expect(groupFoodMenu(menu)).toEqual([{ category: '', items: menu }]);
  });

  it('reads a category through its surrounding spaces, so "Mains " and "Mains" are one heading', () => {
    const one = dish({ id: 'a', category: 'Mains ' });
    const two = dish({ id: 'b', category: ' Mains' });
    expect(groupFoodMenu([one, two])).toEqual([{ category: 'Mains', items: [one, two] }]);
  });

  it('has no groups for an empty menu, and no empty heading when every dish is categorised', () => {
    expect(groupFoodMenu([])).toEqual([]);
    expect(groupFoodMenu([dish()]).map((group) => group.category)).toEqual(['Starters']);
  });
});

describe('reconcileFoodCart', () => {
  const menu = [
    dish({ id: 'tikka', name: 'Paneer Tikka' }),
    dish({ id: 'dal', name: 'Dal Makhani' }),
    dish({ id: 'kulfi', name: 'Kulfi', is_available: false }),
  ];

  it('leaves a cart that still fits the menu untouched and says nothing changed', () => {
    expect(reconcileFoodCart({ tikka: 2, dal: 20 }, menu)).toEqual({ cart: { tikka: 2, dal: 20 }, dropped: [], changed: false });
    expect(reconcileFoodCart({}, menu)).toEqual({ cart: {}, dropped: [], changed: false });
  });

  it('drops a dish that went unavailable and names it', () => {
    expect(reconcileFoodCart({ tikka: 1, kulfi: 2 }, menu)).toEqual({ cart: { tikka: 1 }, dropped: ['Kulfi'], changed: true });
  });

  // A dish that left the menu has no name left to show the guest.
  it('drops a dish that left the menu, reporting a change but no name', () => {
    expect(reconcileFoodCart({ tikka: 1, gone: 3 }, menu)).toEqual({ cart: { tikka: 1 }, dropped: [], changed: true });
  });

  it('brings a quantity over the limit down to 20', () => {
    expect(reconcileFoodCart({ tikka: 21, dal: 500 }, menu)).toEqual({ cart: { tikka: 20, dal: 20 }, dropped: [], changed: true });
  });

  it('floors a fractional quantity', () => {
    expect(reconcileFoodCart({ tikka: 2.7 }, menu)).toEqual({ cart: { tikka: 2 }, dropped: [], changed: true });
  });

  // Zero was never an order, so there is nothing to tell the guest about.
  it('removes a zero, negative or sub-one quantity without naming the dish', () => {
    expect(reconcileFoodCart({ tikka: 0, dal: -3 }, menu)).toEqual({ cart: {}, dropped: [], changed: true });
    expect(reconcileFoodCart({ tikka: 0.9 }, menu)).toEqual({ cart: {}, dropped: [], changed: true });
  });

  it('turns a stored numeric string into a number and removes a quantity that is not a number at all', () => {
    expect(reconcileFoodCart(storedCart('{"tikka":"3","dal":"lots"}'), menu)).toEqual({ cart: { tikka: 3 }, dropped: [], changed: true });
    expect(reconcileFoodCart(storedCart('{"tikka":null}'), menu)).toEqual({ cart: {}, dropped: [], changed: true });
  });

  it('cuts the cart at 30 different dishes and names the ones that did not fit', () => {
    const bigMenu = Array.from({ length: 32 }, (_, index) => dish({ id: `d${index + 1}`, name: `Dish ${index + 1}` }));
    const cart = Object.fromEntries(bigMenu.map((item) => [item.id, 1]));
    const result = reconcileFoodCart(cart, bigMenu);
    expect(Object.keys(result.cart)).toEqual(bigMenu.slice(0, 30).map((item) => item.id));
    expect(result.dropped).toEqual(['Dish 31', 'Dish 32']);
    expect(result.changed).toBe(true);
  });

  it('keeps exactly 30 dishes without reporting a change', () => {
    const fullMenu = Array.from({ length: 30 }, (_, index) => dish({ id: `d${index + 1}`, name: `Dish ${index + 1}` }));
    const cart = Object.fromEntries(fullMenu.map((item) => [item.id, 2]));
    expect(reconcileFoodCart(cart, fullMenu)).toEqual({ cart, dropped: [], changed: false });
  });

  // A dropped dish must not use up one of the 30 places.
  it('does not count a dropped dish against the 30', () => {
    const fullMenu = Array.from({ length: 30 }, (_, index) => dish({ id: `d${index + 1}`, name: `Dish ${index + 1}` }));
    const cart = { gone: 1, ...Object.fromEntries(fullMenu.map((item) => [item.id, 1])) };
    const result = reconcileFoodCart(cart, fullMenu);
    expect(Object.keys(result.cart)).toHaveLength(30);
    expect(result.dropped).toEqual([]);
    expect(result.changed).toBe(true);
  });

  it('does not write to the cart it was given', () => {
    const cart = { tikka: 50, kulfi: 1 };
    reconcileFoodCart(cart, menu);
    expect(cart).toEqual({ tikka: 50, kulfi: 1 });
  });
});

describe('foodCartLines', () => {
  const tikka = dish({ id: 'tikka', price: 240 });
  const dal = dish({ id: 'dal', price: 180.5 });
  const kulfi = dish({ id: 'kulfi', price: 90 });

  it("lists the cart in the menu's order, not the order dishes were added", () => {
    expect(foodCartLines([tikka, dal, kulfi], { kulfi: 1, tikka: 2 })).toEqual([
      { item: tikka, quantity: 2 },
      { item: kulfi, quantity: 1 },
    ]);
  });

  it('leaves out a dish held at zero and a cart entry the menu does not have', () => {
    expect(foodCartLines([tikka, dal], { tikka: 0, dal: 3, gone: 4 })).toEqual([{ item: dal, quantity: 3 }]);
    expect(foodCartLines([tikka, dal], {})).toEqual([]);
  });
});

describe('priceFoodCartLines', () => {
  it("prices each line at its dish's menu price", () => {
    const lines = [
      { item: dish({ id: 'tikka', price: 240 }), quantity: 2 },
      { item: dish({ id: 'dal', price: 180.5 }), quantity: 1 },
    ];
    expect(priceFoodCartLines(lines, 10)).toEqual({
      count: 3,
      subtotalPaise: 66050,
      discountPaise: 6605,
      couponPaise: 0,
      totalPaise: 59445,
      subtotal: 660.5,
      discount: 66.05,
      coupon: 0,
      total: 594.45,
      belowMinimum: false,
      couponUnmet: false,
    });
    expect(priceFoodCartLines(lines, 10)).toEqual(
      priceFoodCart(
        [
          { unit_price: 240, quantity: 2 },
          { unit_price: 180.5, quantity: 1 },
        ],
        10
      )
    );
  });

  it('hands the coupon on to priceFoodCart', () => {
    const lines = [{ item: dish({ id: 'tikka', price: 240 }), quantity: 2 }];
    // 10% of 48000 leaves 43200; 25% of that is 10800.
    expect(priceFoodCartLines(lines, 10, { coupon_pct: 25 })).toMatchObject({ discountPaise: 4800, couponPaise: 10800, totalPaise: 32400 });
    expect(priceFoodCartLines(lines, 10, { coupon_pct: 25 })).toEqual(priceFoodCart([{ unit_price: 240, quantity: 2 }], 10, { coupon_pct: 25 }));
    expect(priceFoodCartLines(lines, 10, { coupon_pct: 25, min_order_amount: 500 })).toMatchObject({ couponPaise: 0, couponUnmet: true });
  });
});

describe('foodOrderLineInputs', () => {
  it('lists each cart line as the id and quantity the server takes', () => {
    expect(
      foodOrderLineInputs([
        { item: dish({ id: 'tikka' }), quantity: 2 },
        { item: dish({ id: 'dal' }), quantity: 1 },
      ])
    ).toEqual([
      { item_id: 'tikka', quantity: 2 },
      { item_id: 'dal', quantity: 1 },
    ]);
    expect(foodOrderLineInputs([])).toEqual([]);
  });
});

describe('normalizeFoodCouponCode', () => {
  it('trims and upper-cases a code, as the server stores it', () => {
    expect(normalizeFoodCouponCode('  welcome10 ')).toBe('WELCOME10');
    expect(normalizeFoodCouponCode('Diwali_25-off')).toBe('DIWALI_25-OFF');
  });

  it('reads nothing typed as no code', () => {
    expect(normalizeFoodCouponCode('')).toBe('');
    expect(normalizeFoodCouponCode('   ')).toBe('');
    expect(normalizeFoodCouponCode(null)).toBe('');
    expect(normalizeFoodCouponCode(undefined)).toBe('');
  });
});

describe('foodCartSignature', () => {
  const tikka = dish({ id: 'tikka' });
  const dal = dish({ id: 'dal' });

  it('spells out each dish and its quantity', () => {
    expect(
      foodCartSignature([
        { item: tikka, quantity: 2 },
        { item: dal, quantity: 1 },
      ])
    ).toBe('tikka:2|dal:1');
    expect(foodCartSignature([])).toBe('');
  });

  it('is the same for the same cart and different once a quantity or a dish changes', () => {
    const base = foodCartSignature([{ item: tikka, quantity: 2 }]);
    expect(foodCartSignature([{ item: dish({ id: 'tikka', name: 'Renamed', price: 999 }), quantity: 2 }])).toBe(base);
    expect(foodCartSignature([{ item: tikka, quantity: 3 }])).not.toBe(base);
    expect(foodCartSignature([{ item: dal, quantity: 2 }])).not.toBe(base);
    expect(
      foodCartSignature([
        { item: tikka, quantity: 2 },
        { item: dal, quantity: 1 },
      ])
    ).not.toBe(base);
  });
});

describe('buildFoodOrderInput', () => {
  const lines = [
    { item: dish({ id: 'tikka' }), quantity: 2 },
    { item: dish({ id: 'dal' }), quantity: 1 },
  ];

  it('sends the cart as ids and quantities with everything the guest typed', () => {
    expect(
      buildFoodOrderInput({
        venueId: 'venue_1',
        lines,
        details: { name: 'Asha', phone: '9876543210', table: 'T4', note: 'No onion' },
        clientKey: 'key-1',
      })
    ).toEqual({
      venue_id: 'venue_1',
      items: [
        { item_id: 'tikka', quantity: 2 },
        { item_id: 'dal', quantity: 1 },
      ],
      customer_name: 'Asha',
      customer_phone: '9876543210',
      table_label: 'T4',
      note: 'No onion',
      client_key: 'key-1',
    });
  });

  it('sends an empty, null or missing table and note as null', () => {
    const blank = buildFoodOrderInput({ venueId: 'venue_1', lines, details: { name: 'Asha', phone: '9876543210', table: '', note: '' }, clientKey: 'k' });
    expect(blank.table_label).toBeNull();
    expect(blank.note).toBeNull();
    const nulls = buildFoodOrderInput({ venueId: 'venue_1', lines, details: { name: 'Asha', phone: '9876543210', table: null, note: null }, clientKey: 'k' });
    expect(nulls.table_label).toBeNull();
    expect(nulls.note).toBeNull();
    const missing = buildFoodOrderInput({ venueId: 'venue_1', lines, details: { name: 'Asha', phone: '9876543210' }, clientKey: 'k' });
    expect(missing.table_label).toBeNull();
    expect(missing.note).toBeNull();
  });

  it('sends the coupon the guest applied, as the server stores it', () => {
    const input = buildFoodOrderInput({
      venueId: 'venue_1',
      lines,
      details: { name: 'Asha', phone: '9876543210', coupon: ' welcome10 ' },
      clientKey: 'k',
    });
    expect(input.coupon_code).toBe('WELCOME10');
  });

  // An order without a coupon goes out byte for byte as it did before coupons existed.
  it('leaves the coupon out entirely when none, or only spaces, was typed', () => {
    for (const coupon of [undefined, null, '', '   ']) {
      const input = buildFoodOrderInput({ venueId: 'venue_1', lines, details: { name: 'Asha', phone: '9876543210', coupon }, clientKey: 'k' });
      expect(Object.keys(input)).toEqual(['venue_id', 'items', 'customer_name', 'customer_phone', 'table_label', 'note', 'client_key']);
    }
  });

  it('sends no lines for an empty cart', () => {
    expect(buildFoodOrderInput({ venueId: 'venue_1', lines: [], details: { name: 'Asha', phone: '9876543210' }, clientKey: 'k' }).items).toEqual([]);
  });
});

describe('foodAttemptSignature', () => {
  const details = { name: 'Asha', phone: '9876543210', table: 'T4', note: '' };

  it('joins the cart with everything typed for it', () => {
    expect(foodAttemptSignature('tikka:2', details)).toBe('tikka:2#{"name":"Asha","phone":"9876543210","table":"T4","note":""}');
  });

  it('is stable for the same cart and details, and changes when either does', () => {
    const base = foodAttemptSignature('tikka:2', details);
    expect(foodAttemptSignature('tikka:2', { ...details })).toBe(base);
    expect(foodAttemptSignature('tikka:3', details)).not.toBe(base);
    expect(foodAttemptSignature('tikka:2', { ...details, name: 'Ashok' })).not.toBe(base);
    expect(foodAttemptSignature('tikka:2', { ...details, phone: '9876543211' })).not.toBe(base);
    expect(foodAttemptSignature('tikka:2', { ...details, table: 'T5' })).not.toBe(base);
    expect(foodAttemptSignature('tikka:2', { ...details, note: 'No onion' })).not.toBe(base);
  });

  // The server answers a repeated client_key with the order it ALREADY priced,
  // so a coupon applied, changed or removed must be a new attempt.
  it('changes when a coupon is applied, changed or removed', () => {
    const base = foodAttemptSignature('tikka:2', details);
    const applied = foodAttemptSignature('tikka:2', { ...details, coupon: 'WELCOME10' });
    expect(applied).toBe('tikka:2#{"name":"Asha","phone":"9876543210","table":"T4","note":"","coupon":"WELCOME10"}');
    expect(applied).not.toBe(base);
    expect(foodAttemptSignature('tikka:2', { ...details, coupon: 'WELCOME20' })).not.toBe(applied);
    expect(foodAttemptSignature('tikka:2', { ...details, coupon: null })).toBe(base);
    expect(foodAttemptSignature('tikka:2', { ...details, coupon: '' })).toBe(base);
    expect(foodAttemptSignature('tikka:2', { ...details, coupon: '  ' })).toBe(base);
  });

  it('reads the coupon as the server does, so retyping it in another case is the same attempt', () => {
    const applied = foodAttemptSignature('tikka:2', { ...details, coupon: 'WELCOME10' });
    expect(foodAttemptSignature('tikka:2', { ...details, coupon: ' welcome10 ' })).toBe(applied);
  });

  it('keys the placement and its signature on the same coupon', () => {
    const typed = { ...details, coupon: 'welcome10' };
    const input = buildFoodOrderInput({ venueId: 'venue_1', lines: [], details: typed, clientKey: 'k' });
    expect(foodAttemptSignature('tikka:2', typed)).toContain(`"coupon":"${input.coupon_code}"`);
  });
});

describe('foodAttemptKey', () => {
  it('mints a key for the first attempt', () => {
    const mint = vi.fn(() => 'key-1');
    expect(foodAttemptKey(null, 'sig-a', mint)).toEqual({ signature: 'sig-a', key: 'key-1' });
    expect(mint).toHaveBeenCalledTimes(1);
  });

  // A second tap or a retry after a closed sheet must reach the SAME order.
  it('keeps the current attempt, without minting, while the signature is unchanged', () => {
    const mint = vi.fn(() => 'key-2');
    const current = { signature: 'sig-a', key: 'key-1' };
    expect(foodAttemptKey(current, 'sig-a', mint)).toBe(current);
    expect(mint).not.toHaveBeenCalled();
  });

  it('mints a new key once the cart or the details change', () => {
    const mint = vi.fn(() => 'key-2');
    expect(foodAttemptKey({ signature: 'sig-a', key: 'key-1' }, 'sig-b', mint)).toEqual({ signature: 'sig-b', key: 'key-2' });
    expect(mint).toHaveBeenCalledTimes(1);
  });
});

describe('createFoodClientKey', () => {
  /** Mints key-1, key-2, … so every mint is visible in the key it returns. */
  const counter = () => {
    let minted = 0;
    return vi.fn(() => {
      minted += 1;
      return `key-${minted}`;
    });
  };

  it('answers the same key for the same signature without minting again', () => {
    const mint = counter();
    const keys = createFoodClientKey(mint);
    expect(keys.keyFor('sig-a')).toBe('key-1');
    expect(keys.keyFor('sig-a')).toBe('key-1');
    expect(mint).toHaveBeenCalledTimes(1);
  });

  it('mints a new key for a changed signature, and again when the old one comes back', () => {
    const mint = counter();
    const keys = createFoodClientKey(mint);
    expect(keys.keyFor('sig-a')).toBe('key-1');
    expect(keys.keyFor('sig-b')).toBe('key-2');
    // Only the current attempt is remembered: going back is a new attempt.
    expect(keys.keyFor('sig-a')).toBe('key-3');
    expect(mint).toHaveBeenCalledTimes(3);
  });

  // The same cart ordered again after a finished order is a NEW order.
  it('forgets the finished attempt on reset, so the same signature gets a new key', () => {
    const mint = counter();
    const keys = createFoodClientKey(mint);
    expect(keys.keyFor('sig-a')).toBe('key-1');
    keys.reset();
    expect(keys.keyFor('sig-a')).toBe('key-2');
    expect(mint).toHaveBeenCalledTimes(2);
  });

  it('mints nothing until a key is asked for, and keeps separate holders apart', () => {
    const mint = counter();
    const first = createFoodClientKey(mint);
    const second = createFoodClientKey(mint);
    first.reset();
    expect(mint).not.toHaveBeenCalled();
    expect(first.keyFor('sig-a')).toBe('key-1');
    expect(second.keyFor('sig-a')).toBe('key-2');
    expect(first.keyFor('sig-a')).toBe('key-1');
  });
});

describe('tryPlaceFoodOrder', () => {
  it('hands back the placement with no error when the order is placed', async () => {
    const placement: VenueFoodOrderPlacement = {
      order: order(),
      access_key: 'access-1',
      razorpay: {
        key_id: 'rzp_test_key',
        order_id: 'order_rzp_1',
        amount: 43200,
        currency: 'INR',
        name: 'Cafe Uno',
        description: 'F-1001',
        prefill_contact: '9876543210',
      },
    };
    const place = vi.fn(() => Promise.resolve<VenueFoodOrderPlacement | null>(placement));
    const result = await tryPlaceFoodOrder(place);
    expect(result.placement).toBe(placement);
    expect(result.error).toBeNull();
    expect(place).toHaveBeenCalledTimes(1);
  });

  it('answers a null placement and a null error when the server simply answered with none', async () => {
    await expect(tryPlaceFoodOrder(() => Promise.resolve(null))).resolves.toEqual({ placement: null, error: null });
  });

  it('never throws: a rejection comes back as the error, with no placement', async () => {
    const refused = { graphQLErrors: [{ message: 'Kitchen closed', extensions: { code: 'FOOD_ORDERING_CLOSED' } }] };
    const result = await tryPlaceFoodOrder(() => Promise.reject(refused));
    expect(result.placement).toBeNull();
    expect(result.error).toBe(refused);
    // The error it hands back is what the page reads its sentence from.
    expect(foodOrderErrorKey(foodOrderErrorCode(result.error))).toBe('mweb.venueFood.errors.closed');
  });

  it('catches a place function that throws where it stands', async () => {
    const boom = new Error('client not ready');
    const result = await tryPlaceFoodOrder(() => {
      throw boom;
    });
    expect(result).toEqual({ placement: null, error: boom });
  });
});

describe('FOOD_ORDER_CONFLICT_RETRY_MS', () => {
  it('waits a second and a half before repeating a placement still being set up', () => {
    expect(FOOD_ORDER_CONFLICT_RETRY_MS).toBe(1500);
  });
});

describe('the label keys', () => {
  const STATUSES: VenueFoodOrderStatus[] = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'];
  const PAYMENTS: VenueFoodPaymentStatus[] = ['PENDING', 'PAID', 'FAILED', 'REFUND_PENDING', 'REFUNDED'];
  const DIETS: VenueFoodDiet[] = ['VEG', 'NON_VEG', 'EGG', 'VEGAN'];
  const SPICES: VenueFoodSpiceLevel[] = ['NONE', 'MILD', 'MEDIUM', 'HOT', 'EXTRA_HOT'];

  it('names one key per kitchen status', () => {
    expect(FOOD_ORDER_STATUS_KEYS).toEqual({
      PLACED: 'mweb.venueFood.status.placed',
      ACCEPTED: 'mweb.venueFood.status.accepted',
      PREPARING: 'mweb.venueFood.status.preparing',
      READY: 'mweb.venueFood.status.ready',
      SERVED: 'mweb.venueFood.status.served',
      CANCELLED: 'mweb.venueFood.status.cancelled',
    });
  });

  it('names one key per payment status', () => {
    expect(FOOD_PAYMENT_STATUS_KEYS).toEqual({
      PENDING: 'mweb.venueFood.payment.pending',
      PAID: 'mweb.venueFood.payment.paid',
      FAILED: 'mweb.venueFood.payment.failed',
      REFUND_PENDING: 'mweb.venueFood.payment.refundPending',
      REFUNDED: 'mweb.venueFood.payment.refunded',
    });
  });

  it('names one key per diet', () => {
    expect(FOOD_DIET_KEYS).toEqual({
      VEG: 'mweb.venueFood.diet.veg',
      NON_VEG: 'mweb.venueFood.diet.nonVeg',
      EGG: 'mweb.venueFood.diet.egg',
      VEGAN: 'mweb.venueFood.diet.vegan',
    });
  });

  it('names one key per spice level', () => {
    expect(FOOD_SPICE_KEYS).toEqual({
      NONE: 'mweb.venueFood.spice.none',
      MILD: 'mweb.venueFood.spice.mild',
      MEDIUM: 'mweb.venueFood.spice.medium',
      HOT: 'mweb.venueFood.spice.hot',
      EXTRA_HOT: 'mweb.venueFood.spice.extraHot',
    });
  });

  // A value with no key, or two values sharing one, would show the guest a raw
  // key or the wrong word.
  it('leaves no value unmapped and gives no two values the same key', () => {
    const maps: Array<[readonly string[], Record<string, string>]> = [
      [STATUSES, FOOD_ORDER_STATUS_KEYS],
      [PAYMENTS, FOOD_PAYMENT_STATUS_KEYS],
      [DIETS, FOOD_DIET_KEYS],
      [SPICES, FOOD_SPICE_KEYS],
    ];
    for (const [values, keys] of maps) {
      expect(Object.keys(keys)).toEqual(values);
      expect(new Set(Object.values(keys)).size).toBe(values.length);
    }
  });

  it('draws one more chilli per spice level, from none to four', () => {
    expect(FOOD_SPICE_HEAT).toEqual({ NONE: 0, MILD: 1, MEDIUM: 2, HOT: 3, EXTRA_HOT: 4 });
    expect(Object.keys(FOOD_SPICE_HEAT)).toEqual(SPICES);
  });
});

describe('isVegFood', () => {
  it('is true for vegetarian and vegan dishes only', () => {
    expect(isVegFood('VEG')).toBe(true);
    expect(isVegFood('VEGAN')).toBe(true);
    expect(isVegFood('EGG')).toBe(false);
    expect(isVegFood('NON_VEG')).toBe(false);
  });
});

describe('foodOrderErrorCode', () => {
  it('reads the code off an Apollo v3 graphQLErrors list', () => {
    expect(foodOrderErrorCode({ graphQLErrors: [{ message: 'x', extensions: { code: 'FOOD_ITEM_UNAVAILABLE' } }] })).toBe('FOOD_ITEM_UNAVAILABLE');
  });

  it('reads the code off an Apollo v4 errors list', () => {
    expect(foodOrderErrorCode({ errors: [{ message: 'x', extensions: { code: 'CONFLICT' } }] })).toBe('CONFLICT');
  });

  it('reads only the FIRST error, and prefers graphQLErrors when both lists are there', () => {
    expect(
      foodOrderErrorCode({
        graphQLErrors: [
          { message: 'x', extensions: { code: 'RATE_LIMITED' } },
          { message: 'y', extensions: { code: 'FORBIDDEN' } },
        ],
        errors: [{ message: 'z', extensions: { code: 'NOT_FOUND' } }],
      })
    ).toBe('RATE_LIMITED');
    expect(foodOrderErrorCode({ graphQLErrors: [], errors: [{ message: 'z', extensions: { code: 'NOT_FOUND' } }] })).toBe('NOT_FOUND');
  });

  it('is empty when the first error carries no code, or one that is not a string', () => {
    expect(foodOrderErrorCode({ graphQLErrors: [{ message: 'x' }] })).toBe('');
    expect(foodOrderErrorCode({ graphQLErrors: [{ message: 'x', extensions: {} }] })).toBe('');
    expect(foodOrderErrorCode({ graphQLErrors: [{ message: 'x', extensions: { code: 409 } }] })).toBe('');
    expect(foodOrderErrorCode({ errors: [{ message: 'x', extensions: { code: null } }] })).toBe('');
  });

  // A network failure reaches the page as a plain Error with no GraphQL list.
  it('is empty for a plain Error, a string, an empty object and nothing at all', () => {
    expect(foodOrderErrorCode(new Error('Failed to fetch'))).toBe('');
    expect(foodOrderErrorCode('Failed to fetch')).toBe('');
    expect(foodOrderErrorCode({})).toBe('');
    expect(foodOrderErrorCode(null)).toBe('');
    expect(foodOrderErrorCode(undefined)).toBe('');
  });
});

describe('foodOrderErrorKey', () => {
  it('names the codes the page branches on', () => {
    expect(FOOD_ORDER_ERROR).toEqual({
      closed: 'FOOD_ORDERING_CLOSED',
      itemUnavailable: 'FOOD_ITEM_UNAVAILABLE',
      conflict: 'CONFLICT',
      couponRejected: 'FOOD_COUPON_REJECTED',
    });
    expect(FOOD_ORDER_GENERIC_ERROR_KEY).toBe('mweb.venueFood.errors.generic');
  });

  it('has a sentence for every code the food-order calls answer with', () => {
    expect(foodOrderErrorKey(FOOD_ORDER_ERROR.closed)).toBe('mweb.venueFood.errors.closed');
    expect(foodOrderErrorKey(FOOD_ORDER_ERROR.itemUnavailable)).toBe('mweb.venueFood.errors.itemUnavailable');
    expect(foodOrderErrorKey(FOOD_ORDER_ERROR.conflict)).toBe('mweb.venueFood.errors.conflict');
    expect(foodOrderErrorKey(FOOD_ORDER_ERROR.couponRejected)).toBe('mweb.venueFood.errors.couponRejected');
    expect(foodOrderErrorKey('BAD_USER_INPUT')).toBe('mweb.venueFood.errors.badInput');
    expect(foodOrderErrorKey('RATE_LIMITED')).toBe('mweb.venueFood.errors.rateLimited');
    expect(foodOrderErrorKey('FORBIDDEN')).toBe('mweb.venueFood.errors.forbidden');
    expect(foodOrderErrorKey('BAD_REQUEST')).toBe('mweb.venueFood.errors.badRequest');
    expect(foodOrderErrorKey('NOT_FOUND')).toBe('mweb.venueFood.errors.notFound');
  });

  it('falls back to the generic sentence for a code it does not know, or none', () => {
    expect(foodOrderErrorKey('INTERNAL_SERVER_ERROR')).toBe('mweb.venueFood.errors.generic');
    expect(foodOrderErrorKey('')).toBe('mweb.venueFood.errors.generic');
    expect(foodOrderErrorKey(null)).toBe('mweb.venueFood.errors.generic');
    expect(foodOrderErrorKey(undefined)).toBe('mweb.venueFood.errors.generic');
    // Codes are matched exactly as the server spells them.
    expect(foodOrderErrorKey('conflict')).toBe('mweb.venueFood.errors.generic');
  });

  it("uses the caller's own fallback when one is given, but never over a known code", () => {
    expect(foodOrderErrorKey('INTERNAL_SERVER_ERROR', 'mweb.venueFood.errors.payment')).toBe('mweb.venueFood.errors.payment');
    expect(foodOrderErrorKey(null, 'mweb.venueFood.errors.payment')).toBe('mweb.venueFood.errors.payment');
    expect(foodOrderErrorKey('NOT_FOUND', 'mweb.venueFood.errors.payment')).toBe('mweb.venueFood.errors.notFound');
  });

  it('reads a network failure, which carries no code, as the generic sentence', () => {
    expect(foodOrderErrorKey(foodOrderErrorCode(new Error('Failed to fetch')))).toBe('mweb.venueFood.errors.generic');
  });
});

describe('the coupon rejection reasons', () => {
  const REASONS: VenueFoodCouponRejection[] = [
    'INVALID',
    'NOT_STARTED',
    'EXPIRED',
    'MIN_ORDER_NOT_MET',
    'USAGE_LIMIT_REACHED',
    'PER_PERSON_LIMIT_REACHED',
    'NO_DISCOUNT',
  ];

  it('names one sentence per reason the server can answer with', () => {
    expect(FOOD_COUPON_REJECTION_KEYS).toEqual({
      INVALID: 'mweb.venueFood.coupon.rejected.invalid',
      NOT_STARTED: 'mweb.venueFood.coupon.rejected.notStarted',
      EXPIRED: 'mweb.venueFood.coupon.rejected.expired',
      MIN_ORDER_NOT_MET: 'mweb.venueFood.coupon.rejected.minOrder',
      USAGE_LIMIT_REACHED: 'mweb.venueFood.coupon.rejected.usageLimit',
      PER_PERSON_LIMIT_REACHED: 'mweb.venueFood.coupon.rejected.perPerson',
      NO_DISCOUNT: 'mweb.venueFood.coupon.rejected.noDiscount',
    });
    expect(Object.keys(FOOD_COUPON_REJECTION_KEYS)).toEqual(REASONS);
    expect(new Set(Object.values(FOOD_COUPON_REJECTION_KEYS)).size).toBe(REASONS.length);
  });

  it('reads the reason off a placement refused over its coupon, from either Apollo shape', () => {
    for (const reason of REASONS) {
      const refused = { message: 'x', extensions: { code: 'FOOD_COUPON_REJECTED', reason } };
      expect(foodCouponRejectionOf({ graphQLErrors: [refused] })).toBe(reason);
      expect(foodCouponRejectionOf({ errors: [refused] })).toBe(reason);
    }
  });

  it('is null for a reason it does not know, one that is not a string, or an error with none', () => {
    const withReason = (reason: unknown) => ({ graphQLErrors: [{ message: 'x', extensions: { code: 'FOOD_COUPON_REJECTED', reason } }] });
    expect(foodCouponRejectionOf(withReason('SOMETHING_NEW'))).toBeNull();
    // A property every object inherits is not a reason.
    expect(foodCouponRejectionOf(withReason('toString'))).toBeNull();
    expect(foodCouponRejectionOf(withReason(7))).toBeNull();
    expect(foodCouponRejectionOf(withReason(null))).toBeNull();
    expect(foodCouponRejectionOf({ graphQLErrors: [{ message: 'x', extensions: { code: 'FOOD_ORDERING_CLOSED' } }] })).toBeNull();
    expect(foodCouponRejectionOf(new Error('Failed to fetch'))).toBeNull();
    expect(foodCouponRejectionOf(null)).toBeNull();
  });
});

describe('isFoodOrderFinished', () => {
  it('is finished once served or cancelled, whatever the payment says', () => {
    expect(isFoodOrderFinished({ status: 'SERVED', payment_status: 'PAID' })).toBe(true);
    expect(isFoodOrderFinished({ status: 'CANCELLED', payment_status: 'PENDING' })).toBe(true);
    expect(isFoodOrderFinished({ status: 'CANCELLED', payment_status: 'REFUND_PENDING' })).toBe(true);
    expect(isFoodOrderFinished({ status: 'CANCELLED', payment_status: 'REFUNDED' })).toBe(true);
  });

  it('is finished when the payment failed, even though the kitchen status never moved', () => {
    expect(isFoodOrderFinished({ status: 'PLACED', payment_status: 'FAILED' })).toBe(true);
  });

  it('is not finished while the kitchen is still working on it', () => {
    const working: VenueFoodOrderStatus[] = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'];
    for (const status of working) {
      expect(isFoodOrderFinished({ status, payment_status: 'PAID' })).toBe(false);
      expect(isFoodOrderFinished({ status, payment_status: 'PENDING' })).toBe(false);
    }
  });
});

describe('foodOrderPollMs', () => {
  it('re-reads every 8 s while the payment is unconfirmed and every 20 s while the kitchen works', () => {
    expect(FOOD_ORDER_POLL_MS).toEqual({ payment: 8000, kitchen: 20000 });
  });

  it('polls quickly while the payment is still pending', () => {
    expect(foodOrderPollMs({ status: 'PLACED', payment_status: 'PENDING' })).toBe(8000);
    expect(foodOrderPollMs({ status: 'ACCEPTED', payment_status: 'PENDING' })).toBe(8000);
  });

  it('polls slowly once the payment is settled and the kitchen is working', () => {
    expect(foodOrderPollMs({ status: 'PLACED', payment_status: 'PAID' })).toBe(20000);
    expect(foodOrderPollMs({ status: 'ACCEPTED', payment_status: 'PAID' })).toBe(20000);
    expect(foodOrderPollMs({ status: 'PREPARING', payment_status: 'PAID' })).toBe(20000);
    expect(foodOrderPollMs({ status: 'READY', payment_status: 'PAID' })).toBe(20000);
    // A refund in flight on an order the kitchen has not closed is still watched.
    expect(foodOrderPollMs({ status: 'PREPARING', payment_status: 'REFUND_PENDING' })).toBe(20000);
    expect(foodOrderPollMs({ status: 'PREPARING', payment_status: 'REFUNDED' })).toBe(20000);
  });

  it('stops polling a finished order', () => {
    expect(foodOrderPollMs({ status: 'SERVED', payment_status: 'PAID' })).toBe(0);
    expect(foodOrderPollMs({ status: 'CANCELLED', payment_status: 'REFUND_PENDING' })).toBe(0);
    expect(foodOrderPollMs({ status: 'CANCELLED', payment_status: 'REFUNDED' })).toBe(0);
    expect(foodOrderPollMs({ status: 'PLACED', payment_status: 'FAILED' })).toBe(0);
    // Cancelled before it was ever paid: finished wins over the pending payment.
    expect(foodOrderPollMs({ status: 'CANCELLED', payment_status: 'PENDING' })).toBe(0);
  });

  it('does not poll before there is an order to read', () => {
    expect(foodOrderPollMs(null)).toBe(0);
    expect(foodOrderPollMs(undefined)).toBe(0);
  });
});

describe('buildFoodOrderTimeline', () => {
  /** Marks every label as translated, so a raw key reaching the page would show. */
  const t = (key: string) => `t(${key})`;
  const CREATED = '2026-10-12T12:00:00.000Z';
  const at = (status: VenueFoodOrderStatus) => buildFoodOrderTimeline(order({ status, created_at: CREATED }), t);

  it('lists the kitchen steps in order, CANCELLED left out', () => {
    expect(FOOD_ORDER_FLOW).toEqual(['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED']);
    expect(at('PLACED').map((step) => step.status)).toEqual(['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED']);
  });

  it('draws a just-placed order with its first step moving and the rest ahead', () => {
    expect(at('PLACED')).toEqual([
      {
        status: 'PLACED',
        label: 't(mweb.venueFood.status.placed)',
        done: false,
        current: true,
        at: CREATED,
        location: '',
        note: '',
        tone: 'moving',
        scans: [],
      },
      {
        status: 'ACCEPTED',
        label: 't(mweb.venueFood.status.accepted)',
        done: false,
        current: false,
        at: null,
        location: '',
        note: '',
        tone: 'neutral',
        scans: [],
      },
      {
        status: 'PREPARING',
        label: 't(mweb.venueFood.status.preparing)',
        done: false,
        current: false,
        at: null,
        location: '',
        note: '',
        tone: 'neutral',
        scans: [],
      },
      {
        status: 'READY',
        label: 't(mweb.venueFood.status.ready)',
        done: false,
        current: false,
        at: null,
        location: '',
        note: '',
        tone: 'neutral',
        scans: [],
      },
      {
        status: 'SERVED',
        label: 't(mweb.venueFood.status.served)',
        done: false,
        current: false,
        at: null,
        location: '',
        note: '',
        tone: 'neutral',
        scans: [],
      },
    ]);
  });

  it('marks the steps behind the order done, the one it is on moving and the rest neutral', () => {
    const shape = (status: VenueFoodOrderStatus) => at(status).map((step) => `${step.done ? 'done' : 'open'}/${step.current ? 'current' : '-'}/${step.tone}`);
    expect(shape('ACCEPTED')).toEqual(['done/-/done', 'open/current/moving', 'open/-/neutral', 'open/-/neutral', 'open/-/neutral']);
    expect(shape('PREPARING')).toEqual(['done/-/done', 'done/-/done', 'open/current/moving', 'open/-/neutral', 'open/-/neutral']);
    expect(shape('READY')).toEqual(['done/-/done', 'done/-/done', 'done/-/done', 'open/current/moving', 'open/-/neutral']);
  });

  // Served is the end of the road: its step reads as done, not as still moving.
  it('draws a served order with every step behind it done and the last step toned done', () => {
    const steps = at('SERVED');
    expect(steps.map((step) => step.tone)).toEqual(['done', 'done', 'done', 'done', 'done']);
    expect(steps.map((step) => step.done)).toEqual([true, true, true, true, false]);
    expect(steps.map((step) => step.current)).toEqual([false, false, false, false, true]);
  });

  it('dates only the PLACED step, with when the order was created, at every stage', () => {
    for (const status of FOOD_ORDER_FLOW) {
      expect(at(status).map((step) => step.at)).toEqual([CREATED, null, null, null, null]);
    }
  });

  it('draws a cancelled order as one closing step carrying when and why', () => {
    const steps = buildFoodOrderTimeline(
      order({ status: 'CANCELLED', created_at: CREATED, cancelled_at: '2026-10-12T12:20:00.000Z', cancel_reason: 'Kitchen closed early' }),
      t
    );
    expect(steps).toEqual([
      {
        status: 'CANCELLED',
        label: 't(mweb.venueFood.status.cancelled)',
        done: false,
        current: true,
        at: '2026-10-12T12:20:00.000Z',
        location: '',
        note: 'Kitchen closed early',
        tone: 'neutral',
        scans: [],
      },
    ]);
  });

  it('draws a cancellation with no time or reason recorded as an undated, unexplained step', () => {
    const [step] = buildFoodOrderTimeline(order({ status: 'CANCELLED', cancelled_at: null, cancel_reason: '' }), t);
    expect(step).toMatchObject({ status: 'CANCELLED', current: true, at: null, note: '' });
  });

  // The timeline follows the kitchen, not the money: a refund changes the
  // payment line of the page, never the steps drawn here.
  it('draws the same steps whatever the refund state of the payment', () => {
    const refunding = order({ status: 'CANCELLED', payment_status: 'REFUND_PENDING', cancelled_at: CREATED, cancel_reason: 'Out of stock' });
    const refunded = { ...refunding, payment_status: 'REFUNDED' as const };
    expect(buildFoodOrderTimeline(refunded, t)).toEqual(buildFoodOrderTimeline(refunding, t));
    expect(buildFoodOrderTimeline(order({ status: 'PREPARING', payment_status: 'REFUND_PENDING' }), t)).toEqual(
      buildFoodOrderTimeline(order({ status: 'PREPARING', payment_status: 'PAID' }), t)
    );
  });

  it('gives every step its own scan list, so drawing one cannot change another', () => {
    const steps = at('PREPARING');
    expect(steps[0].scans).not.toBe(steps[1].scans);
  });

  it('asks the translator for each step label exactly once', () => {
    const translate = vi.fn(t);
    buildFoodOrderTimeline(order({ status: 'READY' }), translate);
    expect(translate.mock.calls.map(([key]) => key)).toEqual([
      'mweb.venueFood.status.placed',
      'mweb.venueFood.status.accepted',
      'mweb.venueFood.status.preparing',
      'mweb.venueFood.status.ready',
      'mweb.venueFood.status.served',
    ]);
  });
});
