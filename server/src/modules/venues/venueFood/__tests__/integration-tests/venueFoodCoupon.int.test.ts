import crypto from 'node:crypto';
import type { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import * as gateway from '@modules/finance/payment/razorpay.gateway';
import { updateFoodTaxDefaults } from '@modules/finance/finance/foodTaxDefaults';
import { PartnerIntegrationModel } from '@modules/venues/ecommBrand/partnerIntegration.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { logs } from '@observability/log';
import { venueFoodResolvers } from '../../venueFood.resolver';
import { VenueFoodCouponModel } from '../../venueFoodCoupon.model';
import { venueFoodCouponService, type CreateFoodCouponInput } from '../../venueFoodCoupon.service';
import { VenueFoodOrderModel } from '../../venueFoodOrder.model';
import { markFoodOrderPaid } from '../../venueFoodOrder.payment';
import { venueFoodOrderService } from '../../venueFoodOrder.service';
import { PRICING_CASES } from '../foodTestKit';

/**
 * Venue-owned coupons on food orders, against the in-memory database. Razorpay
 * is the only thing replaced: every price, every guard and every counter here
 * is the real one.
 */
jest.mock('@modules/finance/payment/razorpay.gateway');
const rzp = jest.mocked(gateway);

const guest = { user: null } as unknown as GraphQLContext;
const signedIn = (id: string, roles: string[] = []) => ({ user: { id, roles } }) as unknown as GraphQLContext;

const DAY_MS = 24 * 60 * 60 * 1000;
const PHONE = '9876543210';
const OTHER_PHONE = '9123456780';

const clientKey = () => crypto.randomUUID();

interface Dish {
  name: string;
  price: number;
}

/** The venue's own GST; left out, the venue follows Finance's default. */
interface VenueTax {
  tax_mode: 'INCLUSIVE' | 'EXCLUSIVE';
  gst_pct: number;
}

async function makeVenue(options: { dishes?: Dish[]; discountPct?: number; owner?: Types.ObjectId; tax?: VenueTax } = {}) {
  const owner = options.owner ?? new Types.ObjectId();
  const account = await PartnerIntegrationModel.create({
    owner_user_id: owner,
    provider: 'RAZORPAY',
    integrations: { razorpay: { key_id: 'rzp_test_venue', key_secret: 'venue-secret', connected: true } },
  });
  const venue = await VenueModel.create({
    owner_user_id: owner,
    venue_name: 'Cafe Uno',
    status: 'APPROVED',
    is_active: true,
    offers_food: true,
    food_menu: (options.dishes ?? [{ name: 'Paneer Tikka', price: 240 }]).map((dish) => ({ ...dish, diet: 'VEG' })),
    food_ordering: {
      enabled: true,
      razorpay_integration_id: account._id,
      discount_pct: options.discountPct ?? 0,
      ...(options.tax ? { tax_override: true, ...options.tax } : {}),
    },
  });
  return {
    venueId: venue._id.toHexString(),
    ownerId: owner.toHexString(),
    dishIds: venue.food_menu.map((dish) => dish._id.toHexString()),
  };
}

type Venue = Awaited<ReturnType<typeof makeVenue>>;

const makeCoupon = (venue: Venue, terms: Partial<CreateFoodCouponInput> = {}) =>
  venueFoodCouponService.create(venue.ownerId, false, { venue_id: venue.venueId, code: 'WELCOME20', discount_pct: 20, ...terms });

interface CartOptions {
  coupon?: string | null;
  phone?: string;
  quantity?: number;
  key?: string;
}

const cartOf = (venue: Venue, quantity: number) => venue.dishIds.map((item_id) => ({ item_id, quantity }));

const place = (venue: Venue, options: CartOptions = {}) =>
  venueFoodOrderService.place(guest, {
    venue_id: venue.venueId,
    items: cartOf(venue, options.quantity ?? 2),
    customer_name: 'Asha Rao',
    customer_phone: options.phone ?? PHONE,
    coupon_code: options.coupon,
    client_key: options.key ?? clientKey(),
  });

const preview = (venue: Venue, coupon: string, options: Omit<CartOptions, 'coupon' | 'key'> = {}) =>
  venueFoodOrderService.previewCoupon({
    venue_id: venue.venueId,
    coupon_code: coupon,
    items: cartOf(venue, options.quantity ?? 2),
    customer_phone: options.phone,
  });

const pay = (orderId: string) => markFoodOrderPaid(new Types.ObjectId(orderId), `pay_${orderId}`);

/** Place with a coupon and pay — one counted use. */
async function redeem(venue: Venue, options: CartOptions = {}) {
  const { order } = await place(venue, { coupon: 'WELCOME20', ...options });
  await pay(order.id);
  return order;
}

const usedCount = async (couponId: string) => (await VenueFoodCouponModel.findById(couponId))?.used_count;

/** What a refused call was refused with. */
async function refusal(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    const refused = error as GraphQLError;
    return { code: refused.extensions?.code, reason: refused.extensions?.reason, message: refused.message };
  }
  throw new Error('Expected the call to be refused');
}

// The one-code-per-venue and one-order-per-attempt rules ARE unique indexes, so they must be built before a test leans on them.
beforeAll(async () => {
  await Promise.all([VenueFoodCouponModel.init(), VenueFoodOrderModel.init()]);
});

// The coupon and pricing cases were written against prices that include GST at 5%; pin that, rather than
// inherit whatever Finance's shipped default is, so they keep testing coupons. The default has its own suite.
beforeEach(async () => {
  await updateFoodTaxDefaults({ tax_mode: 'INCLUSIVE', gst_pct: 5 }, null);
  let opened = 0;
  rzp.createRazorpayOrder.mockImplementation(async () => {
    opened += 1;
    return { id: `order_rzp_${opened}` };
  });
  rzp.verifyRazorpaySignature.mockResolvedValue(true);
  rzp.findCapturedPaymentForOrder.mockResolvedValue(null);
  rzp.listRazorpayRefunds.mockResolvedValue([]);
  rzp.createRazorpayRefund.mockImplementation(async (args) => ({
    id: `rfnd_${args.paymentId}`,
    status: 'processed',
    amount: args.amountPaise,
    receipt: args.receipt ?? '',
  }));
});

