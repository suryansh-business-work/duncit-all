import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { USER_DATA_ISSUES } from '@modules/access/user/user.data-issues';
import { countDataIssues } from '@modules/access/user/user.data-issues.query';
import { ActiveUserPingModel } from '../activeUser.model';
import { consoleLink } from './links';
import { breakdown, fixedSlices, kpi, type AnalyticsBreakdown, type AnalyticsKpi, type AnalyticsLeaderboard } from './shapes';

/**
 * The Users page's account-health widgets: whose contact data is broken, when
 * members were last seen, and who is most active. Also what Admin > User
 * Management > Users Dashboard shows, which mounts this same page.
 */

const DAY_MS = 86_400_000;
const LAST_SEEN_DAYS = 90;
const LEADERS = 10;

const USERS_LIST = consoleLink('admin', '/users');

/** Whole days from a stored yyyy-MM-dd (UTC) to today. */
const daysSince = (ymd: string, now = Date.now()) =>
  Math.max(0, Math.floor((now - Date.parse(`${ymd}T00:00:00.000Z`)) / DAY_MS));

/** Live accounts with a data issue, and how many have each one. */
export async function dataHealth(): Promise<{ kpi: AnalyticsKpi; breakdown: AnalyticsBreakdown }> {
  const { byIssue, affected } = await countDataIssues();
  return {
    kpi: kpi('users_with_issues', affected, null, { higherIsBetter: false, link: USERS_LIST }),
    breakdown: breakdown('user_data_issues', fixedSlices(USER_DATA_ISSUES, byIssue), {
      scope: 'ALL_TIME',
      link: USERS_LIST,
    }),
  };
}

const LAST_SEEN_BANDS = [
  { key: 'seen_today', max: 0 },
  { key: 'seen_1_7', max: 7 },
  { key: 'seen_8_30', max: 30 },
  { key: 'seen_31_90', max: LAST_SEEN_DAYS },
] as const;

/** The latest ping day per signed-in account — every one seen since `from`, or just `ids`, ever. */
async function lastPingDays(scope: { from: string } | { ids: Types.ObjectId[] }) {
  const match =
    'from' in scope ? { date_ymd: { $gte: scope.from }, user_id: { $ne: null } } : { user_id: { $in: scope.ids } };
  return ActiveUserPingModel.aggregate<{ _id: Types.ObjectId; day: string }>([
    { $match: match },
    { $group: { _id: '$user_id', day: { $max: '$date_ymd' } } },
  ]);
}

/**
 * When every live member was last seen — today, this week, this month, this
 * quarter, or longer ago (never included). Read over the last 90 days of pings
 * only: anything older lands in the last band either way.
 */
export async function lastSeenBreakdown(liveTotal: number): Promise<AnalyticsBreakdown> {
  const since = new Date(Date.now() - LAST_SEEN_DAYS * DAY_MS).toISOString().slice(0, 10);
  const rows = await lastPingDays({ from: since });
  const counts = new Map<string, number>();
  for (const row of rows) {
    const days = daysSince(row.day);
    const band = LAST_SEEN_BANDS.find((b) => days <= b.max);
    if (band) counts.set(band.key, (counts.get(band.key) ?? 0) + 1);
  }
  const seen = [...counts.values()].reduce((sum, count) => sum + count, 0);
  counts.set('seen_over_90', Math.max(0, liveTotal - seen));
  const keys = [...LAST_SEEN_BANDS.map((band) => band.key), 'seen_over_90'];
  return breakdown('last_seen', fixedSlices(keys, counts), { scope: 'ALL_TIME', ordered: true, link: USERS_LIST });
}

/** The period's ten most active members by days seen, with how long ago each was last seen. */
export async function mostActiveMembers(activeDays: ReadonlyMap<string, number>): Promise<AnalyticsLeaderboard> {
  const top = [...activeDays.entries()].sort((a, b) => b[1] - a[1]).slice(0, LEADERS);
  const ids = top.map(([id]) => new Types.ObjectId(id));
  const [users, lastDays] = await Promise.all([
    UserModel.find({ _id: { $in: ids } })
      .select('profile.first_name profile.last_name')
      .lean<Array<{ _id: Types.ObjectId; profile?: { first_name?: string; last_name?: string } }>>(),
    ids.length ? lastPingDays({ ids }) : [],
  ]);
  const names = new Map(
    users.map((u) => {
      const id = u._id.toHexString();
      const name = `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim();
      return [id, name || id] as const;
    })
  );
  const last = new Map(lastDays.map((row) => [row._id.toHexString(), row.day]));
  return {
    key: 'most_active_members',
    columns: [
      { key: 'active_days', format: 'COUNT' },
      { key: 'days_since_seen', format: 'DAYS' },
    ],
    rows: top.map(([id, days]) => {
      const day = last.get(id);
      return {
        id,
        name: names.get(id) ?? id,
        caption: null,
        values: [days, day ? daysSince(day) : null],
        link: consoleLink('admin', `/users/${id}`),
      };
    }),
    link: USERS_LIST,
  };
}
