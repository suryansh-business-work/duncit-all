import { fallbackT } from '../../../i18n/fallback';
import type { CreatePodFormValues } from './create-pod.types';

/** Fields validated when leaving each stepper step (index aligned with STEPS). */
export const STEP_FIELDS: (keyof CreatePodFormValues)[][] = [
  ['host_category_key', 'location_id', 'locality', 'pod_mode', 'club_id'],
  ['pod_title', 'pod_description', 'media_text', 'reel_url', 'pod_hashtag_text', 'pod_info', 'what_this_pod_offers', 'available_perks'],
  ['venue_id', 'venue_slot_id', 'venue_space_label', 'meeting_platform', 'meeting_url', 'meeting_notes', 'pod_date_time', 'pod_end_date_time'],
  ['pod_type', 'pod_amount', 'no_of_spots', 'place_charges', 'ticket_discount_enabled', 'ticket_discount_tiers', 'payment_terms', 'products_enabled', 'product_requests', 'agreed_to_terms'],
];

/** Catalogue keys for the four step titles, in step order. Components translate
 * these with their own `t`; the arrays below are the English resolution for
 * callers outside the stepper (the Host Management draft cards). The club step
 * now comes first, so its `step2*` keys lead: the keys keep their names because
 * every locale's translation is stored against them. */
export const STEP_TITLE_KEYS = [
  'mweb.createPod.step2Title',
  'mweb.createPod.step1Title',
  'mweb.createPod.step3Title',
  'mweb.createPod.step4Title',
];

/** One-line intro under each step title — mirrors the mobile stepper. */
export const STEP_SUBTITLE_KEYS = [
  'mweb.createPod.step2Subtitle',
  'mweb.createPod.step1Subtitle',
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
 */
const VIRTUAL_STEP_INDEX = 2;

export const stepTitleKey = (step: number, podMode?: string | null): string =>
  step === VIRTUAL_STEP_INDEX && podMode === 'VIRTUAL'
    ? 'mweb.createPod.step3TitleVirtual'
    : STEP_TITLE_KEYS[step];

export const stepSubtitleKey = (step: number, podMode?: string | null): string =>
  step === VIRTUAL_STEP_INDEX && podMode === 'VIRTUAL'
    ? 'mweb.createPod.step3SubtitleVirtual'
    : STEP_SUBTITLE_KEYS[step];

export const STEP_TITLES = STEP_TITLE_KEYS.map((key) => fallbackT(key));

export const STEP_SUBTITLES = STEP_SUBTITLE_KEYS.map((key) => fallbackT(key));

/** The stepper index a form field belongs to — powers jump-to-step on a violation. */
export const stepForField = (field: keyof CreatePodFormValues): number => {
  const index = STEP_FIELDS.findIndex((fields) => (fields as string[]).includes(field));
  return Math.max(index, 0);
};
