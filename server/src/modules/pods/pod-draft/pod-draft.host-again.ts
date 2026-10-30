import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PodModel, type IPod } from '../pod/pod.model';
import {
  clubBookable,
  hostCategoryKeyFor,
  loadHostAgainSource,
  sourceLocality,
  sourceLocationId,
  venueBookable,
  type HostAgainNotice,
  type HostAgainSource,
} from './pod-draft.host-again-source';

/**
 * "Host again": the Create Pod form filled with an earlier pod's CONTENT and
 * PLACE, so a host can run the same pod again by picking only a new date.
 *
 * Everything that belonged to that one run stays behind — its date and time,
 * its venue slot, its attendees, the venue's decision and the organizer terms
 * the host must accept again.
 *
 * The payload is the stepper's own form state, which mWeb and the app shape
 * slightly differently: mWeb keeps price and spots as numbers, the app as typed
 * text. Both are written so whichever surface opens it finds its own field; the
 * other is ignored by its hydrate, which spreads the payload over a blank form.
 */

/** Create Pod's step indexes (both surfaces): category/place, basics, venue & date, pricing. */
const PLACE_STEP = 0;
const DATE_STEP = 2;

const forbidden = () =>
  new GraphQLError('Only the pod host can host this pod again', {
    extensions: { code: 'FORBIDDEN' },
  });

/** The pod the caller hosted — a cancelled one too, since running a pod again
 * is exactly what a host whose pod was called off may want. */
