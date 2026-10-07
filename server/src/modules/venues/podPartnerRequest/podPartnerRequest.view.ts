import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { destinationFor } from '@modules/crm/marketing/waCampaign.recipients';
import { HostModel } from '@modules/venues/host/host.model';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { VenueSlotModel } from '@modules/venues/venueSlot/venueSlot.model';
import type { IPodPartnerRequest } from './podPartnerRequest.model';

export type PartnerSide = 'HOST' | 'VENUE';

interface CategoryTriple {
  super_category_name?: string;
  category_name?: string;
  sub_category_name?: string;
}

/** "Sports · Badminton" — the most specific two names a triple carries. */
export const categoryLabel = (c?: CategoryTriple | null): string =>
  [c?.category_name || c?.super_category_name, c?.sub_category_name].filter(Boolean).join(' · ');

const nameOf = (u: { profile?: { first_name?: string | null; last_name?: string | null } | null } | null | undefined) =>
  `${u?.profile?.first_name ?? ''} ${u?.profile?.last_name ?? ''}`.trim();

/** What a host shows a venue — no phone, no email (contact rule: pod first). */
export interface HostSummary {
  user_id: string;
  name: string;
  photo_url: string;
  categories: string[];
}

/** What a venue shows a host — the place, not how to reach its owner. */
export interface VenueSummary {
  id: string;
  venue_name: string;
  category: string;
  venue_type: string;
  capacity: number;
  locality: string;
  city: string;
  cover_image_url: string;
}

const HOST_USER_FIELDS = 'profile.first_name profile.last_name profile.profile_photo';
const VENUE_FIELDS = 'venue_name venue_category venue_type capacity locality city cover_image_url';

export async function loadHostSummaries(userIds: Types.ObjectId[]): Promise<Map<string, HostSummary>> {
  const [users, hosts] = await Promise.all([
    UserModel.find({ _id: { $in: userIds } }).select(HOST_USER_FIELDS).lean(),
    HostModel.find({ user_id: { $in: userIds } }).select('user_id full_name host_categories').lean(),
  ]);
  const hostByUser = new Map(hosts.map((h) => [String(h.user_id), h]));
  return new Map(
    users.map((u) => {
      const host = hostByUser.get(String(u._id));
      const summary: HostSummary = {
        user_id: String(u._id),
        name: nameOf(u) || host?.full_name || '',
        photo_url: (u as { profile?: { profile_photo?: string } }).profile?.profile_photo ?? '',
        categories: [...new Set((host?.host_categories ?? []).map(categoryLabel).filter(Boolean))],
      };
      return [summary.user_id, summary];
    })
  );
}

export async function loadVenueSummaries(venueIds: Types.ObjectId[]): Promise<Map<string, VenueSummary>> {
  const venues = await VenueModel.find({ _id: { $in: venueIds } }).select(VENUE_FIELDS).lean();
  return new Map(
    venues.map((v) => [
      String(v._id),
      {
        id: String(v._id),
        venue_name: v.venue_name ?? '',
        category: categoryLabel(v.venue_category),
        venue_type: v.venue_type ?? '',
        capacity: v.capacity ?? 0,
        locality: v.locality ?? '',
        city: v.city ?? '',
        cover_image_url: v.cover_image_url ?? '',
      },
    ])
  );
}

/**
 * The counterpart's phone and email — ONLY once the pod exists. Resolved here,
 * behind the status check, so no earlier payload can carry it even if a client
 * asked for the field.
 */
async function contactFor(doc: IPodPartnerRequest, viewer: PartnerSide) {
  if (doc.status !== 'POD_CREATED') return null;
  if (viewer === 'VENUE') {
    const host = await UserModel.findById(doc.host_user_id).select('auth.email auth.phone communication.whatsapp').lean();
    const number = host ? destinationFor(host) : '';
    return { phone: number ? `+${number}` : '', email: host?.auth?.email ?? '' };
  }
  const venue = await VenueModel.findById(doc.venue_id).select('owner_phone owner_email address_line1').lean();
  return { phone: venue?.owner_phone ?? '', email: venue?.owner_email ?? '', address: venue?.address_line1 ?? '' };
}

async function slotOf(doc: IPodPartnerRequest) {
  if (!doc.slot_id) return null;
  const slot = await VenueSlotModel.findById(doc.slot_id).select('start_at end_at whole_day price space_label').lean();
  if (!slot) return null;
  return {
    id: String(slot._id),
    start_at: slot.start_at.toISOString(),
    end_at: slot.end_at.toISOString(),
    whole_day: !!slot.whole_day,
    price: slot.price ?? 0,
    space_label: slot.space_label ?? '',
  };
}

/** Requests as `viewer` sees them: both summaries, the slot, and contact only after the pod. */
export async function toViews(docs: IPodPartnerRequest[], viewer: PartnerSide) {
  const [hosts, venues] = await Promise.all([
    loadHostSummaries([...new Set(docs.map((d) => String(d.host_user_id)))].map((id) => new Types.ObjectId(id))),
    loadVenueSummaries([...new Set(docs.map((d) => String(d.venue_id)))].map((id) => new Types.ObjectId(id))),
  ]);
  return Promise.all(
    docs.map(async (doc) => ({
      id: String(doc._id),
      direction: doc.direction,
      status: doc.status,
      viewer_side: viewer,
      note: doc.note,
      distance_km: doc.distance_km,
      venue: venues.get(String(doc.venue_id)) ?? null,
      host: hosts.get(String(doc.host_user_id)) ?? null,
      slot: await slotOf(doc),
      pod_id: doc.pod_id ? String(doc.pod_id) : null,
      contact: await contactFor(doc, viewer),
      created_at: doc.created_at.toISOString(),
      updated_at: doc.updated_at.toISOString(),
    }))
  );
}