describe('pricing an order with a venue coupon', () => {
  // The rows `priceFoodCart` shows the guest, placed for real: what is stored and what Razorpay is opened for.
  it.each(PRICING_CASES.filter((one) => !one.below_minimum && (one.coupon_pct === 0 || one.coupon_discount_paise > 0)))(
    'charges "$name" at the paise the guest was shown',
    async (fixture) => {
      const venue = await makeVenue({
        dishes: fixture.lines.map((line, index) => ({ name: `Dish ${index + 1}`, price: line.unit_price })),
        discountPct: fixture.discount_pct,
        tax: { tax_mode: fixture.tax_mode, gst_pct: fixture.gst_pct },
      });
      if (fixture.coupon_pct) await makeCoupon(venue, { code: 'MATRIX', discount_pct: fixture.coupon_pct });
      const placement = await venueFoodOrderService.place(guest, {
        venue_id: venue.venueId,
        items: fixture.lines.map((line, index) => ({ item_id: venue.dishIds[index] ?? '', quantity: line.quantity })),
        customer_name: 'Asha Rao',
        customer_phone: PHONE,
        coupon_code: fixture.coupon_pct ? 'MATRIX' : null,
        client_key: clientKey(),
      });

      const stored = await VenueFoodOrderModel.findById(placement.order.id);
      expect(stored).toMatchObject({
        subtotal_paise: fixture.subtotal_paise,
        discount_pct: fixture.discount_pct,
        discount_paise: fixture.discount_paise,
        coupon_pct: fixture.coupon_pct,
        coupon_discount_paise: fixture.coupon_discount_paise,
        tax_mode: fixture.tax_mode,
        gst_pct: fixture.gst_pct,
        taxable_paise: fixture.taxable_paise,
        tax_paise: fixture.tax_paise,
        total_paise: fixture.total_paise,
        coupon_code: fixture.coupon_pct ? 'MATRIX' : '',
      });
      // The gateway order and the sheet are opened for the discounted total — the amount reconcile later compares.
      expect(rzp.createRazorpayOrder).toHaveBeenCalledWith(expect.objectContaining({ amountPaise: fixture.total_paise }));
      expect(placement.razorpay?.amount).toBe(fixture.total_paise);
      expect(placement.order).toMatchObject({
        total: fixture.total_paise / 100,
        discount_amount: fixture.discount_paise / 100,
        coupon_discount_amount: fixture.coupon_discount_paise / 100,
        tax_amount: fixture.tax_paise / 100,
        taxable_amount: fixture.taxable_paise / 100,
        coupon_code: fixture.coupon_pct ? 'MATRIX' : null,
      });
    }
  );

  it('still refuses an order too small to pay online, with or without a coupon', async () => {
    const venue = await makeVenue({ dishes: [{ name: 'Chai', price: 1 }], discountPct: 1 });
    await makeCoupon(venue);
    expect(await refusal(() => place(venue, { quantity: 1 }))).toMatchObject({ code: 'BAD_USER_INPUT', message: 'This order is too small to pay online' });
    expect(await refusal(() => place(venue, { quantity: 1, coupon: 'WELCOME20' }))).toMatchObject({ code: 'BAD_USER_INPUT' });
    expect(await VenueFoodOrderModel.countDocuments()).toBe(0);
  });

  it('places an order without a coupon exactly as before, with no coupon on it', async () => {
    const venue = await makeVenue({ discountPct: 10 });
    await makeCoupon(venue);
    for (const coupon of [undefined, null, '', '   ']) {
      const { order } = await place(venue, { coupon });
      expect(order).toMatchObject({ subtotal: 480, discount_pct: 10, discount_amount: 48, coupon_code: null, coupon_pct: 0, coupon_discount_amount: 0, total: 432 });
      const stored = await VenueFoodOrderModel.findById(order.id).lean();
      expect(stored).not.toHaveProperty('coupon_id');
    }
  });
});

describe('GST on a placed order', () => {
  it("prices a venue without its own GST at Finance's default, and follows the default when it changes", async () => {
    const venue = await makeVenue();
    const before = await place(venue);
    expect(before.order).toMatchObject({ tax_mode: 'INCLUSIVE', gst_pct: 5, tax_amount: 22.86, total: 480 });

    await updateFoodTaxDefaults({ tax_mode: 'EXCLUSIVE', gst_pct: 12 }, null);
    const after = await place(venue);
    expect(after.order).toMatchObject({ tax_mode: 'EXCLUSIVE', gst_pct: 12, taxable_amount: 480, tax_amount: 57.6, total: 537.6 });
    // The order placed before the change keeps the GST it was placed with.
    expect(await VenueFoodOrderModel.findById(before.order.id)).toMatchObject({ tax_mode: 'INCLUSIVE', gst_pct: 5, total_paise: 48000 });
  });

  it("keeps a venue's own GST whatever Finance's default says", async () => {
    await updateFoodTaxDefaults({ tax_mode: 'INCLUSIVE', gst_pct: 28 }, null);
    const venue = await makeVenue({ tax: { tax_mode: 'EXCLUSIVE', gst_pct: 5 } });
    const { order, razorpay } = await place(venue);
    expect(order).toMatchObject({ tax_mode: 'EXCLUSIVE', gst_pct: 5, tax_amount: 24, total: 504 });
    // Razorpay is opened for the total WITH the GST added.
    expect(razorpay?.amount).toBe(50400);
    expect(rzp.createRazorpayOrder).toHaveBeenCalledWith(expect.objectContaining({ amountPaise: 50400 }));
  });

  it('quotes a coupon with the same GST that placing then charges', async () => {
    const venue = await makeVenue({ discountPct: 10, tax: { tax_mode: 'EXCLUSIVE', gst_pct: 18 } });
    await makeCoupon(venue);
    const quoted = await preview(venue, 'WELCOME20');
    const { order, razorpay } = await place(venue, { coupon: 'WELCOME20' });
    // 480 less 48 less 86.40 leaves 345.60; 18% of that is 62.208, so 62.21.
    expect(quoted).toMatchObject({ tax_mode: 'EXCLUSIVE', gst_pct: 18, taxable_amount: 345.6, tax_amount: 62.21, total: 407.81 });
    expect(order).toMatchObject({
      taxable_amount: quoted.taxable_amount,
      tax_amount: quoted.tax_amount,
      total: quoted.total,
    });
    expect(razorpay?.amount).toBe(40781);
  });

  it('refunds the total the guest paid, GST included', async () => {
    const venue = await makeVenue({ tax: { tax_mode: 'EXCLUSIVE', gst_pct: 5 } });
    const { order } = await place(venue);
    await pay(order.id);
    await venueFoodOrderService.cancel(venue.ownerId, false, order.id, 'Kitchen closed');
    expect(rzp.createRazorpayRefund).toHaveBeenCalledWith(expect.objectContaining({ amountPaise: 50400 }));
  });
});

