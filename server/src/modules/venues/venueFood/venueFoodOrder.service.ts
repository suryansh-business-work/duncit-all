import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { secretKey } from '@modules/commerce/store/store.shared';
import { getFinanceSettings, type IFinanceSettings } from '@modules/finance/finance/finance.model';
import { effectiveFoodTax, foodTaxDefaultsOf, type FoodTax } from '@modules/finance/finance/foodTaxDefaults';
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  type RazorpayKeys,
} from '@modules/finance/payment/razorpay.gateway';
import { nextEntityNo } from '@modules/venues/entityIdCounter';
import { VenueModel, type IVenue, type IVenueFoodItem } from '@modules/venues/venue/venue.model';
import { logs } from '@observability/log';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import {
  FOOD_ORDER_STATUSES,
  VenueFoodOrderModel,
  type FoodOrderStatus,
  type IFoodOrderLine,
  type IVenueFoodOrder,
} from './venueFoodOrder.model';
import type { IVenueFoodCoupon } from './venueFoodCoupon.model';
import {
  couponRefused,
  evaluateFoodCoupon,
  normalizeFoodCouponCode,
  rejected,
  releaseFoodCouponUse,
  type FoodCouponRejection,
} from './venueFoodCoupon.redemption';
import { markFoodOrderPaid, recheckOnRead, settleFoodRefund } from './venueFoodOrder.payment';
import { MIN_TOTAL_PAISE, foodTotals, preTaxPaise, type FoodTotals } from './venueFoodOrder.pricing';
import {
  FOOD_LOG,
  assertOrderAccess,
  badInput,
  fail,
  managedVenue,
  objectId,
  orderingClosed,
  razorpayKeysFor,
  rupees,
  text,
  toFoodOrderPub,
} from './venueFoodOrder.shared';
import { whatsappFoodOrderCancelled, whatsappFoodOrderStatus } from './venueFoodOrder.whatsapp';

/**
 * Scan-and-order at a venue. A guest — signed in or not — picks dishes on the
 * venue's public page and pays the venue's own Razorpay account; the venue
 * then works the order through its board.
 *
 * Nothing the browser sends is trusted for money: prices, availability, the
 * discount and the coupon are all read from the venue at the moment the order
 * is placed.
 */

/** A key the page minted with crypto.randomUUID (or longer) for one checkout attempt. */
const CLIENT_KEY = /^[\w-]{24,80}$/;
const PHONE = /^\d{10}$/;
const MAX_LINES = 30;
const MAX_QUANTITY = 20;
const DUPLICATE_KEY = 11000;

/** The kitchen's path. An order only ever moves forward along it. */
const FLOW: FoodOrderStatus[] = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED'];
/** What the venue's board lists: orders whose money actually arrived. */
const BOARD_PAYMENT_STATUSES = ['PAID', 'REFUND_PENDING', 'REFUNDED'];

