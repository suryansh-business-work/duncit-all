import type { Types } from 'mongoose';
import { ShortLinkModel, type ShortLinkMedium, type ShortLinkSource } from '@modules/crm/marketing/shortLink.model';
import { ShortLinkClickModel, type JourneyStep } from '@modules/crm/marketing/shortLinkClick.model';
import { MarketingCampaignModel } from '@modules/crm/marketing/marketing.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { LocationSubscriptionModel } from '@modules/platform/locationSubscription/locationSubscription.model';
import { dayKeyExpr, inRange } from './window';
import { pct, total } from './shapes';
import type { DayRow } from './pods.data';

/**
 * Everything the Marketing analytics page reads. A click is counted on the day
 * it happened and followed forward — did that visitor go on to sign up or pay?
 * Money a link earned is counted on the day it was paid.
 */

/** The 30 days `attributePayment` looks back for a payment's click — the bound that keeps a
 * payment-date question on the indexed click date. */
const ATTRIBUTION_MS = 30 * 86_400_000;

/** The coupon page's rule: a refund gives the money back, but the code was still spent. */
const REDEEMED = ['SUCCESS', 'REFUNDED'];

/** 1 when the click reached `step`, else 0 — summed inside a `$group`. */
const reached = (step: JourneyStep) => ({
  $cond: [{ $in: [step, { $ifNull: ['$journey.step', []] }] }, 1, 0],
});

export interface ClickDay {
  _id: string;
  clicks: number;
  signups: number;
}

export interface ConversionDay {
  _id: string;
  payments: number;
  amount: number;
}

export interface CouponRow {
  _id: { day: string; code: string };
  count: number;
  discount: number;
}

export interface MarketingPeriod {
  clicks: ClickDay[];
  conversions: ConversionDay[];
  coupons: CouponRow[];
  waitlist: DayRow[];
  links_created: number;
  campaigns_sent: number;
}

const clickDays = (from: Date, to: Date, zone: string) =>
  ShortLinkClickModel.aggregate<ClickDay>([
    { $match: { clicked_at: inRange(from, to) } },
    { $group: { _id: dayKeyExpr('clicked_at', zone), clicks: { $sum: 1 }, signups: { $sum: reached('SIGNED_UP') } } },
  ]);

const conversionDays = (from: Date, to: Date, zone: string) =>
  ShortLinkClickModel.aggregate<ConversionDay>([
    { $match: { clicked_at: { $gte: new Date(from.getTime() - ATTRIBUTION_MS), $lt: to }, 'conversions.at': inRange(from, to) } },
    { $unwind: '$conversions' },
    { $match: { 'conversions.at': inRange(from, to) } },
    { $group: { _id: dayKeyExpr('conversions.at', zone), payments: { $sum: 1 }, amount: { $sum: '$conversions.amount' } } },
  ]);

const couponRows = (from: Date, to: Date, zone: string) =>
  PaymentModel.aggregate<CouponRow>([
    { $match: { status: { $in: REDEEMED }, created_at: inRange(from, to), coupon_code: { $nin: [null, ''] } } },
    {
      $group: {
        _id: { day: dayKeyExpr('created_at', zone), code: '$coupon_code' },
        count: { $sum: 1 },
        discount: { $sum: '$coupon_discount' },
      },
    },
  ]);

const waitlistDays = (from: Date, to: Date, zone: string) =>
  LocationSubscriptionModel.aggregate<DayRow>([
    { $match: { created_at: inRange(from, to) } },
    { $group: { _id: dayKeyExpr('created_at', zone), value: { $sum: 1 } } },
  ]);

/** Everything the page reads for ONE period — loaded for the chosen period and the one before. */
export async function loadMarketingPeriod(from: Date, to: Date, zone: string): Promise<MarketingPeriod> {
  const [clicks, conversions, coupons, waitlist, linksCreated, campaignsSent] = await Promise.all([
    clickDays(from, to, zone),
    conversionDays(from, to, zone),
    couponRows(from, to, zone),
    waitlistDays(from, to, zone),
    ShortLinkModel.countDocuments({ created_at: inRange(from, to) }),
    MarketingCampaignModel.countDocuments({ status: 'SENT', sent_at: inRange(from, to) }),
  ]);
  return { clicks, conversions, coupons, waitlist, links_created: linksCreated, campaigns_sent: campaignsSent };
}

/** Each tile's value for one period — computed identically for both periods. */
export function marketingFigures(period: MarketingPeriod) {
  const clicks = total(period.clicks.map((row) => row.clicks));
  const signups = total(period.clicks.map((row) => row.signups));
  return {
    links_created: period.links_created,
    clicks,
    signups,
    signup_rate: pct(signups, clicks),
    bookings: total(period.conversions.map((row) => row.payments)),
    link_revenue: Math.round(total(period.conversions.map((row) => row.amount))),
    coupons_redeemed: total(period.coupons.map((row) => row.count)),
    discount_given: Math.round(total(period.coupons.map((row) => row.discount))),
    waitlist_joins: total(period.waitlist.map((row) => row.value)),
    campaigns_sent: period.campaigns_sent,
  };
}

/** One link's clicks in the period, and what those clicks went on to do. */
export interface LinkClicks {
  _id: Types.ObjectId;
  code: string;
  clicks: number;
  signups: number;
  paid: number;
  earned: number;
}

export const clicksByLink = (from: Date, to: Date) =>
  ShortLinkClickModel.aggregate<LinkClicks>([
    { $match: { clicked_at: inRange(from, to) } },
    {
      $group: {
        _id: '$short_link_id',
        code: { $first: '$code' },
        clicks: { $sum: 1 },
        signups: { $sum: reached('SIGNED_UP') },
        paid: { $sum: reached('PAID') },
        earned: { $sum: { $ifNull: ['$converted_amount', 0] } },
      },
    },
  ]);

export interface LinkMeta {
  _id: Types.ObjectId;
  label: string;
  source: ShortLinkSource;
  medium: ShortLinkMedium;
}

export const loadLinkMeta = (ids: readonly Types.ObjectId[]) =>
  ShortLinkModel.find({ _id: { $in: ids } })
    .select('label source medium')
    .lean<LinkMeta[]>();

/** How many of the period's clicks reached each later step of the journey. */
export const funnelSteps = (from: Date, to: Date) =>
  ShortLinkClickModel.aggregate<{ _id: string; count: number }>([
    { $match: { clicked_at: inRange(from, to) } },
    { $unwind: '$journey' },
    { $group: { _id: '$journey.step', count: { $sum: 1 } } },
  ]);

export interface WaitingCity {
  id: string;
  name: string;
  target: number;
  subscribers: number;
}

/** Every city still waiting for launch, with its waitlist and the goal the subscribe page shows. */
export async function loadWaitingCities(): Promise<WaitingCity[]> {
  const cities = await LocationModel.find({ is_launched: false, is_active: { $ne: false } })
    .select('location_name launch_target')
    .lean<Array<{ _id: Types.ObjectId; location_name: string; launch_target: number }>>();
  const counts = await LocationSubscriptionModel.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { location_id: { $in: cities.map((city) => city._id) } } },
    { $group: { _id: '$location_id', count: { $sum: 1 } } },
  ]);
  const byCity = new Map(counts.map((row) => [row._id.toHexString(), row.count]));
  return cities.map((city) => ({
    id: city._id.toHexString(),
    name: city.location_name,
    target: city.launch_target,
    subscribers: byCity.get(city._id.toHexString()) ?? 0,
  }));
}

export const countLaunchedCities = () =>
  LocationModel.countDocuments({ is_launched: { $ne: false }, is_active: { $ne: false } });