describe('refusing a coupon', () => {
  const expectRefusedEverywhere = async (venue: Venue, coupon: string, reason: string, options: CartOptions = {}) => {
    const shown = await preview(venue, coupon, options);
    expect(shown).toMatchObject({ ok: false, reason, coupon_code: null, coupon_pct: 0, coupon_discount_amount: 0 });
    expect(shown.message).toEqual(expect.any(String));
    const refused = await refusal(() => place(venue, { ...options, coupon }));
    expect(refused).toMatchObject({ code: 'FOOD_COUPON_REJECTED', reason, message: shown.message });
    return shown;
  };

  it('answers a code nobody made, a malformed one and a switched-off one identically', async () => {
    const venue = await makeVenue();
    await makeCoupon(venue, { code: 'SLEEPING', is_active: false });
    const unknown = await expectRefusedEverywhere(venue, 'NOSUCHCODE', 'INVALID');
    const malformed = await expectRefusedEverywhere(venue, 'no such code!', 'INVALID');
    const inactive = await expectRefusedEverywhere(venue, 'SLEEPING', 'INVALID');
    expect(unknown.message).toBe('Invalid or inactive coupon code');
    expect(malformed).toEqual(unknown);
    expect(inactive).toEqual(unknown);
    expect(await VenueFoodOrderModel.countDocuments()).toBe(0);
  });

  it('does not let a code of another venue work, or show that it exists', async () => {
    const venue = await makeVenue();
    const neighbour = await makeVenue();
    await makeCoupon(neighbour, { code: 'NEIGHBOUR' });
    const unknown = await preview(venue, 'NOSUCHCODE');
    expect(await expectRefusedEverywhere(venue, 'NEIGHBOUR', 'INVALID')).toEqual(unknown);
    expect((await preview(neighbour, 'NEIGHBOUR')).ok).toBe(true);
  });

  it('refuses a code before its start and after its end', async () => {
    const venue = await makeVenue();
    await makeCoupon(venue, { code: 'SOON', valid_from: new Date(Date.now() + DAY_MS).toISOString() });
    await makeCoupon(venue, { code: 'GONE', valid_until: new Date(Date.now() - DAY_MS).toISOString() });
    await makeCoupon(venue, {
      code: 'NOW',
      valid_from: new Date(Date.now() - DAY_MS).toISOString(),
      valid_until: new Date(Date.now() + DAY_MS).toISOString(),
    });
    expect((await expectRefusedEverywhere(venue, 'SOON', 'NOT_STARTED')).message).toBe('Coupon is not active yet');
    expect((await expectRefusedEverywhere(venue, 'GONE', 'EXPIRED')).message).toBe('Coupon has expired');
    expect((await preview(venue, 'NOW')).ok).toBe(true);
  });

  it('holds a code to its minimum order, measured on the subtotal before the venue discount', async () => {
    const venue = await makeVenue({ discountPct: 50 });
    await makeCoupon(venue, { min_order_amount: 480 });
    // Two tikkas are 480 before the 50% venue discount: exactly the minimum is enough.
    expect(await preview(venue, 'WELCOME20')).toMatchObject({ ok: true, min_order_amount: 480, subtotal: 480 });
    const short = await expectRefusedEverywhere(venue, 'WELCOME20', 'MIN_ORDER_NOT_MET', { quantity: 1 });
    expect(short.message).toBe('Minimum order of ₹480 required');
    // The amounts of a refused preview are the cart's own, without the code.
    expect(short).toMatchObject({ subtotal: 240, discount_amount: 120, total: 120 });

    await makeCoupon(venue, { code: 'ODDMIN', min_order_amount: 250.5 });
    expect((await preview(venue, 'ODDMIN', { quantity: 1 })).message).toBe('Minimum order of ₹250.50 required');
  });

  it('refuses a code that would take nothing off because the venue discount is already at the ceiling', async () => {
    const venue = await makeVenue({ discountPct: 90 });
    const coupon = await makeCoupon(venue);
    const shown = await expectRefusedEverywhere(venue, 'WELCOME20', 'NO_DISCOUNT');
    expect(shown).toMatchObject({ subtotal: 480, discount_amount: 432, total: 48 });
    expect(await usedCount(coupon.id)).toBe(0);
  });

  it('refuses a code once its total uses are spent', async () => {
    const venue = await makeVenue();
    const coupon = await makeCoupon(venue, { max_uses: 1 });
    await redeem(venue);
    expect(await usedCount(coupon.id)).toBe(1);
    expect((await expectRefusedEverywhere(venue, 'WELCOME20', 'USAGE_LIMIT_REACHED', { phone: OTHER_PHONE })).message).toBe('Coupon usage limit reached');
  });

  it('refuses a mobile number that has used its share, and nobody else', async () => {
    const venue = await makeVenue();
    await makeCoupon(venue, { per_phone_limit: 1 });
    await redeem(venue, { phone: PHONE });
    expect((await expectRefusedEverywhere(venue, 'WELCOME20', 'PER_PERSON_LIMIT_REACHED', { phone: PHONE })).message).toBe('You have already used this coupon');
    expect((await preview(venue, 'WELCOME20', { phone: OTHER_PHONE })).ok).toBe(true);
    // Before a number is typed there is nobody to count against: the preview prices the code.
    expect((await preview(venue, 'WELCOME20')).ok).toBe(true);
    expect((await preview(venue, 'WELCOME20', { phone: '98765' })).ok).toBe(true);
    // The number is read through its formatting, as placing reads it.
    expect((await preview(venue, 'WELCOME20', { phone: '98765 43210' })).reason).toBe('PER_PERSON_LIMIT_REACHED');
  });

  it('counts only PAID orders against a mobile number, not a checkout that was never paid', async () => {
    const venue = await makeVenue();
    await makeCoupon(venue, { per_phone_limit: 1 });
    await place(venue, { coupon: 'WELCOME20' });
    expect((await preview(venue, 'WELCOME20', { phone: PHONE })).ok).toBe(true);
    await expect(place(venue, { coupon: 'WELCOME20' })).resolves.toMatchObject({ order: { coupon_code: 'WELCOME20' } });
  });
});

describe('previewing a coupon', () => {
  it('prices the cart with the code and changes nothing', async () => {
    const venue = await makeVenue({ discountPct: 10 });
    const coupon = await makeCoupon(venue, { min_order_amount: 100 });
    const before = await VenueFoodCouponModel.findById(coupon.id).lean();

    expect(await preview(venue, ' welcome20 ', { phone: PHONE })).toEqual({
      ok: true,
      reason: null,
      message: null,
      coupon_code: 'WELCOME20',
      coupon_pct: 20,
      min_order_amount: 100,
      subtotal: 480,
      discount_pct: 10,
      discount_amount: 48,
      coupon_discount_amount: 86.4,
      // The venue sets no GST of its own, so Finance's shipped default prices it: 5%, inside the price.
      tax_mode: 'INCLUSIVE',
      gst_pct: 5,
      taxable_amount: 329.14,
      tax_amount: 16.46,
      total: 345.6,
      currency_symbol: '₹',
    });

    expect(await VenueFoodOrderModel.countDocuments()).toBe(0);
    expect(await VenueFoodCouponModel.findById(coupon.id).lean()).toEqual(before);
    expect(rzp.createRazorpayOrder).not.toHaveBeenCalled();
  });

  it('quotes exactly what placing then charges', async () => {
    const venue = await makeVenue({ discountPct: 10 });
    await makeCoupon(venue);
    const quoted = await preview(venue, 'WELCOME20', { phone: PHONE });
    const { order, razorpay } = await place(venue, { coupon: 'WELCOME20' });
    expect(order).toMatchObject({
      subtotal: quoted.subtotal,
      discount_amount: quoted.discount_amount,
      coupon_code: quoted.coupon_code,
      coupon_pct: quoted.coupon_pct,
      coupon_discount_amount: quoted.coupon_discount_amount,
      total: quoted.total,
    });
    expect(razorpay?.amount).toBe(34560);
  });

  it('refuses the venue, the cart and the menu exactly as placing would', async () => {
    const venue = await makeVenue();
    await makeCoupon(venue);
    const items = cartOf(venue, 1);
    expect(await refusal(() => venueFoodOrderService.previewCoupon({ venue_id: 'nope', coupon_code: 'WELCOME20', items }))).toMatchObject({ code: 'BAD_USER_INPUT' });
    expect(
      await refusal(() => venueFoodOrderService.previewCoupon({ venue_id: new Types.ObjectId().toHexString(), coupon_code: 'WELCOME20', items }))
    ).toMatchObject({ code: 'NOT_FOUND' });
    expect(await refusal(() => venueFoodOrderService.previewCoupon({ venue_id: venue.venueId, coupon_code: 'WELCOME20', items: [] }))).toMatchObject({
      code: 'BAD_USER_INPUT',
      message: 'Your cart is empty',
    });
    expect(
      await refusal(() =>
        venueFoodOrderService.previewCoupon({
          venue_id: venue.venueId,
          coupon_code: 'WELCOME20',
          items: [{ item_id: new Types.ObjectId().toHexString(), quantity: 1 }],
        })
      )
    ).toMatchObject({ code: 'FOOD_ITEM_UNAVAILABLE' });
    await VenueModel.updateOne({ _id: venue.venueId }, { $set: { 'food_ordering.enabled': false } });
    expect(await refusal(() => preview(venue, 'WELCOME20'))).toMatchObject({ code: 'FOOD_ORDERING_CLOSED' });
  });

  it('is open to a guest with no session, while the owner operations are not', async () => {
    const venue = await makeVenue();
    await makeCoupon(venue);
    const shown = await venueFoodResolvers.Query.previewVenueFoodCoupon(null, {
      input: { venue_id: venue.venueId, coupon_code: 'WELCOME20', items: cartOf(venue, 1) },
    });
    expect(shown).toMatchObject({ ok: true, total: 192 });

    const coupon = await VenueFoodCouponModel.findOne({ code: 'WELCOME20' });
    const couponId = coupon?._id.toHexString() ?? '';
    const gated = [
      () => venueFoodResolvers.Query.venueFoodCouponsTable(null, { venue_id: venue.venueId }, guest),
      () => venueFoodResolvers.Mutation.createVenueFoodCoupon(null, { input: { venue_id: venue.venueId, code: 'FREE90', discount_pct: 90 } }, guest),
      () => venueFoodResolvers.Mutation.updateVenueFoodCoupon(null, { coupon_id: couponId, input: { discount_pct: 90 } }, guest),
      () => venueFoodResolvers.Mutation.setVenueFoodCouponActive(null, { coupon_id: couponId, is_active: false }, guest),
      () => venueFoodResolvers.Mutation.deleteVenueFoodCoupon(null, { coupon_id: couponId }, guest),
    ];
    for (const call of gated) expect(call).toThrow();
    expect(await VenueFoodCouponModel.findById(couponId)).toMatchObject({ discount_pct: 20, is_active: true });
    expect(await VenueFoodCouponModel.countDocuments()).toBe(1);
  });
});

