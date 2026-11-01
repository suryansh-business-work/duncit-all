import { CREATE_POD_MONEY_STEP, CREATE_POD_WHERE_STEP } from '@duncit/utils';
import { fallbackT } from '../../../i18n/fallback';
import {
  FREE_JUSTIFICATION_NAMES,
  isFreePodType,
  offersFreeVenue,
  type CreatePodFormValues,
} from './create-pod.types';

/** Fields validated when leaving each stepper step (index aligned with STEP_TITLE_KEYS):
 * What → Where & when → Money → Details. */
export const STEP_FIELDS: (keyof CreatePodFormValues)[][] = [
  ['host_category_key', 'pod_mode'],
  ['location_id', 'locality', 'club_id', 'venue_id', 'venue_slot_id', 'venue_space_label', 'meeting_platform', 'meeting_url', 'meeting_notes', 'pod_date_time', 'pod_end_date_time', 'no_of_spots'],
  ['venue_offer_model', 'venue_offer_rate', 'venue_offer_offerings', 'venue_offer_note', 'pod_type', 'pod_amount', 'place_charges', 'ticket_discount_enabled', 'ticket_discount_tiers', 'smart_incentive_enabled', 'smart_incentive_pct', 'payment_terms', 'products_enabled', 'product_requests'],
  ['pod_title', 'pod_description', 'media_text', 'reel_url', 'pod_hashtag_text', 'pod_info', 'what_this_pod_offers', 'available_perks', 'agreed_to_terms'],
];

/** Catalogue keys for the four step titles, in step order. Components translate
 * these with their own `t`; the arrays below are the English resolution for
 * callers outside the stepper (the Host Management draft cards). */
export const STEP_TITLE_KEYS = [
  'mweb.createPod.flowWhatTitle',
  'mweb.createPod.flowWhereTitle',
  'mweb.createPod.flowMoneyTitle',
  'mweb.createPod.flowDetailsTitle',
];

/** One-line intro under each step title — mirrors the mobile stepper. */
export const STEP_SUBTITLE_KEYS = [
  'mweb.createPod.flowWhatSubtitle',
  'mweb.createPod.flowWhereSubtitle',
  'mweb.createPod.flowMoneySubtitle',
  'mweb.createPod.flowDetailsSubtitle',
];

const FREE_JUSTIFICATION_FIELDS: (keyof CreatePodFormValues)[] = Object.values(FREE_JUSTIFICATION_NAMES);

/**
 * The fields checked when leaving `step`: its STEP_FIELDS, plus the free
 * justification while Money draws it — beside a free venue offer or under a
 * free pod, one set of fields for both. Never on another step, so a host is
 * not held by fields they cannot see there.
 */
export function stepFieldsFor(step: number, values: Readonly<CreatePodFormValues>): (keyof CreatePodFormValues)[] {
  const fields = STEP_FIELDS[step] ?? [];
  const drawn = step === CREATE_POD_MONEY_STEP && (offersFreeVenue(values) || isFreePodType(values.pod_type));
  return drawn ? [...fields, ...FREE_JUSTIFICATION_FIELDS] : fields;
}

/**
 * A virtual pod has no venue to pick, so its second step is its meeting. The
 * arrays stay flat and mode-blind because other readers (the Host Management
 * draft cards) index them by step alone and have no pod mode to hand.
 */
export const stepTitleKey = (step: number, podMode?: string | null): string =>
  step === CREATE_POD_WHERE_STEP && podMode === 'VIRTUAL'
    ? 'mweb.createPod.step3TitleVirtual'
    : STEP_TITLE_KEYS[step];

/** The intro under a step's title. Money without a venue offer is only the ticket. */
export function stepSubtitleKey(step: number, podMode?: string | null, sendsOffer = true): string {
  if (step === CREATE_POD_WHERE_STEP && podMode === 'VIRTUAL') return 'mweb.createPod.step3SubtitleVirtual';
  if (step === CREATE_POD_MONEY_STEP && !sendsOffer) return 'mweb.createPod.flowMoneySubtitleTicket';
  return STEP_SUBTITLE_KEYS[step];
}

export const STEP_TITLES = STEP_TITLE_KEYS.map((key) => fallbackT(key));

export const STEP_SUBTITLES = STEP_SUBTITLE_KEYS.map((key) => fallbackT(key));

/** The stepper index a form field belongs to — powers jump-to-step on a violation. */
export const stepForField = (field: keyof CreatePodFormValues): number => {
  const index = STEP_FIELDS.findIndex((fields) => (fields as string[]).includes(field));
  return Math.max(index, 0);
};
