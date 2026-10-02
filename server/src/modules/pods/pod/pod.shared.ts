/**
 * Pod helpers every `podService` area reads: the public pod shape (`toPub`),
 * club-slug lookup and notification links, the not-found error, the date
 * labels and the notification audience. `podService` is composed in pod.service.ts.
 */
import { GraphQLError } from 'graphql';
import { podSeatsAvailable, podSeatsTaken } from './pod.seats';
import { UserModel } from '@modules/access/user/user.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { appDate, appDateTime, appTime } from '@utils/app-time';

export async function loadClubSlugMap(podDocs: any[]): Promise<Map<string, string>> {
  const ids = Array.from(
    new Set(podDocs.map((p) => p?.club_id && String(p.club_id)).filter(Boolean))
  );
  if (ids.length === 0) return new Map();
  const clubs = await ClubModel.find({ _id: { $in: ids } }, { club_id: 1 });
  return new Map(clubs.map((c: any) => [String(c._id), c.club_id]));
}

/** The host who owns a pod — the repo-wide convention is the first entry. */
export const podOwnerId = (d: any): string => String((d?.pod_hosts_id ?? [])[0] ?? '');

/**
 * Where a pod notification should land. Both surfaces route a pod by
 * club-slug + pod-slug, so a pod whose club could not be resolved gets no link
 * rather than a broken `/club//pod/x`.
 */
export function podNotificationLink(d: any, clubSlugById: Map<string, string>): string | null {
  const clubSlug = d?.club_id ? clubSlugById.get(String(d.club_id)) : null;
  if (!clubSlug || !d?.pod_id) return null;
  return `/club/${clubSlug}/pod/${d.pod_id}`;
}

export const toPub = (d: any, clubSlugById?: Map<string, string>) => {
  if (!d) return null;
  const clubId = d.club_id ? String(d.club_id) : null;
  const clubSlug = clubId ? clubSlugById?.get(clubId) ?? '' : '';
  return {
    id: String(d._id),
    pod_id: d.pod_id,
    pod_title: d.pod_title,
    pod_hosts_id: (d.pod_hosts_id ?? []).map(String),
    co_hosts: (d.co_hosts ?? []).map((c: any) => ({
      user_id: String(c.user_id),
      status: c.status ?? 'PENDING',
      invited_at: c.invited_at?.toISOString?.() ?? '',
      responded_at: c.responded_at?.toISOString?.() ?? null,
    })),
    location_id: d.location_id ? String(d.location_id) : null,
    venue_id: d.venue_id ? String(d.venue_id) : null,
    venue_slot_id: d.venue_slot_id ? String(d.venue_slot_id) : null,
    club_id: clubId,
    club_slug: clubSlug,
    zone_name: d.zone_name ?? null,
    pod_mode: d.pod_mode ?? 'PHYSICAL',
    meeting_platform: d.pod_mode === 'VIRTUAL' ? d.meeting_platform ?? null : null,
    meeting_url: d.pod_mode === 'VIRTUAL' ? d.meeting_url ?? null : null,
    meeting_notes: d.pod_mode === 'VIRTUAL' ? d.meeting_notes ?? null : null,
    pod_hashtag: d.pod_hashtag ?? [],
    pod_images_and_videos: (d.pod_images_and_videos ?? []).map((m: any) => ({
      url: m.url,
      type: m.type ?? 'IMAGE',
    })),
    reel_url: d.reel_url ?? null,
    // Carried raw for the `Pod.reel_has_audio` field resolver, which probes a
    // reel this stored answer does not cover yet.
    reel_audio: d.reel_audio ?? null,
    pod_hits: d.pod_hits ?? 0,
    pod_attendees: (d.pod_attendees ?? []).map(String),
    seats_taken: podSeatsTaken(d),
    seats_available: podSeatsAvailable(d),
    pod_description: d.pod_description ?? '',
    pod_date_time: d.pod_date_time?.toISOString?.() ?? null,
    pod_end_date_time: d.pod_end_date_time?.toISOString?.() ?? null,
    pod_type: d.pod_type,
    pod_amount: d.pod_amount ?? 0,
    pod_occurrence: d.pod_occurrence ?? 'ONE_TIME',
    no_of_spots: d.no_of_spots ?? 0,
    pod_info: d.pod_info ?? '',
    what_this_pod_offers: d.what_this_pod_offers ?? [],
    available_perks: d.available_perks ?? [],
    payment_terms: d.payment_terms ?? null,
    place_charges: (d.place_charges ?? []).map((c: any) => ({
      label: c.label,
      amount: c.amount ?? 0,
      note: c.note ?? null,
    })),
    products_enabled: !!d.products_enabled,
    product_requests: (d.product_requests ?? []).map((item: any) => ({
      product_id: String(item.product_id),
      product_name: item.product_name,
      image_url: item.image_url ?? '',
      images: Array.isArray(item.images) ? item.images : [],
      unit_cost: item.unit_cost ?? 0,
      quantity: item.quantity ?? 0,
      // Units still buyable from this pod — sales decrement it (sold_count).
      available_count: Math.max(0, (item.quantity ?? 0) - (item.sold_count ?? 0)),
      total_cost: item.total_cost ?? 0,
    })),
    product_cost_total: d.product_cost_total ?? 0,
    ticket_discount_enabled: !!d.ticket_discount_enabled,
    ticket_discount_tiers: (d.ticket_discount_tiers ?? []).map((tier: any) => ({
      min_tickets: tier.min_tickets,
      discount_pct: tier.discount_pct,
    })),
    is_active: !!d.is_active,
    is_deleted: !!d.deleted_at,
    deleted_at: d.deleted_at?.toISOString?.() ?? null,
    venue_approval_status: d.venue_approval_status ?? 'NONE',
    auto_pod_id: d.source_auto_pod_id ? String(d.source_auto_pod_id) : null,
    // Carried raw for the admin-gated `Pod.cancellation_risk` field resolver,
    // which is what decides whether a viewer may read it.
    cancellation_risk: d.cancellation_risk ?? null,
    liked_user_ids: (d.liked_user_ids ?? []).map(String),
    like_count: (d.liked_user_ids ?? []).length,
    comment_count: (d.comments ?? []).length,
    completed_at: d.completed_at?.toISOString?.() ?? null,
    created_at: d.created_at?.toISOString?.() ?? '',
    updated_at: d.updated_at?.toISOString?.() ?? '',
  };
};

