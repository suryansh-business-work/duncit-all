import { parse } from 'date-fns';
import { z } from 'zod';
import { isMeetingPlatform } from '@duncit/utils';

import { CategoryMediaType, type PodMode, type PodType } from '@/generated/graphql/graphql';
import { fallbackT, type Translate } from '@/i18n/fallback';
import {
  blankCreatePodForm,
  type CreatePodClub,
  type CreatePodFormValues,
  type CreatePodHostCategory,
} from './create-pod.types';

const DATE_TIME_FORMAT = 'yyyy-MM-dd HH:mm';
const DATE_TIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

/** Minimum pod length — the end picker blocks the first 30 minutes after the
 * start, and the schema enforces the same for typed times. mWeb twin. */
export const MIN_POD_DURATION_MINUTES = 30;
const MIN_POD_DURATION_MS = MIN_POD_DURATION_MINUTES * 60_000;

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

/** Physical pods must book a venue, a space (capacity) and one of its slots. */
function refineVenue(values: CreatePodFormValues, ctx: z.RefinementCtx, t: Translate) {
  if (values.pod_mode === 'PHYSICAL' && !values.venue_id) {
    ctx.addIssue({
      code: 'custom',
      path: ['venue_id'],
      message: t('mweb.createPod.validation.venueRequired'),
    });
  } else if (values.pod_mode === 'PHYSICAL' && !values.venue_space_label) {
    // A space (capacity) is chosen after the venue and gates the slot list.
    ctx.addIssue({
      code: 'custom',
      path: ['venue_space_label'],
      message: t('mweb.createPod.validation.spaceRequired'),
    });
  }
  if (values.pod_mode === 'PHYSICAL' && !values.venue_slot_id) {
    ctx.addIssue({
      code: 'custom',
      path: ['venue_slot_id'],
      message: t('mweb.createPod.validation.slotRequired'),
    });
  }
}

/** Virtual pods must carry a valid meeting link. */
function refineMeeting(values: CreatePodFormValues, ctx: z.RefinementCtx, t: Translate) {
  if (values.pod_mode === 'VIRTUAL') {
    // Picked from the shared list, not typed: the pod page decodes codes, so
    // free text rendered back as "Google meet". mWeb twin.
    if (!isMeetingPlatform(values.meeting_platform)) {
      ctx.addIssue({
        code: 'custom',
        path: ['meeting_platform'],
        message: t('mweb.createPod.meetingPlatformRequired'),
      });
    }
    if (!values.meeting_url) {
      ctx.addIssue({
        code: 'custom',
        path: ['meeting_url'],
        message: t('mweb.createPod.validation.meetingUrlRequired'),
      });
    } else if (!/^https?:\/\/\S+$/.test(values.meeting_url)) {
      ctx.addIssue({
        code: 'custom',
        path: ['meeting_url'],
        message: t('mweb.createPod.validation.meetingUrlInvalid'),
      });
    }
  }
}

/** The pod window: a future start and (when set) an end after it. */
function refineSchedule(values: CreatePodFormValues, ctx: z.RefinementCtx, t: Translate) {
  const start = parseDateTimeText(values.pod_date_time_text);
  if (start && start.getTime() <= Date.now()) {
    ctx.addIssue({
      code: 'custom',
      path: ['pod_date_time_text'],
      message: t('mweb.createPod.validation.startFuture'),
    });
  }
  const end = parseDateTimeText(values.pod_end_date_time_text);
  if (start && end && end <= start) {
    ctx.addIssue({
      code: 'custom',
      path: ['pod_end_date_time_text'],
      message: t('mweb.createPod.validation.endAfterStart'),
    });
  } else if (start && end && end.getTime() - start.getTime() < MIN_POD_DURATION_MS) {
    ctx.addIssue({
      code: 'custom',
      path: ['pod_end_date_time_text'],
      message: t('mweb.createPod.validation.endMinDuration'),
    });
  }
}

/** Creation only accepts the new FREE/PAID pair, and FREE is virtual-only. */
function refinePodType(values: CreatePodFormValues, ctx: z.RefinementCtx, t: Translate) {
  if (values.pod_type !== 'FREE' && values.pod_type !== 'PAID') {
    ctx.addIssue({
      code: 'custom',
      path: ['pod_type'],
      message: t('mweb.createPod.validation.podTypeInvalid'),
    });
  } else if (values.pod_mode === 'PHYSICAL' && values.pod_type === 'FREE') {
    ctx.addIssue({
      code: 'custom',
      path: ['pod_type'],
      message: t('mweb.createPod.validation.physicalMustBePaid'),
    });
  }
}

/** The ticket price is blank until the host types one, so a PAID pod can never
 * be published at ₹0 by default — only a FREE pod (whose field is locked to 0)
 * may carry no price. mWeb twin (rule 27). */
