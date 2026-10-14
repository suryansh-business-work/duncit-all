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
 * The server recomputes every price, the availability, the discount and the
 * coupon; what this module prices is only what the guest is shown before they
 * pay.
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

/** How GST meets a food price. Mirrors the server enum FoodTaxMode. */
export type VenueFoodTaxMode = 'INCLUSIVE' | 'EXCLUSIVE';

export const VENUE_FOOD_TAX_MODES = ['INCLUSIVE', 'EXCLUSIVE'] as const satisfies readonly VenueFoodTaxMode[];

/** The server's bounds on a food GST percent: whole numbers, 0 to the top GST slab. */
export const FOOD_GST_LIMITS = { min: 0, max: 28 } as const;

/** The GST a cart is priced with — `publicVenue.food_ordering` and `VenueFoodOrder` both fit as they are. */
export interface FoodCartTax {
  tax_mode: VenueFoodTaxMode;
  gst_pct: number;
}

/**
 * Whether the venue takes QR orders, what it takes off them, and the GST they
 * are priced with. `tax_mode` / `gst_pct` are what the server RESOLVED (the
 * venue's own while `tax_override`, otherwise Finance's default) — optional
 * only so a venue read by an older document still types.
 */
export interface VenueFoodOrdering {
  enabled: boolean;
  discount_pct: number;
  tax_override?: boolean;
  tax_mode?: VenueFoodTaxMode;
  gst_pct?: number;
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

/** What a guest said about a served order. Written once. */
export interface VenueFoodFeedback {
  /** 1 to 5. */
  rating: number;
  comment: string;
  images: string[];
  submitted_at: string;
}

export interface VenueFoodOrder {
  id: string;
  order_no: string;
  venue_id: string;
  venue_name: string;
  /**
   * What the invoice and the rating need: the venue's GST number and address as
   * they were when the order was placed, whether the invoice can be downloaded
   * yet, and what the guest said once it was served. Optional only so an order
   * read by an older document still types — the server always answers them.
   */
  venue_gstin?: string;
  venue_address?: string;
  invoice_available?: boolean;
  served_at?: string | null;
  subscribe_events?: boolean;
  feedback?: VenueFoodFeedback | null;
  customer_name: string;
  customer_phone: string;
  table_label: string;
  note: string;
  items: VenueFoodOrderLine[];
  subtotal: number;
  /** The venue's automatic discount on QR orders. */
  discount_pct: number;
  discount_amount: number;
  /**
   * The venue's coupon the order was placed with: its code (null without one),
   * its own percent and what it took off after the automatic discount. Optional
   * only so an order read by an older document still types — the server always
   * answers all three.
   */
  coupon_code?: string | null;
  coupon_pct?: number;
  coupon_discount_amount?: number;
  /**
   * The GST the order was priced with: how it met the price, its percent, the
   * value it was charged on and the tax itself (taxable_amount + tax_amount =
   * total). Optional only so an order read by an older document still types.
   */
  tax_mode?: VenueFoodTaxMode;
  gst_pct?: number;
  taxable_amount?: number;
  tax_amount?: number;
  /** What was charged: subtotal less both discounts, plus tax_amount when EXCLUSIVE. */
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
  /** A coupon of this venue. A different code is a different attempt — see `foodAttemptSignature`. */
  coupon_code?: string | null;
  /** The guest ticked "tell me about events here"; they are subscribed once the order is paid. */
  subscribe_events?: boolean;
  /** Minted once per checkout attempt; repeating it returns the same order. */
  client_key: string;
}

/** Why a coupon code cannot be used. Mirrors the server enum VenueFoodCouponRejection. */
export type VenueFoodCouponRejection =
  | 'INVALID'
  | 'NOT_STARTED'
  | 'EXPIRED'
  | 'MIN_ORDER_NOT_MET'
  | 'USAGE_LIMIT_REACHED'
  | 'PER_PERSON_LIMIT_REACHED'
  | 'NO_DISCOUNT';

export interface PreviewVenueFoodCouponInput {
  venue_id: string;
  coupon_code: string;
  items: VenueFoodOrderLineInput[];
  /** Lets the per-person limit be checked before the order is placed. */
  customer_phone?: string | null;
}

/** What a coupon code does to a cart. When `ok` is false the amounts are the cart's without the code. */
export interface VenueFoodCouponPreview {
  ok: boolean;
  reason: VenueFoodCouponRejection | null;
  /** The server's own sentence; null when ok. */
  message: string | null;
  /** The code as the venue wrote it; null unless ok. */
  coupon_code: string | null;
  coupon_pct: number;
  /** Rupees of subtotal the code needs; 0 when it needs none. */
  min_order_amount: number;
  subtotal: number;
  discount_pct: number;
  discount_amount: number;
  coupon_discount_amount: number;
  /** The venue's GST, exactly as placing the order would apply it. */
  tax_mode: VenueFoodTaxMode;
  gst_pct: number;
  taxable_amount: number;
  tax_amount: number;
  total: number;
  currency_symbol: string;
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
  /** The most a venue may take off an order, automatic discount and coupon together. */
  maxDiscountPct: 90,
  couponCodeMin: 3,
  couponCodeMax: 30,
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
        venue_gstin
        venue_address
        invoice_available
        served_at
        subscribe_events
        feedback {
          rating
          comment
          images
          submitted_at
        }
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
        coupon_code
        coupon_pct
        coupon_discount_amount
        tax_mode
        gst_pct
        taxable_amount
        tax_amount
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
      venue_gstin
      venue_address
      invoice_available
      served_at
      subscribe_events
      feedback {
        rating
        comment
        images
        submitted_at
      }
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
      coupon_code
      coupon_pct
      coupon_discount_amount
      tax_mode
      gst_pct
      taxable_amount
      tax_amount
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

/** Public: the invoice of a paid order as a base64 PDF, for whoever holds its access key. */
export const VENUE_FOOD_ORDER_INVOICE_QUERY = /* GraphQL */ `
  query VenueFoodOrderInvoice($orderId: ID!, $accessKey: String) {
    venueFoodOrderInvoicePdfBase64(order_id: $orderId, access_key: $accessKey)
  }
`;

/** Public: a one-shot pass to upload ONE feedback photo for a served, not yet rated order. */
export const VENUE_FOOD_FEEDBACK_UPLOAD_PASS_MUTATION = /* GraphQL */ `
  mutation VenueFoodFeedbackUploadPass($orderId: ID!, $accessKey: String) {
    venueFoodFeedbackUploadPass(order_id: $orderId, access_key: $accessKey) {
      uploadUrl
      ticket
    }
  }
`;

/** Public: rate a served order — once. Answers with the order, now carrying its feedback. */
export const SUBMIT_VENUE_FOOD_FEEDBACK_MUTATION = /* GraphQL */ `
  mutation SubmitVenueFoodFeedback($input: SubmitVenueFoodFeedbackInput!) {
    submitVenueFoodFeedback(input: $input) {
      id
      status
      feedback {
        rating
        comment
        images
        submitted_at
      }
    }
  }
`;

export interface SubmitVenueFoodFeedbackInput {
  order_id: string;
  access_key?: string | null;
  rating: number;
  comment?: string | null;
  images?: string[];
}

/** Where one feedback photo is POSTed, and the pass that lets it. */
export interface VenueFoodUploadPass {
  uploadUrl: string;
  ticket: string;
}

/** The server's own limits on a rating, so the form refuses what the server would. */
export const FOOD_FEEDBACK_LIMITS = { ratingMin: 1, ratingMax: 5, commentMax: 500, imagesMax: 3 } as const;

/** A served order nobody has rated yet — the only one the rating form is shown for. */
export const canRateFoodOrder = (order: Pick<VenueFoodOrder, 'status' | 'feedback'>): boolean =>
  order.status === 'SERVED' && !order.feedback;

/** A file name for the downloaded invoice. */
export const foodInvoiceFileName = (orderNo: string): string => `invoice-${orderNo}.pdf`;

/** Public and side-effect free: what a code would do to a cart. Ask again whenever the cart or the phone changes. */
/** Public: the coupons a guest can pick from at a venue's checkout right now, best first. */
export const AVAILABLE_VENUE_FOOD_COUPONS_QUERY = /* GraphQL */ `
  query AvailableVenueFoodCoupons($venueId: ID!) {
    availableVenueFoodCoupons(venue_id: $venueId) {
      code
      description
      discount_pct
      min_order_amount
      valid_until
    }
  }
`;

/** A coupon offered at checkout — only what choosing it needs. */
export interface AvailableVenueFoodCoupon {
  code: string;
  description: string;
  discount_pct: number;
  /** Rupees of subtotal the code needs; 0 when it needs none. */
  min_order_amount: number;
  valid_until: string | null;
}

export const PREVIEW_VENUE_FOOD_COUPON_QUERY = /* GraphQL */ `
  query PreviewVenueFoodCoupon($input: PreviewVenueFoodCouponInput!) {
    previewVenueFoodCoupon(input: $input) {
      ok
      reason
      message
      coupon_code
      coupon_pct
      min_order_amount
      subtotal
      discount_pct
      discount_amount
      coupon_discount_amount
      tax_mode
      gst_pct
      taxable_amount
      tax_amount
      total
      currency_symbol
    }
  }
`;

const toPaise = (rupees: number): number => Math.round((Number(rupees) || 0) * 100);

/** a ÷ b rounded half up, for a ≥ 0 and b > 0 — exact, never a float. The server rounds GST the same way. */
const roundHalfUp = (a: number, b: number): number => Math.floor((2 * a + b) / (2 * b));

/** A GST percent only a whole positive number may be; anything else is no tax. */
const wholePct = (pct: number): number => (Number.isInteger(pct) && pct > 0 ? pct : 0);

/** What a cart costs, in rupees for display and in paise for comparing. */
export interface FoodCartPrice {
  /** Dishes in the cart, counting each quantity. */
  count: number;
  subtotalPaise: number;
  /** The venue's automatic discount only — the coupon is counted apart. */
  discountPaise: number;
  /** What the coupon takes off; 0 without one. */
  couponPaise: number;
  /** How the GST met the price, and the whole percent it was priced at (0 = none). */
  taxMode: VenueFoodTaxMode;
  gstPct: number;
  /** The value the GST is charged on, and the GST — together they are the total. */
  taxablePaise: number;
  taxPaise: number;
  totalPaise: number;
  subtotal: number;
  discount: number;
  coupon: number;
  taxable: number;
  tax: number;
  total: number;
  /** Too small for the gateway to charge, before GST — the server refuses it too. */
  belowMinimum: boolean;
  /** A coupon was given but the cart is under its minimum order, so it took nothing off. */
  couponUnmet: boolean;
}

/** The coupon a cart is priced with — an accepted `VenueFoodCouponPreview` fits as it is. */
export interface FoodCartCoupon {
  coupon_pct: number;
  /** Rupees of subtotal the code needs. */
  min_order_amount?: number | null;
}

/**
 * Price a cart exactly as the server will: every line in integer paise, the
 * discount rounded DOWN to a paisa (so the venue never gives away more than
 * the percent it set), then the coupon's percent off WHAT IS LEFT, rounded
 * down too. The coupon is trimmed — never refused — so the guest still pays
 * what the largest discount a venue may set would leave, and at least what the
 * gateway can charge.
 *
 * GST then meets what is left (the "net"), rounded HALF UP to a whole paisa in
 * integer arithmetic — INCLUSIVE carves it out of the net (taxable =
 * round(net × 100 / (100 + pct)), tax = net − taxable, total = net); EXCLUSIVE
 * adds it on top (tax = round(net × pct / 100), total = net + tax). No tax, or
 * a percent that is not a whole positive number, prices exactly as before.
 */
export function priceFoodCart(
  lines: ReadonlyArray<{ unit_price: number; quantity: number }>,
  discountPct: number,
  coupon?: FoodCartCoupon | null,
  tax?: FoodCartTax | null
): FoodCartPrice {
  let count = 0;
  let subtotalPaise = 0;
  for (const line of lines) {
    count += line.quantity;
    subtotalPaise += toPaise(line.unit_price) * line.quantity;
  }
  const pct = Math.max(0, Number(discountPct) || 0);
  const discountPaise = Math.floor((subtotalPaise * pct) / 100);
  const afterDiscount = subtotalPaise - discountPaise;
  const minOrderPaise = toPaise(coupon?.min_order_amount ?? 0);
  const couponUnmet = Boolean(coupon) && subtotalPaise < minOrderPaise;
  const couponPct = couponUnmet ? 0 : Math.max(0, Number(coupon?.coupon_pct) || 0);
  const leastPayable = Math.max(
    FOOD_ORDER_LIMITS.minTotalPaise,
    subtotalPaise - Math.floor((subtotalPaise * FOOD_ORDER_LIMITS.maxDiscountPct) / 100)
  );
  const couponPaise = Math.max(0, Math.min(Math.floor((afterDiscount * couponPct) / 100), afterDiscount - leastPayable));
  const netPaise = afterDiscount - couponPaise;
  const gstPct = wholePct(Number(tax?.gst_pct));
  const taxMode: VenueFoodTaxMode = tax?.tax_mode === 'EXCLUSIVE' ? 'EXCLUSIVE' : 'INCLUSIVE';
  const taxablePaise = taxMode === 'EXCLUSIVE' ? netPaise : roundHalfUp(netPaise * 100, 100 + gstPct);
  const taxPaise = taxMode === 'EXCLUSIVE' ? roundHalfUp(netPaise * gstPct, 100) : netPaise - taxablePaise;
  const totalPaise = taxablePaise + taxPaise;
  return {
    count,
    subtotalPaise,
    discountPaise,
    couponPaise,
    taxMode,
    gstPct,
    taxablePaise,
    taxPaise,
    totalPaise,
    subtotal: subtotalPaise / 100,
    discount: discountPaise / 100,
    coupon: couponPaise / 100,
    taxable: taxablePaise / 100,
    tax: taxPaise / 100,
    total: totalPaise / 100,
    belowMinimum: netPaise < FOOD_ORDER_LIMITS.minTotalPaise,
    couponUnmet,
  };
}

/** The GST line a cart or an order shows under its discounts. */
export interface FoodTaxLine {
  mode: VenueFoodTaxMode;
  pct: number;
  /** Rupees: added on top (EXCLUSIVE) or already inside the total (INCLUSIVE). */
  amount: number;
}

/**
 * The GST line for a cart (`taxMode`, `gstPct`, `tax` of a `FoodCartPrice`) or
 * an order (`tax_mode`, `gst_pct`, `tax_amount`); none at 0% — an order from
 * before GST shows no line at all.
 */
export const foodTaxLine = (
  mode: VenueFoodTaxMode | null | undefined,
  pct: number | null | undefined,
  amount: number | null | undefined
): FoodTaxLine | null =>
  pct && pct > 0 ? { mode: mode === 'EXCLUSIVE' ? 'EXCLUSIVE' : 'INCLUSIVE', pct, amount: amount ?? 0 } : null;

/** The GST a venue's cart is priced with, from its `food_ordering`; none when the server did not say. */
export const foodCartTaxOf = (ordering: Partial<FoodCartTax> | null | undefined): FoodCartTax | null =>
  ordering?.tax_mode ? { tax_mode: ordering.tax_mode, gst_pct: Number(ordering.gst_pct) || 0 } : null;

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
export function priceFoodCartLines(
  lines: ReadonlyArray<FoodCartLine>,
  discountPct: number,
  coupon?: FoodCartCoupon | null,
  tax?: FoodCartTax | null
): FoodCartPrice {
  return priceFoodCart(
    lines.map((line) => ({ unit_price: line.item.price, quantity: line.quantity })),
    discountPct,
    coupon,
    tax
  );
}

/** The cart as the place-order mutation and the coupon preview take it. */
export const foodOrderLineInputs = (lines: ReadonlyArray<FoodCartLine>): VenueFoodOrderLineInput[] =>
  lines.map((line) => ({ item_id: line.item.id, quantity: line.quantity }));

/** A coupon code as the server stores and compares it: trimmed and upper-cased; '' for none. */
export const normalizeFoodCouponCode = (code: string | null | undefined): string => (code ?? '').trim().toUpperCase();

/** Changes whenever the cart's contents do — a checkout attempt is keyed on it. */
export const foodCartSignature = (lines: ReadonlyArray<FoodCartLine>): string =>
  lines.map((line) => `${line.item.id}:${line.quantity}`).join('|');

/** What the guest typed at checkout. An empty table, note or coupon is sent as none. */
export interface FoodOrderDetails {
  name: string;
  phone: string;
  table?: string | null;
  note?: string | null;
  /** The coupon code applied to this attempt, if any. */
  coupon?: string | null;
  /** The guest asked to hear about this venue's events. */
  subscribe?: boolean;
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
  const coupon = normalizeFoodCouponCode(details.coupon);
  return {
    venue_id: venueId,
    items: foodOrderLineInputs(lines),
    customer_name: details.name,
    customer_phone: details.phone,
    table_label: details.table || null,
    note: details.note || null,
    // Left out entirely without a coupon, so such an order is sent exactly as it always was.
    ...(coupon ? { coupon_code: coupon } : {}),
    // Left out unless ticked, for the same reason.
    ...(details.subscribe ? { subscribe_events: true } : {}),
    client_key: clientKey,
  };
}

/**
 * What one checkout attempt is keyed on: the cart and everything typed for it,
 * the coupon included — applying, changing or removing a code is a new attempt
 * with a new `client_key`, because the server answers a repeated key with the
 * order it already priced. The code is compared as the server compares it, so
 * retyping it in another case is not a new attempt.
 */
export const foodAttemptSignature = (cartSignature: string, details: FoodOrderDetails): string => {
  const { coupon, ...typed } = details;
  const code = normalizeFoodCouponCode(coupon);
  return `${cartSignature}#${JSON.stringify(code ? { ...typed, coupon: code } : typed)}`;
};

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
  /** The order's coupon can no longer be used; `foodCouponRejectionOf` says why. Nothing was placed. */
  couponRejected: 'FOOD_COUPON_REJECTED',
} as const;

const FOOD_ORDER_ERROR_KEYS: Record<string, string> = {
  FOOD_ORDERING_CLOSED: 'mweb.venueFood.errors.closed',
  FOOD_ITEM_UNAVAILABLE: 'mweb.venueFood.errors.itemUnavailable',
  FOOD_COUPON_REJECTED: 'mweb.venueFood.errors.couponRejected',
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

/** The sentence for each reason a coupon code is refused — by the preview, or by placing the order. */
export const FOOD_COUPON_REJECTION_KEYS: Record<VenueFoodCouponRejection, string> = {
  INVALID: 'mweb.venueFood.coupon.rejected.invalid',
  NOT_STARTED: 'mweb.venueFood.coupon.rejected.notStarted',
  EXPIRED: 'mweb.venueFood.coupon.rejected.expired',
  MIN_ORDER_NOT_MET: 'mweb.venueFood.coupon.rejected.minOrder',
  USAGE_LIMIT_REACHED: 'mweb.venueFood.coupon.rejected.usageLimit',
  PER_PERSON_LIMIT_REACHED: 'mweb.venueFood.coupon.rejected.perPerson',
  NO_DISCOUNT: 'mweb.venueFood.coupon.rejected.noDiscount',
};

const isFoodCouponRejection = (reason: unknown): reason is VenueFoodCouponRejection =>
  typeof reason === 'string' && Object.keys(FOOD_COUPON_REJECTION_KEYS).includes(reason);

/**
 * Why a placement was refused over its coupon: the `extensions.reason` of a
 * FOOD_COUPON_REJECTED error, or null for any other failure.
 */
export function foodCouponRejectionOf(err: unknown): VenueFoodCouponRejection | null {
  const reason = firstGraphQLError(err)?.extensions?.reason;
  return isFoodCouponRejection(reason) ? reason : null;
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
