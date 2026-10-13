/**
 * A venue's food menu and its scan-the-QR order — one contract for mWeb and
 * the native app.
 *
 * A guest opens the venue's public page at the table, picks dishes, pays the
 * venue's own Razorpay account and follows the order from the kitchen to the
 * table. Nothing here needs a session. The documents travel as plain strings
 * for the same reason the public-page ones do: this package has no GraphQL
 * client of its own and must stay framework-free for the native bundle.
 *
 * The server recomputes every price, the availability and the discount; what
 * this module prices is only what the guest is shown before they pay.
 */

import { formatMoney } from './format-money';
import type { DetailedTimelineStep } from './order-tracking';
import { firstGraphQLError } from './parse-api-error';

/** Mirrors the server enum VenueFoodDiet. */
export type VenueFoodDiet = 'VEG' | 'NON_VEG' | 'EGG' | 'VEGAN';
/** Mirrors the server enum VenueFoodSpiceLevel. */
export type VenueFoodSpiceLevel = 'NONE' | 'MILD' | 'MEDIUM' | 'HOT' | 'EXTRA_HOT';
/** Where the kitchen has got to. Mirrors the server enum VenueFoodOrderStatus. */
export type VenueFoodOrderStatus = 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
/** Mirrors the server enum VenueFoodPaymentStatus. */
export type VenueFoodPaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUND_PENDING' | 'REFUNDED';

/** One dish on a venue's menu, as `publicVenue.food_menu` returns it. */
export interface VenueFoodItem {
  id: string;
  name: string;
  description: string;
  category: string;
  /** Rupees. */
  price: number;
  images: string[];
  diet: VenueFoodDiet;
  spice_level: VenueFoodSpiceLevel;
  is_available: boolean;
}

/** Whether the venue takes QR orders, and what it takes off them. */
export interface VenueFoodOrdering {
  enabled: boolean;
  discount_pct: number;
}

