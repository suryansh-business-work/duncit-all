import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import { UserModel } from '@modules/access/user/user.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { getFinanceSettings } from './finance.model';
import {
  computePodFinanceBreakdown,
  type BreakdownRates,
  type PodFinanceBreakdown,
} from './breakdown.math';

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const clampPct = (n: number) => Math.min(100, Math.max(0, Number(n) || 0));
const toPaise = (rupees: number) => Math.round((Number(rupees) || 0) * 100);
const toRupees = (paise: number) => round2(paise / 100);

// One party's payout statement. The same shape backs both the host's
// "Host Share" lines and the venue owner's payout lines — only the percentages
// and which amount is the final payout differ.
export interface SettlementParty {
  collected_total: number;
  venue_bill: number;
  gst_pct: number;
  gst_amount: number;
  duncit_pct: number;
  duncit_amount: number;
  payout_pct: number;
  payout_amount: number;
}

/** The full waterfall in rupees — GraphQL-ready mirror of the paise engine
 * output. version identifies the engine that produced it (2 = venue slot price
 * off the pool, host keeps the remainder). */
export interface SettlementWaterfall {
  version: number;
  amount: number;
  gst_pct: number;
  gst_amount: number;
  net_amount: number;
  platform_fee_pct: number;
  platform_fee_amount: number;
  pool_amount: number;
  /** The venue's booked slot price (Partners portal), clamped to the pool. */
  venue_amount: number;
  venue_commission_pct: number;
  venue_commission_amount: number;
  venue_receives: number;
  /** The host's remainder: pool − venue amount. */
  host_amount: number;
  host_commission_pct: number;
  host_commission_amount: number;
  host_receives: number;
  duncit_revenue: number;
  host_earn_pct: number;
}

export interface PodSettlement {
  pod_id: string;
  pod_title: string;
  currency_symbol: string;
  collected_total: number;
  venue_bill: number;
  gst_pct: number;
  host_commission_pct: number;
  venue_commission_pct: number;
  host: SettlementParty;
  venue: SettlementParty | null;
  has_venue: boolean;
  waterfall: SettlementWaterfall;
}

/** Engine version stamped on new settlement snapshots — v2 = venue slot price
 * off the pool + host remainder; v1 (venue-bill reimbursement + host share %)
 * exists only in historical PaymentRelease.breakdown docs and is never
 * recomputed. */
export const SETTLEMENT_ENGINE_VERSION = 2;

/** Money a completed pod actually took in = sum of its SUCCESS payments. */
export async function collectedForPod(podId: string | Types.ObjectId): Promise<number> {
  const rows = await PaymentModel.aggregate([
    { $match: { pod_id: new Types.ObjectId(String(podId)), status: 'SUCCESS' } },
    { $group: { _id: null, total: { $sum: '$total' } } },
  ]);
  return round2(rows[0]?.total ?? 0);
}

/**
 * Resolves the effective dynamic rates for a host/venue pair: per-entity
 * commission overrides first (User.finance.host_commission_pct,
 * Venue.venue_commission_pct — 0 means "inherit"), falling back to the
 * FinanceSettings "Default Deductions". GST % and platform fee % are global.
 */
export async function resolveEffectiveRates(options: {
  hostUserId?: string | Types.ObjectId | null;
  venueId?: string | Types.ObjectId | null;
}): Promise<BreakdownRates> {
  const fs = await getFinanceSettings();
  const hostUser = options.hostUserId
    ? await UserModel.findById(options.hostUserId).select('finance.host_commission_pct')
    : null;
  const venueDoc = options.venueId
    ? await VenueModel.findById(options.venueId).select('venue_commission_pct')
    : null;

  return {
    gst_percent: clampPct(fs.gst_pct),
    platform_fee_percent: clampPct(fs.platform_fee_pct),
    host_commission_percent: clampPct(
      hostUser?.finance?.host_commission_pct || fs.default_host_commission_pct
    ),
    venue_commission_percent: options.venueId
      ? clampPct(venueDoc?.venue_commission_pct || fs.default_venue_commission_pct)
      : 0,
  };
}

/** The venue's money for a pod = its booked slot price (Partners portal).
 * Legacy pods without a slot link fall back to the host-entered venue bill. */
export async function venueAmountForPod(
  pod: { venue_id?: Types.ObjectId | null; venue_slot_id?: Types.ObjectId | null },
  venueBill: number
): Promise<number> {
  if (!pod.venue_id) return 0;
  if (pod.venue_slot_id) {
    const slot = await VenueSlotModel.findById(pod.venue_slot_id).select('price');
    if (slot) return round2(slot.price);
  }
  return venueBill;
}

