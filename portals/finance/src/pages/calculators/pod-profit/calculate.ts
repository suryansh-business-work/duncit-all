import { payableSpots } from '@duncit/utils';
import {
  type ExpenseBearer,
  type ExpenseTotals,
  type PodExpense,
  type PodProfitInputs,
  type PodProfitResults,
  type PodProfitScaled,
} from './types';

const toPaise = (rupees: number) => Math.round(Math.max(0, rupees) * 100);
const toRupees = (paise: number) => paise / 100;
const clampPercent = (value: number) => Math.min(Math.max(value, 0), 100);
/** Paise x count, back to rupees — the projection never re-rounds a rupee value. */
const scaleRupees = (paise: number, count: number) => Math.round(paise * count) / 100;

/** Per-side expense totals in PAISE, so the subtraction below stays exact. */
function expensePaise(expenses: readonly PodExpense[] | undefined): Record<ExpenseBearer, number> {
  const totals: Record<ExpenseBearer, number> = { DUNCIT: 0, HOST: 0, VENUE: 0 };
  for (const expense of expenses ?? []) {
    // An unknown bearer falls to Duncit rather than being dropped: a cost that
    // silently vanishes from the total is worse than one filed in the wrong
    // column, and the reader can see and move it.
    const bearer: ExpenseBearer = totals[expense.borne_by] === undefined ? 'DUNCIT' : expense.borne_by;
    totals[bearer] += toPaise(expense.amount);
  }
  return totals;
}

const rupeeTotals = (paise: Record<ExpenseBearer, number>): ExpenseTotals => ({
  DUNCIT: toRupees(paise.DUNCIT),
  HOST: toRupees(paise.HOST),
  VENUE: toRupees(paise.VENUE),
});

const scaledTotals = (paise: Record<ExpenseBearer, number>, count: number): ExpenseTotals => ({
  DUNCIT: scaleRupees(paise.DUNCIT, count),
  HOST: scaleRupees(paise.HOST, count),
  VENUE: scaleRupees(paise.VENUE, count),
});

/**
 * Calculator math — a faithful mirror of the server finance engine
 * (`server/src/modules/finance/finance/breakdown.math.ts`) so the estimate
 * always agrees with real pod payouts.
 *
 * The waterfall runs on the FULL collection (ticket price × PAYABLE spots, both
 * GST-inclusive). The host's own spot is free — they are added to the pod's
 * attendees on create and never pay — so a 30-spot pod only ever bills 29
 * guests. GST is extracted from the collection (`P × g/(100+g)`); the platform
 * fee applies to the net; the venue
 * takes its fixed booked slot price out of the remaining pool ONCE per pod,
 * UNCLAMPED (`clampVenueToPool: false`, matching how the engine quotes and
 * settles) — on a shortfall the host's remainder goes honestly negative, and
 * no host commission is charged on a non-positive host side.
 * Duncit's commission comes out of each side, and duncit_revenue = platform
 * fee + both commissions.
 *
 * All arithmetic runs on paise integers with half-up rounding per line so the
 * invariant holds exactly: gst + host_receives + venue_receives + duncit = amount.
 *
 * A plain function rather than a hook: the multi-pod tab computes one of these
 * per row, and a hook cannot be called in a loop. `useCalculator` is the
 * single-pod tab's memoised wrapper around it, so both tabs run the same maths.
 */
