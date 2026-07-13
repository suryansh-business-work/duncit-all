import { parse } from 'date-fns';
import { z } from 'zod';

import { CategoryMediaType, type PodMode, type PodType } from '@/generated/graphql/graphql';
import {
  blankCreatePodForm,
  type CreatePodClub,
  type CreatePodFormValues,
  type CreatePodHostCategory,
} from './create-pod.types';

const DATE_TIME_FORMAT = 'yyyy-MM-dd HH:mm';
const DATE_TIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

/** Parses the form's `YYYY-MM-DD HH:mm` local date-time text; null when invalid. */
export function parseDateTimeText(text: string): Date | null {
  if (!DATE_TIME_RE.test(text)) return null;
  const date = parse(text, DATE_TIME_FORMAT, new Date());
  return Number.isNaN(date.getTime()) ? null : date;
}

const intIn = (min: number, max: number) => (text: string) => {
  const value = Number(text);
  return Number.isFinite(value) && value >= min && value <= max;
};

const splitMediaLines = (text: string) =>
  text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

const VIDEO_URL_RE = /\.(mp4|mov|webm)$/i;

/** True when the media list carries at least one image URL (server mirrors this). */
export const hasImageLine = (mediaText: string) =>
  splitMediaLines(mediaText).some((url) => !VIDEO_URL_RE.test(url));

/** Zod schema for the host Create Pod stepper — same rules as mWeb's form. */
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
    pod_date_time_text: z
      .string()
      .refine((text) => !!parseDateTimeText(text), 'Use YYYY-MM-DD HH:mm'),
    pod_end_date_time_text: z
      .string()
      .refine((text) => text === '' || !!parseDateTimeText(text), 'Use YYYY-MM-DD HH:mm'),
    pod_type: z.string().min(1),
    pod_amount_text: z.string().refine(intIn(0, 1999), 'Amount must be 0–1999'),
    venue_space_label: z.string(),
    no_of_spots_text: z.string().refine(intIn(0, 10000), 'Spots must be 0–10000'),
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
          quantity: z.number().min(1).max(10000),
        }),
      )
      .max(20),
    place_charges: z
      .array(
        z.object({
          label: z.string().trim().min(1, 'Label required').max(80),
          amount: z.number().min(0).max(100000),
          note: z.string().trim().max(200),
        }),
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
      ctx.addIssue({
        code: 'custom',
        path: ['venue_space_label'],
        message: 'Pick a space / capacity',
      });
    }
    if (values.pod_mode === 'PHYSICAL' && !values.venue_slot_id) {
      ctx.addIssue({
        code: 'custom',
        path: ['venue_slot_id'],
        message: 'Pick an available slot from the venue calendar',
      });
    }
    if (values.pod_mode === 'VIRTUAL') {
      if (!values.meeting_url) {
        ctx.addIssue({
          code: 'custom',
          path: ['meeting_url'],
          message: 'Meeting link is required',
        });
      } else if (!/^https?:\/\/\S+$/.test(values.meeting_url)) {
        ctx.addIssue({
          code: 'custom',
          path: ['meeting_url'],
          message: 'Meeting link must be valid',
        });
      }
    }
    const start = parseDateTimeText(values.pod_date_time_text);
    if (start && start.getTime() <= Date.now()) {
      ctx.addIssue({
        code: 'custom',
        path: ['pod_date_time_text'],
        message: 'Start must be in the future',
      });
    }
    const end = parseDateTimeText(values.pod_end_date_time_text);
    if (start && end && end <= start) {
      ctx.addIssue({
        code: 'custom',
        path: ['pod_end_date_time_text'],
        message: 'End must be after start',
      });
    }
    if (values.pod_type.includes('FREE') && Number(values.pod_amount_text) !== 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['pod_amount_text'],
        message: 'Free pods must have amount 0',
      });
    }
    if (values.products_enabled && values.product_requests.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['product_requests'],
        message: 'Add at least one product',
      });
    }
    if (!hasImageLine(values.media_text)) {
      ctx.addIssue({
        code: 'custom',
        path: ['media_text'],
        message: 'Add at least one image URL',
      });
    }
    if (!values.agreed_to_terms) {
      ctx.addIssue({
        code: 'custom',
        path: ['agreed_to_terms'],
        message: 'Accept the Organizer Terms to publish',
      });
    }
  });

