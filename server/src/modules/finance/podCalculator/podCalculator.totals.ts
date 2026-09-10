import {
  computePodFinanceBreakdown,
  payableSpots,
  type PodFinanceBreakdown,
} from '@modules/finance/finance/breakdown.math';
import type { ExpenseBearer, IPodCalculatorPod } from './podCalculator.model';

/** Per-side expense totals — the shape the report's costs block reads. */
export type ExpenseTotals = Record<ExpenseBearer, number>;

const EMPTY_EXPENSES: ExpenseTotals = { DUNCIT: 0, HOST: 0, VENUE: 0 };

/** One pod's waterfall, plus what it comes to across `pod_count` of them. */
export interface PodCalculatorLine {
  name: string;
  pod_count: number;
  payable_spots: number;
  /** The single pod, straight off the finance engine (paise). */
  per_pod: PodFinanceBreakdown;
  /** per_pod × pod_count, in rupees — what the report and the totals add up. */
  collection_total: number;
  gst_amount: number;
  venue_receives: number;
  host_receives: number;
  duncit_revenue_total: number;
  /** This line's cost lines x pod_count, by the side that carries them. */
  expenses: ExpenseTotals;
  expense_total: number;
  /** What each side keeps once its own costs are paid. */
  venue_net: number;
  host_net: number;
  duncit_net: number;
}

export interface PodCalculatorTotals {
  pods: number;
  collection_total: number;
  gst_amount: number;
  venue_receives: number;
  host_receives: number;
  duncit_revenue_total: number;
  expenses: ExpenseTotals;
  expense_total: number;
  venue_net: number;
  host_net: number;
  duncit_net: number;
}

const rupees = (paise: number, count: number) => Math.round(paise * count) / 100;
const add = (a: number, b: number) => Math.round((a + b) * 100) / 100;

/**
 * A saved pod's figures, computed by THE finance engine.
 *
 * `computePodFinanceBreakdown` is what quotes and settles real pods, so the
 * report a partner receives cannot disagree with what they are actually paid —
 * the alternative was a third copy of the waterfall living in a PDF generator,
 * which is the drift rule 34 exists to stop. `clampVenueToPool: false` matches
 * how the engine quotes: on a shortfall the host's remainder goes honestly
 * negative rather than quietly shrinking the venue's money.
 */
export function lineFor(pod: IPodCalculatorPod): PodCalculatorLine {
  const spots = payableSpots(pod.no_of_spots ?? 0);
  const amountPaise = Math.round(Math.max(0, pod.pod_amount ?? 0) * 100) * spots;
  const perPod = computePodFinanceBreakdown(
    amountPaise,
    Math.round(Math.max(0, pod.venue_amount ?? 0) * 100),
    {
      gst_percent: pod.gst_percent ?? 0,
      platform_fee_percent: pod.platform_fee_percent ?? 0,
      host_commission_percent: pod.host_commission_percent ?? 0,
      venue_commission_percent: pod.venue_commission_percent ?? 0,
      club_admin_percent: pod.club_admin_percent ?? 0,
    },
    { clampVenueToPool: false }
  );
  const count = Math.max(0, Math.round(pod.pod_count ?? 1));
  // Expenses sit OUTSIDE the engine's waterfall on purpose: each side pays its
  // own out of what it was already paid, so the breakdown above is untouched
  // and only the nets below differ. Summed in paise, then scaled once.
  const expPaise: Record<ExpenseBearer, number> = { DUNCIT: 0, HOST: 0, VENUE: 0 };
  for (const expense of pod.expenses ?? []) {
    const bearer: ExpenseBearer =
      expPaise[expense.borne_by] === undefined ? 'DUNCIT' : expense.borne_by;
    expPaise[bearer] += Math.round(Math.max(0, expense.amount ?? 0) * 100);
  }
  const expTotalPaise = expPaise.DUNCIT + expPaise.HOST + expPaise.VENUE;
  return {
    name: pod.name ?? '',
    pod_count: count,
    payable_spots: spots,
    per_pod: perPod,
    collection_total: rupees(perPod.amount_paise, count),
    gst_amount: rupees(perPod.gst_paise, count),
    venue_receives: rupees(perPod.venue_receives_paise, count),
    host_receives: rupees(perPod.host_receives_paise, count),
    duncit_revenue_total: rupees(perPod.duncit_revenue_paise, count),
    expenses: {
      DUNCIT: rupees(expPaise.DUNCIT, count),
      HOST: rupees(expPaise.HOST, count),
      VENUE: rupees(expPaise.VENUE, count),
    },
    expense_total: rupees(expTotalPaise, count),
    venue_net: rupees(perPod.venue_receives_paise - expPaise.VENUE, count),
    host_net: rupees(perPod.host_receives_paise - expPaise.HOST, count),
    duncit_net: rupees(perPod.duncit_revenue_paise - expPaise.DUNCIT, count),
  };
}

/** Every line added up — the report's grand total. */
export function totalsOf(lines: readonly PodCalculatorLine[]): PodCalculatorTotals {
  return lines.reduce<PodCalculatorTotals>(
    (acc, line) => ({
      pods: acc.pods + line.pod_count,
      collection_total: add(acc.collection_total, line.collection_total),
      gst_amount: add(acc.gst_amount, line.gst_amount),
      venue_receives: add(acc.venue_receives, line.venue_receives),
      host_receives: add(acc.host_receives, line.host_receives),
      duncit_revenue_total: add(acc.duncit_revenue_total, line.duncit_revenue_total),
      expenses: {
        DUNCIT: add(acc.expenses.DUNCIT, line.expenses.DUNCIT),
        HOST: add(acc.expenses.HOST, line.expenses.HOST),
        VENUE: add(acc.expenses.VENUE, line.expenses.VENUE),
      },
      expense_total: add(acc.expense_total, line.expense_total),
      venue_net: add(acc.venue_net, line.venue_net),
      host_net: add(acc.host_net, line.host_net),
      duncit_net: add(acc.duncit_net, line.duncit_net),
    }),
    {
      pods: 0,
      collection_total: 0,
      gst_amount: 0,
      venue_receives: 0,
      host_receives: 0,
      duncit_revenue_total: 0,
      expenses: EMPTY_EXPENSES,
      expense_total: 0,
      venue_net: 0,
      host_net: 0,
      duncit_net: 0,
    }
  );
}
