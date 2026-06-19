import { PaymentModel } from '@modules/finance/payment/payment.model';
import { ExpenseModel } from '@modules/finance/expense/expense.model';
import { UserModel } from '@modules/access/user/user.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { ClubModel } from '@modules/pods/club/club.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { HostModel } from '@modules/venues/host/host.model';
import { PostModel } from '@modules/engagement/post/post.model';
import { ActiveUserPingModel } from '@modules/platform/analytics/activeUser.model';

export interface MetricValue {
  value: number;
  delta_pct?: number | null;
  series?: { label: string; value: number }[];
}

const pct = (curr: number, prev: number): number => {
  if (prev > 0) return ((curr - prev) / prev) * 100;
  return curr > 0 ? 100 : 0;
};

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** YYYY-MM-DD strings for the last `n` days (inclusive of today). */
function lastDays(n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    out.push(ymd(d));
  }
  return out;
}

function monthBuckets(from: Date, to: Date): { label: string; start: Date; end: Date }[] {
  const buckets: { label: string; start: Date; end: Date }[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  let guard = 0;
  while (cursor <= to && guard < 60) {
    const start = new Date(cursor);
    const end = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    buckets.push({
      label: start.toLocaleString('en', { month: 'short', year: '2-digit' }),
      start,
      end,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    guard += 1;
  }
  return buckets;
}

async function sumPayments(match: Record<string, unknown>): Promise<{ amount: number; fee: number; count: number }> {
  const [row] = await PaymentModel.aggregate([
    { $match: { status: 'SUCCESS', ...match } },
    { $group: { _id: null, amount: { $sum: '$total' }, fee: { $sum: '$platform_fee_amount' }, count: { $sum: 1 } } },
  ]);
  return { amount: row?.amount ?? 0, fee: row?.fee ?? 0, count: row?.count ?? 0 };
}

async function sumExpenses(match: Record<string, unknown>): Promise<number> {
  const [row] = await ExpenseModel.aggregate([
    { $match: match },
    { $group: { _id: null, amount: { $sum: '$amount' } } },
  ]);
  return row?.amount ?? 0;
}

/**
 * Compute every DB-derivable founder metric for [from, to]. Returns a map of
 * metric key → value (+ optional period-over-period delta and monthly series).
 * Metrics not present here are served from founder settings (manual values).
 */
export async function computeMetrics(
  from: Date,
  to: Date,
  settings: Record<string, number>
): Promise<Record<string, MetricValue>> {
  const lenMs = Math.max(to.getTime() - from.getTime(), 24 * 3600 * 1000);
  const prevTo = new Date(from.getTime());
  const prevFrom = new Date(from.getTime() - lenMs);
  const inRange = { created_at: { $gte: from, $lte: to } };
  const expRange = { date: { $gte: from, $lte: to } };
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const months = Math.max(1, monthBuckets(from, to).length);

  const [
    pay,
    payPrev,
    payMonth,
    payToday,
    expenses,
    expensesPrev,
    statusCounts,
    totalCustomers,
    activeCustomers,
    newCustomers,
    newCustomersPrev,
    returning,
    totalVenues,
    activeVenues,
    totalHosts,
    activeHosts,
    totalPods,
    livePods,
    completedPods,
    totalClubs,
    activeClubs,
    storiesPosted,
    orders,
    ordersPrev,
    cancelledOrders,
  ] = await Promise.all([
    sumPayments(inRange),
    sumPayments({ created_at: { $gte: prevFrom, $lte: prevTo } }),
    sumPayments({ created_at: { $gte: monthStart } }),
    sumPayments({ created_at: { $gte: dayStart } }),
    sumExpenses(expRange),
    sumExpenses({ date: { $gte: prevFrom, $lte: prevTo } }),
    PaymentModel.aggregate([{ $match: inRange }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    UserModel.countDocuments({}),
    UserModel.countDocuments({ 'metadata.status': 'ACTIVE' }),
    UserModel.countDocuments({ 'metadata.created_at': { $gte: from, $lte: to } }),
    UserModel.countDocuments({ 'metadata.created_at': { $gte: prevFrom, $lte: prevTo } }),
    PaymentModel.aggregate([
      { $match: { status: 'SUCCESS', ...inRange } },
      { $group: { _id: '$user_id', n: { $sum: 1 } } },
      { $match: { n: { $gte: 2 } } },
      { $count: 'n' },
    ]),
    VenueModel.countDocuments({}),
    VenueModel.countDocuments({ is_active: true, status: 'APPROVED' }),
    HostModel.countDocuments({}),
    HostModel.countDocuments({ is_active: true, status: 'APPROVED' }),
    PodModel.countDocuments({}),
    PodModel.countDocuments({ is_active: true, pod_date_time: { $gte: now } }),
    PodModel.countDocuments({ pod_date_time: { $lt: now } }),
    ClubModel.countDocuments({}),
    ClubModel.countDocuments({ is_active: true }),
    PostModel.countDocuments({ kind: 'STORY', created_at: { $gte: from, $lte: to } }),
    PodMemberModel.countDocuments(inRange),
    PodMemberModel.countDocuments({ created_at: { $gte: prevFrom, $lte: prevTo } }),
    PodMemberModel.countDocuments({ status: 'BACKED_OUT', ...inRange }),
  ]);

  // Monthly revenue / expense series for the money sparklines.
  const buckets = monthBuckets(from, to);
  const revSeries = await Promise.all(
    buckets.map(async (b) => ({ label: b.label, value: (await sumPayments({ created_at: { $gte: b.start, $lt: b.end } })).amount }))
  );
  const expSeries = await Promise.all(
    buckets.map(async (b) => ({ label: b.label, value: await sumExpenses({ date: { $gte: b.start, $lt: b.end } }) }))
  );

  const statusMap: Record<string, number> = {};
  statusCounts.forEach((s: { _id: string; n: number }) => { statusMap[s._id] = s.n; });

  const dau = (await ActiveUserPingModel.distinct('device_id', { date_ymd: ymd(now) })).length;
  const wau = (await ActiveUserPingModel.distinct('device_id', { date_ymd: { $in: lastDays(7) } })).length;
  const mau = (await ActiveUserPingModel.distinct('device_id', { date_ymd: { $in: lastDays(30) } })).length;

  const revenue = pay.amount;
  const grossProfit = pay.fee;
  const netProfit = grossProfit - expenses;
  const fixed = settings.fixed_expenses_monthly ?? 0;
  const burn = expenses / months;
  const cashInBank = settings.cash_in_bank ?? 0;
  const returningCount = returning[0]?.n ?? 0;
  const cashSeries = revSeries.map((r, i) => ({ label: r.label, value: r.value - (expSeries[i]?.value ?? 0) }));

  return {
    total_revenue: { value: revenue, delta_pct: pct(revenue, payPrev.amount), series: revSeries },
    mrr: { value: payMonth.amount },
    arr: { value: payMonth.amount * 12 },
    todays_revenue: { value: payToday.amount },
    revenue_growth_pct: { value: pct(revenue, payPrev.amount) },
    aov: { value: pay.count > 0 ? revenue / pay.count : 0 },

    gross_profit: { value: grossProfit, delta_pct: pct(grossProfit, payPrev.fee), series: revSeries },
    net_profit: { value: netProfit, delta_pct: pct(netProfit, payPrev.fee - expensesPrev), series: cashSeries },
    profit_margin_pct: { value: revenue > 0 ? (netProfit / revenue) * 100 : 0 },
    ebitda: { value: netProfit },
    break_even_status: { value: netProfit >= 0 ? 1 : 0 },

    total_expenses: { value: expenses, delta_pct: pct(expenses, expensesPrev), series: expSeries },
    variable_expenses: { value: Math.max(0, expenses - fixed) },
    burn_rate: { value: burn },
    cash_flow: { value: revenue - expenses, series: cashSeries },
    runway_months: { value: burn > 0 ? cashInBank / burn : 0 },

    total_customers: { value: totalCustomers },
    active_customers: { value: activeCustomers },
    new_customers: { value: newCustomers, delta_pct: pct(newCustomers, newCustomersPrev) },
    returning_customers: { value: returningCount },

    successful_payments: { value: statusMap.SUCCESS ?? 0 },
    failed_payments: { value: statusMap.FAILED ?? 0 },
    pending_payments: { value: statusMap.PENDING ?? 0 },
    refunds: { value: statusMap.REFUNDED ?? 0 },

    total_venues: { value: totalVenues },
    active_venues: { value: activeVenues },
    registered_hosts: { value: totalHosts },
    active_hosts: { value: activeHosts },
    total_pods: { value: totalPods },
    live_pods: { value: livePods },
    completed_pods: { value: completedPods },
    no_show_rate: { value: orders > 0 ? (cancelledOrders / orders) * 100 : 0 },

    total_clubs: { value: totalClubs },
    active_clubs: { value: activeClubs },
    total_members: { value: totalCustomers },
    new_members: { value: newCustomers },
    stories_posted: { value: storiesPosted },

    total_orders: { value: orders, delta_pct: pct(orders, ordersPrev) },
    cancelled_orders: { value: cancelledOrders },

    dau: { value: dau },
    wau: { value: wau },
    mau: { value: mau },
    active_users: { value: mau },
    arpu: { value: mau > 0 ? revenue / mau : 0 },
    growth_rate: { value: pct(revenue, payPrev.amount) },
  };
}
