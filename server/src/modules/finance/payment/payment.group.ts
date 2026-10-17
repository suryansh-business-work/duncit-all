/**
 * Booking several dates of a recurring pod in one checkout.
 *
 * Each date of a recurring pod is its own pod underneath (podSeries.parent.ts)
 * with its own seats, ticket, attendance, refunds and settlement — so a
 * booking of N dates is N payments, one per date, priced together and paid
 * through ONE Razorpay order. Everything downstream (settlement's money per
 * pod, a cancelled date's refund, a member backing out of one date) then reads
 * exactly the payment it always read, and nothing in Finance has to learn
 * about groups.
 *
 * Pricing, in the same order a single booking is priced:
 *   1. each date: its ticket money after its multi-ticket tier, plus the add-on
 *      products and rentals — which ride on the FIRST date only;
 *   2. the pod's multi-date tier, taken off every date's ticket money;
 *   3. the coupon, evaluated ONCE on the whole booking and shared out by weight;
 *   4. each date rounded up and the buyer's coins spent date by date.
 *
 * Every payment carries `metadata.checkout_group` — the group id, its place in
 * the group and whether it is the PRIMARY, which holds the coupon redemption
 * and the receipt — so verify, the reconciler and Finance can find the rest.
 */
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PaymentModel } from './payment.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodSeriesModel } from '@modules/pods/podSeries/podSeries.model';
import { multiDateDiscountFor } from '@modules/pods/podSeries/podSeries.discount';
import { UserModel } from '@modules/access/user/user.model';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { couponService } from '@modules/finance/coupon/coupon.service';
import { appDate } from '@utils/app-time';
import { createRazorpayOrder, getRazorpayKeys } from './razorpay.gateway';
import { roundUpBill } from './payment.roundoff';
import {
  applyCoins,
  buildBuyerFields,
  computeQuote,
  freeSettlement,
  newPaymentId,
  paymentMetadata,
  razorpaySheet,
  resolvePayable,
  settle,
  toPub,
  type QuoteBreakup,
} from './payment.service';

const round2 = (n: number) => Math.round(n * 100) / 100;

const bad = (message: string, code = 'BAD_USER_INPUT'): never => {
  throw new GraphQLError(message, { extensions: { code } });
};

/** A checkout input that books dates of a recurring pod. */
export interface GroupCheckoutInput {
  pod_id?: string | null;
  date_pod_ids?: string[] | null;
  [key: string]: unknown;
}

/** True when a checkout books dates of a recurring pod rather than a pod. */
export const isGroupCheckout = (input: GroupCheckoutInput): boolean => !!input.date_pod_ids?.length;

/**
 * Splits `amount` across `weights` in whole paise, so the parts add up to it
 * exactly: each part is floored, and the leftover paise go to the largest
 * remainders first.
 */
export function splitByWeight(amount: number, weights: number[]): number[] {
  const paise = Math.round(amount * 100);
  const total = weights.reduce((sum, w) => sum + Math.max(0, w), 0);
  if (paise <= 0 || total <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (paise * Math.max(0, w)) / total);
  const parts = exact.map(Math.floor);
  let left = paise - parts.reduce((sum, p) => sum + p, 0);
  const byRemainder = exact.map((e, i) => ({ i, r: e - Math.floor(e) })).sort((a, b) => b.r - a.r);
  for (const { i } of byRemainder) {
    if (left <= 0) break;
    parts[i] += 1;
    left -= 1;
  }
  return parts.map((p) => p / 100);
}

