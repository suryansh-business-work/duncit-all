import { consoleLink } from './links';
import { cityLocation } from './city';
import { Types } from 'mongoose';
import { ClubModel } from '@modules/clubs/club/club.model';
import { ClubRatingModel } from '@modules/clubs/club/clubRating.model';
import {
  cumulative,
  dayKeyIn,
  dayTotals,
  distinctSeries,
  inRange,
  seriesFromDays,
  type AnalyticsWindow,
} from './window';
import { categoryNames, locationNames, refKey } from './lookups';
import { groupPods, loadHeldPods, loadOutcomes, rankingValues, RANKING_COLUMNS, sumPods, type HeldPod } from './held-pods';
import {
  PODS_BANDS,
  STAR_KEYS,
  bandSlices,
  breakdown,
  countMap,
  fixedSlices,
  kpi,
  mean,
  pct,
  tally,
  topSlices,
  trend,
  type AnalyticsLeaderboard,
  type EntityAnalyticsSections,
} from './shapes';

/**
 * Analytics > Clubs — how many clubs there are, how many actually run pods,
 * and which ones people turn up to. A club is ACTIVE in a period when it held
 * at least one pod in it.
 */

interface ClubRow {
  _id: Types.ObjectId;
  club_name: string;
  created_at: Date;
  is_active?: boolean;
  is_verified?: boolean;
  location_id?: Types.ObjectId | null;
  category_id?: Types.ObjectId | null;
  admin_user_ids?: Types.ObjectId[];
}

const ADMINS_PER_CLUB = [
  { key: 'admins_0', min: 0 },
  { key: 'admins_1', min: 1 },
  { key: 'admins_2_plus', min: 2 },
];
const CLUB_STATUSES = ['ACTIVE_VERIFIED', 'ACTIVE_UNVERIFIED', 'INACTIVE'] as const;

const clubStatus = (club: ClubRow) => {
  if (club.is_active === false) return 'INACTIVE';
  return club.is_verified ? 'ACTIVE_VERIFIED' : 'ACTIVE_UNVERIFIED';
};

async function ratingsIn(from: Date, to: Date, clubFilter: Record<string, unknown>) {
  const [row] = await ClubRatingModel.aggregate<{ total: number; count: number }>([
    { $match: { created_at: inRange(from, to), ...clubFilter } },
    { $group: { _id: null, total: { $sum: '$stars' }, count: { $sum: 1 } } },
  ]);
  return row ?? { total: 0, count: 0 };
}

function periodFigures(clubs: readonly ClubRow[], held: readonly HeldPod[], from: Date, to: Date) {
  const active = new Set(held.map((pod) => pod.club_id));
  const existing = clubs.filter((club) => club.created_at < to);
  const dormant = clubs.filter(
    (club) => club.created_at < from && club.is_active !== false && !active.has(club._id.toHexString())
  );
  const seats = held.reduce((sum, pod) => sum + pod.seats, 0);
  return {
    created: clubs.filter((club) => club.created_at >= from && club.created_at < to).length,
    active: active.size,
    activity_rate: pct(active.size, existing.length),
    dormant: dormant.length,
    pods_per_active: mean(held.length, active.size),
    seats_per_active: mean(seats, active.size),
  };
}

async function clubLeaderboard(clubs: readonly ClubRow[], held: readonly HeldPod[]): Promise<AnalyticsLeaderboard> {
  const outcomes = await loadOutcomes(held);
  const ranked = [...groupPods(held, (pod) => [pod.club_id]).entries()]
    .map(([clubId, pods]) => ({ clubId, totals: sumPods(pods, outcomes) }))
    .sort((a, b) => b.totals.seats - a.totals.seats || b.totals.pods - a.totals.pods)
    .slice(0, 10);
  const byId = new Map(clubs.map((club) => [club._id.toHexString(), club]));
  const cities = await locationNames(ranked.map(({ clubId }) => refKey(byId.get(clubId)?.location_id)));
  return {
    key: 'top_clubs',
    columns: [...RANKING_COLUMNS],
    rows: ranked.map(({ clubId, totals }) => {
      const club = byId.get(clubId);
      return {
        id: clubId,
        name: club?.club_name ?? '',
        caption: cities.get(refKey(club?.location_id)) ?? null,
        link: consoleLink('clubs', `/clubs/${clubId}`),
        values: rankingValues(totals, { sum: totals.rating_sum, count: totals.rating_count }),
      };
    }),
  };
}

