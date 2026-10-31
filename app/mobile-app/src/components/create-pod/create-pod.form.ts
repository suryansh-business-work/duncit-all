import { z } from 'zod';
import {
  addFreeJustificationIssues,
  freeJustificationFields,
  makeVenueOfferAskSchema,
  type FreeJustificationValues,
} from '@duncit/forms/schemas';
import {
  CREATE_POD_OFFER_STEP,
  DEFAULT_SMART_INCENTIVE_MAX_PCT,
  isFreePod,
  isFreeVenueOfferModel,
  isHostOfferModel,
  isMeetingPlatform,
  isVideoUrl,
  offerBelowFloor,
  offerRateOf,
  smartIncentiveInput,
  ticketDiscountInput,
  venueOfferInput,
  venueOfferPriceInput,
  type VenueOfferFloor,
  type VenueOfferSource,
} from '@duncit/utils';

import { appFreeJustification, hostOfferInput } from '@/components/venue-offer/offer-terms-input';
import { CategoryMediaType, type PodMode, type PodType } from '@/generated/graphql/graphql';
import { fallbackT, type Translate } from '@/i18n/fallback';
import { appFormatter } from '@/utils/app-formatter';
import { blankCreatePodForm, type CreatePodFormValues } from './create-pod.types';
import {
  hydrateSmartIncentive,
  refineSmartIncentive,
  smartIncentiveSchemaShape,
} from './smart-incentive.form';
import {
  hydrateTicketDiscount,
  refineTicketDiscount,
  ticketDiscountSchemaShape,
} from './ticket-discount.form';

/** Minimum pod length — the end picker blocks the first 30 minutes after the
 * start, and the schema enforces the same for typed times. mWeb twin. */
export const MIN_POD_DURATION_MINUTES = 30;
const MIN_POD_DURATION_MS = MIN_POD_DURATION_MINUTES * 60_000;

/**
 * Parses the schedule text the member typed, in the ADMIN's configured date and
 * time patterns (rule 11) — the same shape mWeb's MUI X picker asks for. Null
 * when the text is not a complete, real moment.
 *
 * Read straight off the settings store rather than a hook so this stays a plain
 * function: the zod schema and the input builder both call it outside React.
 */
export function parseDateTimeText(text: string): Date | null {
  return appFormatter().parseDateTime(text);
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

/** True when the media list carries at least one image URL (server mirrors this). */
export const hasImageLine = (mediaText: string) =>
  splitMediaLines(mediaText).some((url) => !isVideoUrl(url));

/** The picked venue's floor on the offer's basis, or null when there is none. */
export type OfferFloorOf = (values: CreatePodFormValues) => VenueOfferFloor | null;

/** Physical pods must book a venue, a space (capacity) and a time there: a
 * Pod Request's held slot, or an offer to the venue for a window. */
function refineVenue(
  values: CreatePodFormValues,
  ctx: z.RefinementCtx,
  t: Translate,
  offerFloor: OfferFloorOf,
) {
  if (values.pod_mode === 'PHYSICAL' && !values.venue_id) {
    ctx.addIssue({
      code: 'custom',
      path: ['venue_id'],
      message: t('mweb.createPod.validation.venueRequired'),
    });
  } else if (values.pod_mode === 'PHYSICAL' && !values.venue_space_label && !values.venue_slot_id) {
    // A space (capacity) is chosen after the venue and gates the slot list. A
    // pod that already holds a slot (the club-admin edit) has its space booked,
    // and only a NEW space + slot pick re-routes it.
    ctx.addIssue({
      code: 'custom',
      path: ['venue_space_label'],
      message: t('mweb.createPod.validation.spaceRequired'),
    });
  }
  if (values.pod_mode === 'PHYSICAL') refineVenueTime(values, ctx, t, offerFloor);
}

/** What the host asks of the venue beside the price — the shared rules
 * (`makeVenueOfferAskSchema`: at least one point, each and the note within the
 * server's bounds), pinned on this form's own fields. mWeb twin. */
function refineOfferAsk(values: CreatePodFormValues, ctx: z.RefinementCtx, t: Translate) {
  const ask = makeVenueOfferAskSchema(t).safeParse({
    offerings: values.venue_offer_offerings,
    note: values.venue_offer_note,
  });
  for (const issue of ask.error?.issues ?? []) {
    const path = issue.path[0] === 'note' ? 'venue_offer_note' : 'venue_offer_offerings';
    ctx.addIssue({ code: 'custom', path: [path], message: issue.message });
  }
}

/** The host's offer to the venue: how they pay it (or that it is free), how
 * much — never below the venue's own amount on that basis — and what they ask
 * of it. A free venue asks no amount. mWeb twin. */
function refineVenueOffer(
  values: CreatePodFormValues,
  ctx: z.RefinementCtx,
  t: Translate,
  offerFloor: OfferFloorOf,
) {
  if (!isHostOfferModel(values.venue_offer_model)) {
    ctx.addIssue({
      code: 'custom',
      path: ['venue_offer_model'],
      message: t('mweb.createPod.validation.offerModelRequired'),
    });
  }
  const floor = offerFloor(values);
  if (
    !isFreeVenueOfferModel(values.venue_offer_model) &&
    offerRateOf(values.venue_offer_rate) <= 0
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['venue_offer_rate'],
      message: t('mweb.createPod.validation.offerRateRequired'),
    });
  } else if (floor && offerBelowFloor(floor, values.venue_offer_rate)) {
    ctx.addIssue({
      code: 'custom',
      path: ['venue_offer_rate'],
      message: t('availability.offers.minBusiness.offerBelow', { vars: { min: floor.text } }),
    });
  }
  refineOfferAsk(values, ctx, t);
}

