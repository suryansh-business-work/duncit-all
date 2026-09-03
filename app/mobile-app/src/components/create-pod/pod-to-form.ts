import { format } from 'date-fns';

import { normalizePodType } from './create-pod.form';
import { blankCreatePodForm, type CreatePodFormValues } from './create-pod.types';

/** The fields of a stored pod the editor rehydrates from — `clubAdminPodForEdit`
 * answers exactly these. */
export interface EditablePod {
  pod_title: string;
  pod_description: string;
  pod_images_and_videos: readonly { url: string }[];
  reel_url?: string | null;
  club_id: string;
  venue_id?: string | null;
  venue_slot_id?: string | null;
  location_id?: string | null;
  zone_name?: string | null;
  pod_mode: string;
  meeting_platform?: string | null;
  meeting_url?: string | null;
  meeting_notes?: string | null;
  pod_hashtag: readonly string[];
  pod_date_time: string;
  pod_end_date_time?: string | null;
  pod_type: string;
  pod_amount: number;
  no_of_spots: number;
  pod_info?: string | null;
  what_this_pod_offers: readonly string[];
  available_perks: readonly string[];
  payment_terms?: string | null;
  place_charges: readonly { label: string; amount: number; note?: string | null }[];
  product_requests: readonly { product_id: string; quantity: number }[];
}

/**
 * Rebuilds the stepper's values from a stored pod — the edit-route twin of
 * `hydrateDraft`, which rebuilds them from a draft payload.
 *
 * Dates are written in the admin's input pattern, the shape the schedule boxes
 * are typed in and `parseDateTimeText` reads back (rule 11); a slot the pod
 * already holds is kept as its id, since a booked slot is no longer offered
 * by `venueAvailableSlots` and only a NEW pick re-routes it.
 */
export function podToCreatePodForm(
  pod: EditablePod,
  dateTimeInputFormat: string,
): CreatePodFormValues {
  const virtual = pod.pod_mode === 'VIRTUAL';
  const mode = virtual ? 'VIRTUAL' : 'PHYSICAL';
  const toText = (iso?: string | null) =>
    iso ? format(new Date(iso), dateTimeInputFormat) : '';
  return {
    ...blankCreatePodForm,
    location_id: pod.location_id ?? '',
    locality: pod.zone_name ?? '',
    pod_title: pod.pod_title,
    club_id: pod.club_id,
    pod_mode: mode,
    venue_id: virtual ? '' : (pod.venue_id ?? ''),
    venue_slot_id: virtual ? '' : (pod.venue_slot_id ?? ''),
    meeting_platform: pod.meeting_platform ?? '',
    meeting_url: pod.meeting_url ?? '',
    meeting_notes: pod.meeting_notes ?? '',
    pod_description: pod.pod_description,
    pod_info: pod.pod_info ?? '',
    pod_date_time_text: toText(pod.pod_date_time),
    pod_end_date_time_text: toText(pod.pod_end_date_time),
    pod_type: normalizePodType(pod.pod_type, mode),
    pod_amount_text: String(pod.pod_amount ?? 0),
    no_of_spots_text: String(pod.no_of_spots ?? 0),
    pod_hashtag_text: pod.pod_hashtag.join(' '),
    media_text: pod.pod_images_and_videos.map((media) => media.url).join('\n'),
    reel_url: pod.reel_url ?? '',
    what_this_pod_offers: [...pod.what_this_pod_offers],
    available_perks: [...pod.available_perks],
    products_enabled: pod.product_requests.length > 0,
    product_requests: pod.product_requests.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
    })),
    place_charges: pod.place_charges.map((charge) => ({
      label: charge.label,
      amount: charge.amount,
      note: charge.note ?? '',
    })),
    payment_terms: pod.payment_terms ?? '',
  };
}
