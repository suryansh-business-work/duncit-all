import { dayKeyIn, dayTotals, distinctSeries, seriesFromDays, type AnalyticsWindow } from './window';
import { loadHeldPods } from './held-pods';
import { aspectRatings, markCounts, meanDays, within } from './signals';
import { isApproved, loadHosts, type HostRow } from './hosts.data';
import { hostBreakdowns, hostLeaderboard } from './hosts.sections';
import { kpi, mean, pct, trend, type EntityAnalyticsSections } from './shapes';

/**
 * Analytics > Hosts — the application pipeline, how many approved hosts
 * actually host, and how the pods they run go. A host is ACTIVE in a period
 * when they hosted a pod held in it.
 */

async function periodFigures(hosts: readonly HostRow[], from: Date, to: Date) {
  const [held, marks, rating] = await Promise.all([
    loadHeldPods(from, to),
    markCounts(from, to),
    aspectRatings('HOST', from, to),
  ]);
  const approved = within(hosts, (row) => row.approved_at ?? null, from, to);
  const rejected = within(hosts, (row) => row.rejected_at ?? null, from, to).length;
  const hostings = held.flatMap((pod) => pod.host_ids);
  const active = new Set(hostings);
  const scans = marks.get('HOST_SCAN') ?? 0;
  return {
    held,
    active,
    applications: within(hosts, (row) => row.submitted_at ?? null, from, to).length,
    approvals: approved.length,
    approval_rate: pct(approved.length, approved.length + rejected),
    review_days: meanDays(approved, (row) => row.submitted_at ?? null, (row) => row.approved_at ?? null),
    pods_per_active: mean(hostings.length, active.size),
    scan_share: pct(scans, scans + (marks.get('HOST_MANUAL') ?? 0)),
    marks,
    rating,
  };
}

export async function hostAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const hosts = await loadHosts();
  const [now, before] = await Promise.all([
    periodFigures(hosts, window.from, window.to),
    periodFigures(hosts, window.prevFrom, window.prevTo),
  ]);
  const approvedIds = new Set(hosts.filter(isApproved).map((row) => row.user_id.toHexString()));
  const activeApproved = [...now.active].filter((id) => approvedIds.has(id)).length;
  const zone = window.zone;
  const activeRows = now.held.flatMap((pod) =>
    pod.host_ids.map((id) => ({ day: dayKeyIn(pod.starts_at, zone), id }))
  );
  /** Hosts per bucket by one of their review dates. */
  const perBucket = (dateOf: (row: HostRow) => Date | null) => {
    const rows = within(hosts, dateOf, window.from, window.to);
    return seriesFromDays(dayTotals(rows, (row) => dateOf(row) ?? window.from, zone), window);
  };

  return {
    kpis: [
      kpi('hosts_total', hosts.length, null),
      kpi('approved_hosts', approvedIds.size, null),
      kpi('pending_review', hosts.filter((row) => row.status === 'SUBMITTED').length, null, { higherIsBetter: false }),
      kpi('new_applications', now.applications, before.applications),
      kpi('approvals', now.approvals, before.approvals),
      kpi('approval_rate', now.approval_rate, before.approval_rate, { format: 'PERCENT' }),
      kpi('avg_review_days', now.review_days, before.review_days, { format: 'DAYS', higherIsBetter: false }),
      kpi('active_hosts', now.active.size, before.active.size),
      kpi('host_activation_rate', pct(activeApproved, approvedIds.size), null, { format: 'PERCENT' }),
      kpi('pods_per_active_host', now.pods_per_active, before.pods_per_active, { format: 'DECIMAL' }),
      kpi('scan_share', now.scan_share, before.scan_share, { format: 'PERCENT' }),
      kpi('host_rating', now.rating.average, before.rating.average, { format: 'RATING' }),
    ],
    trends: [
      trend('host_onboarding', window, [
        { key: 'new_applications', values: perBucket((row) => row.submitted_at ?? null) },
        { key: 'approvals', values: perBucket((row) => row.approved_at ?? null) },
        { key: 'rejections', values: perBucket((row) => row.rejected_at ?? null) },
      ]),
      trend('host_activity', window, [{ key: 'active_hosts', values: distinctSeries(activeRows, window) }]),
    ],
    breakdowns: await hostBreakdowns(hosts, now),
    leaderboard: await hostLeaderboard(hosts, now.held),
  };
}
