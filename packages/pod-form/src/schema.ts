import { z } from 'zod';
import type { PodFormConfig, PodFormValues } from './types';
import type { Translate } from './i18n/useTranslation';

/** Returns true when the string parses as an http(s) URL. */
const isHttpUrl = (value: string) => {
  /* v8 ignore next -- defensive: the schema only calls isHttpUrl with a non-empty value */
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

/** At least one non-video URL present in the newline-separated media text. */
const hasImage = (value: string) =>
  /* v8 ignore next -- defensive: media_text is always a string coming from the schema */
  (value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .some((url) => !/\.(mp4|mov|webm)$/i.test(url));

const toNumber = (value: unknown) =>
  value === '' || value === null || value === undefined ? Number.NaN : Number(value);

const placeChargeSchema = (t: Translate) =>
  z.object({
    label: z.string().trim().min(1, t('podForm.validation.labelRequired')).max(80),
    amount: z.preprocess(
      toNumber,
      z
        .number({ invalid_type_error: t('podForm.validation.amountNumber') })
        .min(0)
        .max(100000),
    ),
    note: z.string().trim().max(200).default(''),
  });

const productRequestSchema = (t: Translate) =>
  z.object({
    product_id: z.string().min(1, t('podForm.validation.productRequired')),
    quantity: z.preprocess(
      toNumber,
      z
        .number({ invalid_type_error: t('podForm.validation.quantityRequired') })
        .min(1)
        .max(10000),
    ),
  });

/** Club, host, venue, venue-slot and meeting-link rules (config-gated). */
function refineVenue(
  values: PodFormValues,
  ctx: z.RefinementCtx,
  config: PodFormConfig,
  t: Translate,
) {
  if (!values.club_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['club_id'], message: t('podForm.validation.clubRequired') });
  }
  if (config.showHosts && (config.requireHosts ?? true) && values.pod_hosts_id.length < 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pod_hosts_id'], message: t('podForm.validation.hostRequired') });
  }
  // `openEdit` already collapses a legacy multi-host pod, so the picker cannot
  // reach this — it is the invariant for anything else calling buildPodInput.
  if (config.showHosts && config.singleHost && values.pod_hosts_id.length > 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pod_hosts_id'], message: t('podForm.validation.singleHost') });
  }
  if (values.pod_mode === 'PHYSICAL' && !values.venue_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['venue_id'], message: t('podForm.validation.venueRequired') });
  }
  // Dates come from the picked slot when the picker is on, so a missing slot is
  // only an error while dates are missing too — an edited pod that keeps its
  // already-booked slot dates never forces a re-pick.
  if (
    config.showVenueSlot &&
    values.pod_mode === 'PHYSICAL' &&
    values.venue_id &&
    !values.venue_slot_id &&
    !values.pod_date_time
  ) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['venue_slot_id'], message: t('podForm.validation.slotRequired') });
  }
  if (values.pod_mode === 'VIRTUAL') {
    if (!values.meeting_url) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['meeting_url'], message: t('podForm.validation.meetingLinkRequired') });
    } else if (!isHttpUrl(values.meeting_url)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['meeting_url'], message: t('podForm.validation.meetingLinkInvalid') });
    }
  }
}

/** Start/end date-time rules. */
function refineDates(values: PodFormValues, ctx: z.RefinementCtx, t: Translate) {
  if (!values.pod_date_time) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pod_date_time'], message: t('podForm.validation.startRequired') });
  } else if (values.pod_date_time.getTime() <= Date.now()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pod_date_time'], message: t('podForm.validation.startInPast') });
  }
  // A physical pod's end comes off its booked slot; a virtual pod has no slot,
  // and its end is what closes the meeting link's attendance window.
  if (values.pod_mode === 'VIRTUAL' && !values.pod_end_date_time) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pod_end_date_time'], message: t('podForm.validation.endRequiredVirtual') });
  }
  if (
    values.pod_end_date_time &&
    values.pod_date_time &&
    values.pod_end_date_time.getTime() <= values.pod_date_time.getTime()
  ) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pod_end_date_time'], message: t('podForm.validation.endAfterStart') });
  }
}

/** Free-pod pricing + media rules. */
function refinePricingAndMedia(values: PodFormValues, ctx: z.RefinementCtx, t: Translate) {
  if (values.pod_type.includes('FREE') && values.pod_amount !== 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pod_amount'], message: t('podForm.validation.freeAmountZero') });
  }
  if (!hasImage(values.media_text)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['media_text'], message: t('podForm.validation.imageRequired') });
  }
}

/** Explore reel URL rule (config-gated; the field is optional). */
function refineReel(
  values: PodFormValues,
  ctx: z.RefinementCtx,
  config: PodFormConfig,
  t: Translate,
) {
  if (config.showReel && values.reel_url && !isHttpUrl(values.reel_url)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['reel_url'], message: t('podForm.validation.reelInvalid') });
  }
}

