import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
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

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export type SettlementStatus = 'LIVE' | 'PENDING_APPROVAL' | 'SETTLED';

export interface PodFinanceBreakdownView {
  pod_id: string;
  pod_title: string;
  settlement_status: SettlementStatus;
  /** true when rendered from a frozen v2 completion snapshot (never drifts). */
  frozen: boolean;
  bookings_count: number;
  collected_total: number;
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
  const amount = b.collected_total;
  return {
    version: b.version,
    amount,
    gst_pct: b.gst_pct,
    gst_amount: b.gst_amount,
    net_amount: b.net_amount,
    platform_fee_pct: b.platform_fee_pct,
    platform_fee_amount: b.platform_fee_amount,
    pool_amount: b.pool_amount,
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
      const venueAmount = await venueAmountForPod(pod, 0);
      waterfall = waterfallForAmount(collected, venueAmount, rates);
    }

    return {
      pod_id: String(pod._id),
      pod_title: pod.pod_title,
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

  /** Potential earnings for a hypothetical GST-inclusive price — the create-pod
   * preview. Uses the calling host's effective rates (+ the chosen venue's
   * commission); venue_amount is the picked slot's price (Partners portal). */
  async potentialPodEarnings(
    hostUserId: string,
    amount: number,
    venueId?: string | null,
    venueAmount?: number | null
  ): Promise<SettlementWaterfall> {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new GraphQLError('Amount must be 0 or more', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const venuePrice = venueAmount ?? 0;
    if (!Number.isFinite(venuePrice) || venuePrice < 0) {
      throw new GraphQLError('Venue amount must be 0 or more', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    if (venueId && !Types.ObjectId.isValid(venueId)) {
      throw new GraphQLError('Invalid venue', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const rates = await resolveEffectiveRates({ hostUserId, venueId: venueId ?? null });
    return waterfallForAmount(amount, venueId ? venuePrice : 0, rates);
  },

  /** Host Studio dashboard summary — lifetime/pending/this-month payout totals
   * from the host's own HOST_PAYMENT releases. */
  async hostEarningsSummary(userId: string): Promise<EarningsSummary> {
    const fs = await getFinanceSettings();
    return summaryFor(fs.currency_symbol, { kind: 'HOST_PAYMENT', host_user_id: new Types.ObjectId(userId) });
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

    return {
      currency_symbol: fs.currency_symbol,
      total_revenue: stat(payAll.total, payThis.total, payLast.total),
      gst_collected: stat(payAll.gst, payThis.gst, payLast.gst),
      duncit_revenue: stat(duncitAll, duncitThis, duncitLast),
      pending_payouts: stat(pendAll, pendThis, pendLast),
      completed_payouts: stat(doneAll, doneThis, doneLast),
    };
  },
};

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
