import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { displayFrom, userDisplayMap } from '@modules/access/user/user.display';
import { ChatReadStateModel } from '../rooms/chatState.model';
import { VENUE_CHAT_READ_KIND } from './venueChat.read';
import { VenueChatMessageModel } from './venueChat.model';

/** One venue booking's chat in an inbox list. */
export interface VenueChatThreadRow {
  pod_id: string;
  pod_title: string;
  pod_date_time: string | null;
  venue_id: string;
  venue_name: string;
  host_name: string;
  host_photo: string | null;
  /** The newest line's text; null while nobody has written, empty for a photo. */
  last_message: string | null;
  last_message_is_photo: boolean;
  last_message_at: string | null;
  last_message_side: 'HOST' | 'VENUE' | null;
  /** Lines from the other side since the caller last opened the thread (0 for staff). */
  unread_count: number;
}

export interface VenueChatThreadPage {
  rows: VenueChatThreadRow[];
  total: number;
}

/** Upcoming pods get a thread before anyone writes; past ones only once someone did. */
const UPCOMING_FROM_MS = 24 * 60 * 60 * 1000;
/** A thread list is a human-sized inbox: bounded, never a full scan. */
const MAX_THREADS = 500;

interface LastLine {
  _id: string;
  text: string;
  type: string;
  side: 'HOST' | 'VENUE';
  at: Date;
}

/** A thread's newest text: null while nobody has written, empty for a photo. */
function lastTextOf(line: LastLine | undefined): string | null {
  if (!line) return null;
  return line.type === 'IMAGE' ? '' : line.text;
}

/** Newest line per pod at these venues, in one aggregation. */
async function lastLines(venueIds: string[]): Promise<Map<string, LastLine>> {
  const rows = await VenueChatMessageModel.aggregate<LastLine>([
    { $match: { venue_id: { $in: venueIds }, deleted: false } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$pod_id', text: { $first: '$text' }, type: { $first: '$type' }, side: { $first: '$side' }, at: { $first: '$createdAt' } } },
    { $sort: { at: -1 } },
    { $limit: MAX_THREADS },
  ]);
  return new Map(rows.map((row) => [String(row._id), row]));
}

/** Lines from the other side after the viewer's read mark, per pod, in one aggregation. */
async function unreadFor(userId: string, mySide: 'HOST' | 'VENUE', podIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (podIds.length === 0) return counts;
  const reads = await ChatReadStateModel.find({ user_id: userId, room_kind: VENUE_CHAT_READ_KIND, room_id: { $in: podIds } })
    .select('room_id last_read_at')
    .lean<{ room_id: string; last_read_at: Date }[]>();
  const readAt = new Map(reads.map((r) => [r.room_id, r.last_read_at]));
  const rows = await VenueChatMessageModel.aggregate<{ _id: string; n: number }>([
    {
      $match: {
        $or: podIds.map((id) => ({ pod_id: id, createdAt: { $gt: readAt.get(id) ?? new Date(0) } })),
        deleted: false,
        side: { $ne: mySide },
      },
    },
    { $group: { _id: '$pod_id', n: { $sum: 1 } } },
  ]);
  for (const row of rows) counts.set(String(row._id), row.n);
  return counts;
}

/**
 * The venue chats of these venues, newest activity first: every thread
 * someone has written in, then upcoming pods nobody has written about yet
 * (soonest first). Four reads whatever the page size — venues, last lines,
 * pods, hosts — plus one for unread counts when a viewer is given.
 */
async function threadsOfVenues(
  venues: { _id: unknown; venue_name?: string | null }[],
  page: { limit: number; offset: number },
  viewer: { userId: string; side: 'VENUE' } | null
): Promise<VenueChatThreadPage> {
  const venueIds = venues.map((v) => String(v._id));
  if (venueIds.length === 0) return { rows: [], total: 0 };
  const venueName = new Map(venues.map((v) => [String(v._id), v.venue_name ?? '']));
  const lines = await lastLines(venueIds);
  const pods = await PodModel.find({
    venue_id: { $in: venueIds.map((id) => new Types.ObjectId(id)) },
    $or: [
      { _id: { $in: [...lines.keys()].filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id)) } },
      { pod_date_time: { $gte: new Date(Date.now() - UPCOMING_FROM_MS) } },
    ],
  })
    .select('pod_title pod_date_time pod_hosts_id venue_id')
    .limit(MAX_THREADS * 2)
    .lean();
  const ordered = [...pods].sort((a, b) => {
    const la = lines.get(String(a._id))?.at?.getTime();
    const lb = lines.get(String(b._id))?.at?.getTime();
    if (la !== undefined || lb !== undefined) return (lb ?? -Infinity) - (la ?? -Infinity);
    return (a.pod_date_time?.getTime() ?? 0) - (b.pod_date_time?.getTime() ?? 0);
  });
  const slice = ordered.slice(page.offset, page.offset + page.limit);
  const sliceIds = slice.map((p) => String(p._id));
  const [hosts, unread] = await Promise.all([
    userDisplayMap(slice.map((p) => String(p.pod_hosts_id?.[0] ?? ''))),
    viewer ? unreadFor(viewer.userId, viewer.side, sliceIds) : Promise.resolve(new Map<string, number>()),
  ]);
  const rows = slice.map((pod): VenueChatThreadRow => {
    const id = String(pod._id);
    const line = lines.get(id);
    const host = displayFrom(hosts, pod.pod_hosts_id?.[0]);
    return {
      pod_id: id,
      pod_title: pod.pod_title ?? '',
      pod_date_time: pod.pod_date_time ? pod.pod_date_time.toISOString() : null,
      venue_id: String(pod.venue_id),
      venue_name: venueName.get(String(pod.venue_id)) ?? '',
      host_name: host.name,
      host_photo: host.photo || null,
      last_message: lastTextOf(line),
      last_message_is_photo: line?.type === 'IMAGE',
      last_message_at: line ? line.at.toISOString() : null,
      last_message_side: line?.side ?? null,
      unread_count: unread.get(id) ?? 0,
    };
  });
  return { rows, total: ordered.length };
}

const clampPage = (limit?: number | null, offset?: number | null) => ({
  limit: Math.min(100, Math.max(1, limit ?? 30)),
  offset: Math.max(0, offset ?? 0),
});

export const venueChatThreadsService = {
  /** The owner's venue chats — one venue, or all of theirs when none is named. */
  async forOwner(userId: string, venueId?: string | null, limit?: number | null, offset?: number | null) {
    const filter: Record<string, unknown> = { owner_user_id: new Types.ObjectId(userId) };
    if (venueId) {
      if (!Types.ObjectId.isValid(venueId)) return { rows: [], total: 0 };
      filter._id = new Types.ObjectId(venueId);
    }
    const venues = await VenueModel.find(filter).select('venue_name').lean();
    return threadsOfVenues(venues, clampPage(limit, offset), { userId, side: 'VENUE' });
  },

  /** One venue's chats for Duncit staff (read-only; no read marks). */
  async forStaff(venueId: string, limit?: number | null, offset?: number | null) {
    if (!Types.ObjectId.isValid(venueId)) return { rows: [], total: 0 };
    const venues = await VenueModel.find({ _id: new Types.ObjectId(venueId) }).select('venue_name').lean();
    return threadsOfVenues(venues, clampPage(limit, offset), null);
  },
};
