import { z } from 'zod';
import {
  blankCreatePodForm,
  type CreatePodClub,
  type CreatePodFormValues,
  type CreatePodHostCategory,
} from './create-pod.types';

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
    locality: z.string(),
    host_category_key: z.string(),
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
    venue_space_label: z.string(),
    no_of_spots: z.number({ invalid_type_error: 'Spots must be a number' }).min(0).max(10000),
    pod_hashtag_text: z.string().max(500),
    media_text: z.string(),
    what_this_pod_offers: z
      .array(z.string().trim().min(1).max(40))
      .min(1, 'Add at least one thing this pod offers')
      .max(20),
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
    agreed_to_terms: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.pod_mode === 'PHYSICAL' && !values.venue_id) {
      ctx.addIssue({ code: 'custom', path: ['venue_id'], message: 'Select a venue' });
    } else if (values.pod_mode === 'PHYSICAL' && !values.venue_space_label) {
      // A space (capacity) is chosen after the venue and gates the slot list.
      ctx.addIssue({ code: 'custom', path: ['venue_space_label'], message: 'Pick a space / capacity' });
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
    if (!values.agreed_to_terms) {
      ctx.addIssue({ code: 'custom', path: ['agreed_to_terms'], message: 'Accept the Organizer Terms to publish' });
    }
  });

/** Fields validated when leaving each stepper step (index aligned with STEPS). */
export const STEP_FIELDS: (keyof CreatePodFormValues)[][] = [
  ['pod_title', 'pod_description', 'media_text', 'pod_hashtag_text', 'pod_info', 'what_this_pod_offers', 'available_perks'],
  ['location_id', 'locality', 'host_category_key', 'pod_mode', 'club_id'],
  ['venue_id', 'venue_slot_id', 'venue_space_label', 'meeting_platform', 'meeting_url', 'meeting_notes', 'pod_date_time', 'pod_end_date_time'],
  ['pod_type', 'pod_amount', 'no_of_spots', 'place_charges', 'payment_terms', 'products_enabled', 'product_requests', 'agreed_to_terms'],
];

export const STEP_TITLES = [
  'Pod Basics',
  'Location, Category & Club',
  'Venue & Slot',
  'Pricing & Publish',
];

/** One-line intro under each step title — mirrors the mobile stepper. */
export const STEP_SUBTITLES = [
  'Start with the core details so people understand what this pod is about.',
  'Where and what are you playing — location, category and the club it belongs to.',
  'Pick a partner venue and lock in your date & time from its calendar.',
  'Decide how much to charge, then review and publish your pod.',
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
    zone_name: virtual ? null : values.locality || null,
    meeting_platform: virtual ? values.meeting_platform.trim() || null : null,
    meeting_url: virtual ? values.meeting_url.trim() : null,
    meeting_notes: virtual ? values.meeting_notes.trim() || null : null,
    pod_hosts_id: [],
    pod_description: values.pod_description,
    pod_date_time: values.pod_date_time?.toISOString(),
    pod_end_date_time: values.pod_end_date_time?.toISOString() ?? null,
    pod_type: values.pod_type,
    pod_amount: Number(values.pod_amount) || 0,
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

/** Composite key identifying one host category: `${super}|${sub}`. Shared by the
 * step-2 category picker and the club filter so selection and matching align. */
export const hostCategoryKeyOf = (category: {
  super_category_id?: string | null;
  sub_category_id?: string | null;
}) => `${category.super_category_id ?? ''}|${category.sub_category_id ?? ''}`;

interface ClubFilterOptions {
  hostCategories: CreatePodHostCategory[];
  selectedCategoryKey: string;
  locationId: string;
  locality: string;
  podMode: string;
}

/** Clubs the host may attach this pod to: scoped by the SELECTED host category
 * (Super + Sub) — or all of the host's categories when none is picked yet — then,
 * for physical pods, by the chosen city and (optionally) locality. */
export function filterClubs(clubs: CreatePodClub[], opts: ClubFilterOptions): CreatePodClub[] {
  const activeCategories = opts.selectedCategoryKey
    ? opts.hostCategories.filter((category) => hostCategoryKeyOf(category) === opts.selectedCategoryKey)
    : opts.hostCategories;
  const keys = new Set(
    activeCategories.filter((category) => category.super_category_id).map(hostCategoryKeyOf)
  );
  const matchesCategory = (club: CreatePodClub) => {
    if (keys.size === 0) return true;
    if (!club.super_category_id) return false;
    return (
      keys.has(`${club.super_category_id}|${club.category_id ?? ''}`) ||
      keys.has(`${club.super_category_id}|`)
    );
  };
  return clubs.filter((club) => {
    if (!matchesCategory(club)) return false;
    if (opts.podMode === 'VIRTUAL') return true;
    if (opts.locationId && club.location_id !== opts.locationId) return false;
    if (opts.locality && (club.locality ?? '') !== opts.locality) return false;
    return true;
  });
}

/** The pod text + image URLs sent to the server moderation preflight. */
export function buildModerationInput(values: CreatePodFormValues) {
  return {
    pod_title: values.pod_title.trim(),
    pod_description: values.pod_description,
    pod_info: values.pod_info || null,
    pod_hashtag: values.pod_hashtag_text
      .split(/[\s,]+/)
      .map((item) => item.replace(/^#/, '').trim())
      .filter(Boolean),
    image_urls: splitLines(values.media_text).filter((url) => !VIDEO_URL_RE.test(url)),
  };
}

/** Maps a server moderation `field` onto the matching form field. */
export const MODERATION_FIELD_MAP: Record<string, keyof CreatePodFormValues> = {
  pod_title: 'pod_title',
  pod_description: 'pod_description',
  pod_info: 'pod_info',
  pod_hashtag: 'pod_hashtag_text',
  image: 'media_text',
};

/** The stepper index a form field belongs to — powers jump-to-step on a violation. */
export const stepForField = (field: keyof CreatePodFormValues): number => {
  const index = STEP_FIELDS.findIndex((fields) => (fields as string[]).includes(field));
  return index >= 0 ? index : 0;
};

/** Copy for the "AI monitoring" chip's guidelines dialog (shared with mobile). */
export const POD_AI_GUIDELINES = {
  intro:
    "When you tap Create Pod, our AI (GPT-4o) deep-checks everything you entered — title, description, details, hashtags and uploaded images — against Duncit's community guidelines.",
  rules: [
    'No phone numbers, emails or personal contact details.',
    'No external, social or payment links.',
    'No payment handles (UPI, Paytm, GPay, PhonePe, bank details).',
    'No abusive, hateful, sexual or offensive wording.',
    'No nude, explicit or unwanted images.',
    'Never ask people to contact or pay you off the platform.',
  ],
  warning:
    'If your content breaks these rules the pod will not be created, your Account Health can drop, and repeat violations can get your account temporarily or permanently blocked.',
};

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
