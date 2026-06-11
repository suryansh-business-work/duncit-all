import { blankForm, linesToMedia, type PodForm } from './queries';

export { blankForm };

export function buildEditValues(p: any): PodForm {
  return {
    id: p.id,
    pod_id: p.pod_id,
    pod_title: p.pod_title,
    pod_hosts_id: p.pod_hosts_id ?? [],
    location_id: p.location_id ?? '',
    venue_id: p.venue_id ?? '',
    club_id: p.club_id ?? '',
    zone_name: p.zone_name ?? '',
    pod_mode: p.pod_mode ?? 'PHYSICAL',
    meeting_platform: p.meeting_platform ?? '',
    meeting_url: p.meeting_url ?? '',
    meeting_notes: p.meeting_notes ?? '',
    pod_hashtag_text: (p.pod_hashtag ?? []).join(' '),
    media_text: (p.pod_images_and_videos ?? []).map((m: any) => m.url).join('\n'),
    pod_description: p.pod_description ?? '',
    pod_date_time: p.pod_date_time ?? '',
    pod_end_date_time: p.pod_end_date_time ?? '',
    pod_type: p.pod_type,
    pod_amount: p.pod_amount ?? 0,
    pod_occurrence: p.pod_occurrence ?? 'ONE_TIME',
    no_of_spots: p.no_of_spots ?? 0,
    pod_info: p.pod_info ?? '',
    what_this_pod_offers: p.what_this_pod_offers ?? [],
    available_perks: p.available_perks ?? [],
    payment_terms: p.payment_terms ?? '',
    place_charges: (p.place_charges ?? []).map((c: any) => ({
      label: c.label ?? '',
      amount: c.amount ?? 0,
      note: c.note ?? '',
    })),
    products_enabled: p.pod_mode === 'VIRTUAL' ? false : !!p.products_enabled,
    product_requests: p.pod_mode === 'VIRTUAL'
      ? []
      : (p.product_requests ?? []).map((item: any) => ({
          product_id: item.product_id ?? '',
          quantity: item.quantity ?? 1,
        })),
    is_active: !!p.is_active,
  };
}

export function buildPayload(form: PodForm) {
  const isVirtual = form.pod_mode === 'VIRTUAL';
  const tags = form.pod_hashtag_text
    .split(/[\s,]+/)
    .map((s) => s.replace(/^#/, '').trim())
    .filter(Boolean);

  return {
    pod_title: form.pod_title.trim(),
    pod_hosts_id: form.pod_hosts_id,
    venue_id: isVirtual ? null : form.venue_id,
    location_id: isVirtual ? null : form.location_id || null,
    club_id: form.club_id,
    pod_mode: form.pod_mode,
    meeting_platform: isVirtual ? form.meeting_platform.trim() || null : null,
    meeting_url: isVirtual ? form.meeting_url.trim() : null,
    meeting_notes: isVirtual ? form.meeting_notes.trim() || null : null,
    zone_name: null,
    pod_hashtag: tags,
    pod_images_and_videos: linesToMedia(form.media_text),
    pod_description: form.pod_description,
    pod_date_time: new Date(form.pod_date_time).toISOString(),
    pod_end_date_time: form.pod_end_date_time
      ? new Date(form.pod_end_date_time).toISOString()
      : null,
    pod_type: form.pod_type,
    pod_amount: Number(form.pod_amount) || 0,
    pod_occurrence: form.pod_occurrence,
    no_of_spots: Number(form.no_of_spots) || 0,
    pod_info: form.pod_info,
    what_this_pod_offers: form.what_this_pod_offers,
    available_perks: form.available_perks,
    payment_terms: form.payment_terms || null,
    place_charges: isVirtual
      ? []
      : form.place_charges.map((c) => ({
          label: c.label.trim(),
          amount: Number(c.amount) || 0,
          note: c.note?.trim() || null,
        })),
    products_enabled: !isVirtual && form.products_enabled,
    product_requests: !isVirtual && form.products_enabled
      ? form.product_requests
          .map((item) => ({ product_id: item.product_id, quantity: Number(item.quantity) || 0 }))
          .filter((item) => item.product_id && item.quantity > 0)
      : [],
  };
}
