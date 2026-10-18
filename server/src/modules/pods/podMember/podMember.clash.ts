/**
 * "You already have a pod at that time" — read before a booking, never a gate.
 *
 * Pod Details asks this just before a join or a checkout and shows the member
 * every pod they are already JOINED on whose time overlaps the one(s) they are
 * about to book, so they can free that spot first or book anyway. Booking
 * stays allowed either way (the member chooses), which is why nothing on the
 * join or payment path calls this.
 *
 * A pod occupies [start, end) where end is `pod_end_date_time`, or the start
 * plus the live tail when the host set none — `podLiveEnd`, the same rule the
 * pod's own phase, chat room and attendance lock use.
 */
import { Types } from 'mongoose';
import { PodMemberModel } from './podMember.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { POD_LIVE_TAIL_MS, podLiveEnd } from '@modules/pods/pod/pod.lifecycle';

/** One already-booked pod that overlaps one of the pods being booked. */
export interface PodBookingClash {
  /** The pod being booked (one of the ids asked about). */
  target_pod_id: string;
  /** The already-booked pod it overlaps. */
  pod_id: string;
  pod_slug: string;
  club_slug: string;
  pod_title: string;
  pod_date_time: string;
  pod_end_date_time: string;
}

interface Window {
  id: string;
  start: number;
  end: number;
}

const windowOf = (pod: { _id: unknown; pod_date_time?: Date | null; pod_end_date_time?: Date | null }) => {
  const end = podLiveEnd(pod);
  if (!pod.pod_date_time || !end) return null;
  return { id: String(pod._id), start: pod.pod_date_time.getTime(), end: end.getTime() };
};

const overlaps = (a: Window, b: Window) => a.start < b.end && b.start < a.end;

/** Max ids one call may ask about — a recurring pod books at most this many dates. */
const MAX_TARGETS = 50;

export async function myBookingClashes(userId: string, podDocIds: readonly string[]): Promise<PodBookingClash[]> {
  const targetIds = [...new Set(podDocIds)].filter((id) => Types.ObjectId.isValid(id)).slice(0, MAX_TARGETS);
  if (targetIds.length === 0) return [];

  const targets = (
    await PodModel.find({ _id: { $in: targetIds } })
      .select('pod_date_time pod_end_date_time')
      .lean()
  )
    .map(windowOf)
    .filter((w): w is Window => w !== null);
  if (targets.length === 0) return [];

  const joined = await PodMemberModel.find({ user_id: new Types.ObjectId(userId), status: 'JOINED' })
    .select('pod_id')
    .lean();
  const targetSet = new Set(targets.map((t) => t.id));
  const bookedIds = joined.map((m) => m.pod_id).filter((id) => !targetSet.has(String(id)));
  if (bookedIds.length === 0) return [];

  // Only pods that can still overlap: started before the last target ends, and
  // not ended (worst case: start + longest custom end) before the first begins.
  // The exact end check runs in memory with podLiveEnd.
  const earliest = Math.min(...targets.map((t) => t.start));
  const latest = Math.max(...targets.map((t) => t.end));
  const booked = await PodModel.find({
    _id: { $in: bookedIds },
    completed_at: null,
    pod_date_time: { $lt: new Date(latest) },
    $or: [
      { pod_end_date_time: { $gt: new Date(earliest) } },
      { pod_end_date_time: null, pod_date_time: { $gt: new Date(earliest - POD_LIVE_TAIL_MS) } },
    ],
  })
    .select('pod_id club_id pod_title pod_date_time pod_end_date_time')
    .sort({ pod_date_time: 1 })
    .lean();
  if (booked.length === 0) return [];

  // Both apps route a pod by club slug + pod slug: one read for every club.
  const clubs = await ClubModel.find({ _id: { $in: [...new Set(booked.map((p) => String(p.club_id)))] } })
    .select('club_id')
    .lean();
  const clubSlugById = new Map(clubs.map((c) => [String(c._id), c.club_id]));

  const clashes: PodBookingClash[] = [];
  for (const pod of booked) {
    const span = windowOf(pod);
    if (!span) continue;
    for (const target of targets) {
      if (!overlaps(span, target)) continue;
      clashes.push({
        target_pod_id: target.id,
        pod_id: span.id,
        pod_slug: pod.pod_id,
        club_slug: clubSlugById.get(String(pod.club_id)) ?? '',
        pod_title: pod.pod_title,
        pod_date_time: new Date(span.start).toISOString(),
        pod_end_date_time: new Date(span.end).toISOString(),
      });
    }
  }
  return clashes;
}
