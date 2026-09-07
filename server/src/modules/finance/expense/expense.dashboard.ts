/**
 * Finance > Expenses > Dashboard.
 *
 * One query answers the whole screen. The tiles and the three breakdowns are
 * the same matched set counted four ways, so splitting them into four requests
 * would let a filter land on one and not the others — a page whose total does
 * not equal the sum of its own bars, which is worse than a slow page.
 *
 * Every breakdown comes back keyed by the STORED option key, never a label:
 * the labels live in `ExpenseOption` and the client already reads them for its
 * filter dropdowns. Sending them again from here would be a second copy of a
 * name Finance can edit.
 */
import { ExpenseModel } from './expense.model';
import { buildExpenseFilter, type ExpenseFilter } from './expense.service';

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/** One bar of a breakdown. An empty key is "not attributed to anything". */
interface Slice {
  key: string;
  total: number;
  count: number;
}

const toSlices = (rows: Array<{ _id: unknown; total: number; count: number }>): Slice[] =>
  rows.map((row) => ({
    key: typeof row._id === 'string' ? row._id : '',
    total: round2(row.total),
    count: row.count,
  }));

/** Calendar month boundaries in the server's zone — the tiles' two windows. */
function monthWindows(now: Date) {
  const thisStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { thisStart, lastStart };
}

async function spendBetween(match: Record<string, unknown>, from: Date, to?: Date) {
  const range: Record<string, Date> = { $gte: from };
  if (to) range.$lt = to;
  const [row] = await ExpenseModel.aggregate([
    { $match: { ...match, date: range } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return round2(row?.total ?? 0);
}

/**
 * A `$group` on one field, biggest spend first.
 *
 * `$ifNull` rather than dropping the blank: an expense nobody attributed is
 * still money out, and a breakdown that quietly omits it does not add up to
 * the total sitting above it.
 */
const breakdown = (match: Record<string, unknown>, field: string) =>
  ExpenseModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $ifNull: [`$${field}`, ''] },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ]);

export async function expenseDashboard(filter?: ExpenseFilter | null) {
  const match = buildExpenseFilter(filter ?? undefined);
  const { thisStart, lastStart } = monthWindows(new Date());

  const [byStatus, byCategory, byRelatedType, byMethod, thisMonth, lastMonth] = await Promise.all([
    ExpenseModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$compensation_status',
          total: { $sum: '$amount' },
          compensated: { $sum: { $ifNull: ['$compensated_amount', 0] } },
          count: { $sum: 1 },
        },
      },
    ]),
    breakdown(match, 'category'),
    breakdown(match, 'related_from_type'),
    breakdown(match, 'compensation_method'),
    // The two month tiles ignore the page's date filter on purpose: "this
    // month" has to mean this month whatever range is being looked at.
    spendBetween(omitDate(match), thisStart),
    spendBetween(omitDate(match), lastStart, thisStart),
  ]);

  const of = (status: string) =>
    byStatus.find((row) => row._id === status) ?? { total: 0, compensated: 0, count: 0 };
  const pending = of('PENDING');
  const partial = of('PARTIAL');
  const full = of('FULL');
  const rejected = of('REJECTED');

  const totalExpenses = round2(
    byStatus.reduce((sum, row) => sum + Number(row.total || 0), 0)
  );
  const totalCompensation = round2(
    byStatus.reduce((sum, row) => sum + Number(row.compensated || 0), 0)
  );

  return {
    total_expenses: totalExpenses,
    expense_count: byStatus.reduce((sum, row) => sum + Number(row.count || 0), 0),
    pending_count: pending.count,
    partial_count: partial.count,
    full_count: full.count,
    rejected_count: rejected.count,
    pending_total: round2(pending.total),
    partial_total: round2(partial.total),
    full_total: round2(full.total),
    rejected_total: round2(rejected.total),
    total_compensation_amount: totalCompensation,
    // What is still owed, and never below zero: a rejected expense is not a
    // debt, and an over-compensated one is not a negative one.
    pending_compensation_amount: round2(
      Math.max(0, pending.total + partial.total - pending.compensated - partial.compensated)
    ),
    current_month_total: thisMonth,
    previous_month_total: lastMonth,
    by_category: toSlices(byCategory),
    by_related_type: toSlices(byRelatedType),
    by_compensation_method: toSlices(byMethod),
  };
}

/** The same filter without its date range — see the month tiles above. */
function omitDate(match: Record<string, unknown>) {
  const { date: _date, ...rest } = match;
  return rest;
}