/** The recurring pod and the dates being booked, oldest first. */
async function loadDates(input: GroupCheckoutInput) {
  const ids = [...new Set(input.date_pod_ids ?? [])];
  if (ids.length === 0 || !ids.every((id) => Types.ObjectId.isValid(id))) bad('Pick the dates to book');
  const parentId = String(input.pod_id ?? '');
  if (!Types.ObjectId.isValid(parentId)) bad('Pod not found', 'NOT_FOUND');
  const [parent, dates] = await Promise.all([
    PodModel.findById(parentId).select('series_id series_role pod_title'),
    PodModel.find({ _id: { $in: ids }, series_parent_id: new Types.ObjectId(parentId) })
      .select('_id pod_date_time')
      .sort({ pod_date_time: 1 }),
  ]);
  if (parent?.series_role !== 'PARENT') bad('Pod not found', 'NOT_FOUND');
  if (dates.length !== ids.length) bad('One of the picked dates is not part of this pod');
  const series = await PodSeriesModel.findById(parent?.series_id).select('multi_date_discount_tiers').lean();
  return { parentId, dates, tiers: series?.multi_date_discount_tiers ?? [] };
}

/** One date of the booking, priced up to (not including) the coupon. */
type Leg = Awaited<ReturnType<typeof resolvePayable>> & {
  input: GroupCheckoutInput;
  multiDate: number;
  payable: number;
};

async function priceLegs(input: GroupCheckoutInput, userId: string) {
  const { parentId, dates, tiers } = await loadDates(input);
  // Rented items belong to one date; a booking of several dates rents nothing.
  if (dates.length > 1 && (input.selected_rentals as unknown[] | undefined)?.length) {
    bad('Rent items while booking one date at a time');
  }
  const pct = multiDateDiscountFor(1, dates.length, tiers).pct;
  const legs: Leg[] = [];
  for (const [i, date] of dates.entries()) {
    // Products and rentals are bought once, with the first date booked.
    const legInput = {
      ...input,
      pod_id: String(date._id),
      date_pod_ids: undefined,
      selected_products: i === 0 ? input.selected_products : [],
      selected_rentals: i === 0 ? input.selected_rentals : [],
    };
    const priced = await resolvePayable(legInput, userId);
    const ticketNet = round2(priced.ticketDiscount.gross - priced.ticketDiscount.amount);
    const multiDate = round2((ticketNet * pct) / 100);
    const description = `${priced.description} · ${appDate(date.pod_date_time)}`;
    legs.push({ ...priced, description, input: legInput, multiDate, payable: round2(priced.payableAmount - multiDate) });
  }
  return { parentId, legs, pct };
}

/** The coupon on the whole booking, shared out across the dates by their couponable money. */
async function couponCuts(input: GroupCheckoutInput, parentId: string, legs: Leg[], userId: string) {
  const code = String(input.coupon_code ?? '').trim();
  const couponable = legs.map((l) => round2(l.payable - l.rentals.total));
  if (!code) return { couponCode: null as string | null, cuts: legs.map(() => 0) };
  const whole = round2(couponable.reduce((sum, c) => sum + c, 0));
  const result = await couponService.evaluate(code, parentId, whole, userId);
  if (!result.ok || !result.coupon) bad(result.message ?? 'Invalid coupon');
  return {
    couponCode: result.coupon?.code ?? null,
    cuts: splitByWeight(round2(whole - Number(result.final_total)), couponable),
  };
}

/** One date's quote: the coupon's share off, then rounded up and paid in coins up to `coins`. */
async function quoteLeg(leg: Leg, cut: number, coins: number, userId: string) {
  const untaxed = leg.rentals.untaxed;
  const original = await computeQuote(leg.payable, { untaxed });
  const couponed = cut > 0 ? await computeQuote(round2(leg.payable - cut), { untaxed }) : original;
  const settled = await applyCoins(coins, userId, couponed, leg.rentals.total, untaxed);
  return {
    quote: settled.quote,
    coinsRedeemed: settled.coinsRedeemed,
    couponDiscount: round2(original.total - couponed.total),
    originalTotal: round2(original.total + leg.ticketDiscount.amount + leg.multiDate),
  };
}