describe('a repeated checkout attempt', () => {
  it('returns the order it already priced after the coupon expired, was switched off or was deleted', async () => {
    const venue = await makeVenue({ discountPct: 10 });
    const coupon = await makeCoupon(venue);
    const key = clientKey();
    const first = await place(venue, { coupon: 'WELCOME20', key });
    expect(first.order).toMatchObject({ coupon_code: 'WELCOME20', coupon_discount_amount: 86.4, total: 345.6 });

    const replay = async () => {
      const again = await place(venue, { coupon: 'WELCOME20', key });
      expect(again.order).toEqual(first.order);
      expect(again.access_key).toBe(first.access_key);
      expect(again.razorpay).toEqual(first.razorpay);
    };

    await VenueFoodCouponModel.updateOne({ _id: coupon.id }, { $set: { valid_until: new Date(Date.now() - DAY_MS) } });
    await replay();
    await venueFoodCouponService.setActive(venue.ownerId, false, coupon.id, false);
    await replay();
    await venueFoodCouponService.remove(venue.ownerId, false, coupon.id);
    await replay();

    expect(await VenueFoodOrderModel.countDocuments()).toBe(1);
    expect(rzp.createRazorpayOrder).toHaveBeenCalledTimes(1);
    // A NEW attempt with the same dead code is refused.
    expect(await refusal(() => place(venue, { coupon: 'WELCOME20' }))).toMatchObject({ code: 'FOOD_COUPON_REJECTED', reason: 'INVALID' });
  });

  it('returns the original order when the coupon has been used up in the meantime', async () => {
    const venue = await makeVenue();
    await makeCoupon(venue, { max_uses: 1 });
    const key = clientKey();
    const mine = await place(venue, { coupon: 'WELCOME20', key });
    await redeem(venue, { phone: OTHER_PHONE });
    expect((await preview(venue, 'WELCOME20')).reason).toBe('USAGE_LIMIT_REACHED');
    expect((await place(venue, { coupon: 'WELCOME20', key })).order).toEqual(mine.order);
  });

  it('keeps one order when two taps of the same attempt race', async () => {
    const venue = await makeVenue();
    await makeCoupon(venue);
    // An earlier order, so the race below is over the attempt alone and not over the finance-settings
    // and order-number singletons an empty database creates on first use.
    await place(venue, { phone: OTHER_PHONE });
    const key = clientKey();
    const settled = await Promise.allSettled([place(venue, { coupon: 'WELCOME20', key }), place(venue, { coupon: 'WELCOME20', key })]);
    expect(await VenueFoodOrderModel.countDocuments({ client_key: key })).toBe(1);
    // The loser either reads the winner's order or is told to retry while its payment is opened — never a second order.
    for (const outcome of settled) {
      if (outcome.status === 'rejected') expect((outcome.reason as GraphQLError).extensions?.code).toBe('CONFLICT');
      else expect(outcome.value.order.coupon_code).toBe('WELCOME20');
    }
    expect(settled.some((outcome) => outcome.status === 'fulfilled')).toBe(true);
  });
});

