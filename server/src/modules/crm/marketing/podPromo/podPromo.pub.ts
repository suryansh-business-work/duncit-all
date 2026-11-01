import type { PodPromoDoc } from './podPromo.model';
import { EMPTY_FIGURES, type PromoFigures } from './podPromo.types';

/** A promotion as the API returns it. */
const iso = (value: unknown) => (value instanceof Date ? value.toISOString() : null);
const idOrNull = (value: unknown) => (value ? String(value) : null);

function figures(raw: Partial<PromoFigures> | null | undefined) {
  const merged = { ...EMPTY_FIGURES, ...raw };
  return { ...merged, updated_at: iso(merged.updated_at) };
}

export function pubPromo(doc: PodPromoDoc) {
  const slides = (doc.slides ?? []).map((slide) => ({ kind: slide.kind, url: slide.url }));
  return {
    id: String(doc._id),
    pod_id: String(doc.pod_id),
    pod_title: doc.pod_title,
    pod_start: iso(doc.pod_start) ?? '',
    club_id: doc.club_id || null,
    club_name: doc.club_name,
    city_id: doc.city_id || null,
    city_name: doc.city_name,
    pod_url: doc.pod_url,
    status: doc.status,
    source: doc.source,
    banner_url: slides[0]?.url ?? '',
    banner_style: doc.banner_style,
    style: doc.style,
    slides,
    collaborators: doc.collaborators ?? [],
    caption: doc.caption,
    hashtags: doc.hashtags ?? [],
    ai_caption: !!doc.ai_caption,
    short_link_id: idOrNull(doc.short_link_id),
    short_code: doc.short_code,
    tracking_url: doc.tracking_url,
    utm_campaign: doc.utm_campaign,
    scheduled_post_id: idOrNull(doc.scheduled_post_id),
    post_status: doc.post_status,
    permalink: doc.permalink,
    scheduled_at: iso(doc.scheduled_at),
    published_at: iso(doc.published_at),
    error: doc.error,
    run_id: doc.run_id,
    figures: figures(doc.figures),
    created_at: iso(doc.created_at),
    updated_at: iso(doc.updated_at),
  };
}
