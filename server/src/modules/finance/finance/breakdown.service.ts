import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { POD_LIVE_TAIL_MS } from '@modules/pods/pod/pod.lifecycle';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { PaymentReleaseModel, type IPaymentRelease } from './paymentRelease.model';
import { getFinanceSettings } from './finance.model';
import {
  collectedForPod,
  resolveEffectiveRates,
  venueAmountForPod,
  waterfallForAmount,
  SETTLEMENT_ENGINE_VERSION,
  type SettlementWaterfall,
} from './settlement.service';
import { payableSpots, type BreakdownRates } from './breakdown.math';
import { podExpenseSpend } from '@modules/finance/podExpense/podExpense.totals';

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export type SettlementStatus = 'LIVE' | 'PENDING_APPROVAL' | 'SETTLED';

/** Create-a-Pod earnings projection: what the host would take home if every
 * PAYABLE spot sells. The host's own seat is free, so payable = total - 1. */
export interface PodEarningsProjection {
  total_spots: number;
  payable_spots: number;
  /** The highest venue slot price the pod can still carry — see venueBudgetOf. */
  venue_budget: number;
  waterfall: SettlementWaterfall;
}

<<<<<<< Updated upstream
/**
 * The most a venue's slot can cost before the host earns nothing: the pool
 * after GST, the platform fee and the club-admin cut. The venue's price comes
 * off that pool and the host owns the rest, so a slot priced AT it leaves a
 * host amount of 0 — which `assertViablePodEconomics` refuses. Stated on every
 * projection so a console can show the ceiling before a venue exists.
 */
function venueBudgetOf(waterfall: SettlementWaterfall): number {
  return round2(waterfall.pool_amount - waterfall.club_admin_amount);
}

/** One projection shape for every earnings preview: bill the payable spots
 * (the host's own seat is free) and run the unclamped waterfall, so a venue
 * that costs more than the pool shows as negative host earnings rather than
 * being quietly shrunk. */
function projectionFor(
  podAmount: number,
  noOfSpots: number,
  venuePrice: number,
  rates: BreakdownRates
): PodEarningsProjection {
  const billable = payableSpots(noOfSpots);
  const waterfall = waterfallForAmount(round2(podAmount * billable), venuePrice, rates, {
    clampVenueToPool: false,
  });
  return {
    total_spots: Math.max(0, Math.floor(noOfSpots) || 0),
    payable_spots: billable,
    venue_budget: venueBudgetOf(waterfall),
    waterfall,
  };
}

/**
 * One projection per slot price at ONE rate lookup: what the venue would be
 * paid for that slot and what the host would be left with. The Auto Pod slot
 * picker lists a venue's free slots this way, so every choice carries its own
 * price tag before the venue commits — and a slot the pod's money cannot
 * cover (the same rule assertViablePodEconomics refuses on) is marked so.
 */
export async function venueSlotProjections(input: {
  hostUserId: string | null;
  venueId: string;
  podAmount: number;
  noOfSpots: number;
  slotPrices: number[];
}): Promise<
  { venue_receives: number; venue_commission_pct: number; host_receives: number; viable: boolean }[]
> {
  const rates = await resolveEffectiveRates({ hostUserId: input.hostUserId, venueId: input.venueId });
  return input.slotPrices.map((price) => {
    const { waterfall } = projectionFor(input.podAmount, input.noOfSpots, price, rates);
    return {
      venue_receives: waterfall.venue_receives,
      venue_commission_pct: waterfall.venue_commission_pct,
      host_receives: waterfall.host_receives,
      viable: waterfall.host_receives > 0,
    };
  });
}

=======
>>>>>>> Stashed changes
/** One row of the Step-4 "Suggested Ticket Prices" table. */
export interface SuggestedTicketPrice {
  price: number;
  host_receives: number;
}

// ₹x99 candidate ladder for suggestedTicketPrices: 99, 199, 299, … capped so a
// pathological venue price can never spin the loop unbounded.
const SUGGESTED_PRICE_FIRST = 99;
const SUGGESTED_PRICE_STEP = 100;
const SUGGESTED_PRICE_CAP = 99_999;
const SUGGESTED_PRICE_COUNT = 5;