/** Paise engine output → rupee waterfall for GraphQL/persistence. */
export function toWaterfall(b: PodFinanceBreakdown): SettlementWaterfall {
  return {
    version: SETTLEMENT_ENGINE_VERSION,
    amount: toRupees(b.amount_paise),
    gst_pct: b.rates.gst_percent,
    gst_amount: toRupees(b.gst_paise),
    net_amount: toRupees(b.net_paise),
    platform_fee_pct: b.rates.platform_fee_percent,
    platform_fee_amount: toRupees(b.platform_fee_paise),
    pool_amount: toRupees(b.pool_paise),
    venue_amount: toRupees(b.venue_amount_paise),
    venue_commission_pct: b.rates.venue_commission_percent,
    venue_commission_amount: toRupees(b.venue_commission_paise),
    venue_receives: toRupees(b.venue_receives_paise),
    host_amount: toRupees(b.host_amount_paise),
    host_commission_pct: b.rates.host_commission_percent,
    host_commission_amount: toRupees(b.host_commission_paise),
    host_receives: toRupees(b.host_receives_paise),
    duncit_revenue: toRupees(b.duncit_revenue_paise),
    host_earn_pct: b.host_earn_percent,
  };
}

/** Waterfall for an arbitrary GST-inclusive rupee amount + venue slot price at
 * the given rates — powers the create-pod potential-earnings preview and live
 * pod breakdowns. */
export function waterfallForAmount(
  amountRupees: number,
  venueAmountRupees: number,
  rates: BreakdownRates
): SettlementWaterfall {
  return toWaterfall(
    computePodFinanceBreakdown(
      Math.max(0, toPaise(amountRupees)),
      Math.max(0, toPaise(venueAmountRupees)),
      rates
    )
  );
}

/**
 * Compute the full host + venue settlement for a pod. Engine v2: GST is
 * extracted from the money collected (GST-inclusive), the platform fee comes
 * off the net, the venue's booked slot price (Partners portal) comes off the
 * remaining pool, and the host keeps the remainder — Duncit takes its
 * commission % from each side. The venue bill the host enters is evidence
 * (and the venue-amount fallback for legacy pods without a slot link).
 */
export async function computePodSettlement(podDocId: string, venueBillAmount: number): Promise<PodSettlement> {
  if (!Types.ObjectId.isValid(podDocId)) {
    throw new GraphQLError('Invalid pod', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const pod = await PodModel.findById(podDocId);
  if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });

  const fs = await getFinanceSettings();
  const collected = await collectedForPod(pod._id);
  const venueBill = Math.max(0, round2(venueBillAmount));
  if (venueBill > collected) {
    throw new GraphQLError('Venue bill cannot exceed the amount collected for this pod', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  const hasVenue = !!pod.venue_id;
  const rates = await resolveEffectiveRates({
    hostUserId: pod.pod_hosts_id?.[0] ?? null,
    venueId: hasVenue ? pod.venue_id : null,
  });
  const venueAmount = await venueAmountForPod(pod, venueBill);
  const waterfall = toWaterfall(
    computePodFinanceBreakdown(toPaise(collected), Math.max(0, toPaise(venueAmount)), rates)
  );

  // Legacy party lines, derived from the waterfall so older consumers keep a
  // coherent statement: the host line carries the pod-level GST; the venue line
  // carries none (GST is extracted once, from the customer payment).
  const host: SettlementParty = {
    collected_total: collected,
    venue_bill: venueBill,
    gst_pct: waterfall.gst_pct,
    gst_amount: waterfall.gst_amount,
    duncit_pct: waterfall.host_commission_pct,
    duncit_amount: waterfall.host_commission_amount,
    payout_pct: waterfall.host_earn_pct,
    payout_amount: waterfall.host_receives,
  };
  const venue: SettlementParty | null = hasVenue
    ? {
        collected_total: collected,
        venue_bill: venueBill,
        gst_pct: 0,
        gst_amount: 0,
        duncit_pct: waterfall.venue_commission_pct,
        duncit_amount: waterfall.venue_commission_amount,
        payout_pct: round2(100 - waterfall.venue_commission_pct),
        payout_amount: waterfall.venue_receives,
      }
    : null;

  return {
    pod_id: String(pod._id),
    pod_title: pod.pod_title,
    currency_symbol: fs.currency_symbol,
    collected_total: collected,
    venue_bill: venueBill,
    gst_pct: waterfall.gst_pct,
    host_commission_pct: waterfall.host_commission_pct,
    venue_commission_pct: waterfall.venue_commission_pct,
    host,
    venue,
    has_venue: hasVenue,
    waterfall,
  };
}
