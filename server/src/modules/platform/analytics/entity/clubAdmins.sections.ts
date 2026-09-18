import { consoleLink } from './links';
import { categoryNames, locationNames, refKey, userNames } from './lookups';
import { groupPods, loadOutcomes, sumPods, type HeldPod } from './held-pods';
import { adminsOfPod, type AdminDirectory, type ProfileRow } from './clubAdmins.data';
import {
  STAR_KEYS,
  bandSlices,
  breakdown,
  distinctTally,
  fixedSlices,
  mean,
  pct,
  tally,
  topSlices,
  type AnalyticsBreakdown,
  type AnalyticsLeaderboard,
} from './shapes';

/** The Club Admins page's charts and its one ranking. */

const STATUSES = ['DRAFT', 'APPROVED', 'REJECTED', 'INACTIVE'] as const;
const CLUBS_PER_ADMIN = [
  { key: 'clubs_0', min: 0 },
  { key: 'clubs_1', min: 1 },
  { key: 'clubs_2', min: 2 },
  { key: 'clubs_3_5', min: 3 },
  { key: 'clubs_6_plus', min: 6 },
];

const profileStatus = (row: ProfileRow) => (row.is_active === false ? 'INACTIVE' : row.status);

/** Admins per city — an admin whose clubs span two cities counts in both. */
function adminCities(directory: AdminDirectory) {
  const cityByClub = new Map(directory.clubs.map((club) => [club._id.toHexString(), refKey(club.location_id)]));
  return distinctTally(
    [...directory.clubsByAdmin.entries()].flatMap(([id, clubIds]) =>
      clubIds.map((clubId) => ({ id, key: cityByClub.get(clubId) ?? 'none' }))
    )
  );
}

export async function adminBreakdowns(
  directory: AdminDirectory,
  stars: ReadonlyMap<string, number>
): Promise<AnalyticsBreakdown[]> {
  const categories = tally(directory.profiles.map((row) => refKey(row.category_id)));
  const cities = adminCities(directory);
  const [categoryNameMap, cityNameMap] = await Promise.all([
    categoryNames(categories.keys()),
    locationNames(cities.keys()),
  ]);
  const allTime = { scope: 'ALL_TIME' } as const;
  const clubCounts = [...directory.clubsByAdmin.values()].map((clubs) => clubs.length);
  return [
    breakdown('admin_status', fixedSlices(STATUSES, tally(directory.profiles.map(profileStatus))), allTime),
    breakdown('clubs_per_admin', bandSlices(clubCounts, CLUBS_PER_ADMIN), { ...allTime, ordered: true }),
    breakdown('admins_by_category', topSlices(categories, categoryNameMap), allTime),
    breakdown('admins_by_city', topSlices(cities, cityNameMap), allTime),
    breakdown('admin_rating_stars', fixedSlices(STAR_KEYS, stars), { ordered: true }),
  ];
}

export const ADMIN_COLUMNS = [
  { key: 'clubs', format: 'COUNT' },
  { key: 'pods_held', format: 'COUNT' },
  { key: 'seats_filled', format: 'COUNT' },
  { key: 'fill_rate', format: 'PERCENT' },
  { key: 'attendance_rate', format: 'PERCENT' },
  { key: 'forced_marks', format: 'COUNT' },
  { key: 'admin_rating', format: 'RATING' },
] as const;

/** The ten admins whose clubs seated the most people in the period. */
export async function adminLeaderboard(
  directory: AdminDirectory,
  held: readonly HeldPod[]
): Promise<AnalyticsLeaderboard> {
  const podsByAdmin = groupPods(held, adminsOfPod(directory));
  const outcomes = await loadOutcomes(held);
  const ranked = [...podsByAdmin.entries()]
    .map(([adminId, pods]) => ({ adminId, totals: sumPods(pods, outcomes) }))
    .sort((a, b) => b.totals.seats - a.totals.seats || b.totals.pods - a.totals.pods)
    .slice(0, 10);
  const profileByUser = new Map(directory.profiles.map((row) => [row.user_id.toHexString(), row]));
  const names = await userNames(ranked.map(({ adminId }) => adminId));
  return {
    key: 'top_club_admins',
    columns: [...ADMIN_COLUMNS],
    rows: ranked.map(({ adminId, totals }) => {
      const profile = profileByUser.get(adminId);
      return {
        id: adminId,
        name: profile?.full_name || names.get(adminId) || '',
        caption: profile?.club_admin_no ?? null,
        link: profile ? consoleLink('club-admins', `/club-admins/${profile._id.toHexString()}`) : null,
        values: [
          directory.clubsByAdmin.get(adminId)?.length ?? 0,
          totals.pods,
          totals.seats,
          pct(totals.seats, totals.spots),
          pct(totals.checked_in, totals.admitted),
          totals.forced,
          totals.admin_rating_count > 0 ? mean(totals.admin_rating_sum, totals.admin_rating_count) : null,
        ],
      };
    }),
  };
}