export function calculatePodProfit(inputs: PodProfitInputs): PodProfitResults {
  const totalSpots = Math.max(0, Math.round(inputs.no_of_spots));
  // At least one: a projection of zero pods would print an all-zero report
  // that reads as a broken calculator rather than an empty one.
  const podCount = Math.max(1, Math.round(inputs.pod_count || 1));
  // The host's spot is free — only (total - 1) spots are ever billed.
  const spots = payableSpots(totalSpots);
  const amount = toPaise(inputs.pod_amount) * spots;
  const gstPct = clampPercent(inputs.gst_percent);
  const feePct = clampPercent(inputs.platform_fee_percent);
  const hostPct = clampPercent(inputs.host_commission_percent);
  const venuePct = clampPercent(inputs.venue_commission_percent);

  const clubAdminPct = clampPercent(inputs.club_admin_percent);

  const gst = Math.round((amount * gstPct) / (100 + gstPct));
  const net = amount - gst;
  const fee = Math.round((net * feePct) / 100);
  const pool = net - fee;
  // The club-admin cut comes off the pool right after GST + platform fee
  // (before the venue/host split) and becomes Duncit revenue — mirrors
  // breakdown.math.ts. Clamped to the pool so nothing downstream goes negative.
  const clubAdmin = Math.min(pool, Math.round((pool * clubAdminPct) / 100));
  const splitPool = pool - clubAdmin;
  // The venue is owed its full booked price — no clamp, mirroring the
  // engine's clampVenueToPool: false; a shortfall lands on the host as a
  // negative remainder.
  const venueAmount = toPaise(inputs.venue_amount);
  const hostAmount = splitPool - venueAmount;
  const venueCommission = Math.round((venueAmount * venuePct) / 100);
  // No commission is charged on a non-positive host side — the shortfall
  // passes through whole (mirrors breakdown.math.ts).
  const hostCommission = hostAmount > 0 ? Math.round((hostAmount * hostPct) / 100) : 0;
  const venueReceives = venueAmount - venueCommission;
  const hostReceives = hostAmount - hostCommission;
  const duncitRevenue = fee + hostCommission + venueCommission + clubAdmin;
  const hostEarn = amount === 0 ? 0 : Math.round((hostReceives / amount) * 10000) / 100;

  // Expenses sit OUTSIDE the waterfall: each side pays its own out of what it
  // was already paid, so nothing above this line moves and `reconciled_total`
  // still adds back to the collection. All they change is whose net is smaller.
  const exp = expensePaise(inputs.expenses);
  const expTotal = exp.DUNCIT + exp.HOST + exp.VENUE;
  const venueNet = venueReceives - exp.VENUE;
  const hostNet = hostReceives - exp.HOST;
  const duncitNet = duncitRevenue - exp.DUNCIT;
  const hostNetPct = amount === 0 ? 0 : Math.round((hostNet / amount) * 10000) / 100;

  return {
    total_spots: totalSpots,
    payable_spots: spots,
    collection_total: toRupees(amount),
    gst_amount: toRupees(gst),
    net_amount: toRupees(net),
    platform_fee_amount: toRupees(fee),
    pool_amount: toRupees(pool),
    club_admin_amount: toRupees(clubAdmin),
    venue_amount: toRupees(venueAmount),
    venue_commission_amount: toRupees(venueCommission),
    venue_receives: toRupees(venueReceives),
    host_amount: toRupees(hostAmount),
    host_commission_amount: toRupees(hostCommission),
    host_receives: toRupees(hostReceives),
    duncit_revenue_total: toRupees(duncitRevenue),
    host_earn_percent: hostEarn,
    reconciled_total: toRupees(gst + hostReceives + venueReceives + duncitRevenue),
    expenses: rupeeTotals(exp),
    expense_total: toRupees(expTotal),
    venue_net: toRupees(venueNet),
    host_net: toRupees(hostNet),
    duncit_net: toRupees(duncitNet),
    host_net_percent: hostNetPct,
    scaled: {
      pod_count: podCount,
      collection_total: scaleRupees(amount, podCount),
      gst_amount: scaleRupees(gst, podCount),
      venue_receives: scaleRupees(venueReceives, podCount),
      host_receives: scaleRupees(hostReceives, podCount),
      duncit_revenue_total: scaleRupees(duncitRevenue, podCount),
      expenses: scaledTotals(exp, podCount),
      expense_total: scaleRupees(expTotal, podCount),
      venue_net: scaleRupees(venueNet, podCount),
      host_net: scaleRupees(hostNet, podCount),
      duncit_net: scaleRupees(duncitNet, podCount),
    } satisfies PodProfitScaled,
  };
}
