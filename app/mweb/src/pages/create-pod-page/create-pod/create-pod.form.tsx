import { z } from 'zod';
import { blankCreatePodForm, type CreatePodFormValues } from './create-pod.types';

const splitLines = (text: string) =>
  text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

const VIDEO_URL_RE = /\.(mp4|mov|webm)$/i;

/** True when the media list carries at least one image URL (server mirrors this). */
export const hasImageLine = (mediaText: string) =>
  splitLines(mediaText).some((url) => !VIDEO_URL_RE.test(url));

/** Zod schema for the host Create Pod stepper — mirrors the server's
 * createPartnerPod rules (venue for physical, link for virtual, paid amounts). */
export const createPodSchema = z
  .object({
    location_id: z.string().min(1, 'Select a location'),
    pod_title: z.string().trim().min(3, 'Title is too short').max(120, 'Title is too long'),
    club_id: z.string().min(1, 'Select a club'),
    pod_mode: z.enum(['PHYSICAL', 'VIRTUAL']),
    venue_id: z.string(),
    venue_slot_id: z.string(),
    meeting_platform: z.string().trim().max(80),
    meeting_url: z.string().trim(),
    meeting_notes: z.string().trim().max(1000),
    pod_description: z.string().trim().min(10, 'Add a longer description'),
    pod_info: z.string().max(2000),
    pod_date_time: z.date({ invalid_type_error: 'Start date/time required' }),
    pod_end_date_time: z.date().nullable(),
    pod_type: z.string().min(1, 'Select a pod type'),
    pod_amount: z.number({ invalid_type_error: 'Amount must be a number' }).min(0).max(1999),
    pod_occurrence: z.string().min(1),
    no_of_spots: z.number({ invalid_type_error: 'Spots must be a number' }).min(0).max(10000),
    pod_hashtag_text: z.string().max(500),
    media_text: z.string(),
    what_this_pod_offers: z.array(z.string().trim().min(1).max(40)).max(20),
    available_perks: z.array(z.string().trim().min(1).max(40)).max(20),
    products_enabled: z.boolean(),
    product_requests: z
      .array(
        z.object({
          product_id: z.string().min(1, 'Select a product'),
          quantity: z.number({ invalid_type_error: 'Quantity required' }).min(1).max(10000),
        })
      )
      .max(20),
    place_charges: z
      .array(
        z.object({
          label: z.string().trim().min(1, 'Label required').max(80),
          amount: z.number({ invalid_type_error: 'Amount must be a number' }).min(0).max(100000),
          note: z.string().trim().max(200),
        })
      )
      .max(10),
    payment_terms: z.string().max(4000),
  })
  .superRefine((values, ctx) => {
    if (values.pod_mode === 'PHYSICAL' && !values.venue_id) {
      ctx.addIssue({ code: 'custom', path: ['venue_id'], message: 'Select a venue' });
    }
    if (values.pod_mode === 'PHYSICAL' && !values.venue_slot_id) {
      ctx.addIssue({ code: 'custom', path: ['venue_slot_id'], message: 'Pick an available slot from the venue calendar' });
    }
    if (values.pod_mode === 'VIRTUAL') {
      if (!values.meeting_url) {
        ctx.addIssue({ code: 'custom', path: ['meeting_url'], message: 'Meeting link is required' });
      } else if (!/^https?:\/\/\S+$/.test(values.meeting_url)) {
        ctx.addIssue({ code: 'custom', path: ['meeting_url'], message: 'Meeting link must be valid' });
      }
    }
    if (values.pod_date_time.getTime() <= Date.now()) {
      ctx.addIssue({ code: 'custom', path: ['pod_date_time'], message: 'Start date/time must be in the future' });
    }
    if (values.pod_end_date_time && values.pod_end_date_time <= values.pod_date_time) {
      ctx.addIssue({ code: 'custom', path: ['pod_end_date_time'], message: 'End must be after start' });
    }
    if (values.pod_type.includes('FREE') && values.pod_amount !== 0) {
      ctx.addIssue({ code: 'custom', path: ['pod_amount'], message: 'Free pods must have amount 0' });
    }
    if (values.products_enabled && values.product_requests.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['product_requests'], message: 'Add at least one product' });
    }
    if (!hasImageLine(values.media_text)) {
      ctx.addIssue({ code: 'custom', path: ['media_text'], message: 'Add at least one image URL' });
    }
  });