async function clubBreakdowns(
  clubs: readonly ClubRow[],
  held: readonly HeldPod[],
  window: AnalyticsWindow,
  clubFilter: Record<string, unknown>
) {
  const categories = tally(clubs.map((club) => refKey(club.category_id)));
  const cities = tally(clubs.map((club) => refKey(club.location_id)));
  const podsByClub = tally(held.map((pod) => pod.club_id));
  const existing = clubs.filter((club) => club.created_at < window.to);
  const [categoryNameMap, cityNameMap, stars] = await Promise.all([
    categoryNames(categories.keys()),
    locationNames(cities.keys()),
    ClubRatingModel.aggregate<{ _id: number; count: number }>([
      { $match: { created_at: inRange(window.from, window.to), ...clubFilter } },
      { $group: { _id: '$stars', count: { $sum: 1 } } },
    ]),
  ]);
  const allTime = { scope: 'ALL_TIME' } as const;
  return [
    breakdown('clubs_by_category', topSlices(categories, categoryNameMap), allTime),
    breakdown('clubs_by_city', topSlices(cities, cityNameMap), allTime),
    breakdown(
      'pods_per_club',
      bandSlices(
        existing.map((club) => podsByClub.get(club._id.toHexString()) ?? 0),
        PODS_BANDS
      ),
      { ordered: true }
    ),
    breakdown(
      'admins_per_club',
      bandSlices(
        clubs.map((club) => club.admin_user_ids?.length ?? 0),
        ADMINS_PER_CLUB
      ),
      { ...allTime, ordered: true }
    ),
    breakdown('club_status', fixedSlices(CLUB_STATUSES, tally(clubs.map(clubStatus))), allTime),
    breakdown('club_rating_stars', fixedSlices(STAR_KEYS, countMap(stars)), { ordered: true }),
  ];
}

export async function clubAnalytics(window: AnalyticsWindow): Promise<EntityAnalyticsSections> {
  const location = cityLocation(window.city);
  const clubs = await ClubModel.find(location)
    .select('club_name created_at is_active is_verified location_id category_id admin_user_ids')
    .lean<ClubRow[]>();
  // Ratings point at a club, so a city's ratings are its clubs' ratings.
  const clubFilter = window.city ? { club_id: { $in: clubs.map((club) => club._id) } } : {};
  const [held, prevHeld, rating, prevRating] = await Promise.all([
    loadHeldPods(window.from, window.to, location),
    loadHeldPods(window.prevFrom, window.prevTo, location),
    ratingsIn(window.from, window.to, clubFilter),
    ratingsIn(window.prevFrom, window.prevTo, clubFilter),
  ]);
  const now = periodFigures(clubs, held, window.from, window.to);
  const before = periodFigures(clubs, prevHeld, window.prevFrom, window.prevTo);
  const live = clubs.filter((club) => club.is_active !== false);

  const createdInWindow = clubs.filter((club) => club.created_at >= window.from);
  const newPerBucket = seriesFromDays(dayTotals(createdInWindow, (club) => club.created_at, window.zone), window);
  const totalPerBucket = cumulative(clubs.length - createdInWindow.length, newPerBucket);
  const activeDays = held.map((pod) => ({ day: dayKeyIn(pod.starts_at, window.zone), id: pod.club_id }));

  return {
    kpis: [
      kpi('clubs_total', clubs.length, null),
      kpi('new_clubs', now.created, before.created),
      kpi('active_clubs', now.active, before.active),
      kpi('club_activity_rate', now.activity_rate, before.activity_rate, { format: 'PERCENT' }),
      kpi('dormant_clubs', now.dormant, before.dormant, { higherIsBetter: false }),
      kpi('pods_per_active_club', now.pods_per_active, before.pods_per_active, { format: 'DECIMAL' }),
      kpi('seats_per_active_club', now.seats_per_active, before.seats_per_active, { format: 'DECIMAL' }),
      kpi('verified_share', pct(clubs.filter((club) => club.is_verified).length, clubs.length), null, { format: 'PERCENT' }),
      kpi('clubs_without_admin', live.filter((club) => !club.admin_user_ids?.length).length, null, { higherIsBetter: false }),
      kpi('inactive_clubs', clubs.length - live.length, null, { higherIsBetter: false }),
      kpi('club_ratings', rating.count, prevRating.count),
      kpi('avg_club_rating', mean(rating.total, rating.count), mean(prevRating.total, prevRating.count), { format: 'RATING' }),
    ],
    trends: [
      trend('clubs', window, [
        { key: 'new_clubs', values: newPerBucket },
        { key: 'active_clubs', values: distinctSeries(activeDays, window) },
      ]),
      trend('club_total', window, [{ key: 'clubs_total', values: totalPerBucket }]),
    ],
    breakdowns: await clubBreakdowns(clubs, held, window, clubFilter),
    leaderboard: await clubLeaderboard(clubs, held),
  };
}
