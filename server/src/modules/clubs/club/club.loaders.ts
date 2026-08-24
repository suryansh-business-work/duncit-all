/**
 * Batched, per-request reads of the club data that hangs off a list row.
 *
 * Two N+1s lived here. `Pod.club` called `clubService.getById` once per pod —
 * on a feed whose pods mostly share a handful of clubs. And `Club.followers_count`,
 * `Club.rating` and `Club.ratings_count` each issued their own count/aggregate
 * per club, so one `clubs` query cost three round trips per row.
 *
 * Both are now single `$in` reads for the whole page. The rating average and the
 * rating count come out of ONE aggregate rather than two, because they are the
 * same grouping over the same documents — asking twice was only ever an artefact
 * of them being separate fields in the schema.
 */
import { Types } from 'mongoose';
import { ClubRatingModel } from './clubRating.model';
import { ClubFollowerModel } from '@modules/access/user/relations';
import { clubService } from './club.service';
import { loadMany, loadOne, primeMany, type CacheCarrier } from '@utils/request-cache';

const CLUB_BUCKET = 'club';
const STATS_BUCKET = 'clubStats';

/** The counters a club row shows. Absent from the map means "none recorded". */
export interface ClubStats {
  followers_count: number;
  rating: number;
  ratings_count: number;
}

const ZERO_STATS: ClubStats = { followers_count: 0, rating: 0, ratings_count: 0 };

const objectIds = (ids: string[]): Types.ObjectId[] =>
  ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));

async function fetchClubs(ids: string[]): Promise<Map<string, any>> {
  const rows = await clubService.getByIds(ids);
  return new Map(rows.map((c: any) => [String(c.id), c]));
}

async function fetchStats(ids: string[]): Promise<Map<string, ClubStats>> {
  const keys = objectIds(ids);
  if (keys.length === 0) return new Map();

  const [followerRows, ratingRows] = await Promise.all([
    ClubFollowerModel.aggregate([
      { $match: { club_id: { $in: keys } } },
      { $group: { _id: '$club_id', count: { $sum: 1 } } },
    ]),
    ClubRatingModel.aggregate([
      { $match: { club_id: { $in: keys } } },
      { $group: { _id: '$club_id', avg: { $avg: '$stars' }, count: { $sum: 1 } } },
    ]),
  ]);

  const out = new Map<string, ClubStats>();
  const at = (id: string): ClubStats => {
    let row = out.get(id);
    if (!row) {
      row = { ...ZERO_STATS };
      out.set(id, row);
    }
    return row;
  };
  for (const row of followerRows) at(String(row._id)).followers_count = row.count ?? 0;
  for (const row of ratingRows) {
    const stats = at(String(row._id));
    stats.rating = row.avg ?? 0;
    stats.ratings_count = row.count ?? 0;
  }
  return out;
}

/** One club in its public shape, through the per-request cache. */
export function loadClub(
  carrier: CacheCarrier,
  id: string | null | undefined,
): Promise<any | null> {
  return loadOne<any>(carrier, CLUB_BUCKET, id, fetchClubs);
}

/** Warm the club cache for a page of pods before `Pod.club` runs per row. */
export function primeClubs(
  carrier: CacheCarrier,
  ids: readonly string[],
): Promise<void> {
  return primeMany<any>(carrier, CLUB_BUCKET, ids, fetchClubs);
}

/**
 * The counters for one club. A club nobody has followed or rated has no row in
 * either aggregate, which is a zero rather than a miss — so this never returns
 * null and the schema's non-null Int fields stay satisfied.
 */
export async function loadClubStats(
  carrier: CacheCarrier,
  id: string | null | undefined,
): Promise<ClubStats> {
  if (!id) return { ...ZERO_STATS };
  const found = await loadMany<ClubStats>(carrier, STATS_BUCKET, [String(id)], fetchStats);
  return found.get(String(id)) ?? { ...ZERO_STATS };
}

/** Warm the counters for a whole `clubs` page in one pair of aggregates. */
export function primeClubStats(
  carrier: CacheCarrier,
  ids: readonly string[],
): Promise<void> {
  return primeMany<ClubStats>(carrier, STATS_BUCKET, ids, fetchStats);
}