/** Fields validated when leaving each stepper step (index aligned with STEP_TITLES). */
export const STEP_FIELDS: (keyof CreatePodFormValues)[][] = [
  [
    'pod_title',
    'pod_description',
    'media_text',
    'pod_hashtag_text',
    'pod_info',
    'what_this_pod_offers',
    'available_perks',
  ],
  ['location_id', 'locality', 'host_category_key', 'pod_mode', 'club_id'],
  [
    'venue_id',
    'venue_slot_id',
    'meeting_platform',
    'meeting_url',
    'meeting_notes',
    'venue_space_label',
    'pod_date_time_text',
    'pod_end_date_time_text',
  ],
  [
    'pod_type',
    'pod_amount_text',
    'no_of_spots_text',
    'place_charges',
    'payment_terms',
    'products_enabled',
    'product_requests',
    'agreed_to_terms',
  ],
];

export const STEP_TITLES = [
  'Pod Basics',
  'Location, Category & Club',
  'Venue & Slot',
  'Pricing & Publish',
];

/** One-line intro under each step title — mirrors the mWeb stepper. */
export const STEP_SUBTITLES = [
  'Start with the core details so people understand what this pod is about.',
  'Where and what are you playing — location, category and the club it belongs to.',
  'Pick a partner venue and lock in your date & time from its calendar.',
  'Decide how much to charge, then review and publish your pod.',
];

/** Maps validated form values onto the server's CreatePodInput. */
export function buildCreatePodInput(values: CreatePodFormValues) {
  const virtual = values.pod_mode === 'VIRTUAL';
  const start = parseDateTimeText(values.pod_date_time_text);
  if (!start) throw new Error('Invalid start date/time');
  return {
    pod_title: values.pod_title.trim(),
    club_id: values.club_id,
    pod_mode: values.pod_mode as PodMode,
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
    pod_date_time: start.toISOString(),
    pod_end_date_time: parseDateTimeText(values.pod_end_date_time_text)?.toISOString() ?? null,
    pod_type: values.pod_type as PodType,
    pod_amount: Number(values.pod_amount_text) || 0,
    no_of_spots: Number(values.no_of_spots_text) || 0,
    pod_info: values.pod_info,
    pod_hashtag: values.pod_hashtag_text
      .split(/[\s,]+/)
      .map((item) => item.replace(/^#/, '').trim())
      .filter(Boolean),
    pod_images_and_videos: splitMediaLines(values.media_text).map((url) => ({
      url,
      type: VIDEO_URL_RE.test(url) ? CategoryMediaType.Video : CategoryMediaType.Image,
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
    ? opts.hostCategories.filter(
        (category) => hostCategoryKeyOf(category) === opts.selectedCategoryKey,
      )
    : opts.hostCategories;
  const keys = new Set(
    activeCategories.filter((category) => category.super_category_id).map(hostCategoryKeyOf),
  );
  const matchesCategory = (club: CreatePodClub) => {
    if (keys.size === 0) return true; // host has no categories → don't over-filter
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
    image_urls: splitMediaLines(values.media_text).filter((url) => !VIDEO_URL_RE.test(url)),
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
  return Math.max(index, 0);
};

/** Copy for the "AI monitoring" chip's guidelines dialog (shared with mWeb). */
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

/** Serialises the live form state for a server draft. */
export function serializeDraft(values: CreatePodFormValues, step: number) {
  return {
    payload: JSON.stringify(values),
    pod_title: values.pod_title.trim(),
    pod_mode: values.pod_mode,
    step,
  };
}

/** Rebuilds form values from a stored draft payload. */
export function hydrateDraft(payload: string): CreatePodFormValues {
  try {
    return { ...blankCreatePodForm, ...(JSON.parse(payload) as Partial<CreatePodFormValues>) };
  } catch {
    return blankCreatePodForm;
  }
}