describe('counting a redemption', () => {
  it('counts nothing when an order is only placed', async () => {
    const venue = await makeVenue();
    const coupon = await makeCoupon(venue);
    await place(venue, { coupon: 'WELCOME20' });
    expect(await usedCount(coupon.id)).toBe(0);
  });

  it('counts one use when verify, a status poll and the sweep all mark the same order paid together', async () => {
    const venue = await makeVenue();
    const coupon = await makeCoupon(venue);
    const { order } = await place(venue, { coupon: 'WELCOME20' });
    const orderId = new Types.ObjectId(order.id);

    const results = await Promise.all(Array.from({ length: 8 }, (_, index) => markFoodOrderPaid(orderId, `pay_${index}`)));

    expect(await usedCount(coupon.id)).toBe(1);
    const stored = await VenueFoodOrderModel.findById(orderId);
    expect(stored?.payment_status).toBe('PAID');
    // Every caller reads the one order, carrying the payment id of whichever write won.
    for (const result of results) expect(result?.razorpay_payment_id).toBe(stored?.razorpay_payment_id);

    await markFoodOrderPaid(orderId, 'pay_late');
    expect(await usedCount(coupon.id)).toBe(1);
  });

  it('counts through the real verify path, once however often the guest retries it', async () => {
    const venue = await makeVenue();
    const coupon = await makeCoupon(venue);
    const { order, access_key, razorpay } = await place(venue, { coupon: 'WELCOME20' });
    const verify = () =>
      venueFoodOrderService.verify(guest, {
        order_id: order.id,
        access_key,
        razorpay_order_id: razorpay?.order_id ?? '',
        razorpay_payment_id: 'pay_verified',
        razorpay_signature: 'signature',
      });
    const [first, second] = await Promise.all([verify(), verify()]);
    expect(first.payment_status).toBe('PAID');
    expect(second.payment_status).toBe('PAID');
    expect((await verify()).payment_status).toBe('PAID');
    expect(await usedCount(coupon.id)).toBe(1);
  });

  it('adopts a capture of the discounted total when the guest closed the tab, and counts it', async () => {
    const venue = await makeVenue({ discountPct: 10 });
    const coupon = await makeCoupon(venue);
    const { order, access_key } = await place(venue, { coupon: 'WELCOME20' });

    // Razorpay captured the full, undiscounted price: not this order's money, so it is left alone.
    rzp.findCapturedPaymentForOrder.mockResolvedValueOnce({ id: 'pay_wrong', amount: 43200 });
    expect((await venueFoodOrderService.read(guest, order.id, access_key))?.payment_status).toBe('PENDING');
    expect(await usedCount(coupon.id)).toBe(0);

    await VenueFoodOrderModel.updateOne({ _id: order.id }, { $set: { reconcile_checked_at: null } });
    rzp.findCapturedPaymentForOrder.mockResolvedValueOnce({ id: 'pay_right', amount: 34560 });
    expect(await venueFoodOrderService.read(guest, order.id, access_key)).toMatchObject({ payment_status: 'PAID', total: 345.6 });
    expect(await usedCount(coupon.id)).toBe(1);
  });

  it('leaves every coupon alone when an order without one is paid', async () => {
    const venue = await makeVenue();
    const coupon = await makeCoupon(venue);
    const { order } = await place(venue);
    await pay(order.id);
    expect(await usedCount(coupon.id)).toBe(0);
  });

  it('counts each coupon of a venue apart, and each venue apart', async () => {
    const venue = await makeVenue();
    const neighbour = await makeVenue();
    const mine = await makeCoupon(venue);
    const other = await makeCoupon(venue, { code: 'OTHER10', discount_pct: 10 });
    const theirs = await makeCoupon(neighbour);
    await redeem(venue);
    await redeem(venue, { phone: OTHER_PHONE });
    await redeem(neighbour);
    expect(await usedCount(mine.id)).toBe(2);
    expect(await usedCount(other.id)).toBe(0);
    expect(await usedCount(theirs.id)).toBe(1);
  });

  // The decision written down in venueFoodCoupon.redemption.ts: the cap is checked at place time only.
  it('lets two unpaid orders that both held the last use both pay, and refuses the next order', async () => {
    const venue = await makeVenue();
    const coupon = await makeCoupon(venue, { max_uses: 1 });
    const first = await place(venue, { coupon: 'WELCOME20', phone: PHONE });
    const second = await place(venue, { coupon: 'WELCOME20', phone: OTHER_PHONE });

    const [paidFirst, paidSecond] = await Promise.all([pay(first.order.id), pay(second.order.id)]);

    // Both guests were quoted and charged the discounted price, so both are honoured.
    expect(paidFirst).toMatchObject({ payment_status: 'PAID', total_paise: 38400 });
    expect(paidSecond).toMatchObject({ payment_status: 'PAID', total_paise: 38400 });
    expect(await usedCount(coupon.id)).toBe(2);
    expect(await refusal(() => place(venue, { coupon: 'WELCOME20', phone: '9000000001' }))).toMatchObject({ reason: 'USAGE_LIMIT_REACHED' });
  });

  it('still marks the order paid when the counter cannot be written, and says so in the log', async () => {
    const venue = await makeVenue();
    const coupon = await makeCoupon(venue);
    const { order } = await place(venue, { coupon: 'WELCOME20' });
    const logged = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
    const write = jest.spyOn(VenueFoodCouponModel, 'updateOne').mockImplementationOnce(() => {
      throw new Error('primary stepped down');
    });

    const paid = await pay(order.id);

    expect(paid?.payment_status).toBe('PAID');
    expect(logged).toHaveBeenCalledWith('venue-food', 'coupon', expect.objectContaining({ orderNo: order.order_no, couponId: coupon.id, by: 1 }));
    expect(await usedCount(coupon.id)).toBe(0);
    write.mockRestore();
    logged.mockRestore();
  });

  it('leaves no order and no use behind when the payment cannot be opened', async () => {
    const venue = await makeVenue();
    const coupon = await makeCoupon(venue);
    rzp.createRazorpayOrder.mockRejectedValueOnce(new Error('Razorpay is down'));
    const logged = jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined);
    expect(await refusal(() => place(venue, { coupon: 'WELCOME20' }))).toMatchObject({ code: 'FOOD_ORDERING_CLOSED' });
    logged.mockRestore();
    expect(await VenueFoodOrderModel.countDocuments()).toBe(0);
    expect(await usedCount(coupon.id)).toBe(0);
  });

  it('pays an order whose coupon was deleted while it was unpaid', async () => {
    const venue = await makeVenue();
    const coupon = await makeCoupon(venue);
    const { order } = await place(venue, { coupon: 'WELCOME20' });
    await venueFoodCouponService.remove(venue.ownerId, false, coupon.id);
    expect(await pay(order.id)).toMatchObject({ payment_status: 'PAID', coupon_code: 'WELCOME20', coupon_discount_paise: 9600 });
  });
});