function refineTicketPrice(values: CreatePodFormValues, ctx: z.RefinementCtx, t: Translate) {
  const amount = values.pod_amount_text.trim();
  if (values.pod_type === 'FREE') {
    if (Number(amount) !== 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['pod_amount_text'],
        message: t('mweb.createPod.validation.freeAmountZero'),
      });
    }
    return;
  }
  if (!amount) {
    ctx.addIssue({
      code: 'custom',
      path: ['pod_amount_text'],
      message: t('mweb.createPod.validation.ticketPriceRequired'),
    });
  } else if (Number(amount) <= 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['pod_amount_text'],
      message: t('mweb.createPod.validation.ticketPriceMin'),
    });
  }
}

/** Products, media and the Organizer Terms gate on the publish step. */
function refinePublish(values: CreatePodFormValues, ctx: z.RefinementCtx, t: Translate) {
  // Products are optional and `products_enabled` is derived from the rows, so
  // there is no longer a "switch on but nothing chosen" state to catch here.
  // The per-row rule in the schema is what guards an incomplete association.
  if (!hasImageLine(values.media_text)) {
    ctx.addIssue({
      code: 'custom',
      path: ['media_text'],
      message: t('mweb.createPod.validation.imageRequired'),
    });
  }
  if (!values.agreed_to_terms) {
    ctx.addIssue({
      code: 'custom',
      path: ['agreed_to_terms'],
      message: t('mweb.createPod.validation.termsRequired'),
    });
  }
}

/** Zod schema for the host Create Pod stepper — same rules as mWeb's form.
 *
 * The messages are copy, so they come from the shared catalogue (rule 38): the
 * stepper passes its live `t`, and the export below resolves against the
 * bundled English for callers that parse the schema outside React. */
export function makeCreatePodSchema(t: Translate = fallbackT) {
  return z
    .object({
      location_id: z.string().min(1, t('mweb.createPod.validation.locationRequired')),
      locality: z.string(),
      // Required in the SCHEMA, not just by a marker on the label: a pod without
      // a category can't be matched to clubs or products, and the stepper's own
      // guard only fired when the host already had categories to choose from.
      host_category_key: z.string().min(1, t('mweb.createPod.validation.categoryRequired')),
      pod_title: z
        .string()
        .trim()
        .min(3, t('mweb.createPod.validation.titleShort'))
        .max(120, t('mweb.createPod.validation.titleLong')),
      club_id: z.string().min(1, t('mweb.createPod.validation.clubRequired')),
      pod_mode: z.enum(['PHYSICAL', 'VIRTUAL']),
      venue_id: z.string(),
      venue_slot_id: z.string(),
      meeting_platform: z.string().trim().max(80),
      meeting_url: z.string().trim(),
      meeting_notes: z.string().trim().max(1000),
      pod_description: z.string().trim().min(10, t('mweb.createPod.validation.descriptionShort')),
      pod_info: z.string().max(2000),
      pod_date_time_text: z
        .string()
        .refine((text) => !!parseDateTimeText(text), t('mweb.createPod.validation.dateTimeFormat')),
      pod_end_date_time_text: z
        .string()
        .refine(
          (text) => text === '' || !!parseDateTimeText(text),
          t('mweb.createPod.validation.dateTimeFormat'),
        ),
      pod_type: z.string().min(1),
      pod_amount_text: z
        .string()
        .refine(intIn(0, 1999), t('mweb.createPod.validation.amountRange')),
      venue_space_label: z.string(),
      no_of_spots_text: z
        .string()
        .refine(intIn(0, 10000), t('mweb.createPod.validation.spotsRange')),
      pod_hashtag_text: z.string().max(500),
      media_text: z.string(),
      // Optional reel — uploaded straight to ImageKit, so only the URL travels here.
      reel_url: z.string(),
      what_this_pod_offers: z
        .array(z.string().trim().min(1).max(40))
        .min(1, t('mweb.createPod.validation.offersRequired'))
        .max(20),
      available_perks: z.array(z.string().trim().min(1).max(40)).max(20),
      products_enabled: z.boolean(),
      product_requests: z
        .array(
          z.object({
            product_id: z.string().min(1, t('podProduct.selectFirst')),
            quantity: z.number().min(1).max(10000),
          }),
        )
        .max(20),
      place_charges: z
        .array(
          z.object({
            label: z
              .string()
              .trim()
              .min(1, t('mweb.createPod.validation.chargeLabelRequired'))
              .max(80),
            amount: z.number().min(0).max(100000),
            note: z.string().trim().max(200),
          }),
        )
        .max(10),
      payment_terms: z.string().max(4000),
      agreed_to_terms: z.boolean(),
    })
    .superRefine((values, ctx) => {
      refineVenue(values, ctx, t);
      refineMeeting(values, ctx, t);
      refineSchedule(values, ctx, t);
      refinePodType(values, ctx, t);
      refineTicketPrice(values, ctx, t);
      refinePublish(values, ctx, t);
    });
}

