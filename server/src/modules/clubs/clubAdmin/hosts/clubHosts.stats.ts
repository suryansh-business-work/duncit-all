import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { podCompletedExpr, podUpcomingExpr } from '@modules/pods/pod/pod.lifecycle';

/**
 * Pod activity per (club, host), in ONE aggregation per call — never a query
 * per host. Both entry points start on an indexed field: `club_id` (the
 * `{club_id, pod_date_time}` index) for one club's hosts page, and
 * `pod_date_time` for the monthly job's sweep across every club.
 *
 * "Completed" is the pod lifecycle's own rule (pod.lifecycle): settled by
 * finance or past its live end. Cancelled pods never count — the model's
 * aggregate hook drops soft-deleted rows. Co-hosts are view-only helpers and
 * are not hosts (pod_hosts_id only).
 */

export interface HostPodStats {
  club_id: string;
  host_user_id: string;
  /** Start of the latest completed pod, or null when none has completed. */
  last_pod_at: Date | null;
  completed_in_period: number;
  upcoming_count: number;
}

const key = (clubId: string, hostId: string) => `${clubId}:${hostId}`;

/** One row of the per-club, per-host pod aggregation below. */
interface HostStatsRow {
  _id: { club_id: unknown; host: unknown };
  last_pod_at?: Date | null;
  completed_in_period?: number;
  upcoming_count?: number;
}

/** Pivot an aggregation's rows into a lookup by `club:host`. */
function byClubHost(rows: readonly HostStatsRow[]): Map<string, HostPodStats> {
  const map = new Map<string, HostPodStats>();
  for (const row of rows) {
    const clubId = String(row._id.club_id);
    const hostId = String(row._id.host);
    map.set(key(clubId, hostId), {
      club_id: clubId,
      host_user_id: hostId,
      last_pod_at: row.last_pod_at ?? null,
      completed_in_period: row.completed_in_period ?? 0,
      upcoming_count: row.upcoming_count ?? 0,
    });
  }
  return map;
}

/**
 * Stats for every host who has run a (non-cancelled) pod in the given clubs,
 * with `completed_in_period` counted over `[range.start, range.end)`.
 */
export async function hostPodStatsForClubs(
  clubIds: readonly string[],
  range: { start: Date; end: Date },
  now: Date
): Promise<Map<string, HostPodStats>> {
  if (clubIds.length === 0) return new Map();
  const completed = podCompletedExpr(now);
  const rows = await PodModel.aggregate<HostStatsRow>([
    { $match: { club_id: { $in: clubIds.map((id) => new Types.ObjectId(id)) } } },
    { $project: { club_id: 1, pod_hosts_id: 1, pod_date_time: 1, done: completed, upcoming: podUpcomingExpr(now) } },
    { $unwind: '$pod_hosts_id' },
    {
      $group: {
        _id: { club_id: '$club_id', host: '$pod_hosts_id' },
        last_pod_at: { $max: { $cond: ['$done', '$pod_date_time', null] } },
        completed_in_period: {
          $sum: {
            $cond: [
              {
                $and: [
                  '$done',
                  { $gte: ['$pod_date_time', range.start] },
                  { $lt: ['$pod_date_time', range.end] },
                ],
              },
              1,
              0,
            ],
          },
        },
        upcoming_count: { $sum: { $cond: ['$upcoming', 1, 0] } },
      },
    },
  ]);
  return byClubHost(rows);
}

/** Look up one (club, host)'s stats, or the zero row when they have run none. */
export function statsFor(map: Map<string, HostPodStats>, clubId: string, hostId: string): HostPodStats {
  return (
    map.get(key(clubId, hostId)) ?? {
      club_id: clubId,
      host_user_id: hostId,
      last_pod_at: null,
      completed_in_period: 0,
      upcoming_count: 0,
    }
  );
}

/**
 * The hosts of each club: the club's linked hosts (`host_ids`, set by an admin)
 * UNION everyone who has hosted a non-cancelled pod in it. A union rather than
 * clubService.getHosts' either/or, because a club with a few linked hosts can
 * still have others running its pods — and those are exactly the people a
 * club admin must be able to see and call.
 */
export function clubHostIds(
  club: { _id: unknown; host_ids?: unknown[] | null },
  stats: Map<string, HostPodStats>
): string[] {
  const clubId = String(club._id);
  const ids = new Set<string>((club.host_ids ?? []).map(String));
  for (const row of stats.values()) if (row.club_id === clubId) ids.add(row.host_user_id);
  return [...ids].filter((id) => Types.ObjectId.isValid(id));
}

/** Whether `hostId` is a host of the club under the same union rule. */
export async function isClubHost(club: { _id: unknown; host_ids?: unknown[] | null }, hostId: string) {
  if (!Types.ObjectId.isValid(hostId)) return false;
  if ((club.host_ids ?? []).map(String).includes(hostId)) return true;
  const pod = await PodModel.exists({ club_id: club._id, pod_hosts_id: new Types.ObjectId(hostId) });
  return Boolean(pod);
}
