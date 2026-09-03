import { Types } from 'mongoose';
import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import {
  contactOr,
  contactsFor,
  offerToPub,
  podAttendeeCount,
  type PartnerContact,
} from './podChangeRequest.common';
import type { IPodChangeRequest } from './podChangeRequest.model';

/**
 * Turning stored requests into the rows every surface renders.
 *
 * Written as a BATCH hydration rather than a per-row one because the admin
 * table lists many requests at once and every one of them needs its pod, its
 * club, its venue and two people — done row by row that is five queries per
 * line. The partner studios ask for the same shape with one or two rows, and
 * reuse it rather than growing a second, thinner mapper that could disagree
 * about what "attendees" means.
 */

/** The pod, as every change-request row names it. */
interface PodRef {
  id: string;
  pod_slug: string;
  pod_title: string;
  pod_date_time: string;
  club_slug: string;
  attendee_count: number;
}

const EMPTY_POD: PodRef = {
  id: '',
  pod_slug: '',
  pod_title: '',
  pod_date_time: '',
  club_slug: '',
  attendee_count: 0,
};

const iso = (value?: Date | null) => (value instanceof Date ? value.toISOString() : null);

const ids = (values: readonly unknown[]) =>
  [...new Set(values.map(String))].filter((id) => id && Types.ObjectId.isValid(id));

/**
 * One hydration pass over a page of requests.
 *
 * The pod lookup opts INTO deleted rows: a request whose pod was cancelled is
 * exactly the row an admin still needs to read, and the model's soft-delete
 * pre-hook would otherwise hand back nothing and the row would render blank.
 */
export async function hydrateRequests(docs: readonly IPodChangeRequest[]) {
  if (docs.length === 0) return [];

  const podIds = ids(docs.map((d) => d.pod_id));
  const pods = await PodModel.find({ _id: { $in: podIds.map((id) => new Types.ObjectId(id)) } })
    .setOptions({ includeDeleted: true })
    .select(
      'pod_id pod_title pod_date_time club_id pod_attendees extra_seats deleted_at completed_at'
    )
    .lean();
  const podById = new Map((pods as any[]).map((p) => [String(p._id), p]));

  const clubIds = ids([
    ...docs.map((d) => d.from_club_id).filter(Boolean),
    ...(pods as any[]).map((p) => p.club_id).filter(Boolean),
  ]);
  const venueIds = ids([
    ...docs.map((d) => d.from_venue_id).filter(Boolean),
    ...docs.map((d) => d.offer?.venue_id).filter(Boolean),
  ]);
  const slotIds = ids(docs.map((d) => d.offer?.venue_slot_id).filter(Boolean));
  const userIds = ids([
    ...docs.map((d) => d.requested_by),
    ...docs.map((d) => d.offer?.user_id).filter(Boolean),
  ]);

  const [clubs, venues, slots, contacts] = await Promise.all([
    clubIds.length
      ? ClubModel.find({ _id: { $in: clubIds.map((id) => new Types.ObjectId(id)) } })
          .select('club_name club_id admin_user_ids')
          .lean()
      : Promise.resolve([]),
    venueIds.length
      ? VenueModel.find({ _id: { $in: venueIds.map((id) => new Types.ObjectId(id)) } })
          .select('venue_name city locality')
          .lean()
      : Promise.resolve([]),
    slotIds.length
      ? VenueSlotModel.find({ _id: { $in: slotIds.map((id) => new Types.ObjectId(id)) } })
          .select('start_at end_at price space_label')
          .lean()
      : Promise.resolve([]),
    contactsFor(userIds),
  ]);

  const clubById = new Map((clubs as any[]).map((c) => [String(c._id), c]));
  const venueById = new Map((venues as any[]).map((v) => [String(v._id), v]));
  const slotById = new Map((slots as any[]).map((s) => [String(s._id), s]));

  return docs.map((doc) => toRow(doc, { podById, clubById, venueById, slotById, contacts }));
}

interface Lookups {
  podById: Map<string, any>;
  clubById: Map<string, any>;
  venueById: Map<string, any>;
  slotById: Map<string, any>;
  contacts: Map<string, PartnerContact>;
}

function podRefOf(pod: any, clubById: Map<string, any>): PodRef {
  if (!pod) return EMPTY_POD;
  const club = pod.club_id ? clubById.get(String(pod.club_id)) : null;
  return {
    id: String(pod._id),
    pod_slug: pod.pod_id ?? '',
    pod_title: pod.pod_title ?? '',
    pod_date_time: iso(pod.pod_date_time) ?? '',
    club_slug: club?.club_id ?? '',
    // LIVE, not the snapshot: an admin deciding whether to cancel a pod and
    // refund everyone needs the number of people who would be refunded NOW.
    attendee_count: podAttendeeCount(pod),
  };
}

function named(map: Map<string, any>, id: unknown, key: string) {
  if (!id) return { id: null as string | null, name: '' };
  const doc = map.get(String(id));
  return { id: String(id), name: doc?.[key] ?? '' };
}

export function toRow(doc: IPodChangeRequest, lookups: Lookups) {
  const pod = lookups.podById.get(String(doc.pod_id));
  const fromVenue = named(lookups.venueById, doc.from_venue_id, 'venue_name');
  const fromClub = named(lookups.clubById, doc.from_club_id, 'club_name');
  const offerVenue = named(lookups.venueById, doc.offer?.venue_id, 'venue_name');
  const slot = doc.offer?.venue_slot_id
    ? lookups.slotById.get(String(doc.offer.venue_slot_id))
    : null;

  return {
    id: String(doc._id),
    change_request_no: doc.change_request_no,
    role: doc.role,
    status: doc.status,
    resolution: doc.resolution,
    reason: doc.reason ?? '',
    health_penalty: doc.health_penalty,
    attendees_at_request: doc.attendees_at_request,
    pod: podRefOf(pod, lookups.clubById),
    // A cancelled pod is the whole point of one of the two admin actions, so
    // the row says so rather than looking like an ordinary open request.
    pod_cancelled: Boolean(pod?.deleted_at),
    requested_by: contactOr(lookups.contacts, String(doc.requested_by)),
    from_venue_id: fromVenue.id,
    from_venue_name: fromVenue.name,
    from_club_id: fromClub.id,
    from_club_name: fromClub.name,
    offer: doc.offer
      ? {
          ...offerToPub(doc.offer)!,
          contact: contactOr(lookups.contacts, String(doc.offer.user_id)),
          venue_name: offerVenue.name,
          slot_start_at: iso(slot?.start_at),
          slot_end_at: iso(slot?.end_at),
          slot_price: slot?.price ?? 0,
        }
      : null,
    offer_history: (doc.offer_history ?? []).map((offer) => ({
      ...offerToPub(offer)!,
      contact: contactOr(lookups.contacts, String(offer.user_id)),
      venue_name: named(lookups.venueById, offer.venue_id, 'venue_name').name,
      slot_start_at: null,
      slot_end_at: null,
      slot_price: 0,
    })),
    events: (doc.events ?? []).map((event) => ({
      action: event.action,
      actor_name: event.actor_name ?? '',
      note: event.note ?? '',
      at: iso(event.at) ?? '',
    })),
    created_at: iso(doc.created_at) ?? '',
    resolved_at: iso(doc.resolved_at),
  };
}

export type PodChangeRequestRow = Awaited<ReturnType<typeof hydrateRequests>>[number];
