import { z } from 'zod';
import { DEFAULT_TICKET_DISCOUNT_MAX_PCT } from '@duncit/utils';
import { fallbackT, type Translate } from '../../../i18n/fallback';
import { refinePublish, refineVenueOrMeeting } from './create-pod.refine';
import { refineTicketDiscount } from './create-pod.ticket-discount';

export { hasImageLine, buildCreatePodInput, buildModerationInput, MODERATION_FIELD_MAP } from './create-pod.payload';
export {
  STEP_FIELDS,
  STEP_TITLE_KEYS,
  STEP_SUBTITLE_KEYS,
  stepTitleKey,
  stepSubtitleKey,
  STEP_TITLES,
  STEP_SUBTITLES,
  stepForField,
} from './create-pod.steps';
export { hostCategoryKeyOf, filterClubs } from './create-pod.clubs';
export { serializeDraft, hydrateDraft } from './create-pod.draft';

/** Minimum pod length — the end picker blocks the first 30 minutes after the
 * start, and the schema enforces the same for typed times. Native twin. */
export const MIN_POD_DURATION_MINUTES = 30;
const MIN_POD_DURATION_MS = MIN_POD_DURATION_MINUTES * 60_000;

/** Zod schema for the host Create Pod stepper — mirrors the server's
 * createPartnerPod rules (venue for physical, link for virtual, paid amounts).
 *
 * The messages are copy, so they come from the shared catalogue (rule 38): the
 * stepper passes its live `t`, and the export below resolves against the
 * bundled English for callers that parse the schema outside React.
 * `ticketDiscountMaxPct` is the admin's public `ticket_discount_max_pct`. */
export function makeCreatePodSchema(t: Translate = fallbackT, ticketDiscountMaxPct = DEFAULT_TICKET_DISCOUNT_MAX_PCT) {
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
      pod_date_time: z.date({ error: t('mweb.createPod.validation.startRequired') }),
      pod_end_date_time: z.date().nullable(),
      pod_type: z.string().min(1, t('mweb.createPod.validation.podTypeRequired')),
      pod_amount: z
        .number({ error: t('mweb.createPod.validation.amountNumber') })
        .min(0)
        .max(1999)
        .nullable(),
      venue_space_label: z.string(),
      no_of_spots: z
        .number({ error: t('mweb.createPod.validation.spotsNumber') })
        .min(0)
        .max(10000),
      pod_hashtag_text: z.string().max(500),
      media_text: z.string(),
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
            quantity: z
              .number({ error: t('mweb.createPod.validation.quantityRequired') })
              .min(1)
              .max(10000),
          })
        )
        .max(20),
      place_charges: z
        .array(
          z.object({
            label: z.string().trim().min(1, t('mweb.createPod.validation.chargeLabelRequired')).max(80),
            amount: z
              .number({ error: t('mweb.createPod.validation.amountNumber') })
              .min(0)
              .max(100000),
            note: z.string().trim().max(200),
          })
        )
        .max(10),
      // Shape only — the tier rules run in refineTicketDiscount below.
      ticket_discount_enabled: z.boolean(),
      ticket_discount_tiers: z.array(z.object({ min_tickets: z.number(), discount_pct: z.number() })),
      payment_terms: z.string().max(4000),
      agreed_to_terms: z.boolean(),
    })
    .superRefine((values, ctx) => {
      refineVenueOrMeeting(values, ctx, t);
      if (values.pod_date_time.getTime() <= Date.now()) {
        ctx.addIssue({ code: 'custom', path: ['pod_date_time'], message: t('mweb.createPod.validation.startFuture') });
      }
      // A virtual pod's window is what marks a joining member present, so it
      // needs an end — the server refuses one without. Native twin.
      if (values.pod_mode === 'VIRTUAL' && !values.pod_end_date_time) {
        ctx.addIssue({ code: 'custom', path: ['pod_end_date_time'], message: t('mweb.createPod.validation.endRequiredVirtual') });
      }
      if (values.pod_end_date_time && values.pod_end_date_time <= values.pod_date_time) {
        ctx.addIssue({ code: 'custom', path: ['pod_end_date_time'], message: t('mweb.createPod.validation.endAfterStart') });
      } else if (
        values.pod_end_date_time &&
        values.pod_end_date_time.getTime() - values.pod_date_time.getTime() < MIN_POD_DURATION_MS
      ) {
        ctx.addIssue({ code: 'custom', path: ['pod_end_date_time'], message: t('mweb.createPod.validation.endMinDuration') });
      }
      refinePublish(values, ctx, t);
      refineTicketDiscount(values, ctx, t, ticketDiscountMaxPct);
    });
}

/** The schema resolved against the bundled English — for callers that parse it
 * outside React (and the module-level export the stepper's tests use). */
export const createPodSchema = makeCreatePodSchema();

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