/** Shared helpers so co-located features (e.g. search) can return pods in the
 * same public shape the `Pod` field resolvers expect. */
export const mapPodToPublic = (doc: any, clubSlugById?: Map<string, string>) =>
  toPub(doc, clubSlugById);

export const loadPodClubSlugMap = (podDocs: any[]) => loadClubSlugMap(podDocs);

export function notFound(): never {
  throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
}

export const podWhenLabel = (doc: any) => appDateTime(doc.pod_date_time) || '—';

// WhatsApp templates print the date and the time as two separate placeholders,
// so the combined label above cannot serve them.
export const podDateLabel = (doc: any) => appDate(doc.pod_date_time);

export const podTimeLabel = (doc: any) => appTime(doc.pod_date_time);

/** Attendee users (excluding the acting host) with an email on file. */
export async function podAudience(doc: any, excludeUserId: string) {
  const ids = (doc.pod_attendees ?? [])
    .map(String)
    .filter((id: string) => id !== excludeUserId);
  if (ids.length === 0) return [];
  // The phone fields are selected because this audience now also feeds WhatsApp,
  // and `destinationFor` reads them off the document — without them it returns
  // '' for every attendee and the whole fan-out silently skips.
  const users = await UserModel.find({ _id: { $in: ids } })
    .select('profile.first_name profile.last_name auth.email auth.phone communication.whatsapp')
    .lean();
  return users
    .map((u: any) => ({
      user_id: String(u._id),
      email: u.auth?.email ?? '',
      name: `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim() || 'there',
      /** The raw document, for `destinationFor`. */
      user: u,
    }));
  // Attendees with no address are NOT filtered out. This audience is only ever
  // used to email, and dropping them here meant a cancelled pod left no trace
  // that someone was never told. The send records a FAILED row naming the
  // template instead, which is the answer to "why didn't they hear from us?".
}