describe('cancelling a paid order that used a coupon', () => {
  it('refunds the discounted total the guest paid, and gives the use back once', async () => {
    const venue = await makeVenue({ discountPct: 10 });
    const coupon = await makeCoupon(venue, { per_phone_limit: 1, max_uses: 1 });
    const order = await redeem(venue);
    expect(await usedCount(coupon.id)).toBe(1);
    expect((await preview(venue, 'WELCOME20', { phone: PHONE })).reason).toBe('USAGE_LIMIT_REACHED');

    const cancelled = await venueFoodOrderService.cancel(venue.ownerId, false, order.id, 'Kitchen closed early');

    expect(cancelled).toMatchObject({ status: 'CANCELLED', payment_status: 'REFUNDED', coupon_code: 'WELCOME20', coupon_discount_amount: 86.4, total: 345.6 });
    expect(rzp.createRazorpayRefund).toHaveBeenCalledTimes(1);
    expect(rzp.createRazorpayRefund).toHaveBeenCalledWith(expect.objectContaining({ amountPaise: 34560, paymentId: `pay_${order.id}` }));
    expect(await usedCount(coupon.id)).toBe(0);

    // A second cancel is refused before it can release anything again.
    expect(await refusal(() => venueFoodOrderService.cancel(venue.ownerId, false, order.id, 'Kitchen closed early'))).toMatchObject({ code: 'BAD_REQUEST' });
    expect(await usedCount(coupon.id)).toBe(0);

    // The guest never had the meal: both the total cap and their own share are free again.
    expect((await preview(venue, 'WELCOME20', { phone: PHONE })).ok).toBe(true);
    await expect(redeem(venue)).resolves.toMatchObject({ coupon_code: 'WELCOME20' });
    expect(await usedCount(coupon.id)).toBe(1);
  });

  it('gives the use back even when the refund itself has to wait for the sweep', async () => {
    const venue = await makeVenue();
    const coupon = await makeCoupon(venue);
    const order = await redeem(venue);
    rzp.createRazorpayRefund.mockRejectedValueOnce(new Error('Razorpay timed out'));
    const logged = jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined);

    const cancelled = await venueFoodOrderService.cancel(venue.ownerId, false, order.id, 'Out of stock');

    expect(logged).toHaveBeenCalledWith('venue-food', 'refund', expect.objectContaining({ orderNo: order.order_no }));
    logged.mockRestore();
    expect(cancelled).toMatchObject({ status: 'CANCELLED', payment_status: 'REFUND_PENDING' });
    expect(await usedCount(coupon.id)).toBe(0);
  });

  it('releases one use when two cancels of the same order race', async () => {
    const venue = await makeVenue();
    const coupon = await makeCoupon(venue);
    const order = await redeem(venue);
    await redeem(venue, { phone: OTHER_PHONE });
    expect(await usedCount(coupon.id)).toBe(2);

    const cancel = () => venueFoodOrderService.cancel(venue.ownerId, false, order.id, 'Out of stock');
    const settled = await Promise.allSettled([cancel(), cancel()]);

    expect(settled.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(await usedCount(coupon.id)).toBe(1);
  });

  it('never takes the counter under zero, and survives a coupon deleted since', async () => {
    const venue = await makeVenue();
    const coupon = await makeCoupon(venue);
    const order = await redeem(venue);
    await VenueFoodCouponModel.updateOne({ _id: coupon.id }, { $set: { used_count: 0 } });
    await venueFoodOrderService.cancel(venue.ownerId, false, order.id, 'Out of stock');
    expect(await usedCount(coupon.id)).toBe(0);

    const second = await redeem(venue, { phone: OTHER_PHONE });
    await venueFoodCouponService.remove(venue.ownerId, false, coupon.id);
    await expect(venueFoodOrderService.cancel(venue.ownerId, false, second.id, 'Out of stock')).resolves.toMatchObject({ status: 'CANCELLED' });
  });

  it('shows the coupon of each order on the board of the venue', async () => {
    const venue = await makeVenue({ discountPct: 10 });
    await makeCoupon(venue);
    await redeem(venue);
    const plain = await place(venue, { phone: OTHER_PHONE });
    await pay(plain.order.id);

    const board = await venueFoodOrderService.table(venue.ownerId, false, venue.venueId, { sort_by: 'total', sort_dir: 'asc' });
    expect(board.rows.map((row) => [row.coupon_code, row.coupon_pct, row.coupon_discount_amount, row.total])).toEqual([
      ['WELCOME20', 20, 86.4, 345.6],
      [null, 0, 0, 432],
    ]);
  });
});

