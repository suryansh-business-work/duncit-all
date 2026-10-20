import { z } from 'zod';
import { isMeetingPlatform, repeatDiscountFormIssues } from '@duncit/utils';
import type { Translate } from '../../../i18n/fallback';
import { hasImageLine } from './create-pod.payload';
import { POD_TYPE_VALUES, type CreatePodFormValues } from './create-pod.types';

/** A physical pod's time at the venue: a Pod Request books the slot it holds;
 * every other pod books a window at the venue's own pricing (a slot id an
 * older draft still carries books as before). Native twin. */
function refineVenueTime(values: CreatePodFormValues, ctx: z.RefinementCtx, t: Translate) {
  if (values.venue_slot_id) return;
  if (values.partner_request_id) {
    ctx.addIssue({ code: 'custom', path: ['venue_slot_id'], message: t('mweb.createPod.validation.slotRequired') });
  } else if (!values.pod_end_date_time) {
    ctx.addIssue({ code: 'custom', path: ['pod_date_time'], message: t('mweb.createPod.validation.bookingRequired') });
  }
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

/** A recurring pod needs the day it stops repeating, after its first date. The
 * server checks the span and every date's slot; this only catches the empty
 * or backwards end day before the preview is asked for — and, for hand-picked
 * dates, that at least one day besides the first is tapped. Native twin. */
export function refineRepeat(values: CreatePodFormValues, ctx: z.RefinementCtx, t: Translate, maxPct: number) {
  if (!values.repeat_enabled) return;
  refineRepeatDiscount(values, ctx, t, maxPct);
  if (values.repeat_frequency === 'CUSTOM' && values.repeat_custom_days.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['repeat_custom_days'], message: t('mweb.podSeries.needTwoDates') });
  }
  if (!values.repeat_ends_on) {
    ctx.addIssue({ code: 'custom', path: ['repeat_ends_on'], message: t('mweb.podSeries.endsOnRequired') });
    return;
  }
  const first = values.pod_date_time;
  if (first && new Date(`${values.repeat_ends_on}T23:59:59`) <= first) {
    ctx.addIssue({ code: 'custom', path: ['repeat_ends_on'], message: t('mweb.podSeries.endsOnAfterStart') });
  }
}

/** The multi-date discount's tiers, by the shared rules (@duncit/utils). Native twin. */
function refineRepeatDiscount(values: CreatePodFormValues, ctx: z.RefinementCtx, t: Translate, maxPct: number) {
  const input = { enabled: values.repeat_discount_enabled, tiers: values.repeat_discount_tiers, maxPct };
  for (const issue of repeatDiscountFormIssues(input, t)) ctx.addIssue({ code: 'custom', ...issue });
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