/** A dish as it was when ordered. */
export interface VenueFoodOrderLine {
  item_id: string;
  name: string;
  diet: VenueFoodDiet;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface VenueFoodOrder {
  id: string;
  order_no: string;
  venue_id: string;
  venue_name: string;
  customer_name: string;
  customer_phone: string;
  table_label: string;
  note: string;
  items: VenueFoodOrderLine[];
  subtotal: number;
  discount_pct: number;
  discount_amount: number;
  total: number;
  currency_symbol: string;
  status: VenueFoodOrderStatus;
  payment_status: VenueFoodPaymentStatus;
  paid_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string;
  created_at: string;
}

/** What Razorpay's checkout is opened with. `amount` is in paise. */
export interface VenueFoodRazorpaySheet {
  key_id: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill_contact: string;
}

export interface VenueFoodOrderPlacement {
  order: VenueFoodOrder;
  /** Proves the order is the caller's on every later read. Kept with the order id. */
  access_key: string;
  /** Null once the order is no longer waiting for payment. */
  razorpay: VenueFoodRazorpaySheet | null;
}

/** One cart line as the server takes it. */
export interface VenueFoodOrderLineInput {
  item_id: string;
  quantity: number;
}

export interface PlaceVenueFoodOrderInput {
  venue_id: string;
  items: VenueFoodOrderLineInput[];
  customer_name: string;
  customer_phone: string;
  table_label?: string | null;
  note?: string | null;
  /** Minted once per checkout attempt; repeating it returns the same order. */
  client_key: string;
}

/** The server's own limits, so the cart refuses what the server would. */
export const FOOD_ORDER_LIMITS = {
  maxLines: 30,
  maxQuantity: 20,
  nameMin: 2,
  nameMax: 80,
  phoneLength: 10,
  tableMax: 20,
  noteMax: 300,
  minTotalPaise: 100,
} as const;

export const PLACE_VENUE_FOOD_ORDER_MUTATION = /* GraphQL */ `
  mutation PlaceVenueFoodOrder($input: PlaceVenueFoodOrderInput!) {
    placeVenueFoodOrder(input: $input) {
      access_key
      order {
        id
        order_no
        venue_id
        venue_name
        customer_name
        customer_phone
        table_label
        note
        items {
          item_id
          name
          diet
          unit_price
          quantity
          line_total
        }
        subtotal
        discount_pct
        discount_amount
        total
        currency_symbol
        status
        payment_status
        paid_at
        cancelled_at
        cancel_reason
        created_at
      }
      razorpay {
        key_id
        order_id
        amount
        currency
        name
        description
        prefill_contact
      }
    }
  }
`;

export const VERIFY_VENUE_FOOD_ORDER_MUTATION = /* GraphQL */ `
  mutation VerifyVenueFoodOrderPayment($input: VerifyVenueFoodOrderInput!) {
    verifyVenueFoodOrderPayment(input: $input) {
      id
      status
      payment_status
      paid_at
    }
  }
`;

export const VENUE_FOOD_ORDER_QUERY = /* GraphQL */ `
  query VenueFoodOrder($orderId: ID!, $accessKey: String) {
    venueFoodOrder(order_id: $orderId, access_key: $accessKey) {
      id
      order_no
      venue_id
      venue_name
      customer_name
      customer_phone
      table_label
      note
      items {
        item_id
        name
        diet
        unit_price
        quantity
        line_total
      }
      subtotal
      discount_pct
      discount_amount
      total
      currency_symbol
      status
      payment_status
      paid_at
      cancelled_at
      cancel_reason
      created_at
    }
  }
`;

const toPaise = (rupees: number): number => Math.round((Number(rupees) || 0) * 100);

/** What a cart costs, in rupees for display and in paise for comparing. */
export interface FoodCartPrice {
  /** Dishes in the cart, counting each quantity. */
  count: number;
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  subtotal: number;
  discount: number;
  total: number;
  /** Too small for the gateway to charge — the server refuses it too. */
  belowMinimum: boolean;
}

/**
 * Price a cart exactly as the server will: every line in integer paise, the
 * discount rounded DOWN to a paisa (so the venue never gives away more than
 * the percent it set), the total what is left.
 */
export function priceFoodCart(
  lines: ReadonlyArray<{ unit_price: number; quantity: number }>,
  discountPct: number
): FoodCartPrice {
  let count = 0;
  let subtotalPaise = 0;
  for (const line of lines) {
    count += line.quantity;
    subtotalPaise += toPaise(line.unit_price) * line.quantity;
  }
  const pct = Math.max(0, Number(discountPct) || 0);
  const discountPaise = Math.floor((subtotalPaise * pct) / 100);
  const totalPaise = subtotalPaise - discountPaise;
  return {
    count,
    subtotalPaise,
    discountPaise,
    totalPaise,
    subtotal: subtotalPaise / 100,
    discount: discountPaise / 100,
    total: totalPaise / 100,
    belowMinimum: totalPaise < FOOD_ORDER_LIMITS.minTotalPaise,
  };
}

/** A food amount as text: whole rupees stay whole, anything else shows its paise. */
export const formatFoodMoney = (amount: number, symbol: string): string =>
  formatMoney(amount, { symbol, decimals: Number.isInteger(amount) ? 0 : 2 });

export interface FoodMenuGroup {
  /** The category as the venue wrote it; empty for the dishes that have none. */
  category: string;
  items: VenueFoodItem[];
}

/**
 * The menu under its category headings, in the order each category first
 * appears. Dishes with no category go last, under no heading of their own.
 */
export function groupFoodMenu(menu: ReadonlyArray<VenueFoodItem>): FoodMenuGroup[] {
  const groups = new Map<string, VenueFoodItem[]>();
  for (const item of menu) {
    const category = (item.category ?? '').trim();
    const bucket = groups.get(category);
    if (bucket) bucket.push(item);
    else groups.set(category, [item]);
  }
  const named: FoodMenuGroup[] = [];
  for (const [category, items] of groups) {
    if (category) named.push({ category, items });
  }
  const loose = groups.get('');
  return loose ? [...named, { category: '', items: loose }] : named;
}

/** A cart as it is kept: dish id → how many. */
export type FoodCartQuantities = Record<string, number>;

/**
 * A stored cart checked against the menu as it is now: a dish that left the
 * menu or went unavailable is dropped, a quantity is brought inside 1–20, and
 * the cart is cut at the number of different dishes one order may hold.
 * `dropped` names what was removed, so the guest can be told.
 */
export function reconcileFoodCart(
  cart: FoodCartQuantities,
  menu: ReadonlyArray<VenueFoodItem>
): { cart: FoodCartQuantities; dropped: string[]; changed: boolean } {
  const byId = new Map(menu.map((item) => [item.id, item]));
  const next: FoodCartQuantities = {};
  const dropped: string[] = [];
  let changed = false;
  for (const [id, raw] of Object.entries(cart)) {
    const item = byId.get(id);
    const quantity = Math.min(FOOD_ORDER_LIMITS.maxQuantity, Math.floor(Number(raw) || 0));
    const fits = Object.keys(next).length < FOOD_ORDER_LIMITS.maxLines;
    if (item?.is_available && quantity >= 1 && fits) {
      next[id] = quantity;
      if (quantity !== raw) changed = true;
    } else {
      changed = true;
      // An unknown id has no name to show; a zero quantity was never an order.
      if (item && quantity >= 1) dropped.push(item.name);
    }
  }
  return { cart: next, dropped, changed };
}

/** One dish in the cart, with how many of it. */
export interface FoodCartLine {
  item: VenueFoodItem;
  quantity: number;
}

/** The cart as lines, in the menu's own order — a dish the cart does not hold is left out. */
export function foodCartLines(menu: ReadonlyArray<VenueFoodItem>, cart: FoodCartQuantities): FoodCartLine[] {
  return menu.flatMap((item) => {
    const quantity = cart[item.id];
    return quantity ? [{ item, quantity }] : [];
  });
}

/** `priceFoodCart` for cart lines, each priced at its dish's menu price. */
export function priceFoodCartLines(lines: ReadonlyArray<FoodCartLine>, discountPct: number): FoodCartPrice {
  return priceFoodCart(
    lines.map((line) => ({ unit_price: line.item.price, quantity: line.quantity })),
    discountPct
  );
}

/** Changes whenever the cart's contents do — a checkout attempt is keyed on it. */
export const foodCartSignature = (lines: ReadonlyArray<FoodCartLine>): string =>
  lines.map((line) => `${line.item.id}:${line.quantity}`).join('|');

/** What the guest typed at checkout. An empty table or note is sent as none. */
export interface FoodOrderDetails {
  name: string;
  phone: string;
  table?: string | null;
  note?: string | null;
}

/** The cart and the guest's details as the place-order mutation takes them. */
export function buildFoodOrderInput({
  venueId,
  lines,
  details,
  clientKey,
}: {
  venueId: string;
  lines: ReadonlyArray<FoodCartLine>;
  details: FoodOrderDetails;
  clientKey: string;
}): PlaceVenueFoodOrderInput {
  return {
    venue_id: venueId,
    items: lines.map((line) => ({ item_id: line.item.id, quantity: line.quantity })),
    customer_name: details.name,
    customer_phone: details.phone,
    table_label: details.table || null,
    note: details.note || null,
    client_key: clientKey,
  };
}

/** What one checkout attempt is keyed on: the cart and everything typed for it. */
export const foodAttemptSignature = (cartSignature: string, details: FoodOrderDetails): string =>
  `${cartSignature}#${JSON.stringify(details)}`;

/** A checkout attempt and the `client_key` minted for it. */
export interface FoodAttempt {
  signature: string;
  key: string;
}

/**
 * The attempt to keep for a signature: the current one while the signature is
 * unchanged — so a second tap or a retry after a closed sheet reaches the SAME
 * order on the server — and a newly minted key for a changed cart or details.
 * `mint` is the caller's own UUID source; this package has none.
 */
export function foodAttemptKey(current: FoodAttempt | null, signature: string, mint: () => string): FoodAttempt {
  return current?.signature === signature ? current : { signature, key: mint() };
}

/** One key per checkout attempt: `keyFor` answers `foodAttemptKey`'s, `reset` forgets a finished order's. */
export function createFoodClientKey(mint: () => string): { keyFor: (signature: string) => string; reset: () => void } {
  let attempt: FoodAttempt | null = null;
  return {
    keyFor: (signature) => {
      attempt = foodAttemptKey(attempt, signature, mint);
      return attempt.key;
    },
    reset: () => {
      attempt = null;
    },
  };
}

/** How long to wait before repeating a placement the server said is still being set up. */
export const FOOD_ORDER_CONFLICT_RETRY_MS = 1500;

/**
 * One placement, never throwing: the order placed, or — with `placement` null —
 * the error that refused it (null when the server simply answered with none).
 */
export async function tryPlaceFoodOrder(
  place: () => Promise<VenueFoodOrderPlacement | null>
): Promise<{ placement: VenueFoodOrderPlacement | null; error: unknown }> {
  try {
    return { placement: await place(), error: null };
  } catch (error) {
    return { placement: null, error };
  }
}

/** The kitchen's steps in order — the order page's timeline. CANCELLED sits outside it. */
export const FOOD_ORDER_FLOW: readonly VenueFoodOrderStatus[] = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'];

export const FOOD_ORDER_STATUS_KEYS: Record<VenueFoodOrderStatus, string> = {
  PLACED: 'mweb.venueFood.status.placed',
  ACCEPTED: 'mweb.venueFood.status.accepted',
  PREPARING: 'mweb.venueFood.status.preparing',
  READY: 'mweb.venueFood.status.ready',
  SERVED: 'mweb.venueFood.status.served',
  CANCELLED: 'mweb.venueFood.status.cancelled',
};

export const FOOD_PAYMENT_STATUS_KEYS: Record<VenueFoodPaymentStatus, string> = {
  PENDING: 'mweb.venueFood.payment.pending',
  PAID: 'mweb.venueFood.payment.paid',
  FAILED: 'mweb.venueFood.payment.failed',
  REFUND_PENDING: 'mweb.venueFood.payment.refundPending',
  REFUNDED: 'mweb.venueFood.payment.refunded',
};

export const FOOD_DIET_KEYS: Record<VenueFoodDiet, string> = {
  VEG: 'mweb.venueFood.diet.veg',
  NON_VEG: 'mweb.venueFood.diet.nonVeg',
  EGG: 'mweb.venueFood.diet.egg',
  VEGAN: 'mweb.venueFood.diet.vegan',
};

export const FOOD_SPICE_KEYS: Record<VenueFoodSpiceLevel, string> = {
  NONE: 'mweb.venueFood.spice.none',
  MILD: 'mweb.venueFood.spice.mild',
  MEDIUM: 'mweb.venueFood.spice.medium',
  HOT: 'mweb.venueFood.spice.hot',
  EXTRA_HOT: 'mweb.venueFood.spice.extraHot',
};

/** How many chillies a spice level is drawn with. */
export const FOOD_SPICE_HEAT: Record<VenueFoodSpiceLevel, number> = {
  NONE: 0,
  MILD: 1,
  MEDIUM: 2,
  HOT: 3,
  EXTRA_HOT: 4,
};

/** A dish a vegetarian can order. */
export const isVegFood = (diet: VenueFoodDiet): boolean => diet === 'VEG' || diet === 'VEGAN';

/** The codes the food-order mutations and query answer with. */
export const FOOD_ORDER_ERROR = {
  closed: 'FOOD_ORDERING_CLOSED',
  itemUnavailable: 'FOOD_ITEM_UNAVAILABLE',
  conflict: 'CONFLICT',
} as const;

const FOOD_ORDER_ERROR_KEYS: Record<string, string> = {
  FOOD_ORDERING_CLOSED: 'mweb.venueFood.errors.closed',
  FOOD_ITEM_UNAVAILABLE: 'mweb.venueFood.errors.itemUnavailable',
  BAD_USER_INPUT: 'mweb.venueFood.errors.badInput',
  CONFLICT: 'mweb.venueFood.errors.conflict',
  RATE_LIMITED: 'mweb.venueFood.errors.rateLimited',
  FORBIDDEN: 'mweb.venueFood.errors.forbidden',
  BAD_REQUEST: 'mweb.venueFood.errors.badRequest',
  NOT_FOUND: 'mweb.venueFood.errors.notFound',
};

export const FOOD_ORDER_GENERIC_ERROR_KEY = 'mweb.venueFood.errors.generic';

/** The `extensions.code` of a failed food-order call, or '' when it carried none (a network failure). */
export function foodOrderErrorCode(err: unknown): string {
  const code = firstGraphQLError(err)?.extensions?.code;
  return typeof code === 'string' ? code : '';
}

/** The sentence for a food-order error code; the generic one for a code this page does not know. */
export function foodOrderErrorKey(code: string | null | undefined, fallbackKey: string = FOOD_ORDER_GENERIC_ERROR_KEY): string {
  return FOOD_ORDER_ERROR_KEYS[code ?? ''] ?? fallbackKey;
}

/** Nothing more will happen to this order. */
export const isFoodOrderFinished = (order: Pick<VenueFoodOrder, 'status' | 'payment_status'>): boolean =>
  order.status === 'SERVED' || order.status === 'CANCELLED' || order.payment_status === 'FAILED';

export const FOOD_ORDER_POLL_MS = { payment: 8000, kitchen: 20_000 } as const;

/**
 * How often the order page re-reads: quickly while the payment is unconfirmed
 * (each read has the server recheck Razorpay), slowly while the kitchen works,
 * and not at all once the order is served or cancelled.
 */
export function foodOrderPollMs(order: Pick<VenueFoodOrder, 'status' | 'payment_status'> | null | undefined): number {
  if (!order || isFoodOrderFinished(order)) return 0;
  return order.payment_status === 'PENDING' ? FOOD_ORDER_POLL_MS.payment : FOOD_ORDER_POLL_MS.kitchen;
}

/**
 * The order's progress in the shape the product-order timeline already draws
 * (`DetailedTimelineStep`), so both orders share one timeline component.
 * A cancelled order is a single closing step carrying its reason; otherwise
 * every kitchen step shows, with the one the order is on marked current.
 */
export function buildFoodOrderTimeline(
  order: Pick<VenueFoodOrder, 'status' | 'created_at' | 'cancelled_at' | 'cancel_reason'>,
  t: (key: string) => string
): DetailedTimelineStep[] {
  const step = (status: VenueFoodOrderStatus, extra: Partial<DetailedTimelineStep>): DetailedTimelineStep => ({
    status,
    label: t(FOOD_ORDER_STATUS_KEYS[status]),
    done: false,
    current: false,
    at: null,
    location: '',
    note: '',
    tone: 'neutral',
    scans: [],
    ...extra,
  });
  if (order.status === 'CANCELLED') {
    return [step('CANCELLED', { current: true, at: order.cancelled_at, note: order.cancel_reason })];
  }
  const reached = FOOD_ORDER_FLOW.indexOf(order.status);
  return FOOD_ORDER_FLOW.map((status, index) => {
    const current = index === reached;
    let tone: DetailedTimelineStep['tone'] = 'neutral';
    if (index < reached || (current && status === 'SERVED')) tone = 'done';
    else if (current) tone = 'moving';
    return step(status, { done: index < reached, current, tone, at: status === 'PLACED' ? order.created_at : null });
  });
}