/** Prices a multi-date booking end to end: every date's quote and the metadata it is recorded with. */
async function priceGroup(input: GroupCheckoutInput, userId: string) {
  const { parentId, legs, pct } = await priceLegs(input, userId);
  const { couponCode, cuts } = await couponCuts(input, parentId, legs, userId);
  const { coinService } = await import('@modules/finance/coin/coin.service');
  const wanted = Math.max(0, Math.floor(Number(input.redeem_coins) || 0));
  let coinsLeft = wanted > 0 ? Math.min(wanted, Math.floor(await coinService.balanceOf(userId))) : 0;
  const groupId = new Types.ObjectId().toHexString();
  const priced = [];
  for (const [i, leg] of legs.entries()) {
    // Coins fill the dates in order, each up to its own rounded bill.
    const bill = roundUpBill((await computeQuote(round2(leg.payable - cuts[i]), { untaxed: leg.rentals.untaxed })).total);
    const give = Math.min(coinsLeft, Math.max(0, Math.floor(bill.rounded - leg.rentals.total)));
    const q = await quoteLeg(leg, cuts[i], give, userId);
    coinsLeft -= q.coinsRedeemed;
    const metadata = {
      ...paymentMetadata(leg.input, leg.pod, leg.products, leg.ticketDiscount, leg.rentals),
      original_total: q.originalTotal,
      multi_date_discount: { pct, amount: leg.multiDate, dates: legs.length },
      checkout_group: { id: groupId, index: i + 1, size: legs.length, primary: i === 0, parent_pod_id: parentId },
    };
    priced.push({ leg, ...q, metadata });
  }
  return { priced, couponCode };
}

type PricedLeg = Awaited<ReturnType<typeof priceGroup>>['priced'][number];

/** The payment row for one date, before its gateway fields. */
function legRow(p: PricedLeg, couponCode: string | null, input: GroupCheckoutInput, user: unknown) {
  const quote: QuoteBreakup = p.quote;
  return {
    payment_id: newPaymentId(),
    invoice_no: null,
    user_id: (user as { _id: Types.ObjectId })._id,
    ...buildBuyerFields(input, user),
    checkout_url: String(input.checkout_url ?? ''),
    target_type: 'POD' as const,
    pod_id: new Types.ObjectId(String(p.leg.input.pod_id)),
    description: p.leg.description,
    subtotal: quote.subtotal,
    platform_fee_pct: quote.platform_fee_pct,
    platform_fee_amount: quote.platform_fee_amount,
    gst_pct: quote.gst_pct,
    gst_amount: quote.gst_amount,
    total: quote.total,
    round_off: quote.round_off,
    currency_symbol: quote.currency_symbol,
    coupon_code: couponCode,
    coupon_discount: p.couponDiscount,
    coins_redeemed: p.coinsRedeemed,
    ticket_discount_amount: p.leg.ticketDiscount.amount,
    ticket_discount_pct: p.leg.ticketDiscount.pct,
    paid_at: null,
  };
}

async function loadUser(userId: string) {
  const user = await UserModel.findById(userId);
  if (!user) bad('User not found', 'NOT_FOUND');
  return user;
}

/** Settles every date of a booking one after another; returns the first date's payment. */
async function settleAll(ids: Types.ObjectId[], label: string, component: string) {
  let first = null;
  for (const id of ids) {
    const pub = await settle(String(id), label, component);
    first ??= pub;
  }
  return first;
}

const sum = (values: number[]) => round2(values.reduce((total, v) => total + v, 0));