/** The schema resolved against the bundled English — for callers that parse it
 * outside React. */
export const createPodSchema = makeCreatePodSchema();

/** Fields validated when leaving each stepper step (index aligned with STEP_TITLES). */
export const STEP_FIELDS: (keyof CreatePodFormValues)[][] = [
  [
    // The category picker sits above the title now, so it belongs to step 1.
    'host_category_key',
    'pod_title',
    'pod_description',
    'media_text',
    'reel_url',
    'pod_hashtag_text',
    'pod_info',
    'what_this_pod_offers',
    'available_perks',
  ],
  ['location_id', 'locality', 'pod_mode', 'club_id'],
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

/** Catalogue keys for the four step titles, in step order. Components translate
 * these with their own `t`; the arrays below are the English resolution for
 * callers outside the stepper (the Host Management draft cards). */
export const STEP_TITLE_KEYS = [
  'mweb.createPod.step1Title',
  'mweb.createPod.step2Title',
  'mweb.createPod.step3Title',
  'mweb.createPod.step4Title',
];

/** One-line intro under each step title — mirrors the mWeb stepper. */
export const STEP_SUBTITLE_KEYS = [
  'mweb.createPod.step1Subtitle',
  'mweb.createPod.step2Subtitle',
  'mweb.createPod.step3Subtitle',
  'mweb.createPod.step4Subtitle',
];

/**
 * Step 3 is a different step for a virtual pod.
 *
 * The arrays stay flat and mode-blind because other readers (the Host
 * Management draft cards) index them by step alone and have no pod mode to
 * hand. The branch lives here, where the caller does have one — a virtual pod
 * has no venue to pick, so "Venue & Slot" describes a screen it never shows.
 * mWeb twin: create-pod.form.tsx.
 */
const VIRTUAL_STEP_INDEX = 2;

export const stepTitleKey = (step: number, podMode?: string | null): string =>
  step === VIRTUAL_STEP_INDEX && podMode === 'VIRTUAL'
    ? 'mweb.createPod.step3TitleVirtual'
    : (STEP_TITLE_KEYS[step] ?? '');

export const stepSubtitleKey = (step: number, podMode?: string | null): string =>
  step === VIRTUAL_STEP_INDEX && podMode === 'VIRTUAL'
    ? 'mweb.createPod.step3SubtitleVirtual'
    : (STEP_SUBTITLE_KEYS[step] ?? '');

export const STEP_TITLES = STEP_TITLE_KEYS.map((key) => fallbackT(key));

export const STEP_SUBTITLES = STEP_SUBTITLE_KEYS.map((key) => fallbackT(key));

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
    reel_url: values.reel_url || null,
    payment_terms: values.payment_terms || null,
    what_this_pod_offers: values.what_this_pod_offers,
    available_perks: values.available_perks,
    place_charges: values.place_charges,
    // Derived, not chosen: the "Attach products" switch is gone, so a pod's shop
    // is open exactly when it carries products. Guarding on the rows rather than
    // the flag also means a stale draft that still holds `products_enabled: true`
    // with nothing attached publishes as closed instead of half-configured.
    // mWeb twin.
    products_enabled: values.product_requests.length > 0,
    product_requests: values.product_requests,
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

/** The rules the "AI monitoring" chip's guidelines dialog lists, one catalogue
 * key per rule so a translator edits the same rows an admin sees. */
export const POD_GUIDELINE_RULE_KEYS = [
  'mweb.createPod.guidelinesRule1',
  'mweb.createPod.guidelinesRule2',
  'mweb.createPod.guidelinesRule3',
  'mweb.createPod.guidelinesRule4',
  'mweb.createPod.guidelinesRule5',
  'mweb.createPod.guidelinesRule6',
];

/** Serialises the live form state for a server draft. */
export function serializeDraft(values: CreatePodFormValues, step: number) {
  return {
    payload: JSON.stringify(values),
    pod_title: values.pod_title.trim(),
    pod_mode: values.pod_mode,
    step,
  };
}

/** Coerces any stored pod type onto the FREE/PAID pair (physical pods are
 * always PAID — FREE is virtual-only). */
export function normalizePodType(type: string, mode: string): string {
  if (mode === 'PHYSICAL') return 'PAID';
  return type === 'FREE' ? 'FREE' : 'PAID';
}

/** Rebuilds form values from a stored draft payload. */
export function hydrateDraft(payload: string): CreatePodFormValues {
  try {
    const values = {
      ...blankCreatePodForm,
      ...(JSON.parse(payload) as Partial<CreatePodFormValues>),
    };
    // Old drafts may carry retired pod types — coerce onto FREE/PAID.
    values.pod_type = normalizePodType(values.pod_type, values.pod_mode);
    return values;
  } catch {
    return blankCreatePodForm;
  }
}
