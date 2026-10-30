import { z } from 'zod';
import { addFreeJustificationIssues, makeVenueOfferAskSchema } from '@duncit/forms/schemas';
import { isFreeVenueOfferModel, isHostOfferModel, isMeetingPlatform, offerRateOf } from '@duncit/utils';
import type { Translate } from '../../../i18n/fallback';
import { hasImageLine } from './create-pod.payload';
import { POD_TYPE_VALUES, needsFreeJustification, type CreatePodFormValues } from './create-pod.types';

/** What the host asks of the venue beside the price — the shared rules
 * (`makeVenueOfferAskSchema`: at least one point, each and the note within the
 * server's bounds), pinned on this form's own fields. Native twin. */
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

/** The host's offer to the venue: how they pay it, how much (nothing for a free
 * venue, whose window and ask are still required), and what they ask of it. */
function refineVenueOffer(values: CreatePodFormValues, ctx: z.RefinementCtx, t: Translate) {
  if (!isHostOfferModel(values.venue_offer_model)) {
    ctx.addIssue({ code: 'custom', path: ['venue_offer_model'], message: t('mweb.createPod.validation.offerModelRequired') });
  }
  if (!isFreeVenueOfferModel(values.venue_offer_model) && offerRateOf(values.venue_offer_rate) <= 0) {
    ctx.addIssue({ code: 'custom', path: ['venue_offer_rate'], message: t('mweb.createPod.validation.offerRateRequired') });
  }
  refineOfferAsk(values, ctx, t);
}

/** A physical pod's time at the venue: a Pod Request books the slot it holds;
 * every other pod sends the venue an offer for a window (a slot id an older
 * draft still carries books as before). Native twin. */
function refineVenueTime(values: CreatePodFormValues, ctx: z.RefinementCtx, t: Translate) {
  if (values.venue_slot_id) return;
  if (values.partner_request_id) {
    ctx.addIssue({ code: 'custom', path: ['venue_slot_id'], message: t('mweb.createPod.validation.slotRequired') });
    return;
  }
  if (!values.pod_end_date_time) {
    ctx.addIssue({ code: 'custom', path: ['pod_date_time'], message: t('mweb.createPod.validation.bookingRequired') });
  }
  refineVenueOffer(values, ctx, t);
}

/** Physical pods need a venue, a space/capacity and a booked time; virtual pods
 * need a valid meeting link. Extracted from the schema's superRefine to keep it
 * under the cognitive-complexity limit. */
export function refineVenueOrMeeting(values: CreatePodFormValues, ctx: z.RefinementCtx, t: Translate) {
  if (values.pod_mode === 'PHYSICAL') {
    if (!values.venue_id) {
      ctx.addIssue({ code: 'custom', path: ['venue_id'], message: t('mweb.createPod.validation.venueRequired') });
    } else if (!values.venue_space_label) {
      // A space (capacity) is chosen after the venue and gates the booking pickers.
      ctx.addIssue({ code: 'custom', path: ['venue_space_label'], message: t('mweb.createPod.validation.spaceRequired') });
    }
    refineVenueTime(values, ctx, t);
  } else if (values.pod_mode === 'VIRTUAL') {
    // Picked from the shared list, not typed: the pod page decodes codes, so
    // free text rendered back as "Google meet". Native twin.
    if (!isMeetingPlatform(values.meeting_platform)) {
      ctx.addIssue({
        code: 'custom',
        path: ['meeting_platform'],
        message: t('mweb.createPod.meetingPlatformRequired'),
      });
    }
    if (!values.meeting_url) {
      ctx.addIssue({ code: 'custom', path: ['meeting_url'], message: t('mweb.createPod.validation.meetingUrlRequired') });
    } else if (!/^https?:\/\/\S+$/.test(values.meeting_url)) {
      ctx.addIssue({ code: 'custom', path: ['meeting_url'], message: t('mweb.createPod.validation.meetingUrlInvalid') });
    }
  }
}

/** A free pod or a free venue says why it is free and accepts Duncit's free
 * policy — the shared rules, the server's `cleanFreeJustification` order. One
 * set of fields serves both, so a pod free twice over is checked once. */
export function refineFreeJustification(values: CreatePodFormValues, ctx: z.RefinementCtx, t: Translate) {
  if (needsFreeJustification(values)) addFreeJustificationIssues(values, ctx, t);
}

/** The ticket price is blank until the host types one, so a PAID pod can never
 * be published at ₹0 by default — only a FREE pod (which shows no price field
 * and always carries 0) may have no price. Native twin (rule 27). */
function refineTicketPrice(values: CreatePodFormValues, ctx: z.RefinementCtx, t: Translate) {
  if (values.pod_type === 'FREE') {
    if (values.pod_amount !== 0) {
      ctx.addIssue({ code: 'custom', path: ['pod_amount'], message: t('mweb.createPod.validation.freeAmountZero') });
    }
    return;
  }
  if (values.pod_amount === null) {
    ctx.addIssue({ code: 'custom', path: ['pod_amount'], message: t('mweb.createPod.validation.ticketPriceRequired') });
  } else if (values.pod_amount <= 0) {
    ctx.addIssue({ code: 'custom', path: ['pod_amount'], message: t('mweb.createPod.validation.ticketPriceMin') });
  }
}

/** The pod-type, product, media and Organizer Terms rules of the publish step.
 * Split out of the superRefine so it stays under the complexity limit. */
export function refinePublish(values: CreatePodFormValues, ctx: z.RefinementCtx, t: Translate) {
  if (!POD_TYPE_VALUES.has(values.pod_type)) {
    ctx.addIssue({ code: 'custom', path: ['pod_type'], message: t('mweb.createPod.validation.podTypeInvalid') });
  }
  // FREE is open to physical and virtual pods alike — the mode no longer
  // narrows the type.
  refineTicketPrice(values, ctx, t);
  // Products are optional and `products_enabled` is derived from the rows, so
  // there is no longer a "switch on but nothing chosen" state to catch here.
  // The per-row rule below is what guards an incomplete association.
  if (!hasImageLine(values.media_text)) {
    ctx.addIssue({ code: 'custom', path: ['media_text'], message: t('mweb.createPod.validation.imageRequired') });
  }
  if (!values.agreed_to_terms) {
    ctx.addIssue({ code: 'custom', path: ['agreed_to_terms'], message: t('mweb.createPod.validation.termsRequired') });
  }
}