export const groupCheckoutService = {
  /**
   * The exact bill a multi-date checkout would charge right now — the same
   * pricing `createRazorpayCheckout` runs, without writing anything. Each date
   * rounds up on its own, so a client adding up one bill locally could be a
   * rupee out per date; the checkout screen shows this instead.
   */
  async quote(input: GroupCheckoutInput, userId: string) {
    const { priced, couponCode } = await priceGroup(input, userId);
    const pick = (fn: (p: PricedLeg) => number) => sum(priced.map(fn));
    return {
      dates: priced.length,
      currency_symbol: priced[0].quote.currency_symbol,
      ticket_gross: pick((p) => p.leg.ticketDiscount.gross),
      ticket_discount_amount: pick((p) => p.leg.ticketDiscount.amount),
      ticket_discount_pct: priced[0].leg.ticketDiscount.pct,
      multi_date_discount_amount: pick((p) => p.leg.multiDate),
      multi_date_discount_pct: priced[0].metadata.multi_date_discount.pct,
      add_ons_total: sum([priced[0].leg.products.total, priced[0].leg.rentals.total]),
      coupon_code: couponCode,
      coupon_discount: pick((p) => p.couponDiscount),
      coins_redeemed: pick((p) => p.coinsRedeemed),
      subtotal: pick((p) => p.quote.subtotal),
      platform_fee_amount: pick((p) => p.quote.platform_fee_amount),
      gst_amount: pick((p) => p.quote.gst_amount),
      // Only charged dates carry their round-off; coins that cleared a date paid it.
      round_off: pick((p) => (p.quote.total > 0 ? p.quote.round_off : 0)),
      total: pick((p) => p.quote.total),
      original_total: pick((p) => p.originalTotal),
    };
  },

  /** The dummy gateway's twin of `createRazorpayCheckout` for several dates. */
  async dummyCheckout(input: GroupCheckoutInput, userId: string) {
    const fs = await getFinanceSettings();
    if (!fs.dummy_mode) bad('Live payment gateway is not configured. Enable dummy mode to test.', 'BAD_REQUEST');
    const user = await loadUser(userId);
    const { priced, couponCode } = await priceGroup(input, userId);
    const failed = !!input.simulate_failure;
    const docs = await PaymentModel.insertMany(
      priced.map((p) => ({
        ...legRow(p, couponCode, input, user),
        status: failed ? 'FAILED' : 'PENDING',
        gateway: 'DUMMY',
        gateway_ref: failed ? null : `dummy_${Date.now()}_${p.metadata.checkout_group.index}`,
        metadata: p.metadata,
      }))
    );
    if (failed) return toPub(docs[0]);
    return settleAll(
      docs.map((d) => d._id),
      'Dummy Gateway',
      'groupDummyCheckout'
    );
  },

  /** One Razorpay order for every date picked, and a PENDING payment per date. */
  async createRazorpayCheckout(input: GroupCheckoutInput, userId: string) {
    const fs = await getFinanceSettings();
    const { keyId } = await getRazorpayKeys();
    const user = await loadUser(userId);
    const { priced, couponCode } = await priceGroup(input, userId);
    const total = priced.reduce((sum, p) => sum + p.quote.total, 0);
    const rows = priced.map((p) => legRow(p, couponCode, input, user));
    const description = priced[0].leg.description;
    const currencySymbol = priced[0].quote.currency_symbol;
    const sheet = { keyId, businessName: fs.business_name, description, input, currencySymbol };

    if (total <= 0) {
      const settlement = freeSettlement(couponCode);
      const docs = await PaymentModel.insertMany(
        rows.map((row, i) => ({
          ...row,
          status: 'PENDING',
          gateway: settlement.gateway,
          gateway_ref: `free_${Date.now()}_${i + 1}`,
          metadata: priced[i].metadata,
        }))
      );
      const payment = await settleAll(
        docs.map((d) => d._id),
        settlement.label,
        'groupCreateRazorpayCheckout'
      );
      return razorpaySheet({
        ...sheet,
        paymentDocId: String(docs[0]._id),
        orderId: '',
        amountPaise: 0,
        total: 0,
        free: true,
        payment,
      });
    }

    const amountPaise = Math.round(total * 100);
    const order = await createRazorpayOrder({
      amountPaise,
      currency: 'INR',
      receipt: rows[0].payment_id,
      notes: { pod_id: String(input.pod_id ?? ''), user_id: userId },
    });
    // Every date holds the ORDER id while pending, so the reconciler can adopt
    // any of them on its own if the buyer never comes back to verify.
    const docs = await PaymentModel.insertMany(
      rows.map((row, i) => ({
        ...row,
        status: 'PENDING',
        gateway: 'RAZORPAY',
        gateway_ref: order.id,
        metadata: { ...priced[i].metadata, razorpay_order_id: order.id },
      }))
    );
    return razorpaySheet({
      ...sheet,
      paymentDocId: String(docs[0]._id),
      orderId: order.id,
      amountPaise,
      total: round2(total),
      free: false,
      payment: null,
    });
  },
};
