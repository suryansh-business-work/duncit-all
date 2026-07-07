import { blankPodFormValues, type PodFormConfig, type PodFormValues, type PodProductRequest } from './types';

/** Split newline text into trimmed non-empty lines. */
const lines = (text: string) =>
  text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

/** Newline-separated URLs → GraphQL PodMediaInput list (image/video by extension). */
export const linesToMedia = (text: string) =>
  lines(text).map((url) => ({ url, type: /\.(mp4|mov|webm)$/i.test(url) ? 'VIDEO' : 'IMAGE' }));

/** Sum the cost of the selected product requests against the product catalogue. */
export function getProductRequestTotal(requests: PodProductRequest[], products: any[]) {
  const byId = new Map(products.map((product) => [product.id, product]));
  return requests.reduce((sum, item) => {
    const product = byId.get(item.product_id);
    return sum + (product?.unit_cost ?? 0) * (Number(item.quantity) || 0);
  }, 0);
}

export interface BuildPodInputOptions {
  draft?: boolean;
  config: PodFormConfig;
}

/**
 * Merged (superset) GraphQL input builder. Nulls out mode-disabled and
 * feature-disabled fields exactly the way each portal expects, converts dates
 * to ISO and text fields to their GraphQL array shapes. `venue_slot_id` is only
 * included when `config.showVenueSlot` (CreatePodInput has it; UpdatePodInput
 * does not — callers that update strip it anyway).
 */
export function buildPodInput(values: PodFormValues, { draft, config }: BuildPodInputOptions) {
  const isVirtual = values.pod_mode === 'VIRTUAL';
  const isPhysical = !isVirtual;
  const tags = values.pod_hashtag_text
    .split(/[\s,]+/)
    .map((s) => s.replace(/^#/, '').trim())
    .filter(Boolean);
  const productsOn = isPhysical && config.showProducts && values.products_enabled;

  const input: Record<string, unknown> = {
    pod_title: values.pod_title.trim(),
    club_id: values.club_id,
    pod_mode: values.pod_mode,
    venue_id: isPhysical ? values.venue_id : null,
    location_id: isPhysical ? values.location_id || null : null,
    zone_name: null,
    meeting_platform: isVirtual ? values.meeting_platform.trim() || null : null,
    meeting_url: isVirtual ? values.meeting_url.trim() : null,
    meeting_notes: isVirtual ? values.meeting_notes.trim() || null : null,
    pod_hosts_id: config.showHosts ? values.pod_hosts_id : [],
    pod_description: values.pod_description,
    pod_date_time: values.pod_date_time ? values.pod_date_time.toISOString() : undefined,
    pod_end_date_time: values.pod_end_date_time ? values.pod_end_date_time.toISOString() : null,
    pod_type: values.pod_type,
    pod_amount: Number(values.pod_amount) || 0,
    pod_occurrence: values.pod_occurrence,
    no_of_spots: Number(values.no_of_spots) || 0,
    pod_info: values.pod_info,
    pod_hashtag: tags,
    pod_images_and_videos: linesToMedia(values.media_text),
    payment_terms: values.payment_terms || null,
    what_this_pod_offers: values.what_this_pod_offers,
    available_perks: values.available_perks,
    place_charges:
      isPhysical && config.showPlaceCharges
        ? values.place_charges.map((c) => ({
            label: c.label.trim(),
            amount: Number(c.amount) || 0,
            note: c.note?.trim() || null,
          }))
        : [],
    products_enabled: productsOn,
    product_requests: productsOn
      ? values.product_requests
          .map((item) => ({ product_id: item.product_id, quantity: Number(item.quantity) || 0 }))
          .filter((item) => item.product_id && item.quantity > 0)
      : [],
    is_active: !draft,
  };

  if (config.showVenueSlot) {
    input.venue_slot_id = isPhysical ? values.venue_slot_id || null : null;
  }

  return input;
}

/** Build RHF form values from an existing pod so the form can prefill for edit. */
export function podToFormValues(pod: any): PodFormValues {
  const isVirtual = pod.pod_mode === 'VIRTUAL';
  return {
    ...blankPodFormValues,
    pod_id: pod.pod_id ?? '',
    pod_title: pod.pod_title ?? '',
    club_id: pod.club_id ?? '',
    pod_mode: isVirtual ? 'VIRTUAL' : 'PHYSICAL',
    venue_id: pod.venue_id ?? '',
    venue_slot_id: pod.venue_slot_id ?? '',
    location_id: pod.location_id ?? '',
    zone_name: pod.zone_name ?? '',
    meeting_platform: pod.meeting_platform ?? '',
    meeting_url: pod.meeting_url ?? '',
    meeting_notes: pod.meeting_notes ?? '',
    pod_hosts_id: pod.pod_hosts_id ?? [],
    pod_description: pod.pod_description ?? '',
    pod_date_time: pod.pod_date_time ? new Date(pod.pod_date_time) : null,
    pod_end_date_time: pod.pod_end_date_time ? new Date(pod.pod_end_date_time) : null,
    pod_type: pod.pod_type ?? 'NATIVE_FREE',
    pod_amount: Number(pod.pod_amount ?? 0),
    pod_occurrence: pod.pod_occurrence ?? 'ONE_TIME',
    no_of_spots: Number(pod.no_of_spots ?? 0),
    pod_info: pod.pod_info ?? '',
    pod_hashtag_text: (pod.pod_hashtag ?? []).join(' '),
    media_text: (pod.pod_images_and_videos ?? []).map((m: any) => m.url).join('\n'),
    payment_terms: pod.payment_terms ?? '',
    what_this_pod_offers: pod.what_this_pod_offers ?? [],
    available_perks: pod.available_perks ?? [],
    place_charges: (pod.place_charges ?? []).map((c: any) => ({
      label: c.label ?? '',
      amount: c.amount ?? 0,
      note: c.note ?? '',
    })),
    products_enabled: isVirtual ? false : !!pod.products_enabled,
    product_requests: isVirtual
      ? []
      : (pod.product_requests ?? []).map((item: any) => ({
          product_id: item.product_id ?? '',
          quantity: Number(item.quantity ?? 1),
        })),
    is_active: pod.is_active ?? true,
  };
}