describe("the owner's coupons", () => {
  it('stores a code trimmed and upper-cased, with money in paise', async () => {
    const venue = await makeVenue();
    const created = await makeCoupon(venue, { code: '  save10 ', discount_pct: 10, description: '  First visit  ', min_order_amount: 199.5 });
    expect(created).toMatchObject({
      venue_id: venue.venueId,
      code: 'SAVE10',
      description: 'First visit',
      discount_pct: 10,
      min_order_amount: 199.5,
      valid_from: null,
      valid_until: null,
      max_uses: null,
      per_phone_limit: null,
      used_count: 0,
      is_active: true,
    });
    const stored = await VenueFoodCouponModel.findById(created.id);
    expect(stored?.min_order_paise).toBe(19950);
    expect(stored?.created_by?.toHexString()).toBe(venue.ownerId);
    expect(stored?.updated_by?.toHexString()).toBe(venue.ownerId);
    // A guest may type it in any case.
    expect((await preview(venue, 'Save10')).coupon_code).toBe('SAVE10');
  });

  it('keeps a code unique within a venue and free for every other venue', async () => {
    const venue = await makeVenue();
    const neighbour = await makeVenue();
    await makeCoupon(venue, { code: 'SAVE10' });
    expect(await refusal(() => makeCoupon(venue, { code: 'save10', discount_pct: 50 }))).toEqual({
      code: 'BAD_USER_INPUT',
      reason: undefined,
      message: 'This venue already has a coupon with this code',
    });
    await expect(makeCoupon(neighbour, { code: 'SAVE10', discount_pct: 50 })).resolves.toMatchObject({ code: 'SAVE10', discount_pct: 50 });
    expect(await VenueFoodCouponModel.countDocuments({ code: 'SAVE10' })).toBe(2);
    // Each venue redeems its own.
    expect((await preview(venue, 'SAVE10')).coupon_pct).toBe(20);
    expect((await preview(neighbour, 'SAVE10')).coupon_pct).toBe(50);

    const other = await makeCoupon(venue, { code: 'OTHER' });
    expect(await refusal(() => venueFoodCouponService.update(venue.ownerId, false, other.id, { code: 'Save10' }))).toMatchObject({
      message: 'This venue already has a coupon with this code',
    });
    expect((await VenueFoodCouponModel.findById(other.id))?.code).toBe('OTHER');
  });

  it('records no author, rather than a broken one, for a session id that is not an account id', async () => {
    const venue = await makeVenue();
    const created = await venueFoodCouponService.create('service-account', true, { venue_id: venue.venueId, code: 'SAVE10', discount_pct: 10 });
    expect(await VenueFoodCouponModel.findById(created.id)).toMatchObject({ created_by: null, updated_by: null });
  });

  it('does not dress up a failed write as a duplicate code', async () => {
    const venue = await makeVenue();
    const save = jest.spyOn(VenueFoodCouponModel.prototype, 'save').mockRejectedValueOnce(new Error('primary stepped down'));
    await expect(makeCoupon(venue)).rejects.toThrow('primary stepped down');
    save.mockRestore();
    expect(await VenueFoodCouponModel.countDocuments()).toBe(0);
  });

  it('lets two requests for the same new code create it once', async () => {
    const venue = await makeVenue();
    await VenueFoodCouponModel.init();
    const settled = await Promise.allSettled([makeCoupon(venue, { code: 'RACE' }), makeCoupon(venue, { code: 'RACE' })]);
    expect(settled.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(await VenueFoodCouponModel.countDocuments({ code: 'RACE' })).toBe(1);
  });

  it.each<[string, Partial<CreateFoodCouponInput>, string]>([
    ['a code that is too short', { code: 'AB' }, 'Code must be 3-30 chars: A-Z, 0-9, - or _'],
    ['a code with a space in it', { code: 'SAVE 10' }, 'Code must be 3-30 chars: A-Z, 0-9, - or _'],
    ['a code over 30 characters', { code: 'A'.repeat(31) }, 'Code must be 3-30 chars: A-Z, 0-9, - or _'],
    ['a zero discount', { discount_pct: 0 }, 'The discount must be a whole number from 1 to 90'],
    ['a discount over the ceiling', { discount_pct: 91 }, 'The discount must be a whole number from 1 to 90'],
    ['a fractional discount', { discount_pct: 12.5 }, 'The discount must be a whole number from 1 to 90'],
    ['a negative minimum order', { min_order_amount: -1 }, 'Enter a minimum order of 0 or more'],
    ['an unreadable start date', { valid_from: 'next tuesday' }, 'Enter a valid start date'],
    ['an unreadable end date', { valid_until: 'never' }, 'Enter a valid end date'],
    [
      'an end date that is not after the start',
      { valid_from: '2026-11-02T00:00:00.000Z', valid_until: '2026-11-02T00:00:00.000Z' },
      'The end date must be after the start date',
    ],
    ['a total use cap of zero', { max_uses: 0 }, 'Total uses must be a whole number of 1 or more'],
    ['a fractional per-person cap', { per_phone_limit: 1.5 }, 'Uses per person must be a whole number of 1 or more'],
    ['a description over 300 characters', { description: 'x'.repeat(301) }, 'Keep the description under 300 characters'],
  ])('refuses %s', async (_what, terms, message) => {
    const venue = await makeVenue();
    expect(await refusal(() => makeCoupon(venue, terms))).toMatchObject({ code: 'BAD_USER_INPUT', message });
    expect(await VenueFoodCouponModel.countDocuments()).toBe(0);
  });

  it('accepts the discount at both ends of its range', async () => {
    const venue = await makeVenue();
    await expect(makeCoupon(venue, { code: 'ONE', discount_pct: 1 })).resolves.toMatchObject({ discount_pct: 1 });
    await expect(makeCoupon(venue, { code: 'MOST', discount_pct: 90 })).resolves.toMatchObject({ discount_pct: 90 });
  });

  it('edits only what is sent, clears what is sent as null, and never touches the count', async () => {
    const venue = await makeVenue();
    const created = await makeCoupon(venue, {
      description: 'Launch week',
      min_order_amount: 300,
      valid_from: '2026-01-01T00:00:00.000Z',
      valid_until: '2099-01-01T00:00:00.000Z',
      max_uses: 5,
      per_phone_limit: 2,
    });
    await redeem(venue);
    const editor = new Types.ObjectId().toHexString();

    // A venues-console editor may edit any venue's coupon.
    const edited = await venueFoodCouponService.update(editor, true, created.id, { discount_pct: 25, max_uses: null, valid_until: null });

    expect(edited).toMatchObject({
      code: 'WELCOME20',
      description: 'Launch week',
      discount_pct: 25,
      min_order_amount: 300,
      valid_from: '2026-01-01T00:00:00.000Z',
      valid_until: null,
      max_uses: null,
      per_phone_limit: 2,
      used_count: 1,
      is_active: true,
    });
    const stored = await VenueFoodCouponModel.findById(created.id);
    expect(stored?.updated_by?.toHexString()).toBe(editor);
    expect(stored?.created_by?.toHexString()).toBe(venue.ownerId);

    // An edit is held to the same rules as a new coupon, against the terms it would end up with.
    expect(await refusal(() => venueFoodCouponService.update(venue.ownerId, false, created.id, { discount_pct: 95 }))).toMatchObject({ code: 'BAD_USER_INPUT' });
    expect(await refusal(() => venueFoodCouponService.update(venue.ownerId, false, created.id, { valid_until: '2025-01-01T00:00:00.000Z' }))).toMatchObject({
      message: 'The end date must be after the start date',
    });
    expect((await VenueFoodCouponModel.findById(created.id))?.discount_pct).toBe(25);
  });

  it('does not reprice an order already placed when the coupon is edited', async () => {
    const venue = await makeVenue();
    const coupon = await makeCoupon(venue);
    const { order } = await place(venue, { coupon: 'WELCOME20' });
    await venueFoodCouponService.update(venue.ownerId, false, coupon.id, { code: 'RENAMED', discount_pct: 50 });
    expect(await pay(order.id)).toMatchObject({ coupon_code: 'WELCOME20', coupon_pct: 20, coupon_discount_paise: 9600, total_paise: 38400 });
    expect(await usedCount(coupon.id)).toBe(1);
    expect(await preview(venue, 'RENAMED')).toMatchObject({ ok: true, coupon_pct: 50, total: 240 });
  });

  it('switches a coupon off and on again', async () => {
    const venue = await makeVenue();
    const coupon = await makeCoupon(venue);
    expect(await venueFoodCouponService.setActive(venue.ownerId, false, coupon.id, false)).toMatchObject({ is_active: false });
    expect((await preview(venue, 'WELCOME20')).reason).toBe('INVALID');
    expect(await venueFoodCouponService.setActive(venue.ownerId, false, coupon.id, true)).toMatchObject({ is_active: true });
    expect((await preview(venue, 'WELCOME20')).ok).toBe(true);
  });

  it('deletes a coupon without losing it from the orders that used it', async () => {
    const venue = await makeVenue({ discountPct: 10 });
    const coupon = await makeCoupon(venue);
    const order = await redeem(venue);

    expect(await venueFoodCouponService.remove(venue.ownerId, false, coupon.id)).toBe(true);

    expect(await VenueFoodCouponModel.findById(coupon.id)).toBeNull();
    const board = await venueFoodOrderService.table(venue.ownerId, false, venue.venueId);
    expect(board.rows).toEqual([expect.objectContaining({ id: order.id, coupon_code: 'WELCOME20', coupon_pct: 20, coupon_discount_amount: 86.4, total: 345.6 })]);
    expect(await refusal(() => venueFoodCouponService.remove(venue.ownerId, false, coupon.id))).toMatchObject({ code: 'NOT_FOUND' });
    // The code is free to be made again, and starts from nothing.
    await expect(makeCoupon(venue)).resolves.toMatchObject({ code: 'WELCOME20', used_count: 0 });
    expect((await preview(venue, 'WELCOME20', { phone: PHONE })).ok).toBe(true);
  });

  it('lists the coupons of one venue only, whatever the client filters ask for', async () => {
    const venue = await makeVenue();
    const neighbour = await makeVenue();
    await makeCoupon(venue, { code: 'SAVE10', discount_pct: 10, description: 'Lunch crowd' });
    await makeCoupon(venue, { code: 'SAVE30', discount_pct: 30, is_active: false });
    await makeCoupon(neighbour, { code: 'THEIRS', discount_pct: 50 });

    const all = await venueFoodCouponService.table(venue.ownerId, false, venue.venueId, { sort_by: 'discount_pct', sort_dir: 'asc' });
    expect(all.rows.map((row) => row.code)).toEqual(['SAVE10', 'SAVE30']);
    expect(all).toMatchObject({ total: 2, page: 1, page_size: 25 });

    expect((await venueFoodCouponService.table(venue.ownerId, false, venue.venueId, { search: 'lunch' })).rows.map((row) => row.code)).toEqual(['SAVE10']);
    const active = await venueFoodCouponService.table(venue.ownerId, false, venue.venueId, { filters: [{ field: 'is_active', op: 'is_true' }] });
    expect(active.rows.map((row) => row.code)).toEqual(['SAVE10']);
    // Searching for the neighbour's code, or filtering on a field outside the allowlist, cannot reach it.
    expect((await venueFoodCouponService.table(venue.ownerId, false, venue.venueId, { search: 'THEIRS' })).total).toBe(0);
    const widened = await venueFoodCouponService.table(venue.ownerId, false, venue.venueId, {
      filters: [{ field: 'venue_id', op: 'eq', value: neighbour.venueId }],
    });
    expect(widened.rows.map((row) => row.code).sort((a, b) => a.localeCompare(b))).toEqual(['SAVE10', 'SAVE30']);
  });
});

describe('who may manage the coupons of a venue', () => {
  it('refuses another owner on every operation, and changes nothing', async () => {
    const venue = await makeVenue();
    const coupon = await makeCoupon(venue);
    const stranger = (await makeVenue()).ownerId;
    const attempts = [
      () => venueFoodCouponService.table(stranger, false, venue.venueId),
      () => venueFoodCouponService.create(stranger, false, { venue_id: venue.venueId, code: 'FREE90', discount_pct: 90 }),
      () => venueFoodCouponService.update(stranger, false, coupon.id, { discount_pct: 90 }),
      () => venueFoodCouponService.setActive(stranger, false, coupon.id, false),
      () => venueFoodCouponService.remove(stranger, false, coupon.id),
    ];
    for (const attempt of attempts) {
      expect(await refusal(attempt)).toEqual({ code: 'FORBIDDEN', reason: undefined, message: 'Not your venue' });
    }
    expect(await VenueFoodCouponModel.countDocuments()).toBe(1);
    expect(await VenueFoodCouponModel.findById(coupon.id)).toMatchObject({ discount_pct: 20, is_active: true });
  });

  it('answers a venue or a coupon that does not exist, and an id that is not one', async () => {
    const venue = await makeVenue();
    const missing = new Types.ObjectId().toHexString();
    expect(await refusal(() => venueFoodCouponService.table(venue.ownerId, false, missing))).toMatchObject({ code: 'NOT_FOUND', message: 'Venue not found' });
    expect(await refusal(() => venueFoodCouponService.create(venue.ownerId, false, { venue_id: 'nope', code: 'SAVE10', discount_pct: 10 }))).toMatchObject({
      code: 'BAD_USER_INPUT',
      message: 'Invalid venue id',
    });
    expect(await refusal(() => venueFoodCouponService.update(venue.ownerId, false, missing, { discount_pct: 10 }))).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Coupon not found',
    });
    expect(await refusal(() => venueFoodCouponService.remove(venue.ownerId, false, 'nope'))).toMatchObject({ code: 'BAD_USER_INPUT', message: 'Invalid coupon id' });
  });

  it('takes the owner from the session through the resolvers, and lets a venues-console editor in', async () => {
    const venue = await makeVenue();
    const owner = signedIn(venue.ownerId);
    const created = await venueFoodResolvers.Mutation.createVenueFoodCoupon(null, { input: { venue_id: venue.venueId, code: 'SAVE10', discount_pct: 10 } }, owner);
    expect(created.code).toBe('SAVE10');
    expect((await venueFoodResolvers.Query.venueFoodCouponsTable(null, { venue_id: venue.venueId }, owner)).total).toBe(1);

    const stranger = signedIn(new Types.ObjectId().toHexString());
    expect(await refusal(async () => venueFoodResolvers.Mutation.updateVenueFoodCoupon(null, { coupon_id: created.id, input: { discount_pct: 90 } }, stranger))).toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(await refusal(async () => venueFoodResolvers.Query.venueFoodCouponsTable(null, { venue_id: venue.venueId }, stranger))).toMatchObject({ code: 'FORBIDDEN' });

    const editor = signedIn(new Types.ObjectId().toHexString(), ['ALL_VENUES_ACCESS']);
    expect(await venueFoodResolvers.Mutation.setVenueFoodCouponActive(null, { coupon_id: created.id, is_active: false }, editor)).toMatchObject({ is_active: false });
    expect(await venueFoodResolvers.Mutation.updateVenueFoodCoupon(null, { coupon_id: created.id, input: { discount_pct: 15 } }, owner)).toMatchObject({ discount_pct: 15 });
    expect(await venueFoodResolvers.Mutation.deleteVenueFoodCoupon(null, { coupon_id: created.id }, owner)).toBe(true);
  });

  it('logs who created, changed, switched and deleted a coupon', async () => {
    const venue = await makeVenue();
    const logged = jest.spyOn(logs.server, 'info').mockImplementation(() => undefined);
    const coupon = await makeCoupon(venue, { code: 'SAVE10', discount_pct: 10 });
    await venueFoodCouponService.update(venue.ownerId, false, coupon.id, { discount_pct: 30 });
    await venueFoodCouponService.setActive(venue.ownerId, false, coupon.id, false);
    const admin = new Types.ObjectId().toHexString();
    await venueFoodCouponService.setActive(admin, true, coupon.id, true);
    await venueFoodCouponService.remove(venue.ownerId, false, coupon.id);

    const trail = logged.mock.calls.filter(([component, operation]) => component === 'venue-food' && operation === 'coupon').map(([, , detail]) => detail);
    expect(trail.map((entry) => [entry?.action, entry?.by, entry?.isAdmin])).toEqual([
      ['create', venue.ownerId, false],
      ['update', venue.ownerId, false],
      ['deactivate', venue.ownerId, false],
      ['activate', admin, true],
      ['delete', venue.ownerId, false],
    ]);
    for (const entry of trail) expect(entry).toMatchObject({ venueId: venue.venueId, couponId: coupon.id, code: 'SAVE10' });
    expect(trail[0]).toMatchObject({ before: null, after: { discount_pct: 10, is_active: true } });
    expect(trail[1]).toMatchObject({ before: { discount_pct: 10 }, after: { discount_pct: 30 } });
    expect(trail[4]).toMatchObject({ before: { discount_pct: 30, is_active: true }, after: null });
    logged.mockRestore();
  });
});

