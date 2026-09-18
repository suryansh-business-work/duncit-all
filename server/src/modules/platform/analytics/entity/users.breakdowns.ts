import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { AppEventModel } from '../appEvent.model';
import { inRange, type AnalyticsWindow } from './window';
import { locationNames } from './lookups';
import { LIVE_USERS } from './users.data';
import { bandSlices, breakdown, fixedSlices, topSlices, type AnalyticsBreakdown, type Band } from './shapes';

/** The Users page's charts: who the members are, and how they use the app. */

const GENDERS = ['FEMALE', 'MALE', 'OTHER', 'none'] as const;
const PET_OWNER = ['yes', 'no', 'none'] as const;
const SIGN_IN = ['GOOGLE', 'EMAIL', 'OTP', 'none'] as const;
const AGES = ['age_under_18', 'age_18_24', 'age_25_34', 'age_35_44', 'age_45_54', 'age_55_plus', 'none'] as const;

/** How many different days a member was seen in the period. */
const ACTIVE_DAYS: Band[] = [
  { key: 'days_1', min: 1 },
  { key: 'days_2_3', min: 2 },
  { key: 'days_4_7', min: 4 },
  { key: 'days_8_14', min: 8 },
  { key: 'days_15_plus', min: 15 },
];

type GroupRow = { _id: string | boolean | Types.ObjectId | null; count: number };

/** Live members grouped by one profile field, keyed as text ('none' when unset). */
async function groupLive(field: string): Promise<Map<string, number>> {
  const rows = await UserModel.aggregate<GroupRow>([
    { $match: LIVE_USERS },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ]);
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = groupKey(row._id);
    counts.set(key, (counts.get(key) ?? 0) + row.count);
  }
  return counts;
}

function groupKey(value: GroupRow['_id']): string {
  if (value === null) return 'none';
  return value instanceof Types.ObjectId ? value.toHexString() : String(value);
}

/** The same counts under new keys — several old keys may fold into one. */
function rekey(counts: ReadonlyMap<string, number>, keyOf: (key: string) => string): Map<string, number> {
  const out = new Map<string, number>();
  for (const [key, count] of counts) {
    const next = keyOf(key);
    out.set(next, (out.get(next) ?? 0) + count);
  }
  return out;
}

const petKey = (value: string) => {
  if (value === 'true') return 'yes';
  return value === 'false' ? 'no' : 'none';
};

/** Age bands from date of birth, cut in the database against today's date. */
async function ageBands(): Promise<Map<string, number>> {
  const yearsAgo = (years: number) => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - years);
    return date;
  };
  // Oldest first — $bucket boundaries must ascend, and an older birthday is an earlier date.
  const bands = [
    { key: 'age_55_plus', from: new Date('1900-01-01T00:00:00.000Z') },
    { key: 'age_45_54', from: yearsAgo(55) },
    { key: 'age_35_44', from: yearsAgo(45) },
    { key: 'age_25_34', from: yearsAgo(35) },
    { key: 'age_18_24', from: yearsAgo(25) },
    { key: 'age_under_18', from: yearsAgo(18) },
  ];
  const boundaries = [...bands.map((band) => band.from), new Date(Date.now() + 86_400_000)];
  const rows = await UserModel.aggregate<{ _id: Date | string; count: number }>([
    { $match: LIVE_USERS },
    { $bucket: { groupBy: '$profile.dob', boundaries, default: 'none', output: { count: { $sum: 1 } } } },
  ]);
  const keyByStart = new Map(bands.map((band) => [band.from.getTime(), band.key]));
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = row._id instanceof Date ? (keyByStart.get(row._id.getTime()) ?? 'none') : 'none';
    counts.set(key, (counts.get(key) ?? 0) + row.count);
  }
  return counts;
}

/** The screens people opened most in the period, by route (or path when no route was sent). */
async function topScreens(window: AnalyticsWindow) {
  const rows = await AppEventModel.aggregate<{ _id: string; count: number }>([
    { $match: { event_type: 'PAGE_VIEW', occurred_at: inRange(window.from, window.to) } },
    { $group: { _id: { $cond: [{ $eq: ['$route', ''] }, '$path', '$route'] }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);
  const counts = new Map(rows.map((row) => [row._id || 'none', row.count]));
  return topSlices(counts, new Map([...counts.keys()].map((key) => [key, key])));
}

export async function userBreakdowns(
  window: AnalyticsWindow,
  activeDays: ReadonlyMap<string, number>
): Promise<AnalyticsBreakdown[]> {
  const [cities, genders, pets, locales, signIns, ages, screens] = await Promise.all([
    groupLive('profile.selected_location_id'),
    groupLive('profile.gender'),
    groupLive('profile.is_pet_owner'),
    groupLive('profile.locale'),
    groupLive('auth.last_login_provider'),
    ageBands(),
    topScreens(window),
  ]);
  const cityNames = await locationNames(cities.keys());
  const allTime = { scope: 'ALL_TIME' } as const;
  return [
    breakdown('activity_frequency', bandSlices([...activeDays.values()], ACTIVE_DAYS), { ordered: true }),
    breakdown('top_screens', screens),
    breakdown('users_by_city', topSlices(cities, cityNames), allTime),
    breakdown('user_age', fixedSlices(AGES, ages), { ...allTime, ordered: true }),
    breakdown('user_gender', fixedSlices(GENDERS, genders), allTime),
    breakdown('pet_owners', fixedSlices(PET_OWNER, rekey(pets, petKey)), allTime),
    breakdown('user_language', topSlices(locales, new Map()), allTime),
    breakdown('sign_in_method', fixedSlices(SIGN_IN, signIns), allTime),
  ];
}
