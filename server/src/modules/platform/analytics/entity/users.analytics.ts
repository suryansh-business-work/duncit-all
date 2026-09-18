import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { cumulative, inRange, seriesFromDays, type AnalyticsWindow } from './window';
import {
  LIVE_USERS,
  activeDevices,
  activeUserDays,
  averageDailyUsers,
  bookerIds,
  distinctPerBucket,
  signupDays,
  signupIds,
} from './users.data';
import { userBreakdowns } from './users.breakdowns';
import { kpi, pct, trend, type EntityAnalyticsSections } from './shapes';

/**
 * Analytics > Users — how many members there are, how many come back, how
 * many of them book, and who they are. ACTIVE means the app saw the signed-in
 * member on at least one day of the period.
 */

const overlap = (left: ReadonlySet<string> | ReadonlyMap<string, unknown>, right: ReadonlySet<string>) =>
  [...left.keys()].filter((id) => right.has(id)).length;

/** New members of the period who booked a seat inside it. */
async function activatedCount(signups: readonly string[], from: Date, to: Date): Promise<number> {
  if (signups.length === 0) return 0;
  const ids = await PodMemberModel.distinct('user_id', {
    user_id: { $in: signups.map((id) => new Types.ObjectId(id)) },
    joined_at: inRange(from, to),
  });
  return ids.length;
}

async function periodFigures(from: Date, to: Date, days: number) {
  const [active, devices, averageDaily, bookers, signups] = await Promise.all([
    activeUserDays(from, to),
    activeDevices(from, to),
    averageDailyUsers(from, to, days),
    bookerIds(from, to),
    signupIds(from, to),
  ]);
  const activated = await activatedCount(signups, from, to);
  const activeIds = new Set(active.keys());
  return {
    active,
    activeIds,
    devices,
    averageDaily,
    bookers: bookers.size,
    signups: signups.length,
    stickiness: pct(averageDaily, active.size),
    conversion: pct(overlap(bookers, activeIds), active.size),
    activation: pct(activated, signups.length),
  };
}

/** Of the members seen in one period, the share seen again in the next. */
const retention = (earlier: ReadonlySet<string>, later: ReadonlySet<string>) => pct(overlap(earlier, later), earlier.size);

async function liveFigures() {
  const [total, phoneVerified, inactive] = await Promise.all([
    UserModel.countDocuments(LIVE_USERS),
    UserModel.countDocuments({ ...LIVE_USERS, 'auth.phone.is_verified': true }),
    UserModel.countDocuments({ ...LIVE_USERS, 'metadata.status': { $in: ['INACTIVE', 'SUSPENDED'] } }),
  ]);
  return { total, phoneVerified: pct(phoneVerified, total), inactive };
}

export async function userAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const { from, to, prevFrom, prevTo, days, zone, granularity } = window;
  // Retention always reads "of the people active in the period just before,
  // how many came back" — even when the tiles compare with last year, so the
  // period right before each side is loaded on its own.
  const span = to.getTime() - from.getTime();
  const beforeFrom = new Date(prevFrom.getTime() - (prevTo.getTime() - prevFrom.getTime()));
  const comparedWithLastPeriod = prevTo.getTime() === from.getTime();
  const [now, before, earliest, precedingNow, live, signupsPerDay, users, devices, createdBefore] = await Promise.all([
    periodFigures(from, to, days),
    periodFigures(prevFrom, prevTo, days),
    activeUserDays(beforeFrom, prevFrom),
    comparedWithLastPeriod ? null : activeUserDays(new Date(from.getTime() - span), from),
    liveFigures(),
    signupDays(from, to, zone),
    distinctPerBucket(from, to, granularity, 'user_id'),
    distinctPerBucket(from, to, granularity, 'device_id'),
    UserModel.countDocuments({ 'metadata.created_at': { $lt: from } }),
  ]);
  const signups = seriesFromDays(signupsPerDay, window);
  const earliestIds = new Set(earliest.keys());
  const precedingIds = precedingNow ? new Set(precedingNow.keys()) : before.activeIds;

  return {
    kpis: [
      kpi('users_total', live.total, null),
      kpi('new_signups', now.signups, before.signups),
      kpi('active_users', now.active.size, before.active.size),
      kpi('active_devices', now.devices, before.devices),
      kpi('avg_daily_active', now.averageDaily, before.averageDaily, { format: 'DECIMAL' }),
      kpi('stickiness', now.stickiness, before.stickiness, { format: 'PERCENT' }),
      kpi('retention_rate', retention(precedingIds, now.activeIds), retention(earliestIds, before.activeIds), {
        format: 'PERCENT',
      }),
      kpi('booking_users', now.bookers, before.bookers),
      kpi('booking_conversion', now.conversion, before.conversion, { format: 'PERCENT' }),
      kpi('new_user_activation', now.activation, before.activation, { format: 'PERCENT' }),
      kpi('phone_verified_share', live.phoneVerified, null, { format: 'PERCENT' }),
      kpi('inactive_accounts', live.inactive, null, { higherIsBetter: false }),
    ],
    trends: [
      trend('user_activity', window, [
        { key: 'active_users', values: seriesFromDays(users, window) },
        { key: 'active_devices', values: seriesFromDays(devices, window) },
      ]),
      trend('signups', window, [{ key: 'new_signups', values: signups }]),
      trend('accounts_total', window, [{ key: 'accounts_total', values: cumulative(createdBefore, signups) }]),
    ],
    breakdowns: await userBreakdowns(window, now.active),
    leaderboard: null,
  };
}
