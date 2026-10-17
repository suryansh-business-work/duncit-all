import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { PodModel } from '../pod/pod.model';
import { podLiveEnd } from '../pod/pod.lifecycle';
import { podSeatsAvailable } from '../pod/pod.seats';
import { PodMemberModel } from '../podMember/podMember.model';
import { podMemberService } from '../podMember/podMember.service';
import { PodSeriesModel } from './podSeries.model';
import { syncSeriesParent } from './podSeries.parent';

/** Where one date of a recurring pod stands, for the dates list on Pod Details. */
export type SeriesDateStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' | 'AWAITING_VENUE';

interface DateDoc {
  _id: Types.ObjectId;
  pod_id: string;
  pod_date_time: Date;
  pod_end_date_time?: Date | null;
  deleted_at?: Date | null;
  completed_at?: Date | null;
  is_active?: boolean;
  is_hidden?: boolean;
  venue_approval_status?: string;
  no_of_spots?: number;
  pod_attendees?: Types.ObjectId[];
  extra_seats?: number;
}

const DATE_FIELDS =
  'pod_id pod_date_time pod_end_date_time deleted_at completed_at is_active is_hidden venue_approval_status no_of_spots pod_attendees extra_seats';

export function seriesDateStatus(d: DateDoc, now: Date): SeriesDateStatus {
  if (d.deleted_at || d.venue_approval_status === 'DECLINED') return 'CANCELLED';
  if (d.completed_at) return 'COMPLETED';
  const end = podLiveEnd(d)?.getTime() ?? 0;
  if (end < now.getTime()) return 'COMPLETED';
  if (d.venue_approval_status === 'PENDING') return 'AWAITING_VENUE';
  return d.pod_date_time.getTime() <= now.getTime() ? 'ONGOING' : 'UPCOMING';
}

/** The parent row of whatever recurring-pod row `podDocId` is, or null for a one-time pod. */
async function parentOf(podDocId: string) {
  if (!Types.ObjectId.isValid(podDocId)) return null;
  const pod = await PodModel.findById(podDocId)
    .setOptions({ includeDeleted: true })
    .select('series_role series_parent_id series_id')
    .lean<{ _id: Types.ObjectId; series_role?: string | null; series_parent_id?: Types.ObjectId | null }>();
  if (pod?.series_role === 'PARENT') return pod._id;
  if (pod?.series_role === 'DATE') return pod.series_parent_id ?? null;
  return null;
}

/** The DATE rows of one parent, oldest first, cancelled ones included. */
async function datesOf(parentId: Types.ObjectId) {
  return PodModel.find({ series_parent_id: parentId })
    .setOptions({ includeDeleted: true })
    .select(DATE_FIELDS)
    .sort({ pod_date_time: 1 })
    .lean<DateDoc[]>();
}

/** Seats the viewer holds on each date they booked. */
async function mySeats(dateIds: Types.ObjectId[], userId: string | null) {
  if (!userId) return new Map<string, number>();
  const rows = await PodMemberModel.find({
    pod_id: { $in: dateIds },
    user_id: new Types.ObjectId(userId),
    status: { $in: ['JOINED', 'BACKOUT_IN_PROCESS'] },
  })
    .select('pod_id seats status')
    .lean<{ pod_id: Types.ObjectId; seats?: number }[]>();
  return new Map(rows.map((r) => [String(r.pod_id), Math.max(1, Number(r.seats) || 1)]));
}

export const podSeriesReadService = {
  /**
   * Every date of a recurring pod for its details page: when, how it stands,
   * how many spots it has left, whether the viewer booked it and whether it
   * can be booked now. Null for a one-time pod.
   */
  async dates(podDocId: string, userId: string | null) {
    const parentId = await parentOf(podDocId);
    if (!parentId) return null;
    const [series, dates] = await Promise.all([
      PodSeriesModel.findOne({ parent_pod_id: parentId }).select('frequency multi_date_discount_tiers').lean(),
      datesOf(parentId),
    ]);
    const mine = await mySeats(
      dates.map((d) => d._id),
      userId
    );
    const now = new Date();
    return {
      parent_pod_id: String(parentId),
      frequency: series?.frequency ?? null,
      multi_date_discount_tiers: series?.multi_date_discount_tiers ?? [],
      dates: dates.map((d) => {
        const status = seriesDateStatus(d, now);
        const unlimited = !(Number(d.no_of_spots) > 0);
        const seatsLeft = unlimited ? null : podSeatsAvailable(d);
        const booked = mine.get(String(d._id)) ?? 0;
        return {
          pod_doc_id: String(d._id),
          slug: d.pod_id,
          start_at: d.pod_date_time.toISOString(),
          end_at: podLiveEnd(d)?.toISOString() ?? null,
          status,
          seats_available: seatsLeft,
          my_seats: booked,
          bookable:
            status === 'UPCOMING' && !!d.is_active && !d.is_hidden && booked === 0 && (seatsLeft === null || seatsLeft > 0),
        };
      }),
    };
  },

  /**
   * Books the viewer a seat on each picked date of a FREE recurring pod — each
   * through the ordinary free join, so every rule of a one-time join holds per
   * date. A date that cannot be joined (full a second ago, already started) is
   * reported and the others still go ahead.
   */
  async joinFreeDates(userId: string, podDocId: string, datePodIds: string[]) {
    const parentId = await parentOf(podDocId);
    if (!parentId) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
    const ids = [...new Set(datePodIds)].filter((id) => Types.ObjectId.isValid(id));
    const belong = await PodModel.find({ _id: { $in: ids }, series_parent_id: parentId })
      .select('_id')
      .sort({ pod_date_time: 1 })
      .lean();
    if (belong.length === 0 || belong.length !== datePodIds.length) {
      throw new GraphQLError('Pick the dates to book', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const joined: string[] = [];
    const failed: { pod_doc_id: string; message: string }[] = [];
    for (const date of belong) {
      try {
        await podMemberService.joinFree(String(date._id), userId);
        joined.push(String(date._id));
      } catch (error) {
        failed.push({ pod_doc_id: String(date._id), message: error instanceof Error ? error.message : String(error) });
        logs.server.warn('podSeries', 'joinFreeDates.date', { pod_id: String(date._id), error });
      }
    }
    await syncSeriesParent(parentId);
    return { joined, failed };
  },
};