/** Duncit product-request rules (config-gated).
 *
 * The two rules that used to live here both policed the "Attach products"
 * switch against the row list — switch on with no rows, switch off with rows.
 * Neither state exists any more: `products_enabled` is derived from the rows in
 * buildPodInput, so the list IS the flag. What remains is the row rule in
 * `productRequestSchema`, which the picker also makes unreachable but is kept as
 * the invariant for anything else building these values. */
function refineProducts(
  values: PodFormValues,
  ctx: z.RefinementCtx,
  config: PodFormConfig,
  t: Translate,
) {
  if (config.showProducts && values.pod_mode === 'VIRTUAL' && values.product_requests.length > 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['product_requests'], message: t('podForm.validation.virtualNoProducts') });
  }
}

/**
 * Auto Pod mode: the template's own rules, mirroring the server's
 * `validateTemplate` so a bad template never round-trips. No club, venue, host
 * or date exists yet — a category stands in for the club, the price floor is 1
 * (a physical pod is never free) and two spots are the fewest that bill anyone
 * (the host attends free).
 */
function refineAutoPod(values: PodFormValues, ctx: z.RefinementCtx, t: Translate) {
  if (!values.sub_category_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['sub_category_id'],
      message: t('podForm.autoPod.categoryRequired'),
    });
  }
  if (values.pod_amount < 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pod_amount'], message: t('podForm.autoPod.priceRange') });
  }
  if (values.no_of_spots < 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['no_of_spots'], message: t('podForm.autoPod.spotsMin') });
  }
  if (values.no_of_spots > 999) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['no_of_spots'], message: t('podForm.autoPod.spotsMax') });
  }
  if (!hasImage(values.media_text)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['media_text'], message: t('podForm.autoPod.mediaRequired') });
  }
}

/**
 * Config-driven Zod factory. Ports the admin `podFormSchema` 1:1 (identical
 * messages/min/max/refinements) but gates the host / place-charges / products /
 * venue-slot rules on the supplied flags. Dates are unified to `Date | null`
 * (MUI X) with the partner-form's date refinements — same messages as admin.
 *
 * In Auto Pod mode the club/venue/host/date rules are replaced wholesale by
 * `refineAutoPod`: none of those things exist when the template is written.
 */
export function makePodSchema(config: PodFormConfig, t: Translate) {
  return z
    .object({
      pod_id: z.string().optional(),
      pod_title: z
        .string()
        .trim()
        .min(3, t('podForm.validation.titleShort'))
        .max(120)
        .min(1, t('podForm.validation.titleRequired')),
      club_id: z.string().default(''),
      super_category_id: z.string().default(''),
      sub_category_id: z.string().default(''),
      pod_mode: z.enum(['PHYSICAL', 'VIRTUAL'], {
        required_error: t('podForm.validation.modeRequired'),
      }),
      venue_id: z.string().default(''),
      venue_slot_id: z.string().default(''),
      location_id: z.string().default(''),
      zone_name: z.string().default(''),
      meeting_platform: z
        .string()
        .trim()
        .max(80, t('podForm.validation.meetingPlatformMax'))
        .default(''),
      meeting_url: z.string().trim().default(''),
      meeting_notes: z
        .string()
        .trim()
        .max(1000, t('podForm.validation.meetingNotesMax'))
        .default(''),
      pod_hosts_id: z.array(z.string()).default([]),
      pod_description: z
        .string()
        .trim()
        .min(10, t('podForm.validation.descriptionShort'))
        .min(1, t('podForm.validation.descriptionRequired')),
      pod_date_time: z
        .date({ invalid_type_error: t('podForm.validation.startRequired') })
        .nullable(),
      pod_end_date_time: z.date().nullable(),
      pod_type: z.string().min(1),
      pod_amount: z.preprocess(
        toNumber,
        z
          .number({ invalid_type_error: t('podForm.validation.amountNumber') })
          .min(0, t('podForm.validation.amountNegative'))
          .max(1999, t('podForm.validation.amountMax')),
      ),
      pod_occurrence: z.string().min(1),
      no_of_spots: z.preprocess(
        toNumber,
        z
          .number({ invalid_type_error: t('podForm.validation.spotsNumber') })
          .min(0)
          .max(10000),
      ),
      pod_info: z.string().max(2000).default(''),
      pod_hashtag_text: z.string().max(500).default(''),
      media_text: z.string().default(''),
      reel_url: z.string().trim().max(1000).default(''),
      payment_terms: z.string().max(4000).default(''),
      what_this_pod_offers: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
      available_perks: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
      place_charges: z.array(placeChargeSchema(t)).max(10).default([]),
      products_enabled: z.boolean().default(false),
      product_requests: z.array(productRequestSchema(t)).default([]),
      is_active: z.boolean().default(true),
    })
    .superRefine((values, ctx) => {
      if (config.autoPod) {
        refineAutoPod(values, ctx, t);
        refineReel(values, ctx, config, t);
        return;
      }
      refineVenue(values, ctx, config, t);
      refineDates(values, ctx, t);
      refinePricingAndMedia(values, ctx, t);
      refineReel(values, ctx, config, t);
      refineProducts(values, ctx, config, t);
    });
}

export type PodSchema = ReturnType<typeof makePodSchema>;