export interface PodFinanceBreakdownView {
  pod_id: string;
  pod_title: string;
  settlement_status: SettlementStatus;
  /** true when rendered from a frozen v2 completion snapshot (never drifts). */
  frozen: boolean;
  bookings_count: number;
  collected_total: number;
  /** Coins spent across this pod's bookings — cash the pod never collected. */
  coins_redeemed_total: number;
  /** Coins those bookings paid back to buyers as reward. */
  coins_earned_total: number;
  currency_symbol: string;
  has_venue: boolean;
  completed_at: string | null;
  waterfall: SettlementWaterfall;
}

export interface EarningsSummary {
  currency_symbol: string;
  lifetime_earnings: number;
  pending_amount: number;
  pods_completed: number;
  this_month_earnings: number;
}

export interface HostStatusCounts {
  upcoming: number;
  ongoing: number;
  completed: number;
  cancelled: number;
}

export interface HostMonthlyEarning {
  /** "YYYY-MM" bucket key. */
  month: string;
  total: number;
}

export interface HostInsights {
  status_counts: HostStatusCounts;
  monthly_earnings: HostMonthlyEarning[];
}

export interface FinanceStat {
  total: number;
  this_month: number;
  last_month: number;
  mom_change_pct: number;
}

export interface FinanceDashboardStats {
  currency_symbol: string;
  total_revenue: FinanceStat;
  duncit_revenue: FinanceStat;
  gst_collected: FinanceStat;
  pending_payouts: FinanceStat;
  completed_payouts: FinanceStat;
  /** What Duncit itself spent to run pods (Finance > Pod Expenses). */
  pod_expenses: FinanceStat;
}

const monthWindows = (now = new Date()) => {
  const thisStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { thisStart, lastStart };
};

/** Month-over-month % change; +100 when growing from zero. Exported for tests. */
export const momPct = (thisMonth: number, lastMonth: number) => {
  if (lastMonth > 0) return round2(((thisMonth - lastMonth) / lastMonth) * 100);
  return thisMonth > 0 ? 100 : 0;
};

const stat = (total: number, thisMonth: number, lastMonth: number): FinanceStat => ({
  total: round2(total),
  this_month: round2(thisMonth),
  last_month: round2(lastMonth),
  mom_change_pct: momPct(round2(thisMonth), round2(lastMonth)),
});

/** Rebuild the waterfall from a frozen v2 HOST_PAYMENT snapshot (+ its sibling
 * VENUE_BILLING release for the venue side). v2 snapshots are written complete
 * by settlementToBreakdown, so fields are read directly. Frozen numbers never
 * drift when rates change after settlement. */
function waterfallFromSnapshot(hostRelease: IPaymentRelease, venueRelease: IPaymentRelease | null): SettlementWaterfall {
  const b = hostRelease.breakdown!;
  const vb = venueRelease?.breakdown ?? null;
  // The waterfall was computed from the ATTENDANCE basis, so that is the top
  // line it reconciles against — collected_total is the whole pod's money and
  // rendering it above attendance-based lines broke the invariant (and skewed
  // host_earn_pct). Older snapshots without attended_total fall back.
  const amount = b.attended_total || b.collected_total;
  return {
    version: b.version,
    amount,
    gst_pct: b.gst_pct,
    gst_amount: b.gst_amount,
    net_amount: b.net_amount,
    platform_fee_pct: b.platform_fee_pct,
    platform_fee_amount: b.platform_fee_amount,
    pool_amount: b.pool_amount,
    club_admin_pct: b.club_admin_pct ?? 0,
    club_admin_amount: b.club_admin_amount ?? 0,
    venue_amount: vb ? vb.share_amount : 0,
    venue_commission_pct: vb ? vb.commission_pct : 0,
    venue_commission_amount: vb ? vb.commission_amount : 0,
    venue_receives: vb ? vb.payout_amount : 0,
    host_amount: b.share_amount,
    host_commission_pct: b.commission_pct,
    host_commission_amount: b.commission_amount,
    host_receives: b.payout_amount,
    duncit_revenue: b.duncit_revenue,
    host_earn_pct: amount > 0 ? round2((b.payout_amount / amount) * 100) : 0,
  };
}

/** Shared input validation for the create-pod money previews
 * (potentialPodEarnings / suggestedTicketPrices). Returns the venue price that
 * actually applies: the given amount with a venue selected, 0 otherwise. */
