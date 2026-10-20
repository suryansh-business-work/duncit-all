/**
 * The venue owner's read side of bookings: what is booked next (Dashboard),
 * and the old slot requests kept as read-only history now that pods book
 * instantly and no longer ask.
 */
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel, type IVenueSlot } from '@modules/venues/venueSlot/venueSlot.model';

const MAX_ROWS = 100;

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

function ownerScope(userId: string, venueId?: string | null) {
  const scope: Record<string, unknown> = { owner_user_id: new Types.ObjectId(userId) };
  if (venueId) {
    if (!Types.ObjectId.isValid(venueId)) throw new GraphQLError('Invalid venue', { extensions: { code: 'BAD_USER_INPUT' } });
    scope.venue_id = new Types.ObjectId(venueId);
  }
  return scope;
}

async function joinNames(slots: IVenueSlot[], podIdOf: (s: IVenueSlot) => Types.ObjectId | null) {
  const podIds = slots.map(podIdOf).filter((id): id is Types.ObjectId => !!id);
  const [pods, venues] = await Promise.all([
    PodModel.find({ _id: { $in: podIds } }).setOptions({ includeDeleted: true }).select('pod_title').lean(),
    VenueModel.find({ _id: { $in: slots.map((s) => s.venue_id) } }).select('venue_name').lean(),
  ]);
  return {
    podTitle: new Map(pods.map((p) => [String(p._id), p.pod_title])),
    venueName: new Map(venues.map((v) => [String(v._id), v.venue_name ?? ''])),
  };
}

const limitOf = (limit?: number | null) => Math.min(MAX_ROWS, Math.max(1, Math.floor(Number(limit) || 20)));

export const venueBookingsService = {
  /** Upcoming confirmed bookings at the owner's venues, soonest first. */
  async upcoming(userId: string, venueId?: string | null, limit?: number | null) {
    const slots = await VenueSlotModel.find({
      ...ownerScope(userId, venueId),
      status: 'BOOKED',
      booked_by_pod_id: { $ne: null },
      end_at: { $gt: new Date() },
    })
      .sort({ start_at: 1 })
      .limit(limitOf(limit));
    const names = await joinNames(slots, (s) => s.booked_by_pod_id);
    return slots.map((s) => ({
      slot_id: String(s._id),
      venue_id: String(s.venue_id),
      venue_name: names.venueName.get(String(s.venue_id)) ?? '',
      pod_id: String(s.booked_by_pod_id),
      pod_title: names.podTitle.get(String(s.booked_by_pod_id)) ?? '',
      start_at: iso(s.start_at),
      end_at: iso(s.end_at),
      space_label: s.space_label ?? '',
      venue_payout: s.price_snapshot?.venue_payout ?? s.price ?? 0,
      price_snapshot: s.price_snapshot ? { ...s.price_snapshot, confirmed_at: iso(s.price_snapshot.confirmed_at) } : null,
    }));
  },

  /** Slot requests from before instant booking, newest decision first. Read-only. */
  async requestHistory(userId: string, venueId?: string | null, limit?: number | null) {
    const slots = await VenueSlotModel.find({
      ...ownerScope(userId, venueId),
      $or: [{ decision: { $in: ['APPROVED', 'DECLINED'] } }, { status: 'PENDING' }],
    })
      .sort({ decided_at: -1, updated_at: -1 })
      .limit(limitOf(limit));
    const names = await joinNames(slots, (s) => s.booked_by_pod_id ?? s.decided_pod_id);
    return slots.map((s) => {
      const podId = s.booked_by_pod_id ?? s.decided_pod_id;
      return {
        slot_id: String(s._id),
        venue_name: names.venueName.get(String(s.venue_id)) ?? '',
        pod_title: podId ? names.podTitle.get(String(podId)) ?? '' : '',
        start_at: iso(s.start_at),
        end_at: iso(s.end_at),
        status: s.status,
        decision: s.decision ?? 'NONE',
        decided_at: iso(s.decided_at),
        decline_reason: s.decline_reason ?? '',
      };
    });
  },
};