/** A held slot books as before; a Pod Request must keep its slot; every other
 * physical pod needs its whole window and its offer to the venue. mWeb twin. */
function refineVenueTime(
  values: CreatePodFormValues,
  ctx: z.RefinementCtx,
  t: Translate,
  offerFloor: OfferFloorOf,
) {
  if (values.venue_slot_id) return;
  if (values.partner_request_id) {
    ctx.addIssue({
      code: 'custom',
      path: ['venue_slot_id'],
      message: t('mweb.createPod.validation.slotRequired'),
    });
    return;
  }
  if (!parseDateTimeText(values.pod_end_date_time_text)) {
    ctx.addIssue({
      code: 'custom',
      path: ['pod_date_time_text'],
      message: t('mweb.createPod.validation.bookingRequired'),
    });
  }
  refineVenueOffer(values, ctx, t, offerFloor);
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

/** The pod window: a future start and (when set) an end after it. A virtual pod
 * has no venue slot to close it, so its end is required — the server refuses
 * one without it, and the meeting-link mark needs the window. */
function refineSchedule(values: CreatePodFormValues, ctx: z.RefinementCtx, t: Translate) {
  const start = parseDateTimeText(values.pod_date_time_text);
  if (start && start.getTime() <= Date.now()) {
    ctx.addIssue({
      code: 'custom',
      path: ['pod_date_time_text'],
      message: t('mweb.createPod.validation.startFuture'),
    });
  }
  if (values.pod_mode === 'VIRTUAL' && !values.pod_end_date_time_text.trim()) {
    ctx.addIssue({
      code: 'custom',
      path: ['pod_end_date_time_text'],
      message: t('mweb.createPod.validation.endRequiredVirtual'),
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

/** Creation only accepts the new FREE/PAID pair — either one for a physical or
 * a virtual pod. */
function refinePodType(values: CreatePodFormValues, ctx: z.RefinementCtx, t: Translate) {
  if (values.pod_type !== 'FREE' && values.pod_type !== 'PAID') {
    ctx.addIssue({
      code: 'custom',
      path: ['pod_type'],
      message: t('mweb.createPod.validation.podTypeInvalid'),
    });
  }
}

/** The ticket price is blank until the host types one, so a PAID pod can never
 * be published at ₹0 by default — only a FREE pod (which shows no price field
 * and always carries 0) may have no price. mWeb twin (rule 27). */
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

/** A FREE pod, or one priced at ₹0, never carries a multi-ticket discount or a
 * Smart Incentive. mWeb twin. */
export const isFreeTicket = (
  values: Pick<CreatePodFormValues, 'pod_type' | 'pod_amount_text'>,
): boolean => values.pod_type === 'FREE' || (Number(values.pod_amount_text) || 0) <= 0;

/** Whether the pod sends its venue a FREE offer: a physical pod with no held
 * slot, asking for the window for nothing. mWeb twin. */
export const sendsFreeVenueOffer = (
  values: Pick<CreatePodFormValues, 'pod_mode' | 'venue_slot_id' | 'venue_offer_model'>,
): boolean =>
  values.pod_mode === 'PHYSICAL' &&
  !values.venue_slot_id &&
  isFreeVenueOfferModel(values.venue_offer_model);

/** Whether the host must say why something here is free — the venue, the pod or both. */
export const needsFreeJustification = (
  values: Pick<
    CreatePodFormValues,
    'pod_mode' | 'venue_slot_id' | 'venue_offer_model' | 'pod_type'
  >,
): boolean => sendsFreeVenueOffer(values) || isFreePod(values.pod_type);

/** A form's free justification as the shared helpers read it (Create Pod, the resubmit sheet). */
export const freeSourceOf = (values: FreeJustificationValues) => ({
  reason: values.free_reason,
  details: values.free_details,
  accepted: values.free_accepted,
});

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
 * bundled English for callers that parse the schema outside React.
 *
 * `smartIncentiveMaxPct` is Loyalty > Smart Incentive's `max_discount_pct`, or
 * null while the programme is not known to be on — Step 4 hides the editor
 * then, so the percentage is not checked (see `refineSmartIncentive`).
 * `offerFloor` is the picked venue's business amount on the offer's basis: an
 * offer below it cannot leave the offer step. */
export function makeCreatePodSchema(
  t: Translate = fallbackT,
  smartIncentiveMaxPct: number | null = DEFAULT_SMART_INCENTIVE_MAX_PCT,
  offerFloor: OfferFloorOf = () => null,
) {
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
      partner_request_id: z.string().default(''),
      meeting_platform: z.string().trim().max(80),
      meeting_url: z.string().trim(),
      meeting_notes: z.string().trim().max(1000),
      pod_description: z.string().trim().min(10, t('mweb.createPod.validation.descriptionShort')),
      pod_info: z.string().max(2000),
      pod_date_time_text: z.string().refine(
        (text) => !!parseDateTimeText(text),
        t('mweb.createPod.validation.dateTimeFormat', {
          vars: { format: appFormatter().dateTimePlaceholder },
        }),
      ),
      pod_end_date_time_text: z.string().refine(
        (text) => text === '' || !!parseDateTimeText(text),
        t('mweb.createPod.validation.dateTimeFormat', {
          vars: { format: appFormatter().dateTimePlaceholder },
        }),
      ),
      pod_type: z.string().min(1),
      pod_amount_text: z
        .string()
        .refine(intIn(0, 1999), t('mweb.createPod.validation.amountRange')),
      venue_space_label: z.string(),
      venue_booking_pets: z.boolean().default(false),
      venue_offer_model: z.string().default(''),
      venue_offer_rate: z.string().default(''),
      // Shape only — an offer's ask is checked in refineVenueOffer (a virtual
      // pod or a held slot asks the venue nothing).
      venue_offer_offerings: z.string().default(''),
      venue_offer_note: z.string().default(''),
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
      ...ticketDiscountSchemaShape,
      ...smartIncentiveSchemaShape,
      payment_terms: z.string().max(4000),
      agreed_to_terms: z.boolean(),
      // Shape only — checked below whenever the venue offer or the pod is free.
      ...freeJustificationFields,
    })
    .superRefine((values, ctx) => {
      refineVenue(values, ctx, t, offerFloor);
      refineMeeting(values, ctx, t);
      refineSchedule(values, ctx, t);
      refinePodType(values, ctx, t);
      refineTicketPrice(values, ctx, t);
      if (needsFreeJustification(values)) addFreeJustificationIssues(values, ctx, t);
      refineTicketDiscount(
        {
          ticket_discount_enabled: values.ticket_discount_enabled,
          ticket_discount_tiers: values.ticket_discount_tiers,
          noOfSpots: Number(values.no_of_spots_text) || 0,
          free: isFreeTicket(values),
        },
        ctx,
        t,
      );
      refineSmartIncentive(
        {
          smart_incentive_enabled: values.smart_incentive_enabled,
          smart_incentive_pct: values.smart_incentive_pct,
          free: isFreeTicket(values),
        },
        ctx,
        t,
        smartIncentiveMaxPct,
      );
      refinePublish(values, ctx, t);
    });
}

/** The schema resolved against the bundled English — for callers that parse it
 * outside React. */
export const createPodSchema = makeCreatePodSchema();

/** Fields validated when leaving each stepper step (index aligned with STEP_TITLES). */
export const STEP_FIELDS: (keyof CreatePodFormValues)[][] = [
  // Step 1 picks the category, then the locality and the club it narrows to.
  ['host_category_key', 'location_id', 'locality', 'pod_mode', 'club_id'],
  [
    'pod_title',
    'pod_description',
    'media_text',
    'reel_url',
    'pod_hashtag_text',
    'pod_info',
    'what_this_pod_offers',
    'available_perks',
  ],
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
  // Offer for Venue — walked only by a pod that sends one (`createPodStepShown`).
  ['venue_offer_model', 'venue_offer_rate', 'venue_offer_offerings', 'venue_offer_note'],
  [
    'pod_type',
    'pod_amount_text',
    'no_of_spots_text',
    'place_charges',
    'ticket_discount_enabled',
    'ticket_discount_tiers',
    'smart_incentive_enabled',
    'smart_incentive_pct',
    'payment_terms',
    'products_enabled',
    'product_requests',
    'agreed_to_terms',
  ],
];

const PRICING_STEP_INDEX = 4;
const FREE_JUSTIFICATION_FIELDS: (keyof CreatePodFormValues)[] = [
  'free_reason',
  'free_details',
  'free_accepted',
];

/**
 * The fields leaving `step` validates: its STEP_FIELDS, plus the free
 * justification on the step that shows it — the offer step for a free venue
 * offer, the pricing step for a free pod. A pod made free on the pricing step
 * never blocks the offer step, which does not draw those fields. mWeb twin.
 */
export function stepFieldsFor(
  step: number,
  values: Pick<
    CreatePodFormValues,
    'pod_mode' | 'venue_slot_id' | 'venue_offer_model' | 'pod_type'
  >,
): (keyof CreatePodFormValues)[] {
  const fields = STEP_FIELDS[step] ?? [];
  const showsFree =
    (step === CREATE_POD_OFFER_STEP && sendsFreeVenueOffer(values)) ||
    (step === PRICING_STEP_INDEX && isFreePod(values.pod_type));
  return showsFree ? [...fields, ...FREE_JUSTIFICATION_FIELDS] : fields;
}

/** Catalogue keys for the five step titles, in step order (a pod that sends no
 * venue offer skips "Offer for Venue" — `createPodStepShown`). Components translate
 * these with their own `t`; the arrays below are the English resolution for
 * callers outside the stepper (the Host Management draft cards). The club step
 * now comes first, so its `step2*` keys lead: the keys keep their names because
 * every locale's translation is stored against them. */
export const STEP_TITLE_KEYS = [
  'mweb.createPod.step2Title',
  'mweb.createPod.step1Title',
  'mweb.createPod.step3Title',
  'mweb.createPod.stepOfferTitle',
  'mweb.createPod.step4Title',
];

/** One-line intro under each step title — mirrors the mWeb stepper. */
export const STEP_SUBTITLE_KEYS = [
  'mweb.createPod.step2Subtitle',
  'mweb.createPod.step1Subtitle',
  'mweb.createPod.step3Subtitle',
  'mweb.createPod.stepOfferSubtitle',
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

/** What the form holds for an offer: window = the pod window, guests = its spots. */
const offerSourceOf = (values: CreatePodFormValues): VenueOfferSource => ({
  start: parseDateTimeText(values.pod_date_time_text)?.toISOString() ?? null,
  end: parseDateTimeText(values.pod_end_date_time_text)?.toISOString() ?? null,
  pax: Number(values.no_of_spots_text) || 0,
  pets: values.venue_booking_pets,
  spaceLabel: values.venue_space_label,
  model: values.venue_offer_model,
  rate: values.venue_offer_rate,
  offerings: values.venue_offer_offerings,
  note: values.venue_offer_note,
  // Read only for a FREE offer: why the venue is asked for the window for nothing.
  freeJustification: freeSourceOf(values),
});

/** The venue offer the form holds, with what the host asks of the venue (and,
 * for a free venue, why it is free), or null until it is complete. mWeb twin:
 * venueOfferOf. */
export function venueOfferOf(values: CreatePodFormValues) {
  const offer = venueOfferInput(offerSourceOf(values));
  return offer ? hostOfferInput(offer) : null;
}

/** The same offer as the live quote asks for it — everything that moves the
 * price, none of the points, the note or the free reason, so typing those never
 * re-prices. */
export function venueOfferPriceOf(values: CreatePodFormValues) {
  const offer = venueOfferInput(offerSourceOf(values));
  return offer ? hostOfferInput(venueOfferPriceInput(offer)) : null;
}

/** A free pod's justification, as CreatePodInput takes it — nothing for a paid
 * pod, or until the host has given a complete, accepted one. */
const podFreeJustificationOf = (values: CreatePodFormValues) => {
  const justification = isFreePod(values.pod_type)
    ? appFreeJustification(freeSourceOf(values))
    : null;
  return justification ? { free_justification: justification } : {};
};

/** The pod's Smart Incentive as CreatePodInput takes it — off at 0% for a free
 * pod, a switched-off incentive, or one the host could not see. */
const podSmartIncentiveOf = (values: CreatePodFormValues, smartIncentiveOn: boolean) =>
  smartIncentiveInput(values, isFreeTicket(values) || !smartIncentiveOn);

/**
 * Maps validated form values onto the server's CreatePodInput.
 *
 * `smartIncentiveOn` is false while Loyalty's programme is not known to be on:
 * Step 4 hides the editor then, so a value carried in from a draft or a Host
 * Again copy is sent switched off rather than published unseen. mWeb twin.
 */
export function buildCreatePodInput(values: CreatePodFormValues, { smartIncentiveOn = true } = {}) {
  const virtual = values.pod_mode === 'VIRTUAL';
  const start = parseDateTimeText(values.pod_date_time_text);
  if (!start) throw new Error('Invalid start date/time');
  return {
    pod_title: values.pod_title.trim(),
    club_id: values.club_id,
    pod_mode: values.pod_mode as PodMode,
    venue_id: virtual ? null : values.venue_id,
    // A held slot (a Pod Request) books by id; every other physical pod sends
    // the venue an offer for its window, which the venue accepts, rejects or
    // counters (the pod waits for it). mWeb twin.
    venue_slot_id: virtual ? null : values.venue_slot_id || null,
    venue_offer: virtual || values.venue_slot_id ? null : venueOfferOf(values),
    // A Pod Request's confirmed slot is adopted as-is (no second venue approval).
    partner_request_id: values.partner_request_id || null,
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
    // A free pod says why it is free, with the host's acceptance of the policy.
    ...podFreeJustificationOf(values),
    pod_amount: Number(values.pod_amount_text) || 0,
    no_of_spots: Number(values.no_of_spots_text) || 0,
    pod_info: values.pod_info,
    pod_hashtag: values.pod_hashtag_text
      .split(/[\s,]+/)
      .map((item) => item.replace(/^#/, '').trim())
      .filter(Boolean),
    pod_images_and_videos: splitMediaLines(values.media_text).map((url) => ({
      url,
      type: isVideoUrl(url) ? CategoryMediaType.Video : CategoryMediaType.Image,
    })),
    reel_url: values.reel_url || null,
    // A free pod has no money terms: a value typed while it was paid is dropped.
    payment_terms: values.pod_type === 'FREE' ? null : values.payment_terms || null,
    what_this_pod_offers: values.what_this_pod_offers,
    available_perks: values.available_perks,
    place_charges: values.place_charges,
    // Off with no tiers for a free pod, whatever a stale draft still holds.
    ...ticketDiscountInput(values, isFreeTicket(values)),
    ...podSmartIncentiveOf(values, smartIncentiveOn),
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

/** The Create Pod club filter — one rule for mWeb and the native app (@duncit/utils). */
export { filterClubs, hostCategoryKeyOf } from '@duncit/utils';

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
    image_urls: splitMediaLines(values.media_text).filter((url) => !isVideoUrl(url)),
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

/** Coerces any stored pod type onto the FREE/PAID pair — a physical pod may be
 * free too, so the mode no longer decides it. */
export function normalizePodType(type: string): string {
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
    values.pod_type = normalizePodType(values.pod_type);
    // …and the discount tiers may be missing or half-typed, and the Smart
    // Incentive missing altogether (a draft from before it existed).
    return { ...values, ...hydrateTicketDiscount(values), ...hydrateSmartIncentive(values) };
  } catch {
    return blankCreatePodForm;
  }
}
