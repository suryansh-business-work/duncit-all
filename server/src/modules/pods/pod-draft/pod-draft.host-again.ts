import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { PodModel, type IPod } from '../pod/pod.model';
import { VenueModel } from '../../venues/venue/venue.model';
import { ClubModel } from '../../clubs/club/club.model';

/**
 * "Host again": a fresh draft carrying an earlier pod's CONTENT, so a host can
 * run the same pod again without retyping it.
 *
 * Only what describes the pod travels. Everything that belonged to that one
 * run stays behind — its date and time, its venue slot, its attendees, the
 * venue's decision and the organizer terms the host must accept again.
 *
 * The draft payload is the stepper's own form state, which mWeb and the app
 * shape slightly differently: mWeb keeps price and spots as numbers, the app as
 * typed text. Both are written so whichever surface opens the draft finds its
 * own field; the other is ignored by its hydrate, which spreads the payload over
 * a blank form.
 */

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

/** The venue and club are kept only while they can still take a new pod, so
 * the stepper never opens on a choice it would refuse at publish. */
async function stillBookable(pod: IPod) {
  const [venueOk, clubOk] = await Promise.all([
    pod.venue_id
      ? VenueModel.exists({ _id: pod.venue_id, status: 'APPROVED', is_active: true })
      : null,
    ClubModel.exists({ _id: pod.club_id, is_active: true }),
  ]);
  return { venueOk: !!venueOk, clubOk: !!clubOk };
}

export async function buildHostAgainPayload(pod: IPod) {
  const { venueOk, clubOk } = await stillBookable(pod);
  const physical = pod.pod_mode !== 'VIRTUAL';
  const free = pod.pod_type === 'FREE';
  const amount = free ? 0 : (pod.pod_amount ?? 0);
  const spots = pod.no_of_spots ?? 0;
  return {
    location_id: pod.location_id ? String(pod.location_id) : '',
    locality: pod.zone_name ?? '',
    pod_title: pod.pod_title ?? '',
    club_id: clubOk ? String(pod.club_id) : '',
    pod_mode: physical ? 'PHYSICAL' : 'VIRTUAL',
    venue_id: physical && venueOk && pod.venue_id ? String(pod.venue_id) : '',
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
    products_enabled: (pod.product_requests ?? []).length > 0,
    product_requests: (pod.product_requests ?? []).map((item) => ({
      product_id: String(item.product_id),
      quantity: item.quantity,
    })),
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
    payment_terms: pod.payment_terms ?? '',
  };
}

/** The draft fields `podDraftService.save` stores for a Host Again copy. */
export async function hostAgainDraftInput(podDocId: string, userId: string) {
  const pod = await hostedPod(podDocId, userId);
  const payload = await buildHostAgainPayload(pod);
  return {
    payload: JSON.stringify(payload),
    pod_title: payload.pod_title.trim(),
    pod_mode: payload.pod_mode,
    step: 0,
  };
}