describe('who may cancel and refund a paid order', () => {
  async function paidOrder() {
    const venue = await makeVenue();
    const { order } = await place(venue);
    await pay(order.id);
    return { venue, orderId: order.id };
  }

  it('refuses a venues-console editor the refund, but leaves them the kitchen board', async () => {
    const { orderId } = await paidOrder();
    const editor = signedIn(new Types.ObjectId().toHexString(), ['USER', 'ALL_VENUES_ACCESS']);

    expect(
      await refusal(async () => venueFoodResolvers.Mutation.cancelVenueFoodOrder(null, { order_id: orderId, reason: 'Kitchen closed' }, editor))
    ).toMatchObject({ code: 'FORBIDDEN', message: 'Not your venue' });
    expect(rzp.createRazorpayRefund).not.toHaveBeenCalled();
    expect(await VenueFoodOrderModel.findById(orderId).lean()).toMatchObject({ status: 'PLACED', payment_status: 'PAID' });

    // Running the board is still theirs.
    expect(await venueFoodResolvers.Mutation.setVenueFoodOrderStatus(null, { order_id: orderId, status: 'ACCEPTED' }, editor)).toMatchObject({
      status: 'ACCEPTED',
    });
  });

  it('lets a platform governor who does not own the venue cancel and refund', async () => {
    const { orderId } = await paidOrder();
    const governor = signedIn(new Types.ObjectId().toHexString(), ['USER', 'SUPER_ADMIN']);

    const cancelled = await venueFoodResolvers.Mutation.cancelVenueFoodOrder(null, { order_id: orderId, reason: 'Kitchen closed' }, governor);
    expect(cancelled).toMatchObject({ status: 'CANCELLED', payment_status: 'REFUNDED' });
    expect(rzp.createRazorpayRefund).toHaveBeenCalledTimes(1);
  });

  it('lets the owner cancel through the resolver with no staff role at all', async () => {
    const { venue, orderId } = await paidOrder();
    const cancelled = await venueFoodResolvers.Mutation.cancelVenueFoodOrder(null, { order_id: orderId, reason: 'Out of stock' }, signedIn(venue.ownerId));
    expect(cancelled).toMatchObject({ status: 'CANCELLED' });
  });
});