async function hostedPod(podDocId: string, userId: string): Promise<IPod> {
  if (!Types.ObjectId.isValid(podDocId)) {
    throw new GraphQLError('Invalid pod id', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const pod = await PodModel.findById(podDocId).setOptions({ includeDeleted: true }).lean<IPod>();
  if (!pod) {
    throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
  }
  const isHost = (pod.pod_hosts_id ?? []).some((hostId) => String(hostId) === userId);
  if (!isHost) throw forbidden();
  return pod;
}

/** The pod's place: city, area, category, club and venue. A club or venue that
 * can no longer take a pod is left blank (and reported), so the stepper never
 * opens on a choice it would refuse at publish. */
function placeFields(pod: IPod, source: HostAgainSource) {
  const physical = pod.pod_mode !== 'VIRTUAL';
  const clubOk = clubBookable(source.club);
  const venueOk = physical && venueBookable(source.venue);
  return {
    location_id: sourceLocationId(pod, source),
    locality: physical ? sourceLocality(pod, source, clubOk) : '',
    host_category_key: hostCategoryKeyFor(source.club, source.hostCategories),
    club_id: clubOk ? String(pod.club_id) : '',
    pod_mode: physical ? 'PHYSICAL' : 'VIRTUAL',
    venue_id: venueOk && pod.venue_id ? String(pod.venue_id) : '',
  };
}

/** Pod Shop items still on sale; a delisted or sold-out one is dropped. */
function liveProductRequests(pod: IPod, source: HostAgainSource) {
  return (pod.product_requests ?? [])
    .filter((item) => source.liveProductIds.has(String(item.product_id)))
    .map((item) => ({ product_id: String(item.product_id), quantity: item.quantity }));
}

export function buildHostAgainPayload(pod: IPod, source: HostAgainSource) {
  const place = placeFields(pod, source);
  const physical = place.pod_mode === 'PHYSICAL';
  const free = pod.pod_type === 'FREE';
  const amount = free ? 0 : (pod.pod_amount ?? 0);
  const spots = pod.no_of_spots ?? 0;
  const productRequests = liveProductRequests(pod, source);
  return {
    ...place,
    pod_title: pod.pod_title ?? '',
    meeting_platform: physical ? '' : (pod.meeting_platform ?? ''),
    meeting_url: physical ? '' : (pod.meeting_url ?? ''),
    meeting_notes: physical ? '' : (pod.meeting_notes ?? ''),
    pod_description: pod.pod_description ?? '',
    pod_info: pod.pod_info ?? '',
    pod_type: free ? 'FREE' : 'PAID',
    pod_amount: amount,
    pod_amount_text: String(amount),
    no_of_spots: spots,
    no_of_spots_text: String(spots),
    pod_hashtag_text: (pod.pod_hashtag ?? []).join(' '),
    media_text: (pod.pod_images_and_videos ?? []).map((media) => media.url).join('\n'),
    reel_url: pod.reel_url ?? '',
    what_this_pod_offers: [...(pod.what_this_pod_offers ?? [])],
    available_perks: [...(pod.available_perks ?? [])],
    products_enabled: productRequests.length > 0,
    product_requests: productRequests,
    place_charges: (pod.place_charges ?? []).map((charge) => ({
      label: charge.label,
      amount: charge.amount,
      note: charge.note ?? '',
    })),
    ticket_discount_enabled: !free && !!pod.ticket_discount_enabled,
    ticket_discount_tiers: (pod.ticket_discount_tiers ?? []).map((tier) => ({
      min_tickets: tier.min_tickets,
      discount_pct: tier.discount_pct,
    })),
    // Text, like the amounts above: the forms hold the percentage as typed. It
    // is re-checked against Loyalty's current maximum when the copy is published.
    smart_incentive_enabled: !free && !!pod.smart_incentive_enabled,
    smart_incentive_pct: !free && pod.smart_incentive_enabled ? String(pod.smart_incentive_pct ?? '') : '',
    payment_terms: pod.payment_terms ?? '',
  };
}

type HostAgainPayload = ReturnType<typeof buildHostAgainPayload>;

/** What the copy had to leave out, for the stepper to say so. */
export function hostAgainNotices(pod: IPod, source: HostAgainSource, payload: HostAgainPayload): HostAgainNotice[] {
  const notices: HostAgainNotice[] = [];
  if (!payload.location_id) notices.push('LOCATION_MISSING');
  if (!payload.host_category_key) notices.push('CATEGORY_MISSING');
  if (pod.club_id && !payload.club_id) notices.push('CLUB_UNAVAILABLE');
  if (payload.pod_mode === 'PHYSICAL' && pod.venue_id && !payload.venue_id) notices.push('VENUE_UNAVAILABLE');
  if (payload.product_requests.length < (pod.product_requests ?? []).length) notices.push('PRODUCTS_UNAVAILABLE');
  return notices;
}

/** With the category, city, area and club all carried over, the host opens on
 * the date step; anything missing opens step 1, where it is asked for. A city
 * with areas needs one picked, which only the client knows — a blank area
 * there is caught by step 1's own gate when the host goes back. */
export const hostAgainStep = (payload: HostAgainPayload) =>
  payload.location_id && payload.host_category_key && payload.club_id ? DATE_STEP : PLACE_STEP;

async function copyOf(podDocId: string, userId: string) {
  const pod = await hostedPod(podDocId, userId);
  const source = await loadHostAgainSource(pod, userId);
  return { pod, source, payload: buildHostAgainPayload(pod, source) };
}

/** The filled form for one of the caller's own pods — nothing is saved. */
export async function hostAgainPrefill(podDocId: string, userId: string) {
  const { pod, source, payload } = await copyOf(podDocId, userId);
  return {
    source_pod_id: String(pod._id),
    source_title: payload.pod_title.trim(),
    payload: JSON.stringify(payload),
    step: hostAgainStep(payload),
    notices: hostAgainNotices(pod, source, payload),
  };
}

/** The draft fields `podDraftService.save` stores for a Host Again copy — kept
 * for app builds that still create the draft on the menu tap. */
export async function hostAgainDraftInput(podDocId: string, userId: string) {
  const { payload } = await copyOf(podDocId, userId);
  return {
    payload: JSON.stringify(payload),
    pod_title: payload.pod_title.trim(),
    pod_mode: payload.pod_mode,
    step: hostAgainStep(payload),
  };
}