/** Fields validated when leaving each stepper step (index aligned with STEPS). */
export const STEP_FIELDS: (keyof CreatePodFormValues)[][] = [
  ['pod_title', 'pod_description', 'media_text', 'pod_hashtag_text', 'pod_info', 'what_this_pod_offers', 'available_perks'],
  ['location_id', 'pod_mode', 'club_id'],
  ['venue_id', 'venue_slot_id', 'meeting_platform', 'meeting_url', 'meeting_notes', 'pod_date_time', 'pod_end_date_time'],
  ['pod_type', 'pod_occurrence', 'pod_amount', 'no_of_spots', 'place_charges', 'payment_terms', 'products_enabled', 'product_requests'],
];

export const STEP_TITLES = [
  'Pod Basics',
  'Location, Category & Club',
  'Venue & Slot',
  'Pricing & Publish',
];

/** Maps the validated form values onto the server's CreatePodInput. */
export function buildCreatePodInput(values: CreatePodFormValues) {
  const virtual = values.pod_mode === 'VIRTUAL';
  return {
    pod_title: values.pod_title.trim(),
    club_id: values.club_id,
    pod_mode: values.pod_mode,
    venue_id: virtual ? null : values.venue_id,
    // The booked slot drives the pod window server-side; the venue must
    // approve it before the pod goes live (own venues confirm instantly).
    venue_slot_id: virtual ? null : values.venue_slot_id || null,
    location_id: values.location_id || null,
    zone_name: null,
    meeting_platform: virtual ? values.meeting_platform.trim() || null : null,
    meeting_url: virtual ? values.meeting_url.trim() : null,
    meeting_notes: virtual ? values.meeting_notes.trim() || null : null,
    pod_hosts_id: [],
    pod_description: values.pod_description,
    pod_date_time: values.pod_date_time?.toISOString(),
    pod_end_date_time: values.pod_end_date_time?.toISOString() ?? null,
    pod_type: values.pod_type,
    pod_amount: Number(values.pod_amount) || 0,
    pod_occurrence: values.pod_occurrence,
    no_of_spots: Number(values.no_of_spots) || 0,
    pod_info: values.pod_info,
    pod_hashtag: values.pod_hashtag_text
      .split(/[\s,]+/)
      .map((item) => item.replace(/^#/, '').trim())
      .filter(Boolean),
    pod_images_and_videos: splitLines(values.media_text).map((url) => ({
      url,
      type: /\.(mp4|mov|webm)$/i.test(url) ? 'VIDEO' : 'IMAGE',
    })),
    payment_terms: values.payment_terms || null,
    what_this_pod_offers: values.what_this_pod_offers,
    available_perks: values.available_perks,
    place_charges: values.place_charges,
    products_enabled: values.products_enabled,
    product_requests: values.products_enabled ? values.product_requests : [],
    is_active: true,
  };
}

/** Serialises the live form state for a server draft (Dates -> ISO strings). */
export function serializeDraft(values: CreatePodFormValues, step: number) {
  return {
    payload: JSON.stringify(values),
    pod_title: values.pod_title.trim(),
    pod_mode: values.pod_mode,
    step,
  };
}

/** Rebuilds form values from a stored draft payload, reviving Date fields. */
export function hydrateDraft(payload: string): CreatePodFormValues {
  try {
    const parsed = JSON.parse(payload) as Partial<CreatePodFormValues>;
    return {
      ...blankCreatePodForm,
      ...parsed,
      pod_date_time: parsed.pod_date_time ? new Date(parsed.pod_date_time) : null,
      pod_end_date_time: parsed.pod_end_date_time ? new Date(parsed.pod_end_date_time) : null,
    };
  } catch {
    return blankCreatePodForm;
  }
}