const ORDER_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['order_no', 'customer_name', 'customer_phone', 'table_label'],
  sortFields: { order_no: 'order_no', created_at: 'created_at', total: 'total_paise', status: 'status' },
  filterFields: {
    status: { type: 'enum' },
    payment_status: { type: 'enum' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

export interface PlaceFoodOrderInput {
  venue_id: string;
  items: Array<{ item_id: string; quantity: number }>;
  customer_name: string;
  customer_phone: string;
  table_label?: string | null;
  note?: string | null;
  /** A coupon of this venue. A different code is a different checkout attempt, so it needs its own `client_key`. */
  coupon_code?: string | null;
  /** The guest asked to hear about this venue's events. Acted on once the order is paid. */
  subscribe_events?: boolean | null;
  client_key: string;
}

export interface PreviewFoodCouponInput {
  venue_id: string;
  coupon_code: string;
  items: PlaceFoodOrderInput['items'];
  customer_phone?: string | null;
}

export interface VerifyFoodOrderInput {
  order_id: string;
  access_key?: string | null;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/** A venue that can be ordered from right now: live, serving food, ordering on, an account to be paid on. */
async function orderableVenue(venueId: Types.ObjectId, finance: IFinanceSettings) {
  const venue = await VenueModel.findById(venueId).select(
    'venue_name status is_active offers_food food_menu food_ordering gstin address_line1 address_line2 locality city state postal_code'
  );
  if (!venue || venue.status !== 'APPROVED' || venue.is_active === false) return fail('NOT_FOUND', 'Venue not found');
  const ordering = venue.food_ordering;
  if (!venue.offers_food || !ordering?.enabled || !ordering.razorpay_integration_id) return orderingClosed();
  return {
    venue,
    integrationId: ordering.razorpay_integration_id,
    discountPct: ordering.discount_pct ?? 0,
    // The venue's own GST while it overrides, otherwise Finance's default — read now, snapshotted on the order.
    tax: effectiveFoodTax(ordering, foodTaxDefaultsOf(finance)),
  };
}

/** The venue's address on one line, as its invoice prints it. */
const invoiceAddress = (venue: Pick<IVenue, 'address_line1' | 'address_line2' | 'locality' | 'city' | 'state' | 'postal_code'>) =>
  [venue.address_line1, venue.address_line2, venue.locality, venue.city, venue.state, venue.postal_code]
    .map((part) => text(part))
    .filter(Boolean)
    .join(', ');

function cleanCustomer(input: PlaceFoodOrderInput) {
  const name = text(input.customer_name);
  if (name.length < 2 || name.length > 80) badInput('Enter your name');
  const phone = text(input.customer_phone).replaceAll(/\D/g, '');
  if (!PHONE.test(phone)) badInput('Enter a valid 10-digit mobile number');
  const table = text(input.table_label);
  if (table.length > 20) badInput('Keep the table or seat under 20 characters');
  const note = text(input.note);
  if (note.length > 300) badInput('Keep the note under 300 characters');
  return { customer_name: name, customer_phone: phone, table_label: table, note };
}

/** How many of each dish, one entry per dish however many times the cart listed it. */
function quantities(items: PlaceFoodOrderInput['items']) {
  if (!Array.isArray(items) || items.length === 0) badInput('Your cart is empty');
  const wanted = new Map<string, number>();
  for (const item of items) {
    const quantity = Number(item?.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) badInput('Choose a valid quantity');
    const id = text(item?.item_id);
    wanted.set(id, (wanted.get(id) ?? 0) + quantity);
  }
  if (wanted.size > MAX_LINES) badInput(`One order can hold at most ${MAX_LINES} different items`);
  return wanted;
}

/** The cart priced from the venue's own menu — the only prices an order is ever charged at. */
function priceLines(menu: IVenueFoodItem[], items: PlaceFoodOrderInput['items']): IFoodOrderLine[] {
  const dishes = new Map(menu.map((dish) => [dish._id.toHexString(), dish]));
  return [...quantities(items)].map(([id, quantity]) => {
    const dish = dishes.get(id);
    if (!dish) return fail('FOOD_ITEM_UNAVAILABLE', 'An item in your cart is no longer on the menu');
    if (dish.is_available === false) return fail('FOOD_ITEM_UNAVAILABLE', `${dish.name} is not available right now`);
    if (quantity > MAX_QUANTITY) badInput(`You can order at most ${MAX_QUANTITY} of ${dish.name}`);
    const unitPaise = Math.round(dish.price * 100);
    return { item_id: dish._id, name: dish.name, diet: dish.diet, unit_paise: unitPaise, quantity, line_paise: unitPaise * quantity };
  });
}

/**
 * The cart's totals with the venue's own discount and no coupon. A coupon can
 * only ever be trimmed to keep an order chargeable (see `foodTotals`), so an
 * order too small to pay online is too small with or without one. The minimum
 * is held to the amount before GST, exactly as before tax existed.
 */
function totalsFor(lines: IFoodOrderLine[], discountPct: number, tax: FoodTax) {
  const totals = foodTotals(
    lines.reduce((sum, line) => sum + line.line_paise, 0),
    discountPct,
    0,
    tax
  );
  if (preTaxPaise(totals) < MIN_TOTAL_PAISE) badInput('This order is too small to pay online');
  return totals;
}

interface CouponPricing {
  totals: FoodTotals;
  coupon: IVenueFoodCoupon | null;
  rejection: FoodCouponRejection | null;
}

/**
 * The same cart priced with a coupon of this venue. A code that cannot be used
 * comes back as the reason beside the totals WITHOUT it, so a preview can still
 * show the guest what they will pay.
 */
async function totalsWithCoupon(
  plain: FoodTotals,
  check: { venueId: Types.ObjectId; code: string; phone: string; currencySymbol: string }
): Promise<CouponPricing> {
  const verdict = await evaluateFoodCoupon({ ...check, subtotalPaise: plain.subtotal_paise });
  if ('rejection' in verdict) return { totals: plain, coupon: null, rejection: verdict.rejection };
  // The same GST rule as the cart without it: a coupon changes the net, never the tax.
  const totals = foodTotals(plain.subtotal_paise, plain.discount_pct, verdict.coupon.discount_pct, {
    tax_mode: plain.tax_mode,
    gst_pct: plain.gst_pct,
  });
  // Nothing left for the code to take off: using it would spend one of its uses on no discount at all.
  if (totals.coupon_discount_paise === 0) {
    return { totals: plain, coupon: null, ...rejected('NO_DISCOUNT', 'This order already has the largest discount it can take') };
  }
  return { totals, coupon: verdict.coupon, rejection: null };
}

const attemptOf = (venueId: Types.ObjectId, clientKey: string) =>
  VenueFoodOrderModel.findOne({ venue_id: venueId, client_key: clientKey }).select('+access_key');

const sheetFor = (order: IVenueFoodOrder, keyId: string) => ({
  key_id: keyId,
  order_id: order.razorpay_order_id,
  amount: order.total_paise,
  currency: 'INR',
  name: order.venue_name,
  description: order.order_no,
  prefill_contact: order.customer_phone,
});

/** What the page gets back: the order, the key that proves it is theirs, and the sheet while it is still unpaid. */
async function placementOf(order: IVenueFoodOrder, keys?: RazorpayKeys) {
  const unpaid = order.payment_status === 'PENDING';
  if (unpaid && !order.razorpay_order_id) {
    return fail('CONFLICT', 'Your order is still being set up — try again in a moment');
  }
  const keyId = unpaid ? (keys ?? (await razorpayKeysFor(order.razorpay_integration_id))).keyId : '';
  return { order: toFoodOrderPub(order), access_key: order.access_key, razorpay: unpaid ? sheetFor(order, keyId) : null };
}

const isDuplicateKey = (error: unknown) => (error as { code?: number } | null)?.code === DUPLICATE_KEY;

/** Open the Razorpay order for a freshly written food order; one that cannot be opened was never payable, so it is removed. */
async function openGatewayOrder(order: IVenueFoodOrder, keys: RazorpayKeys) {
  try {
    const gateway = await createRazorpayOrder({
      amountPaise: order.total_paise,
      currency: 'INR',
      receipt: order.order_no,
      notes: { kind: 'venue_food', venue_id: order.venue_id.toHexString(), order_no: order.order_no },
      account: keys,
    });
    order.razorpay_order_id = gateway.id;
    await order.save();
  } catch (error) {
    await order.deleteOne();
    logs.server.warn(FOOD_LOG, 'place', { error, venueId: order.venue_id.toHexString(), msg: 'Razorpay order could not be opened' });
    orderingClosed('This venue cannot take online payments right now — please order at the counter');
  }
}

async function managedOrder(userId: string, isAdmin: boolean, orderId: string) {
  const order = await VenueFoodOrderModel.findById(objectId(orderId, 'Invalid order id'));
  if (!order) return fail('NOT_FOUND', 'Order not found');
  await managedVenue(userId, isAdmin, order.venue_id.toHexString());
  return order;
}

export const venueFoodOrderService = {
  /**
   * Place an order and open its payment. Safe to repeat: the same
   * `client_key` returns the order it already made instead of a second one —
   * priced as it was, even if its coupon has since expired or run out, because
   * the repeat is answered before any coupon is looked at.
   */
  async place(ctx: GraphQLContext, input: PlaceFoodOrderInput) {
    const clientKey = text(input.client_key);
    if (!CLIENT_KEY.test(clientKey)) badInput('Your order session has expired — refresh the page');
    const venueId = objectId(input.venue_id, 'Invalid venue id');
    const repeat = await attemptOf(venueId, clientKey);
    if (repeat) return placementOf(repeat);

    const finance = await getFinanceSettings();
    const { venue, integrationId, discountPct, tax } = await orderableVenue(venueId, finance);
    const customer = cleanCustomer(input);
    const lines = priceLines(venue.food_menu ?? [], input.items);
    const plain = totalsFor(lines, discountPct, tax);
    const keys = await razorpayKeysFor(integrationId);
    const code = normalizeFoodCouponCode(input.coupon_code);
    const priced: CouponPricing = code
      ? await totalsWithCoupon(plain, {
          venueId,
          code,
          phone: customer.customer_phone,
          currencySymbol: finance.currency_symbol,
        })
      : { totals: plain, coupon: null, rejection: null };
    // Never fall back to the full price: the guest was quoted the discounted one.
    if (priced.rejection) couponRefused(priced.rejection);
    const userId = ctx.user?.id && Types.ObjectId.isValid(ctx.user.id) ? new Types.ObjectId(ctx.user.id) : null;

    let order: IVenueFoodOrder;
    try {
      order = await VenueFoodOrderModel.create({
        order_no: await nextEntityNo('FOOD', 'venue_food_order'),
        venue_id: venueId,
        venue_name: venue.venue_name,
        venue_gstin: text(venue.gstin),
        venue_address: invoiceAddress(venue),
        subscribe_events: input.subscribe_events === true,
        user_id: userId,
        ...customer,
        lines,
        ...priced.totals,
        ...(priced.coupon ? { coupon_id: priced.coupon._id, coupon_code: priced.coupon.code } : {}),
        currency_symbol: finance.currency_symbol,
        razorpay_integration_id: integrationId,
        client_key: clientKey,
        access_key: secretKey(),
      });
    } catch (error) {
      // Two taps raced: the unique index let one through, and this one reads it.
      const twin = isDuplicateKey(error) ? await attemptOf(venueId, clientKey) : null;
      if (!twin) throw error;
      return placementOf(twin);
    }
    await openGatewayOrder(order, keys);
    return placementOf(order, keys);
  },

  /**
   * What a coupon code would do to this cart, for the guest to see before they
   * pay. Reads only — it places nothing and counts nothing. A code that cannot
   * be used is answered with its reason and the totals without it; the venue,
   * the cart and the menu are refused exactly as placing would refuse them.
   */
  async previewCoupon(input: PreviewFoodCouponInput) {
    const venueId = objectId(input.venue_id, 'Invalid venue id');
    const finance = await getFinanceSettings();
    const { venue, discountPct, tax } = await orderableVenue(venueId, finance);
    const plain = totalsFor(priceLines(venue.food_menu ?? [], input.items), discountPct, tax);
    const { totals, coupon, rejection } = await totalsWithCoupon(plain, {
      venueId,
      code: normalizeFoodCouponCode(input.coupon_code),
      phone: text(input.customer_phone),
      currencySymbol: finance.currency_symbol,
    });
    return {
      ok: !rejection,
      reason: rejection?.reason ?? null,
      message: rejection?.message ?? null,
      coupon_code: coupon?.code ?? null,
      coupon_pct: totals.coupon_pct,
      min_order_amount: rupees(coupon?.min_order_paise ?? 0),
      subtotal: rupees(totals.subtotal_paise),
      discount_pct: totals.discount_pct,
      discount_amount: rupees(totals.discount_paise),
      coupon_discount_amount: rupees(totals.coupon_discount_paise),
      tax_mode: totals.tax_mode,
      gst_pct: totals.gst_pct,
      taxable_amount: rupees(totals.taxable_paise),
      tax_amount: rupees(totals.tax_paise),
      total: rupees(totals.total_paise),
      currency_symbol: finance.currency_symbol,
    };
  },

  /** The Razorpay sheet came back with a signature: check it against the venue's own secret and mark the order paid. */
  async verify(ctx: GraphQLContext, input: VerifyFoodOrderInput) {
    const order = await VenueFoodOrderModel.findById(objectId(input.order_id, 'Invalid order id')).select('+access_key');
    if (!order) return fail('NOT_FOUND', 'Order not found');
    assertOrderAccess(ctx, order, input.access_key);
    if (order.payment_status !== 'PENDING') return toFoodOrderPub(order);
    if (!order.razorpay_order_id || order.razorpay_order_id !== input.razorpay_order_id) {
      return fail('BAD_REQUEST', 'This payment does not belong to this order');
    }
    const genuine = await verifyRazorpaySignature({
      orderId: input.razorpay_order_id,
      paymentId: input.razorpay_payment_id,
      signature: input.razorpay_signature,
      account: await razorpayKeysFor(order.razorpay_integration_id),
    });
    if (!genuine) return fail('BAD_REQUEST', 'Payment verification failed');
    const paid = await markFoodOrderPaid(order._id, input.razorpay_payment_id);
    return toFoodOrderPub(paid ?? order);
  },

  /** The guest's order page. An order still unpaid is rechecked with Razorpay, so a closed sheet still ends as paid. */
  async read(ctx: GraphQLContext, orderId: string, accessKey?: string | null) {
    if (!Types.ObjectId.isValid(orderId)) return null;
    const order = await VenueFoodOrderModel.findById(orderId).select('+access_key');
    if (!order) return null;
    assertOrderAccess(ctx, order, accessKey);
    return toFoodOrderPub(await recheckOnRead(order));
  },

  /** The venue's order board (DUNCIT TABLE CONTRACT v1). The venue filter is pinned, so no client filter can widen it. */
  async table(userId: string, isAdmin: boolean, venueId: string, input?: TableQueryInput | null) {
    const venue = await managedVenue(userId, isAdmin, venueId);
    const { docs, total, page, page_size } = await runTableQuery<IVenueFoodOrder>(
      VenueFoodOrderModel,
      { venue_id: venue._id, payment_status: { $in: BOARD_PAYMENT_STATUSES } },
      input,
      ORDER_TABLE_CONFIG
    );
    return { rows: docs.map(toFoodOrderPub), total, page, page_size };
  },

  /** Move a paid order forward along the kitchen's path. The write is guarded by the status it was read at. */
  async setStatus(userId: string, isAdmin: boolean, orderId: string, status: string) {
    const order = await managedOrder(userId, isAdmin, orderId);
    const next = FLOW.indexOf(status as FoodOrderStatus);
    if (!FOOD_ORDER_STATUSES.includes(status as FoodOrderStatus) || next < 0) badInput('Choose a valid order status');
    if (order.payment_status !== 'PAID') fail('BAD_REQUEST', 'Only a paid order can be moved');
    if (next <= FLOW.indexOf(order.status)) fail('BAD_REQUEST', 'An order can only move forward');
    const moved = await VenueFoodOrderModel.findOneAndUpdate(
      { _id: order._id, status: order.status, payment_status: 'PAID' },
      { $set: { status, ...(status === 'SERVED' ? { served_at: new Date() } : {}) } },
      { new: true }
    );
    if (!moved) return fail('CONFLICT', 'This order was just updated — refresh and try again');
    // That write matched once, so the guest is told once. Best effort — it never fails the move.
    await whatsappFoodOrderStatus(moved);
    return toFoodOrderPub(moved);
  },

  /**
   * Cancel a paid order the kitchen cannot serve and send the money back.
   * The order is stamped as owing a refund in the same write that cancels it,
   * so a refund that times out is finished by the sweep, never forgotten.
   */
  async cancel(userId: string, isAdmin: boolean, orderId: string, reason: string) {
    const order = await managedOrder(userId, isAdmin, orderId);
    const why = text(reason);
    if (why.length < 3 || why.length > 300) badInput('Tell the guest why the order is cancelled');
    const cancelled = await VenueFoodOrderModel.findOneAndUpdate(
      { _id: order._id, status: { $nin: ['SERVED', 'CANCELLED'] }, payment_status: 'PAID' },
      { $set: { status: 'CANCELLED', payment_status: 'REFUND_PENDING', cancelled_at: new Date(), cancel_reason: why } },
      { new: true }
    );
    if (!cancelled) return fail('BAD_REQUEST', 'This order can no longer be cancelled');
    logs.server.info(FOOD_LOG, 'cancel', { orderNo: cancelled.order_no, by: userId, isAdmin, totalPaise: cancelled.total_paise });
    // That write matched once, so the coupon's use is given back once.
    await releaseFoodCouponUse(cancelled);
    try {
      await settleFoodRefund(cancelled);
    } catch (error) {
      logs.server.warn(FOOD_LOG, 'refund', { error, orderNo: cancelled.order_no, msg: 'refund deferred to the sweep' });
    }
    await whatsappFoodOrderCancelled(cancelled);
    const fresh = await VenueFoodOrderModel.findById(cancelled._id);
    return toFoodOrderPub(fresh ?? cancelled);
  },
};