function assertPreviewInputs(
  noOfSpots: number,
  venueId?: string | null,
  venueAmount?: number | null
): number {
  if (!Number.isFinite(noOfSpots) || noOfSpots < 0) {
    throw new GraphQLError('Spots must be 0 or more', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const venuePrice = venueAmount ?? 0;
  if (!Number.isFinite(venuePrice) || venuePrice < 0) {
    throw new GraphQLError('Venue amount must be 0 or more', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  if (venueId && !Types.ObjectId.isValid(venueId)) {
    throw new GraphQLError('Invalid venue', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return venueId ? venuePrice : 0;
}

export const breakdownService = {
  /**
   * The complete financial breakdown for one pod. Settled/submitted pods with a
   * v2 snapshot render the frozen numbers; everything else computes live from
   * the money collected and the currently-effective dynamic rates.
   */
  async podFinanceBreakdown(podDocId: string): Promise<PodFinanceBreakdownView> {
    if (!Types.ObjectId.isValid(podDocId)) {
      throw new GraphQLError('Invalid pod', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const pod = await PodModel.findById(podDocId).select(
      'pod_title pod_hosts_id venue_id venue_slot_id completed_at'
    );
    if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });

    const fs = await getFinanceSettings();
    const collected = await collectedForPod(pod._id);
    const bookings = await PaymentModel.countDocuments({ pod_id: pod._id, status: 'SUCCESS' });
    // Coins on the SAME set of payments `collectedForPod` counts, so the two
    // figures always describe one population of bookings.
    const [coinTotals] = await PaymentModel.aggregate<{ redeemed: number; earned: number }>([
      { $match: { pod_id: pod._id, status: 'SUCCESS' } },
      {
        $group: {
          _id: null,
          redeemed: { $sum: { $ifNull: ['$coins_redeemed', 0] } },
          earned: { $sum: { $ifNull: ['$coins_earned', 0] } },
        },
      },
    ]);

    const hostRelease = await PaymentReleaseModel.findOne({
      pod_id: pod._id,
      kind: 'HOST_PAYMENT',
      status: { $in: ['PENDING', 'APPROVED'] },
    }).sort({ created_at: -1 });

    let settlementStatus: SettlementStatus = 'LIVE';
    if (hostRelease) settlementStatus = hostRelease.status === 'APPROVED' ? 'SETTLED' : 'PENDING_APPROVAL';

    const frozen = !!hostRelease?.breakdown && hostRelease.breakdown.version >= SETTLEMENT_ENGINE_VERSION;
    let waterfall: SettlementWaterfall;
    if (frozen) {
      const venueRelease = await PaymentReleaseModel.findOne({
        pod_id: pod._id,
        kind: 'VENUE_BILLING',
        status: { $in: ['PENDING', 'APPROVED'] },
      }).sort({ created_at: -1 });
      waterfall = waterfallFromSnapshot(hostRelease, venueRelease);
    } else {
      const rates = await resolveEffectiveRates({
        hostUserId: pod.pod_hosts_id?.[0] ?? null,
        venueId: pod.venue_id ?? null,
      });
      // Live view: the venue side is its booked slot price (Partners portal);
      // no bill has been entered yet, so legacy pods without a slot show 0.
      // Unclamped like settlement itself — the venue is owed its booked price,
      // so the live view must quote the same venue money completion will pay
      // (a shortfall shows as a negative host amount here too).
      const venueAmount = await venueAmountForPod(pod, 0);
      waterfall = waterfallForAmount(collected, venueAmount, rates, { clampVenueToPool: false });
    }

    return {
      pod_id: String(pod._id),
      pod_title: pod.pod_title,
      coins_redeemed_total: coinTotals?.redeemed ?? 0,
      coins_earned_total: coinTotals?.earned ?? 0,
      settlement_status: settlementStatus,
      frozen,
      bookings_count: bookings,
      collected_total: collected,
      currency_symbol: fs.currency_symbol,
      has_venue: !!pod.venue_id,
      completed_at: (pod as any).completed_at?.toISOString?.() ?? null,
      waterfall,
    };
  },

  /** Whether the viewer may see a pod's breakdown: its host or its venue's owner
   * (admins are checked by the resolver before calling). */
  async canViewPodBreakdown(podDocId: string, userId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(podDocId)) return false;
    const pod = await PodModel.findById(podDocId).select('pod_hosts_id venue_id');
    if (!pod) return false;
    if (pod.pod_hosts_id.some((id) => String(id) === userId)) return true;
    if (!pod.venue_id) return false;
    const venue = await VenueModel.findById(pod.venue_id).select('owner_user_id');
    return String(venue?.owner_user_id ?? '') === userId;
  },

  /** Potential earnings for the create-pod preview. `podAmount` is the
   * GST-inclusive ticket price PER SPOT; the pod is billed on payable spots
   * (total - 1) because the host's own seat is free. Uses the calling host's
   * effective rates (+ the chosen venue's commission); venueAmount is the picked
   * slot's price (Partners portal). */
  async potentialPodEarnings(
    hostUserId: string,
    podAmount: number,
    noOfSpots: number,
    venueId?: string | null,
    venueAmount?: number | null
  ): Promise<PodEarningsProjection> {
    if (!Number.isFinite(podAmount) || podAmount < 0) {
      throw new GraphQLError('Amount must be 0 or more', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const venuePrice = assertPreviewInputs(noOfSpots, venueId, venueAmount);
    const rates = await resolveEffectiveRates({ hostUserId, venueId: venueId ?? null });
<<<<<<< Updated upstream
    // PREVIEW: the venue's fixed price is NEVER auto-reduced to fit the pool
    // — a shortfall renders as negative host earnings so the clients can show
    // the real gap. Settlement runs the same unclamped branch.
    return projectionFor(podAmount, noOfSpots, venuePrice, rates);
  },

  /**
   * The admin consoles' projection for a pod being WRITTEN there.
   *
   * Two things differ from a host's own preview. The rates are the chosen
   * host's, not the caller's — an admin is not the host — and with no host
   * chosen they are the platform defaults, which is what `validateTemplate`
   * checks an Auto Pod against before anyone enrols; the console must show the
   * same picture the save is judged on. And the venue's money is read from the
   * slot document rather than sent by the client: the editor only holds the
   * slot's id, and the booked slot of a pod being edited is no longer in any
   * list the form reads.
   */
  async adminPotentialPodEarnings(input: {
    hostUserId: string | null;
    podAmount: number;
    noOfSpots: number;
    venueId?: string | null;
    venueSlotId?: string | null;
  }): Promise<PodEarningsProjection> {
    const { hostUserId, podAmount, noOfSpots } = input;
    if (!Number.isFinite(podAmount) || podAmount < 0) {
      throw new GraphQLError('Amount must be 0 or more', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    assertPreviewInputs(noOfSpots, input.venueId, 0);
    if (hostUserId && !Types.ObjectId.isValid(hostUserId)) {
      throw new GraphQLError('Invalid host', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    if (input.venueSlotId && !Types.ObjectId.isValid(input.venueSlotId)) {
      throw new GraphQLError('Invalid slot', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const venueId = input.venueId ?? null;
    const venuePrice = venueId
      ? await venueAmountForPod(
          {
            venue_id: new Types.ObjectId(venueId),
            venue_slot_id: input.venueSlotId ? new Types.ObjectId(input.venueSlotId) : null,
          },
          0
        )
      : 0;
    const rates = await resolveEffectiveRates({ hostUserId, venueId });
    return projectionFor(podAmount, noOfSpots, venuePrice, rates);
  },

  /**
   * The same projection for a signed-OUT visitor — the marketing site's
   * earnings estimator.
   *
   * Identical maths to potentialPodEarnings, run at the platform's DEFAULT
   * rates because there is no host to personalise for: no host commission
   * override, no venue's negotiated commission. The venue's cost is taken as a
   * plain rupee amount the visitor types, since a public page has no venue to
   * resolve a slot price from. That makes this an ESTIMATE at standard rates,
   * which is what the page says it is — and it is still the platform's own
   * waterfall, never a percentage copied into a website.
   */
  async publicPodEarningsEstimate(
    podAmount: number,
    noOfSpots: number,
    venueAmount?: number | null
  ): Promise<PodEarningsProjection> {
    if (!Number.isFinite(podAmount) || podAmount < 0) {
      throw new GraphQLError('Amount must be 0 or more', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const venuePrice = venueAmount ?? 0;
    if (!Number.isFinite(venuePrice) || venuePrice < 0) {
      throw new GraphQLError('Venue amount must be 0 or more', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    if (!Number.isFinite(noOfSpots) || noOfSpots < 0) {
      throw new GraphQLError('Spots must be 0 or more', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const rates = await resolveEffectiveRates({ hostUserId: null, venueId: null });
    // Same preview rule as the app: a venue that costs more than the pool
    // shows as a negative host payout rather than being quietly clamped.
    return projectionFor(podAmount, noOfSpots, venuePrice, rates);
  },

  /** Step-4 "Suggested Ticket Prices": walks the ₹x99 ladder (99, 199, 299, …)
   * at the caller's effective rates and returns the first candidates whose
   * projected host payout is STRICTLY positive (an exactly-₹0 payout is never
   * suggested) — up to 5 rows, fewer near the ₹99,999 cap, empty when no
   * candidate earns the host anything (unset spots, or a venue price no
   * candidate can cover). Same input surface as potentialPodEarnings minus the
   * ticket price. */
  async suggestedTicketPrices(
    hostUserId: string,
    noOfSpots: number,
    venueId?: string | null,
    venueAmount?: number | null
  ): Promise<SuggestedTicketPrice[]> {
    const venuePrice = assertPreviewInputs(noOfSpots, venueId, venueAmount);
    const billable = payableSpots(noOfSpots);
    if (billable <= 0) return [];
    const rates = await resolveEffectiveRates({ hostUserId, venueId: venueId ?? null });
    const rows: SuggestedTicketPrice[] = [];
    for (
      let price = SUGGESTED_PRICE_FIRST;
      price <= SUGGESTED_PRICE_CAP && rows.length < SUGGESTED_PRICE_COUNT;
      price += SUGGESTED_PRICE_STEP
    ) {
      const waterfall = waterfallForAmount(round2(price * billable), venuePrice, rates, {
        clampVenueToPool: false,
      });
      if (waterfall.host_receives > 0) {
        rows.push({ price, host_receives: waterfall.host_receives });
      }
    }
    return rows;
  },

  /**
   * Create/edit guard shared by createPod, createPartnerPod and
   * hostResubmitPod: a PAID pod must (a) fully cover the venue's fixed slot
   * price with its total pod value (ticket price × payable spots) and (b)
   * leave the host a strictly positive projected payout. Free pods (amount 0)
   * are exempt. Settlement NEVER calls this — already-created shortfall pods
   * still settle (unclamped: the venue is paid in full, the host floored at 0).
   */
  async assertViablePodEconomics(input: {
    hostUserId: string | null;
    podAmount: number;
    noOfSpots: number;
    venueId?: string | null;
    venueAmount?: number | null;
  }): Promise<void> {
    const podAmount = Number(input.podAmount) || 0;
    if (podAmount <= 0) return;
    const venuePrice = input.venueId ? Math.max(0, Number(input.venueAmount) || 0) : 0;
    const totalPodValue = round2(podAmount * payableSpots(Number(input.noOfSpots) || 0));
    if (totalPodValue < venuePrice) {
      throw new GraphQLError(
        'Total pod value is less than the venue price. Increase the ticket price so the pod covers the venue.',
        { extensions: { code: 'BAD_USER_INPUT' } }
      );
    }
    const rates = await resolveEffectiveRates({
      hostUserId: input.hostUserId,
      venueId: input.venueId ?? null,
    });
    const { host_receives } = waterfallForAmount(totalPodValue, venuePrice, rates, {
      clampVenueToPool: false,
    });
    if (host_receives <= 0) {
      throw new GraphQLError(
        'Estimated host earnings are ₹0 for this ticket price. Increase the ticket price to earn from this pod.',
        { extensions: { code: 'BAD_USER_INPUT' } }
      );
    }
=======
    // The host's spot is free — only (total - 1) spots are ever billed.
    const billable = payableSpots(noOfSpots);
    const amount = round2(podAmount * billable);
    return {
      total_spots: Math.max(0, Math.floor(noOfSpots) || 0),
      payable_spots: billable,
      // PREVIEW: the venue's fixed price is NEVER auto-reduced to fit the pool
      // — a shortfall renders as negative host earnings so the clients can show
      // the real gap. Settlement keeps the legacy clamp (see breakdown.math).
      waterfall: waterfallForAmount(amount, venuePrice, rates, { clampVenueToPool: false }),
    };
>>>>>>> Stashed changes
  },

  /** Step-4 "Suggested Ticket Prices": walks the ₹x99 ladder (99, 199, 299, …)
   * at the caller's effective rates and returns the first candidates whose
   * projected host payout is STRICTLY positive (an exactly-₹0 payout is never
   * suggested) — up to 5 rows, fewer near the ₹99,999 cap, empty when no
   * candidate earns the host anything (unset spots, or a venue price no
   * candidate can cover). Same input surface as potentialPodEarnings minus the
   * ticket price. */
  async suggestedTicketPrices(
    hostUserId: string,
    noOfSpots: number,
    venueId?: string | null,
    venueAmount?: number | null
  ): Promise<SuggestedTicketPrice[]> {
    const venuePrice = assertPreviewInputs(noOfSpots, venueId, venueAmount);
    const billable = payableSpots(noOfSpots);
    if (billable <= 0) return [];
    const rates = await resolveEffectiveRates({ hostUserId, venueId: venueId ?? null });
    const rows: SuggestedTicketPrice[] = [];
    for (
      let price = SUGGESTED_PRICE_FIRST;
      price <= SUGGESTED_PRICE_CAP && rows.length < SUGGESTED_PRICE_COUNT;
      price += SUGGESTED_PRICE_STEP
    ) {
      const waterfall = waterfallForAmount(round2(price * billable), venuePrice, rates, {
        clampVenueToPool: false,
      });
      if (waterfall.host_receives > 0) {
        rows.push({ price, host_receives: waterfall.host_receives });
      }
    }
    return rows;
  },

  /**
   * Create/edit guard shared by createPod, createPartnerPod and
   * hostResubmitPod: a PAID pod must (a) fully cover the venue's fixed slot
   * price with its total pod value (ticket price × payable spots) and (b)
   * leave the host a strictly positive projected payout. Free pods (amount 0)
   * are exempt. Settlement NEVER calls this — legacy shortfall pods keep
   * settling under the clamped engine unchanged.
   */
  async assertViablePodEconomics(input: {
    hostUserId: string | null;
    podAmount: number;
    noOfSpots: number;
    venueId?: string | null;
    venueAmount?: number | null;
  }): Promise<void> {
    const podAmount = Number(input.podAmount) || 0;
    if (podAmount <= 0) return;
    const venuePrice = input.venueId ? Math.max(0, Number(input.venueAmount) || 0) : 0;
    const totalPodValue = round2(podAmount * payableSpots(Number(input.noOfSpots) || 0));
    if (totalPodValue < venuePrice) {
      throw new GraphQLError(
        'Total pod value is less than the venue price. Increase the ticket price so the pod covers the venue.',
        { extensions: { code: 'BAD_USER_INPUT' } }
      );
    }
    const rates = await resolveEffectiveRates({
      hostUserId: input.hostUserId,
      venueId: input.venueId ?? null,
    });
    const { host_receives } = waterfallForAmount(totalPodValue, venuePrice, rates, {
      clampVenueToPool: false,
    });
    if (host_receives <= 0) {
      throw new GraphQLError(
        'Estimated host earnings are ₹0 for this ticket price. Increase the ticket price to earn from this pod.',
        { extensions: { code: 'BAD_USER_INPUT' } }
      );
    }
  },

  /** Host Studio dashboard summary — lifetime/pending/this-month payout totals
   * from the host's own HOST_PAYMENT releases. */
  async hostEarningsSummary(userId: string): Promise<EarningsSummary> {
    const fs = await getFinanceSettings();
    return summaryFor(fs.currency_symbol, { kind: 'HOST_PAYMENT', host_user_id: new Types.ObjectId(userId) });
  },

  /** Host Insights charts (Host Studio dashboard): the pod-status distribution
   * — including CANCELLED (soft-deleted) pods that every other host read hides —
   * plus the host's monthly payout totals for the last `months` months. */
  async hostInsights(userId: string, months: number): Promise<HostInsights> {
    const uid = new Types.ObjectId(userId);
    const [status_counts, monthly_earnings] = await Promise.all([
      hostStatusCounts(uid),
      hostMonthlyEarnings(uid, months),
    ]);
    return { status_counts, monthly_earnings };
  },

  /** Venue Earnings dashboard summary across every venue the user owns. */
  async venueEarningsSummary(userId: string): Promise<EarningsSummary> {
    const fs = await getFinanceSettings();
    const venues = await VenueModel.find({ owner_user_id: new Types.ObjectId(userId) }).select('_id');
    if (venues.length === 0) {
      return {
        currency_symbol: fs.currency_symbol,
        lifetime_earnings: 0,
        pending_amount: 0,
        pods_completed: 0,
        this_month_earnings: 0,
      };
    }
    return summaryFor(fs.currency_symbol, {
      kind: 'VENUE_BILLING',
      venue_id: { $in: venues.map((v) => v._id) },
    });
  },

  /** Finance dashboard KPI cards: totals + month-over-month deltas, all
   * server-aggregated (revenue/GST from Payments, payouts from releases,
   * Duncit revenue from settlement snapshots — v2 pod-level, v1 host-side). */
  async dashboardStats(): Promise<FinanceDashboardStats> {
    const fs = await getFinanceSettings();
    const { thisStart, lastStart } = monthWindows();

    // Callers only ever pass all-time (no window), this-month (from only), or
    // last-month (from + to) — so the window key exists exactly when `from` does.
    const window = (from?: Date, to?: Date) =>
      from ? { $gte: from, ...(to ? { $lt: to } : {}) } : null;

    const paymentAgg = async (from?: Date, to?: Date) => {
      const range = window(from, to);
      const match: any = { status: 'SUCCESS', ...(range ? { created_at: range } : {}) };
      const rows = await PaymentModel.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: '$total' }, gst: { $sum: '$gst_amount' } } },
      ]);
      return { total: rows[0]?.total ?? 0, gst: rows[0]?.gst ?? 0 };
    };

    const releaseAgg = async (match: any, sumExpr: any, dateField: string, from?: Date, to?: Date) => {
      const range = window(from, to);
      const fullMatch: any = { ...match, ...(range ? { [dateField]: range } : {}) };
      const rows = await PaymentReleaseModel.aggregate([
        { $match: fullMatch },
        { $group: { _id: null, total: { $sum: sumExpr } } },
      ]);
      return rows[0]?.total ?? 0;
    };

    // Duncit revenue per settled pod: v2 snapshots carry the pod-level total on
    // the HOST_PAYMENT release; v1 host snapshots approximate it host-side.
    const duncitExpr = {
      $cond: [
        { $gte: ['$breakdown.version', SETTLEMENT_ENGINE_VERSION] },
        { $ifNull: ['$breakdown.duncit_revenue', 0] },
        { $ifNull: ['$breakdown.duncit_amount', 0] },
      ],
    };
    const approvedHost = { kind: 'HOST_PAYMENT', status: 'APPROVED', breakdown: { $ne: null } };
    const approvedAll = { status: 'APPROVED' };
    const pendingAll = { status: 'PENDING' };
    const approvedExpr = { $ifNull: ['$approved_amount', '$amount_requested'] };
    const requestedExpr = '$amount_requested';

    const [payAll, payThis, payLast] = await Promise.all([
      paymentAgg(),
      paymentAgg(thisStart),
      paymentAgg(lastStart, thisStart),
    ]);
    const [duncitAll, duncitThis, duncitLast] = await Promise.all([
      releaseAgg(approvedHost, duncitExpr, 'reviewed_at'),
      releaseAgg(approvedHost, duncitExpr, 'reviewed_at', thisStart),
      releaseAgg(approvedHost, duncitExpr, 'reviewed_at', lastStart, thisStart),
    ]);
    const [pendAll, pendThis, pendLast] = await Promise.all([
      releaseAgg(pendingAll, requestedExpr, 'requested_at'),
      releaseAgg(pendingAll, requestedExpr, 'requested_at', thisStart),
      releaseAgg(pendingAll, requestedExpr, 'requested_at', lastStart, thisStart),
    ]);
    const [doneAll, doneThis, doneLast] = await Promise.all([
      releaseAgg(approvedAll, approvedExpr, 'reviewed_at'),
      releaseAgg(approvedAll, approvedExpr, 'reviewed_at', thisStart),
      releaseAgg(approvedAll, approvedExpr, 'reviewed_at', lastStart, thisStart),
    ]);
    // Pod spend is dated by when the money LEFT (the expense date), not when
    // the row was typed — a bill entered late still belongs to its own month.
    const [podExAll, podExThis, podExLast] = await Promise.all([
      podExpenseSpend(),
      podExpenseSpend(thisStart),
      podExpenseSpend(lastStart, thisStart),
    ]);

    return {
      currency_symbol: fs.currency_symbol,
      total_revenue: stat(payAll.total, payThis.total, payLast.total),
      gst_collected: stat(payAll.gst, payThis.gst, payLast.gst),
      duncit_revenue: stat(duncitAll, duncitThis, duncitLast),
      pending_payouts: stat(pendAll, pendThis, pendLast),
      completed_payouts: stat(doneAll, doneThis, doneLast),
      pod_expenses: stat(podExAll, podExThis, podExLast),
    };
  },
};

const monthKey = (year: number, month: number): string => `${year}-${String(month).padStart(2, '0')}`;

/** Classifies one pod into a donut bucket. Cancelled = soft-deleted; Completed =
 * finance-settled OR past its end time; then Ongoing vs Upcoming by start time.
 * Exported: the Partners venue-pods list derives its status the same way. */
export function bucketForPod(
  pod: {
    pod_date_time?: Date | null;
    pod_end_date_time?: Date | null;
    completed_at?: Date | null;
    deleted_at?: Date | null;
  },
  now: number
): keyof HostStatusCounts {
  if (pod.deleted_at) return 'cancelled';
  const start = pod.pod_date_time ? new Date(pod.pod_date_time).getTime() : Number.NaN;
  if (Number.isNaN(start)) return 'upcoming';
  const end = pod.pod_end_date_time ? new Date(pod.pod_end_date_time).getTime() : start + POD_LIVE_TAIL_MS;
  if (pod.completed_at || now > end) return 'completed';
  if (now >= start) return 'ongoing';
  return 'upcoming';
}

/** Pod-status distribution for a host, INCLUDING soft-deleted (cancelled) pods —
 * opts into includeDeleted since every normal host read strips them. */
async function hostStatusCounts(uid: Types.ObjectId): Promise<HostStatusCounts> {
  const pods = await PodModel.find({ pod_hosts_id: uid })
    .select('pod_date_time pod_end_date_time completed_at deleted_at')
    .setOptions({ includeDeleted: true })
    .lean();
  const now = Date.now();
  const counts: HostStatusCounts = { upcoming: 0, ongoing: 0, completed: 0, cancelled: 0 };
  for (const pod of pods) {
    counts[bucketForPod(pod, now)] += 1;
  }
  return counts;
}

/** The host's approved HOST_PAYMENT payouts bucketed by review month, as a dense
 * series over the last `months` months (missing months are 0 so bars stay
 * continuous). Local-month bucketing keeps it aligned with the summary windows. */
async function hostMonthlyEarnings(uid: Types.ObjectId, months: number): Promise<HostMonthlyEarning[]> {
  const n = Math.min(36, Math.max(1, Math.floor(months) || 12));
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (n - 1), 1);
  const releases = await PaymentReleaseModel.find({
    kind: 'HOST_PAYMENT',
    status: 'APPROVED',
    host_user_id: uid,
    reviewed_at: { $gte: start },
  })
    .select('approved_amount amount_requested reviewed_at')
    .lean();

  const byKey = new Map<string, number>();
  for (const r of releases) {
    if (!r.reviewed_at) continue;
    const d = new Date(r.reviewed_at);
    const key = monthKey(d.getFullYear(), d.getMonth() + 1);
    const amount = r.approved_amount ?? r.amount_requested ?? 0;
    byKey.set(key, (byKey.get(key) ?? 0) + amount);
  }

  const out: HostMonthlyEarning[] = [];
  for (let i = 0; i < n; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1) + i, 1);
    const key = monthKey(d.getFullYear(), d.getMonth() + 1);
    out.push({ month: key, total: round2(byKey.get(key) ?? 0) });
  }
  return out;
}

/** Shared aggregation for host/venue earnings summaries. */
async function summaryFor(currencySymbol: string, releaseMatch: Record<string, unknown>): Promise<EarningsSummary> {
  const { thisStart } = monthWindows();
  const rows = await PaymentReleaseModel.aggregate([
    { $match: releaseMatch },
    {
      $group: {
        _id: null,
        lifetime: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'APPROVED'] },
              { $ifNull: ['$approved_amount', '$amount_requested'] },
              0,
            ],
          },
        },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, '$amount_requested', 0] } },
        this_month: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', 'APPROVED'] },
                  { $gte: ['$reviewed_at', thisStart] },
                ],
              },
              { $ifNull: ['$approved_amount', '$amount_requested'] },
              0,
            ],
          },
        },
        pods: { $addToSet: { $cond: [{ $eq: ['$status', 'APPROVED'] }, '$pod_id', null] } },
      },
    },
  ]);
  const row = rows[0];
  const podsCompleted = row ? (row.pods as unknown[]).filter(Boolean).length : 0;
  return {
    currency_symbol: currencySymbol,
    lifetime_earnings: round2(row?.lifetime ?? 0),
    pending_amount: round2(row?.pending ?? 0),
    pods_completed: podsCompleted,
    this_month_earnings: round2(row?.this_month ?? 0),
  };
}
