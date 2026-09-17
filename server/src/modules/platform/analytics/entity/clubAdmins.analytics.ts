import { dayKeyIn, dayTotals, distinctSeries, seriesFromDays, type AnalyticsWindow } from './window';
import { loadHeldPods } from './held-pods';
import { aspectRatings, markCounts, markDays, meanDays, within } from './signals';
import { adminsOfPod, loadDirectory, type AdminDirectory, type ProfileRow } from './clubAdmins.data';
import { adminBreakdowns, adminLeaderboard } from './clubAdmins.sections';
import { kpi, mean, pct, trend, type EntityAnalyticsSections } from './shapes';

/**
 * Analytics > Club Admins — the pipeline that onboards them, how much of the
 * club list they cover, and how the clubs they run are doing. An admin is
 * ACTIVE in a period when one of their clubs held a pod in it.
 */

async function periodFigures(directory: AdminDirectory, from: Date, to: Date) {
  const [held, marks, rating] = await Promise.all([
    loadHeldPods(from, to),
    markCounts(from, to),
    aspectRatings('CLUB_ADMIN', from, to),
  ]);
  const approved = within(directory.profiles, (row) => row.approved_at ?? null, from, to);
  const adminsOf = adminsOfPod(directory);
  return {
    held,
    applications: within(directory.profiles, (row) => row.created_at, from, to).length,
    approvals: approved.length,
    review_days: meanDays(approved, (row) => row.created_at, (row) => row.approved_at ?? null),
    active: new Set(held.flatMap(adminsOf)).size,
    forced: marks.get('CLUB_ADMIN_FORCE') ?? 0,
    rating,
  };
}

/** Figures that describe the directory as it stands, with no period. */
function liveFigures(directory: AdminDirectory) {
  const clubCounts = [...directory.clubsByAdmin.values()].map((clubs) => clubs.length);
  const liveClubs = directory.clubs.filter((club) => club.is_active !== false);
  const covered = liveClubs.filter((club) => (club.admin_user_ids?.length ?? 0) > 0).length;
  return {
    admins: directory.clubsByAdmin.size,
    pending: directory.profiles.filter((row) => row.status === 'DRAFT').length,
    coverage: pct(covered, liveClubs.length),
    clubs_per_admin: mean(
      clubCounts.reduce((sum, count) => sum + count, 0),
      clubCounts.length
    ),
    without_clubs: clubCounts.filter((count) => count === 0).length,
  };
}

export async function clubAdminAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const directory = await loadDirectory();
  const [now, before, forcedDays] = await Promise.all([
    periodFigures(directory, window.from, window.to),
    periodFigures(directory, window.prevFrom, window.from),
    markDays('CLUB_ADMIN_FORCE', window.from, window.to, window.zone),
  ]);
  const live = liveFigures(directory);
  const zone = window.zone;
  const adminsOf = adminsOfPod(directory);
  const activeRows = now.held.flatMap((pod) =>
    adminsOf(pod).map((id) => ({ day: dayKeyIn(pod.starts_at, zone), id }))
  );
  /** Profiles per bucket by one of their dates — applications or approvals. */
  const perBucket = (dateOf: (row: ProfileRow) => Date | null) => {
    const rows = within(directory.profiles, dateOf, window.from, window.to);
    return seriesFromDays(dayTotals(rows, (row) => dateOf(row) ?? window.from, zone), window);
  };

  return {
    kpis: [
      kpi('admins_total', live.admins, null),
      kpi('pending_review', live.pending, null, { higherIsBetter: false }),
      kpi('new_applications', now.applications, before.applications),
      kpi('approvals', now.approvals, before.approvals),
      kpi('avg_review_days', now.review_days, before.review_days, { format: 'DAYS', higherIsBetter: false }),
      kpi('active_admins', now.active, before.active),
      kpi('admin_activation_rate', pct(now.active, live.admins), null, { format: 'PERCENT' }),
      kpi('club_coverage', live.coverage, null, { format: 'PERCENT' }),
      kpi('clubs_per_admin', live.clubs_per_admin, null, { format: 'DECIMAL' }),
      kpi('admins_without_clubs', live.without_clubs, null, { higherIsBetter: false }),
      kpi('forced_marks', now.forced, before.forced, { higherIsBetter: false }),
      kpi('admin_rating', now.rating.average, before.rating.average, { format: 'RATING' }),
    ],
    trends: [
      trend('admin_onboarding', window, [
        { key: 'new_applications', values: perBucket((row) => row.created_at) },
        { key: 'approvals', values: perBucket((row) => row.approved_at ?? null) },
      ]),
      trend('admin_activity', window, [
        { key: 'active_admins', values: distinctSeries(activeRows, window) },
        { key: 'forced_marks', values: seriesFromDays(forcedDays, window) },
      ]),
    ],
    breakdowns: await adminBreakdowns(directory, now.rating.stars),
    leaderboard: await adminLeaderboard(directory, now.held),
  };
}
