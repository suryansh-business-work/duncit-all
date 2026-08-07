import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { UserModel } from '@modules/access/user/user.model';
import { bucketForPod } from '@modules/finance/finance/breakdown.service';
import { VenueModel } from './venue.model';
import { podSeatsTaken } from '@modules/pods/pod/pod.seats';

/**
 * Partners → Venues → Pods: every pod booked at the caller's venues, ALL
 * lifecycle states including soft-deleted (cancelled) ones — the venue owner
 * must still see a pod that was cancelled at their venue. Scoping is
 * server-side by venue ownership; only APPROVED bookings list here (PENDING
 * requests live on Slot Requests, DECLINED ones never happened).
 */
const VENUE_POD_LIMIT = 500;

export const venuePodsService = {
  async listForOwner(userId: string, venueId?: string | null) {
    if (venueId && !Types.ObjectId.isValid(venueId)) {
      throw new GraphQLError('Venue not found', { extensions: { code: 'NOT_FOUND' } });
    }
    const ownerFilter: Record<string, unknown> = { owner_user_id: new Types.ObjectId(userId) };
    if (venueId) ownerFilter._id = new Types.ObjectId(venueId);
    const venues = await VenueModel.find(ownerFilter).select('venue_name');
    if (venueId && venues.length === 0) {
      throw new GraphQLError('You do not own this venue', { extensions: { code: 'FORBIDDEN' } });
    }
    if (venues.length === 0) return [];
    const venueNameById = new Map<string, string>(
      venues.map((v: any) => [String(v._id), v.venue_name]),
    );
    // lean(): plain DB shapes, so legacy pods keep their genuinely-missing fields.
    const pods = await PodModel.find({
      venue_id: { $in: venues.map((v) => v._id) },
      venue_approval_status: 'APPROVED',
    })
      .setOptions({ includeDeleted: true })
      .sort({ pod_date_time: -1 })
      .limit(VENUE_POD_LIMIT)
      .lean();
    const hostIds = [...new Set(pods.flatMap((p) => (p.pod_hosts_id ?? []).map(String)))];
    const hosts = await UserModel.find({ _id: { $in: hostIds } }).select(
      'profile.first_name profile.last_name',
    );
    const hostNameById = new Map<string, string>(
      hosts.map((u: any) => [
        String(u._id),
        `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim(),
      ]),
    );
    const now = Date.now();
    return pods.map((pod) => ({
      id: String(pod._id),
      pod_slug: pod.pod_id,
      pod_title: pod.pod_title,
      pod_date_time: pod.pod_date_time?.toISOString?.() ?? '',
      pod_end_date_time: pod.pod_end_date_time?.toISOString?.() ?? null,
      pod_amount: pod.pod_amount ?? 0,
      pod_type: pod.pod_type,
      no_of_spots: pod.no_of_spots ?? 0,
      attendee_count: podSeatsTaken(pod),
      pod_attendees: (pod.pod_attendees ?? []).map(String),
      host_names: (pod.pod_hosts_id ?? [])
        .map((id: any) => hostNameById.get(String(id)))
        .filter(Boolean) as string[],
      venue_id: String(pod.venue_id),
      // The pods query is filtered to the owned venues above, so the lookup
      // always hits — hence the non-null assertion instead of a dead fallback.
      venue_name: venueNameById.get(String(pod.venue_id))!,
      bucket: bucketForPod(pod, now).toUpperCase(),
      is_active: !!pod.is_active,
      completed_at: pod.completed_at?.toISOString?.() ?? null,
      cancelled_at: pod.deleted_at?.toISOString?.() ?? null,
      created_at: pod.created_at?.toISOString?.() ?? '',
    }));
  },
};
